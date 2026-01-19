// routes/analyze.js - Production analysis engine (PostgreSQL + Participant Filter)
import { Router } from 'express';
import { run as dbRun, get as dbGet, all as dbAll, transaction } from '../utils/db-postgres.js';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { validateFileUpload } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import Busboy from 'busboy';
import mammoth from 'mammoth';
import { performance } from 'perf_hooks';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'o4-mini';
const MAX_HIGHLIGHTS_PER_1000_WORDS = Number(
  process.env.MAX_HIGHLIGHTS_PER_1000_WORDS || 50
);
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);
const MAX_TEXT_LENGTH = 200000; // 200k characters max (~30 pages A4, ~400-500 words per page)
const MIN_TEXT_LENGTH = 20; // Minimum text length
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || '.txt,.docx')
  .split(',')
  .map((type) => type.trim().toLowerCase())
  .filter(Boolean);
const TIMELINE_BINS = Number(process.env.TIMELINE_BINS || 12);
const GLOBAL_SEARCH_LIMIT = Number(process.env.GLOBAL_SEARCH_LIMIT || 200);
const MAX_COUNTER_REPLIES = Number(process.env.MAX_COUNTER_REPLIES || 6);

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

function parseSizeToBytes(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).trim().toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)(kb|mb|gb)?$/);
  if (!match) return fallback;
  const number = Number(match[1]);
  const unit = match[2] || 'b';
  const multipliers = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return Math.round(number * (multipliers[unit] || 1));
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function sanitizeSpeakerName(raw) {
  if (!raw) return '';
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s:\-\u2013\u2014>]+/, '')
    .replace(/[\s:\-\u2013\u2014>]+$/, '')
    .trim();
}

function extractSpeakerSegments(text) {
  const speakers = new Map();
  const segments = [];
  const patterns = [
    /^\s*([A-ZА-ЯЁІЇЄҐ][A-Za-zА-Яа-яЁёІіЇїЄєҐґ'’\-\s]{1,60})\s*:\s*(.*)$/u,
    /^\s*([A-ZА-ЯЁІЇЄҐ][A-Za-zА-Яа-яЁёІіЇїЄєҐґ'’\-\s]{1,60})\s*[-\u2013\u2014]\s*(.*)$/u,
    /^\s*\[([A-ZА-ЯЁІЇЄҐ][A-Za-zА-Яа-яЁёІіЇїЄєҐґ'’\-\s]{1,60})\]\s*(.*)$/u,
    /^\s*([A-ZА-ЯЁІЇЄҐ][A-Za-zА-Яа-яЁёІіЇїЄєҐґ'’\-\s]{1,60})>\s*(.*)$/u,
  ];

  const invalidNames = /^(re|fw|fwd|subject|from|to|date|sent|received|cc|bcc)$/i;
  const lines = text.split('\n');
  let offset = 0;
  let current = null;

  for (const line of lines) {
    let match = null;
    for (const pattern of patterns) {
      match = line.match(pattern);
      if (match) break;
    }

    if (match) {
      const rawName = sanitizeSpeakerName(match[1]);
      if (rawName && rawName.length >= 2 && rawName.length <= 64 && !invalidNames.test(rawName)) {
        let name = rawName;
        let role = null;
        const roleMatch = rawName.match(/^(.*)\((.+)\)$/);
        if (roleMatch) {
          name = sanitizeSpeakerName(roleMatch[1]);
          role = sanitizeSpeakerName(roleMatch[2]);
        }

        if (!speakers.has(name)) {
          speakers.set(name, { name, role, source: 'detected' });
        }

        if (current) {
          current.end = Math.max(current.end, offset - 1);
        }

        current = {
          name,
          role,
          start: offset,
          end: offset + line.length,
        };
        segments.push(current);
      }
    }

    if (current) {
      current.end = offset + line.length;
    }

    offset += line.length + 1;
  }

  return {
    speakers: Array.from(speakers.values()),
    segments,
  };
}

function resolveGlobalRange(highlight, paragraphIndexMap, text) {
  const paragraph = paragraphIndexMap.get(highlight.paragraph_index);
  const charStart = Number.isFinite(Number(highlight.char_start)) ? Number(highlight.char_start) : null;
  const charEnd = Number.isFinite(Number(highlight.char_end)) ? Number(highlight.char_end) : null;

  if (paragraph && charStart !== null) {
    const start = paragraph.startOffset + charStart;
    const end = paragraph.startOffset + (charEnd !== null ? charEnd : charStart);
    if (start >= 0 && end >= start && end <= text.length) {
      return { start, end };
    }
  }

  if (highlight.text) {
    const directIndex = text.indexOf(highlight.text);
    if (directIndex !== -1) {
      return { start: directIndex, end: directIndex + highlight.text.length };
    }

    const lowerText = text.toLowerCase();
    const lowerNeedle = highlight.text.toLowerCase();
    const fallbackIndex = lowerText.indexOf(lowerNeedle);
    if (fallbackIndex !== -1) {
      return { start: fallbackIndex, end: fallbackIndex + highlight.text.length };
    }
  }

  return null;
}

function matchSpeakerForRange(segments, range) {
  if (!range || !segments.length) return null;
  for (const segment of segments) {
    const overlaps = range.start <= segment.end && range.end >= segment.start;
    if (overlaps) return segment.name;
  }
  return null;
}

function normalizeFragmentsForStorage(highlights, paragraphIndexMap, text, speakerData) {
  const fragments = [];
  const segments = speakerData?.segments || [];
  const textLength = Math.max(text.length, 1);

  for (const highlight of highlights) {
    const range = resolveGlobalRange(highlight, paragraphIndexMap, text);
    const globalStart = range?.start ?? null;
    const globalEnd = range?.end ?? null;
    const positionRatio = globalStart !== null ? clampNumber(globalStart / textLength, 0, 1) : null;
    const speakerName = matchSpeakerForRange(segments, range);

    fragments.push({
      highlight_id: highlight.id || null,
      paragraph_index: Number.isFinite(Number(highlight.paragraph_index)) ? Number(highlight.paragraph_index) : null,
      char_start: Number.isFinite(Number(highlight.char_start)) ? Number(highlight.char_start) : null,
      char_end: Number.isFinite(Number(highlight.char_end)) ? Number(highlight.char_end) : null,
      global_start: globalStart,
      global_end: globalEnd,
      position_ratio: positionRatio,
      category: highlight.category || 'manipulation',
      label: highlight.label || null,
      text: highlight.text || '',
      explanation: highlight.explanation || null,
      severity: Number(highlight.severity) || 1,
      speaker_name: speakerName,
    });
  }

  return fragments;
}

function buildTimelineMetrics(fragments, textLength, bins) {
  const safeBins = Math.round(clampNumber(bins, 5, 30));
  const categories = ['manipulation', 'cognitive_bias', 'rhetological_fallacy'];
  const timeline = Array.from({ length: safeBins }, (_, index) => ({
    bin: index,
    start_ratio: index / safeBins,
    end_ratio: (index + 1) / safeBins,
    count: 0,
    categories: { manipulation: 0, cognitive_bias: 0, rhetological_fallacy: 0 },
    severity_avg: 0,
    severity_max: 0,
    severity_sum: 0,
  }));

  for (const fragment of fragments) {
    if (fragment.position_ratio === null || fragment.position_ratio === undefined) continue;
    const ratio = clampNumber(fragment.position_ratio, 0, 0.999999);
    const index = Math.min(safeBins - 1, Math.floor(ratio * safeBins));
    const bucket = timeline[index];
    const category = categories.includes(fragment.category) ? fragment.category : 'manipulation';
    const severity = Number(fragment.severity) || 1;

    bucket.count += 1;
    bucket.categories[category] += 1;
    bucket.severity_sum += severity;
    bucket.severity_max = Math.max(bucket.severity_max, severity);
  }

  for (const bucket of timeline) {
    bucket.severity_avg = bucket.count ? Number((bucket.severity_sum / bucket.count).toFixed(2)) : 0;
    delete bucket.severity_sum;
  }

  return timeline;
}

function buildHeatmapMetrics(fragments, bins) {
  const safeBins = Math.round(clampNumber(bins, 5, 30));
  const categories = ['manipulation', 'cognitive_bias', 'rhetological_fallacy'];
  const heatmap = {
    bins: safeBins,
    categories: {},
    severity: { 1: Array(safeBins).fill(0), 2: Array(safeBins).fill(0), 3: Array(safeBins).fill(0) },
    total: Array(safeBins).fill(0),
  };

  categories.forEach((category) => {
    heatmap.categories[category] = Array(safeBins).fill(0);
  });

  for (const fragment of fragments) {
    if (fragment.position_ratio === null || fragment.position_ratio === undefined) continue;
    const ratio = clampNumber(fragment.position_ratio, 0, 0.999999);
    const index = Math.min(safeBins - 1, Math.floor(ratio * safeBins));
    const category = categories.includes(fragment.category) ? fragment.category : 'manipulation';
    const severity = clampNumber(Number(fragment.severity) || 1, 1, 3);

    heatmap.total[index] += 1;
    heatmap.categories[category][index] += 1;
    heatmap.severity[severity][index] += 1;
  }

  return heatmap;
}

function buildContextSnippet(text, start, end, radius = 200) {
  if (!text || start === null || end === null) return '';
  const safeStart = clampNumber(start, 0, text.length);
  const safeEnd = clampNumber(end, safeStart, text.length);
  const contextStart = Math.max(0, safeStart - radius);
  const contextEnd = Math.min(text.length, safeEnd + radius);
  const prefix = contextStart > 0 ? '...' : '';
  const suffix = contextEnd < text.length ? '...' : '';
  return `${prefix}${text.slice(contextStart, contextEnd)}${suffix}`;
}

function safeJsonParse(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

async function callAiJson({
  system,
  user,
  maxTokens = 800,
  temperature = 0.2,
  operation = 'analysis'
}) {
  if (!openaiClient) {
    throw new Error('AI сервіс тимчасово недоступний');
  }

  const reqPayload = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    top_p: 0.9,
  };

  if (temperatureEnabled()) {
    reqPayload.temperature = temperature;
  }

  let resp;
  let retryCount = 0;
  const maxRetries = process.env.NODE_ENV === 'production' ? 2 : 1;
  const API_TIMEOUT = 45000;

  while (retryCount <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
      try {
        resp = await openaiClient.chat.completions.create({
          ...reqPayload,
          signal: controller.signal
        });
        clearTimeout(timeout);
        break;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    } catch (error) {
      retryCount += 1;
      const isRetryable = error.status >= 500 ||
        error.status === 429 ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.name === 'AbortError';

      if (!isRetryable || retryCount > maxRetries) {
        logError(error, { context: `AI ${operation} failed`, operation, retries: retryCount - 1 });
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)));
    }
  }

  const content = resp?.choices?.[0]?.message?.content || '';
  return content;
}

function getCategoryClass(category) {
  const categoryMap = {
    'manipulation': 'manipulation',
    'cognitive_bias': 'cognitive_bias',
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
    const maxFileSize = parseSizeToBytes(process.env.MAX_FILE_SIZE, DEFAULT_MAX_FILE_SIZE);
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: maxFileSize },
    });
    let text = '';
    let fileName = '';
    let profile = null;
    let clientId = null;
    let fileBuffer = null;
    let selectedParticipants = null;
    let fileTooLarge = false;
    let invalidFileType = false;
    let fileSize = 0;

    busboy.on('file', (_name, file, info) => {
      fileName = info.filename || 'upload';
      const lower = fileName.toLowerCase();
      const ext = lower.includes('.') ? `.${lower.split('.').pop()}` : '';
      if (!ext) {
        invalidFileType = true;
        file.resume();
        return;
      }
      if (ext === '.doc') {
        invalidFileType = true;
        file.resume();
        return;
      }
      if (ext && ALLOWED_FILE_TYPES.length > 0 && !ALLOWED_FILE_TYPES.includes(ext)) {
        invalidFileType = true;
        file.resume();
        return;
      }
      const chunks = [];
      file.on('data', (d) => {
        fileSize += d.length;
        if (fileSize > maxFileSize) {
          fileTooLarge = true;
          file.resume();
          return;
        }
        chunks.push(d);
      });
      file.on('limit', () => {
        fileTooLarge = true;
        file.resume();
      });
      file.on('end', () => {
        if (!fileTooLarge && !invalidFileType) {
          fileBuffer = Buffer.concat(chunks);
        }
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
        if (invalidFileType) {
          const err = new Error('Непідтримуваний тип файлу. Дозволені: TXT, DOCX');
          err.status = 400;
          return reject(err);
        }
        if (fileTooLarge) {
          const err = new Error(`Файл занадто великий. Максимальний розмір: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
          err.status = 413;
          return reject(err);
        }
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
Ти — Teampulse Negotiations AI, експерт-аналітик переговорів з 15-річним досвідом у міжнародних B2B, держконтрактах і високоризикових угодах.

Твоя місія — провести ПРОФЕСІЙНИЙ, ЗБАЛАНСОВАНИЙ та КОНТЕКСТУАЛЬНИЙ аналіз переговорів із максимальною точністю.

🎯 МЕТА:
Виявити лише реально значущі маніпуляції, когнітивні викривлення та софізми, які можуть вплинути на результат угоди. ЯКІСТЬ і доказовість важливіші за кількість.

🧠 ВНУТРІШНІЙ ПРОТОКОЛ (НЕ ВИВОДЬ У ВІДПОВІДЬ):
1) Спочатку знайди потенційні проблемні фрагменти.
2) Перевір кожен фрагмент на контекст, намір і наслідки.
3) Відсікай сумнівні або нейтральні випадки.
4) Об’єднуй дублікати й перекриття, залишай найсильніші приклади.

⚖️ ПРИНЦИПИ ТОЧНОГО АНАЛІЗУ:
- Контекст понад усе: культурні норми, роль сторін, стадія угоди.
- Поріг впевненості: якщо є сумнів — НЕ позначай.
- Доказовість: кожна знахідка має чітке обґрунтування саме для цього кейсу.
- Баланс: не шукай проблем там, де є стандартна ділова комунікація.

📊 ГРАДАЦІЯ ВАЖЛИВОСТІ (Severity):
- Severity 1: легкі техніки впливу (потребують уваги).
- Severity 2: помірні маніпуляції (потенційно шкодять).
- Severity 3: критичні маніпуляції (червоні прапори).

🔎 ЩО ШУКАТИ (ПРІОРИТЕТ):
ВИСОКИЙ:
✅ Приховування критичних умов, ризиків, платежів
✅ Емоційний шантаж / нав’язування вини
✅ Штучний тиск часу без обґрунтування
✅ Газлайтинг або перекручування попередніх фактів
✅ Агресивні ультиматуми без підстав
✅ Фінансові пастки, приховані платежі
✅ Серйозне спотворення фактів або вводження в оману

СЕРЕДНІЙ:
✅ Соціальний тиск без доказів
✅ Anchoring / framing з очевидним перекосом
✅ Посилання на авторитет поза компетенцією
✅ Емоційні апеляції замість логіки
✅ Вибіркова подача важливої інформації

❌ НЕ ПОЗНАЧАЙ:
- Ввічливості, стандартні фрази, нейтральні питання
- Реальні дедлайни, законні обмеження, комплаєнс
- Професійну термінологію без маніпулятивної мети
- Конструктивний фідбек

✅ ВИМОГИ ДО ТОЧНОСТІ:
- Аналізуй normalized_paragraphs[]
- text у highlight має бути ТОЧНОЮ цитатою з paragraph.text
- char_start/char_end відповідають позиціям у paragraph.text
- Не дублюй фрагменти й не накладай перекриття
- Explanation 3–6 речень: що це, чому саме тут, ризик, відповідь

🎯 ФОРМАТ ВІДПОВІДІ (ТІЛЬКИ NDJSON):
{"type":"highlight","paragraph_index":N,"char_start":S,"char_end":E,"category":"manipulation|cognitive_bias|rhetological_fallacy","label":"Короткий опис","text":"точна цитата","explanation":"ДЕТАЛЬНЕ пояснення: що це, чому проблема в цьому контексті, можливий вплив, що робити","severity":1-3}

{"type":"summary","counts_by_category":{"manipulation":N,"cognitive_bias":N,"rhetological_fallacy":N},"top_patterns":["5-10 найважливіших патернів"],"overall_observations":"Чесна оцінка загальної стратегії (може бути позитивна)","strategic_assessment":"Оцінка професійності співрозмовника","risk_level":"low|medium|high|critical"}

{"type":"barometer","score":0-100,"label":"Easy mode|Clear client|Medium|High|Bloody hell|Mission impossible","rationale":"Обґрунтування складності з прикладами","factors":{"goal_alignment":0-1,"manipulation_density":0-1,"transparency":0-1,"time_pressure":0-1,"financial_risk":0-1}}

ПРАВИЛО ВИВОДУ:
✅ ПОВЕРТАЙ ТІЛЬКИ NDJSON, БЕЗ маркапу та зайвого тексту
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

function temperatureEnabled() {
  return process.env.OPENAI_DISABLE_TEMPERATURE !== 'true';
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
    const paragraphIndexMap = new Map();
    
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

      adjustedParagraphs.forEach((paragraph) => {
        if (!paragraphIndexMap.has(paragraph.index)) {
          paragraphIndexMap.set(paragraph.index, {
            startOffset: paragraph.startOffset,
            endOffset: paragraph.endOffset
          });
        }
      });
      
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

      if (temperatureEnabled()) {
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
                  char_start: Number(obj.char_start || 0),
                  char_end: Number(obj.char_end || 0)
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
    const mergedWithIds = merged.map((highlight, index) => ({
      id: highlight.id || `h${index + 1}`,
      ...highlight,
    }));

    const speakerData = extractSpeakerSegments(text);
    const normalizedFragments = normalizeFragmentsForStorage(
      mergedWithIds,
      paragraphIndexMap,
      text,
      speakerData
    );

    const mergedWithMeta = mergedWithIds.map((highlight, index) => {
      const fragment = normalizedFragments[index];
      if (!fragment) return highlight;
      return {
        ...highlight,
        global_start: fragment.global_start,
        global_end: fragment.global_end,
        position_ratio: fragment.position_ratio,
        speaker: fragment.speaker_name,
      };
    });

    sendLine({ type: 'merged_highlights', items: mergedWithMeta });
    if (summaryObj) sendLine(summaryObj);
    if (barometerObj) sendLine(barometerObj);

    // Generate highlighted text for frontend display
    const highlightedText = generateHighlightedText(text, mergedWithMeta);

    // More accurate output token estimation based on highlights and summary
    let outputTokens = 500; // Base system response
    outputTokens += mergedWithIds.length * 50; // ~50 tokens per highlight
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
      highlightsFound: mergedWithIds.length,
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
        text,
        totalTokensUsed,
        JSON.stringify(mergedWithMeta),
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

    try {
      const timeline = buildTimelineMetrics(normalizedFragments, text.length, TIMELINE_BINS);
      const heatmap = buildHeatmapMetrics(normalizedFragments, TIMELINE_BINS);

      await transaction(async (client) => {
        let speakerIdMap = new Map();
        if (speakerData.speakers.length > 0) {
          const speakerValues = [];
          const speakerParams = [];
          speakerData.speakers.forEach((speaker, idx) => {
            const base = idx * 5;
            speakerParams.push(
              analysisId,
              finalClientId,
              speaker.name,
              speaker.role || null,
              speaker.source || 'detected'
            );
            speakerValues.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
          });

          const speakerResult = await client.query(
            `
            INSERT INTO analysis_speakers (analysis_id, client_id, name, role, source)
            VALUES ${speakerValues.join(', ')}
            ON CONFLICT (analysis_id, name) DO UPDATE SET role = EXCLUDED.role
            RETURNING id, name
            `,
            speakerParams
          );

          speakerResult.rows.forEach((row) => {
            speakerIdMap.set(row.name, row.id);
          });
        }

        if (normalizedFragments.length > 0) {
          const fragmentValues = [];
          const fragmentParams = [];

          normalizedFragments.forEach((fragment, idx) => {
            const base = idx * 16;
            fragmentParams.push(
              analysisId,
              finalClientId,
              fragment.highlight_id,
              fragment.paragraph_index,
              fragment.char_start,
              fragment.char_end,
              fragment.global_start,
              fragment.global_end,
              fragment.position_ratio,
              fragment.category,
              fragment.label,
              fragment.text,
              fragment.explanation,
              fragment.severity,
              null,
              fragment.speaker_name ? speakerIdMap.get(fragment.speaker_name) || null : null
            );
            fragmentValues.push(
              `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16})`
            );
          });

          await client.query(
            `
            INSERT INTO analysis_fragments (
              analysis_id, client_id, highlight_id, paragraph_index, char_start, char_end,
              global_start, global_end, position_ratio, category, label, text, explanation,
              severity, label_override, speaker_id
            )
            VALUES ${fragmentValues.join(', ')}
            ON CONFLICT (analysis_id, highlight_id) DO NOTHING
            `,
            fragmentParams
          );
        }

        await client.query(
          `
          INSERT INTO analysis_metrics (analysis_id, client_id, timeline, heatmap, updated_at)
          VALUES ($1, $2, $3::jsonb, $4::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (analysis_id) DO UPDATE SET
            timeline = EXCLUDED.timeline,
            heatmap = EXCLUDED.heatmap,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            analysisId,
            finalClientId,
            JSON.stringify({ bins: TIMELINE_BINS, timeline }),
            JSON.stringify(heatmap),
          ]
        );
      });
    } catch (storageError) {
      logError(storageError, {
        context: 'Storing normalized analysis data',
        analysisId,
        clientId: finalClientId,
      });
    }

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
        const statusCode = err.status || (isRateLimit ? 429 : 500);
        
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

// ===== Metrics =====
r.get('/analyses/:analysisId/metrics', async (req, res) => {
  const analysisId = Number(req.params.analysisId);
  if (!Number.isFinite(analysisId) || analysisId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID аналізу' });
  }

  try {
    const metrics = await dbGet(
      `SELECT timeline, heatmap FROM analysis_metrics WHERE analysis_id = $1`,
      [analysisId]
    );

    if (metrics) {
      return res.json({ success: true, metrics, source: 'stored' });
    }

    const fragments = await dbAll(
      `
      SELECT position_ratio, category,
        COALESCE(severity_override, severity) AS severity
      FROM analysis_fragments
      WHERE analysis_id = $1
      `,
      [analysisId]
    );

    const timeline = buildTimelineMetrics(fragments, 1, TIMELINE_BINS);
    const heatmap = buildHeatmapMetrics(fragments, TIMELINE_BINS);

    res.json({
      success: true,
      metrics: {
        timeline: { bins: TIMELINE_BINS, timeline },
        heatmap
      },
      source: 'computed'
    });
  } catch (err) {
    logError(err, { context: 'Metrics fetch failed', analysisId });
    res.status(500).json({ error: 'Помилка отримання метрик' });
  }
});

// ===== Fragment Notes =====
r.get('/fragments/:fragmentId/notes', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  try {
    const notes = await dbAll(
      `
      SELECT id, author, note, created_at
      FROM analysis_fragment_notes
      WHERE fragment_id = $1
      ORDER BY created_at DESC
      `,
      [fragmentId]
    );
    res.json({ success: true, notes });
  } catch (err) {
    logError(err, { context: 'Notes fetch failed', fragmentId });
    res.status(500).json({ error: 'Помилка отримання нотаток' });
  }
});

r.post('/fragments/:fragmentId/notes', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  const note = String(req.body?.note || '').trim();
  const author = String(req.body?.author || '').trim() || null;

  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }
  if (!note || note.length < 3 || note.length > 2000) {
    return res.status(400).json({ error: 'Нотатка має містити 3-2000 символів' });
  }

  try {
    const result = await dbRun(
      `
      INSERT INTO analysis_fragment_notes (fragment_id, author, note)
      VALUES ($1, $2, $3)
      RETURNING id, author, note, created_at
      `,
      [fragmentId, author, note]
    );
    res.json({ success: true, note: result.rows[0] });
  } catch (err) {
    logError(err, { context: 'Note create failed', fragmentId });
    res.status(500).json({ error: 'Помилка збереження нотатки' });
  }
});

// ===== Fragment Tags =====
r.get('/fragments/:fragmentId/tags', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  try {
    const tags = await dbAll(
      `
      SELECT t.id, t.name
      FROM analysis_fragment_tags ft
      JOIN tags t ON t.id = ft.tag_id
      WHERE ft.fragment_id = $1
      ORDER BY t.name ASC
      `,
      [fragmentId]
    );
    res.json({ success: true, tags });
  } catch (err) {
    logError(err, { context: 'Tags fetch failed', fragmentId });
    res.status(500).json({ error: 'Помилка отримання тегів' });
  }
});

r.post('/fragments/:fragmentId/tags', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  const inputTags = Array.isArray(req.body?.tags) ? req.body.tags : [];

  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  const tags = Array.from(new Set(
    inputTags
      .map(tag => String(tag || '').trim())
      .filter(tag => tag.length >= 2 && tag.length <= 50)
  ));

  if (tags.length === 0) {
    return res.status(400).json({ error: 'Потрібно передати хоча б один тег (2-50 символів)' });
  }

  try {
    await transaction(async (client) => {
      for (const tag of tags) {
        const tagResult = await client.query(
          `
          INSERT INTO tags (name)
          VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
          `,
          [tag]
        );

        const tagId = tagResult.rows[0].id;
        await client.query(
          `
          INSERT INTO analysis_fragment_tags (fragment_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [fragmentId, tagId]
        );
      }
    });

    const updatedTags = await dbAll(
      `
      SELECT t.id, t.name
      FROM analysis_fragment_tags ft
      JOIN tags t ON t.id = ft.tag_id
      WHERE ft.fragment_id = $1
      ORDER BY t.name ASC
      `,
      [fragmentId]
    );

    res.json({ success: true, tags: updatedTags });
  } catch (err) {
    logError(err, { context: 'Tags update failed', fragmentId });
    res.status(500).json({ error: 'Помилка збереження тегів' });
  }
});

r.delete('/fragments/:fragmentId/tags/:tagId', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  const tagId = Number(req.params.tagId);

  if (!Number.isFinite(fragmentId) || fragmentId <= 0 || !Number.isFinite(tagId) || tagId <= 0) {
    return res.status(400).json({ error: 'Некоректні ID фрагмента або тегу' });
  }

  try {
    await dbRun(
      `DELETE FROM analysis_fragment_tags WHERE fragment_id = $1 AND tag_id = $2`,
      [fragmentId, tagId]
    );

    res.json({ success: true });
  } catch (err) {
    logError(err, { context: 'Tag delete failed', fragmentId, tagId });
    res.status(500).json({ error: 'Помилка видалення тегу' });
  }
});

// ===== Fragment Severity Override =====
r.post('/fragments/:fragmentId/severity', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  const newSeverity = Number(req.body?.severity);
  const author = String(req.body?.author || '').trim() || null;

  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }
  if (!Number.isFinite(newSeverity) || newSeverity < 1 || newSeverity > 3) {
    return res.status(400).json({ error: 'Серйозність має бути в діапазоні 1-3' });
  }

  try {
    const fragment = await dbGet(
      `SELECT severity_override, severity FROM analysis_fragments WHERE id = $1`,
      [fragmentId]
    );
    if (!fragment) {
      return res.status(404).json({ error: 'Фрагмент не знайдено' });
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE analysis_fragments SET severity_override = $1 WHERE id = $2`,
        [newSeverity, fragmentId]
      );
      await client.query(
        `
        INSERT INTO analysis_fragment_severity_history
          (fragment_id, previous_severity, new_severity, author)
        VALUES ($1, $2, $3, $4)
        `,
        [fragmentId, fragment.severity_override || fragment.severity, newSeverity, author]
      );
    });

    res.json({ success: true, severity_override: newSeverity });
  } catch (err) {
    logError(err, { context: 'Severity override failed', fragmentId });
    res.status(500).json({ error: 'Помилка оновлення серйозності' });
  }
});

r.delete('/fragments/:fragmentId/severity', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  const author = String(req.body?.author || '').trim() || null;

  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  try {
    const fragment = await dbGet(
      `SELECT severity_override, severity FROM analysis_fragments WHERE id = $1`,
      [fragmentId]
    );
    if (!fragment) {
      return res.status(404).json({ error: 'Фрагмент не знайдено' });
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE analysis_fragments SET severity_override = NULL WHERE id = $1`,
        [fragmentId]
      );
      await client.query(
        `
        INSERT INTO analysis_fragment_severity_history
          (fragment_id, previous_severity, new_severity, author)
        VALUES ($1, $2, $3, $4)
        `,
        [fragmentId, fragment.severity_override || fragment.severity, fragment.severity, author]
      );
    });

    res.json({ success: true, severity_override: null });
  } catch (err) {
    logError(err, { context: 'Severity override clear failed', fragmentId });
    res.status(500).json({ error: 'Помилка очищення серйозності' });
  }
});

// ===== Fragment Label Override =====
r.post('/fragments/:fragmentId/label', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  const label = String(req.body?.label || '').trim();

  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }
  if (label.length > 120) {
    return res.status(400).json({ error: 'Мітка не може перевищувати 120 символів' });
  }

  try {
    await dbRun(
      `UPDATE analysis_fragments SET label_override = $1 WHERE id = $2`,
      [label || null, fragmentId]
    );
    res.json({ success: true, label_override: label || null });
  } catch (err) {
    logError(err, { context: 'Label override failed', fragmentId });
    res.status(500).json({ error: 'Помилка оновлення мітки' });
  }
});

// ===== Recommendations Traceability =====
r.post('/recommendations', async (req, res) => {
  const analysisId = Number(req.body?.analysis_id);
  const clientId = Number(req.body?.client_id);
  const title = String(req.body?.title || '').trim() || null;
  const payload = req.body?.payload || null;
  const fragmentIds = Array.isArray(req.body?.fragment_ids)
    ? req.body.fragment_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];

  if (!Number.isFinite(analysisId) || analysisId <= 0 || !Number.isFinite(clientId) || clientId <= 0) {
    return res.status(400).json({ error: 'Некоректні ID аналізу або клієнта' });
  }
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Потрібно передати payload рекомендації' });
  }
  if (fragmentIds.length === 0) {
    return res.status(400).json({ error: 'Потрібно передати фрагменти для привʼязки' });
  }

  try {
    const analysis = await dbGet(
      `SELECT id FROM analyses WHERE id = $1 AND client_id = $2`,
      [analysisId, clientId]
    );
    if (!analysis) {
      return res.status(404).json({ error: 'Аналіз не знайдено' });
    }

    const validFragments = await dbAll(
      `
      SELECT id FROM analysis_fragments
      WHERE analysis_id = $1 AND id = ANY($2::int[])
      `,
      [analysisId, fragmentIds]
    );

    const validIds = validFragments.map(row => row.id);
    if (validIds.length === 0) {
      return res.status(404).json({ error: 'Фрагменти не знайдені' });
    }

    const result = await transaction(async (client) => {
      const recResult = await client.query(
        `
        INSERT INTO analysis_recommendations (analysis_id, client_id, title, payload)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id, analysis_id, client_id, title, payload, created_at
        `,
        [analysisId, clientId, title, JSON.stringify(payload)]
      );

      const recId = recResult.rows[0].id;
      for (const fragmentId of validIds) {
        await client.query(
          `
          INSERT INTO analysis_recommendation_fragments (recommendation_id, fragment_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [recId, fragmentId]
        );
      }

      return { recommendation: recResult.rows[0], fragments: validIds };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    logError(err, { context: 'Recommendation create failed', analysisId, clientId });
    res.status(500).json({ error: 'Помилка збереження рекомендації' });
  }
});

r.get('/recommendations/:recommendationId', async (req, res) => {
  const recommendationId = Number(req.params.recommendationId);
  if (!Number.isFinite(recommendationId) || recommendationId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID рекомендації' });
  }

  try {
    const recommendation = await dbGet(
      `SELECT * FROM analysis_recommendations WHERE id = $1`,
      [recommendationId]
    );
    if (!recommendation) {
      return res.status(404).json({ error: 'Рекомендація не знайдена' });
    }

    const fragments = await dbAll(
      `
      SELECT f.*
      FROM analysis_recommendation_fragments rf
      JOIN analysis_fragments f ON f.id = rf.fragment_id
      WHERE rf.recommendation_id = $1
      `,
      [recommendationId]
    );

    res.json({ success: true, recommendation, fragments });
  } catch (err) {
    logError(err, { context: 'Recommendation fetch failed', recommendationId });
    res.status(500).json({ error: 'Помилка отримання рекомендації' });
  }
});

r.get('/fragments/:fragmentId/recommendations', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  try {
    const recommendations = await dbAll(
      `
      SELECT r.*
      FROM analysis_recommendation_fragments rf
      JOIN analysis_recommendations r ON r.id = rf.recommendation_id
      WHERE rf.fragment_id = $1
      ORDER BY r.created_at DESC
      `,
      [fragmentId]
    );
    res.json({ success: true, recommendations });
  } catch (err) {
    logError(err, { context: 'Fragment recommendations fetch failed', fragmentId });
    res.status(500).json({ error: 'Помилка отримання рекомендацій' });
  }
});

// ===== Counter Replies =====
r.get('/fragments/:fragmentId/counter-replies', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  try {
    const replies = await dbAll(
      `
      SELECT id, replies, model, created_at
      FROM analysis_fragment_counter_replies
      WHERE fragment_id = $1
      ORDER BY created_at DESC
      `,
      [fragmentId]
    );
    res.json({ success: true, replies });
  } catch (err) {
    logError(err, { context: 'Counter replies fetch failed', fragmentId });
    res.status(500).json({ error: 'Помилка отримання контр-реплік' });
  }
});

r.post('/fragments/:fragmentId/counter-replies', async (req, res) => {
  const fragmentId = Number(req.params.fragmentId);
  if (!Number.isFinite(fragmentId) || fragmentId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID фрагмента' });
  }

  try {
    const fragment = await dbGet(
      `
      SELECT f.*, a.original_text
      FROM analysis_fragments f
      JOIN analyses a ON a.id = f.analysis_id
      WHERE f.id = $1
      `,
      [fragmentId]
    );

    if (!fragment) {
      return res.status(404).json({ error: 'Фрагмент не знайдено' });
    }

    const contextSnippet = fragment.global_start !== null && fragment.global_end !== null
      ? buildContextSnippet(fragment.original_text || '', fragment.global_start, fragment.global_end)
      : '';

    const promptPayload = {
      fragment_id: fragment.id,
      text: fragment.text,
      category: fragment.category,
      label: fragment.label_override || fragment.label,
      explanation: fragment.explanation,
      severity: fragment.severity_override || fragment.severity,
      context: contextSnippet
    };

    const approxIn = estimateTokens(JSON.stringify(promptPayload)) + 300;
    await addTokensAndCheck(approxIn);

    const systemPrompt = `
Ти — Teampulse Negotiations AI. Згенеруй контр-репліки на конкретний фрагмент переговорів.
ПОВЕРТАЙ ТІЛЬКИ JSON:
{"replies":["..."],"tone":"стримано-професійний","notes":"коротка порада"}
Вимоги:
- 3-${MAX_COUNTER_REPLIES} лаконічних реплік, 1-2 речення кожна
- Без агресії, без ескалації, професійно
- З урахуванням категорії та рівня серйозності
`.trim();

    const content = await callAiJson({
      system: systemPrompt,
      user: JSON.stringify(promptPayload),
      maxTokens: 700,
      temperature: 0.3,
      operation: 'counter_replies'
    });

    const parsed = safeJsonParse(content, null);
    const replies = Array.isArray(parsed?.replies) ? parsed.replies : [
      'Дякую за уточнення. Пропоную зафіксувати умови письмово і повернутися до деталей після обговорення з командою.',
      'Ми готові рухатися далі, якщо узгодимо ключові параметри та дедлайни.',
      'Давайте зосередимося на взаємних вигодах і конкретних наступних кроках.'
    ];

    const responsePayload = {
      replies: replies.slice(0, MAX_COUNTER_REPLIES),
      tone: parsed?.tone || 'стримано-професійний',
      notes: parsed?.notes || ''
    };

    const outputTokens = 400;
    await addTokensAndCheck(outputTokens);
    logAIUsage(approxIn + outputTokens, MODEL, 'counter_replies');

    const stored = await dbRun(
      `
      INSERT INTO analysis_fragment_counter_replies (fragment_id, replies, model)
      VALUES ($1, $2::jsonb, $3)
      RETURNING id, replies, model, created_at
      `,
      [fragmentId, JSON.stringify(responsePayload), MODEL]
    );

    res.json({ success: true, counter_replies: stored.rows[0] });
  } catch (err) {
    logError(err, { context: 'Counter replies generation failed', fragmentId });
    res.status(500).json({ error: 'Помилка генерації контр-реплік' });
  }
});

// ===== Contradictions =====
r.get('/analyses/:analysisId/contradictions', async (req, res) => {
  const analysisId = Number(req.params.analysisId);
  if (!Number.isFinite(analysisId) || analysisId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID аналізу' });
  }

  try {
    const contradictions = await dbAll(
      `
      SELECT id, fragments, summary, details, created_at
      FROM analysis_contradictions
      WHERE analysis_id = $1
      ORDER BY created_at DESC
      `,
      [analysisId]
    );
    res.json({ success: true, contradictions });
  } catch (err) {
    logError(err, { context: 'Contradictions fetch failed', analysisId });
    res.status(500).json({ error: 'Помилка отримання суперечностей' });
  }
});

r.post('/analyses/:analysisId/contradictions', async (req, res) => {
  const analysisId = Number(req.params.analysisId);
  const maxFragments = clampNumber(Number(req.body?.max_fragments) || 30, 5, 60);
  const fragmentIds = Array.isArray(req.body?.fragment_ids)
    ? req.body.fragment_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];

  if (!Number.isFinite(analysisId) || analysisId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID аналізу' });
  }

  try {
    const analysisRow = await dbGet(
      `SELECT client_id FROM analyses WHERE id = $1`,
      [analysisId]
    );
    if (!analysisRow) {
      return res.status(404).json({ error: 'Аналіз не знайдено' });
    }

    const fragments = fragmentIds.length
      ? await dbAll(
          `
          SELECT id, text, category, label, explanation,
            COALESCE(severity_override, severity) AS severity
          FROM analysis_fragments
          WHERE analysis_id = $1 AND id = ANY($2::int[])
          `,
          [analysisId, fragmentIds]
        )
      : await dbAll(
          `
          SELECT id, text, category, label, explanation,
            COALESCE(severity_override, severity) AS severity
          FROM analysis_fragments
          WHERE analysis_id = $1
          ORDER BY COALESCE(severity_override, severity) DESC, id ASC
          LIMIT $2
          `,
          [analysisId, maxFragments]
        );

    if (!fragments.length) {
      return res.status(404).json({ error: 'Фрагменти не знайдено' });
    }

    const payload = {
      analysis_id: analysisId,
      fragments: fragments.map((fragment) => ({
        id: fragment.id,
        text: fragment.text,
        category: fragment.category,
        label: fragment.label,
        severity: fragment.severity,
        explanation: fragment.explanation
      }))
    };

    const approxIn = estimateTokens(JSON.stringify(payload)) + 300;
    await addTokensAndCheck(approxIn);

    const systemPrompt = `
Ти — Teampulse Negotiations AI. Виявляй суперечності між фрагментами.
ПОВЕРТАЙ ТІЛЬКИ JSON:
{"contradictions":[{"fragment_ids":[1,2],"summary":"...","risk":"...","confidence":0.0}]}
Вимоги:
- Мінімум 0, максимум 12 суперечностей
- Коротко пояснюй чому це суперечність
- Confidence 0..1
`.trim();

    const content = await callAiJson({
      system: systemPrompt,
      user: JSON.stringify(payload),
      maxTokens: 800,
      temperature: 0.2,
      operation: 'contradictions'
    });

    const parsed = safeJsonParse(content, { contradictions: [] });
    const contradictions = Array.isArray(parsed.contradictions) ? parsed.contradictions : [];

    const summary = contradictions.length
      ? `Знайдено суперечностей: ${contradictions.length}`
      : 'Суперечностей не виявлено';

    const stored = await dbRun(
      `
      INSERT INTO analysis_contradictions (analysis_id, client_id, fragments, summary, details)
      VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
      RETURNING id, fragments, summary, details, created_at
      `,
      [
        analysisId,
        analysisRow.client_id,
        JSON.stringify(fragments.map(fragment => fragment.id)),
        summary,
        JSON.stringify({ contradictions })
      ]
    );

    const outputTokens = 400;
    await addTokensAndCheck(outputTokens);
    logAIUsage(approxIn + outputTokens, MODEL, 'contradictions');

    res.json({ success: true, contradictions: stored.rows[0] });
  } catch (err) {
    logError(err, { context: 'Contradictions generation failed', analysisId });
    res.status(500).json({ error: 'Помилка генерації суперечностей' });
  }
});

// ===== Global Fragment Search =====
r.get('/fragments/search', async (req, res) => {
  const query = String(req.query?.q || '').trim();
  const clientId = Number(req.query?.client_id);
  const analysisId = Number(req.query?.analysis_id);
  const category = String(req.query?.category || '').trim();
  const tag = String(req.query?.tag || '').trim();
  const minSeverity = Number(req.query?.min_severity);
  const maxSeverity = Number(req.query?.max_severity);
  const limit = clampNumber(Number(req.query?.limit) || 50, 1, GLOBAL_SEARCH_LIMIT);

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Потрібен запит пошуку (мінімум 2 символи)' });
  }

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    conditions.push(`
      to_tsvector('simple', coalesce(f.text, '') || ' ' || coalesce(f.explanation, '') || ' ' || coalesce(f.label, ''))
      @@ websearch_to_tsquery('simple', $${idx++})
    `);
    params.push(query);

    if (Number.isFinite(clientId) && clientId > 0) {
      conditions.push(`f.client_id = $${idx++}`);
      params.push(clientId);
    }

    if (Number.isFinite(analysisId) && analysisId > 0) {
      conditions.push(`f.analysis_id = $${idx++}`);
      params.push(analysisId);
    }

    if (category) {
      conditions.push(`f.category = $${idx++}`);
      params.push(category);
    }

    if (Number.isFinite(minSeverity)) {
      conditions.push(`COALESCE(f.severity_override, f.severity) >= $${idx++}`);
      params.push(minSeverity);
    }

    if (Number.isFinite(maxSeverity)) {
      conditions.push(`COALESCE(f.severity_override, f.severity) <= $${idx++}`);
      params.push(maxSeverity);
    }

    if (tag) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM analysis_fragment_tags ft
          JOIN tags t ON t.id = ft.tag_id
          WHERE ft.fragment_id = f.id AND t.name = $${idx++}
        )
      `);
      params.push(tag);
    }

    params.push(limit);

    const rows = await dbAll(
      `
      SELECT f.id, f.analysis_id, f.client_id, f.text, f.label, f.label_override,
        f.category, COALESCE(f.severity_override, f.severity) AS severity,
        f.position_ratio, f.global_start, f.global_end,
        s.name AS speaker,
        ts_rank(
          to_tsvector('simple', coalesce(f.text, '') || ' ' || coalesce(f.explanation, '') || ' ' || coalesce(f.label, '')),
          websearch_to_tsquery('simple', $1)
        ) AS rank
      FROM analysis_fragments f
      LEFT JOIN analysis_speakers s ON s.id = f.speaker_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY rank DESC, f.id DESC
      LIMIT $${idx}
      `,
      params
    );

    res.json({ success: true, results: rows });
  } catch (err) {
    logError(err, { context: 'Global search failed', query });
    res.status(500).json({ error: 'Помилка глобального пошуку' });
  }
});

// ===== Client Playbook =====
r.get('/clients/:clientId/playbook', async (req, res) => {
  const clientId = Number(req.params.clientId);
  const persist = String(req.query?.persist || '').trim() === '1';

  if (!Number.isFinite(clientId) || clientId <= 0) {
    return res.status(400).json({ error: 'Некоректний ID клієнта' });
  }

  try {
    const categoryStats = await dbAll(
      `
      SELECT category, COUNT(*) AS count,
        ROUND(AVG(COALESCE(severity_override, severity))::numeric, 2) AS avg_severity
      FROM analysis_fragments
      WHERE client_id = $1
      GROUP BY category
      ORDER BY count DESC
      `,
      [clientId]
    );

    const labelStats = await dbAll(
      `
      SELECT category, label, COUNT(*) AS count
      FROM analysis_fragments
      WHERE client_id = $1 AND label IS NOT NULL
      GROUP BY category, label
      ORDER BY count DESC
      LIMIT 15
      `,
      [clientId]
    );

    const tagStats = await dbAll(
      `
      SELECT t.name, COUNT(*) AS count
      FROM analysis_fragment_tags ft
      JOIN tags t ON t.id = ft.tag_id
      JOIN analysis_fragments f ON f.id = ft.fragment_id
      WHERE f.client_id = $1
      GROUP BY t.name
      ORDER BY count DESC
      LIMIT 15
      `,
      [clientId]
    );

    const speakerStats = await dbAll(
      `
      SELECT s.name, COUNT(*) AS count
      FROM analysis_fragments f
      JOIN analysis_speakers s ON s.id = f.speaker_id
      WHERE f.client_id = $1
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 10
      `,
      [clientId]
    );

    const recommendations = await dbAll(
      `
      SELECT payload
      FROM analysis_recommendations
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [clientId]
    );

    const replies = [];
    recommendations.forEach((row) => {
      const payload = row.payload || {};
      const items = payload.recommended_replies || payload.replies || [];
      items.forEach((item) => {
        const text = String(item || '').trim();
        if (text && !replies.includes(text)) replies.push(text);
      });
    });

    const playbook = {
      client_id: clientId,
      generated_at: new Date().toISOString(),
      tactics: labelStats,
      categories: categoryStats,
      tags: tagStats,
      speakers: speakerStats,
      recommended_replies: replies.slice(0, 20)
    };

    if (persist) {
      await dbRun(
        `INSERT INTO client_playbooks (client_id, payload) VALUES ($1, $2::jsonb)`,
        [clientId, JSON.stringify(playbook)]
      );
    }

    res.json({ success: true, playbook });
  } catch (err) {
    logError(err, { context: 'Playbook build failed', clientId });
    res.status(500).json({ error: 'Помилка побудови playbook' });
  }
});

export default r;
