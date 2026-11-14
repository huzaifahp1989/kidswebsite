import { supabaseAdmin } from '../src/utils/supabase-admin.js';
import { buildRadioSlotRow, validateRadioSlotInput } from '../src/utils/radioSchedule.js';

const SETUP_NOT_CONFIGURED_MSG =
  'Radio schedule table is not configured yet. Apply supabase/create-radio-schedule.sql in the Supabase SQL editor.';

const PUBLIC_SLOT_LIMIT = 40;
const ADMIN_LIMIT = 200;
// A programme that started less than this ago is still worth showing, so the
// pop-up does not go blank the moment a slot begins.
const IN_PROGRESS_GRACE_MS = 30 * 60 * 1000;

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
 * Serves the public radio schedule pop-up plus the admin CRUD:
 *   GET    /api/radio-schedule        → upcoming slots (public)
 *   GET    /api/admin/radio-schedule  → all slots (admin)
 *   POST   /api/admin/radio-schedule  → create (admin)
 *   PUT    /api/admin/radio-schedule  → update (admin)
 *   DELETE /api/admin/radio-schedule  → delete (admin)
 */
export async function handleRadioScheduleRequest(req, res) {
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
    if (path === '/api/radio-schedule') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }

      const cutoff = new Date(Date.now() - IN_PROGRESS_GRACE_MS).toISOString();
      const { data, error } = await supabaseAdmin
        .from('radio_schedule')
        .select('id,title,presenter,description,starts_at,ends_at')
        .eq('active', true)
        .gte('starts_at', cutoff)
        .order('starts_at', { ascending: true })
        .limit(PUBLIC_SLOT_LIMIT);
      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }
      json(res, 200, { slots: data || [] });
      return;
    }

    if (path === '/api/admin/radio-schedule') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }

      if (req.method === 'GET') {
        const { data, error } = await supabaseAdmin
          .from('radio_schedule')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('starts_at', { ascending: true })
          .limit(ADMIN_LIMIT);
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { slots: data || [] });
        return;
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        const invalid = validateRadioSlotInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const { data, error } = await supabaseAdmin
          .from('radio_schedule')
          .insert(buildRadioSlotRow(body))
          .select()
          .single();
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { slot: data });
        return;
      }

      if (req.method === 'PUT') {
        const body = await readBody(req);
        const id = typeof body?.id === 'string' ? body.id : '';
        if (!id) return json(res, 400, { error: 'id is required' });
        const invalid = validateRadioSlotInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const { data, error } = await supabaseAdmin
          .from('radio_schedule')
          .update(buildRadioSlotRow(body))
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { slot: data });
        return;
      }

      if (req.method === 'DELETE') {
        let id = url.searchParams.get('id');
        if (!id) {
          const body = await readBody(req).catch(() => ({}));
          id = typeof body?.id === 'string' ? body.id : '';
        }
        if (!id) return json(res, 400, { error: 'id is required' });
        const { error } = await supabaseAdmin.from('radio_schedule').delete().eq('id', id);
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

export default handleRadioScheduleRequest;
