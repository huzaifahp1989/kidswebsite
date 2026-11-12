import { handleOneSignalAdminRequest } from './api/onesignal.js';
import { handleGlobalNoticesRequest } from './api/global-notices.js';
import { handleActivityRemindersRequest } from './api/activity-reminders.js';
import { handleIslamicRemindersRequest } from './api/islamic-reminders.js';
import { handleMarqueeRequest } from './api/marquee.js';
import { handleEventsRequest } from './api/events.js';
import { handleSurveyRequest } from './api/survey.js';
import { handleAppUsersRequest } from './api/app-users.js';

/**
 * Vite dev middleware so app APIs work during `npm run dev`. On Vercel,
 * vercel.json rewrites these paths to /api/index.js.
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
        if (url.startsWith('/api/reminders')) {
          try {
            await handleActivityRemindersRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        if (url.startsWith('/api/islamic-reminders')) {
          try {
            await handleIslamicRemindersRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        if (url.startsWith('/api/admin/marquee') || url.startsWith('/api/marquee')) {
          try {
            await handleMarqueeRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        if (url.startsWith('/api/admin/events') || url.startsWith('/api/events')) {
          try {
            await handleEventsRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        if (
          url.startsWith('/api/admin/survey') ||
          url.startsWith('/api/survey')
        ) {
          try {
            await handleSurveyRequest(req, res);
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Server error' }));
          }
          return;
        }
        if (
          url.startsWith('/api/admin/app-users') ||
          url.startsWith('/api/app-users')
        ) {
          try {
            await handleAppUsersRequest(req, res);
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
