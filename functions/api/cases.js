/**
 * Cloudflare Pages Function: /api/cases
 * Auto-initializes D1 tables on first request.
 */

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      az TEXT NOT NULL,
      clientName TEXT,
      clientPhone TEXT,
      opponent TEXT,
      caseType TEXT,
      status TEXT,
      incidentDate TEXT,
      description TEXT,
      demands TEXT,
      notes TEXT,
      witnesses TEXT,
      schriftsatz TEXT,
      securityLevel TEXT,
      deadlineTimestamp INTEGER,
      markers TEXT,
      feeGrundgebuehr REAL,
      feeVerfahrensgebuehr REAL,
      feeTerminsgebuehr REAL,
      createdAt TEXT,
      filesCount INTEGER DEFAULT 0,
      pleadingsHistory TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      caseId TEXT NOT NULL,
      name TEXT,
      type TEXT,
      category TEXT,
      size INTEGER,
      data TEXT,
      uploadedAt TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`)
  ]);
  try {
    await db.prepare('ALTER TABLE cases ADD COLUMN pleadingsHistory TEXT').run();
  } catch {}
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);
  await ensureSchema(env.DB);

  const { results } = await env.DB.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
  const cases = (results || []).map(row => ({
    ...row,
    markers: row.markers ? JSON.parse(row.markers) : [],
    pleadingsHistory: row.pleadingsHistory ? JSON.parse(row.pleadingsHistory) : []
  }));
  return jsonResponse({ cases });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);
  await ensureSchema(env.DB);

  const c = await request.json();
  await env.DB.prepare(`
    INSERT OR REPLACE INTO cases (
      id, az, clientName, clientPhone, opponent, caseType, status,
      incidentDate, description, demands, notes, witnesses, schriftsatz,
      securityLevel, deadlineTimestamp, markers,
      feeGrundgebuehr, feeVerfahrensgebuehr, feeTerminsgebuehr,
      createdAt, filesCount, pleadingsHistory
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    c.id, c.az, c.clientName || '', c.clientPhone || '', c.opponent || '',
    c.caseType || '', c.status || 'Eingereicht', c.incidentDate || '',
    c.description || '', c.demands || '', c.notes || '', c.witnesses || '',
    c.schriftsatz || '', c.securityLevel || 'normal', c.deadlineTimestamp || null,
    JSON.stringify(c.markers || []),
    c.feeGrundgebuehr || 0, c.feeVerfahrensgebuehr || 0, c.feeTerminsgebuehr || 0,
    c.createdAt || new Date().toISOString(), c.filesCount || 0,
    JSON.stringify(c.pleadingsHistory || [])
  ).run();
    c.feeGrundgebuehr || 0, c.feeVerfahrensgebuehr || 0, c.feeTerminsgebuehr || 0,
    c.createdAt || new Date().toISOString(), c.filesCount || 0
  ).run();

  return jsonResponse({ ok: true, id: c.id });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);
  await ensureSchema(env.DB);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);

  if (id === 'ALL') {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM files'),
      env.DB.prepare('DELETE FROM cases')
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM files WHERE caseId = ?').bind(id),
      env.DB.prepare('DELETE FROM cases WHERE id = ?').bind(id)
    ]);
  }
  return jsonResponse({ ok: true });
}
