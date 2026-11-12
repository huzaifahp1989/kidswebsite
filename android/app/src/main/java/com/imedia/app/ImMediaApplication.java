package com.imedia.app;

import android.app.Application;

import com.bumptech.glide.Glide;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class ImMediaApplication extends Application {
    // Must match the website / reminders backend (VITE_ONESIGNAL_APP_ID) so that
    // notifications sent from the backend reach Android app users too.
    private static final String ONESIGNAL_APP_ID = "0bb81263-a5f5-4fd8-8786-d71f43a43725";

    @Override
    public void onCreate() {
        super.onCreate();

        if (BuildConfig.DEBUG) {
            OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);
        }

        OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        try {
            Glide.get(this).trimMemory(level);
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        try {
            Glide.get(this).clearMemory();
        } catch (Exception ignored) {
        }
    }
}
