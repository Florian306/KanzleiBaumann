/**
 * Cloudflare Pages Function: /api/files
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);
  const url = new URL(request.url);
  const caseId = url.searchParams.get('caseId');
  const id = url.searchParams.get('id');

  if (id) {
    const file = await env.DB.prepare('SELECT * FROM files WHERE id = ?').bind(id).first();
    return jsonResponse({ file: file || null });
  }
  if (caseId) {
    const { results } = await env.DB.prepare('SELECT * FROM files WHERE caseId = ?').bind(caseId).all();
    return jsonResponse({ files: results || [] });
  }
  return jsonResponse({ files: [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);
  const f = await request.json();

  await env.DB.prepare(`
    INSERT OR REPLACE INTO files (id, caseId, name, type, category, size, data, uploadedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    f.id, f.caseId, f.name || '', f.type || '', f.category || 'document',
    f.size || 0, f.data || '', f.uploadedAt || new Date().toISOString()
  ).run();

  return jsonResponse({ ok: true, id: f.id });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return jsonResponse({ error: 'D1 Binding "DB" fehlt' }, 503);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'id required' }, 400);

  await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}
