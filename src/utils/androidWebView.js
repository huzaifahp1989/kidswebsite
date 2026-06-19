export function isAndroidWebView() {
  try {
    return Boolean(
      (window.AndroidReview &&
        (typeof window.AndroidReview.openPlayStore === 'function' ||
          typeof window.AndroidReview.openExternalUrl === 'function' ||
          typeof window.AndroidReview.requestReview === 'function')) ||
      (window.AndroidAlarm && typeof window.AndroidAlarm.schedule === 'function')
    );
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
    window.location.assign(url);
  } catch {
  }
}
