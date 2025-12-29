import { useEffect, useState } from "react";

export default function NoticeBanner({
  storageKey = "notice_leaderboard_points_unavailable",
  message = "ℹ Notice: The leaderboard and points system are temporarily unavailable while we perform updates. You can still enjoy all quizzes and games as they are fully functional.",
  expiresAt = null,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const envFlag = String(import.meta.env.VITE_LEADERBOARD_UNAVAILABLE ?? "true");
    const featureActive = envFlag !== "false";

    const dismissedRaw = localStorage.getItem(`${storageKey}_dismissed`);
    const dismissed = dismissedRaw ? JSON.parse(dismissedRaw) : null;
    const now = Date.now();
    const expired = typeof expiresAt === "number" && expiresAt > 0 ? now > expiresAt : false;

    const shouldShow = featureActive && !dismissed && !expired;
    setVisible(shouldShow);

    if (shouldShow) {
      try {
        const viewsRaw = localStorage.getItem(`${storageKey}_views`);
        const views = viewsRaw ? JSON.parse(viewsRaw) : 0;
        localStorage.setItem(`${storageKey}_views`, JSON.stringify(views + 1));
        try { window.dispatchEvent(new CustomEvent("notice_viewed", { detail: { key: storageKey, views: views + 1 } })); } catch {}
      } catch {}
    }
  }, [storageKey, expiresAt]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`${storageKey}_dismissed`, JSON.stringify({ at: Date.now() }));
      const disRaw = localStorage.getItem(`${storageKey}_dismissals`);
      const count = disRaw ? JSON.parse(disRaw) : 0;
      localStorage.setItem(`${storageKey}_dismissals`, JSON.stringify(count + 1));
      try { window.dispatchEvent(new CustomEvent("notice_dismissed", { detail: { key: storageKey, dismissals: count + 1 } })); } catch {}
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Leaderboard and points notice"
      className="z-20 w-full mb-3 sm:mb-4"
    >
      <div className="flex items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-yellow-300 text-black border border-yellow-600 shadow">
        <div className="text-lg sm:text-xl" aria-hidden="true">ℹ</div>
        <div className="text-sm sm:text-base leading-snug">{message}</div>
        <button
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="ml-auto text-xs sm:text-sm px-2 sm:px-3 py-1 rounded bg-black text-yellow-300 hover:bg-gray-800"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
