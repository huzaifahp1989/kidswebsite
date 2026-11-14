package com.imedia.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Foreground service that rings a reminder's alarm sound in the background.
 *
 * {@link ReminderAlarmReceiver} starts this when a scheduled reminder fires,
 * so the reminder rings even when the app is closed or the screen is off.
 * The sound loops on the alarm audio stream until the user dismisses the
 * notification, the in-app "stop" action runs, or the safety timeout ends.
 */
public class AudioService extends Service {
    public static final String ACTION_START = "com.imedia.app.action.START_ALARM";
    public static final String ACTION_STOP = "com.imedia.app.action.STOP_ALARM";

    static final String EXTRA_TITLE = "alarm_title";
    static final String EXTRA_MESSAGE = "alarm_message";
    static final String EXTRA_SOUND_URL = "alarm_sound_url";

    private static final String TAG = "AudioService";
    private static final String CHANNEL_ID = "imedia_alarms";
    private static final int SERVICE_NOTIFICATION_ID = 9801;
    /** Stop ringing by itself if the user never dismisses the alarm. */
    private static final long MAX_PLAY_MS = 5L * 60L * 1000L;

    private MediaPlayer mediaPlayer;
    private boolean prepared = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutRunnable = new Runnable() {
        @Override
        public void run() {
            stopSelf();
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        String message = intent != null ? intent.getStringExtra(EXTRA_MESSAGE) : null;
        String soundUrl = intent != null ? intent.getStringExtra(EXTRA_SOUND_URL) : null;

        startForeground(SERVICE_NOTIFICATION_ID, buildNotification(title, message));
        playSound(soundUrl);

        handler.removeCallbacks(timeoutRunnable);
        handler.postDelayed(timeoutRunnable, MAX_PLAY_MS);
        return START_NOT_STICKY;
    }

    private void playSound(String url) {
        stopSound();
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build());

            String u = url == null ? "" : url.trim();
            if (u.isEmpty() || u.equalsIgnoreCase("SYSTEM_ALARM")) {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                mediaPlayer.setDataSource(this, uri);
            } else if (u.equalsIgnoreCase("SYSTEM_NOTIFICATION")) {
                mediaPlayer.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
            } else if (u.equalsIgnoreCase("SYSTEM_RINGTONE")) {
                mediaPlayer.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
            } else {
                mediaPlayer.setDataSource(u);
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.setOnPreparedListener(mp -> {
                prepared = true;
                try { mp.start(); } catch (Exception ignored) { }
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopSelf();
                return true;
            });
            mediaPlayer.prepareAsync();
        } catch (Exception e) {
            Log.w(TAG, "Could not play reminder sound", e);
            stopSelf();
        }
    }

    private Notification buildNotification(String title, String message) {
        ensureChannel();

        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent stop = new Intent(this, AudioService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(
                this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String text = message == null ? "" : message;
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title == null || title.isEmpty() ? "Reminder" : title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setOngoing(true)
                .setContentIntent(contentIntent)
                .addAction(0, "Stop", stopIntent)
                .build();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Reminder alarms", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Rings the alarm sound for your scheduled reminders.");
        // The sound is played by this service, so the channel stays silent.
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    private void stopSound() {
        if (mediaPlayer != null) {
            try {
                if (prepared) mediaPlayer.stop();
            } catch (Exception ignored) {
            }
            try { mediaPlayer.release(); } catch (Exception ignored) { }
            mediaPlayer = null;
            prepared = false;
        }
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(timeoutRunnable);
        stopSound();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
