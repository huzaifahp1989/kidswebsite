import OneSignal from 'react-onesignal';

const PROMPT_COOLDOWN_KEY = 'onesignal_prompt_shown_at';
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = import.meta.env.DEV ? 5 * 1000 : 90 * 1000;

let initPromise = null;
let initReady = false;

const DEFAULT_ONESIGNAL_APP_ID = 'daf8fc36-781a-417d-8ee4-5078635f22e7';

function getAppId() {
  return String(import.meta.env.VITE_ONESIGNAL_APP_ID || DEFAULT_ONESIGNAL_APP_ID).trim();
}

function isAlreadyInitializedError(error) {
  const message = String(error?.message || error || '');
  return /already initialized/i.test(message);
}

function isBrowserPushCapable() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function isOneSignalConfigured() {
  return Boolean(getAppId());
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
        serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/push/onesignal/' },
        notifyButton: { enable: false },
      });
      initReady = true;
      return true;
    } catch (error) {
      if (isAlreadyInitializedError(error)) {
        initReady = true;
        return true;
      }
      console.warn('OneSignal init failed:', error);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

export async function syncOneSignalUser(user) {
  if (!(await initOneSignal())) return;

  try {
    if (user?.uid) {
      await OneSignal.login(user.uid);
      if (user.email) {
        OneSignal.User.addEmail(user.email);
      }
      OneSignal.User.addTag('platform', 'web');
    } else {
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
    await OneSignal.Slidedown.promptPush({ force: true });
    return { ok: true };
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
