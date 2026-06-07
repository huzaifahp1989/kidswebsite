package com.imedia.app;

import android.app.Activity;
import android.webkit.JavascriptInterface;

import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import com.google.android.gms.tasks.Task;

public class ReviewJsBridge {
    private final Activity activity;

    public ReviewJsBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void requestReview() {
        activity.runOnUiThread(() -> {
            ReviewManager manager = ReviewManagerFactory.create(activity);
            Task<ReviewInfo> request = manager.requestReviewFlow();
            request.addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    ReviewInfo reviewInfo = task.getResult();
                    Task<Void> flow = manager.launchReviewFlow(activity, reviewInfo);
                    // Do not inform the user of the result — API requirement
                    flow.addOnCompleteListener(flowTask -> {
                        // Continue normal app flow regardless of result
                    });
                }
                // Silently ignore errors — do not show any UI to the user
            });
        });
    }
}
