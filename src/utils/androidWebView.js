export function isAndroidWebView() {
  try {
    // window.WTN (WebToNative) is loaded on all platforms for Firebase Analytics.
    // Only return true if actual Android-specific JS interfaces are present.
    return Boolean(
      (window.AndroidReview &&
        (typeof window.AndroidReview.openPlayStore === 'function' ||
          typeof window.AndroidReview.openExternalUrl === 'function' ||
          typeof window.AndroidReview.requestInAppReview === 'function' ||
          typeof window.AndroidReview.requestReview === 'function')) ||
      (window.AndroidAlarm && typeof window.AndroidAlarm.schedule === 'function') ||
      (window.AndroidNotifications &&
        (typeof window.AndroidNotifications.areEnabled === 'function' ||
          typeof window.AndroidNotifications.requestPermission === 'function' ||
          typeof window.AndroidNotifications.optInToPush === 'function'))
    );
  } catch {
    return false;
  }
}

/** Enable Firebase Analytics collection via WebToNative (WTN) bridge when available. */
export function enableWtnFirebaseAnalytics() {
  try {
    const FirebaseAnalytics = window.WTN?.Firebase?.Analytics;
    if (!FirebaseAnalytics || typeof FirebaseAnalytics.setCollection !== 'function') {
      return false;
    }
    FirebaseAnalytics.setCollection({ enabled: true });
    return true;
  } catch {
    return false;
  }
}

export function areAndroidNotificationsEnabled() {
  try {
    if (window.AndroidNotifications && typeof window.AndroidNotifications.areEnabled === 'function') {
      return window.AndroidNotifications.areEnabled();
    }
  } catch {
  }
  return null;
}

export function requestAndroidNotifications() {
  try {
    if (window.AndroidNotifications && typeof window.AndroidNotifications.requestPermission === 'function') {
      window.AndroidNotifications.requestPermission();
      return true;
    }
  } catch {
  }
  return false;
}

/**
 * Poll the native bridge until notifications are enabled (e.g. while the OS
 * permission dialog is on screen) or the timeout elapses. The WebView cannot
 * receive a callback from `requestPermission()`, so polling is used to detect
 * the user's response.
 */
export async function waitForAndroidNotifications(timeoutMs = 8000, intervalMs = 300) {
  const deadline = Date.now() + timeoutMs;
  let enabled = areAndroidNotificationsEnabled();
  while (enabled !== true && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    enabled = areAndroidNotificationsEnabled();
  }
  return enabled === true;
}

export function optInToAndroidPush() {
  try {
    if (window.AndroidNotifications && typeof window.AndroidNotifications.optInToPush === 'function') {
      window.AndroidNotifications.optInToPush();
      return true;
    }
  } catch {
  }
  return false;
}

export function openAndroidNotificationSettings() {
  try {
    if (window.AndroidNotifications && typeof window.AndroidNotifications.openSettings === 'function') {
      window.AndroidNotifications.openSettings();
      return true;
    }
  } catch {
  }
  return false;
}

/**
 * The native OneSignal subscription/user ID for this device (Android app only).
 * Reminders are stored against this ID because the WebView cannot receive web
 * push by itself — the native SDK is what actually delivers notifications.
 * Older app builds that don't expose `getSubscriptionId` return null.
 */
export function getAndroidPushId() {
  try {
    if (window.AndroidNotifications && typeof window.AndroidNotifications.getSubscriptionId === 'function') {
      const id = window.AndroidNotifications.getSubscriptionId();
      return id ? String(id) : null;
    }
  } catch {
  }
  return null;
}

/**
 * True when the Android app exposes the on-device reminder scheduler. This lets
 * reminders fire as real notifications with no push subscription, Firebase or
 * network connection. Only present in app builds that include ReminderAlarmBridge.
 */
export function isAndroidReminderBridgeAvailable() {
  try {
    return Boolean(window.AndroidReminders && typeof window.AndroidReminders.scheduleReminder === 'function');
  } catch {
    return false;
  }
}

/**
 * Schedules a repeating on-device reminder. `days` is an array of weekdays
 * (0=Sunday..6=Saturday); omit or pass an empty array for every day.
 */
export function scheduleAndroidReminder({ key, title, message, hour, minute, days } = {}) {
  try {
    if (!isAndroidReminderBridgeAvailable() || !key) return false;
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return false;
    const daysCsv = Array.isArray(days) && days.length ? days.join(',') : '';
    return Boolean(
      window.AndroidReminders.scheduleReminder(
        String(key),
        String(title || ''),
        String(message || ''),
        hour,
        minute,
        daysCsv,
      ),
    );
  } catch {
    return false;
  }
}

export function cancelAndroidReminder(key) {
  try {
    if (!isAndroidReminderBridgeAvailable() || !key) return false;
    window.AndroidReminders.cancelReminder(String(key));
    return true;
  } catch {
    return false;
  }
}

export function showAndroidTestNotification(title, message) {
  try {
    if (!window.AndroidReminders || typeof window.AndroidReminders.showTestNotification !== 'function') return false;
    window.AndroidReminders.showTestNotification(String(title || 'Reminder'), String(message || ''));
    return true;
  } catch {
    return false;
  }
}

export function openExternalUrl(url) {
  if (!url) return;
  try {
    if (window.AndroidReview && typeof window.AndroidReview.openExternalUrl === 'function') {
      window.AndroidReview.openExternalUrl(url);
      return;
    }
  } catch {
  }
  try {
    // No bridge: use a new window. The Android shell hands popups to the
    // external browser (MainActivity.onCreateWindow) instead of loading them
    // inside the app.
    if (window.open(url, '_blank', 'noopener,noreferrer')) return;
  } catch {
  }
  try {
    window.location.assign(url);
  } catch {
  }
}
