import { Router } from 'express';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { getDB } from '../utils/db.js';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const DAILY_TOKEN_LIMIT = Number(process.env.DAILY_TOKEN_LIMIT || 512000);

// daily limit helpers (reuse from analyze.js logic)
async function getUsageRow(db) {
  const day = new Date().toISOString().slice(0,10);
  let row = await db.get(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  if (!row) {
    await db.run(`INSERT INTO usage_daily(day, tokens_used) VALUES(?,0)`, [day]);
    row = await db.get(`SELECT * FROM usage_daily WHERE day=?`, [day]);
  }
  return { row, day };
}
async function addTokensAndCheck(db, tokensToAdd) {
  const { row, day } = await getUsageRow(db);
  if (row.locked_until) {
    const until = new Date(row.locked_until).getTime();
    if (Date.now() < until) throw new Error(`Ліміт досягнуто. Розблокування: ${row.locked_until}`);
  }
  const newTotal = (row.tokens_used || 0) + tokensToAdd;
  if (newTotal >= DAILY_TOKEN_LIMIT) {
    const lock = new Date(Date.now()+24*60*60*1000).toISOString();
    await db.run(`UPDATE usage_daily SET tokens_used=?, locked_until=? WHERE day=?`, [newTotal, lock, day]);
    throw new Error(`Досягнуто 512k токенів. Блокування до ${lock}`);
  } else {
    await db.run(`UPDATE usage_daily SET tokens_used=? WHERE day=?`, [newTotal, day]);
  }
}

r.post('/', async (req, res) => {
  try {
    const { items, profile } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Немає фрагментів для поради' });
    }
    const db = await getDB();
    const approxIn = estimateTokens(JSON.stringify(items)) + 400;
    await addTokensAndCheck(db, approxIn);

    if (!openaiClient) {
      // Fallback
      return res.json({
        success: true,
        advice: {
          recommended_replies: [
            'Попросіть уточнити конкретні критерії успіху та KPI.',
            'Зафіксуйте взаємні зобов’язання письмово перед початком робіт.'
          ],
          risks: ['Нечіткі очікування', 'Односторонні ультиматуми'],
          notes: 'Зверніть увагу на баланс відповідальності і обмеження бюджету.'
        }
      });
    }

    const sys = `
Ти — експерт зі стратегій відповідей у переговорах.
На вхід подаються вибрані фрагменти тексту та контекст клієнта.
Сформуй:
- recommended_replies: 2–4 варіанти відповідей (лаконічно, професійно);
- risks: 2–4 ключові ризики;
- notes: короткі зауваги, на що звернути увагу.
Поверни СТРОГО JSON: {"recommended_replies":[...],"risks":[...],"notes":"..."}
`.trim();

    const usr = `
Фрагменти:
${items.map((it,i)=>`[${i+1}] (${it.category||'neutral'} | ${it.label||'—'}) ${it.text}`).join('\n')}

Контекст клієнта:
${JSON.stringify({
  company: profile?.company||'',
  negotiator: profile?.negotiator||'',
  sector: profile?.sector||'',
  user_goals: profile?.user_goals||profile?.goal||'',
  client_goals: profile?.client_goals||'',
  weekly_hours: profile?.weekly_hours||0,
  offered_services: profile?.offered_services||'',
  deadlines: profile?.deadlines||'',
  constraints: profile?.constraints||'',
  decision_criteria: profile?.criteria||'',
  notes: profile?.notes||''
}, null, 2)}
`.trim();

    const resp = await openaiClient.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr }
      ]
    });

    const content = resp.choices?.[0]?.message?.content || '{}';
    await addTokensAndCheck(db, 600); // вихід
    return res.json({ success: true, advice: JSON.parse(content) });
  } catch (e) {
    console.error('Advice error:', e.message);
    res.status(429).json({ error: e.message });
  }
});

export default r;
