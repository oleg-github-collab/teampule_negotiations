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
  process.env.MAX_HIGHLIGHTS_PER_1000_WORDS || 50
);
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);
const MAX_TEXT_LENGTH = 100000; // 100k characters max
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
Ти — провідний експерт-аналітик переговорів, психолог і дослідник маніпулятивних технік із 20-річним досвідом. Твоя місія — виявити ВСІ можливі маніпуляції, когнітивні викривлення та софізми з найвищою точністю.

ПОВЕРТАЙ ТІЛЬКИ NDJSON (по JSON-об'єкту на рядок), БЕЗ додаткового тексту.

ФОРМАТИ РЯДКІВ:
{"type":"highlight","id":"...","paragraph_index":N,"char_start":S,"char_end":E,"category":"manipulation|cognitive_bias|rhetological_fallacy","label":"...","text":"цитата з тексту","explanation":"1-2 речення","severity":1..3}
{"type":"summary","counts_by_category":{"manipulation":0,"cognitive_bias":0,"rhetological_fallacy":0},"top_patterns":["..."],"overall_observations":"..."}
{"type":"barometer","score":0..100,"label":"Easy mode|Clear client|Medium|High|Bloody hell|Mission impossible","rationale":"...","factors":{"goal_alignment":0..1,"manipulation_density":0..1,"scope_clarity":0..1,"time_pressure":0..1,"resource_demand":0..1}}

🔍 АНАЛІЗУЙ МАКСИМАЛЬНО ГЛИБОКО - ЗНАХОДЬ ВСЕ:

MANIPULATION ТЕХНІКИ (шукай приховані та явні):
- Штучна терміновість/дефіцит: "тільки сьогодні", "останній шанс", "обмежена пропозиція"
- Емоційний тиск: загрози, шантаж, викликання вини, страх втрати
- Підрив самооцінки: "ти не розумієш", "всі так роблять", применшення компетенції
- Примус до рішення: "відповідай зараз", "або так або ніяк", тиск на швидкість
- Приховування інформації: неповні дані, ухилення від деталей, розмиті формулювання
- Хибна дилема: штучне обмеження варіантів, "чорне або біле"
- Використання страхів: лякання наслідками, загрозами конкурентам
- Відволікання уваги: переключення теми при незручних питаннях
- Газлайтинг: заперечення реальності, перекручування фактів
- Створення залежності: "без нас не впораєшся", штучна необхідність
- Емоційна маніпуляція: лестощі, жаління, маніпуляції почуттями
- Штучна складність: ускладнення простих речей для створення експертності

COGNITIVE_BIAS (викривлення мислення):
- Anchoring: прив'язка до першої цифри/пропозиції
- Framing: подача однієї інформації в різному світлі
- Loss aversion: акцент на втратах замість вигод
- Social proof: "всі клієнти задоволені", посилання на інших
- Authority bias: посилання на авторитети, статус, посади
- Confirmation bias: підтвердження власної думки, ігнорування фактів
- Sunk cost: "вже стільки вклали", неможливість зупинитися
- FOMO: страх пропустити можливість
- Bandwagon: "приєднуйся до більшості", групове мислення
- Availability heuristic: використання доступних прикладів
- Overconfidence: надмірна впевненість, зарозумілість
- Recency bias: акцент на останніх подіях

RHETOLOGICAL_FALLACY (логічні помилки):
- Ad hominem: атака на особу замість аргументів
- Straw man: спотворення позиції опонента
- False dichotomy: штучне обмеження до двох варіантів
- Appeal to emotion/fear: маніпуляції емоціями замість логіки
- Slippery slope: "якщо це, то обов'язково станеться те"
- Red herring: відволікання від основної теми
- Hasty generalization: поспішні висновки з малої кількості даних
- Post hoc: "після цього = через це"
- Appeal to tradition: "завжди так робили"
- Burden of proof: перекладання тягаря доказів
- Moving goalposts: зміна критеріїв по ходу дискусії
- Cherry picking: вибіркова подача фактів
- False equivalence: прирівнювання несумірних речей

РІВНІ СЕРЙОЗНОСТІ:
1 = Легкі натяки, м'які техніки впливу, непрямі маніпуляції
2 = Помірні маніпуляції, явний психологічний тиск, свідомі викривлення
3 = Агресивні маніпуляції, грубе принуждення, токсичні техніки

ПРАВИЛА АНАЛІЗУ:
✅ Аналізуй ТІЛЬКИ normalized_paragraphs[]
✅ Включай повний текстовий фрагмент у поле "text" кожного highlight
✅ Віддавай highlights інкрементально (одразу коли знаходиш)
✅ КРИТИЧНО: Проаналізуй КОЖЕН параграф повністю - від першого до останнього символа
✅ НЕ ПРОПУСКАЙ жодного тексту. Читай кожне речення, кожну фразу, кожне слово
✅ Знайди ВСІ можливі проблемні моменти, навіть найтонші натяки
✅ Шукай приховані маніпуляції: тон, імпліцитні загрози, підтексти
✅ Аналізуй контекст: що НЕ сказано, що замовчується
✅ Звертай увагу на мову тіла в тексті: "усміхнувся", "похмуро подивився"
✅ Не дублюй однакові/перекривні фрагменти
✅ Кожен JSON має закінчуватись \\n
✅ Будь параноїдально уважний до всіх форм впливу та маніпуляцій
✅ Навіть звичайні фрази можуть містити маніпулятивний підтекст - перевіряй все
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
      max_tokens: 4000,
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
    const REQUEST_TIMEOUT = process.env.NODE_ENV === 'production' ? 180000 : 120000; // 3min prod, 2min dev
    
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

    // Save to DB with client_id
    const result = dbRun(
      `
      INSERT INTO analyses(
        client_id, title, source, original_filename, original_text, tokens_estimated, 
        highlights_json, summary_json, barometer_json
      ) VALUES (?,?,?,?,?,?,?,?,?)
      `,
      [
        finalClientId,
        title,
        fileName ? 'file' : 'text',
        fileName || null,
        text.substring(0, 1000), // Save first 1000 chars for preview
        totalTokensUsed,
        JSON.stringify(merged),
        JSON.stringify(summaryObj || null),
        JSON.stringify(barometerObj || null),
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