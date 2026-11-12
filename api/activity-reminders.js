import { supabaseAdmin } from "../src/utils/supabase-admin.js";
import { DAILY_MISSIONS } from "../src/constants/dailyMissions.js";
import { getLocalDate, getNextReminderAt } from "../src/utils/activityReminderSchedule.js";
import process from "node:process";

const MISSION_BY_ID = new Map(DAILY_MISSIONS.map((mission) => [mission.id, mission]));
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";
const APP_URL = "https://imediackids.com/DailyMissions";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (error) {
      error.status = 400;
      return Promise.reject(error);
    }
  }
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        error.status = 400;
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function getRequestUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function validateMission(activityId) {
  const mission = MISSION_BY_ID.get(String(activityId || ""));
  if (!mission) {
    const error = new Error("Choose a valid daily mission.");
    error.status = 400;
    throw error;
  }
  return mission;
}

function validateReminderTime(time, timeZone) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ""))) {
    const error = new Error("Choose a valid reminder time.");
    error.status = 400;
    throw error;
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    const error = new Error("Choose a valid time zone.");
    error.status = 400;
    throw error;
  }
}

async function requireReminderUser(req, res) {
  const user = await getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Sign in to manage activity reminders." });
    return null;
  }
  return user;
}

async function sendPushReminder(reminder) {
  const appId = String(process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || "0bb81263-a5f5-4fd8-8786-d71f43a43725").trim();
  const apiKey = String(process.env.ONESIGNAL_REST_API_KEY || "").trim();
  if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY is not configured on the server.");

  const response = await fetch(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: [reminder.user_id] },
      headings: { en: `A reminder for today: ${reminder.activity_title}` },
      contents: { en: "Your daily mission is waiting. Complete it today to keep earning points!" },
      url: APP_URL,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.errors?.[0] || result.error || `OneSignal request failed (${response.status}).`);
  }
  return result;
}

async function handleDispatch(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed." });
  const expectedSecret = String(process.env.REMINDER_CRON_SECRET || "").trim();
  if (!expectedSecret) {
    return sendJson(res, 503, { error: "REMINDER_CRON_SECRET is not configured on the server." });
  }
  const receivedSecret = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (receivedSecret !== expectedSecret) return sendJson(res, 401, { error: "Unauthorized." });

  const now = new Date();
  const nowIso = now.toISOString();
  const leaseUntil = new Date(now.getTime() + 2 * 60_000).toISOString();
  const { data: dueReminders, error } = await supabaseAdmin
    .from("activity_reminders")
    .select("*")
    .eq("active", true)
    .lte("next_reminder_at", nowIso)
    .or(`dispatch_lease_until.is.null,dispatch_lease_until.lt.${nowIso}`)
    .order("next_reminder_at", { ascending: true })
    .limit(100);
  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  const failures = [];
  for (const reminder of dueReminders || []) {
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("activity_reminders")
      .update({ dispatch_lease_until: leaseUntil })
      .eq("id", reminder.id)
      .eq("active", true)
      .lte("next_reminder_at", nowIso)
      .or(`dispatch_lease_until.is.null,dispatch_lease_until.lt.${nowIso}`)
      .select("*")
      .maybeSingle();
    if (claimError) {
      failures.push({ reminderId: reminder.id, error: claimError.message });
      continue;
    }
    if (!claimed) continue;

    try {
      const dispatchReference = new Date(
        Math.max(now.getTime(), new Date(claimed.next_reminder_at).getTime()) + 1_000,
      );
      const nextReminderAt = getNextReminderAt(
        claimed.reminder_time.slice(0, 5),
        claimed.time_zone,
        dispatchReference,
      );
      const completedToday = claimed.completed_on === getLocalDate(now, claimed.time_zone);
      if (!completedToday) {
        await sendPushReminder(claimed);
        sent += 1;
      } else {
        skipped += 1;
      }
      const { error: updateError } = await supabaseAdmin
        .from("activity_reminders")
        .update({
          next_reminder_at: nextReminderAt,
          dispatch_lease_until: null,
          updated_at: nowIso,
        })
        .eq("id", claimed.id);
      if (updateError) throw updateError;
    } catch (dispatchError) {
      const { error: releaseError } = await supabaseAdmin
        .from("activity_reminders")
        .update({ dispatch_lease_until: null })
        .eq("id", claimed.id);
      if (releaseError) {
        console.error("Could not release activity reminder lease:", claimed.id, releaseError);
      }
      failures.push({ reminderId: claimed.id, error: dispatchError.message });
      console.error("Activity reminder dispatch failed:", claimed.id, dispatchError);
    }
  }

  sendJson(res, 200, { processed: sent + skipped, sent, skipped, failures });
}

export async function handleActivityRemindersRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname === "/api/reminders/dispatch") return await handleDispatch(req, res);

    const user = await requireReminderUser(req, res);
    if (!user) return;

    if (pathname === "/api/reminders/complete") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed." });
      const body = await readBody(req);
      const mission = validateMission(body.activityId);
      const { data: reminder, error: selectError } = await supabaseAdmin
        .from("activity_reminders")
        .select("id,time_zone")
        .eq("user_id", user.id)
        .eq("activity_id", mission.id)
        .eq("active", true)
        .maybeSingle();
      if (selectError) throw selectError;
      if (!reminder) return sendJson(res, 200, { ok: true, reminderConfigured: false });
      const completedOn = getLocalDate(new Date(), reminder.time_zone);
      const { error } = await supabaseAdmin
        .from("activity_reminders")
        .update({ completed_on: completedOn, updated_at: new Date().toISOString() })
        .eq("id", reminder.id);
      if (error) throw error;
      return sendJson(res, 200, { ok: true, reminderConfigured: true });
    }

    if (pathname !== "/api/reminders") return sendJson(res, 404, { error: "Not found." });

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("activity_reminders")
        .select("activity_id,activity_title,reminder_time,time_zone,next_reminder_at")
        .eq("user_id", user.id)
        .eq("active", true);
      if (error) throw error;
      return sendJson(res, 200, {
        reminders: (data || []).map((row) => ({
          activityId: row.activity_id,
          activityTitle: row.activity_title,
          reminderTime: row.reminder_time.slice(0, 5),
          timeZone: row.time_zone,
          nextReminderAt: row.next_reminder_at,
        })),
      });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const mission = validateMission(body.activityId);
      const timeZone = String(body.timeZone || "").trim();
      const reminderTime = String(body.reminderTime || "").trim();
      validateReminderTime(reminderTime, timeZone);
      const now = new Date().toISOString();
      const today = getLocalDate(new Date(now), timeZone);
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("activity_reminders")
        .select("completed_on")
        .eq("user_id", user.id)
        .eq("activity_id", mission.id)
        .maybeSingle();
      if (existingError) throw existingError;
      const { data, error } = await supabaseAdmin
        .from("activity_reminders")
        .upsert(
          {
            user_id: user.id,
            activity_id: mission.id,
            activity_title: mission.title,
            reminder_time: reminderTime,
            time_zone: timeZone,
            next_reminder_at: getNextReminderAt(reminderTime, timeZone),
            completed_on: existing?.completed_on === today ? today : null,
            dispatch_lease_until: null,
            active: true,
            updated_at: now,
          },
          { onConflict: "user_id,activity_id" },
        )
        .select("activity_id,activity_title,reminder_time,time_zone,next_reminder_at")
        .single();
      if (error) throw error;
      return sendJson(res, 200, { ok: true, reminder: data });
    }

    if (req.method === "DELETE") {
      const mission = validateMission(url.searchParams.get("activityId"));
      const { error } = await supabaseAdmin
        .from("activity_reminders")
        .delete()
        .eq("user_id", user.id)
        .eq("activity_id", mission.id);
      if (error) throw error;
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error("Activity reminders request failed:", error);
    return sendJson(res, status, { error: error?.message || "Unexpected reminder error." });
  }
}
