// Frontend schedule helper for Islamic reminders.
// Mirrors the DST-aware logic in supabase/functions/reminder-dispatch/index.ts
// and extends it with days-of-week support.

import { getLocalDate } from "./activityReminderSchedule.js";

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

function localDateTimeToUtc(dateText, timeText, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeText);
  if (!match || !timeMatch) throw new Error(`Invalid reminder date/time: ${dateText} ${timeText}`);

  const [, year, month, day] = match;
  const [, hour, minute] = timeMatch;
  const targetWallTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

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

  throw new Error(`Could not calculate reminder time for tz ${timeZone}`);
}

function addDays(dateText, days) {
  const [year, month, day] = dateText.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/**
 * Compute the next UTC instant for a reminder.
 * @param {string} timeText "HH:MM" local wall-clock
 * @param {string} timeZone IANA tz
 * @param {number[]|null} daysOfWeek 0=Sun..6=Sat, null=every day
 * @param {Date} now
 */
export function getNextReminderAtWithDays(timeText, timeZone, daysOfWeek, now = new Date()) {
  new Intl.DateTimeFormat("en", { timeZone }); // validate
  const allowed = daysOfWeek && daysOfWeek.length > 0 ? new Set(daysOfWeek) : null;
  let dateText = getLocalDate(now, timeZone);
  for (let i = 0; i < 14; i++) {
    if (allowed) {
      const weekday = new Date(`${dateText}T00:00:00Z`).getUTCDay();
      if (!allowed.has(weekday)) {
        dateText = addDays(dateText, 1);
        continue;
      }
    }
    const candidate = localDateTimeToUtc(dateText, timeText, timeZone);
    if (candidate.getTime() > now.getTime()) return candidate.toISOString();
    dateText = addDays(dateText, 1);
  }
  throw new Error("No upcoming reminder found within 14 days");
}

/** Prayer-time helper: compute next occurrence for a salah reminder. */
export function getNextSalahOccurrence(prayerTimes, prayerName, minutesBefore, timeZone, now = new Date()) {
  const mins = Math.max(0, Number(minutesBefore) || 0);
  const localDate = getLocalDate(now, timeZone);
  for (let i = 0; i < 2; i++) {
    const dateKey = addDays(localDate, i);
    const times = prayerTimes?.[dateKey];
    if (times && times[prayerName]) {
      const prayerInstant = localDateTimeToUtc(dateKey, times[prayerName], timeZone);
      const target = new Date(prayerInstant.getTime() - mins * MINUTE_MS);
      if (target.getTime() > now.getTime()) return target.toISOString();
    }
  }
  return null;
}

export { getLocalDate };
