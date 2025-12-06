// migrate-to-postgres.js - Migration script from SQLite to PostgreSQL
import Database from 'better-sqlite3';
import { initializeDatabase, run, transaction } from './utils/db-postgres.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SQLITE_PATH = process.env.DB_PATH || join(__dirname, 'data/teampulse.db');

async function migrateData() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n');

  try {
    // Initialize PostgreSQL schema
    console.log('📋 Step 1: Initializing PostgreSQL schema...');
    await initializeDatabase();
    console.log('✅ Schema initialized\n');

    // Check if SQLite database exists
    console.log('📋 Step 2: Checking SQLite database...');
    let sqliteDb;
    try {
      sqliteDb = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });
      console.log(`✅ SQLite database found at ${SQLITE_PATH}\n`);
    } catch (error) {
      console.log('⚠️  No SQLite database found. Starting with empty PostgreSQL database.\n');
      return;
    }

    // Migrate clients
    console.log('📋 Step 3: Migrating clients...');
    const clients = sqliteDb.prepare('SELECT * FROM clients').all();
    console.log(`Found ${clients.length} clients to migrate`);

    const clientIdMapping = new Map(); // Old ID -> New ID

    for (const client of clients) {
      const result = await run(
        `INSERT INTO clients (
          company, negotiator, sector, company_size, negotiation_type,
          deal_value, timeline, goal, decision_criteria, constraints,
          user_goals, client_goals, competitors, competitive_advantage,
          market_position, weekly_hours, offered_services, deadlines,
          previous_interactions, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id`,
        [
          client.company,
          client.negotiator,
          client.sector,
          client.company_size,
          client.negotiation_type,
          client.deal_value,
          client.timeline,
          client.goal,
          client.decision_criteria,
          client.constraints,
          client.user_goals,
          client.client_goals,
          client.competitors,
          client.competitive_advantage,
          client.market_position,
          client.weekly_hours || 0,
          client.offered_services,
          client.deadlines,
          client.previous_interactions,
          client.notes,
          client.created_at,
          client.updated_at
        ]
      );

      clientIdMapping.set(client.id, result.rows[0].id);
    }
    console.log(`✅ Migrated ${clients.length} clients\n`);

    // Migrate analyses
    console.log('📋 Step 4: Migrating analyses...');
    const analyses = sqliteDb.prepare('SELECT * FROM analyses').all();
    console.log(`Found ${analyses.length} analyses to migrate`);

    for (const analysis of analyses) {
      const newClientId = clientIdMapping.get(analysis.client_id);
      if (!newClientId) {
        console.log(`⚠️  Skipping analysis ${analysis.id} - client not found`);
        continue;
      }

      await run(
        `INSERT INTO analyses (
          client_id, title, source, original_filename, original_text,
          tokens_estimated, highlights_json, summary_json, barometer_json,
          highlighted_text, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)`,
        [
          newClientId,
          analysis.title,
          analysis.source,
          analysis.original_filename,
          analysis.original_text,
          analysis.tokens_estimated,
          analysis.highlights_json,
          analysis.summary_json,
          analysis.barometer_json,
          analysis.highlighted_text,
          analysis.created_at
        ]
      );
    }
    console.log(`✅ Migrated ${analyses.length} analyses\n`);

    // Migrate usage data
    console.log('📋 Step 5: Migrating usage data...');
    const usageRows = sqliteDb.prepare('SELECT * FROM usage_daily').all();
    console.log(`Found ${usageRows.length} usage records to migrate`);

    for (const usage of usageRows) {
      await run(
        `INSERT INTO usage_daily (day, tokens_used, locked_until)
         VALUES ($1, $2, $3)
         ON CONFLICT (day) DO UPDATE SET
         tokens_used = EXCLUDED.tokens_used,
         locked_until = EXCLUDED.locked_until`,
        [usage.day, usage.tokens_used, usage.locked_until]
      );
    }
    console.log(`✅ Migrated ${usageRows.length} usage records\n`);

    sqliteDb.close();

    console.log('✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Clients: ${clients.length}`);
    console.log(`   - Analyses: ${analyses.length}`);
    console.log(`   - Usage records: ${usageRows.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n✅ Done! You can now use PostgreSQL database.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });
