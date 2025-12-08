package com.imedia.app;

import android.content.Context;
import android.content.Intent;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.webkit.JavascriptInterface;

import java.util.Calendar;

public class AlarmJsBridge {
    private final Context context;

    public AlarmJsBridge(Context ctx) {
        this.context = ctx;
    }

    @JavascriptInterface
    public void schedule(String time, String soundUrl) {
        String[] parts = time.split(":");
        int h = Integer.parseInt(parts[0]);
        int m = Integer.parseInt(parts[1]);

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, h);
        cal.set(Calendar.MINUTE, m);
        cal.set(Calendar.SECOND, 0);

        long triggerAt = cal.getTimeInMillis();
        long now = System.currentTimeMillis();
        if (triggerAt <= now) triggerAt += 24 * 60 * 60 * 1000;

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("soundUrl", soundUrl);
        PendingIntent pi = PendingIntent.getBroadcast(context, 1001, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
    }
}
