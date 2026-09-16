import { initializeApp, getApps } from 'firebase/app';
import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
} from 'firebase/analytics';
import { isAndroidWebView } from '@/utils/androidWebView';

const FIRST_OPEN_KEY = 'ga_first_open_tracked';
const INSTALL_KEY = 'ga_app_install_tracked';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_ANALYTICS_API_KEY || 'AIzaSyDIpe4_imqnRmn4hB5DadmzRGGl_AndpXc',
  authDomain: import.meta.env.VITE_FIREBASE_ANALYTICS_AUTH_DOMAIN || 'islam-media-stats.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_ANALYTICS_PROJECT_ID || 'islam-media-stats',
  storageBucket:
    import.meta.env.VITE_FIREBASE_ANALYTICS_STORAGE_BUCKET || 'islam-media-stats.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_ANALYTICS_MESSAGING_SENDER_ID || '748617367224',
  appId: import.meta.env.VITE_FIREBASE_ANALYTICS_APP_ID || '1:748617367224:web:18469c9aa80e975860be4d',
  measurementId: import.meta.env.VITE_FIREBASE_ANALYTICS_MEASUREMENT_ID || 'G-8LHGLLY2NC',
};

let analytics = null;
let initPromise = null;

function getOrCreateApp() {
  const existing = getApps().find((app) => app.name === 'islam-media-stats');
  if (existing) return existing;
  return initializeApp(firebaseConfig, 'islam-media-stats');
}

export function initAnalytics() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (typeof window === 'undefined') return null;
      const supported = await isSupported();
      if (!supported) return null;

      const app = getOrCreateApp();
      analytics = getAnalytics(app);

      const platform = isAndroidWebView() ? 'android_app' : 'web';
      setUserProperties(analytics, { platform });

      trackFirstOpenAndInstall(platform);
      logEvent(analytics, 'session_start', { platform });

      return analytics;
    } catch (error) {
      console.warn('Firebase Analytics init failed:', error);
      analytics = null;
      return null;
    }
  })();

  return initPromise;
}

function trackFirstOpenAndInstall(platform) {
  if (!analytics) return;

  try {
    const firstOpen = localStorage.getItem(FIRST_OPEN_KEY);
    if (!firstOpen) {
      localStorage.setItem(FIRST_OPEN_KEY, String(Date.now()));
      logEvent(analytics, 'first_open', { platform });
      logEvent(analytics, 'first_visit', { platform });
    }

    // Proxy for app install/download: first launch inside the Android WebView wrapper
    if (platform === 'android_app' && !localStorage.getItem(INSTALL_KEY)) {
      localStorage.setItem(INSTALL_KEY, String(Date.now()));
      logEvent(analytics, 'app_install', { platform: 'android' });
      logEvent(analytics, 'app_download', { platform: 'android' });
    }
  } catch {
    // ignore storage errors
  }
}

export async function trackPageView(path, title) {
  const instance = analytics || (await initAnalytics());
  if (!instance) return;

  logEvent(instance, 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

export async function trackEvent(name, params = {}) {
  const instance = analytics || (await initAnalytics());
  if (!instance) return;
  logEvent(instance, name, params);
}

export async function identifyAnalyticsUser(userId) {
  const instance = analytics || (await initAnalytics());
  if (!instance || !userId) return;
  setUserId(instance, String(userId));
}

export function getAnalyticsInstance() {
  return analytics;
}
