package com.imedia.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.onesignal.Continue;
import com.onesignal.OneSignal;

public class NotificationsJsBridge {
    public static final int REQUEST_CODE = 9201;
    private final Activity activity;

    public NotificationsJsBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean areEnabled() {
        return NotificationManagerCompat.from(activity).areNotificationsEnabled();
    }

    @JavascriptInterface
    public void requestPermission() {
        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) return;
            if (NotificationManagerCompat.from(activity).areNotificationsEnabled()) {
                optInToOneSignal();
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                            activity,
                            new String[]{Manifest.permission.POST_NOTIFICATIONS},
                            REQUEST_CODE
                    );
                    return;
                }
            }

            openSettings();
        });
    }

    @JavascriptInterface
    public void optInToPush() {
        activity.runOnUiThread(this::optInToOneSignal);
    }

    @JavascriptInterface
    public void openSettings() {
        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) return;
            try {
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                    intent.putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + activity.getPackageName()));
                }
                activity.startActivity(intent);
            } catch (Exception ignored) {
            }
        });
    }

    void onAndroidPermissionResult() {
        if (NotificationManagerCompat.from(activity).areNotificationsEnabled()) {
            optInToOneSignal();
        }
    }

    private void optInToOneSignal() {
        try {
            OneSignal.getNotifications().requestPermission(true, Continue.none());
        } catch (Exception ignored) {
        }
    }
}
