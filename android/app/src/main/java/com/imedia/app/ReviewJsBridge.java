package com.imedia.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;

public class ReviewJsBridge {
    private final Activity activity;

    public ReviewJsBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void openPlayStore() {
        openPlayStoreListing();
    }

    /** Backwards compatible with older web builds. */
    @JavascriptInterface
    public void requestReview() {
        openPlayStoreListing();
    }

    private void openPlayStoreListing() {
        activity.runOnUiThread(() -> {
            String packageName = activity.getPackageName();
            try {
                Intent marketIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + packageName)
                );
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(marketIntent);
            } catch (ActivityNotFoundException e) {
                Intent webIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + packageName)
                );
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(webIntent);
            }
        });
    }
}
