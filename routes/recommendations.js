// routes/recommendations.js - Recommendations management API
import { Router } from 'express';
import { run, get, all } from '../utils/db.js';
import { logError } from '../utils/logger.js';

const r = Router();

// Get all recommendations for a client
r.get('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Ensure client exists before querying recommendations
    const client = get('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const recommendations = all(
      `SELECT * FROM recommendations
       WHERE client_id = ?
       ORDER BY created_at DESC`,
      [clientId]
    );

    res.json({ recommendations });
  } catch (error) {
    logError('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Save a new recommendation
r.post('/', async (req, res) => {
  try {
    const { clientId, advice, fragmentsCount = 0 } = req.body;

    if (!clientId || !advice) {
      return res.status(400).json({ error: 'Client ID and advice are required' });
    }

    // Verify client exists to maintain referential integrity
    const client = get('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = run(
      `INSERT INTO recommendations (client_id, advice, fragments_count, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [clientId, advice, fragmentsCount]
    );

    const recommendation = get(
      'SELECT * FROM recommendations WHERE id = ?',
      [result.lastID]
    );

    res.json({ success: true, recommendation });
  } catch (error) {
    logError('Save recommendation error:', error);
    res.status(500).json({ error: 'Failed to save recommendation' });
  }
});

// Delete a recommendation
r.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = run('DELETE FROM recommendations WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    logError('Delete recommendation error:', error);
    res.status(500).json({ error: 'Failed to delete recommendation' });
  }
});

// Clear all recommendations for a client
r.delete('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = get('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = run('DELETE FROM recommendations WHERE client_id = ?', [clientId]);

    res.json({ success: true, deletedCount: result.changes });
  } catch (error) {
    logError('Clear recommendations error:', error);
    res.status(500).json({ error: 'Failed to clear recommendations' });
  }
});

export default r;