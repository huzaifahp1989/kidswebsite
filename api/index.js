import { handleOneSignalAdminRequest } from './onesignal.js';
import { handleGlobalNoticesRequest } from './global-notices.js';

function cors(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (pathname.startsWith('/api/onesignal')) {
    try {
      await handleOneSignalAdminRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  if (
    pathname.startsWith('/api/me/notices') ||
    pathname.startsWith('/api/admin/notices')
  ) {
    try {
      await handleGlobalNoticesRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
}
