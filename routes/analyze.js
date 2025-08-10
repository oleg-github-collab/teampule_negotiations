// routes/analyze.js
import { Router } from 'express';
import { run as dbRun, get as dbGet } from '../utils/db.js';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import Busboy from 'busboy';
import mammoth from 'mammoth';

const r = Router();

const MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const MAX_HIGHLIGHTS_PER_1000_WORDS = Number(process.env.MAX_HIGHLIGHTS_PER_1000_WORDS || 12);
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);

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
function mergeOverlaps(highlights) {
  const byPara = new Map();
  for (const h of highlights) {
    if (!byPara.has(h.paragraph_index)) byPara.set(h.paragraph_index, []);
    byPara.get(h.paragraph_index).push(h);
  }
  const merged = [];
  for (const [p, arr] of byPara.entries()) {
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
    if (Date.now() < until) throw new Error(`Ліміт досягнуто. Розблокування: ${row.locked_until}`);
  }
  const newTotal = (row.tokens_used || 0) + tokensToAdd;
  if (newTotal >= DAILY_TOKEN_LIMIT) {
    const lock = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await dbRun(`UPDATE usage_daily SET tokens_used=?, locked_until=? WHERE day=?`, [newTotal, lock, day]);
    throw new Error(`Досягнуто 512k токенів. Блокування до ${lock}`);
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
        resolve({ text, fileName, profile });
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
Ти — старший аналітик переговорної комунікації.
ПОВЕРТАЙ ТІЛЬКИ NDJSON (по JSON-об'єкту на рядок), БЕЗ додаткового тексту.
Формати рядків:
{"type":"highlight","id":"...","paragraph_index":N,"char_start":S,"char_end":E,"category":"manipulation|cognitive_bias|rhetological_fallacy","label":"...","explanation":"1-2 речення","severity":0..3}
{"type":"summary","counts_by_category":{"manipulation":0,"cognitive_bias":0,"rhetological_fallacy":0},"top_patterns":["..."],"overall_observations":"..."}
{"type":"barometer","score":0..100,"label":"Easy mode|Clear client|Medium|High|Bloody hell|Mission impossible","rationale":"...","factors":{"goal_alignment":0..1,"manipulation_density":0..1,"scope_clarity":0..1,"time_pressure":0..1,"resource_demand":0..1}}

Правила:
- Аналізуй тільки normalized_paragraphs[]. Не цитуй великий текст; посилайся на позиції {paragraph_index,char_start,char_end}.
- Віддавай highlights інкрементально (одразу коли знаходиш).
- Не дублюй однакові/перекривні фрагменти — віддавай найбільш релевантний.
- Кожен JSON має закінчуватись \\n.
`.trim();
}
function buildUserPayload(paragraphs, clientCtx, limiter) {
  return {
    normalized_paragraphs: paragraphs.map((p) => ({ index: p.index, text: p.text })),
    client_context: clientCtx,
    constraints: { highlight_limit_per_1000_words: limiter },
    output_mode: 'ndjson'
  };
}

// ===== Route =====
r.post('/analyze', async (req, res) => {
  try {
    const { text: rawText, fileName, profile } = await parseMultipart(req);
    const text = normalizeText(rawText);
    if (!text || text.length < 20) return res.status(400).json({ error: 'Текст занадто короткий' });

    const paragraphs = splitToParagraphs(text);

    const approxTokensIn = estimateTokens(text) + 1200; // + промпт
    await addTokensAndCheck(approxTokensIn);

    const clientCtx = {
      about_client: {
        company: profile?.company || '',
        negotiator: profile?.negotiator || '',
        sector: profile?.sector || ''
      },
      decision_criteria: profile?.criteria || '',
      constraints: profile?.constraints || '',
      user_goals: profile?.user_goals || profile?.goal || '',
      client_goals: profile?.client_goals || '',
      weekly_hours: Number(profile?.weekly_hours) || 0,
      offered_services: profile?.offered_services || '',
      deadlines: profile?.deadlines || '',
      notes: profile?.notes || ''
    };

    // SSE headers
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const sendLine = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    const rawHighlights = [];
    let summaryObj = null;
    let barometerObj = null;

    if (!openaiClient) {
      // Fallback demo
      const firstLen = Math.min(paragraphs[0]?.text.length || 0, 60);
      if (firstLen > 0) {
        const demo = {
          type: 'highlight',
          id: 'hl_demo',
          paragraph_index: 0,
          char_start: 0,
          char_end: firstLen,
          category: 'manipulation',
          label: 'Appeal to Fear',
          explanation: 'Демонстраційний режим',
          severity: 2
        };
        rawHighlights.push(demo);
        sendLine(demo);
      }
      summaryObj = {
        type: 'summary',
        counts_by_category: { manipulation: rawHighlights.length, cognitive_bias: 0, rhetological_fallacy: 0 },
        top_patterns: ['Appeal to Fear'],
        overall_observations: 'Demo summary'
      };
      barometerObj = {
        type: 'barometer',
        score: 72,
        label: 'High',
        rationale: 'Demo rationale',
        factors: { goal_alignment: 0.5, manipulation_density: 0.8, scope_clarity: 0.5, time_pressure: 0.6, resource_demand: 0.7 }
      };
    } else {
      const system = buildSystemPrompt();
      const user = JSON.stringify(buildUserPayload(paragraphs, clientCtx, MAX_HIGHLIGHTS_PER_1000_WORDS));

      const stream = await openaiClient.chat.completions.create({
        model: MODEL,
        stream: true,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      });

      // Лінійний NDJSON парсер з recovery
      let buffer = '';
      for await (const part of stream) {
        const delta = part.choices?.[0]?.delta?.content || '';
        if (!delta) continue;
        buffer += delta;
        let idx;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.type === 'highlight') {
              rawHighlights.push(obj);
              sendLine(obj);
            } else if (obj.type === 'summary') {
              summaryObj = obj;
            } else if (obj.type === 'barometer') {
              barometerObj = obj;
            }
          } catch {
            console.warn('[NDJSON:bad_line]', line);
            // ігноруємо невалідний рядок, не падаємо
          }
        }
      }
    }

    // (Тестовий) Ліміт X/1000 слів
    const words = text.split(/\s+/).filter(Boolean).length || 1;
    const maxAllowed = Math.max(1, Math.floor((words / 1000) * MAX_HIGHLIGHTS_PER_1000_WORDS));
    let limited = rawHighlights;
    if (rawHighlights.length > maxAllowed) {
      limited = rawHighlights.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0)).slice(0, maxAllowed);
    }

    // Дедуп/merge перекриттів
    const merged = mergeOverlaps(limited);

    // Фінальні події
    sendLine({ type: 'merged_highlights', items: merged });
    if (summaryObj) sendLine(summaryObj);
    if (barometerObj) sendLine(barometerObj);

    // Оцінка вихідних токенів + ліміт
    await addTokensAndCheck(1600);

    // Збереження в БД (без сирого тексту)
    await dbRun(
      `
      INSERT INTO analyses(
        client_id, source, original_filename, tokens_estimated, highlights_json, summary_json, barometer_json
      ) VALUES (?,?,?,?,?,?,?)
    `,
      [
        null, // якщо є client_id — підстав
        fileName ? 'file' : 'text',
        fileName || null,
        approxTokensIn + 1600,
        JSON.stringify(merged),
        JSON.stringify(summaryObj || null),
        JSON.stringify(barometerObj || null)
      ]
    );

    res.write('event: done\ndata: "ok"\n\n');
    res.end();
  } catch (err) {
    console.error('Analyze error:', err.message);
    // важливо: SSE може вже бути відкрито — у такому разі просто закриваємо стрім
    try {
      res.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`);
      res.end();
    } catch {
      if (!res.headersSent) res.status(429).json({ error: err.message });
    }
  }
});

export default r;
