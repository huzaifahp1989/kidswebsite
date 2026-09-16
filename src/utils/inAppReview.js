import { isAndroidWebView } from "@/utils/androidWebView";

// Use the published Google Play listing for explicit review actions.
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.wnapp.id1761553570260&hl=en_GB";

// A radio session becomes a meaningful engagement event after ten minutes.
const RADIO_REVIEW_DELAY_MS = 10 * 60 * 1000;
const DONATION_PENDING_KEY = "review_donation_pending_at";

/** Requests the native review flow and lets Android enforce all eligibility rules. */
export function requestInAppReview(reason = "unknown") {
  console.info(`[InAppReview] Event received: ${reason}`);
  if (!isAndroidWebView()) {
    console.info("[InAppReview] Ignored outside the Android app.");
    return false;
  }
  try {
    if (typeof window.AndroidReview?.requestInAppReview === "function") {
      window.AndroidReview.requestInAppReview(reason);
      return true;
    }
    // Support older installed shells while the new Android build rolls out.
    if (typeof window.AndroidReview?.requestReview === "function") {
      window.AndroidReview.requestReview();
      return true;
    }
  } catch (error) {
    console.warn("[InAppReview] Native request failed; continuing normally.", error);
  }
  return false;
}

/** Opens the Play Store listing immediately after an explicit user action. */
export function openPlayStoreReview() {
  console.info("[InAppReview] Opening the Play Store review listing.");
  try {
    if (isAndroidWebView() && typeof window.AndroidReview?.openPlayStore === "function") {
      window.AndroidReview.openPlayStore();
      return true;
    }
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    return true;
  } catch (error) {
    console.warn("[InAppReview] Unable to open the Play Store listing.", error);
    return false;
  }
}

/** Records a completed Kids Zone activity. */
export function trackGameCompletionAndMaybeReview() {
  return requestInAppReview("kids_zone_activity_completed");
}

/** Records a completed quiz as a Kids Zone activity. */
export function trackQuizCompletionAndMaybeReview() {
  return requestInAppReview("kids_zone_quiz_completed");
}

/** Records a completed lesson, with a distinct reason for Quran lessons. */
export function trackLearningCompletionAndMaybeReview(category = "learning") {
  const reason = String(category).toLowerCase() === "quran"
    ? "quran_lesson_completed"
    : "learning_activity_completed";
  return requestInAppReview(reason);
}

/** Starts a cancellable review trigger for continuous radio listening. */
export function trackRadioListeningAndMaybeReview() {
  console.info("[InAppReview] Radio listening timer started.");
  const timer = window.setTimeout(() => {
    requestInAppReview("radio_listened_10_minutes");
  }, RADIO_REVIEW_DELAY_MS);
  return () => window.clearTimeout(timer);
}

/** Marks that the user left the app to make a donation. */
export function markDonationStarted() {
  try {
    localStorage.setItem(DONATION_PENDING_KEY, String(Date.now()));
    console.info("[InAppReview] Donation journey started.");
  } catch {
    // Storage failure must never block the donation link.
  }
}

/** Requests review when the app becomes active after a donation journey. */
export function trackDonationReturnAndMaybeReview() {
  try {
    const startedAt = Number(localStorage.getItem(DONATION_PENDING_KEY) || 0);
    if (!startedAt || Date.now() - startedAt < 2000) return false;
    localStorage.removeItem(DONATION_PENDING_KEY);
    return requestInAppReview("donation_completed");
  } catch {
    return false;
  }
}

/** Preserves the existing manual testing entry point. */
export function triggerInAppReview(reason = "manual") {
  return requestInAppReview(reason);
}

/** Points alone are no longer a review trigger. */
export function trackPointsMilestoneAndMaybeReview() {
  return false;
}

/** Generic session time is no longer a review trigger. */
export function trackSessionEngagementAndMaybeReview() {
  return () => {};
}

/** Native SharedPreferences own prompt cooldown and cannot be dismissed from web code. */
export function dismissReviewPromptForLonger() {}

/** Logs reset guidance because production history is intentionally native-only. */
export function resetReviewPromptForTesting() {
  console.info("[InAppReview] Clear app data to reset native review eligibility for testing.");
}
