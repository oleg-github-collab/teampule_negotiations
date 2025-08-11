// routes/clients.js
import { Router } from 'express';
import { run, get, all } from '../utils/db.js';

const r = Router();

// GET /api/clients — список (новіші зверху)
r.get('/clients', (_req, res) => {
  try {
    const rows = all(`SELECT * FROM clients ORDER BY datetime(updated_at) DESC, id DESC`);
    res.json({ success: true, clients: rows });
  } catch (e) {
    console.error('GET /clients error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// POST /api/clients — створити або оновити за company (upsert-lite)
r.post('/clients', (req, res) => {
  try {
    const c = req.body || {};
    const existing = get(`SELECT id FROM clients WHERE company = ?`, [c.company || '']);
    const now = new Date().toISOString();

    if (existing?.id) {
      run(
        `UPDATE clients SET 
          negotiator=?, sector=?, goal=?, decision_criteria=?, constraints=?, 
          user_goals=?, client_goals=?, weekly_hours=?, offered_services=?, deadlines=?, notes=?, 
          updated_at=?
         WHERE id=?`,
        [
          c.negotiator || null,
          c.sector || null,
          c.goal || null,
          c.criteria || null,
          c.constraints || null,
          c.user_goals || null,
          c.client_goals || null,
          Number(c.weekly_hours) || 0,
          c.offered_services || null,
          c.deadlines || null,
          c.notes || null,
          now,
          existing.id
        ]
      );
      const row = get(`SELECT * FROM clients WHERE id=?`, [existing.id]);
      res.json({ success: true, id: existing.id, client: row, updated: true });
    } else {
      const info = run(
        `INSERT INTO clients(
           company, negotiator, sector, goal, decision_criteria, constraints,
           user_goals, client_goals, weekly_hours, offered_services, deadlines, notes,
           created_at, updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          c.company || null,
          c.negotiator || null,
          c.sector || null,
          c.goal || null,
          c.criteria || null,
          c.constraints || null,
          c.user_goals || null,
          c.client_goals || null,
          Number(c.weekly_hours) || 0,
          c.offered_services || null,
          c.deadlines || null,
          c.notes || null,
          now,
          now
        ]
      );
      const row = get(`SELECT * FROM clients WHERE id=?`, [info.lastID]);
      res.json({ success: true, id: info.lastID, client: row, created: true });
    }
  } catch (e) {
    console.error('POST /clients error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// DELETE /api/clients/:id
r.delete('/clients/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Bad id' });
    run(`DELETE FROM clients WHERE id=?`, [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /clients error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

export default r;
