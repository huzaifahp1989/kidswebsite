import { createClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from "@/utils/supabase-public-config";

/**
 * Community worship tracker (Durood + Qur'an Juz).
 *
 * Reads and writes the shared Supabase master database that the website and the
 * mobile app both use, so an entry added here appears everywhere.
 */

let worshipClient = null;

/**
 * Prefer the app's shared client. Fall back to resolving the public Supabase
 * config the same way the rest of the app does, so the tracker still works in a
 * build where VITE_SUPABASE_* is not set.
 */
export function getWorshipClient() {
  if (supabase) return supabase;
  if (worshipClient) return worshipClient;

  try {
    const url = resolvePublicSupabaseUrl();
    const key = resolvePublicSupabaseAnonKey();
    worshipClient = url && key ? createClient(url, key) : null;
  } catch (error) {
    console.warn("Community worship: could not create a Supabase client:", error);
    worshipClient = null;
  }

  return worshipClient;
}

export function isWorshipConfigured() {
  return Boolean(getWorshipClient());
}

async function callRpc(name, args) {
  const client = getWorshipClient();
  if (!client) throw new Error("Community worship is not configured.");

  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message || "The request failed.");
  return data;
}

/** Unique per submission so a retry or double-tap can never double-count. */
export function newIdempotencyKey(prefix = "worship") {
  const unique =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${unique}`;
}

/** '10' -> 'October 2026'. Returns null when there is nothing honest to show. */
export function formatCampaignMonth(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** Formats one instant as 'Fri 23 Oct' in the given zone. */
function formatWeekDay(value, timeZone) {
  const raw = String(value);
  const parsed = new Date(raw.length <= 10 ? `${raw.slice(0, 10)}T00:00:00Z` : raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(parsed);
}

/**
 * Week label for the current Friday-Thursday durood week, e.g.
 * 'Fri 23 Oct – Thu 29 Oct'. Jumu'ah starts the week, so the range runs
 * Friday -> Thursday rather than Monday -> Sunday.
 *
 * Accepts the campaign_week_start timestamp and, optionally, the exclusive
 * campaign_week_end timestamp from the database. The end marks the Friday
 * 00:00 that opens the next week, so the final day shown is the moment just
 * before it. When no end is supplied it is assumed to be start + 7 days.
 */
export function formatCampaignWeek(value, endValue) {
  if (!value) return null;

  const raw = String(value);
  const startZone = raw.length <= 10 ? "UTC" : "Europe/London";
  const startLabel = formatWeekDay(value, startZone);
  if (!startLabel) return null;

  const endRaw = endValue ? String(endValue) : null;
  let lastDayValue;
  let endZone = "Europe/London";

  if (endRaw) {
    // An exclusive end: step back a millisecond (full timestamp) or a whole
    // calendar day (a plain date) to land on the last day of the week.
    const parsedEnd = new Date(
      endRaw.length <= 10 ? `${endRaw.slice(0, 10)}T00:00:00Z` : endRaw
    );
    if (Number.isNaN(parsedEnd.getTime())) return null;
    endZone = endRaw.length <= 10 ? "UTC" : "Europe/London";
    lastDayValue = new Date(parsedEnd.getTime() - (endRaw.length <= 10 ? 86400000 : 1));
  } else {
    const parsedStart = new Date(
      raw.length <= 10 ? `${raw.slice(0, 10)}T00:00:00Z` : raw
    );
    lastDayValue = new Date(parsedStart.getTime() + 6 * 86400000);
    endZone = startZone;
  }

  const endLabel = formatWeekDay(lastDayValue.toISOString(), endZone);
  if (!endLabel) return null;

  return `${startLabel} – ${endLabel}`;
}

// --------------------------------------------------------------------------
// Reads
// --------------------------------------------------------------------------

export const fetchCommunityDuroodStats = () =>
  callRpc("get_community_durood_stats", {});

export const fetchCommunityJuzStats = () => callRpc("get_community_juz_stats", {});

export const fetchDuroodLeaderboard = (period = "all", limit = 10) =>
  callRpc("get_durood_leaderboard", { p_period: period, p_limit: limit, p_offset: 0 });

export const fetchJuzLeaderboard = (period = "all", limit = 10) =>
  callRpc("get_juz_leaderboard", { p_period: period, p_limit: limit, p_offset: 0 });

/** How the current Friday-to-Thursday Qur'an drive is going. */
export const fetchWeeklyQuranCompletionStats = () =>
  callRpc("get_weekly_quran_completion_stats", {});

/** The most recent public dua requests, newest first. */
export const fetchDuaRequests = (limit = 3) =>
  callRpc("get_dua_requests", { p_limit: limit });

// --------------------------------------------------------------------------
// Writes
// --------------------------------------------------------------------------

export const recordDuroodCompletion = ({ count, displayName, idempotencyKey }) =>
  callRpc("record_durood_completion", {
    p_count: count,
    p_pledge_id: null,
    p_display_name: displayName,
    p_idempotency_key: idempotencyKey,
  });

export const recordQuranJuz = ({ juzNumber, displayName, idempotencyKey }) =>
  callRpc("record_quran_juz", {
    p_display_name: displayName,
    p_juz_number: juzNumber,
    p_idempotency_key: idempotencyKey,
  });

/**
 * Join this week's Qur'an completion drive. Idempotent per person per week, so
 * a reload or a double tap never inflates the list of participants.
 */
export const joinQuranWeeklyCompletion = ({ displayName, idempotencyKey }) =>
  callRpc("join_quran_weekly_completion", {
    p_display_name: displayName,
    p_idempotency_key: idempotencyKey,
  });

/** Post a public "dua request for <name>" to the top of the tracker. */
export const addDuaRequest = ({ subjectName, message, idempotencyKey }) =>
  callRpc("add_dua_request", {
    p_subject_name: subjectName,
    p_message: message,
    p_idempotency_key: idempotencyKey,
  });

// --------------------------------------------------------------------------
// Undoing a mistake
//
// The keys are the ones handed to recordDuroodCompletion / recordQuranJuz and
// kept on this device, so a device can only ever remove rows it created.
// --------------------------------------------------------------------------

export const removeQuranJuzEntries = (idempotencyKeys = []) =>
  callRpc("remove_quran_juz_entries", { p_idempotency_keys: idempotencyKeys });

export const removeDuroodEntries = (idempotencyKeys = []) =>
  callRpc("remove_durood_entries", { p_idempotency_keys: idempotencyKeys });

export const removeDuaRequests = (idempotencyKeys = []) =>
  callRpc("remove_dua_requests", { p_idempotency_keys: idempotencyKeys });

// --------------------------------------------------------------------------
// Live updates
// --------------------------------------------------------------------------

const REALTIME_TABLES = [
  "durood_pledges",
  "durood_completions",
  "quran_khatam_completions",
  "quran_juz_logs",
];

/**
 * Subscribe to new worship entries from anyone, anywhere.
 * Returns an unsubscribe function.
 */
export function subscribeWorshipChanges(onChange) {
  const client = getWorshipClient();
  if (!client) return () => {};

  const channel = client.channel("community-worship");

  REALTIME_TABLES.forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table },
      (payload) => onChange(payload)
    );
  });

  channel.subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      // The socket may already be gone; nothing to clean up.
    }
  };
}
