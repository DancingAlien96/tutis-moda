// Base de datos SQLite usando el módulo nativo de Node 22 (sin compilar nada).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from './shared.js';

export { SIZES, STYLES, BRANDS, ORDER_STATUSES, DEFAULT_SETTINGS } from './shared.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, 'data', 'tienda.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
// busy_timeout: si otro proceso (p. ej. `npm run seed`) tiene la DB ocupada, espera en vez de fallar.
db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  brand         TEXT    NOT NULL,
  style         TEXT    NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  price         REAL    NOT NULL,
  compare_price REAL,
  wash          TEXT    NOT NULL DEFAULT '#3b5b8c',
  image         TEXT,
  stock         TEXT    NOT NULL DEFAULT '{}',
  featured      INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT    NOT NULL UNIQUE,
  customer_name  TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  email          TEXT,
  delivery       TEXT    NOT NULL,
  department     TEXT,
  municipality   TEXT,
  address        TEXT,
  notes          TEXT,
  payment        TEXT    NOT NULL,
  items          TEXT    NOT NULL,
  subtotal       REAL    NOT NULL,
  shipping       REAL    NOT NULL,
  total          REAL    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'pendiente',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);


const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);

// Migración: token para consultar un pedido sin sesión (bases creadas antes de esta columna).
if (!db.prepare("SELECT 1 FROM pragma_table_info('orders') WHERE name = 'access_token'").get()) {
  db.exec('ALTER TABLE orders ADD COLUMN access_token TEXT');
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function rowToProduct(r) {
  if (!r) return null;
  const stock = JSON.parse(r.stock || '{}');
  return {
    ...r,
    stock,
    featured: !!r.featured,
    active: !!r.active,
    totalStock: Object.values(stock).reduce((a, b) => a + Number(b || 0), 0),
  };
}

export function rowToOrder(r) {
  if (!r) return null;
  return { ...r, items: JSON.parse(r.items) };
}

/** Ejecuta fn dentro de una transacción. */
export function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
