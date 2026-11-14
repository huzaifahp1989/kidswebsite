const MAX_TITLE_LENGTH = 140;
const MAX_PRESENTER_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 600;

const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const FULL_DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function parseDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "7:30pm" — no timezone is set, so the visitor's own clock is used. */
function formatTime(date) {
  const parts = TIME_FMT.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const hour = String(Number(get("hour")) || 12);
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toLowerCase().replace(/\s/g, "");
  return `${hour}:${minute}${dayPeriod}`;
}

/** "Fri 14 Nov", or "Friday 14 November" when long is set. */
export function formatSlotDay(startsAt, { long = false } = {}) {
  const date = parseDate(startsAt);
  if (!date) return "";
  return (long ? FULL_DAY_FMT : DAY_FMT).format(date);
}

/** "7:30pm" or "7:30pm – 9:00pm" when an end time is set. */
export function formatSlotTime(startsAt, endsAt) {
  const start = parseDate(startsAt);
  if (!start) return "";
  const startLabel = formatTime(start);
  const end = parseDate(endsAt);
  return end ? `${startLabel} – ${formatTime(end)}` : startLabel;
}

/**
 * "08:00:00" / "8:00" → "08:00", or null when the value is not a time of day.
 * Repeating programmes are stored as a plain time, so it is never shifted into
 * another timezone — 8:00am stays 8:00am for everyone.
 */
export function normalizeTimeOfDay(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

/** "08:00" → "8:00am". */
export function formatTimeOfDay(value) {
  const normalized = normalizeTimeOfDay(value);
  if (!normalized) return "";
  const [hourText, minute] = normalized.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute}${period}`;
}

/** "8:00am" or "8:00am – 10:00am" for a repeating programme. */
export function formatDailySlotTime(startTime, endTime) {
  const start = formatTimeOfDay(startTime);
  if (!start) return "";
  const end = formatTimeOfDay(endTime);
  return end ? `${start} – ${end}` : start;
}

/** The hours the repeating schedule covers, e.g. "8:00am – 11:00pm". */
export function formatDailySlotRange(slots) {
  const list = (slots || []).filter((slot) => normalizeTimeOfDay(slot?.start_time));
  if (list.length === 0) return "";
  const first = list.reduce((min, slot) =>
    normalizeTimeOfDay(slot.start_time) < normalizeTimeOfDay(min.start_time) ? slot : min
  );
  const last = list.reduce((max, slot) => {
    const current = normalizeTimeOfDay(slot.end_time) || normalizeTimeOfDay(slot.start_time);
    const best = normalizeTimeOfDay(max.end_time) || normalizeTimeOfDay(max.start_time);
    return current > best ? slot : max;
  });
  return formatDailySlotTime(first.start_time, last.end_time || last.start_time);
}

/**
 * The default line-up the studio starts from: the same programmes every day,
 * 8:00am through 11:00pm. Seeded from the admin page and fully editable there.
 * Quran and Nasheeds are running; the two newer strands are marked "coming
 * soon" until the admin clears the flag.
 */
export const DEFAULT_DAILY_SCHEDULE = [
  { title: "Quran", start_time: "08:00", end_time: "10:00" },
  { title: "Nasheeds", start_time: "10:00", end_time: "12:00" },
  { title: "Radio Islam Show", start_time: "12:00", end_time: "14:00", coming_soon: true },
  { title: "CII Show", start_time: "14:00", end_time: "16:00", coming_soon: true },
  { title: "Quran", start_time: "16:00", end_time: "18:00" },
  { title: "Nasheeds", start_time: "18:00", end_time: "20:00" },
  { title: "Radio Islam Show", start_time: "20:00", end_time: "22:00", coming_soon: true },
  { title: "CII Show", start_time: "22:00", end_time: "23:00", coming_soon: true },
].map((slot, index) => ({ ...slot, sort_order: index }));

/**
 * Splits the slots into one group per calendar day so the pop-up can head each
 * block with its date. Order is preserved, so the API's ascending sort decides.
 */
export function groupSlotsByDay(slots) {
  const groups = [];
  const byKey = new Map();

  (slots || []).forEach((slot) => {
    const date = parseDate(slot?.starts_at);
    const key = date
      ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      : "unknown";

    let group = byKey.get(key);
    if (!group) {
      group = { key, label: formatSlotDay(slot?.starts_at, { long: true }), slots: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.slots.push(slot);
  });

  return groups;
}

export function validateRadioSlotInput(input) {
  const raw = input || {};

  const title = String(raw.title || "").trim();
  if (!title) return "Title is required";
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title is too long (max ${MAX_TITLE_LENGTH} characters)`;
  }

  if (raw.repeat_daily) {
    const startTime = normalizeTimeOfDay(raw.start_time);
    if (!startTime) return "Start time is required for a daily programme";
    const rawEndTime = raw.end_time;
    if (rawEndTime != null && String(rawEndTime).trim() !== "") {
      const endTime = normalizeTimeOfDay(rawEndTime);
      if (!endTime) return "End time is not valid";
      if (endTime <= startTime) return "End time must be after the start time";
    }
  } else {
    const start = parseDate(raw.starts_at);
    if (!start) return "Start date/time is required and must be a valid date";

    const rawEnd = raw.ends_at;
    if (rawEnd != null && rawEnd !== "") {
      const end = parseDate(rawEnd);
      if (!end) return "End date/time is not valid";
      if (end.getTime() <= start.getTime()) return "End date/time must be after the start";
    }
  }

  const presenter = String(raw.presenter || "").trim();
  if (presenter.length > MAX_PRESENTER_LENGTH) {
    return `Presenter is too long (max ${MAX_PRESENTER_LENGTH} characters)`;
  }

  const description = String(raw.description || "").trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters)`;
  }

  return null;
}

export function buildRadioSlotRow(input) {
  const raw = input || {};
  const toNull = (value) => {
    const text = String(value ?? "").trim();
    return text ? text : null;
  };

  const repeatDaily = Boolean(raw.repeat_daily);
  const start = parseDate(raw.starts_at);
  const end = parseDate(raw.ends_at);

  return {
    title: String(raw.title || "").trim(),
    presenter: toNull(raw.presenter),
    description: toNull(raw.description),
    poster_url: toNull(raw.poster_url),
    coming_soon: Boolean(raw.coming_soon),
    repeat_daily: repeatDaily,
    // A repeating programme is defined by its time of day, never by a date.
    starts_at: repeatDaily || !start ? null : start.toISOString(),
    ends_at: repeatDaily || !end ? null : end.toISOString(),
    start_time: repeatDaily ? normalizeTimeOfDay(raw.start_time) : null,
    end_time: repeatDaily ? normalizeTimeOfDay(raw.end_time) : null,
    active: typeof raw.active === "boolean" ? raw.active : true,
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Math.trunc(Number(raw.sort_order)) : 0,
    updated_at: new Date().toISOString(),
  };
}
