/**
 * Shared OneSignal admin API handler.
 * Used by Vercel `/api/onesignal` and the Vite dev middleware.
 */

const DEFAULT_APP_ID = 'daf8fc36-781a-417d-8ee4-5078635f22e7';
const ONESIGNAL_API = 'https://api.onesignal.com';

function getEnv(name, fallback = '') {
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return String(process.env[name]).trim();
  }
  return fallback;
}

function getConfig() {
  return {
    appId: getEnv('ONESIGNAL_APP_ID') || getEnv('VITE_ONESIGNAL_APP_ID') || DEFAULT_APP_ID,
    restApiKey: getEnv('ONESIGNAL_REST_API_KEY') || getEnv('VITE_ONESIGNAL_REST_API_KEY'),
    adminEmail: (
      getEnv('ADMIN_EMAIL') ||
      getEnv('VITE_ADMIN_EMAIL') ||
      ''
    ).toLowerCase(),
    supabaseUrl: getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL'),
    supabaseAnonKey: getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY'),
  };
}

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
      try {
        resolve(JSON.parse(req.body));
      } catch (error) {
        reject(error);
      }
      return;
    }

    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function requireAdmin(req) {
  const config = getConfig();
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false, status: 401, error: 'Missing auth token. Sign in as admin first.' };
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { ok: false, status: 500, error: 'Supabase is not configured on the server.' };
  }

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: config.supabaseAnonKey,
    },
  });

  if (!response.ok) {
    return { ok: false, status: 401, error: 'Invalid or expired admin session.' };
  }

  const user = await response.json();
  const email = String(user?.email || '').toLowerCase();
  if (config.adminEmail && email !== config.adminEmail) {
    return { ok: false, status: 403, error: 'Not authorized to send notifications.' };
  }

  return { ok: true, user };
}

async function onesignalFetch(path, { method = 'GET', body } = {}) {
  const config = getConfig();
  if (!config.restApiKey) {
    const error = new Error(
      'ONESIGNAL_REST_API_KEY is not set. Add it in Vercel env vars (and .env for local).'
    );
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${ONESIGNAL_API}${path}`, {
    method,
    headers: {
      Authorization: `Key ${config.restApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.errors?.[0] ||
      data?.error ||
      data?.message ||
      `OneSignal request failed (${response.status})`;
    const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function buildNotificationPayload(input = {}) {
  const config = getConfig();
  const title = String(input.title || '').trim();
  const message = String(input.message || input.body || '').trim();

  if (!title) throw Object.assign(new Error('Title is required.'), { status: 400 });
  if (!message) throw Object.assign(new Error('Message is required.'), { status: 400 });

  const payload = {
    app_id: config.appId,
    target_channel: 'push',
    included_segments: Array.isArray(input.segments) && input.segments.length
      ? input.segments
      : ['All'],
    headings: { en: title },
    contents: { en: message },
  };

  const url = String(input.url || '').trim();
  if (url) payload.url = url;

  const imageUrl = String(input.imageUrl || '').trim();
  if (imageUrl) {
    payload.chrome_web_image = imageUrl;
    payload.firefox_icon = imageUrl;
    payload.big_picture = imageUrl;
    payload.huawei_big_picture = imageUrl;
    payload.adm_big_picture = imageUrl;
    payload.chrome_big_picture = imageUrl;
  }

  if (input.sendAfter) {
    const date = new Date(input.sendAfter);
    if (Number.isNaN(date.getTime())) {
      throw Object.assign(new Error('Invalid schedule date/time.'), { status: 400 });
    }
    if (date.getTime() <= Date.now() + 30_000) {
      throw Object.assign(new Error('Schedule time must be at least 30 seconds in the future.'), {
        status: 400,
      });
    }
    payload.send_after = date.toISOString();
  }

  if (input.delayedOption === 'timezone' || input.delayedOption === 'last-active') {
    payload.delayed_option = input.delayedOption;
    payload.throttle_rate_per_minute = 0;
    if (input.delayedOption === 'timezone' && input.deliveryTimeOfDay) {
      payload.delivery_time_of_day = String(input.deliveryTimeOfDay);
    }
  }

  return payload;
}

export async function handleOneSignalAdminRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      json(res, auth.status, { error: auth.error });
      return;
    }

    const config = getConfig();
    const url = new URL(req.url || '/', 'http://localhost');
    const action = url.searchParams.get('action') || '';

    if (req.method === 'GET') {
      if (action === 'status') {
        json(res, 200, {
          configured: Boolean(config.restApiKey),
          appId: config.appId,
          adminEmail: config.adminEmail || null,
        });
        return;
      }

      const limit = Math.min(Number(url.searchParams.get('limit') || 25), 50);
      const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
      const data = await onesignalFetch(
        `/notifications?app_id=${encodeURIComponent(config.appId)}&limit=${limit}&offset=${offset}`
      );
      json(res, 200, {
        notifications: data.notifications || [],
        total_count: data.total_count ?? (data.notifications || []).length,
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const payload = buildNotificationPayload(body);
      const data = await onesignalFetch('/notifications', { method: 'POST', body: payload });
      json(res, 200, {
        id: data.id,
        recipients: data.recipients,
        external_id: data.external_id,
        scheduled: Boolean(payload.send_after),
        send_after: payload.send_after || null,
        raw: data,
      });
      return;
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      if (!id) {
        json(res, 400, { error: 'Notification id is required.' });
        return;
      }
      const data = await onesignalFetch(
        `/notifications/${encodeURIComponent(id)}?app_id=${encodeURIComponent(config.appId)}`,
        { method: 'DELETE' }
      );
      json(res, 200, { success: true, raw: data });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    json(res, error.status || 500, {
      error: error.message || 'Unexpected server error',
      details: error.data || undefined,
    });
  }
}

export default handleOneSignalAdminRequest;
