// routes/clients.js - Production client management (PostgreSQL)
import { Router } from 'express';
import { run, get, all } from '../utils/db-postgres.js';
import { validateClient, validateClientId, validateAnalysisId } from '../middleware/validators.js';
import { logError, logSecurity } from '../utils/logger.js';
import { performance } from 'perf_hooks';

const r = Router();

// GET /api/clients - get all clients with analytics
r.get('/', async (req, res) => {
  const startTime = performance.now();

  try {
    const rows = await all(
      `
      SELECT
        c.*,
        COUNT(a.id) as analyses_count,
        MAX(a.created_at) as last_analysis_at,
        AVG(CAST(a.barometer_json->>'score' AS NUMERIC)) as avg_complexity_score
      FROM clients c
      LEFT JOIN analyses a ON c.id = a.client_id
      GROUP BY c.id
      ORDER BY c.updated_at DESC, c.id DESC
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
    const client = await get(`SELECT * FROM clients WHERE id = $1`, [id]);

    if (!client) {
      logSecurity('Attempt to access non-existent client', {
        clientId: id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const analyses = await all(
      `
      SELECT
        id, title, source, original_filename,
        CAST(barometer_json->>'score' AS NUMERIC) as complexity_score,
        barometer_json->>'label' as complexity_label,
        created_at
      FROM analyses
      WHERE client_id = $1
      ORDER BY created_at DESC
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

// GET /api/clients/:id/analysis/:analysisId - get specific analysis
r.get('/:id/analysis/:analysisId', validateClientId, validateAnalysisId, async (req, res) => {
  const startTime = performance.now();

  try {
    const clientId = Number(req.params.id);
    const analysisId = Number(req.params.analysisId);

    const analysis = await get(`
      SELECT * FROM analyses
      WHERE id = $1 AND client_id = $2
    `, [analysisId, clientId]);

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    const duration = performance.now() - startTime;
    res.set('X-Response-Time', `${Math.round(duration)}ms`);
    res.json({
      success: true,
      analysis: {
        ...analysis,
        highlights: analysis.highlights_json || [],
        summary: analysis.summary_json || {},
        barometer: analysis.barometer_json || {},
        highlighted_text: analysis.highlighted_text || null,
      },
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, {
      endpoint: 'GET /api/clients/:id/analysis/:analysisId',
      clientId: req.params.id,
      analysisId: req.params.analysisId,
      ip: req.ip
    });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// POST /api/clients - create new client
r.post('/', validateClient, async (req, res) => {
  const startTime = performance.now();

  try {
    const c = req.body || {};

    const result = await run(
      `
      INSERT INTO clients(
        company, negotiator, sector, goal, decision_criteria, constraints,
        user_goals, client_goals, weekly_hours, offered_services, deadlines, notes,
        company_size, negotiation_type, deal_value, timeline, competitors,
        competitive_advantage, market_position, previous_interactions
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id
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
      ]
    );

    const newId = result.rows[0].id;
    const row = await get(`SELECT * FROM clients WHERE id = $1`, [newId]);

    const duration = performance.now() - startTime;
    res.json({
      success: true,
      id: newId,
      client: row,
      created: true,
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'POST /api/clients', ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// PUT /api/clients/:id - update client
r.put('/:id', validateClientId, validateClient, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);
    const c = req.body || {};

    const existing = await get(`SELECT id FROM clients WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    await run(
      `
      UPDATE clients SET
        company=$1, negotiator=$2, sector=$3, company_size=$4, negotiation_type=$5,
        deal_value=$6, timeline=$7, goal=$8, decision_criteria=$9, constraints=$10,
        user_goals=$11, client_goals=$12, competitors=$13, competitive_advantage=$14,
        market_position=$15, weekly_hours=$16, offered_services=$17, deadlines=$18,
        previous_interactions=$19, notes=$20
      WHERE id=$21
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
        id,
      ]
    );

    const row = await get(`SELECT * FROM clients WHERE id = $1`, [id]);

    const duration = performance.now() - startTime;
    res.json({
      success: true,
      id,
      client: row,
      updated: true,
      meta: {
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'PUT /api/clients/:id', clientId: req.params.id, ip: req.ip });
    res.status(500).json({ success: false, error: 'Database error occurred' });
  }
});

// DELETE /api/clients/:id - delete client
r.delete('/:id', validateClientId, async (req, res) => {
  const startTime = performance.now();

  try {
    const id = Number(req.params.id);

    // Check if client exists
    const existing = await get(`SELECT id, company FROM clients WHERE id = $1`, [id]);
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

    // Delete client (analyses will be deleted automatically due to CASCADE)
    const result = await run(`DELETE FROM clients WHERE id = $1`, [id]);

    const duration = performance.now() - startTime;
    res.json({
      success: true,
      meta: {
        deletedRows: result.changes,
        responseTime: Math.round(duration)
      }
    });
  } catch (e) {
    logError(e, { endpoint: 'DELETE /api/clients/:id', clientId: req.params.id, ip: req.ip });
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
    const existing = await get(`SELECT title FROM analyses WHERE id = $1 AND client_id = $2`, [analysisId, clientId]);
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

    const result = await run(`DELETE FROM analyses WHERE id = $1 AND client_id = $2`, [analysisId, clientId]);

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
