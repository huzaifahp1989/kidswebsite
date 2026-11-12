import OneSignal from 'react-onesignal';
import { toast } from 'sonner';
import {
  getAndroidPushId,
  isAndroidWebView,
  areAndroidNotificationsEnabled,
  requestAndroidNotifications,
  waitForAndroidNotifications,
  optInToAndroidPush,
} from './androidWebView';

const PROMPT_COOLDOWN_KEY = 'onesignal_prompt_shown_at';
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = import.meta.env.DEV ? 5 * 1000 : 90 * 1000;

let initPromise = null;
let initReady = false;
let webPushConfigured = true;
let clickHandlerAttached = false;
let foregroundHandlerAttached = false;

const DEFAULT_ONESIGNAL_APP_ID = '0bb81263-a5f5-4fd8-8786-d71f43a43725';

function getAppId() {
  return String(import.meta.env.VITE_ONESIGNAL_APP_ID || DEFAULT_ONESIGNAL_APP_ID).trim();
}

function isAlreadyInitializedError(error) {
  const message = String(error?.message || error || '');
  return /already initialized/i.test(message);
}

function isNotConfiguredForWebPushError(error) {
  const message = String(error?.message || error || '');
  return (
    /not configured for web push/i.test(message) ||
    /web push/i.test(message) ||
    /can only be used on/i.test(message) // origin restriction — SDK only works on the configured domain
  );
}

function isBrowserPushCapable() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function isOneSignalConfigured() {
  return Boolean(getAppId());
}

/**
 * Navigate to a same-origin path without forcing a full page reload. Uses the
 * History API + a manually dispatched popstate event so React Router's
 * BrowserRouter picks up the change. Falls back to location.href if needed.
 */
function spaNavigate(path) {
  if (!path) return;
  try {
    if (window.location.pathname + window.location.search + window.location.hash === path) {
      return; // already on this page — nothing to do
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    window.location.href = path;
  }
}

/**
 * Foreground notification handler. When a push arrives while the app is open,
 * OneSignal's default behaviour can display an in-app banner that triggers a
 * page reload/redirect. We prevent that default and show a non-blocking toast
 * instead.
 */
function attachForegroundHandler() {
  if (foregroundHandlerAttached) return;
  try {
    OneSignal.Notifications.addEventListener('foreground', (event) => {
      if (event?.preventDefault) {
        try { event.preventDefault(); } catch { /* ignore */ }
      }
      const n = event?.notification || {};
      const title = n.title || n.headings?.en || 'Notification';
      const body = n.body || n.contents?.en || '';
      toast(title, {
        description: body,
        action: n.url
          ? {
              label: 'Open',
              onClick: () => spaNavigate(new URL(n.url, window.location.origin).pathname),
            }
          : undefined,
      });
    });
    foregroundHandlerAttached = true;
  } catch (error) {
    console.warn('Could not attach OneSignal foreground handler:', error);
  }
}

/**
 * Deep-link click handler. OneSignal notifications carry a `url` (or
 * `launchURL`). Same-origin URLs are routed inside the SPA (no full reload);
 * external URLs open in a new tab.
 */
function attachNotificationClickHandler() {
  if (clickHandlerAttached) return;
  try {
    OneSignal.Notifications.addEventListener('click', (event) => {
      const url = event?.notification?.url || event?.notification?.launchURL || '';
      if (!url) return;
      try {
        const u = new URL(url, window.location.origin);
        if (u.origin === window.location.origin) {
          spaNavigate(u.pathname + u.search + u.hash);
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
    clickHandlerAttached = true;
  } catch (error) {
    console.warn('Could not attach OneSignal click handler:', error);
  }
}

export function initOneSignal() {
  const appId = getAppId();
  if (!appId) return Promise.resolve(false);
  if (initReady) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
      });
      initReady = true;
      webPushConfigured = true;
      attachNotificationClickHandler();
      attachForegroundHandler();
      return true;
    } catch (error) {
      if (isAlreadyInitializedError(error)) {
        initReady = true;
        webPushConfigured = true;
        attachNotificationClickHandler();
        attachForegroundHandler();
        return true;
      }
      // "App not configured for web push" means the OneSignal app doesn't have
      // a web platform set up. "Can only be used on" means the dashboard has
      // origin restriction enabled (e.g. only https://imediackids.com).
      // In both cases push won't work in this environment, but the SDK may
      // still be partially available. We don't reset initPromise — we just
      // remember push is disabled so we don't keep retrying.
      if (isNotConfiguredForWebPushError(error)) {
        console.warn('OneSignal: web push is not available in this environment. Native browser permission may still work for local testing.');
        webPushConfigured = false;
        initReady = true; // SDK is loaded, just can't do push
        return true;
      }
      console.warn('OneSignal init failed:', error);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Returns false if the OneSignal app is not configured for web push in the
 * OneSignal dashboard. In this case native browser permission can still be
 * granted, but push notifications cannot be delivered.
 */
export function isWebPushConfigured() {
  return webPushConfigured;
}

export async function syncOneSignalUser(user) {
  if (!(await initOneSignal())) return;

  try {
    // OneSignal.User.externalId is the currently logged-in external ID.
    // Only call login()/logout() when the identity actually changes, otherwise
    // OneSignal may re-register the service worker and force a page reload.
    const currentExternalId = OneSignal.User.externalId || null;
    const targetExternalId = user?.uid || null;

    if (targetExternalId) {
      if (currentExternalId !== targetExternalId) {
        await OneSignal.login(targetExternalId);
      }
      if (user.email) {
        OneSignal.User.addEmail(user.email);
      }
      OneSignal.User.addTag('platform', 'web');
    } else if (currentExternalId) {
      await OneSignal.logout();
    }
  } catch (error) {
    console.warn('OneSignal user sync failed:', error);
  }
}

export async function getPushNotificationStatus() {
  const capable = isBrowserPushCapable();
  const ready = await initOneSignal();

  if (!ready) {
    return {
      ready: false,
      capable,
      supported: capable,
      subscribed: capable && Notification.permission === 'granted',
      permission: capable ? Notification.permission : 'unsupported',
    };
  }

  // When the OneSignal app has no Web platform configured, the SDK's
  // permissionNative reports "default" even if the browser has granted
  // permission. In that case fall back to the native Notification API.
  if (!webPushConfigured) {
    return {
      ready: true,
      capable,
      supported: capable,
      subscribed: capable && Notification.permission === 'granted',
      permission: capable ? Notification.permission : 'unsupported',
    };
  }

  return {
    ready: true,
    capable,
    supported: OneSignal.Notifications.isPushSupported(),
    subscribed: Boolean(OneSignal.Notifications.permission),
    permission: OneSignal.Notifications.permissionNative || Notification.permission,
  };
}

export async function promptPushNotification(options = {}) {
  const { force = false, skipCooldown = false } = options;
  const ready = await initOneSignal();

  // If OneSignal isn't ready but the browser supports push, fall back to the
  // native browser permission request. This is the most reliable way to
  // trigger the permission dialog.
  if (!ready) {
    if (isBrowserPushCapable() && (force || Notification.permission === 'default')) {
      try {
        const permission = await Notification.requestPermission();
        return {
          ok: permission === 'granted',
          reason: permission === 'granted' ? 'native_granted' : 'native_denied',
        };
      } catch (error) {
        console.warn('Native notification permission failed:', error);
        return { ok: false, reason: 'native_error', error };
      }
    }
    console.warn('OneSignal not initialized');
    return { ok: false, reason: 'not_initialized' };
  }

  try {
    if (!OneSignal.Notifications.isPushSupported()) {
      return { ok: false, reason: 'not_supported' };
    }
    if (OneSignal.Notifications.permission && !force) {
      return { ok: false, reason: 'already_subscribed' };
    }

    if (!skipCooldown && !force) {
      const lastPrompt = parseInt(localStorage.getItem(PROMPT_COOLDOWN_KEY) || '0', 10);
      if (lastPrompt && Date.now() - lastPrompt < PROMPT_COOLDOWN_MS) {
        return { ok: false, reason: 'cooldown' };
      }
    }

    localStorage.setItem(PROMPT_COOLDOWN_KEY, String(Date.now()));

    // Request native browser permission FIRST — this is the most reliable way
    // to actually show the browser permission dialog. OneSignal's slidedown
    // can silently fail if the service worker / SDK isn't fully ready.
    let nativePermission = Notification.permission;
    if (nativePermission === 'default') {
      try {
        nativePermission = await Notification.requestPermission();
      } catch (e) {
        console.warn('Native Notification.requestPermission() failed:', e);
      }
    }

    // Then also ask OneSignal to register the subscription (if supported).
    // This is best-effort; the native permission above is what matters.
    try {
      if (typeof OneSignal.Slidedown?.promptPush === 'function') {
        await OneSignal.Slidedown.promptPush({ force: true });
      }
    } catch (e) {
      console.warn('OneSignal Slidedown.promptPush failed (non-fatal):', e);
    }

    const granted = OneSignal.Notifications.permission || nativePermission === 'granted';
    return {
      ok: granted,
      reason: granted ? 'granted' : 'denied',
    };
  } catch (error) {
    console.warn('OneSignal prompt failed:', error);
    return { ok: false, reason: 'error', error };
  }
}

export async function maybePromptPushPermission() {
  return promptPushNotification();
}

export function schedulePushPermissionPrompt() {
  if (!isOneSignalConfigured()) return () => {};

  const timer = window.setTimeout(() => {
    maybePromptPushPermission();
  }, PROMPT_DELAY_MS);

  return () => window.clearTimeout(timer);
}

export function resetPushPromptDismissal() {
  localStorage.removeItem(PROMPT_COOLDOWN_KEY);
  localStorage.removeItem('push_prompt_banner_dismissed_at');
}

export async function optInPushSubscription() {
  try {
    const ready = await initOneSignal();
    if (!ready) return false;
    if (!webPushConfigured) return false;
    if (typeof OneSignal.User?.PushSubscription?.optIn === 'function') {
      // Safety: optIn() can hang if the service worker registration fails.
      const result = await Promise.race([
        OneSignal.User.PushSubscription.optIn(),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 8000)),
      ]);
      if (result === 'timeout') {
        console.warn('OneSignal optIn timed out after 8s');
        return false;
      }
      return true;
    }
  } catch (error) {
    console.warn('OneSignal optIn failed:', error);
  }
  return false;
}

const DEVICE_ID_KEY = 'imedia_anon_device_id';

/**
 * A stable per-browser identifier used to store reminders for users who are not
 * signed in and whose OneSignal subscription is unavailable (e.g. on localhost,
 * where the OneSignal app restricts its origin). Persisted in localStorage.
 */
export function getLocalDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Synchronous reminder identity. Always returns a value — the native Android
 * subscription ID when present, otherwise the local device ID — so reminders
 * can be saved or tested immediately without waiting for OneSignal to
 * initialise (which can be slow or blocked by the origin restriction).
 */
export function getImmediateReminderIdentity() {
  return getAndroidPushId() || getLocalDeviceId();
}

/**
 * Identity used to store reminders without an account: the OneSignal
 * subscription ID when push is available, otherwise a local device ID so
 * signed-out users can still save and manage reminders.
 */
export async function getReminderIdentity() {
  // Inside the Android app the native subscription ID is what receives push —
  // a WebView cannot hold a web push subscription, so prefer it when present.
  const androidId = getAndroidPushId();
  if (androidId) return androidId;
  const subId = await getOneSignalSubscriptionId();
  return subId || getLocalDeviceId();
}

/**
 * Waits for the first user gesture (some browsers only show the permission
 * dialog after interaction). Resolves on the first gesture or after 30s.
 */
function waitForUserGesture() {
  return new Promise((resolve) => {
    const events = ['pointerdown', 'touchstart', 'keydown'];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      events.forEach((event) => document.removeEventListener(event, finish, true));
      resolve();
    };
    const timer = setTimeout(finish, 30000);
    events.forEach((event) => document.addEventListener(event, finish, true));
  });
}

let autoEnableAttempted = false;

/**
 * Enables notifications automatically on app start — shows the system/browser
 * permission dialog once and subscribes, with no in-app prompt UI. Runs at most
 * once per session and never throws.
 */
export async function autoEnablePushNotifications() {
  if (autoEnableAttempted) return;
  autoEnableAttempted = true;

  try {
    // Android app: the browser Notification API is unusable inside a WebView,
    // so trigger the OS dialog through the native bridge instead.
    if (getAndroidPushId() || isAndroidWebView()) {
      if (!areAndroidNotificationsEnabled()) {
        requestAndroidNotifications();
        await waitForAndroidNotifications(10000);
      }
      if (areAndroidNotificationsEnabled()) optInToAndroidPush();
      return;
    }

    // No Notification API (e.g. iOS Safari before "Add to Home Screen").
    if (typeof Notification === 'undefined') return;
    // Previously declined — the browser will not show the dialog again.
    if (Notification.permission === 'denied') return;

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore — may need a gesture
      }
    }
    if (Notification.permission === 'default') {
      await waitForUserGesture();
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }

    if (Notification.permission !== 'granted') return;

    const ready = await initOneSignal();
    if (ready && isWebPushConfigured()) {
      await optInPushSubscription();
    }
  } catch (error) {
    console.warn('autoEnablePushNotifications failed:', error);
  }
}

/**
 * Get the OneSignal subscription ID (player ID) for the current device/browser.
 * Used to identify anonymous users for server-side reminder delivery.
 */
export async function getOneSignalSubscriptionId() {
  try {
    const ready = await initOneSignal();
    if (!ready) return null;
    // OneSignal Web SDK v16: push subscription ID
    const sub = OneSignal?.User?.PushSubscription;
    if (sub?.id) return String(sub.id);
    // Fallback: OneSignal user ID (created on init even without a push subscription).
    // This still lets us target the device for reminders via include_player_ids.
    const onesignalId = OneSignal?.User?.onesignalId;
    if (onesignalId) return String(onesignalId);
    // Fallback: getPlayerId (older SDK)
    if (typeof OneSignal?.getPlayerId === 'function') {
      const id = await OneSignal.getPlayerId();
      return id ? String(id) : null;
    }
    return null;
  } catch (error) {
    console.warn('Could not get OneSignal subscription ID:', error);
    return null;
  }
}
