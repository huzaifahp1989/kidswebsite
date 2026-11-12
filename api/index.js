import { handleOneSignalAdminRequest } from './onesignal.js';
import { handleGlobalNoticesRequest } from './global-notices.js';
import { handleActivityRemindersRequest } from './activity-reminders.js';
import { handleIslamicRemindersRequest } from './islamic-reminders.js';
import { handleMarqueeRequest } from './marquee.js';
import { handleEventsRequest } from './events.js';
import { handleSurveyRequest } from './survey.js';
import { handleAppUsersRequest } from './app-users.js';

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

  if (pathname.startsWith('/api/reminders')) {
    try {
      await handleActivityRemindersRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  if (pathname.startsWith('/api/islamic-reminders')) {
    try {
      await handleIslamicRemindersRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  if (pathname.startsWith('/api/admin/marquee') || pathname.startsWith('/api/marquee')) {
    try {
      await handleMarqueeRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  if (pathname.startsWith('/api/admin/events') || pathname.startsWith('/api/events')) {
    try {
      await handleEventsRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  if (pathname.startsWith('/api/admin/survey') || pathname.startsWith('/api/survey')) {
    try {
      await handleSurveyRequest(req, res);
      return;
    } catch (err) {
      cors(res, 500, { error: err?.message || 'Server error' });
      return;
    }
  }

  if (pathname.startsWith('/api/admin/app-users') || pathname.startsWith('/api/app-users')) {
    try {
      await handleAppUsersRequest(req, res);
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
