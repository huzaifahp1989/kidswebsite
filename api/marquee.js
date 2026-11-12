import { supabaseAdmin } from '../src/utils/supabase-admin.js';
import { buildMarqueeRow, validateMarqueeInput } from '../src/utils/marquee.js';

const SETUP_NOT_CONFIGURED_MSG =
  'Marquee table is not configured yet. Apply supabase/create-marquee-messages.sql in the Supabase SQL editor.';

const PUBLIC_LIMIT = 20;
const ADMIN_LIMIT = 200;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    if (typeof req.body === 'string' && req.body) {
      try { resolve(JSON.parse(req.body)); } catch (e) { reject(e); }
      return;
    }
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) { resolve({}); return; }
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function setupNotConfiguredError(res) {
  return json(res, 500, { error: SETUP_NOT_CONFIGURED_MSG, setupRequired: true });
}

function isTableMissing(err) {
  const msg = String((err && err.message) || '');
  return (
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

function checkAdminAuth(request) {
  const header = request.headers['x-admin-auth'];
  return header === 'true';
}

/**
 * Serves the animated top banner plus its admin CRUD:
 *   GET    /api/marquee        → active messages (public)
 *   GET    /api/admin/marquee  → all messages (admin)
 *   POST   /api/admin/marquee  → create (admin)
 *   PUT    /api/admin/marquee  → update (admin)
 *   DELETE /api/admin/marquee  → delete (admin)
 */
export async function handleMarqueeRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-auth');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const rawUrl = req.url || '/';
  const url = new URL(rawUrl, 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '');

  try {
    if (path === '/api/marquee') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }
      const { data, error } = await supabaseAdmin
        .from('marquee_messages')
        .select('id,message,link_url,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(PUBLIC_LIMIT);
      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }
      json(res, 200, { messages: data || [] });
      return;
    }

    if (path === '/api/admin/marquee') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }

      if (req.method === 'GET') {
        const { data, error } = await supabaseAdmin
          .from('marquee_messages')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(ADMIN_LIMIT);
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { messages: data || [] });
        return;
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        const invalid = validateMarqueeInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const { data, error } = await supabaseAdmin
          .from('marquee_messages')
          .insert(buildMarqueeRow(body))
          .select()
          .single();
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { message: data });
        return;
      }

      if (req.method === 'PUT') {
        const body = await readBody(req);
        const id = typeof body?.id === 'string' ? body.id : '';
        if (!id) return json(res, 400, { error: 'id is required' });
        const invalid = validateMarqueeInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const { data, error } = await supabaseAdmin
          .from('marquee_messages')
          .update(buildMarqueeRow(body))
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { message: data });
        return;
      }

      if (req.method === 'DELETE') {
        let id = url.searchParams.get('id');
        if (!id) {
          const body = await readBody(req).catch(() => ({}));
          id = typeof body?.id === 'string' ? body.id : '';
        }
        if (!id) return json(res, 400, { error: 'id is required' });
        const { error } = await supabaseAdmin.from('marquee_messages').delete().eq('id', id);
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { success: true, id });
        return;
      }

      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    const message =
      (err instanceof Error ? err.message : err && err.message) || 'Server error';
    json(res, 500, { error: message });
  }
}

export default handleMarqueeRequest;
