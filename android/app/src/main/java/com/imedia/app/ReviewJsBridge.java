package com.imedia.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;

import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

public class ReviewJsBridge {
    private static final String PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.wnapp.id1761553570260&hl=en_GB";
    private final Activity activity;

    public ReviewJsBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void openPlayStore() {
        openPlayStoreListing();
    }

    @JavascriptInterface
    public void requestReview() {
        activity.runOnUiThread(() -> {
            try {
                ReviewManager manager = ReviewManagerFactory.create(activity);
                manager.requestReviewFlow().addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        ReviewInfo reviewInfo = task.getResult();
                        manager.launchReviewFlow(activity, reviewInfo).addOnCompleteListener(flowTask -> {
                            // Google decides whether the prompt is shown.
                            // After completion we do nothing.
                        });
                    } else {
                        openPlayStoreListing();
                    }
                });
            } catch (Exception ignored) {
                openPlayStoreListing();
            }
        });
    }

    private void openPlayStoreListing() {
        activity.runOnUiThread(() -> {
            try {
                Intent marketIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse(PLAY_STORE_URL)
                );
                marketIntent.setPackage("com.android.vending");
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(marketIntent);
            } catch (ActivityNotFoundException e) {
                Intent webIntent = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse(PLAY_STORE_URL)
                );
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(webIntent);
            }
        });
    }
}
