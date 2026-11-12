import { supabase } from "@/lib/supabase";

async function requestActivityReminders(path, options = {}) {
  if (!supabase) throw new Error("Reminders are unavailable because sign-in is not configured.");

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data?.session?.access_token;
  if (!accessToken) throw new Error("Sign in to manage activity reminders.");

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Reminder request failed (${response.status}).`);
  return result;
}

export async function listActivityReminders() {
  const result = await requestActivityReminders("/api/reminders");
  return result.reminders || [];
}

export function saveActivityReminder(activityId, reminderTime, timeZone) {
  return requestActivityReminders("/api/reminders", {
    method: "PUT",
    body: JSON.stringify({ activityId, reminderTime, timeZone }),
  });
}

export function removeActivityReminder(activityId) {
  return requestActivityReminders(`/api/reminders?activityId=${encodeURIComponent(activityId)}`, {
    method: "DELETE",
  });
}

export function markActivityReminderCompleted(activityId) {
  return requestActivityReminders("/api/reminders/complete", {
    method: "POST",
    body: JSON.stringify({ activityId }),
  });
}
