// routes/analyze.js - Production analysis engine (PostgreSQL + Participant Filter)
import { Router } from 'express';
import { run as dbRun, get as dbGet } from '../utils/db-postgres.js';
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
const MAX_TEXT_LENGTH = 200000; // 200k characters max (~30 pages A4, ~400-500 words per page)
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

// Smart text chunking for large texts
function createSmartChunks(text, maxChunkSize = 4000) {
  console.log(`📦 Starting smart chunking for text of ${text.length} characters`);

  if (text.length <= maxChunkSize) {
    console.log('📦 Text fits in single chunk');
    return [{ text, startChar: 0, endChar: text.length, chunkIndex: 0 }];
  }

  const chunks = [];
  const paragraphs = splitToParagraphs(text);
  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraWithNewlines = (i > 0 ? '\n\n' : '') + para.text;
    
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + paraWithNewlines.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
        chunkIndex: chunkIndex++
      });
      
      // Start new chunk
      currentChunk = para.text;
      currentStartChar = para.startOffset;
    } else {
      // Add paragraph to current chunk
      currentChunk += paraWithNewlines;
      if (currentChunk === paraWithNewlines) {
        // First paragraph in chunk
        currentStartChar = para.startOffset;
      }
    }
  }

  // Add final chunk if not empty
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk,
      startChar: currentStartChar,
      endChar: currentStartChar + currentChunk.length,
      chunkIndex: chunkIndex
    });
  }

  console.log(`📦 Created ${chunks.length} chunks from ${text.length} characters`);
  return chunks;
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

// PostgreSQL async version
async function getUsageRow() {
  const day = new Date().toISOString().slice(0, 10);
  let row = await dbGet(`SELECT * FROM usage_daily WHERE day = $1`, [day]);
  if (!row) {
    await dbRun(`INSERT INTO usage_daily(day, tokens_used) VALUES($1, 0)`, [day]);
    row = await dbGet(`SELECT * FROM usage_daily WHERE day = $1`, [day]);
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
    await dbRun(
      `UPDATE usage_daily SET tokens_used = $1, locked_until = $2 WHERE day = $3`,
      [newTotal, lock, day]
    );
    throw new Error(`Досягнуто денний ліміт токенів. Блокування до ${lock}`);
  } else {
    await dbRun(`UPDATE usage_daily SET tokens_used = $1 WHERE day = $2`, [
      newTotal,
      day,
    ]);
  }
}

// ===== Participant Filter Functions =====
function extractParticipants(text) {
  // Detect participants from conversation patterns
  const patterns = [
    /^([А-ЯЁA-Z][а-яёa-zA-Z\s'-]{1,48}):/gm,        // "Name:"
    /^([А-ЯЁA-Z][а-яёa-zA-Z\s'-]{1,48})\s*-\s*/gm,  // "Name -"
    /\[([А-ЯЁA-Z][а-яёa-zA-Z\s'-]{1,48})\]/g,       // "[Name]"
    /^([А-ЯЁA-Z][а-яёa-zA-Z\s'-]{1,48})>/gm,        // "Name>"
  ];

  const participants = new Set();

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = match[1].trim();
      // Filter out common false positives
      if (name.length >= 2 &&
          name.length <= 50 &&
          !name.match(/^(Re|Fw|Fwd|Subject|From|To|Date|Sent|Received)$/i)) {
        participants.add(name);
      }
    }
  });

  return Array.from(participants).sort();
}

function filterTextByParticipants(text, selectedParticipants) {
  if (!selectedParticipants || selectedParticipants.length === 0) {
    return { filteredText: text, participantsFound: [] }; // Return all text
  }

  const lines = text.split('\n');
  const filtered = [];
  let currentParticipant = null;
  let isSelectedParticipant = false;

  for (const line of lines) {
    // Check if line starts with a participant name
    const participantMatch = line.match(/^([А-ЯЁA-Z][а-яёa-zA-Z\s'-]+):/);

    if (participantMatch) {
      currentParticipant = participantMatch[1].trim();
      isSelectedParticipant = selectedParticipants.includes(currentParticipant);
    }

    // Include line if it's from selected participant or no participant detected yet
    if (isSelectedParticipant || currentParticipant === null) {
      filtered.push(line);
    }
  }

  return {
    filteredText: filtered.join('\n'),
    participantsFound: selectedParticipants.filter(p => text.includes(p + ':'))
  };
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let text = '';
    let fileName = '';
    let profile = null;
    let clientId = null;
    let fileBuffer = null;
    let selectedParticipants = null;

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
      if (name === 'participants') {
        try {
          selectedParticipants = JSON.parse(val);
        } catch {
          selectedParticipants = null;
        }
      }
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
        resolve({ text, fileName, profile, clientId, selectedParticipants });
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
Ти — експерт-аналітик переговорів з 15-річним досвідом роботи з міжнародними компаніями, включаючи Fortune 500, державні контракти та складні B2B переговори.

Твоя місія — провести ПРОФЕСІЙНИЙ, ЗБАЛАНСОВАНИЙ та КОНТЕКСТУАЛЬНИЙ аналіз тексту переговорів.

🎯 МЕТА:
Виявити РЕАЛЬНО ЗНАЧУЩІ маніпуляції, когнітивні викривлення та софізми, які можуть серйозно вплинути на результат переговорів. Фокусуйся на ЯКОСТІ знахідок, а не їх кількості.

⚖️ ПРИНЦИПИ ПРОФЕСІЙНОГО АНАЛІЗУ:

1. КОНТЕКСТ ПОНАД УСЕ
   - Враховуй культурний і бізнес-контекст
   - Розрізняй стандартні переговорні практики та справжні маніпуляції
   - "Обмежена пропозиція" у sales НЕ завжди є маніпуляцією
   - Ввічливість та професійна лексика - це норма, не маніпуляція

2. ГРАДАЦІЯ ВАЖЛИВОСТІ (Severity)
   - **Severity 1**: Легкі техніки впливу (стандартні переговорні тактики, потребують уваги)
   - **Severity 2**: Помірні маніпуляції (потенційно проблемні, потребують обережності)
   - **Severity 3**: Критичні маніпуляції (червоні прапори, deal-breakers, серйозні загрози)

3. ДОКАЗОВІСТЬ
   - Кожна знахідка має чітке обґрунтування
   - Пояснюй ЧОМУ це проблема саме в ЦЬОМУ конкретному контексті
   - Наводь потенційний вплив на результат переговорів

🔍 ЩО ШУКАТИ (за пріоритетом):

ВИСОКИЙ ПРІОРИТЕТ (Severity 2-3):
✅ Приховування критичної інформації про умови, ризики, фінанси
✅ Емоційний шантаж та маніпуляції почуттям вини
✅ Штучний тиск часу для прийняття ВАЖЛИВИХ рішень (не стосується реальних дедлайнів)
✅ Газлайтинг та перекручування раніше сказаного
✅ Агресивні тактики (погрози, ультиматуми без обґрунтування)
✅ Фінансові маніпуляції (приховані платежі, обман з цінами)
✅ Серйозне спотворення фактів

СЕРЕДНІЙ ПРІОРИТЕТ (Severity 1-2):
✅ Соціальний тиск ("всі так роблять" без доказів)
✅ Anchoring та framing effects
✅ Використання авторитету поза компетенцією
✅ Апеляції до емоцій ЗАМІСТЬ логіки
✅ Вибіркова подача інформації

❌ НЕ ПОЗНАЧАЙ ЯК МАНІПУЛЯЦІЇ:
- Звичайні ввічливості ("дякую", "будь ласка", "доброго дня")
- Стандартні бізнес-фрази ("розглянемо пропозицію", "повернемося з відповіддю")
- Професійну термінологію та жаргон
- Нейтральні питання та уточнення
- Законні обмеження (реальні дедлайни, compliance вимоги)
- Конструктивну критику та зворотній зв'язок

🎯 ФОРМАТ ВІДПОВІДІ (ТІЛЬКИ NDJSON):

{"type":"highlight","paragraph_index":N,"char_start":S,"char_end":E,"category":"manipulation|cognitive_bias|rhetological_fallacy","label":"Короткий опис","text":"точна цитата","explanation":"ДЕТАЛЬНЕ пояснення: ЩО це за техніка, ЧОМУ це проблема в цьому контексті, ЯК може вплинути, що робити","severity":1-3}

{"type":"summary","counts_by_category":{"manipulation":N,"cognitive_bias":N,"rhetological_fallacy":N},"top_patterns":["5-10 найважливіших патернів"],"overall_observations":"Чесна оцінка загальної стратегії (не завжди негативна)","strategic_assessment":"Оцінка професійності співрозмовника","risk_level":"low|medium|high|critical"}

{"type":"barometer","score":0-100,"label":"Easy mode|Clear client|Medium|High|Bloody hell|Mission impossible","rationale":"Обґрунтування складності з прикладами","factors":{"goal_alignment":0-1,"manipulation_density":0-1,"transparency":0-1,"time_pressure":0-1,"financial_risk":0-1}}

🎓 ПРИКЛАД ЯКІСНОГО АНАЛІЗУ:

❌ BAD (параноїдальний):
"Привітання 'Доброго дня' - manipulation, severity 2, створення штучної ввічливості для маніпуляції довірою"

✅ GOOD (професійний):
"'Якщо не підпишете до п'ятниці, ціна зросте на 30%' - manipulation, severity 3.
Штучний тиск часу без обґрунтування. Проблема: немає пояснення чому саме п'ятниця та чому 30%.
Типова тактика примушування до швидкого рішення без аналізу.
Вплив: можете прийняти невигідне рішення під тиском.
Рекомендація: запитати обґрунтування дедлайну та зміни ціни, попросити надати це письмово."

ПРАВИЛА:
✅ Аналізуй normalized_paragraphs[]
✅ Включай точний text у кожен highlight
✅ НЕ ДУБЛЮЙ однакові фрагменти
✅ Detailed explanation (3-5 речень) для кожної знахідки
✅ Severity обґрунтовано
✅ ПОВЕРТАЙ ТІЛЬКИ NDJSON, БЕЗ маркапу
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
    const { text: rawText, fileName, profile, clientId, selectedParticipants } = await parseMultipart(req);
    let text = normalizeText(rawText);

    // Extract and filter by participants if requested
    const allParticipants = extractParticipants(text);
    let participantsFilter = null;

    if (selectedParticipants && selectedParticipants.length > 0) {
      const filterResult = filterTextByParticipants(text, selectedParticipants);
      text = filterResult.filteredText;
      participantsFilter = {
        all: allParticipants,
        selected: selectedParticipants,
        found: filterResult.participantsFound
      };
      console.log(`👥 Filtered by participants: ${selectedParticipants.join(', ')}`);
    }

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
      const existingClient = await dbGet(
        `SELECT id, company FROM clients WHERE company = $1 LIMIT 1`,
        [profile.company]
      );
      if (existingClient) {
        finalClientId = existingClient.id;
      } else if (profile.company && profile.company.trim().length > 0) {
        // Auto-create client with validation
        try {
          const info = await dbRun(
            `
            INSERT INTO clients(
              company, negotiator, sector, goal, decision_criteria, constraints,
              user_goals, client_goals, weekly_hours, offered_services, deadlines, notes
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING id
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
            ]
          );
          finalClientId = info.rows[0].id;
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

    // Create chunks for large texts
    const chunks = createSmartChunks(text);
    console.log(`📦 Processing ${chunks.length} chunks for analysis`);
    
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
    let chunkIndex = 0;

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
    
    // Process each chunk separately for large texts
    for (const chunk of chunks) {
      console.log(`📦 Processing chunk ${chunk.chunkIndex + 1}/${chunks.length} (${chunk.text.length} chars)`);
      
      // Create paragraphs for this chunk
      const chunkParagraphs = splitToParagraphs(chunk.text);
      
      // Adjust paragraph indices to match original text
      const adjustedParagraphs = chunkParagraphs.map(p => ({
        ...p,
        index: p.index + (chunk.chunkIndex * 1000), // Unique index across chunks
        startOffset: p.startOffset + chunk.startChar,
        endOffset: p.endOffset + chunk.startChar
      }));
      
      const user = JSON.stringify(
        buildUserPayload(adjustedParagraphs, clientCtx, MAX_HIGHLIGHTS_PER_1000_WORDS)
      );

      const reqPayload = {
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: system + '\nВідповідай БЕЗ ``` та будь-якого маркапу.' },
          { role: 'user', content: user },
        ],
        stop: ['```','</artifacts>','</artifact>'],
        max_tokens: 8000, // Increased for larger texts with more findings
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
      const REQUEST_TIMEOUT = process.env.NODE_ENV === 'production' ? 300000 : 240000; // 5min prod, 4min dev for large texts
      
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
                // Adjust highlight positions for chunk offset
                const adjustedHighlight = {
                  ...obj,
                  paragraph_index: obj.paragraph_index + (chunk.chunkIndex * 1000),
                  char_start: (obj.char_start || 0) + chunk.startChar,
                  char_end: (obj.char_end || 0) + chunk.startChar
                };
                rawHighlights.push(adjustedHighlight);
                sendLine(adjustedHighlight);
              } else if (obj.type === 'summary') {
                // Merge summaries from multiple chunks
                if (summaryObj) {
                  // Combine counts
                  Object.keys(obj.counts_by_category || {}).forEach(key => {
                    summaryObj.counts_by_category[key] = 
                      (summaryObj.counts_by_category[key] || 0) + (obj.counts_by_category[key] || 0);
                  });
                  // Combine patterns
                  summaryObj.top_patterns = [
                    ...(summaryObj.top_patterns || []),
                    ...(obj.top_patterns || [])
                  ];
                } else {
                  summaryObj = obj;
                }
              } else if (obj.type === 'barometer') {
                // Use the highest complexity score from all chunks
                if (!barometerObj || (obj.score || 0) > (barometerObj.score || 0)) {
                  barometerObj = obj;
                }
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
      
      console.log(`📦 Completed chunk ${chunk.chunkIndex + 1}/${chunks.length}`);
    } // End of chunk processing loop

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
    const result = await dbRun(
      `
      INSERT INTO analyses(
        client_id, title, source, original_filename, original_text, tokens_estimated,
        highlights_json, summary_json, barometer_json, highlighted_text, participants_filter
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11::jsonb)
      RETURNING id
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
        highlightedText,
        participantsFilter ? JSON.stringify(participantsFilter) : null,
      ]
    );

    const analysisId = result.rows[0].id;

    sendLine({
      type: 'analysis_saved',
      id: analysisId,
      client_id: finalClientId,
      original_text: text,
      participants_filter: participantsFilter
    });

    // Send complete signal to frontend
    sendLine({
      type: 'complete',
      analysis_id: analysisId
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