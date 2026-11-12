package com.imedia.app;

import android.app.Activity;
import android.webkit.JavascriptInterface;

import androidx.core.app.NotificationManagerCompat;

/**
 * JS bridge that lets the web app schedule reminders as real on-device
 * notifications. This works without push: the alarm is stored by the OS and the
 * notification is raised locally, so no Firebase / OneSignal subscription is
 * required.
 */
public class ReminderAlarmBridge {
    private final Activity activity;

    public ReminderAlarmBridge(Activity activity) {
        this.activity = activity;
    }

    /**
     * Schedules (or replaces) a repeating reminder.
     *
     * @param key      stable identifier for the reminder (its database id or category)
     * @param daysCsv  comma-separated weekdays (0=Sunday..6=Saturday); empty = every day
     */
    @JavascriptInterface
    public boolean scheduleReminder(String key, String title, String message,
                                    int hour, int minute, String daysCsv) {
        if (key == null || key.isEmpty()) return false;
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
        try {
            ReminderAlarmReceiver.schedule(activity, key, title, message, hour, minute, daysCsv);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void cancelReminder(String key) {
        try {
            ReminderAlarmReceiver.cancel(activity, key);
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void showTestNotification(String title, String message) {
        ReminderAlarmReceiver.showTestNotification(activity, title, message);
    }

    @JavascriptInterface
    public boolean areNotificationsEnabled() {
        return NotificationManagerCompat.from(activity).areNotificationsEnabled();
    }
}
