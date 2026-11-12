const MAX_TITLE_LENGTH = 140;
const MAX_LOCATION_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 2000;

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
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

function formatParts(formatter, date) {
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const hour = String(Number(get("hour")) || 12);
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toLowerCase().replace(/\s/g, "");
  return { get, hour, minute, dayPeriod };
}

function sameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Formats an event window for display, e.g. "Fri 14 Nov, 7:30pm" or
 * "Fri 14 Nov, 7:30pm – 9:00pm". Times render in the visitor's own timezone
 * because no explicit timeZone is set. Returns "—" for an invalid date rather
 * than inventing a value.
 */
export function formatEventWhen(startsAt, endsAt) {
  const start = parseDate(startsAt);
  if (!start) return "—";

  const { get, hour, minute, dayPeriod } = formatParts(DATE_FMT, start);
  const startLabel = `${get("weekday")} ${get("day")} ${get("month")}, ${hour}:${minute}${dayPeriod}`;

  const end = parseDate(endsAt);
  if (!end) return startLabel;

  if (sameCalendarDay(start, end)) {
    const endParts = formatParts(TIME_FMT, end);
    return `${startLabel} – ${endParts.hour}:${endParts.minute}${endParts.dayPeriod}`;
  }

  const endFormatted = formatParts(DATE_FMT, end);
  const endLabel = `${endFormatted.get("weekday")} ${endFormatted.get("day")} ${endFormatted.get("month")}, ${endFormatted.hour}:${endFormatted.minute}${endFormatted.dayPeriod}`;
  return `${startLabel} – ${endLabel}`;
}

export function validateEventInput(input) {
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

  const location = String(raw.location || "").trim();
  if (location.length > MAX_LOCATION_LENGTH) {
    return `Location is too long (max ${MAX_LOCATION_LENGTH} characters)`;
  }

  const description = String(raw.description || "").trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters)`;
  }

  const linkUrl = String(raw.link_url || "").trim();
  if (linkUrl) {
    try {
      new URL(linkUrl);
    } catch {
      return "Link URL is not valid";
    }
  }

  const imageUrl = String(raw.image_url || "").trim();
  if (imageUrl) {
    try {
      new URL(imageUrl);
    } catch {
      return "Image URL is not valid";
    }
  }

  return null;
}

export function buildEventRow(input) {
  const raw = input || {};
  const toNull = (value) => {
    const text = String(value ?? "").trim();
    return text ? text : null;
  };

  const start = parseDate(raw.starts_at);
  const end = parseDate(raw.ends_at);

  return {
    title: String(raw.title || "").trim(),
    description: toNull(raw.description),
    starts_at: start ? start.toISOString() : null,
    ends_at: end ? end.toISOString() : null,
    location: toNull(raw.location),
    link_url: toNull(raw.link_url),
    image_url: toNull(raw.image_url),
    active: typeof raw.active === "boolean" ? raw.active : true,
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Math.trunc(Number(raw.sort_order)) : 0,
    updated_at: new Date().toISOString(),
  };
}
