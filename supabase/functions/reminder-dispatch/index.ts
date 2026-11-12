import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Configuration (all from Supabase secrets)
// ---------------------------------------------------------------------------
const CRON_SECRET = Deno.env.get("REMINDER_CRON_SECRET") || "";
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") || "0bb81263-a5f5-4fd8-8786-d71f43a43725";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://imediackids.com";

const ONESIGNAL_API = "https://api.onesignal.com/notifications";
const LEASE_MS = 2 * 60 * 1000;
const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Schedule helpers (DST-aware, ported from src/utils/activityReminderSchedule.js)
// ---------------------------------------------------------------------------
const MINUTE_MS = 60_000;
const SIX_HOURS_MS = 6 * 60 * MINUTE_MS;

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
}

export function getLocalDate(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Convert a local wall-clock date+time in a tz to a UTC instant, DST-aware. */
function localDateTimeToUtc(dateText: string, timeText: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeText);
  if (!m || !tm) throw new Error(`Invalid reminder date/time: ${dateText} ${timeText}`);
  const [, y, mo, d] = m;
  const [, h, mi] = tm;
  const targetWall = Date.UTC(+y, +mo - 1, +d, +h, +mi);

  const offsets = new Set<number>();
  for (let delta = -36 * 60 * MINUTE_MS; delta <= 36 * 60 * MINUTE_MS; delta += SIX_HOURS_MS) {
    const instant = new Date(targetWall + delta);
    const p = getZonedParts(instant, timeZone);
    const zonedAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    offsets.add(zonedAsUtc - Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS);
  }

  const candidates = [...offsets].map((offset) => {
    const instant = new Date(targetWall - offset);
    const p = getZonedParts(instant, timeZone);
    const actualWall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    return { instant, wallDifference: actualWall - targetWall };
  });

  const exact = candidates.filter((c) => c.wallDifference === 0).sort((a, b) => a.instant.getTime() - b.instant.getTime());
  if (exact.length) return exact[0].instant;

  const afterGap = candidates.filter((c) => c.wallDifference > 0).sort((a, b) => a.wallDifference - b.wallDifference || a.instant.getTime() - b.instant.getTime());
  if (afterGap.length) return afterGap[0].instant;

  throw new Error(`Could not calculate reminder time for tz ${timeZone}`);
}

function addDays(dateText: string, days: number): string {
  const [y, m, d] = dateText.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/**
 * Compute the next UTC instant for a reminder.
 * - daysOfWeek: int[] (0=Sun..6=Sat) or null = every day
 * - timeText: "HH:MM" local wall-clock
 */
export function getNextReminderAt(timeText: string, timeZone: string, daysOfWeek: number[] | null, now = new Date()): Date {
  new Intl.DateTimeFormat("en", { timeZone }); // validate tz
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
    if (candidate.getTime() > now.getTime()) return candidate;
    dateText = addDays(dateText, 1);
  }
  throw new Error("No upcoming reminder found within 14 days");
}

// ---------------------------------------------------------------------------
// Deep-link mapping per category
// ---------------------------------------------------------------------------
function deepLinkFor(category: string, prayerName?: string): string {
  const map: Record<string, string> = {
    daily_islamic: "/DailyMissions",
    morning_adhkar: "/Duas",
    evening_adhkar: "/Duas",
    quran_reading: "/FullQuran",
    hifz_revision: "/HifzDashboard",
    salah: "/Home",
    friday: "/Home",
    events_competitions: "/Competition",
    new_content: "/Audio",
    kids_quiz: "/Games",
    durood: "/Duas",
    quran_listen: "/AudioNew",
    custom: "/Home",
  };
  const path = map[category] || "/Home";
  return `${APP_BASE_URL}${path}`;
}

// ---------------------------------------------------------------------------
// OneSignal send
// ---------------------------------------------------------------------------
async function sendOneSignal(userId: string | null, onesignalId: string | null, title: string, message: string, url: string): Promise<{ id: string }> {
  if (!ONESIGNAL_REST_API_KEY) throw new Error("ONESIGNAL_REST_API_KEY not configured");

  // Build the base payload
  const basePayload = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    headings: { en: title },
    contents: { en: message },
    url,
  };

  // Determine targeting. Anonymous users are targeted by their OneSignal ID.
  // The stored ID could be either a push subscription ID (player ID) or a
  // OneSignal user ID. We try include_player_ids first, then fall back to
  // include_aliases.onesignal_id.
  const targets: Record<string, any>[] = [];
  if (onesignalId) {
    targets.push({ include_player_ids: [onesignalId] });
    targets.push({ include_aliases: { onesignal_id: [onesignalId] } });
  } else if (userId) {
    targets.push({ include_aliases: { external_id: [userId] } });
  } else {
    throw new Error("No targeting available (no user_id or onesignal_id)");
  }

  let lastError: any = null;
  for (const target of targets) {
    const res = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ...basePayload, ...target }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      return { id: data.id };
    }
    lastError = data?.errors?.[0] || data?.error || `OneSignal request failed (${res.status})`;
  }

  throw new Error(typeof lastError === "string" ? lastError : JSON.stringify(lastError));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  // 1. Auth
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" } });
  }
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!CRON_SECRET || token !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase service-role not configured" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const leaseUntil = new Date(now.getTime() + LEASE_MS).toISOString();

  let sent = 0, skipped = 0, failed = 0;
  const failures: { reminderId: string; error: string }[] = [];

  try {
    // 2. Fetch due reminders (enabled, due, lease free)
    const { data: due, error: fetchErr } = await supabase
      .from("reminders")
      .select("*")
      .eq("enabled", true)
      .lte("next_occurrence_at", nowIso)
      .or(`dispatch_lease_until.is.null,dispatch_lease_until.lt.${nowIso}`)
      .order("next_occurrence_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0, skipped: 0, failed: 0 }), { status: 200 });
    }

    for (const r of due) {
      const scheduledOccurrence = r.next_occurrence_at;

      // 3. Atomic claim
      const { data: claimed, error: claimErr } = await supabase
        .from("reminders")
        .update({ dispatch_lease_until: leaseUntil })
        .eq("id", r.id)
        .eq("enabled", true)
        .lte("next_occurrence_at", nowIso)
        .or(`dispatch_lease_until.is.null,dispatch_lease_until.lt.${nowIso}`)
        .select("*")
        .maybeSingle();

      if (claimErr || !claimed) {
        if (claimErr) failures.push({ reminderId: r.id, error: claimErr.message });
        continue; // another worker claimed it
      }

      try {
        // 4. Idempotency: skip if a log row already exists for this occurrence
        const { data: existingLog } = await supabase
          .from("reminder_delivery_log")
          .select("id")
          .eq("reminder_id", claimed.id)
          .eq("scheduled_occurrence", scheduledOccurrence)
          .maybeSingle();

        let status = "sent";
        let onesignalId: string | null = null;
        let errorDetails: string | null = null;

        if (!existingLog) {
          // Salah: skip if no prayer times are available for the target date
          const salahTimesMissing =
            claimed.category === "salah" &&
            (() => {
              const tz = claimed.time_zone || "UTC";
              const localDate = getLocalDate(now, tz);
              for (let i = 0; i < 2; i++) {
                const dateKey = addDays(localDate, i);
                const times = claimed.prayer_times?.[dateKey];
                if (times && times[claimed.prayer_name]) return false;
              }
              return true;
            })();

          if (salahTimesMissing) {
            status = "skipped";
            errorDetails = "prayer_times not available for target date";
          } else {
            // 5. Send via OneSignal
            const title = claimed.title || defaultTitle(claimed.category, claimed.prayer_name);
            const message = claimed.message || defaultMessage(claimed.category, claimed.prayer_name);
            const url = deepLinkFor(claimed.category, claimed.prayer_name);
            const res = await sendOneSignal(claimed.user_id, claimed.onesignal_id || null, title, message, url);
            onesignalId = res.id;
          }
        } else {
          status = "skipped";
        }

        // 6. Write delivery log (idempotent unique constraint on reminder_id+scheduled_occurrence)
        await supabase.from("reminder_delivery_log").insert({
          reminder_id: claimed.id,
          user_id: claimed.user_id,
          scheduled_occurrence: scheduledOccurrence,
          onesignal_notification_id: onesignalId,
          delivery_status: status,
          error_details: errorDetails,
        }).onConflict("reminder_id,scheduled_occurrence").ignore();

        // 7. Advance next_occurrence_at
        const nextAt = computeNextOccurrence(claimed, now);
        await supabase.from("reminders").update({
          next_occurrence_at: nextAt,
          last_sent_at: nowIso,
          last_sent_occurrence: scheduledOccurrence,
          dispatch_lease_until: null,
        }).eq("id", claimed.id);

        if (status === "sent") sent++;
        else skipped++;
      } catch (err: any) {
        failed++;
        const msg = err?.message || String(err);
        failures.push({ reminderId: claimed.id, error: msg });
        // Log failure + release lease so it can retry next minute
        await supabase.from("reminder_delivery_log").insert({
          reminder_id: claimed.id,
          user_id: claimed.user_id,
          scheduled_occurrence: scheduledOccurrence,
          delivery_status: "failed",
          error_details: msg,
        }).onConflict("reminder_id,scheduled_occurrence").ignore();
        await supabase.from("reminders").update({ dispatch_lease_until: null }).eq("id", claimed.id);
        console.error("Dispatch failed for reminder", claimed.id, msg);
      }
    }

    return new Response(JSON.stringify({ processed: due.length, sent, skipped, failed, failures }), { status: 200 });
  } catch (err: any) {
    console.error("reminder-dispatch fatal:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err), sent, skipped, failed }), { status: 500 });
  }
});

// ---------------------------------------------------------------------------
// Default titles/messages + next-occurrence computation
// ---------------------------------------------------------------------------
function defaultTitle(category: string, prayerName?: string): string {
  const t: Record<string, string> = {
    daily_islamic: "Daily Islamic Reminder",
    morning_adhkar: "Morning Adhkar",
    evening_adhkar: "Evening Adhkar",
    quran_reading: "Quran Reading Reminder",
    hifz_revision: "Hifz Revision Reminder",
    friday: "Friday Islamic Reminder",
    events_competitions: "Islamic Events & Competitions",
    new_content: "New Content Available",
    kids_quiz: "Kids Zone Quiz Time",
    durood: "Recite Durood Shareef",
    quran_listen: "Listen to the Quran",
    custom: "Reminder",
  };
  if (category === "salah") return prayerName ? `${capitalize(prayerName)} Prayer Reminder` : "Prayer Reminder";
  return t[category] || "Reminder";
}

function defaultMessage(category: string, prayerName?: string): string {
  const m: Record<string, string> = {
    daily_islamic: "A moment of reflection and remembrance awaits you today.",
    morning_adhkar: "Time for your morning remembrance of Allah. Start your day with dhikr.",
    evening_adhkar: "Time for your evening remembrance of Allah. End your day with dhikr.",
    quran_reading: "Read a portion of the Quran today to keep your daily habit.",
    hifz_revision: "Revise your memorised verses today to strengthen your hifz.",
    friday: "Remember the blessings of Friday. Send blessings upon the Prophet ﷺ.",
    events_competitions: "Check out the latest Islamic events and competitions.",
    new_content: "New recitations, nasheeds or talks are available for you.",
    kids_quiz: "Time for the Kids Zone quiz! Earn points while learning about Islam.",
    durood: "Send blessings upon the Prophet ﷺ. Recite Durood Shareef now.",
    quran_listen: "Listen to a beautiful recitation of the Quran and earn reward points.",
    custom: "You have a scheduled reminder.",
  };
  if (category === "salah") return prayerName ? `${capitalize(prayerName)} prayer time is approaching.` : "Prayer time is approaching.";
  return m[category] || "You have a scheduled reminder.";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeNextOccurrence(reminder: any, now: Date): string {
  const tz = reminder.time_zone || "UTC";
  // Salah: compute from prayer_times for the next day
  if (reminder.category === "salah" && reminder.prayer_name) {
    const mins = Math.max(0, Number(reminder.minutes_before) || 0);
    const localDate = getLocalDate(now, tz);
    // Try today and tomorrow
    for (let i = 0; i < 2; i++) {
      const dateKey = addDays(localDate, i);
      const times = reminder.prayer_times?.[dateKey];
      if (times && times[reminder.prayer_name]) {
        const prayerTime = times[reminder.prayer_name]; // "HH:MM"
        const prayerInstant = localDateTimeToUtc(dateKey, prayerTime, tz);
        const target = new Date(prayerInstant.getTime() - mins * MINUTE_MS);
        if (target.getTime() > now.getTime()) return target.toISOString();
      }
    }
    // Fallback: no valid prayer times -> push 1 day to avoid busy loop
    return new Date(now.getTime() + 24 * 60 * MINUTE_MS).toISOString();
  }
  // Non-salah: use reminder_time + days_of_week
  if (!reminder.reminder_time) return new Date(now.getTime() + 24 * 60 * MINUTE_MS).toISOString();
  const timeText = String(reminder.reminder_time).slice(0, 5);
  const days = Array.isArray(reminder.days_of_week) ? reminder.days_of_week : null;
  return getNextReminderAt(timeText, tz, days, now).toISOString();
}
