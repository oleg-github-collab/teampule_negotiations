// routes/clients.js - Покращена робота з клієнтами
import { Router } from 'express';
import { run, get, all } from '../utils/db.js';

const r = Router();

// GET /api/clients - список клієнтів з кількістю аналізів
r.get('/', (_req, res) => {
  try {
    const rows = all(
      `
      SELECT
        c.*,
        COUNT(a.id) as analyses_count,
        MAX(a.created_at) as last_analysis_at
      FROM clients c
      LEFT JOIN analyses a ON c.id = a.client_id
      GROUP BY c.id
      ORDER BY datetime(c.updated_at) DESC, c.id DESC
      `
    );
    res.json({ success: true, clients: rows });
  } catch (e) {
    console.error('GET /clients error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// GET /api/clients/:id - деталі клієнта з історією аналізів
r.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const client = get(`SELECT * FROM clients WHERE id = ?`, [id]);
    if (!client)
      return res.status(404).json({ success: false, error: 'Client not found' });

    const analyses = all(
      `
      SELECT id, title, source, original_filename, barometer_json, created_at
      FROM analyses 
      WHERE client_id = ?
      ORDER BY datetime(created_at) DESC
      `,
      [id]
    );

    res.json({ success: true, client, analyses });
  } catch (e) {
    console.error('GET /clients/:id error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// GET /api/clients/:id/analysis/:analysisId - конкретний аналіз
r.get('/:id/analysis/:analysisId', (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);
    const analysis = get(
      `
      SELECT * FROM analyses 
      WHERE id = ? AND client_id = ?
      `,
      [analysisId, clientId]
    );

    if (!analysis)
      return res.status(404).json({ success: false, error: 'Analysis not found' });

    res.json({
      success: true,
      analysis: {
        ...analysis,
        highlights: JSON.parse(analysis.highlights_json || '[]'),
        summary: JSON.parse(analysis.summary_json || '{}'),
        barometer: JSON.parse(analysis.barometer_json || '{}'),
      },
    });
  } catch (e) {
    console.error('GET analysis error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// POST /api/clients - створити клієнта
r.post('/', (req, res) => {
  try {
    const c = req.body || {};
    if (!c.company) {
      return res
        .status(400)
        .json({ success: false, error: 'Company name required' });
    }
    
    const now = new Date().toISOString();
    const info = run(
      `
      INSERT INTO clients(
        company, negotiator, sector, goal, decision_criteria, constraints, 
        user_goals, client_goals, weekly_hours, offered_services, deadlines, notes,
        company_size, negotiation_type, deal_value, timeline, competitors, 
        competitive_advantage, market_position, previous_interactions,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
      [
        c.company,
        c.negotiator || null,
        c.sector || null,
        c.goal || null,
        c.decision_criteria || c.criteria || null,
        c.constraints || null,
        c.user_goals || null,
        c.client_goals || null,
        Number(c.weekly_hours) || 0,
        c.offered_services || null,
        c.deadlines || null,
        c.notes || null,
        c.company_size || null,
        c.negotiation_type || null,
        c.deal_value || null,
        c.timeline || null,
        c.competitors || null,
        c.competitive_advantage || null,
        c.market_position || null,
        c.previous_interactions || null,
        now,
        now,
      ]
    );
    const row = get(`SELECT * FROM clients WHERE id=?`, [info.lastID]);
    res.json({ success: true, id: info.lastID, client: row, created: true });
  } catch (e) {
    console.error('POST /clients error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// PUT /api/clients/:id - оновити клієнта
r.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const c = req.body || {};
    
    if (!c.company) {
      return res
        .status(400)
        .json({ success: false, error: 'Company name required' });
    }
    
    const existing = get(`SELECT id FROM clients WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    const now = new Date().toISOString();
    run(
      `
      UPDATE clients SET 
        company=?, negotiator=?, sector=?, company_size=?, negotiation_type=?, 
        deal_value=?, timeline=?, goal=?, decision_criteria=?, constraints=?,
        user_goals=?, client_goals=?, competitors=?, competitive_advantage=?, 
        market_position=?, weekly_hours=?, offered_services=?, deadlines=?, 
        previous_interactions=?, notes=?, updated_at=?
      WHERE id=?
      `,
      [
        c.company,
        c.negotiator || null,
        c.sector || null,
        c.company_size || null,
        c.negotiation_type || null,
        c.deal_value || null,
        c.timeline || null,
        c.goal || null,
        c.decision_criteria || c.criteria || null,
        c.constraints || null,
        c.user_goals || null,
        c.client_goals || null,
        c.competitors || null,
        c.competitive_advantage || null,
        c.market_position || null,
        Number(c.weekly_hours) || 0,
        c.offered_services || null,
        c.deadlines || null,
        c.previous_interactions || null,
        c.notes || null,
        now,
        id,
      ]
    );
    const row = get(`SELECT * FROM clients WHERE id=?`, [id]);
    res.json({ success: true, id, client: row, updated: true });
  } catch (e) {
    console.error('PUT /clients/:id error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// DELETE /api/clients/:id
r.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Bad id' });
    // Cascade delete will remove analyses too
    run(`DELETE FROM clients WHERE id=?`, [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /clients error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// DELETE /api/clients/:id/analysis/:analysisId
r.delete('/:id/analysis/:analysisId', (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);
    run(`DELETE FROM analyses WHERE id=? AND client_id=?`, [analysisId, clientId]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE analysis error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

export default r;
