// routes/clients.js - Production client management
import { Router } from 'express';
import { run, get, all } from '../utils/db.js';
import { validateClient, validateClientId, validateAnalysisId } from '../middleware/validators.js';
import { logError, logSecurity } from '../utils/logger.js';
import { performance } from 'perf_hooks';

const r = Router();

// GET /api/clients - get all clients with analytics
r.get('/', async (req, res) => {
  const startTime = performance.now();
  
  try {
    const rows = all(
      `
      SELECT
        c.*,
        COUNT(a.id) as analyses_count,
        MAX(a.created_at) as last_analysis_at,
        AVG(json_extract(a.barometer_json, '$.score')) as avg_complexity_score
      FROM clients c
      LEFT JOIN analyses a ON c.id = a.client_id
      GROUP BY c.id
      ORDER BY datetime(c.updated_at) DESC, c.id DESC
      LIMIT 1000
      `
    );
    
    const duration = performance.now() - startTime;
    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({ 
      success: true, 
      clients: rows,
      meta: {
        count: rows.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'GET /api/clients', ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// GET /api/clients/:id - get client details with analysis history
r.get('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();
  
  try {
    const id = Number(req.params.id);
    const client = get(`SELECT * FROM clients WHERE id = ?`, [id]);
    
    if (!client) {
      logSecurity('Attempt to access non-existent client', {
        clientId: id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const analyses = all(
      `
      SELECT 
        id, title, source, original_filename, 
        json_extract(barometer_json, '$.score') as complexity_score,
        json_extract(barometer_json, '$.label') as complexity_label,
        created_at
      FROM analyses 
      WHERE client_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 100
      `,
      [id]
    );
    
    const duration = performance.now() - startTime;
    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({ 
      success: true, 
      client, 
      analyses,
      meta: {
        analysisCount: analyses.length,
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'GET /api/clients/:id', clientId: req.params.id, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
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
        highlighted_text: analysis.highlighted_text || null,
        original_text: analysis.original_text || null,
      },
    });
  } catch (e) {
    console.error('GET analysis error', e);
    res.status(500).json({ success: false, error: 'DB error' });
  }
});

// POST /api/clients - create new client
r.post('/', validateClient, async (req, res) => {
  const startTime = performance.now();
  
  try {
    const c = req.body || {};
    
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

// PUT /api/clients/:id - update client
r.put('/:id', validateClientId, validateClient, async (req, res) => {
  const startTime = performance.now();
  
  try {
    const id = Number(req.params.id);
    const c = req.body || {};
    
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

// DELETE /api/clients/:id - delete client
r.delete('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();
  
  try {
    const id = Number(req.params.id);
    
    // Check if client exists
    const existing = get(`SELECT id, company FROM clients WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    // Log security event for deletion
    logSecurity('Client deletion', {
      clientId: id,
      company: existing.company,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Delete analyses first to avoid foreign key constraint
    const analysesResult = run(`DELETE FROM analyses WHERE client_id=?`, [id]);
    
    // Then delete the client
    const result = run(`DELETE FROM clients WHERE id=?`, [id]);
    
    const duration = performance.now() - startTime;
    res.json({ 
      success: true,
      meta: {
        deletedRows: result.changes,
        deletedAnalyses: analysesResult.changes,
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'DELETE /api/clients/:id', clientId: req.params.id, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// GET /api/clients/:id/analysis/:analysisId - get specific analysis
r.get('/:id/analysis/:analysisId', validateClientId, validateAnalysisId, async (req, res) => {
  const startTime = performance.now();
  
  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);
    
    // Verify analysis exists and belongs to client
    const analysis = get(`
      SELECT * FROM analyses 
      WHERE id=? AND client_id=?
    `, [analysisId, clientId]);
    
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    
    // Parse JSON fields
    let highlights = [];
    let summary = null;
    let barometer = null;
    
    try {
      if (analysis.highlights_json) {
        highlights = JSON.parse(analysis.highlights_json);
      }
    } catch (e) {
      console.warn('Failed to parse highlights_json:', e);
    }
    
    try {
      if (analysis.summary_json) {
        summary = JSON.parse(analysis.summary_json);
      }
    } catch (e) {
      console.warn('Failed to parse summary_json:', e);
    }
    
    try {
      if (analysis.barometer_json) {
        barometer = JSON.parse(analysis.barometer_json);
      }
    } catch (e) {
      console.warn('Failed to parse barometer_json:', e);
    }
    
    const duration = performance.now() - startTime;
    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({ 
      success: true, 
      analysis: {
        ...analysis,
        highlights,
        summary,
        barometer,
        highlighted_text: analysis.highlighted_text || null,
        original_text: analysis.original_text || null
      },
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'GET /api/clients/:id/analysis/:analysisId', clientId: req.params.id, analysisId: req.params.analysisId, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// DELETE /api/clients/:id/analysis/:analysisId - delete analysis
r.delete('/:id/analysis/:analysisId', validateClientId, validateAnalysisId, async (req, res) => {
  const startTime = performance.now();
  
  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);
    
    // Verify analysis exists and belongs to client
    const existing = get(`SELECT title FROM analyses WHERE id=? AND client_id=?`, [analysisId, clientId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    
    logSecurity('Analysis deletion', {
      analysisId,
      clientId,
      title: existing.title,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    const result = run(`DELETE FROM analyses WHERE id=? AND client_id=?`, [analysisId, clientId]);
    
    const duration = performance.now() - startTime;
    res.json({ 
      success: true,
      meta: {
        deletedRows: result.changes,
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { 
      endpoint: 'DELETE /api/clients/:id/analysis/:analysisId', 
      clientId: req.params.id,
      analysisId: req.params.analysisId,
      ip: req.ip 
    });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

export default r;
