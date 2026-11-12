package com.imedia.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Calendar;

/**
 * Fires the locally-scheduled reminders for the web app. The page (running in the
 * WebView) registers each enabled reminder through {@link ReminderAlarmBridge};
 * this receiver shows the notification and re-arms itself for the next
 * occurrence, so reminders keep working with no push subscription, Firebase or
 * network connection.
 */
public class ReminderAlarmReceiver extends BroadcastReceiver {
    static final String EXTRA_KEY = "reminder_key";
    static final String EXTRA_TITLE = "reminder_title";
    static final String EXTRA_MESSAGE = "reminder_message";
    static final String EXTRA_HOUR = "reminder_hour";
    static final String EXTRA_MINUTE = "reminder_minute";
    static final String EXTRA_DAYS = "reminder_days";

    private static final String CHANNEL_ID = "imedia_reminders";
    private static final int TEST_NOTIFICATION_ID = 9701;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String key = intent.getStringExtra(EXTRA_KEY);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String message = intent.getStringExtra(EXTRA_MESSAGE);
        int hour = intent.getIntExtra(EXTRA_HOUR, -1);
        int minute = intent.getIntExtra(EXTRA_MINUTE, 0);
        String daysCsv = intent.getStringExtra(EXTRA_DAYS);

        post(context, notificationId(key), title, message);

        // Re-arm for the next occurrence so daily/weekly reminders repeat.
        if (hour >= 0) {
            try {
                schedule(context, key, title, message, hour, minute, daysCsv);
            } catch (Exception ignored) {
            }
        }
    }

    static void schedule(Context context, String key, String title, String message,
                         int hour, int minute, String daysCsv) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null || key == null || key.isEmpty()) return;

        long triggerAt = nextTriggerMillis(hour, minute, parseDays(daysCsv));
        Intent intent = buildIntent(context, key, title, message, hour, minute, daysCsv);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId(key),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Exact alarms need SCHEDULE_EXACT_ALARM, which Android 12+ may deny.
        // Fall back to an inexact alarm so the reminder still fires.
        boolean canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S
                || alarmManager.canScheduleExactAlarms();
        try {
            if (canExact) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            }
        } catch (SecurityException e) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
    }

    static void cancel(Context context, String key) {
        if (key == null || key.isEmpty()) return;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        Intent intent = new Intent(context, ReminderAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId(key),
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    }

    static void showTestNotification(Context context, String title, String message) {
        post(context, TEST_NOTIFICATION_ID, title, message);
    }

    static void post(Context context, int id, String title, String message) {
        try {
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
            ensureChannel(context);

            Intent open = new Intent(context, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent contentIntent = PendingIntent.getActivity(
                    context,
                    id,
                    open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            String safeMessage = message == null ? "" : message;
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(title == null || title.isEmpty() ? "Reminder" : title)
                    .setContentText(safeMessage)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(safeMessage))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(contentIntent);

            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException ignored) {
        } catch (Exception ignored) {
        }
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Reminders",
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Daily Islamic reminders, adhkar and Quran reading.");
        manager.createNotificationChannel(channel);
    }

    private static Intent buildIntent(Context context, String key, String title, String message,
                                      int hour, int minute, String daysCsv) {
        Intent intent = new Intent(context, ReminderAlarmReceiver.class);
        intent.putExtra(EXTRA_KEY, key);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_MESSAGE, message);
        intent.putExtra(EXTRA_HOUR, hour);
        intent.putExtra(EXTRA_MINUTE, minute);
        intent.putExtra(EXTRA_DAYS, daysCsv);
        return intent;
    }

    /** Stable notification / PendingIntent id derived from the reminder key. */
    private static int notificationId(String key) {
        if (key == null || key.isEmpty()) return 0;
        return 1000 + (key.hashCode() & 0x7fffffff) % 100000;
    }

    /** Next time today (or on the next matching weekday) at hour:minute. */
    private static long nextTriggerMillis(int hour, int minute, int[] days) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }
        if (days != null && days.length > 0) {
            int guard = 0;
            // Calendar.DAY_OF_WEEK is 1 (Sunday) .. 7 (Saturday); the web app sends 0..6.
            while (!contains(days, calendar.get(Calendar.DAY_OF_WEEK) - 1) && guard < 7) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
                guard++;
            }
        }
        return calendar.getTimeInMillis();
    }

    private static int[] parseDays(String daysCsv) {
        if (daysCsv == null || daysCsv.trim().isEmpty()) return new int[0];
        String[] parts = daysCsv.split(",");
        int[] days = new int[parts.length];
        int count = 0;
        for (String part : parts) {
            try {
                int day = Integer.parseInt(part.trim());
                if (day >= 0 && day <= 6) days[count++] = day;
            } catch (NumberFormatException ignored) {
            }
        }
        if (count == parts.length) return days;
        int[] trimmed = new int[count];
        System.arraycopy(days, 0, trimmed, 0, count);
        return trimmed;
    }

    private static boolean contains(int[] values, int target) {
        for (int value : values) {
            if (value == target) return true;
        }
        return false;
    }
}
