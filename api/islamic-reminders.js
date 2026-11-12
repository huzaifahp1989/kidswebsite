/**
 * Islamic reminders server endpoints.
 * CRUD for `reminders` is handled directly by the Supabase client (RLS-protected).
 * This module only exposes server-authenticated actions that need secrets:
 *   POST /api/islamic-reminders/test  -> send a test push to the signed-in user
 */

import { supabaseAdmin } from "../src/utils/supabase-admin.js";

const ONESIGNAL_API = "https://api.onesignal.com/notifications";

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

async function sendTestPush(userId, category, onesignalId) {
  const appId = String(
    process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || "0bb81263-a5f5-4fd8-8786-d71f43a43725"
  ).trim();
  const apiKey = String(process.env.ONESIGNAL_REST_API_KEY || "").trim();
  if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY is not configured on the server.");

  const titles = {
    daily_islamic: "Test: Daily Islamic Reminder",
    morning_adhkar: "Test: Morning Adhkar",
    evening_adhkar: "Test: Evening Adhkar",
    quran_reading: "Test: Quran Reading",
    hifz_revision: "Test: Hifz Revision",
    salah: "Test: Salah Reminder",
    friday: "Test: Friday Reminder",
    events_competitions: "Test: Events & Competitions",
    new_content: "Test: New Content",
    kids_quiz: "Test: Kids Zone Quiz",
    durood: "Test: Durood Shareef",
    quran_listen: "Test: Listen to Quran",
    custom: "Test: Custom Reminder",
  };
  const title = titles[category] || "Test Reminder";
  const message =
    "This is a test notification from Islam Media Central. If you can see this, your reminders are working.";

  // Target by external_id (signed-in user) OR by player ID / OneSignal user ID (anonymous user)
  const targets = [];
  if (onesignalId) {
    targets.push({ include_player_ids: [onesignalId] });
    targets.push({ include_aliases: { onesignal_id: [onesignalId] } });
  } else {
    targets.push({ include_aliases: { external_id: [userId] } });
  }

  const basePayload = {
    app_id: appId,
    target_channel: "push",
    headings: { en: title },
    contents: { en: message },
    url: "https://imediackids.com/Home",
  };

  let lastError = null;
  for (const target of targets) {
    const response = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ...basePayload, ...target }),
    });

    const result = await response.json().catch(() => ({}));
    if (response.ok && result.id) {
      return result;
    }
    lastError = result.errors?.[0] || result.error || `OneSignal request failed (${response.status}).`;
  }

  throw new Error(lastError || "Failed to send test push.");
}

export async function handleIslamicRemindersRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "");

    const user = await getRequestUser(req);

    if (pathname === "/api/islamic-reminders/test" && req.method === "POST") {
      const body = await readBody(req);
      const category = String(body.category || "custom").trim();
      const onesignalId = String(body.onesignal_id || "").trim() || null;

      // Anonymous users: need a onesignal_id. Signed-in users: use their id.
      if (!user && !onesignalId) {
        return sendJson(res, 401, { error: "Sign in or enable notifications to test reminders." });
      }

      const result = await sendTestPush(user?.id, category, onesignalId);
      return sendJson(res, 200, {
        ok: true,
        id: result.id,
        recipients: result.recipients,
        externalId: user?.id || null,
        onesignalId,
      });
    }

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error("Islamic reminders request failed:", error);
    return sendJson(res, status, { error: error?.message || "Unexpected reminder error." });
  }
}

export default handleIslamicRemindersRequest;
