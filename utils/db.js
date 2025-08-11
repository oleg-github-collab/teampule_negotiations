// utils/db.js - База даних з оновленою схемою
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH =
  process.env.DB_PATH || join(__dirname, '../data/teampulse.db');

// Create directory if needed
const dir = dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Open database
const db = new Database(DB_PATH, { fileMustExist: false });

// Pragmas for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Updated schema with better structure
db.exec(`
CREATE TABLE IF NOT EXISTS clients(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analyses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  title TEXT,
  source TEXT,
  original_filename TEXT,
  original_text TEXT,
  tokens_estimated INTEGER,
  highlights_json TEXT,
  summary_json TEXT,
  barometer_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usage_daily(
  day TEXT PRIMARY KEY,
  tokens_used INTEGER DEFAULT 0,
  locked_until TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analyses_client ON analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
`);

// Migration: Add missing columns to existing tables
try {
  db.exec(`ALTER TABLE analyses ADD COLUMN title TEXT;`);
  console.log('✅ Added title column to analyses');
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE analyses ADD COLUMN original_text TEXT;`);
  console.log('✅ Added original_text column to analyses');
} catch (e) {
  // Column already exists
}

// Add new client fields
const newClientFields = [
  'company_size TEXT',
  'negotiation_type TEXT',
  'deal_value TEXT', 
  'timeline TEXT',
  'competitors TEXT',
  'competitive_advantage TEXT',
  'market_position TEXT',
  'previous_interactions TEXT'
];

for (const field of newClientFields) {
  try {
    const [fieldName] = field.split(' ');
    db.exec(`ALTER TABLE clients ADD COLUMN ${field};`);
    console.log(`✅ Added ${fieldName} column to clients`);
  } catch (e) {
    // Column already exists
  }
}

// Unified interface
export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const info = Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
  return { lastID: info.lastInsertRowid, changes: info.changes };
}

export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
}

export const transaction = (fn) => db.transaction(fn);

// Shim for old code
export function getDB() {
  return { run, get, all, transaction };
}
