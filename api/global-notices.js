import { supabaseAdmin } from '../src/utils/supabase-admin.js';
import { buildAdminNoticeRow, validateAdminNoticeInput } from '../src/utils/global-notices.js';

const SETUP_NOT_CONFIGURED_MSG =
  'Notices table is not configured yet. Apply migration 20260829_create_global_notices.sql.';

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
  return msg.includes('does not exist') || msg.includes('not found in the schema cache');
}

async function getAuthenticatedRequestUser(request) {
  const authHeader = request.headers.authorization || request.headers.Authorization || '';
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

async function fetchLiveNotices(limit) {
  const now = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from('global_notices')
    .select(
      `id,title,body,url,icon,priority,publish_at,expire_at,created_at,updated_at,
       global_notice_views(user_id,seen_at,read_at)`
    )
    .eq('active', true)
    .lte('publish_at', now)
    .or('expire_at.is.null,expire_at.gt.' + now)
    .order('publish_at', { ascending: false })
    .limit(limit);
  return { rows, error };
}

function mapRowsToNotices(rows, userId) {
  return (rows || []).map((r) => {
    const views = Array.isArray(r.global_notice_views) ? r.global_notice_views : [];
    const mine = userId ? views.find((v) => v.user_id === userId) : undefined;
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      url: r.url || null,
      icon: r.icon || '🔔',
      priority: r.priority || 'normal',
      publishAt: r.publish_at,
      expireAt: r.expire_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      seenAt: mine?.seen_at || null,
      readAt: mine?.read_at || null,
      isSeen: Boolean(mine?.seen_at),
      isRead: Boolean(mine?.read_at),
    };
  });
}

function summarize(notices) {
  const total = notices.length;
  let unread_count = 0;
  let unseen_count = 0;
  let urgent_unread_count = 0;
  for (const n of notices) {
    if (!n.isSeen) unseen_count += 1;
    if (!n.isRead) {
      unread_count += 1;
      if (n.priority === 'urgent') urgent_unread_count += 1;
    }
  }
  return { total, unread_count, unseen_count, urgent_unread_count, notices };
}

function checkAdminAuth(request) {
  const header = request.headers['x-admin-auth'];
  return header === 'true';
}

export async function handleGlobalNoticesRequest(req, res) {
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
    if (path === '/api/me/notices') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }
      const user = await getAuthenticatedRequestUser(req);
      const limitRaw = url.searchParams.get('limit');
      const limit = Number.isFinite(Number(limitRaw))
        ? Math.max(1, Math.min(100, Math.floor(Number(limitRaw))))
        : 25;
      const userId = user?.id ?? null;

      const { rows, error } = await fetchLiveNotices(limit);
      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }
      const notices = mapRowsToNotices(rows, userId);
      json(res, 200, summarize(notices));
      return;
    }

    const seenMatch = path.match(/^\/api\/me\/notices\/([^/]+)\/seen$/);
    if (seenMatch) {
      if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }
      const user = await getAuthenticatedRequestUser(req);
      const noticeId = decodeURIComponent(seenMatch[1]);
      if (!noticeId) { json(res, 400, { error: 'noticeId is required' }); return; }
      if (!user) { json(res, 200, { ok: true, noticeId, guest: true }); return; }
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from('global_notice_views')
        .upsert(
          { notice_id: noticeId, user_id: user.id, seen_at: now },
          { onConflict: 'notice_id,user_id', ignoreDuplicates: false }
        );
      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }
      json(res, 200, { ok: true, noticeId });
      return;
    }

    const readMatch = path.match(/^\/api\/me\/notices\/([^/]+)\/read$/);
    if (readMatch) {
      if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }
      const user = await getAuthenticatedRequestUser(req);
      const noticeId = decodeURIComponent(readMatch[1]);
      if (!noticeId) { json(res, 400, { error: 'noticeId is required' }); return; }
      if (!user) { json(res, 200, { ok: true, noticeId, guest: true }); return; }
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from('global_notice_views')
        .upsert(
          { notice_id: noticeId, user_id: user.id, read_at: now, seen_at: now },
          { onConflict: 'notice_id,user_id' }
        );
      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }
      json(res, 200, { ok: true, noticeId });
      return;
    }

    if (path === '/api/me/notices/read-all') {
      if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }
      const user = await getAuthenticatedRequestUser(req);
      const now = new Date().toISOString();
      const { data: idsData, error: idsError } = await supabaseAdmin
        .from('global_notices')
        .select('id')
        .eq('active', true)
        .lte('publish_at', now)
        .or('expire_at.is.null,expire_at.gt.' + now);
      if (idsError) {
        if (isTableMissing(idsError)) return setupNotConfiguredError(res);
        throw idsError;
      }
      const ids = (idsData || []).map((r) => r.id);
      if (ids.length === 0) { json(res, 200, { ok: true, marked: 0 }); return; }
      if (!user) { json(res, 200, { ok: true, marked: ids.length, guest: true }); return; }
      const rows = ids.map((id) => ({ notice_id: id, user_id: user.id, seen_at: now, read_at: now }));
      const { error } = await supabaseAdmin
        .from('global_notice_views')
        .upsert(rows, { onConflict: 'notice_id,user_id', ignoreDuplicates: false });
      if (error) throw error;
      json(res, 200, { ok: true, marked: ids.length });
      return;
    }

    if (path === '/api/admin/notices') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }
      if (req.method === 'GET') {
        const limitRaw = url.searchParams.get('limit');
        const limit = Number.isFinite(Number(limitRaw))
          ? Math.max(1, Math.min(500, Math.floor(Number(limitRaw))))
          : 200;
        const { data, error } = await supabaseAdmin
          .from('global_notices')
          .select('*')
          .order('publish_at', { ascending: false })
          .limit(limit);
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { notices: data || [] });
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        const invalid = validateAdminNoticeInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const row = buildAdminNoticeRow(body);
        const { data, error } = await supabaseAdmin
          .from('global_notices')
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        json(res, 200, { notice: data });
        return;
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        const id = typeof body?.id === 'string' ? body.id : '';
        if (!id) return json(res, 400, { error: 'id is required' });
        const invalid = validateAdminNoticeInput(body);
        if (invalid) return json(res, 400, { error: invalid });
        const update = buildAdminNoticeRow(body);
        const { data, error } = await supabaseAdmin
          .from('global_notices')
          .update(update)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        json(res, 200, { notice: data });
        return;
      }
      if (req.method === 'DELETE') {
        let id = url.searchParams.get('id');
        if (!id) {
          const body = await readBody(req).catch(() => ({}));
          id = typeof body?.id === 'string' ? body.id : '';
        }
        if (!id) return json(res, 400, { error: 'id is required' });
        const { error } = await supabaseAdmin.from('global_notices').delete().eq('id', id);
        if (error) throw error;
        json(res, 200, { success: true, id });
        return;
      }
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    if (path === '/api/admin/notices/setup') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }
      const existsNow = await (async () => {
        try {
          const { error } = await supabaseAdmin
            .from('global_notices')
            .select('id', { count: 'exact', head: true })
            .limit(1);
          if (!error) return true;
          const msg = String(error.message || '');
          if (msg.includes('does not exist') || msg.includes('not found in the schema cache')) return false;
          return true;
        } catch {
          return true;
        }
      })();
      if (req.method === 'GET') {
        json(res, 200, { exists: existsNow });
        return;
      }
      if (req.method === 'POST') {
        json(res, 501, {
          error:
            'Automatic setup is not supported via middleware. Apply the migration SQL 20260829_create_global_notices.sql in Supabase SQL editor directly.',
          setupRequired: true,
        });
        return;
      }
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    json(res, 500, { error: message });
  }
}

export default handleGlobalNoticesRequest;
