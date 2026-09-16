import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  areAndroidNotificationsEnabled,
  isAndroidWebView,
  openAndroidNotificationSettings,
  optInToAndroidPush,
  requestAndroidNotifications,
} from "@/utils/androidWebView";
import {
  getPushNotificationStatus,
  initOneSignal,
  promptPushNotification,
} from "@/utils/oneSignal";

const DISMISS_KEY = "push_prompt_banner_dismissed_at";
const DISMISS_MS = import.meta.env.DEV ? 60 * 1000 : 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = import.meta.env.DEV ? 1500 : 3000;

export default function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const inAndroidApp = isAndroidWebView();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

      if (inAndroidApp) {
        const enabled = areAndroidNotificationsEnabled();
        if (enabled === true) return;
        if (!cancelled) {
          setStatusNote(
            enabled === null
              ? "Update the Android app to enable notification prompts, or turn on notifications in your phone settings."
              : "Get alerts for announcements, activities, and Islamic content."
          );
          setVisible(true);
        }
        return;
      }

      const status = await getPushNotificationStatus();
      if (cancelled) return;

      if (!status.capable) {
        setStatusNote("Push notifications are not supported in this browser.");
        setVisible(import.meta.env.DEV);
        return;
      }

      if (status.subscribed) return;

      if (!status.ready && import.meta.env.DEV) {
        setStatusNote("OneSignal is still loading. You can still test the browser permission prompt.");
      }

      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [inAndroidApp]);

  useEffect(() => {
    if (!inAndroidApp || !visible) return undefined;

    const onResume = () => {
      if (areAndroidNotificationsEnabled()) {
        setVisible(false);
      }
    };

    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [inAndroidApp, visible]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      if (inAndroidApp) {
        if (areAndroidNotificationsEnabled()) {
          setVisible(false);
          return;
        }

        const requested = requestAndroidNotifications();
        if (requested) {
          setStatusNote("Allow notifications when Android asks. If you do not see a popup, open app settings below.");
        } else {
          openAndroidNotificationSettings();
          setStatusNote("Open your phone settings and turn on notifications for this app.");
        }
        optInToAndroidPush();
        return;
      }

      await initOneSignal();
      const result = await promptPushNotification({ force: true, skipCooldown: true });
      const status = await getPushNotificationStatus();

      if (status.subscribed || result.ok) {
        setVisible(false);
        return;
      }

      if (result.reason === "not_initialized") {
        setStatusNote("Could not load OneSignal. Check your OneSignal site URL settings.");
      } else if (result.reason === "native_denied") {
        setStatusNote("Notifications were blocked. Allow them in your browser site settings and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = () => {
    if (inAndroidApp) {
      openAndroidNotificationSettings();
      setStatusNote("Turn on notifications for Islam Media Central in your phone settings.");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-x-0 z-[9997] px-4 pointer-events-none ${
        inAndroidApp ? "bottom-24" : "bottom-4"
      }`}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Stay updated</p>
          <p className="mt-1 text-xs text-gray-600">
            Get alerts for new announcements, activities, and Islamic content for kids.
          </p>
          {statusNote ? (
            <p className="mt-2 text-xs text-amber-700">{statusNote}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={loading}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {loading ? "Opening..." : "Enable notifications"}
            </Button>
            {inAndroidApp ? (
              <Button size="sm" variant="outline" onClick={handleOpenSettings}>
                App settings
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Dismiss notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
