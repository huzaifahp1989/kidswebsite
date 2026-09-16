package com.imedia.app;

import android.app.Application;

import com.bumptech.glide.Glide;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class ImMediaApplication extends Application {
    private static final String ONESIGNAL_APP_ID = "daf8fc36-781a-417d-8ee4-5078635f22e7";

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
