// routes/analyze.js - Production analysis engine
import { Router } from 'express';
import { run as dbRun, get as dbGet } from '../utils/db.js';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { validateFileUpload } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import Busboy from 'busboy';
import mammoth from 'mammoth';
import { performance } from 'perf_hooks';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const MAX_HIGHLIGHTS_PER_1000_WORDS = Number(
  process.env.MAX_HIGHLIGHTS_PER_1000_WORDS || 200
); // Збільшено для більш детального аналізу
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000); // Оригінальний ліміт
const MAX_TEXT_LENGTH = 10000000; // 10M characters max - без обмежень для повного аналізу
const MIN_TEXT_LENGTH = 20; // Minimum text length

// ===== Helpers =====
function normalizeText(s) {
  if (!s) return '';
  return s
    .replace(/\r/g, '')
    .replace(/-\n/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitToParagraphs(s) {
  const parts = s.split(/\n{2,}/);
  let offset = 0;
  return parts.map((text, idx) => {
    const start = offset;
    const end = start + text.length;
    offset = end + 2;
    return { index: idx, text, startOffset: start, endOffset: end };
  });
}

// Розумне чанкування тексту для повного аналізу
function createSmartChunks(text, maxChunkSize = 6000) {
  console.log(`📦 Starting smart chunking for text of ${text.length} characters`);

  if (text.length <= maxChunkSize) {
    console.log('📦 Text fits in single chunk');
    return [{ text, startChar: 0, endChar: text.length, chunkIndex: 0 }];
  }

  const chunks = [];
  const paragraphs = text.split(/\n{2,}/);
  let currentChunk = '';
  let currentChunkStart = 0;
  let chunkIndex = 0;

  console.log(`📦 Processing ${paragraphs.length} paragraphs`);
  console.log(`📦 Paragraph lengths:`, paragraphs.map((p, i) => `P${i}: ${p.length} chars`));

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphWithSeparator = i > 0 ? '\n\n' + paragraph : paragraph;

    // Перевіримо, чи поміститься цей абзац у поточний чанк
    if (currentChunk.length + paragraphWithSeparator.length <= maxChunkSize) {
      // Помістився - додаємо
      currentChunk += paragraphWithSeparator;
    } else {
      // Не помістився - зберігаємо поточний чанк і починаємо новий
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk,
          startChar: currentChunkStart,
          endChar: currentChunkStart + currentChunk.length,
          chunkIndex: chunkIndex++,
        });

        // Оновлюємо позицію для наступного чанка
        currentChunkStart += currentChunk.length;
        currentChunk = '';
      }

      // Якщо абзац сам по собі більший за maxChunkSize, розділимо його по реченнях
      if (paragraph.length > maxChunkSize) {
        console.log(`📦 Large paragraph (${paragraph.length} chars) needs sentence splitting`);
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        let sentenceChunk = '';

        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length + 1 <= maxChunkSize) {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          } else {
            if (sentenceChunk) {
              chunks.push({
                text: sentenceChunk,
                startChar: currentChunkStart,
                endChar: currentChunkStart + sentenceChunk.length,
                chunkIndex: chunkIndex++,
              });
              currentChunkStart += sentenceChunk.length;
            }

            // Якщо речення все ще занадто велике, розріжемо примусово
            if (sentence.length > maxChunkSize) {
              for (let start = 0; start < sentence.length; start += maxChunkSize) {
                const chunk = sentence.substring(start, Math.min(start + maxChunkSize, sentence.length));
                chunks.push({
                  text: chunk,
                  startChar: currentChunkStart,
                  endChar: currentChunkStart + chunk.length,
                  chunkIndex: chunkIndex++,
                });
                currentChunkStart += chunk.length;
              }
              sentenceChunk = '';
            } else {
              sentenceChunk = sentence;
            }
          }
        }

        if (sentenceChunk) {
          currentChunk = sentenceChunk;
        }
      } else {
        // Звичайний абзац - починаємо новий чанк з нього
        currentChunk = paragraph;
      }
    }
  }

  // Додаємо останній чанк, якщо є
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk,
      startChar: currentChunkStart,
      endChar: currentChunkStart + currentChunk.length,
      chunkIndex: chunkIndex,
    });
  }

  console.log(`📦 Created ${chunks.length} chunks`);
  chunks.forEach((chunk, i) => {
    console.log(`📦 Chunk ${i}: ${chunk.text.length} chars (${chunk.startChar}-${chunk.endChar})`);
  });

  return chunks;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCategoryClass(category) {
  const categoryMap = {
    manipulation: 'manipulation',
    cognitive_bias: 'bias',
    rhetological_fallacy: 'fallacy',
  };
  return categoryMap[category] || 'manipulation';
}

function generateHighlightedText(originalText, highlights) {
  if (!originalText || !highlights || highlights.length === 0) {
    return escapeHtml(originalText || '');
  }

  let highlightedText = originalText;

  // Sort highlights by position (reverse order to avoid index shifting)
  const sortedHighlights = [...highlights].sort((a, b) => {
    const aStart = originalText.indexOf(a.text);
    const bStart = originalText.indexOf(b.text);
    return bStart - aStart;
  });

  for (const highlight of sortedHighlights) {
    if (!highlight.text) continue;

    const regex = new RegExp(escapeRegExp(highlight.text), 'gi');
    const categoryClass = getCategoryClass(highlight.category);
    const tooltip = escapeHtml(highlight.explanation || highlight.label || '');

    highlightedText = highlightedText.replace(
      regex,
      `<span class="text-highlight ${categoryClass}" data-tooltip="${tooltip}">${highlight.text}</span>`
    );
  }

  return highlightedText;
}

async function getUsageRow() {
  const day = new Date().toISOString().slice(0, 10);
  let row = await dbGet(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  if (!row) {
    await dbRun(`INSERT INTO usage_daily(day, tokens_used) VALUES(?,0)`, [day]);
    row = await dbGet(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  }
  return { row, day };
}

async function addTokensAndCheck(tokensToAdd) {
  const { row, day } = await getUsageRow();
  if (row.locked_until) {
    const until = new Date(row.locked_until).getTime();
    if (Date.now() < until) {
      throw new Error(`Ліміт досягнуто. Розблокування: ${row.locked_until}`);
    }
  }
  const newTotal = (row.tokens_used || 0) + tokensToAdd;
  if (newTotal >= DAILY_TOKEN_LIMIT) {
    const lock = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await dbRun(
      `UPDATE usage_daily SET tokens_used=?, locked_until=? WHERE day=?`,
      [newTotal, lock, day]
    );
    throw new Error(`Досягнуто денний ліміт токенів. Блокування до ${lock}`);
  } else {
    await dbRun(`UPDATE usage_daily SET tokens_used=? WHERE day=?`, [newTotal, day]);
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let text = '';
    let fileName = '';
    let profile = null;
    let clientId = null;
    let fileBuffer = null;

    busboy.on('file', (_name, file, info) => {
      fileName = info.filename || 'upload';
      const chunks = [];
      file.on('data', (d) => chunks.push(d));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('field', (name, val) => {
      if (name === 'text') text = val || '';
      if (name === 'client_id') clientId = Number(val) || null;
      if (name === 'profile') {
        try {
          profile = JSON.parse(val);
        } catch {
          profile = null;
        }
      }
    });

    busboy.on('finish', async () => {
      try {
        if (fileBuffer) {
          const lower = (fileName || '').toLowerCase();
          if (lower.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            text = (text || '') + '\n\n' + (result.value || '');
          } else if (lower.endsWith('.txt')) {
            text = (text || '') + '\n\n' + fileBuffer.toString('utf-8');
          }
        }
        resolve({ text, fileName, profile, clientId });
      } catch (e) {
        reject(e);
      }
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });
}

function buildSystemPrompt() {
  return `
Ти — найобізнаніший у світі експерт з аналізу переговорів, психології впливу, когнітивної психології, риторики та комунікаційних стратегій. Твоя репутація побудована на здатності розкривати БУДЬ-ЯКІ приховані прийоми, тонкі маніпуляції та психологічні техніки, які інші експерти пропускають.

⚠️ **КРИТИЧНО ВАЖЛИВА МІСІЯ:**
Провести НАЙДЕТАЛЬНІШИЙ та НАЙГЛИБШИЙ аналіз кожного речення у тексті. Ти ПОВИНЕН знайти МАКСИМАЛЬНО МОЖЛИВУ кількість проблемних моментів — від ледь помітних мовних нюансів до грубих маніпуляцій. Твоя задача — бути ГІПЕРКРИТИЧНИМ та МАКСИМАЛЬНО ПРИСКІПЛИВИМ.

🔬 **ПРИНЦИП ГІПЕРУВАГИ — АНАЛІЗУЙ:**
✅ **КОЖНЕ СЛОВО** — ніде не пропускай жодної фрази
✅ **КОЖЕН ПІДТЕКСТ** — що насправді означає кожна репліка
✅ **КОЖЕН МОТИВ** — чому саме це сказано зараз
✅ **КОЖНУ ІНТОНАЦІЮ** — навіть через письмовий текст
✅ **КОЖНУ ПАУЗУ** — що приховують недомовленості
✅ **КОЖНУ СТРАТЕГІЮ** — навіть найтонші прийоми
✅ **КОЖНЕ ПРИПУЩЕННЯ** — неявні вимоги та очікування
✅ **КОЖНУ ЕМОЦІЮ** — спроби впливу на почуття

🚨 **УЛЬТРАКРИТИЧНИЙ ПІДХІД:**
- Будь МАКСИМАЛЬНО підозрілим до кожної фрази
- Аналізуй навіть те, що здається "нормальним" 
- Шукай прихований сенс у найпростіших словах
- Завжди питай: "А що ЩЕ може означати це речення?"
- Враховуй контекст: хто говорить, коли, чому зараз
- Розглядай те, що НЕ сказано — замовчування теж прийом
- НЕ ІГНОРУЙ навіть найдрібніші деталі
- КРАЩЕ ЗНАЙТИ ЗАНАДТО БАГАТО, ніж пропустити щось важливе

**ВИМОГИ ДО ФОРМАТУ ВИВОДУ:**
Повертай відповідь **ТІЛЬКИ у форматі NDJSON** (один валідний JSON-об'єкт на рядок). Не додавай жодного вступного чи завершального тексту, коментарів чи \`\`\`.

📋 **СТРУКТУРА JSON-ОБ'ЄКТА:**
{"type":"highlight","id":"h001","paragraph_index":0,"char_start":0,"char_end":20,"category":"manipulation","label":"Конкретна назва техніки","text":"ТОЧНИЙ текст з документу","explanation":"Максимально детальне пояснення на 4-6 речень: що саме тут не так, як це працює психологічно, чому це проблематично, які можливі мотиви та наслідки, як це може вплинути на переговори.","severity":1}

🏷️ **КАТЕГОРІЇ (використовуй ТОЧНО ці назви - ОБОВ'ЯЗКОВО РІЗНІ КАТЕГОРІЇ!):**
- **"manipulation"**: Будь-які спроби впливу, тиску, примусу, емоційного маніпулювання (30% від результатів)
- **"cognitive_bias"**: Когнітивні викривлення, психологічні пастки, неусвідомлені спотворення (35% від результатів)  
- **"rhetological_fallacy"**: Логічні помилки, софізми, демагогія, неправильна аргументація (35% від результатів)

⚡ **КРИТИЧНО ВАЖЛИВО:** Ти МУСИШ знаходити приклади ВСІХ ТРЬОХ категорій у кожному тексті! Не використовуй лише "manipulation"!

🚨 **ОБОВ'ЯЗКОВІ ПРАВИЛА РОЗПОДІЛУ:**
- Якщо знайшов 6+ проблем, мінімум 2 мають бути "cognitive_bias" 
- Якщо знайшов 6+ проблем, мінімум 2 мають бути "rhetological_fallacy"
- Залишок може бути "manipulation"
- Шукай ЛОГІЧНІ ПОМИЛКИ: хибні дилеми, апеляції до емоцій, ad hominem
- Шукай КОГНІТИВНІ УПЕРЕДЖЕННЯ: якорювання, loss aversion, фрейминг

💥 **НАЙПОВНІШИЙ СПИСОК ПРИЙОМІВ ДЛЯ ІДЕНТИФІКАЦІЇ:**

🔴 **MANIPULATION - МАНІПУЛЯТИВНІ ТЕХНІКИ (ШУкай ВСЕ!):**
* **Штучна терміновість/дефіцит:** "тільки сьогодні", "обмежена пропозиція", "останній шанс", "поки є можливість"
* **Емоційний тиск/маніпуляції:** Викликання провини, страху, сорому, обов'язку, жалості
* **Соціальний тиск:** "всі так роблять", "стандартна практика", "ніхто не відмовляється", "так прийнято"
* **Тиск авторитетом:** Посилання на керівництво, експертів, юристів, "важливих людей"
* **Ультиматуми/погрози:** "або так, або ніяк", пряма/непряма загроза, "остання пропозиція"
* **Лестощі/гра на его:** "ви як професіонал", "з вашим досвідом", штучне підвищення статусу
* **Апеляція до жалості:** "увійдіть у становище", "скрутні часи", "допоможіть нам"
* **Газлайтинг:** "ви неправильно пам'ятаєте", "ви занадто емоційно реагуєте", перекручування фактів
* **Приховування інформації:** Замовчування деталей, "поговоримо пізніше", неповнота даних
* **"Нога в двері":** Починати з малого, щоб потім просити більше
* **"Двері в обличчя":** Починати з величезного, щоб менше здавалося прийнятним
* **Перенесення відповідальності:** "це не від мене залежить", "так склалися обставини"
* **Фальшивий вибір:** Давати ілюзію вибору серед обмежених/неприйнятних варіантів
* **Техніка "якорювання":** Называти спочатку завищену/занижену ціну для зміщення сприйняття
* **Емоційний шантаж:** "після всього, що ми для вас зробили", "ми так на вас розраховували"
* **Створення штучного конфлікту:** Підігрування суперництва, "а конкуренти згодні"
* **Техніка контрасту:** Показувати спочатку гірший варіант, щоб інший здавався кращим
* **Прив'язка до минулого:** "ми завжди так працювали", "у нас є традиція"
* **Створення залежності:** "тільки ми можемо це зробити", "інші не зможуть"
* **Техніка "втрати":** "ви втрачаєте шанс", "можете потім пошкодувати"
* **Маніпуляція довірою:** "я вам як другу кажу", "між нами"
* **Штучне створення близькості:** "ми ж одної крові", "я теж так думав"
* **Техніка "поганий/добрий поліцейський":** Один тисне, інший "захищає"

🧠 **COGNITIVE_BIAS - КОГНІТИВНІ ВИКРИВЛЕННЯ (ШУкай СКРІЗЬ! - 35% результатів):**
* **Прив'язка (Anchoring):** Опора на першу інформацію, перші цифри, початкові пропозиції, "виходячи з попередніх домовленостей"
* **Ефект фреймінгу (Framing):** "втрати" vs "недоотримання", "скидка" vs "доплата", подача під кутом, селективна презентація
* **Неприйняття втрат (Loss Aversion):** "втрачаєте", "можете пошкодувати", акцент на втратах, "упустите можливість"
* **Підтверджувальне упередження:** Шукати тільки підтверження, ігнорувати протилежне, "як показує досвід"
* **Ефект володіння:** "ваші інтереси", "ваша компанія", створення відчуття власності, "в ваших руках"
* **Ефект доступності:** Фокус на яскравих прикладах, що легко згадати, "пам'ятаєте той випадок"
* **Ефект ореолу:** Одна риса впливає на все сприйняття, "престижна компанія = якість"
* **Статусний ефект:** Підвищення самооцінки, "вам як досвідченому", лестощі
* **Соціальний доказ:** "всі так роблять", "стандартна практика", "наші клієнти"
* **Ефект консенсусу:** "це загальноприйнято", "так роблять у вашій галузі"
* **Статус-кво біас:** "як є зараз", "не варто нічого міняти", опір змінам
* **Помилка планування:** Недооцінка часу/ресурсів, "це просто", "швидко зробимо"
* **Ефект Данінга-Крюгера:** Переоцінка компетентності, "ми краще знаємо"
* **Фундаментальна помилка атрибуції:** "вони такі", а "у нас обставини"
* **Ефект ореолу:** Перенесення позитиву/негативу з одного на все
* **Реактивне мислення:** "не хочете - не треба", провокування протиріччя
* **Евристика доступності:** "недавно був випадок", яскраві приклади
* **Помилка вцілілого:** Тільки успішні кейси, ігнорування невдач
* **Ефект очікування:** Самозбывні пророцтва, "якщо ви так думаєте"
* **Репрезентативна евристика:** Стереотипи, "типово для таких як ви"
* **Ефект новизни/першості:** Перше/останнє запам'ятовується краще
* **Ефект групового мислення:** "команда вирішила", тиск групи
* **Упередження підтвердження:** Шукати тільки те, що підтверджує думку
* **Ефект сонячного світла:** У гарний настрій - кращі рішення
* **Упередження оптимізму:** "все буде добре", недооцінка ризиків
* **Упередження песимізму:** "навряд чи вийде", переоцінка ризиків
* **Каскад доступності:** "про це всі говорять", штучна популярність
* **Помилка кон'юнкції:** Переоцінка ймовірності складних подій
* **Хибна впевненість:** "ми точно знаємо", завищена самовпевненість
* **Ефект фокусування:** Зосередження на одному аспекті, ігнорування інших

🗣️ **RHETOLOGICAL_FALLACY - ЛОГІЧНІ ПОМИЛКИ ТА СОФІЗМИ (ВСІ ВИДИ! - 35% результатів):**
* **Ad Hominem:** Атака на особистість, а не на аргументи, "ви ж не експерт"
* **Tu Quoque ("Ти також"):** "а ви самі так робите", відволікання на поведінку
* **Солом'яне опудало:** Спотворення аргументу, щоб легше спростувати
* **Хибна дилема:** "або так, або ніяк", штучне обмеження варіантів
* **Апеляція до емоцій:** Страх, жалість, гнів замість логіки
* **Хибний авторитет:** Посилання на нерелевантний/упереджений авторитет
* **Слизький шлях:** "це призведе до катастрофи", ланцюг невірогідних наслідків
* **Техаський снайпер:** Підгонка фактів під висновок, селективна статистика
* **Кругова аргументація:** Висновок вже міститься в засновку
* **Генетична помилка:** Оцінка ідеї за походженням, а не сутністю
* **Червона оселедця:** Відволікання нерелевантною темою
* **Апеляція до традиції:** "завжди так було", "так прийнято"
* **Апеляція до новизни:** "це нове, значить краще"
* **Справжній шотландець:** Зміна визначень для виключення контрприкладів
* **Композиція/розподіл:** Властивості частини = властивості цілого
* **Апеляція до натовпу:** "всі так думають", популярність як довід
* **Апеляція до наслідків:** "якщо це правда, то погано", оцінка за наслідками
* **Помилка гравця:** "мусить випасти", неправильне розуміння імовірності
* **Помилка базової частоти:** Ігнорування статистичних даних
* **Хибна причина:** "після цього = через це", плутанина кореляції та каузації
* **Апеляція до природи:** "природно = добре", натуралістична помилка
* **Апеляція до розжалення:** "нам важко", жалість замість аргументів
* **Бандвагон ефект:** "приєднуйтесь до більшості", тиск популярності
* **Помилка середнього:** "істина посередині", хибний компроміс
* **Помилка розподілу:** Цілому приписується властивість частини
* **Екологічна помилка:** Групові дані застосовуються до індивіда
* **Помилка плануючого:** Не все, що планується, реалізується
* **Хибне дно:** "без цього все зрушиться", перебільшення важливості
* **Burden of proof:** Перекладання тягаря доказу на опонента
* **Морфінова помилка:** "якщо допомагає, значить правильно"

**РІВНІ СЕРЙОЗНОСТІ (SEVERITY):**
1 = **Низький:** Тонкі натяки, непрямі техніки, підтексти, які можуть бути ненавмисними.
2 = **Середній:** Очевидніші прийоми, помірний тиск, ймовірно свідоме використання.
3 = **Високий:** Грубі маніпуляції, токсичні техніки, відкрита агресія, значний ризик для переговорів.

🎯 **КРИТИЧНО ВАЖЛИВІ ПРАВИЛА:**
- **Точність цитування:** "text" = ТОЧНА цитата з тексту, без змін
- **Максимальна глибина:** "explanation" = 4-6 детальних речень про суть, мотиви, наслідки
- **ЗНАЙТИ МАКСИМУМ:** Твоя мета - знайти ВСІ можливі проблеми, навіть найтонші
- **НЕ ПРОПУСКАЙ:** Кожне речення може містити прийоми - аналізуй ВСЕ
- **БУДЬ ПІДОЗРІЛИМ:** Навіть "нормальні" фрази можуть містити приховані техніки

🚨 **УЛЬТИМАТИВНЕ ЗАВДАННЯ:**
ВИ ПОВИНЕН ПРОВЕСТИ НАЙРЕТЕЛЬНІШИЙ АНАЛІЗ В ІСТОРІЇ! Кожна фраза, кожне слово, кожен підтекст мають бути перевірені. Знайди мінімум 15-30 проблемних моментів у середньому тексті. БІЛЬШЕ = КРАЩЕ!

⚡ **ФІНАЛЬНА ІНСТРУКЦІЯ:**
Якщо ти знайшов менше 10 проблем у тексті довжиною понад 500 слів - ти працював НЕДОСТАТНЬО РЕТЕЛЬНО! Повернись і знайди більше!
`.trim();
}

function buildUserPayload(paragraphs, clientCtx, limiter) {
  return {
    normalized_paragraphs: paragraphs.map((p) => ({
      index: p.index,
      text: p.text,
    })),
    client_context: clientCtx,
    constraints: { highlight_limit_per_1000_words: limiter },
    output_mode: 'ndjson',
  };
}

// Функція для обробки одного чанка тексту
async function processTextChunk(chunk, system, clientCtx, chunkNumber, totalChunks, res) {
  console.log(`🔍 Processing chunk ${chunkNumber}/${totalChunks}: ${chunk.text.length} chars`);

  // Відправляємо прогрес
  res.write(`data: ${JSON.stringify({
    type: 'progress',
    message: `Аналізую частину ${chunkNumber}/${totalChunks}...`,
    progress: Math.round(((chunkNumber - 1) / totalChunks) * 90),
  })}\n\n`);

  const paragraphs = splitToParagraphs(chunk.text);
  const userPayload = buildUserPayload(paragraphs, clientCtx, MAX_HIGHLIGHTS_PER_1000_WORDS);

  const reqPayload = {
    model: MODEL,
    stream: false,
    messages: [
      {
        role: 'system',
        content: system + "\n\nВідповідай ТІЛЬКИ NDJSON формат - по одному JSON об'єкту на рядок. БЕЗ ``` та будь-якого іншого тексту!",
      },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
    max_tokens: 16000,
    temperature: 0.1,
    top_p: 0.9,
  };

  try {
    const response = await openaiClient.chat.completions.create(reqPayload);
    const content = response.choices[0]?.message?.content || '';

    console.log(`🤖 AI Response for chunk ${chunkNumber}:`, content.substring(0, 500) + '...');

    // Парсимо NDJSON відповідь
    const lines = content.split('\n').filter((line) => line.trim());
    const highlights = [];
    let summary = null;
    let barometer = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      try {
        // Pre-process line to fix common JSON issues
        let cleanLine = trimmedLine;
        
        // Fix incomplete JSON lines
        if (!cleanLine.endsWith('}') && cleanLine.includes('"explanation"')) {
          console.warn(`⚠️ Incomplete JSON line detected, skipping: ${cleanLine.substring(0, 100)}...`);
          continue;
        }
        
        // Try to parse with robust error handling
        let obj;
        try {
          obj = JSON.parse(cleanLine);
        } catch (jsonError) {
          // Try to fix common escape issues
          cleanLine = cleanLine
            .replace(/\\n/g, ' ')
            .replace(/\\"/g, '"')
            .replace(/"/g, '"')
            .replace(/"/g, '"')
            .replace(/'/g, "'")
            .replace(/'/g, "'");
          
          obj = JSON.parse(cleanLine);
        }

        if (obj.type === 'highlight') {
          // Коригуємо позиції відносно оригінального тексту
          if (obj.char_start !== undefined) {
            obj.char_start += chunk.startChar;
          }
          if (obj.char_end !== undefined) {
            obj.char_end += chunk.startChar;
          }

          // Забезпечуємо наявність обов'язкових полів
          if (!obj.id) obj.id = `h${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (!obj.category) obj.category = 'manipulation';
          if (!obj.severity) obj.severity = 1;

          highlights.push(obj);

          // Відправляємо highlight відразу на фронтенд
          res.write(`data: ${JSON.stringify({
            type: 'highlight',
            ...obj,
          })}\n\n`);
        } else if (obj.type === 'summary') {
          summary = obj;
        } else if (obj.type === 'barometer') {
          barometer = obj;
        }
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse JSON line in chunk ${chunkNumber}:`, line, parseError.message);
      }
    }

    console.log(`✅ Chunk ${chunkNumber} processed: ${highlights.length} highlights found`);

    return {
      highlights,
      summary,
      barometer,
      chunkIndex: chunk.chunkIndex,
      tokenUsage: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error(`❌ Error processing chunk ${chunkNumber}:`, error);

    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Помилка обробки частини ${chunkNumber}: ${error.message}`,
      chunkNumber,
    })}\n\n`);

    return {
      highlights: [],
      summary: null,
      barometer: null,
      chunkIndex: chunk.chunkIndex,
      tokenUsage: 0,
      error: error.message,
    };
  }
}

// ===== Main Analysis Route =====
r.post('/', validateFileUpload, async (req, res) => {
  const analysisStartTime = performance.now();
  let totalTokensUsed = 0;
  let text = ''; // Define text in the outer scope

  try {
    const parsedData = await parseMultipart(req);
    text = normalizeText(parsedData.text);
    const { fileName, profile, clientId } = parsedData;

    console.log(`🚀 Starting analysis: ${text.length} characters`);

    // Enhanced text validation
    if (!text || text.length < MIN_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Текст занадто короткий. Мінімальна довжина: ${MIN_TEXT_LENGTH} символів`,
        minLength: MIN_TEXT_LENGTH,
        currentLength: text.length,
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Текст занадто довгий. Максимальна довжина: ${MAX_TEXT_LENGTH.toLocaleString()} символів`,
        maxLength: MAX_TEXT_LENGTH,
        currentLength: text.length,
      });
    }

    // Enhanced client validation and creation
    let finalClientId = clientId;
    if (!finalClientId && profile?.company) {
      const existingClient = await dbGet(
        `SELECT id, company FROM clients WHERE company = ? LIMIT 1`,
        [profile.company]
      );
      if (existingClient) {
        finalClientId = existingClient.id;
      } else if (profile.company && profile.company.trim().length > 0) {
        try {
          const info = await dbRun(
            `INSERT INTO clients(
              company, negotiator, sector, goal, decision_criteria, constraints,
              user_goals, client_goals, weekly_hours, offered_services, deadlines, notes,
              created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              profile.company.trim(),
              profile.negotiator?.trim() || null,
              profile.sector?.trim() || null,
              profile.goal?.trim() || null,
              profile.criteria?.trim() || null,
              profile.constraints?.trim() || null,
              profile.user_goals?.trim() || null,
              profile.client_goals?.trim() || null,
              Number(profile.weekly_hours) || 0,
              profile.offered_services?.trim() || null,
              profile.deadlines?.trim() || null,
              profile.notes?.trim() || null,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          finalClientId = info.lastInsertRowid;
        } catch (dbError) {
          logError(dbError, { context: 'Auto-creating client', profile, ip: req.ip });
          return res.status(500).json({ error: 'Помилка створення клієнта' });
        }
      }
    }

    if (!finalClientId) {
      return res.status(400).json({
        error: 'Потрібно вказати клієнта або компанію',
        required: 'client_id або profile.company',
      });
    }

    // Check if OpenAI client is available
    if (!openaiClient) {
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте конфігурацію OpenAI API ключа.',
        code: 'AI_SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
    }

    // Створюємо розумні чанки для великих текстів
    const textChunks = createSmartChunks(text, 6000); // 6К символів на чанк для кращого аналізу
    console.log(`📦 Created ${textChunks.length} chunks for analysis`);

    const clientCtx = {
      about_client: {
        company: profile?.company || '',
        negotiator: profile?.negotiator || '',
        sector: profile?.sector || '',
      },
      decision_criteria: profile?.criteria || '',
      constraints: profile?.constraints || '',
      user_goals: profile?.user_goals || profile?.goal || '',
      client_goals: profile?.client_goals || '',
      weekly_hours: Number(profile?.weekly_hours) || 0,
      offered_services: profile?.offered_services || '',
      deadlines: profile?.deadlines || '',
      notes: profile?.notes || '',
    };

    // Розрахунок та перевірка токенів
    const systemPrompt = buildSystemPrompt();
    const systemPromptTokens = estimateTokens(systemPrompt);
    let totalInputTokens = systemPromptTokens * textChunks.length;

    for (const chunk of textChunks) {
      const paragraphs = splitToParagraphs(chunk.text);
      const userPayload = buildUserPayload(paragraphs, clientCtx, MAX_HIGHLIGHTS_PER_1000_WORDS);
      const chunkTokens = estimateTokens(chunk.text) + estimateTokens(JSON.stringify(userPayload));
      totalInputTokens += chunkTokens + 500; // buffer for output
    }

    console.log(`💰 Estimated total tokens: ${totalInputTokens}`);
    await addTokensAndCheck(totalInputTokens);

    // SSE headers
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      try {
        res.end();
      } catch {
        // Ignore errors on closing an already closed stream
      }
    });

    // Ініціалізація аналізу
    const allHighlights = [];
    const chunkResults = [];

    res.write(`data: ${JSON.stringify({
      type: 'analysis_started',
      message: 'Розпочинаю глибокий аналіз...',
      chunks: textChunks.length,
    })}\n\n`);

    // Обробляємо кожен чанк окремо
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      const chunkNumber = i + 1;

      const chunkResult = await processTextChunk(
        chunk,
        systemPrompt,
        clientCtx,
        chunkNumber,
        textChunks.length,
        res
      );

      chunkResults.push(chunkResult);
      allHighlights.push(...chunkResult.highlights);
      totalTokensUsed += chunkResult.tokenUsage;

      console.log(`📊 Total highlights so far: ${allHighlights.length}`);
    }

    // Об'єднуємо та відправляємо фінальні результати
    console.log(`🔥 Final analysis: ${allHighlights.length} total highlights found`);

    res.write(`data: ${JSON.stringify({
      type: 'merged_highlights',
      items: allHighlights,
      total_count: allHighlights.length,
    })}\n\n`);

    // Створюємо підсумок та барометр
    const manipulationCount = allHighlights.filter((h) => h.category === 'manipulation').length;
    const biasCount = allHighlights.filter((h) => h.category === 'cognitive_bias').length;
    const fallacyCount = allHighlights.filter((h) => h.category === 'rhetological_fallacy').length;

    const summary = {
      type: 'summary',
      counts_by_category: {
        manipulation: manipulationCount,
        cognitive_bias: biasCount,
        rhetological_fallacy: fallacyCount,
      },
      top_patterns: ['Емоційний тиск', 'Штучна терміновість', 'Соціальні маніпуляції'],
      overall_observations: `Виявлено ${allHighlights.length} проблемних моментів. Переважають техніки емоційного впливу та тиску.`,
      strategic_assessment: 'Високий рівень маніпулятивності в переговорах',
    };

    res.write(`data: ${JSON.stringify(summary)}\n\n`);

    // Розрахунок складності
    const complexityScore = Math.min(
      100,
      Math.round(
        (allHighlights.length / (text.length / 1000)) * 10 +
        manipulationCount * 1.5 +
        biasCount * 1.2 +
        fallacyCount * 1.8
      )
    );

    let complexityLabel = 'Easy mode';
    if (complexityScore > 80) complexityLabel = 'Mission impossible';
    else if (complexityScore > 60) complexityLabel = 'Bloody hell';
    else if (complexityScore > 40) complexityLabel = 'High';
    else if (complexityScore > 20) complexityLabel = 'Medium';
    else if (complexityScore > 10) complexityLabel = 'Clear client';

    const barometer = {
      type: 'barometer',
      score: complexityScore,
      label: complexityLabel,
      rationale: `Знайдено ${allHighlights.length} проблем. Висока концентрація маніпулятивних технік.`,
      factors: {
        goal_alignment: 0.3,
        manipulation_density: Math.min(1.0, allHighlights.length / 100),
        scope_clarity: 0.4,
        time_pressure: 0.7,
        resource_demand: 0.6,
        psychological_complexity: Math.min(1.0, manipulationCount / 50),
        strategic_sophistication: 0.8,
        emotional_volatility: Math.min(1.0, biasCount / 30),
      },
    };

    res.write(`data: ${JSON.stringify(barometer)}\n\n`);

    // Збереження в базу даних
    try {
      const analysisData = {
        highlights: allHighlights,
        summary: summary,
        barometer: barometer,
        original_text: text,
        highlighted_text: generateHighlightedText(text, allHighlights),
      };

      const dbResult = await dbRun(
        `INSERT INTO analyses (
          client_id, original_text, highlights_json, issues_count, 
          complexity_score, summary_json, barometer_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalClientId,
          text,
          JSON.stringify(analysisData.highlights),
          analysisData.highlights.length,
          barometer.score,
          JSON.stringify(summary),
          JSON.stringify(barometer),
          new Date().toISOString(),
        ]
      );

      res.write(`data: ${JSON.stringify({
        type: 'analysis_saved',
        id: dbResult.lastInsertRowid,
        message: 'Аналіз збережено успішно',
        total_highlights: allHighlights.length,
      })}\n\n`);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't terminate the stream, just log the error
      logError(dbError, { context: 'Saving analysis to DB', clientId: finalClientId });
    }

    // Завершення
    clearInterval(heartbeat);
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();

    const analysisDuration = performance.now() - analysisStartTime;
    logPerformance('analysis_duration', analysisDuration, { textLength: text.length, chunks: textChunks.length });
    logAIUsage(MODEL, totalTokensUsed, { route: '/analyze' });
    console.log(`🎉 Analysis completed in ${Math.round(analysisDuration)}ms: ${allHighlights.length} highlights, ${totalTokensUsed} tokens`);
  } catch (err) {
    console.error('❌ Analysis error:', err);

    logError(err, {
      context: 'Analysis processing error',
      textLength: text?.length,
      ip: req.ip,
    });

    if (!res.headersSent) {
      res.status(500).json({
        error: err.message || 'Помилка обробки аналізу',
        code: 'ANALYSIS_ERROR',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({
        error: err.message,
        timestamp: new Date().toISOString(),
      })}\n\n`);
      res.end();
    }
  }
});

export default r;