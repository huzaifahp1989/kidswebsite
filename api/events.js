import { supabaseAdmin } from '../src/utils/supabase-admin.js';
import { buildEventRow, validateEventInput } from '../src/utils/events.js';

const SETUP_NOT_CONFIGURED_MSG =
  'Events table is not configured yet. Apply supabase/create-events.sql in the Supabase SQL editor.';

const PUBLIC_EVENT_LIMIT = 10;
const ADMIN_LIMIT = 200;
const NOTICE_SCAN_LIMIT = 20;
const PUBLIC_NOTICE_LIMIT = 5;
const IN_PROGRESS_GRACE_MS = 3 * 60 * 60 * 1000;

// The get-to-know-you prompt already pops up on its own, so its notice is kept
// out of the ticker to avoid asking users the same thing twice.
const SUPPRESSED_NOTICE_URL_PATTERN = /get-to-know-you/i;

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

function setupNotConfiguredError(res, additional = {}) {
  return json(res, 500, {
    error: SETUP_NOT_CONFIGURED_MSG,
    setupRequired: true,
    ...additional,
  });
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
 * Reads the current live notices for the public strip. Deliberately read-only:
 * it never touches `global_notice_views`, so loading any page cannot mark
 * notices as read and silently zero out the header bell's unread badge.
 */
async function fetchPublicNotices() {
  const { data, error } = await supabaseAdmin
    .from('global_notices')
    .select('id,title,body,url,icon,priority,publish_at,expire_at,created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(NOTICE_SCAN_LIMIT);

  if (error) return [];

  const now = Date.now();
  return (data || [])
    .filter((row) => {
      if (row.publish_at && new Date(row.publish_at).getTime() > now) return false;
      if (row.expire_at && new Date(row.expire_at).getTime() <= now) return false;
      if (row.url && SUPPRESSED_NOTICE_URL_PATTERN.test(row.url)) return false;
      return true;
    })
    .slice(0, PUBLIC_NOTICE_LIMIT)
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      url: row.url || null,
      icon: row.icon || null,
      priority: row.priority || 'normal',
      created_at: row.created_at,
    }));
}

/**
 * Serves the site-wide "Latest updates" feed plus the events admin CRUD:
 *   GET    /api/events        → { events, notices } (public)
 *   GET    /api/admin/events  → all events (admin)
 *   POST   /api/admin/events  → create (admin)
 *   PUT    /api/admin/events  → update (admin)
 *   DELETE /api/admin/events  → delete (admin)
 */
export async function handleEventsRequest(req, res) {
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
    if (path === '/api/events') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }

      // Notices are optional: a failure here must not blank the events list,
      // because the strip is mounted on every page.
      const notices = await fetchPublicNotices().catch(() => []);

      const cutoff = new Date(Date.now() - IN_PROGRESS_GRACE_MS).toISOString();
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('id,title,description,starts_at,ends_at,location,link_url')
        .eq('active', true)
        .gte('starts_at', cutoff)
        .order('starts_at', { ascending: true })
        .limit(PUBLIC_EVENT_LIMIT);
      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res, { notices });
        throw error;
      }
      json(res, 200, { events: data || [], notices });
      return;
    }

    if (path === '/api/admin/events') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }

      if (req.method === 'GET') {
        const { data, error } = await supabaseAdmin
          .from('events')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('starts_at', { ascending: true })
          .limit(ADMIN_LIMIT);
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { events: data || [] });
        return;
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        const invalid = validateEventInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const { data, error } = await supabaseAdmin
          .from('events')
          .insert(buildEventRow(body))
          .select()
          .single();
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { event: data });
        return;
      }

      if (req.method === 'PUT') {
        const body = await readBody(req);
        const id = typeof body?.id === 'string' ? body.id : '';
        if (!id) return json(res, 400, { error: 'id is required' });
        const invalid = validateEventInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const { data, error } = await supabaseAdmin
          .from('events')
          .update(buildEventRow(body))
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { event: data });
        return;
      }

      if (req.method === 'DELETE') {
        let id = url.searchParams.get('id');
        if (!id) {
          const body = await readBody(req).catch(() => ({}));
          id = typeof body?.id === 'string' ? body.id : '';
        }
        if (!id) return json(res, 400, { error: 'id is required' });
        const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
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

export default handleEventsRequest;
