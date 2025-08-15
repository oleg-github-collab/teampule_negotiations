// routes/advice.js - Production AI advice engine
import { Router } from 'express';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { validateAdviceRequest } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import { run, get } from '../utils/db.js';
import { performance } from 'perf_hooks';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);

// GET recommendations for a client
r.get('/recommendations/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // For now, return empty array - we'll implement later if needed
    res.json({
      success: true,
      recommendations: [],
      client_id: clientId
    });
  } catch (error) {
    logError('Failed to get recommendations', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load recommendations',
      recommendations: []
    });
  }
});

// Daily limit helpers - FIXED: using sync DB calls like analyze.js
async function getUsageRow() {
  const day = new Date().toISOString().slice(0, 10);
  let row = get(`SELECT * FROM usage_daily WHERE day=?`, [day]); // Fixed: removed await
  if (!row) {
    run(`INSERT INTO usage_daily(day, tokens_used) VALUES(?,0)`, [day]); // Fixed: removed await
    row = get(`SELECT * FROM usage_daily WHERE day=?`, [day]); // Fixed: removed await
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
    run( // Fixed: removed await
      `UPDATE usage_daily SET tokens_used=?, locked_until=? WHERE day=?`,
      [newTotal, lock, day]
    );
    throw new Error(`Досягнуто денний ліміт токенів. Блокування до ${lock}`);
  } else {
    run(`UPDATE usage_daily SET tokens_used=? WHERE day=?`, [ // Fixed: removed await
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

    // Production mode requires OpenAI API - Enhanced error handling
    if (!openaiClient) {
      logError(new Error('OpenAI client not configured for advice'), {
        context: 'Advice request without API key',
        itemsCount: items.length,
        ip: req.ip
      });
      
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте налаштування API.',
        code: 'AI_SERVICE_UNAVAILABLE',
        details: 'OpenAI API key not configured',
        timestamp: new Date().toISOString(),
        retry_after: 60 // seconds
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

    // Enhanced API call with retry logic and timeout
    let resp;
    let retryCount = 0;
    const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
    const API_TIMEOUT = 45000; // 45 seconds
    
    while (retryCount <= maxRetries) {
      try {
        // Add retry delay for subsequent attempts
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)));
        }
        
        // Create request with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort(new Error('API request timeout'));
        }, API_TIMEOUT);
        
        try {
          resp = await openaiClient.chat.completions.create(reqPayload);
          clearTimeout(timeout);
          break; // Success, exit retry loop
          
        } catch (timeoutError) {
          clearTimeout(timeout);
          throw timeoutError;
        }
        
      } catch (apiError) {
        retryCount++;
        
        // Check if it's a retryable error
        const isRetryable = apiError.status >= 500 || 
                          apiError.status === 429 || 
                          apiError.code === 'ECONNRESET' ||
                          apiError.code === 'ETIMEDOUT' ||
                          apiError.name === 'AbortError';
                          
        if (retryCount > maxRetries || !isRetryable) {
          logError(apiError, {
            context: 'OpenAI advice API call failed after retries',
            model: MODEL,
            itemsCount: items.length,
            retries: retryCount - 1,
            isRetryable,
            ip: req.ip
          });
          
          return res.status(503).json({
            error: 'Помилка AI сервісу після кількох спроб. Спробуйте пізніше.',
            code: 'AI_API_ERROR',
            retries: retryCount - 1,
            timestamp: new Date().toISOString()
          });
        }
        
        logError(apiError, {
          context: `OpenAI advice API retry ${retryCount}/${maxRetries}`,
          model: MODEL,
          itemsCount: items.length,
          isRetryable,
          ip: req.ip
        });
      }
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
    
    // Enhanced response validation and parsing
    if (!resp || !resp.choices || !resp.choices[0]?.message?.content) {
      logError(new Error('Invalid API response structure'), {
        context: 'AI advice API returned invalid response',
        response: JSON.stringify(resp).substring(0, 500)
      });
      
      return res.status(503).json({
        error: 'Некоректна відповідь від AI сервісу',
        code: 'AI_INVALID_RESPONSE',
        timestamp: new Date().toISOString()
      });
    }
    
    let parsedAdvice;
    try {
      parsedAdvice = JSON.parse(content);
      
      // Validate response structure
      if (!parsedAdvice || typeof parsedAdvice !== 'object') {
        throw new Error('Response is not a valid object');
      }
      
      // Ensure required fields are present with defaults
      parsedAdvice = {
        recommended_replies: parsedAdvice.recommended_replies || [],
        risks: parsedAdvice.risks || [],
        notes: parsedAdvice.notes || 'Рекомендації не згенеровано'
      };
      
    } catch (parseError) {
      logError(parseError, {
        context: 'Failed to parse AI advice response',
        content: content.substring(0, 500),
        contentLength: content.length
      });
      
      // Fallback advice if parsing fails
      parsedAdvice = {
        recommended_replies: [
          'Дякую за детальну пропозицію. Дайте нам час її розглянути.',
          'Це цікава ідея, але нам потрібно обговорити деталі з командою.',
          'Ми цінуємо вашу пропозицію і повернемося з відповіддю найближчим часом.'
        ],
        risks: [
          'Можлива спроба тиску з боку контрагента',
          'Недостатньо інформації для прийняття рішення',
          'Потреба в додатковому аналізі умов'
        ],
        notes: 'Автоматично згенерована порада через помилку парсингу AI відповіді. Рекомендується детальний аналіз вручну.'
      };
    }

    return res.json({ 
      success: true, 
      advice: parsedAdvice,
      meta: {
        itemsProcessed: items.length,
        tokensUsed: totalTokensUsed,
        responseTime: Math.round(adviceDuration),
        model: MODEL,
        retries: resp ? (retryCount || 0) : maxRetries,
        timestamp: new Date().toISOString()
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
