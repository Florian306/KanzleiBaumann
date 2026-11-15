/**
 * Cloudflare Pages Function: /api/interna
 * Stores settings in `settings` and structured records in `invoices`, `appointments`, `todos`.
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function ensureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_no TEXT,
    client TEXT,
    client_phone TEXT,
    client_address TEXT,
    case_ref TEXT,
    amount REAL,
    status TEXT,
    due_days INTEGER,
    due_date TEXT,
    date TEXT,
    data TEXT
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    type TEXT,
    data TEXT
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    text TEXT,
    done INTEGER,
    priority TEXT,
    data TEXT
  )`).run();
}

async function saveInvoices(db, list) {
  await db.prepare('DELETE FROM invoices').run();
  for (const item of (list || [])) {
    await db.prepare(
      `INSERT INTO invoices (id, invoice_no, client, client_phone, client_address, case_ref, amount, status, due_days, due_date, date, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      item.id || '',
      item.invoiceNo || '',
      item.client || '',
      item.clientPhone || '',
      item.clientAddress || '',
      item.caseRef || '',
      Number(item.amount) || 0,
      item.status || 'Offen',
      item.dueDays ?? 14,
      item.dueDate || '',
      item.date || '',
      JSON.stringify(item)
    ).run();
  }
}

async function saveAppointments(db, list) {
  await db.prepare('DELETE FROM appointments').run();
  for (const item of (list || [])) {
    await db.prepare(
      `INSERT INTO appointments (id, title, date, time, type, data) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(item.id || '', item.title || '', item.date || '', item.time || '', item.type || '', JSON.stringify(item)).run();
  }
}

async function saveTodos(db, list) {
  await db.prepare('DELETE FROM todos').run();
  for (const item of (list || [])) {
    await db.prepare(
      `INSERT INTO todos (id, text, done, priority, data) VALUES (?, ?, ?, ?, ?)`
    ).bind(item.id || '', item.text || '', item.done ? 1 : 0, item.priority || '', JSON.stringify(item)).run();
  }
}

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);

  await ensureTables(env.DB);
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();

  const data = {};
  (results || []).forEach(r => {
    try { data[r.key] = JSON.parse(r.value); }
    catch { data[r.key] = r.value; }
  });

  const { results: invRows } = await env.DB.prepare('SELECT data FROM invoices').all();
  if (invRows && invRows.length > 0) {
    data.finances = invRows.map(r => JSON.parse(r.data));
  } else if (Array.isArray(data.finances) && data.finances.length > 0) {
    await saveInvoices(env.DB, data.finances);
    await env.DB.prepare("DELETE FROM settings WHERE key = 'finances'").run();
  }

  const { results: apptRows } = await env.DB.prepare('SELECT data FROM appointments').all();
  if (apptRows && apptRows.length > 0) {
    data.appointments = apptRows.map(r => JSON.parse(r.data));
  } else if (Array.isArray(data.appointments) && data.appointments.length > 0) {
    await saveAppointments(env.DB, data.appointments);
    await env.DB.prepare("DELETE FROM settings WHERE key = 'appointments'").run();
  }

  const { results: todoRows } = await env.DB.prepare('SELECT data FROM todos').all();
  if (todoRows && todoRows.length > 0) {
    data.todos = todoRows.map(r => JSON.parse(r.data));
  } else if (Array.isArray(data.todos) && data.todos.length > 0) {
    await saveTodos(env.DB, data.todos);
    await env.DB.prepare("DELETE FROM settings WHERE key = 'todos'").run();
  }

  return jsonResponse({ data });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);

  await ensureTables(env.DB);
  const { key, value } = await request.json();
  if (!key) return jsonResponse({ error: 'key required' }, 400);

  if (key === 'finances') {
    await saveInvoices(env.DB, Array.isArray(value) ? value : []);
    await env.DB.prepare("DELETE FROM settings WHERE key = 'finances'").run();
    return jsonResponse({ ok: true });
  }
  if (key === 'appointments') {
    await saveAppointments(env.DB, Array.isArray(value) ? value : []);
    await env.DB.prepare("DELETE FROM settings WHERE key = 'appointments'").run();
    return jsonResponse({ ok: true });
  }
  if (key === 'todos') {
    await saveTodos(env.DB, Array.isArray(value) ? value : []);
    await env.DB.prepare("DELETE FROM settings WHERE key = 'todos'").run();
    return jsonResponse({ ok: true });
  }

  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, strVal).run();
  return jsonResponse({ ok: true });
}
