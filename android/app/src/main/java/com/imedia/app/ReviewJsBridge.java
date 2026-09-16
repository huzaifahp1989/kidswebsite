package com.imedia.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;

/** Exposes native review and external-link actions to the trusted app WebView. */
public class ReviewJsBridge {
    private final Activity activity;
    private final InAppReviewManager inAppReviewManager;

    /** Creates a bridge backed by the shared native review manager. */
    public ReviewJsBridge(Activity activity, InAppReviewManager inAppReviewManager) {
        this.activity = activity;
        this.inAppReviewManager = inAppReviewManager;
    }

    @JavascriptInterface
    public void openExternalUrl(String url) {
        if (url == null || url.trim().isEmpty()) return;
        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) return;
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(intent);
            } catch (Exception ignored) {
            }
        });
    }

    @JavascriptInterface
    public void openPlayStore() {
        // An explicit user action opens the listing without automatic-prompt eligibility gates.
        activity.runOnUiThread(inAppReviewManager::openPlayStoreReviewPage);
    }

    /** Requests an eligible in-app review for the supplied engagement event. */
    @JavascriptInterface
    public void requestInAppReview(String reason) {
        inAppReviewManager.requestInAppReview(reason);
    }

    /** Keeps compatibility with previously deployed web bundles. */
    @JavascriptInterface
    public void requestReview() {
        requestInAppReview("legacy_request");
    }
}
