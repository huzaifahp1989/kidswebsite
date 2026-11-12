import crypto from 'node:crypto';
import { supabaseAdmin } from '../src/utils/supabase-admin.js';
import { toCsv } from '../src/utils/survey.js';
import {
  APP_USER_CSV_HEADERS,
  buildAppUserRow,
  validateAppUserInput,
} from '../src/utils/appUsers.js';

const SETUP_NOT_CONFIGURED_MSG =
  'App user profiles table is not configured yet. Apply supabase/create-app-user-profiles.sql in the Supabase SQL editor.';

const ADMIN_LIST_LIMIT = 5000;
const EXPORT_LIMIT = 20000;
const IP_SALT = process.env.APP_USERS_IP_SALT || 'imc-app-users-ip-salt';

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
  return request.headers['x-admin-auth'] === 'true';
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = (raw ? String(raw).split(',')[0] : '') || req.socket?.remoteAddress || '';
  return ip.trim();
}

/** Salted, non-reversible IP hash used only for abuse investigation. */
function hashIp(ip) {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${IP_SALT}:${day}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * "Get to know our users" form:
 *   POST /api/app-users              → submit a profile (public)
 *   GET  /api/admin/app-users        → all profiles (admin)
 *   GET  /api/admin/app-users/export → CSV download (admin)
 */
export async function handleAppUsersRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-auth');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '');

  try {
    if (path === '/api/app-users') {
      if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }

      const body = await readBody(req);
      const invalid = validateAppUserInput(body);
      if (invalid) return json(res, 400, { error: invalid });

      const { data, error } = await supabaseAdmin
        .from('app_user_profiles')
        .insert(
          buildAppUserRow(body, {
            ipHash: hashIp(clientIp(req)),
            userAgent: req.headers['user-agent'],
          }),
        )
        .select('id,created_at')
        .single();

      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }
      json(res, 200, { ok: true, id: data.id, submittedAt: data.created_at });
      return;
    }

    if (path === '/api/admin/app-users') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }

      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        const all = url.searchParams.get('all') === 'true';
        if (!id && !all) return json(res, 400, { error: 'id is required' });
        const query = supabaseAdmin.from('app_user_profiles').delete();
        const { error } = all ? await query.neq('id', '00000000-0000-0000-0000-000000000000') : await query.eq('id', id);
        if (error) {
          if (isTableMissing(error)) return setupNotConfiguredError(res);
          throw error;
        }
        json(res, 200, { success: true, id: id || null, all });
        return;
      }

      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }

      const { data, error } = await supabaseAdmin
        .from('app_user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(ADMIN_LIST_LIMIT);

      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }

      const profiles = data || [];
      const cities = new Set(profiles.map((p) => (p.city || '').trim()).filter(Boolean));
      const ages = profiles.map((p) => Number(p.age)).filter((n) => Number.isFinite(n));

      json(res, 200, {
        profiles,
        stats: {
          total: profiles.length,
          cities: cities.size,
          averageAge: ages.length
            ? Math.round((ages.reduce((sum, n) => sum + n, 0) / ages.length) * 10) / 10
            : null,
        },
      });
      return;
    }

    if (path === '/api/admin/app-users/export') {
      if (!checkAdminAuth(req)) { json(res, 401, { error: 'Unauthorized' }); return; }
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return; }

      const { data, error } = await supabaseAdmin
        .from('app_user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(EXPORT_LIMIT);

      if (error) {
        if (isTableMissing(error)) return setupNotConfiguredError(res);
        throw error;
      }

      const csv = toCsv(APP_USER_CSV_HEADERS, data || []);
      const filename = `imc-app-users-${new Date().toISOString().slice(0, 10)}.csv`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.end(csv);
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    const message = (err instanceof Error ? err.message : err && err.message) || 'Server error';
    json(res, 500, { error: message });
  }
}

export default handleAppUsersRequest;
