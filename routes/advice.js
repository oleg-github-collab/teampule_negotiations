// routes/advice.js - Production AI advice engine
import { Router } from 'express';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { validateAdviceRequest } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import { run, get } from '../utils/db.js';
import { performance } from 'perf_hooks';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);

// Daily limit helpers
async function getUsageRow() {
  const day = new Date().toISOString().slice(0, 10);
  let row = await get(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  if (!row) {
    await run(`INSERT INTO usage_daily(day, tokens_used) VALUES(?,0)`, [day]);
    row = await get(`SELECT * FROM usage_daily WHERE day=?`, [day]);
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
    await run(
      `UPDATE usage_daily SET tokens_used=?, locked_until=? WHERE day=?`,
      [newTotal, lock, day]
    );
    throw new Error(`Досягнуто 512k токенів. Блокування до ${lock}`);
  } else {
    await run(`UPDATE usage_daily SET tokens_used=? WHERE day=?`, [
      newTotal,
      day,
    ]);
  }
}

r.post('/', validateAdviceRequest, async (req, res) => {
  const adviceStartTime = performance.now();
  let totalTokensUsed = 0;
  
  try {
    const { items, profile } = req.body || {};
    
    // Enhanced input validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Немає фрагментів для поради',
        required: 'items array with at least 1 fragment'
      });
    }
    
    if (items.length > 50) {
      return res.status(400).json({
        error: 'Занадто багато фрагментів. Максимум: 50',
        maxItems: 50,
        receivedItems: items.length
      });
    }
    
    const approxIn = estimateTokens(JSON.stringify(items)) + 400;
    totalTokensUsed += approxIn;
    await addTokensAndCheck(approxIn);

    // Production mode requires OpenAI API
    if (!openaiClient) {
      logError(new Error('OpenAI client not configured for advice'), {
        context: 'Advice request without API key',
        itemsCount: items.length,
        ip: req.ip
      });
      
      return res.status(503).json({
        error: 'Сервіс порад тимчасово недоступний',
        code: 'AI_SERVICE_UNAVAILABLE'
      });
    }

    const sys = `
Ти — експерт зі стратегій відповідей у переговорах.
На вхід подаються вибрані фрагменти тексту з виявленими маніпуляціями та контекст клієнта.
Сформуй:

recommended_replies: 3-4 варіанти професійних відповідей (конкретні формулювання)
risks: 3-4 ключові ризики в цих переговорах
notes: детальні поради та рекомендації щодо подальших дій

Поверни СТРОГО JSON:
{"recommended_replies":["..."],"risks":["..."],"notes":"..."}
`.trim();

    const usr = `
Фрагменти з маніпуляціями:
${items
  .map(
    (it, i) =>
      `[${i + 1}] (${it.category || 'neutral'} | ${it.label || '—'}) "${it.text || ''}"`
  )
  .join('\n')}
Контекст клієнта:
${JSON.stringify(
  {
    company: profile?.company || '',
    negotiator: profile?.negotiator || '',
    sector: profile?.sector || '',
    user_goals: profile?.user_goals || profile?.goal || '',
    client_goals: profile?.client_goals || '',
    weekly_hours: profile?.weekly_hours || 0,
    offered_services: profile?.offered_services || '',
    deadlines: profile?.deadlines || '',
    constraints: profile?.constraints || '',
    decision_criteria:
      profile?.criteria || profile?.decision_criteria || '',
    notes: profile?.notes || '',
  },
  null,
  2
)}
`.trim();

    const reqPayload = {
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      max_tokens: 1500,
      top_p: 0.9
    };

    // Only add temperature if supported
    if (!/^gpt-5($|[-:])/i.test(MODEL)) {
      reqPayload.temperature = 0.2;
    }

    let resp;
    try {
      resp = await openaiClient.chat.completions.create(reqPayload);
    } catch (apiError) {
      logError(apiError, {
        context: 'OpenAI advice API call failed',
        model: MODEL,
        itemsCount: items.length,
        ip: req.ip
      });
      
      return res.status(503).json({
        error: 'Помилка AI сервісу. Спробуйте пізніше.',
        code: 'AI_API_ERROR'
      });
    }
    
    const content = resp.choices?.[0]?.message?.content || '{}';
    const outputTokens = 600;
    totalTokensUsed += outputTokens;
    await addTokensAndCheck(outputTokens);
    
    // Log AI usage
    logAIUsage(totalTokensUsed, MODEL, 'advice_generation');
    
    const adviceDuration = performance.now() - adviceStartTime;
    logPerformance('Advice Generation', adviceDuration, {
      itemsCount: items.length,
      tokensUsed: totalTokensUsed
    });
    
    let parsedAdvice;
    try {
      parsedAdvice = JSON.parse(content);
    } catch (parseError) {
      logError(parseError, {
        context: 'Failed to parse AI advice response',
        content: content.substring(0, 500)
      });
      
      return res.status(500).json({
        error: 'Помилка обробки відповіді AI',
        code: 'AI_RESPONSE_PARSE_ERROR'
      });
    }

    return res.json({ 
      success: true, 
      advice: parsedAdvice,
      meta: {
        itemsProcessed: items.length,
        tokensUsed: totalTokensUsed,
        responseTime: Math.round(adviceDuration)
      }
    });
  } catch (e) {
    const adviceDuration = performance.now() - adviceStartTime;
    
    logError(e, {
      context: 'Advice route error',
      duration: adviceDuration,
      tokensUsed: totalTokensUsed,
      itemsCount: req.body?.items?.length || 0,
      ip: req.ip
    });
    
    const isRateLimit = e.message.includes('Ліміт');
    const statusCode = isRateLimit ? 429 : 500;
    
    res.status(statusCode).json({ 
      error: e.message || 'Помилка генерації порад',
      code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'ADVICE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

export default r;
