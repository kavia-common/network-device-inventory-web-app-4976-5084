'use strict';

const db = require('./db');
const { STATUS_ENUM } = require('../utils/validation');
const { pingHost } = require('../utils/ping');

function columnList() {
  return 'id, name, ip_address, mac_address, device_type, location, status, last_ping';
}

function mapRow(row) {
  // Ensure last_ping is ISO string if present
  if (row && row.last_ping && row.last_ping instanceof Date) {
    row.last_ping = row.last_ping.toISOString();
  }
  return row;
}

// PUBLIC_INTERFACE
async function listDevices({ page = 1, perPage = 10, type }) {
  /** Returns paginated list with optional device_type filter */
  const offset = (page - 1) * perPage;
  let where = '';
  const params = [];
  if (type) {
    where = 'WHERE device_type = $1';
    params.push(type);
  }
  const limitOffset = ` LIMIT ${perPage} OFFSET ${offset}`;

  const sql =
    (db.constructor.name === 'DB' && process.env.DB_CLIENT === 'pg')
      ? `SELECT ${columnList()} FROM devices ${where} ORDER BY id ASC${limitOffset}`
      : `SELECT ${columnList()} FROM devices ${where.replace(/\$1/g, '?')} ORDER BY id ASC${limitOffset}`;

  const res = await db.query(sql, params);
  const rows = res.rows || [];
  return rows.map(mapRow);
}

// PUBLIC_INTERFACE
async function createDevice(payload) {
  /** Inserts a new device and returns it. Sets status='unknown' and null last_ping initially. */
  const fields = ['name', 'ip_address', 'mac_address', 'device_type', 'location'];
  const values = fields.map((f) => payload[f]);

  if (process.env.DB_CLIENT === 'pg') {
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO devices (${fields.join(', ')})
                 VALUES (${placeholders})
                 RETURNING ${columnList()}`;
    const res = await db.query(sql, values);
    return mapRow(res.rows[0]);
  } else {
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO devices (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await db.query(sql, values);
    const id = result.lastID;
    const row = await db.getOne(`SELECT ${columnList()} FROM devices WHERE id = ?`, [id]);
    return mapRow(row);
  }
}

// PUBLIC_INTERFACE
async function getDevice(id) {
  /** Fetch device by id or null if not found */
  const sql =
    process.env.DB_CLIENT === 'pg'
      ? `SELECT ${columnList()} FROM devices WHERE id = $1`
      : `SELECT ${columnList()} FROM devices WHERE id = ?`;
  const row = await db.getOne(sql, [id]);
  return row ? mapRow(row) : null;
}

// PUBLIC_INTERFACE
async function updateDevice(id, payload, { partial = false } = {}) {
  /** Update a device. For PUT require all updatable fields; for PATCH allow subset. */
  const allowed = ['name', 'ip_address', 'mac_address', 'device_type', 'location', 'status', 'last_ping'];
  const keys = allowed.filter((k) => payload[k] !== undefined);
  if (keys.length === 0) {
    return await getDevice(id);
  }

  if (process.env.DB_CLIENT === 'pg') {
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const params = keys.map((k) => payload[k]);
    params.push(id);
    const sql = `UPDATE devices SET ${sets} WHERE id = $${params.length} RETURNING ${columnList()}`;
    const res = await db.query(sql, params);
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  } else {
    const sets = keys.map((k) => `${k} = ?`).join(', ');
    const params = keys.map((k) => payload[k]);
    params.push(id);
    const sql = `UPDATE devices SET ${sets} WHERE id = ?`;
    await db.query(sql, params);
    const row = await getDevice(id);
    return row;
  }
}

// PUBLIC_INTERFACE
async function deleteDevice(id) {
  /** Delete a device by id. Returns true if deleted, false if not found. */
  if (process.env.DB_CLIENT === 'pg') {
    const res = await db.query('DELETE FROM devices WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  } else {
    const res = await db.query('DELETE FROM devices WHERE id = ?', [id]);
    return (res.changes || 0) > 0;
  }
}

// PUBLIC_INTERFACE
async function pingAndUpdate(id) {
  /** Ping device, update status and last_ping, and return status info. */
  const device = await getDevice(id);
  if (!device) return null;
  const result = await pingHost(device.ip_address);
  const update = {
    status: result.status,
    last_ping: result.timestamp,
  };
  await updateDevice(id, update, { partial: true });
  return { status: result.status, last_ping: result.timestamp };
}

module.exports = {
  listDevices,
  createDevice,
  getDevice,
  updateDevice,
  deleteDevice,
  pingAndUpdate,
};
