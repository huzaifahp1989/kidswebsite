import { supabase } from "@/lib/supabase";
import { getOneSignalSubscriptionId } from "@/utils/oneSignal";
import { getAndroidPushId } from "@/utils/androidWebView";

/**
 * Islamic reminders client.
 * CRUD goes directly through Supabase (RLS enforces user isolation).
 * The test-notification call goes to the server endpoint (needs OneSignal key).
 */

async function getAccessToken() {
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data?.session?.access_token;
  if (!accessToken) throw new Error("Sign in to manage reminders.");
  return accessToken;
}

export async function listReminders() {
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .order("category", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertReminder(reminder) {
  if (!supabase) throw new Error("Sign-in is not configured.");
  const save = (payload) =>
    supabase.from("reminders").upsert(payload, { onConflict: "id" }).select("*").single();

  let { data, error } = await save(reminder);

  // The shared `reminders` table carries a legacy NOT NULL `due_date` column
  // (with no default) from another app. Our payloads omit it, which violates
  // the constraint (23502). Supply a value derived from the next occurrence
  // and retry once. Only runs when the column actually exists.
  if (error && error.code === "23502" && /due_date/i.test(error.message || "")) {
    const dueDate = (reminder.next_occurrence_at || new Date().toISOString()).slice(0, 10);
    ({ data, error } = await save({ ...reminder, due_date: dueDate }));
  }

  if (error) throw error;
  return data;
}

export async function deleteReminder(id) {
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function listDeliveryLogs(limit = 20) {
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { data, error } = await supabase
    .from("reminder_delivery_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function sendTestNotification(category = "custom") {
  const accessToken = await getAccessToken().catch(() => null);
  // Prefer the native Android subscription ID — the WebView has no web push
  // subscription, so targeting it would never deliver inside the app.
  const onesignalId =
    getAndroidPushId() || (await getOneSignalSubscriptionId().catch(() => null));

  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch("/api/islamic-reminders/test", {
    method: "POST",
    headers,
    body: JSON.stringify({ category, onesignal_id: onesignalId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Test notification failed (${response.status}).`);
  return result;
}
