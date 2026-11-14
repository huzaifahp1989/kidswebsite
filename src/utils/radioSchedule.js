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

  const start = parseDate(raw.starts_at);
  if (!start) return "Start date/time is required and must be a valid date";

  const rawEnd = raw.ends_at;
  if (rawEnd != null && rawEnd !== "") {
    const end = parseDate(rawEnd);
    if (!end) return "End date/time is not valid";
    if (end.getTime() <= start.getTime()) return "End date/time must be after the start";
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

  const start = parseDate(raw.starts_at);
  const end = parseDate(raw.ends_at);

  return {
    title: String(raw.title || "").trim(),
    presenter: toNull(raw.presenter),
    description: toNull(raw.description),
    starts_at: start ? start.toISOString() : null,
    ends_at: end ? end.toISOString() : null,
    active: typeof raw.active === "boolean" ? raw.active : true,
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Math.trunc(Number(raw.sort_order)) : 0,
    updated_at: new Date().toISOString(),
  };
}
