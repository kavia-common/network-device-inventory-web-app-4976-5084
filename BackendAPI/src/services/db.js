'use strict';

/**
 * Lightweight DB layer supporting PostgreSQL and SQLite driven by env.
 * - DB_CLIENT=pg|sqlite
 * - DATABASE_URL=connection string (for sqlite: file path e.g., sqlite:///data/devices.db or ./data/devices.db)
 * Resilient: if chosen backend is unavailable, degrade to an in-memory store so server can start.
 */

const { URL } = require('url');
const fs = require('fs');
const path = require('path');

let DB_CLIENT = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
let DATABASE_URL = process.env.DATABASE_URL || 'sqlite://./data/devices.db';

let pg = null;
let sqlite3 = null;

/** Normalize sqlite file path from DATABASE_URL */
function resolveSqlitePath(url) {
  try {
    // Allow formats: sqlite:///abs/path.db, sqlite://./rel.db, ./rel.db
    if (typeof url === 'string' && url.startsWith('sqlite://')) {
      const u = new URL(url);
      let p = u.pathname;
      if (process.platform === 'win32' && p.startsWith('/')) {
        p = p.slice(1);
      }
      return path.resolve(p);
    }
    return path.resolve(url);
  } catch {
    return path.resolve(url);
  }
}

// Common schema for sqlite; PG uses its own DDL
const schemaSql = `
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  device_type TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_ping TEXT
);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
`;

/**
 * In-memory fallback implementation with a tiny query layer compatible with our usage.
 */
class MemoryDB {
  constructor() {
    this.devices = [];
    this.nextId = 1;
    this.backend = 'memory';
  }

  async init() {
    console.warn('[DB] Using in-memory database (no persistence).');
  }

  async query(sql, params = []) {
    const s = sql.trim().toLowerCase();
    if (s.startsWith('select')) {
      // Very basic implementations used by services/devices.js
      if (s.includes('from devices where id =')) {
        const id = params[0];
        const row = this.devices.find((d) => d.id === Number(id));
        return { rows: row ? [row] : [] };
      }
      // list with optional WHERE device_type = ?
      let rows = [...this.devices].sort((a, b) => a.id - b.id);
      if (s.includes('where device_type')) {
        const type = params[0];
        rows = rows.filter((d) => d.device_type === type);
      }
      // Handle LIMIT/OFFSET parsed by services, not enforced here
      return { rows };
    } else if (s.startsWith('insert')) {
      const columnsMatch = sql.match(/insert into devices\s*\(([^)]+)\)/i);
      const cols = columnsMatch ? columnsMatch[1].split(',').map((c) => c.trim()) : [];
      const record = { id: this.nextId++, status: 'unknown', last_ping: null };
      cols.forEach((c, idx) => {
        record[c] = params[idx];
      });
      this.devices.push(record);
      return { lastID: record.id, changes: 1, rows: [record] };
    } else if (s.startsWith('update')) {
      const id = params[params.length - 1];
      const device = this.devices.find((d) => d.id === Number(id));
      if (!device) return { changes: 0, rows: [] };
      // naive parse: we rely on params order matching sets
      const setMatch = sql.match(/set\s+(.+)\s+where/i);
      const sets = setMatch ? setMatch[1].split(',').map((p) => p.split('=')[0].trim()) : [];
      sets.forEach((col, i) => {
        device[col] = params[i];
      });
      return { changes: 1, rows: [device] };
    } else if (s.startsWith('delete')) {
      const id = params[0];
      const before = this.devices.length;
      this.devices = this.devices.filter((d) => d.id !== Number(id));
      return { changes: before - this.devices.length, rowCount: before - this.devices.length };
    }
    return { rows: [] };
  }

  async getOne(sql, params = []) {
    const res = await this.query(sql, params);
    return res.rows && res.rows[0] ? res.rows[0] : null;
  }

  async close() {
    // no-op
  }
}

class DB {
  constructor() {
    this.client = null;
    this.backend = null; // 'pg' | 'sqlite' | 'memory'
  }

  async init() {
    // Attempt to init requested backend; degrade gracefully on failure.
    if (DB_CLIENT === 'pg') {
      try {
        pg = require('pg');
        const { Client } = pg;
        if (!DATABASE_URL) {
          throw new Error('DATABASE_URL is required for pg');
        }
        this.client = new Client({ connectionString: DATABASE_URL });
        await this.client.connect();
        const pgSchema = `
          CREATE TABLE IF NOT EXISTS devices (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            ip_address VARCHAR(64) NOT NULL,
            mac_address VARCHAR(64) NOT NULL,
            device_type VARCHAR(64) NOT NULL,
            location VARCHAR(255) NOT NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'unknown',
            last_ping TIMESTAMP NULL
          );
          CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
        `;
        await this.client.query(pgSchema);
        this.backend = 'pg';
        console.log('[DB] Connected to PostgreSQL');
        return;
      } catch (e) {
        console.warn('[DB] Failed to initialize PostgreSQL, falling back to SQLite:', e.message);
        DB_CLIENT = 'sqlite';
      }
    }

    // Try SQLite
    try {
      // eslint-disable-next-line global-require
      sqlite3 = require('sqlite3').verbose();
      const filePath = resolveSqlitePath(DATABASE_URL || './data/devices.db');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.client = new sqlite3.Database(filePath);
      await new Promise((resolve, reject) => {
        this.client.exec(schemaSql, (err) => (err ? reject(err) : resolve()));
      });
      this.backend = 'sqlite';
      console.log(`[DB] Using SQLite at ${filePath}`);
      return;
    } catch (e) {
      console.warn('[DB] Failed to initialize SQLite, falling back to in-memory store:', e.message);
    }

    // Fallback to in-memory
    const mem = new MemoryDB();
    await mem.init();
    this.client = mem;
    this.backend = 'memory';
  }

  async query(sql, params = []) {
    if (this.backend === 'pg') {
      const res = await this.client.query(sql, params);
      return res;
    }
    if (this.backend === 'sqlite') {
      const isSelect = /^\s*select/i.test(sql);
      const isInsert = /^\s*insert/i.test(sql);
      return await new Promise((resolve, reject) => {
        if (isSelect) {
          this.client.all(sql, params, (err, rows) => (err ? reject(err) : resolve({ rows })));
        } else if (isInsert) {
          this.client.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
          });
        } else {
          this.client.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
          });
        }
      });
    }
    // memory
    return this.client.query(sql, params);
  }

  async getOne(sql, params = []) {
    if (this.backend === 'pg') {
      const res = await this.client.query(sql, params);
      return res.rows[0] || null;
    }
    if (this.backend === 'sqlite') {
      return await new Promise((resolve, reject) => {
        this.client.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
      });
    }
    // memory
    return this.client.getOne(sql, params);
  }

  async close() {
    if (!this.client) return;
    if (this.backend === 'pg') {
      await this.client.end();
    } else if (this.backend === 'sqlite') {
      await new Promise((resolve) => this.client.close(() => resolve()));
    }
  }
}

const db = new DB();
db.init().catch((e) => {
  // As a final safety net, fall back to memory rather than exiting
  console.error('[DB] Unexpected init error, using in-memory:', e);
  const mem = new MemoryDB();
  mem.init().then(() => {
    db.client = mem;
    db.backend = 'memory';
  });
});

module.exports = db;
