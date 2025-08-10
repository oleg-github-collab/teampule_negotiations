import { Router } from 'express';
import { getDB } from '../utils/db.js';

const r = Router();

r.get('/', async (_req, res) => {
  const db = await getDB();
  const rows = await db.all(`SELECT * FROM clients ORDER BY updated_at DESC`);
  res.json({ success: true, clients: rows });
});

r.post('/', async (req, res) => {
  const db = await getDB();
  const c = req.body || {};
  if (c.id) {
    await db.run(`
      UPDATE clients SET
        company=?, negotiator=?, sector=?, goal=?, decision_criteria=?, constraints=?,
        user_goals=?, client_goals=?, weekly_hours=?, offered_services=?, deadlines=?, notes=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?`,
      [
        c.company||'', c.negotiator||'', c.sector||'', c.goal||'',
        c.decision_criteria||'', c.constraints||'',
        c.user_goals||'', c.client_goals||'', Number(c.weekly_hours)||0,
        c.offered_services||'', c.deadlines||'', c.notes||'', Number(c.id)
      ]
    );
    const updated = await db.get(`SELECT * FROM clients WHERE id=?`, [c.id]);
    return res.json({ success: true, client: updated });
  } else {
    const result = await db.run(`
      INSERT INTO clients
        (company, negotiator, sector, goal, decision_criteria, constraints, user_goals, client_goals,
         weekly_hours, offered_services, deadlines, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.company||'', c.negotiator||'', c.sector||'', c.goal||'',
        c.decision_criteria||'', c.constraints||'',
        c.user_goals||'', c.client_goals||'', Number(c.weekly_hours)||0,
        c.offered_services||'', c.deadlines||'', c.notes||''
      ]
    );
    const created = await db.get(`SELECT * FROM clients WHERE id=?`, [result.lastID]);
    return res.json({ success: true, client: created });
  }
});

r.delete('/:id', async (req, res) => {
  const db = await getDB();
  await db.run(`DELETE FROM clients WHERE id=?`, [Number(req.params.id)]);
  res.json({ success: true });
});

export default r;
