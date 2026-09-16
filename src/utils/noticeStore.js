export const NOTICES_STORAGE_KEY = "notices_v1";
export const NOTICES_READ_AT_KEY = "notices_last_read_at_v1";
export const NOTICE_PRIORITY = {
  normal: "normal",
  highlight: "highlight",
  urgent: "urgent",
};

export const PRIORITY_META = {
  [NOTICE_PRIORITY.normal]: {
    label: "Normal",
    chipClass: "bg-gray-100 text-gray-700 border border-gray-200",
    dotClass: "bg-gray-400",
    accentClass: "from-gray-50 to-white border-gray-200",
    accentRibbon: "bg-gray-100 text-gray-700",
  },
  [NOTICE_PRIORITY.highlight]: {
    label: "Highlight",
    chipClass: "bg-amber-100 text-amber-800 border border-amber-300",
    dotClass: "bg-amber-500 animate-pulse",
    accentClass: "from-amber-50 to-white border-amber-200",
    accentRibbon: "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950",
  },
  [NOTICE_PRIORITY.urgent]: {
    label: "Urgent",
    chipClass: "bg-red-100 text-red-700 border border-red-300",
    dotClass: "bg-red-600 animate-ping",
    accentClass: "from-red-50 to-white border-red-300",
    accentRibbon: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
  },
};

const uid = () =>
  `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const readAllRaw = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTICES_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeAll = (list) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(list || []));
    try {
      const event = new window.CustomEvent("notices:changed", { detail: { count: (list || []).length } });
      window.dispatchEvent(event);
    } catch {}
  } catch {}
};

const normalize = (notice) => {
  const now = Date.now();
  const base = {
    id: uid(),
    title: (notice?.title || "").toString().trim(),
    body: (notice?.body || "").toString().trim(),
    priority: Object.values(NOTICE_PRIORITY).includes(notice?.priority)
      ? notice.priority
      : NOTICE_PRIORITY.normal,
    createdAt: Number(notice?.createdAt) || now,
    updatedAt: now,
    active: notice?.active === false ? false : true,
    linkUrl: (notice?.linkUrl || "").toString().trim(),
    linkLabel: (notice?.linkLabel || "").toString().trim(),
  };
  if (!base.title) base.title = "Notice";
  return base;
};

export function listNotices({ includeInactive = false } = {}) {
  const arr = readAllRaw().map((n) => normalize({ ...n, createdAt: n.createdAt, id: n.id }));
  const filtered = includeInactive ? arr : arr.filter((n) => n.active);
  return filtered.sort((a, b) => {
    const orderOf = (p) => (p === NOTICE_PRIORITY.urgent ? 0 : p === NOTICE_PRIORITY.highlight ? 1 : 2);
    const rankA = orderOf(a.priority);
    const rankB = orderOf(b.priority);
    if (rankA !== rankB) return rankA - rankB;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export function getNotice(id) {
  if (!id) return null;
  return listNotices({ includeInactive: true }).find((n) => n.id === id) || null;
}

export function addNotice(input) {
  const row = normalize(input || {});
  const all = readAllRaw();
  all.unshift(row);
  writeAll(all);
  return row;
}

export function updateNotice(id, patch) {
  if (!id) return null;
  const all = readAllRaw();
  const idx = all.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  const next = { ...normalize({ ...all[idx], ...patch, id: all[idx].id, createdAt: all[idx].createdAt }), updatedAt: Date.now() };
  all[idx] = next;
  writeAll(all);
  return next;
}

export function deleteNotice(id) {
  if (!id) return;
  const all = readAllRaw().filter((n) => n.id !== id);
  writeAll(all);
}

export function clearAllNotices() {
  writeAll([]);
}

export function countNotices({ includeInactive = false } = {}) {
  return listNotices({ includeInactive }).length;
}

export const LAST_READ_COOKIE_MS = 24 * 60 * 60 * 1000 * 365 * 2;

const readNumberKey = (k, fallback = 0) => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(k);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
};

export function getLastReadAt() {
  return readNumberKey(NOTICES_READ_AT_KEY, 0);
}

export function setLastReadNow() {
  if (typeof window === "undefined") return 0;
  const now = Date.now();
  try {
    window.localStorage.setItem(NOTICES_READ_AT_KEY, String(now));
    try {
      const event = new window.CustomEvent("notices:read-marker", { detail: { at: now } });
      window.dispatchEvent(event);
    } catch {}
  } catch {}
  return now;
}

export function countUnreadNotices() {
  const since = getLastReadAt();
  const list = listNotices({ includeInactive: false });
  return list.filter((n) => (n.createdAt || 0) > since || (n.updatedAt || 0) > since).length;
}

export function isNoticeNew(n) {
  if (!n) return false;
  const since = getLastReadAt();
  return (n.createdAt || 0) > since || (n.updatedAt || 0) > since;
}

export function markNoticeReadById(id) {
  if (!id || typeof window === "undefined") return;
  const key = `notice_read_ids_v1`;
  let ids = [];
  try {
    const raw = window.localStorage.getItem(key);
    ids = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids)) ids = [];
  } catch {
    ids = [];
  }
  if (!ids.includes(id)) ids.push(id);
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(-200)));
  } catch {}
}

export function isNoticeReadById(id) {
  if (!id || typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(`notice_read_ids_v1`);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) && ids.includes(id);
  } catch {
    return false;
  }
}

const escapeCSV = (v) => {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function exportNoticesCSV() {
  const rows = listNotices({ includeInactive: true });
  const header = [
    "ID",
    "Created At",
    "Updated At",
    "Title",
    "Body",
    "Priority",
    "Active",
    "Link URL",
    "Link Label",
  ];
  const lines = [header.map(escapeCSV).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        new Date(r.createdAt || 0).toISOString(),
        new Date(r.updatedAt || 0).toISOString(),
        r.title,
        r.body,
        r.priority,
        r.active ? "Yes" : "No",
        r.linkUrl,
        r.linkLabel,
      ]
        .map(escapeCSV)
        .join(",")
    );
  }
  const csv = "\uFEFF" + lines.join("\r\n");
  if (typeof window !== "undefined") {
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notices-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {}
  }
  return csv;
}
