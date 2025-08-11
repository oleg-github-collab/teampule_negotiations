// routes/advice.js - Виправлений маршрут порад
import { Router } from 'express';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { run, get } from '../utils/db.js';

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

r.post('/', async (req, res) => {
  try {
    const { items, profile } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Немає фрагментів для поради' });
    }
    const approxIn = estimateTokens(JSON.stringify(items)) + 400;
    await addTokensAndCheck(approxIn);

    if (!openaiClient) {
      // Fallback demo
      return res.json({
        success: true,
        advice: {
          recommended_replies: [
            'Попросіть уточнити конкретні критерії успіху та KPI.',
            "Зафіксуйте взаємні зобов'язання письмово перед початком робіт.",
            "Запропонуйте поетапну оплату з прив'язкою до результатів.",
          ],
          risks: [
            'Нечіткі очікування можуть призвести до конфліктів',
            'Односторонні ультиматуми свідчать про низьку готовність до компромісу',
            'Штучний дефіцит часу використовується для тиску',
          ],
          notes:
            'Рекомендується зафіксувати всі домовленості письмово та узгодити чіткі критерії успіху проекту. Зверніть увагу на баланс відповідальності.',
        },
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
    };

    // Only add temperature if supported
    if (!/^gpt-5($|[-:])/i.test(MODEL)) {
      reqPayload.temperature = 0.2;
    }

    const resp = await openaiClient.chat.completions.create(reqPayload);
    const content = resp.choices?.[0]?.message?.content || '{}';

    await addTokensAndCheck(600); // output tokens

    return res.json({ success: true, advice: JSON.parse(content) });
  } catch (e) {
    console.error('Advice error:', e.message);
    res
      .status(e.message.includes('Ліміт') ? 429 : 500)
      .json({ error: e.message });
  }
});

export default r;
