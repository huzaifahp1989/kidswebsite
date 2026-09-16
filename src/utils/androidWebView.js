export function isAndroidWebView() {
  try {
    return Boolean(
      window.WTN ||
      (window.AndroidReview &&
        (typeof window.AndroidReview.openPlayStore === 'function' ||
          typeof window.AndroidReview.openExternalUrl === 'function' ||
          typeof window.AndroidReview.requestInAppReview === 'function' ||
          typeof window.AndroidReview.requestReview === 'function')) ||
      (window.AndroidAlarm && typeof window.AndroidAlarm.schedule === 'function') ||
      (window.AndroidNotifications &&
        (typeof window.AndroidNotifications.areEnabled === 'function' ||
          typeof window.AndroidNotifications.requestPermission === 'function'))
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
    window.location.assign(url);
  } catch {
  }
}
