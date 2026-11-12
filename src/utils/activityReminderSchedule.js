const MINUTE_MS = 60_000;
const SIX_HOURS_MS = 6 * 60 * MINUTE_MS;

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getLocalDate(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localDateTimeToUtc(dateText, timeText, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeText);
  if (!match || !timeMatch) throw new Error("Invalid reminder date or time.");

  const [, year, month, day] = match;
  const [, hour, minute] = timeMatch;
  const targetWallTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  const offsets = new Set();
  for (let delta = -36 * 60 * MINUTE_MS; delta <= 36 * 60 * MINUTE_MS; delta += SIX_HOURS_MS) {
    const instant = new Date(targetWallTime + delta);
    const parts = getZonedParts(instant, timeZone);
    const zonedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    offsets.add(zonedAsUtc - Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS);
  }

  const candidates = [...offsets].map((offset) => {
    const instant = new Date(targetWallTime - offset);
    const parts = getZonedParts(instant, timeZone);
    const actualWallTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    return { instant, wallDifference: actualWallTime - targetWallTime };
  });

  const exactMatches = candidates
    .filter(({ wallDifference }) => wallDifference === 0)
    .sort((a, b) => a.instant - b.instant);
  if (exactMatches.length) return exactMatches[0].instant;

  const afterDaylightGap = candidates
    .filter(({ wallDifference }) => wallDifference > 0)
    .sort((a, b) => a.wallDifference - b.wallDifference || a.instant - b.instant);
  if (afterDaylightGap.length) return afterDaylightGap[0].instant;

  throw new Error("Could not calculate the reminder time for this time zone.");
}

function nextLocalDate(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function getNextReminderAt(timeText, timeZone, now = new Date()) {
  new Intl.DateTimeFormat("en", { timeZone });

  let dateText = getLocalDate(now, timeZone);
  let next = localDateTimeToUtc(dateText, timeText, timeZone);
  if (next.getTime() <= now.getTime()) {
    dateText = nextLocalDate(dateText);
    next = localDateTimeToUtc(dateText, timeText, timeZone);
  }
  return next.toISOString();
}
