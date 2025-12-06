// utils/db-postgres.js - PostgreSQL database connection and utilities
import pg from 'pg';
const { Pool } = pg;
import logger from './logger.js';

// Database configuration from environment variables
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Railway requires this
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
let pool = null;

// Initialize pool with error handling
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL connection');
    }

    pool = new Pool(dbConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
    });

    // Log pool connection
    logger.info('PostgreSQL connection pool created', {
      max: dbConfig.max,
      ssl: !!dbConfig.ssl
    });
  }

  return pool;
}

// Initialize database schema
export async function initializeDatabase() {
  const client = await getPool().connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        company TEXT NOT NULL,
        negotiator TEXT,
        sector TEXT,
        company_size TEXT,
        negotiation_type TEXT,
        deal_value TEXT,
        timeline TEXT,
        goal TEXT,
        decision_criteria TEXT,
        constraints TEXT,
        user_goals TEXT,
        client_goals TEXT,
        competitors TEXT,
        competitive_advantage TEXT,
        market_position TEXT,
        weekly_hours INTEGER DEFAULT 0,
        offered_services TEXT,
        deadlines TEXT,
        previous_interactions TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT,
        source TEXT,
        original_filename TEXT,
        original_text TEXT,
        tokens_estimated INTEGER,
        highlights_json JSONB,
        summary_json JSONB,
        barometer_json JSONB,
        highlighted_text TEXT,
        participants_filter JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create usage_daily table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_daily (
        day DATE PRIMARY KEY,
        tokens_used INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_analyses_client ON analyses(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_usage_day ON usage_daily(day DESC)');

    // Create trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
          CREATE TRIGGER update_clients_updated_at
          BEFORE UPDATE ON clients
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END;
      $$;
    `);

    await client.query('COMMIT');
    logger.info('✅ PostgreSQL database schema initialized successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Failed to initialize database schema', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    client.release();
  }
}

// Run a query that modifies data (INSERT, UPDATE, DELETE)
export async function run(sql, params = []) {
  const client = await getPool().connect();

  try {
    const result = await client.query(sql, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount || 0,
      rows: result.rows
    };
  } catch (error) {
    logger.error('Database run error', { sql, error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

// Get a single row
export async function get(sql, params = []) {
  const client = await getPool().connect();

  try {
    const result = await client.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Database get error', { sql, error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

// Get all rows
export async function all(sql, params = []) {
  const client = await getPool().connect();

  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Database all error', { sql, error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

// Transaction helper
export async function transaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

// Health check
export async function healthCheck() {
  try {
    const result = await get('SELECT 1 as test');
    return result?.test === 1;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return false;
  }
}

// Graceful shutdown
export async function closePool() {
  if (pool) {
    await pool.end();
    logger.info('PostgreSQL connection pool closed');
    pool = null;
  }
}

// Compatibility wrapper for old code
export function getDB() {
  return { run, get, all, transaction };
}
