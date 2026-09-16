export const WELCOME_STORAGE_KEY = "welcome_submissions_v1";
export const WELCOME_DISMISS_KEY = "welcome_popup_dismissed_v1";
export const WELCOME_SUBMITTED_KEY = "welcome_popup_submitted_v1";
export const WELCOME_CYCLE_MS = 24 * 60 * 60 * 1000; // 24 hours per user cycle

export const HEARD_ABOUT_OPTIONS = [
  "Friend / Family",
  "WhatsApp / Telegram group",
  "Social media (Facebook, Instagram, TikTok)",
  "YouTube or video",
  "Google / Search engine",
  "School or Masjid",
  "Google Play / App Store",
  "Other",
];

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readTimestampKey = (key) => {
  if (!isBrowser) return 0;
  const raw = localStorage.getItem(key);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isWithin24Hours = (ts) => {
  if (!ts) return false;
  return Date.now() - Number(ts) < WELCOME_CYCLE_MS;
};

export const listWelcomeSubmissions = () => {
  if (!isBrowser) return [];
  const raw = localStorage.getItem(WELCOME_STORAGE_KEY) || "[]";
  const list = safeParse(raw);
  return list.slice().sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
};

export const addWelcomeSubmission = (entry) => {
  if (!isBrowser) return null;
  const list = safeParse(localStorage.getItem(WELCOME_STORAGE_KEY) || "[]");
  const next = {
    id:
      (entry && entry.id) ||
      `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: (entry && entry.name ? String(entry.name) : "").slice(0, 200),
    city: (entry && entry.city ? String(entry.city) : "").slice(0, 200),
    mobile: (entry && entry.mobile ? String(entry.mobile) : "").slice(0, 40),
    broadcastOptIn: Boolean(entry && entry.broadcastOptIn),
    heardAbout: (entry && entry.heardAbout ? String(entry.heardAbout) : "").slice(0, 200),
    feedback: (entry && entry.feedback ? String(entry.feedback) : "").slice(0, 2000),
    submittedAt: (entry && entry.submittedAt) || Date.now(),
  };
  list.push(next);
  localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify(list));
  try {
    localStorage.setItem(WELCOME_SUBMITTED_KEY, String(next.submittedAt));
  } catch {}
  return next;
};

export const deleteWelcomeSubmission = (id) => {
  if (!isBrowser) return;
  const list = safeParse(localStorage.getItem(WELCOME_STORAGE_KEY) || "[]").filter(
    (s) => s.id !== id,
  );
  localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify(list));
};

export const clearAllWelcomeSubmissions = () => {
  if (!isBrowser) return;
  localStorage.setItem(WELCOME_STORAGE_KEY, "[]");
};

const toCSVRow = (values) =>
  values
    .map((v) => {
      const s = v == null ? "" : String(v);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");

export const exportWelcomeSubmissionsCSV = () => {
  const submissions = listWelcomeSubmissions();
  const header = [
    "Submitted (UTC)",
    "Name",
    "City",
    "Mobile / WhatsApp",
    "Broadcast list opt-in",
    "How did you hear about us?",
    "Feedback / Message",
    "ID",
  ];
  const rows = submissions.map((s) => [
    s.submittedAt ? new Date(s.submittedAt).toISOString() : "",
    s.name || "",
    s.city || "",
    s.mobile || "",
    s.broadcastOptIn ? "Yes" : "No",
    s.heardAbout || "",
    s.feedback || "",
    s.id || "",
  ]);
  const csv =
    "\uFEFF" +
    [header, ...rows].map(toCSVRow).join("\n");
  if (!isBrowser) return csv;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `islam-media-welcome-submissions-${
    new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19)
  }.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return csv;
};

export const hasDismissedWelcomePopup = () => {
  if (!isBrowser) return false;
  const ts = readTimestampKey(WELCOME_DISMISS_KEY);
  return isWithin24Hours(ts);
};

export const markWelcomePopupDismissed = () => {
  if (!isBrowser) return;
  localStorage.setItem(WELCOME_DISMISS_KEY, String(Date.now()));
};

export const hasSubmittedWelcome = () => {
  if (!isBrowser) return false;
  const ts = readTimestampKey(WELCOME_SUBMITTED_KEY);
  return isWithin24Hours(ts);
};
