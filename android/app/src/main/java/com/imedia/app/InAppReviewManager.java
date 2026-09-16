package com.imedia.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;

import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/** Owns Google Play review eligibility, local history, and review presentation. */
public final class InAppReviewManager {
    private static final String TAG = "InAppReview";
    private static final String PREFS_NAME = "in_app_review_history";
    private static final String KEY_FIRST_OPENED_AT = "first_opened_at";
    private static final String KEY_OPEN_COUNT = "open_count";
    private static final String KEY_LAST_PROMPTED_AT = "last_prompted_at";
    private static final String KEY_LAST_PROMPT_REASON = "last_prompt_reason";
    private static final String PLAY_STORE_APP_ID = "com.wnapp.id1761553570260";
    private static final int MINIMUM_OPEN_COUNT = 5;
    private static final long MINIMUM_APP_AGE_MS = 7L * 24L * 60L * 60L * 1000L;
    private static final long PROMPT_COOLDOWN_MS = 90L * 24L * 60L * 60L * 1000L;

    private final Activity activity;
    private final SharedPreferences preferences;
    private final ReviewManager reviewManager;

    /** Creates a reusable manager tied to the current activity. */
    public InAppReviewManager(Activity activity) {
        this.activity = activity;
        this.preferences = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.reviewManager = ReviewManagerFactory.create(activity);
    }

    /** Records one application launch and establishes the first-use timestamp. */
    public void recordAppOpen() {
        long now = System.currentTimeMillis();
        int openCount = preferences.getInt(KEY_OPEN_COUNT, 0) + 1;
        SharedPreferences.Editor editor = preferences.edit().putInt(KEY_OPEN_COUNT, openCount);
        if (!preferences.contains(KEY_FIRST_OPENED_AT)) {
            editor.putLong(KEY_FIRST_OPENED_AT, now);
        }
        editor.apply();
        Log.d(TAG, "App open recorded. count=" + openCount);
    }

    /** Requests a review when all local eligibility requirements are satisfied. */
    public void requestInAppReview(String reason) {
        activity.runOnUiThread(() -> requestOnUiThread(reason));
    }

    /** Evaluates eligibility and starts either Play review or the non-Play fallback. */
    private void requestOnUiThread(String reason) {
        if (activity.isFinishing() || activity.isDestroyed()) {
            Log.d(TAG, "Review skipped because the activity is unavailable.");
            return;
        }
        if (!isEligible()) return;

        // Sideloaded builds cannot use the Play review flow, so open the listing instead.
        if (!isInstalledFromGooglePlay()) {
            Log.d(TAG, "Non-Play install detected; opening the Play Store listing.");
            markPromptAttempt(reason);
            openPlayStoreReviewPage();
            return;
        }

        // A successful launch task does not guarantee that Google will display a dialog.
        Log.d(TAG, "Requesting Google Play review flow. reason=" + reason);
        reviewManager.requestReviewFlow().addOnCompleteListener(requestTask -> {
            if (!requestTask.isSuccessful()) {
                Log.w(TAG, "ReviewInfo request failed; continuing normally.", requestTask.getException());
                return;
            }
            ReviewInfo reviewInfo = requestTask.getResult();
            markPromptAttempt(reason);
            reviewManager.launchReviewFlow(activity, reviewInfo).addOnCompleteListener(launchTask ->
                Log.d(TAG, "Review flow completed; dialog display is controlled by Google Play."));
        });
    }

    /** Checks launch count, app age, and the 90-day prompt cooldown. */
    private boolean isEligible() {
        long now = System.currentTimeMillis();
        int openCount = preferences.getInt(KEY_OPEN_COUNT, 0);
        long firstOpenedAt = preferences.getLong(KEY_FIRST_OPENED_AT, now);
        long lastPromptedAt = preferences.getLong(KEY_LAST_PROMPTED_AT, 0L);
        boolean enoughOpens = openCount >= MINIMUM_OPEN_COUNT;
        boolean oldEnough = now - firstOpenedAt >= MINIMUM_APP_AGE_MS;
        boolean cooldownComplete = lastPromptedAt == 0L || now - lastPromptedAt >= PROMPT_COOLDOWN_MS;
        Log.d(TAG, "Eligibility opens=" + openCount + "/" + MINIMUM_OPEN_COUNT
            + " ageDays=" + ((now - firstOpenedAt) / (24L * 60L * 60L * 1000L))
            + " cooldownComplete=" + cooldownComplete);
        if (!enoughOpens || !oldEnough || !cooldownComplete) {
            Log.d(TAG, "Review skipped because local eligibility requirements are not met.");
            return false;
        }
        return true;
    }

    /** Persists prompt history before handing control to Google Play. */
    private void markPromptAttempt(String reason) {
        preferences.edit()
            .putLong(KEY_LAST_PROMPTED_AT, System.currentTimeMillis())
            .putString(KEY_LAST_PROMPT_REASON, reason == null ? "unknown" : reason)
            .apply();
    }

    /** Returns true only when Google Play installed this application. */
    private boolean isInstalledFromGooglePlay() {
        try {
            String installer;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                installer = activity.getPackageManager()
                    .getInstallSourceInfo(activity.getPackageName())
                    .getInstallingPackageName();
            } else {
                installer = activity.getPackageManager().getInstallerPackageName(activity.getPackageName());
            }
            return "com.android.vending".equals(installer);
        } catch (PackageManager.NameNotFoundException exception) {
            Log.w(TAG, "Unable to determine install source.", exception);
            return false;
        }
    }

    /** Opens the app's review page in Play Store, with a browser fallback. */
    public void openPlayStoreReviewPage() {
        Uri marketUri = Uri.parse("market://details?id=" + PLAY_STORE_APP_ID);
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, marketUri);
            intent.setPackage("com.android.vending");
            activity.startActivity(intent);
        } catch (Exception exception) {
            Uri webUri = Uri.parse("https://play.google.com/store/apps/details?id=" + PLAY_STORE_APP_ID + "&hl=en_GB");
            activity.startActivity(new Intent(Intent.ACTION_VIEW, webUri));
        }
    }
}