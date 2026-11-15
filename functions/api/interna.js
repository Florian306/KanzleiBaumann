/**
 * Cloudflare Pages Function: /api/interna
 * Stores fees, liveStatus, webhook, appointments, finances, todos in D1 settings table.
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();

  const data = {};
  (results || []).forEach(r => {
    try { data[r.key] = JSON.parse(r.value); }
    catch { data[r.key] = r.value; }
  });
  return jsonResponse({ data });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
  const { key, value } = await request.json();
  if (!key) return jsonResponse({ error: 'key required' }, 400);

  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(key, strVal).run();
  return jsonResponse({ ok: true });
}
