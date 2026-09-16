import { handleOneSignalAdminRequest } from './api/onesignal.js';
import { handleGlobalNoticesRequest } from './api/global-notices.js';

/**
 * Vite dev middleware so /api/onesignal, /api/me/notices and /api/admin/notices
 * work during `npm run dev`. On Vercel, vercel.json rewrites to /api/index.js.
 */
export function oneSignalApiPlugin() {
  return {
    name: 'onesignal-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/onesignal')) {
          try {
            await handleOneSignalAdminRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        if (
          url.startsWith('/api/me/notices') ||
          url.startsWith('/api/admin/notices')
        ) {
          try {
            await handleGlobalNoticesRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        next();
      });
    },
  };
}
