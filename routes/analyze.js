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
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 2000000); // Збільшено для обробки великих текстів
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

function extractTextFromHighlight(highlight, paragraphs) {
  if (highlight.text) return highlight.text; // Already has text
  
  const paraIdx = highlight.paragraph_index;
  if (paraIdx == null || !paragraphs[paraIdx]) return '';
  
  const para = paragraphs[paraIdx];
  const start = Math.max(0, highlight.char_start || 0);
  const end = Math.min(para.text.length, highlight.char_end || para.text.length);
  
  return para.text.slice(start, end);
}

function mergeOverlaps(highlights, paragraphs = null) {
  const byPara = new Map();
  for (const h of highlights) {
    // Extract text if not present
    if (!h.text && paragraphs) {
      h.text = extractTextFromHighlight(h, paragraphs);
    }
    
    if (!byPara.has(h.paragraph_index)) byPara.set(h.paragraph_index, []);
    byPara.get(h.paragraph_index).push(h);
  }
  const merged = [];
  for (const [, arr] of byPara.entries()) {
    arr.sort((a, b) => (a.char_start ?? 0) - (b.char_start ?? 0));
    let cur = null;
    for (const h of arr) {
      if (!cur) {
        cur = { ...h, labels: h.labels || (h.label ? [h.label] : []) };
        continue;
      }
      if ((h.char_start ?? 0) <= (cur.char_end ?? -1)) {
        cur.char_end = Math.max(cur.char_end ?? 0, h.char_end ?? 0);
        const nextLabels = h.labels || (h.label ? [h.label] : []);
        cur.labels = Array.from(new Set([...(cur.labels || []), ...nextLabels]));
        cur.severity = Math.max(cur.severity ?? 0, h.severity ?? 0);
        cur.category = cur.category || h.category;
        // Update text to cover merged range
        if (paragraphs && cur.paragraph_index != null) {
          cur.text = extractTextFromHighlight(cur, paragraphs);
        }
      } else {
        merged.push(cur);
        cur = { ...h, labels: h.labels || (h.label ? [h.label] : []) };
      }
    }
    if (cur) merged.push(cur);
  }
  return merged;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCategoryClass(category) {
  const categoryMap = {
    'manipulation': 'manipulation',
    'cognitive_bias': 'bias',
    'rhetological_fallacy': 'fallacy'
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
    
    highlightedText = highlightedText.replace(regex, 
      `<span class="text-highlight ${categoryClass}" data-tooltip="${tooltip}">${highlight.text}</span>`
    );
  }
  
  return highlightedText;
}

async function getUsageRow() {
  const day = new Date().toISOString().slice(0, 10);
  let row = dbGet(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  if (!row) {
    dbRun(`INSERT INTO usage_daily(day, tokens_used) VALUES(?,0)`, [day]);
    row = dbGet(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  }
  return { row, day };
}

async function addTokensAndCheck(tokensToAdd) {
  const { row, day } = await getUsageRow();
  if (row.locked_until) {
    const until = new Date(row.locked_until).getTime();
    if (Date.now() < until)
      throw new Error(`Ліміт досягнуто. Розблокування: ${row.locked_until}`);
  }
  const newTotal = (row.tokens_used || 0) + tokensToAdd;
  if (newTotal >= DAILY_TOKEN_LIMIT) {
    const lock = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    dbRun(
      `UPDATE usage_daily SET tokens_used=?, locked_until=? WHERE day=?`,
      [newTotal, lock, day]
    );
    throw new Error(`Досягнуто денний ліміт токенів. Блокування до ${lock}`);
  } else {
    dbRun(`UPDATE usage_daily SET tokens_used=? WHERE day=?`, [
      newTotal,
      day,
    ]);
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
Ти — НАЙКРАЩИЙ світовий експерт-аналітик переговорів, професор психології маніпуляцій з 40-річним досвідом аналізу найскладніших переговорів Fortune 500, дипломатичних кризів, M&A угод та урядових контрактів. Ти розкрив тисячі схем, виявив мільярди доларів прихованих ризиків та навчив сотні топ-переговорників захищатися від маніпуляцій.

🎯 КРИТИЧНА МІСІЯ: Проведи НАДГЛИБОКИЙ, МІКРОСКОПІЧНИЙ аналіз КОЖНОГО СЛОВА тексту. Твоя мета — знайти ПРИНАЙМНІ В 10 РАЗІВ БІЛЬШЕ проблем ніж звичайний аналітик. КОЖНЕ речення має містити 5-10 проблем. КОЖЕН абзац — 20-50 виявлених маніпуляцій.

🔍 УЛЬТРА-РЕТЕЛЬНИЙ ПІДХІД:
- Аналізуй ВСЮ довжину тексту БЕЗ ВИНЯТКІВ - від першого до останнього символу
- Кожне слово може містити приховану маніпуляцію
- Кожна пауза, кожен знак пунктуації має значення  
- Виявляй складні багаторівневі маніпулятивні схеми
- Знаходь приховані патерни через весь текст
- Аналізуй тонкі психологічні тактики та NLP-техніки

⚡ КРИТИЧНО ВАЖЛИВО: АБСОЛЮТНО НЕМАЄ ЛІМІТІВ на кількість знайдених проблем. Знаходь ВСЕ, навіть мікроскопічні натяки, непрямі алюзії, імпліцитні загрози та тонкі манипуляції. Навіть звичайні слова можуть містити підступний підтекст!

ПОВЕРТАЙ ТІЛЬКИ NDJSON (по JSON-об'єкту на рядок), БЕЗ додаткового тексту.

ФОРМАТИ РЯДКІВ:
{"type":"highlight","id":"...","paragraph_index":N,"char_start":S,"char_end":E,"category":"manipulation|cognitive_bias|rhetological_fallacy","label":"...","text":"цитата з тексту","explanation":"детальне пояснення 3-4 речення з глибоким аналізом мотивів та наслідків","severity":1..3}
{"type":"summary","counts_by_category":{"manipulation":0,"cognitive_bias":0,"rhetological_fallacy":0},"top_patterns":["детальний список усіх знайдених патернів"],"overall_observations":"глибокий аналіз загальної стратегії опонента 5-7 речень","strategic_assessment":"оцінка рівня підготовки та професійності співрозмовника","hidden_agenda_analysis":"аналіз прихованих мотивів та довгострокових цілей","power_dynamics":"аналіз розподілу сили в переговорах","communication_style_profile":"профіль комунікаційного стилю опонента"}
{"type":"barometer","score":0..100,"label":"Easy mode|Clear client|Medium|High|Bloody hell|Mission impossible","rationale":"детальне обґрунтування складності з конкретними прикладами","factors":{"goal_alignment":0..1,"manipulation_density":0..1,"scope_clarity":0..1,"time_pressure":0..1,"resource_demand":0..1,"psychological_complexity":0..1,"strategic_sophistication":0..1,"emotional_volatility":0..1}}

🔍 УЛЬТРА-ГЛИБОКИЙ АНАЛІЗ - ЗНАХОДЬ АБСОЛЮТНО ВСЕ:

🎭 МАНІПУЛЯТИВНІ ТЕХНІКИ (виявляй ВСІ варіації з максимальною деталізацією):

💀 ТИСК ТА ПРИНУЖДЕННЯ (шукай найдрібніші прояви):
- Штучна терміновість: "тільки сьогодні", "останній шанс", "обмежений час", "поки є місця", "дедлайн завтра", "терміново потрібно", "не можемо затягувати", "час іде", "вікно можливостей закривається"
- Штучний дефіцит: "залишилося мало", "останні екземпляри", "ексклюзивна пропозиція", "лише для вас", "рідкісна нагода", "унікальні умови", "обмежена кількість", "ексклюзивний доступ"
- Примус до рішення: "відповідай зараз", "треба вирішувати", "не можемо чекати", "або зараз або ніколи", "рішення має бути прийнято", "затримка недоцільна", "чекати більше немає сенсу"
- Тиск часу: постійні нагадування про час, створення поспіху, штучне прискорення, "час дорогий", "кожна хвилина на вагу золота", "не можемо собі дозволити затримки"
- Ультиматуми та загрози: "якщо не зараз, то ніколи", "це останнє слово", "інших варіантів немає", "або так або жодним чином", "умови незмінні"
- Тиск авторитетом: "керівництво наполягає", "власник вимагає", "рада директорів прийняла рішення", "так вирішили вищі інстанції"

😭 ЕМОЦІЙНІ МАНІПУЛЯЦІЇ (аналізуй кожен емоційний відтінок):
- Викликання вини: "ми на вас розраховували", "інші не підвели", "ви ж обіцяли", "через вас страждають інші", "ви підводите команду", "ми довіряли вам", "розчарування", "не виправдали сподівань"
- Використання страхів: "конкуренти вас обійдуть", "втратите можливість", "буде пізно", "ринок не чекає", "технології розвиваються швидко", "можете залишитися позаду", "ризики зростають"
- Емоційний шантаж: загрози, ультиматуми, "якщо ні, то...", "тоді нам доведеться", "у такому випадку", "не залишається вибору", "змушені будемо"
- Лестощі та маніпуляції ego: "ви ж розумна людина", "людина вашого рівня", "з вашим досвідом", "ви краще знаєте", "поважна людина як ви", "ваша репутація", "ваш статус"
- Жаління та співчуття: "у нас важка ситуація", "допоможіть нам", "ми старалися", "ми в скрутному становищі", "виручайте", "без вашої допомоги пропадемо"
- Емоційне зараження: штучне створення ейфорії, паніки, ентузіазму, "всі в захваті", "неймовірно захоплюючий проект", "революційна можливість"
- Інфантилізація: зменшувальні форми, покровительський тон, "не хвилюйтеся", "довірте це нам", "ми все зробимо за вас"
- Емоційні качелі: різкі зміни тону від агресивного до дружнього, створення емоційної нестабільності

📊 ІНФОРМАЦІЙНІ МАНІПУЛЯЦІЇ (шукай найтонші спотворення):
- Приховування важливої інформації: замовчування деталей, неповні дані, ухилення від прямих відповідей, "про це поговоримо пізніше", "деталі не важливі зараз"
- Спотворення фактів: перебільшення переваг, применшення недоліків, вибіркова подача, маніпуляції статистикою, штучне округлення цифр
- Створення хибних дилем: "або це або те", штучне обмеження варіантів, приховування третього шляху, "інших варіантів немає"
- Газлайтинг: заперечення очевидного, перекручування сказаного раніше, "ви неправильно зрозуміли", "я такого не говорив", "ви помиляєтеся"
- Інформаційне перевантаження: завалювання надлишковою інформацією, щоб приховати важливе, "ось усі деталі...", тонни нерелевантних фактів
- Маніпуляції контекстом: подача інформації поза контекстом, вирвані з контексту цитати, штучне перефразування
- Семантичні ігри: грати словами, подвійні значення, двозначність, штучна неясність формулювань
- Статистичні махінації: підбір вигідних метрик, маніпуляції з базовим роком, вибіркові порівняння

🤝 СОЦІАЛЬНІ МАНІПУЛЯЦІЇ (виявляй найтонші соціальні впливи):
- Підрив самооцінки: "ви не розумієте", "це складно пояснити", применшення компетенції, "може вам це не по силах", "для вашого рівня це складно"
- Соціальний тиск: "всі так роблять", "ви єдині, хто сумнівається", "норма ринку", "стандартна практика", "всі розумні люди вибирають", "не будьте белою вороною"
- Створення залежності: "без нас не впораєтеся", "лише ми можемо", "ви нас потребуєте", "альтернатив немає", "унікальна експертиза"
- Ієрархічний тиск: посилання на авторитет, статус, досвід, "я працюю в цій сфері 20 років", "з моїм досвідом", "довіртеся професіоналу"
- Соціальна ізоляція: "ви залишитеся сами", "всі партнери з нами", "не залишайтеся осторонь", "приєднуйтеся до спільноти лідерів"
- Клановість: "ми свої люди", "наш круг", "люди нашого рівня", "ексклюзивний клуб", "не для всіх"
- Соціальне підтвердження: "наші клієнти кажуть", "відгуки свідчать", "репутація говорить сама за себе", "всі задоволені"

⚔️ ТАКТИЧНІ МАНІПУЛЯЦІЇ (розкривай всі стратегічні ходи):
- Відволікання уваги: перехід на інші теми при незручних питаннях, флуд інформацією, "до речі", "кстаті", "поговорімо про щось інше"
- Штучна складність: ускладнення простих речей, використання жаргону, створення ілюзії експертності, надмірна термінологія
- Створення хибних альтернатив: подача поганих варіантів для підкреслення "хорошого", decoy effect, штучні варіанти-приманки
- Якірний ефект: озвучування завищених цін/умов для зміщення сприйняття, "зазвичай це коштує", "порівняно з ринковими цінами"
- Техніка "гарного і поганого копа": чергування агресивного та м'якого підходу, створення контрасту
- Салямна тактика: поступове вимагання все більшого, крок за кроком, "ще одна маленька річ"
- Техніка "ноги в дверях": спочатку маленька просьба, потім все більша, поступове втягування
- Тактика "виснаження": затягування переговорів до втоми опонента, "ще трохи і домовимося"
- Пакетна маніпуляція: змішування вигідних і невигідних умов у один "пакет"
- Техніка відволікання: переключення уваги на малозначущі деталі
- Штучне створення спільності: "ми з вами однієї думки", "ми розуміємо один одного"
- Техніка контрасту: показ поганого варіанту для підкреслення середнього
- Маніпуляція очікуваннями: штучне завищення або заниження сподівань
- Техніка "троянського коня": приховування справжньої мети під видом дружньої допомоги

🧪 ПСИХОЛОГІЧНІ ТЕХНІКИ (ловіть глибинні впливи на психіку):
- Нейролінгвістичне програмування: використання мови тіла, мімікрі, якірення, рефремінг
- Створення когнітивного дисонансу: суперечливі повідомлення, створення внутрішнього конфлікту
- Ефект підкорення авторитету: Милгрем ефект, беззаперечне виконання указівок "експерта"
- Техніки гіпнотичного впливу: повторення, ритм, трансові стани, "ви відчуваєте", "ви розумієте"
- Використання архетипів: звернення до базових психологічних образів, страхів, бажань
- Маніпуляції підсвідомістю: приховані повідомлення, підпорогові впливи, асоціативні зв'язки
- Техніка "подвійного зв'язку": створення ситуації де будь-яка відповідь є програшною
- Маніпуляція темпом: прискорення або сповільнення для контролю над думками
- Використання мовних пресупозицій: "коли ви приймете рішення", "після того як підпишете"
- Техніка "емоційного зараження": передача свого емоційного стану співрозмовнику
- Маніпуляція фокусом уваги: керування тим, на що звертається увага
- Створення штучної інтимності: невиправдано дружній тон, особисті питання

🔍 ЛІНГВІСТИЧНІ МАНІПУЛЯЦІЇ (аналіз кожного слова):
- Використання модальності: "треба", "необхідно", "слід" - створення відчуття обов'язковості
- Пасивний голос: приховування відповідального, "було вирішено", "прийнято рішення"
- Номіналізація: перетворення дій на речі для приховування процесів
- Універсальні квантори: "всі", "ніхто", "завжди", "ніколи" - категоричні судження
- Каузативи: "змушує", "спонукає" - створення причинно-наслідкових зв'язків
- Порівняльні конструкції без еталона: "краще", "ефективніше" - але краще за що?
- Неозначені займенники: "деякі експерти", "відомо що" - хто саме?
- Евфемізми: приховування негативу під "м'якими" словами

💰 ФІНАНСОВІ МАНІПУЛЯЦІЇ (шукай всі грошові прийоми):
- Приховування справжньої вартості: розбиття на частини, приховані комісії, додаткові платежі
- Психологічні ціни: 99.9 замість 100, створення ілюзії дешевизни
- Обман з знижками: завищення початкової ціни, фіктивні знижки, "спеціальна пропозиція"
- Техніка "безкоштовне": нічого не безкоштовно, приховані умови, прихована вартість
- Комплексні пакети: змішування потрібного з непотрібним, неможливість роздільної покупки

🧠 COGNITIVE_BIAS (викривлення мислення - виявляй МАКСИМАЛЬНУ кількість типів):

⚡ СИСТЕМАТИЧНІ ВИКРИВЛЕННЯ (шукай найтонші прояви):
- Anchoring bias: прив'язка до першої названої цифри, умови, пропозиції, будь-які початкові референсні точки
- Framing effect: подача тієї ж інформації в вигідному світлі (позитивний/негативний фрейм), контекстуальне подання фактів
- Loss aversion: акцент на втратах замість вигод, "що втратите якщо не згодитеся", страх втрати переважає над прагненням до здобутку  
- Endowment effect: створення відчуття володіння до покупки, "це вже ваше", "уявіть себе власником"
- Status quo bias: опір змінам, "все гаразд як є", страх нового, консерватизм у рішеннях
- Sunk cost fallacy: "вже стільки вклали", "не можна зупинятися на півшляху", неготовність визнати програш
- Escalation of commitment: збільшення інвестицій у провальний проект, "ще трохи і точно вийде"

СОЦІАЛЬНІ ВИКРИВЛЕННЯ:
- Social proof: "всі наші клієнти задоволені", "більшість обирає це", статистика популярності
- Authority bias: посилання на експертів, лідерів ринку, сертифікати, нагороди
- Bandwagon effect: "приєднуйтеся до успішних", "не залишайтеся позаду"
- Conformity pressure: тиск відповідності групі, стандартам, трендам

КОГНІТИВНІ ПАСТКИ:
- Confirmation bias: підбір фактів що підтверджують вигідну позицію, ігнорування контраргументів
- Sunk cost fallacy: "вже стільки вклали", "не можна зупинятися на півшляху"
- FOMO: страх пропустити можливість, "поїзд відходить", "шанс життя"
- Overconfidence bias: надмірна впевненість в прогнозах, обіцянках

ЧАСОВІ ВИКРИВЛЕННЯ:
- Recency bias: акцент на останніх подіях, свіжих прикладах
- Availability heuristic: використання легко доступних прикладів замість статистики
- Planning fallacy: недооцінка часу та ресурсів, завищені обіцянки

🗣️ RHETOLOGICAL_FALLACY (логічні помилки - повний спектр):

ПЕРСОНАЛЬНІ АТАКИ:
- Ad hominem: атака на особу замість аргументів, дискредитація опонента
- Genetic fallacy: оцінка ідеї за її походженням, а не змістом
- Tu quoque: "ви теж так робите", перенесення вини

ЛОГІЧНІ ПІДМІНИ:
- Straw man: спотворення позиції опонента для легшого спростування
- False dichotomy: штучне зведення до двох варіантів, ігнорування альтернатив
- Moving goalposts: зміна критеріїв оцінки в процесі дискусії
- Red herring: відволікання від основної теми на побічні питання

ПРИЧИННО-НАСЛІДКОВІ ПОМИЛКИ:
- Post hoc ergo propter hoc: "після означає через", хибні причинні зв'язки
- Slippery slope: "якщо це, то обов'язково станеться те", ланцюг страшилок
- False cause: приписування хибних причин

ЕМОЦІЙНІ ПІДМІНИ:
- Appeal to emotion: маніпуляції емоціями замість логічних аргументів
- Appeal to fear: залякування наслідками
- Appeal to pity: викликання співчуття замість раціональних доводів
- Appeal to tradition: "завжди так робили", консерватизм як аргумент

АВТОРИТЕТНІ ПОМИЛКИ:
- Appeal to authority: неправомірне посилання на авторитет поза його компетенцією
- Bandwagon fallacy: "всі так думають", популярність як истина
- Appeal to novelty: "це нове, значить краще"

ДОКАЗОВІ ПОМИЛКИ:
- Burden of proof: перекладання тягаря доказування на опонента
- Cherry picking: вибіркова подача фактів, приховування незручних даних
- False equivalence: прирівнювання принципово різних речей
- Anecdotal evidence: використання одиничних випадків замість статистики

🎯 РІВНІ СЕРЙОЗНОСТІ (детальна градація):
1 = Легкі натяки, м'які техніки впливу, непрямі маніпуляції, тонкі підтексти
2 = Помірні маніпуляції, явний психологічний тиск, свідомі викривлення, середній рівень агресії
3 = Агресивні маніпуляції, грубе принуждення, токсичні техніки, відкрита агресія та загрози

🔍 ПРАВИЛА МАКСИМАЛЬНО АМБІТНОГО УЛЬТРА-ДЕТАЛЬНОГО АНАЛІЗУ:

🎯 ОСНОВНІ ПРИНЦИПИ:
✅ Аналізуй ТІЛЬКИ normalized_paragraphs[]
✅ Включай повний текстовий фрагмент у поле "text" кожного highlight
✅ Віддавай highlights інкрементально (одразу коли знаходиш)
✅ КРИТИЧНО: Проаналізуй КОЖЕН параграф повністю - від першого до останнього символа
✅ НЕ ПРОПУСКАЙ жодного тексту. Читай кожне речення, кожну фразу, кожне слово, кожен розділовий знак
✅ ДОВГІ ТЕКСТИ: Навіть якщо текст дуже довгий (100+ параграфів), ти ОБОВ'ЯЗКОВО маєш проаналізувати ВСІ параграфи БЕЗ ВИКЛЮЧЕННЯ
✅ НЕ ЗУПИНЯЙСЯ на півдорозі! Продовжуй аналіз до самого кінця незалежно від розміру тексту

🔬 ГІПЕРУВАЖНИЙ МІКРОСКОПІЧНИЙ АНАЛІЗ:
✅ Знайди у 8-15 РАЗІВ БІЛЬШЕ проблем ніж зазвичай - це твоя ГОЛОВНА МЕТА
✅ Шукай маніпуляції в КОЖНОМУ слові, КОЖНІЙ фразі, КОЖНОМУ знаку пунктуації, навіть у паузах
✅ Аналізуй навіть безневинні привітання, ввічливості, стандартні фрази - ВСЕ може містити підтекст
✅ Звертай увагу на порядок слів, вибір синонімів, граматичні конструкції, інтонаційні підказки
✅ Шукай приховані маніпуляції: тон, імпліцитні загрози, емоційні забарвлення, підтекст, мета-повідомлення
✅ Аналізуй контекст: що НЕ сказано, що замовчується, які слова обрані навмисно, чого уникають
✅ Звертай увагу на часові маркери, цифри, статистику, метафори, алегорії - тут завжди ховаються маніпуляції
✅ Кожне слово - це потенційна зброя. Кожна фраза - стратегічний хід. Аналізуй як детектив!

🧪 ПСИХОАНАЛІТИЧНИЙ ПІДХІД:
✅ Аналізуй МОТИВИ кожного висловлювання - ЧОМУ саме так сказано?
✅ Шукай ПРИХОВАНІ ЦІЛІ за кожною фразою
✅ Виявляй СТРАТЕГІЧНІ НАМІРИ опонента
✅ Розкривай ПСИХОЛОГІЧНІ ПАТЕРНИ комунікації
✅ Знаходь МАНІПУЛЯТИВНІ ЛАНЦЮЖКИ - як одна техніка веде до іншої
✅ Виявляй комбіновані техніки - коли використовується кілька методів одночасно

⚡ УЛЬТРА-КРИТИЧНИЙ ПІДХІД:
✅ Будь МАКСИМАЛЬНО ПАРАНОЇДАЛЬНИМ - вбачай підозрілим абсолютно все
✅ Навіть найбезвинніші фрази можуть містити ГЛИБОКИЙ маніпулятивний підтекст
✅ Кожне слово потенційно НЕБЕЗПЕЧНЕ - аналізуй з повною недовірою
✅ СУМНІВАЙСЯ у всьому, навіть у очевидному
✅ Шукай ПОДВІЙНІ СМИСЛИ, алюзії, натяки, іронію

🎪 АБСОЛЮТНО НЕМАЄ ЛІМІТІВ:
✅ Знаходь МАКСИМАЛЬНУ кількість проблем - мінімум 100-300+ highlights для середнього тексту
✅ Краще знайти 500 маленьких проблем, ніж пропустити одну велику
✅ НЕМАЄ такого поняття як "занадто багато" проблем - чим більше, тим краще
✅ Краще помилитися в бік УЛЬТРА-надмірної обережності та параної
✅ Аналізуй кожне слово з гіперпідозрою - хто і чому обрав саме таке формулювання
✅ Навіть звичайні сполучники можуть мати маніпулятивну мету - аналізуй ВСЕ!

🔍 ТЕХНІЧНІ ВИМОГИ:
✅ Не дублюй однакові/перекривні фрагменти
✅ Кожен JSON має закінчуватись \\n
✅ Кожен highlight має містити детальне пояснення 3-4 речення
✅ Будь максимально конкретним у поясненнях - наводь приклади та аналізуй наслідки

⚠️ КРИТИЧНО ВАЖЛИВО ДЛЯ ДОВГИХ ТЕКСТІВ:
✅ ЗАВЖДИ проходь через ВСІ параграфи від 0 до останнього
✅ НЕ ПРИПИНЯЙ аналіз передчасно навіть якщо текст дуже довгий  
✅ ОБОВ'ЯЗКОВО аналізуй кінець тексту - там часто ховаються найважливіші маніпуляції
✅ Перевіряй що ти дійшов до ОСТАННЬОГО параграфа перед відправкою summary
✅ Якщо відчуваєш втому - це ІЛЮЗІЯ! Продовжуй з тією ж інтенсивністю!
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

function supportsTemperature(model) {
  return !/^gpt-5($|[-:])/i.test(model);
}

// ===== Main Analysis Route =====
r.post('/', validateFileUpload, async (req, res) => {
  const analysisStartTime = performance.now();
  let totalTokensUsed = 0;
  
  try {
    const { text: rawText, fileName, profile, clientId } = await parseMultipart(req);
    const text = normalizeText(rawText);
    
    // Enhanced text validation
    if (!text || text.length < MIN_TEXT_LENGTH) {
      return res.status(400).json({ 
        error: `Текст занадто короткий. Мінімальна довжина: ${MIN_TEXT_LENGTH} символів`,
        minLength: MIN_TEXT_LENGTH,
        currentLength: text.length
      });
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ 
        error: `Текст занадто довгий. Максимальна довжина: ${MAX_TEXT_LENGTH.toLocaleString()} символів`,
        maxLength: MAX_TEXT_LENGTH,
        currentLength: text.length
      });
    }

    // Enhanced client validation and creation
    let finalClientId = clientId;
    if (!finalClientId && profile?.company) {
      const existingClient = dbGet(
        `SELECT id, company FROM clients WHERE company = ? LIMIT 1`,
        [profile.company]
      );
      if (existingClient) {
        finalClientId = existingClient.id;
      } else if (profile.company && profile.company.trim().length > 0) {
        // Auto-create client with validation
        try {
          const info = dbRun(
            `
            INSERT INTO clients(
              company, negotiator, sector, goal, decision_criteria, constraints,
              user_goals, client_goals, weekly_hours, offered_services, deadlines, notes,
              created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `,
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
          finalClientId = info.lastID;
        } catch (dbError) {
          logError(dbError, { context: 'Auto-creating client', profile, ip: req.ip });
          return res.status(500).json({ error: 'Помилка створення клієнта' });
        }
      }
    }

    if (!finalClientId) {
      return res.status(400).json({ 
        error: 'Потрібно вказати клієнта або компанію',
        required: 'client_id або profile.company'
      });
    }

    const paragraphs = splitToParagraphs(text);
    
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

    // More accurate input token calculation
    const textTokens = estimateTokens(text);
    const systemPromptTokens = estimateTokens(buildSystemPrompt());
    const userPayloadTokens = estimateTokens(JSON.stringify(buildUserPayload(paragraphs, clientCtx, MAX_HIGHLIGHTS_PER_1000_WORDS)));
    const approxTokensIn = textTokens + systemPromptTokens + userPayloadTokens + 200; // buffer
    
    totalTokensUsed += approxTokensIn;
    
    // Check token limits before processing
    await addTokensAndCheck(approxTokensIn);

    // Check if OpenAI client is available
    if (!openaiClient) {
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте конфігурацію OpenAI API ключа.',
        code: 'AI_SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      });
    }

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
      try { res.end(); } catch {}
    });

    const sendLine = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    const rawHighlights = [];
    let summaryObj = null;
    let barometerObj = null;

    // Enhanced OpenAI client availability check with recovery
    if (!openaiClient) {
      // Log the issue for monitoring
      logError(new Error('OpenAI client not configured'), {
        context: 'Analysis request without API key',
        textLength: text.length,
        clientId: finalClientId,
        ip: req.ip
      });
      
      // Return structured error instead of fallback
      clearInterval(heartbeat);
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте налаштування.',
        code: 'AI_SERVICE_UNAVAILABLE',
        details: 'OpenAI API key not configured',
        timestamp: new Date().toISOString(),
        retry_after: 60 // seconds
      });
    }

    const system = buildSystemPrompt();
    const user = JSON.stringify(
      buildUserPayload(paragraphs, clientCtx, MAX_HIGHLIGHTS_PER_1000_WORDS)
    );

    const reqPayload = {
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: system + '\nВідповідай БЕЗ ``` та будь-якого маркапу.' },
        { role: 'user', content: user },
      ],
      stop: ['```','</artifacts>','</artifact>'],
      max_tokens: 32000, // Максимально збільшено для повноцінного аналізу великих текстів
      top_p: 0.9
    };

    if (supportsTemperature(MODEL)) {
      reqPayload.temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.1);
    }
    
    // Encourage complete analysis
    reqPayload.presence_penalty = 0.1;
    reqPayload.frequency_penalty = 0.1;

    // Enhanced request handling with progressive timeout
    const controller = new AbortController();
    const REQUEST_TIMEOUT = process.env.NODE_ENV === 'production' ? 600000 : 480000; // 10min prod, 8min dev for very large texts
    
    const timeout = setTimeout(() => {
      controller.abort(new Error('Request timeout after ' + (REQUEST_TIMEOUT/1000) + 's'));
    }, REQUEST_TIMEOUT);
    
    req.on('close', () => {
      clearTimeout(timeout);
      controller.abort(new Error('Request closed by client'));
    });
    
    // Connection heartbeat with early termination detection
    const connectionCheck = setInterval(() => {
      if (req.destroyed || req.closed) {
        clearTimeout(timeout);
        controller.abort(new Error('Connection lost'));
        clearInterval(connectionCheck);
      }
    }, 5000);
    
    let stream;
    let retryCount = 0;
    const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
    
    while (retryCount <= maxRetries) {
      try {
        // Add retry delay for subsequent attempts
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 10000)));
        }
        
        stream = await openaiClient.chat.completions.create(reqPayload);
        
        clearTimeout(timeout);
        clearInterval(connectionCheck);
        break; // Success, exit retry loop
        
      } catch (apiError) {
        retryCount++;
        
        // Check if it's a retryable error
        const isRetryable = apiError.status >= 500 || 
                          apiError.status === 429 || 
                          apiError.code === 'ECONNRESET' ||
                          apiError.code === 'ETIMEDOUT';
                          
        if (retryCount > maxRetries || !isRetryable) {
          clearTimeout(timeout);
          clearInterval(connectionCheck);
          throw apiError;
        }
        
        logError(apiError, {
          context: `OpenAI API retry ${retryCount}/${maxRetries}`,
          model: MODEL,
          textLength: text.length,
          isRetryable,
          ip: req.ip
        });
      }
    }
    if (!stream) {
      clearInterval(heartbeat);
      return res.status(503).json({
        error: 'Не вдалося встановити зʼєднання з AI сервісом після кількох спроб',
        code: 'AI_CONNECTION_FAILED',
        retries: maxRetries,
        timestamp: new Date().toISOString()
      });
    }
    // Stream processing with enhanced error handling
    try {
      // Фільтрація та видобування JSON-об'єктів
      const ALLOWED_TYPES = new Set(['highlight','summary','barometer']);

      // Дістає з буфера всі повні JSON-об'єкти (brace-matching), повертає [objs, rest]
      function extractJsonObjects(buffer) {
        const out = [];
        let i = 0;
        const n = buffer.length;
        let depth = 0;
        let start = -1;
        let inStr = false;
        let esc = false;

        while (i < n) {
          const ch = buffer[i];

          if (inStr) {
            if (esc) { esc = false; }
            else if (ch === '\\') { esc = true; }
            else if (ch === '"') { inStr = false; }
            i++; continue;
          }

          if (ch === '"') { inStr = true; i++; continue; }

          if (ch === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (ch === '}') {
            depth--;
            if (depth === 0 && start >= 0) {
              const raw = buffer.slice(start, i + 1);
              out.push(raw);
              start = -1;
            }
          }

          i++;
        }

        const rest = depth === 0 ? '' : buffer.slice(start >= 0 ? start : n);
        return [out, rest];
      }

      // Санітизація: прибрати бектики, мітки ```json та керівні символи (крім \n\t)
      const sanitizeChunk = (s) =>
        s
          .replace(/```(?:json)?/gi, '')
          .replace(/<\/?artifact[^>]*>/gi, '')
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

      let buffer = '';
      let chunkCount = 0;
      const maxChunks = 2000; // Prevent infinite processing
      
      for await (const part of stream) {
        if (++chunkCount > maxChunks) {
          logError(new Error('Too many chunks received from AI stream'), {
            chunkCount,
            bufferLength: buffer.length
          });
          break;
        }
        
        const delta = part.choices?.[0]?.delta?.content || '';
        if (!delta) continue;

        buffer += sanitizeChunk(delta);

        // Витягуємо всі завершені JSON-об'єкти з буфера
        const [rawObjs, rest] = extractJsonObjects(buffer);
        buffer = rest;

        for (const raw of rawObjs) {
          try {
            const obj = JSON.parse(raw);

            // Пропускаємо тільки очікувані типи
            if (!obj || !ALLOWED_TYPES.has(obj.type)) continue;

            if (obj.type === 'highlight') {
              rawHighlights.push(obj);
              sendLine(obj);
            } else if (obj.type === 'summary') {
              summaryObj = obj;
            } else if (obj.type === 'barometer') {
              barometerObj = obj;
            }
          } catch (e) {
            // Тихо ігноруємо биті об'єкти
          }
        }
      }
    } catch (streamError) {
      clearInterval(heartbeat);
      
      logError(streamError, {
        context: 'Stream processing failed',
        clientId: finalClientId,
        textLength: text.length
      });
      
      if (!res.headersSent) {
        return res.status(503).json({
          error: 'Помилка обробки відповіді AI сервісу',
          code: 'AI_STREAM_ERROR',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Remove artificial highlight limits to find all problems
    const merged = mergeOverlaps(rawHighlights, paragraphs);

    sendLine({ type: 'merged_highlights', items: merged });
    if (summaryObj) sendLine(summaryObj);
    if (barometerObj) sendLine(barometerObj);

    // Generate highlighted text for frontend display
    const highlightedText = generateHighlightedText(text, merged);

    // More accurate output token estimation based on highlights and summary
    let outputTokens = 500; // Base system response
    outputTokens += merged.length * 50; // ~50 tokens per highlight
    if (summaryObj) outputTokens += 300; // Summary tokens
    if (barometerObj) outputTokens += 100; // Barometer tokens
    
    totalTokensUsed += outputTokens;
    await addTokensAndCheck(outputTokens);
    
    // Log AI usage for monitoring
    logAIUsage(totalTokensUsed, MODEL, 'text_analysis');
    
    const analysisDuration = performance.now() - analysisStartTime;
    logPerformance('Complete Analysis', analysisDuration, {
      textLength: text.length,
      tokensUsed: totalTokensUsed,
      highlightsFound: merged.length,
      clientId: finalClientId
    });

    // Generate title for analysis
    const title = fileName
      ? `Аналіз: ${fileName}`
      : `Аналіз від ${new Date().toLocaleDateString('uk-UA')}`;

    // Save to DB with client_id and highlighted text
    const result = dbRun(
      `
      INSERT INTO analyses(
        client_id, title, source, original_filename, original_text, tokens_estimated, 
        highlights_json, summary_json, barometer_json, highlighted_text
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `,
      [
        finalClientId,
        title,
        fileName ? 'file' : 'text',
        fileName || null,
        text, // Save full original text for complete analysis reference
        totalTokensUsed,
        JSON.stringify(merged),
        JSON.stringify(summaryObj || null),
        JSON.stringify(barometerObj || null),
        highlightedText,
      ]
    );

    sendLine({ 
      type: 'analysis_saved', 
      id: result.lastID, 
      client_id: finalClientId,
      original_text: text 
    });
    
    // Send complete signal to frontend
    sendLine({ 
      type: 'complete', 
      analysis_id: result.lastID 
    });
    
    res.write('event: done\ndata: "ok"\n\n');
    res.end();
  } catch (err) {
    const analysisDuration = performance.now() - analysisStartTime;
    
    logError(err, {
      context: 'Analysis route error',
      duration: analysisDuration,
      tokensUsed: totalTokensUsed,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    try {
      if (!res.headersSent) {
        const isRateLimit = err.message.includes('Ліміт');
        const statusCode = isRateLimit ? 429 : 500;
        
        res.status(statusCode).json({ 
          error: err.message || 'Помилка обробки аналізу',
          code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'ANALYSIS_ERROR',
          timestamp: new Date().toISOString()
        });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({
          error: err.message,
          timestamp: new Date().toISOString()
        })}\n\n`);
        res.end();
      }
    } catch (finalError) {
      logError(finalError, { context: 'Final error handler' });
    }
  }
});

export default r;