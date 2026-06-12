export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.imedia.app';

const REVIEW_LAST_PROMPT_KEY = 'review_last_prompt_at';
const REVIEW_SESSION_DATE_KEY = 'review_session_date';
const REVIEW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_ENGAGEMENT_MS = 2 * 60 * 1000;

const GAME_COUNT_MILESTONES = [1, 3, 10, 25];
const QUIZ_COUNT_MILESTONES = [1, 2, 5, 10];
const LEARNING_COUNT_MILESTONES = [1, 3, 5];
const POINTS_MILESTONES = [50, 200, 500, 1000];

let promptHandler = null;
let pendingReason = null;

export function registerReviewPromptHandler(handler) {
  promptHandler = handler;
  if (pendingReason) {
    const reason = pendingReason;
    pendingReason = null;
    handler(reason);
  }
  return () => {
    if (promptHandler === handler) {
      promptHandler = null;
    }
  };
}

function isAndroidApp() {
  try {
    return Boolean(window.AndroidReview && typeof window.AndroidReview.requestReview === 'function');
  } catch {
    return false;
  }
}

function canShowReviewPrompt() {
  try {
    const last = parseInt(localStorage.getItem(REVIEW_LAST_PROMPT_KEY) || '0', 10);
    if (!last) return true;
    if (last > Date.now()) return false;
    return Date.now() - last >= REVIEW_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markReviewPromptShown(reason = 'unknown') {
  try {
    localStorage.setItem(REVIEW_LAST_PROMPT_KEY, String(Date.now()));
    localStorage.setItem('review_last_reason', reason);
  } catch {
  }
}

function openReviewPrompt(reason = 'unknown') {
  if (promptHandler) {
    promptHandler(reason);
    return true;
  }
  pendingReason = reason;
  return true;
}

export function maybeRequestReview(reason = 'unknown') {
  if (!canShowReviewPrompt()) return false;

  if (isAndroidApp()) {
    try {
      window.AndroidReview.requestReview();
    } catch {
    }
  }

  openReviewPrompt(reason);
  return true;
}

export function triggerInAppReview(reason = 'manual') {
  return maybeRequestReview(reason);
}

function bumpCounter(key) {
  const count = (parseInt(localStorage.getItem(key) || '0', 10)) + 1;
  localStorage.setItem(key, String(count));
  return count;
}

function maybeReviewAtMilestone(counterKey, milestones, reason) {
  const count = bumpCounter(counterKey);
  if (milestones.includes(count)) {
    maybeRequestReview(reason);
  }
  return count;
}

export function trackGameCompletionAndMaybeReview() {
  try {
    maybeReviewAtMilestone('games_completed_count', GAME_COUNT_MILESTONES, 'game_milestone');
  } catch {
  }
}

export function trackQuizCompletionAndMaybeReview() {
  try {
    maybeReviewAtMilestone('quizzes_completed_count', QUIZ_COUNT_MILESTONES, 'quiz_milestone');
  } catch {
  }
}

export function trackLearningCompletionAndMaybeReview() {
  try {
    maybeReviewAtMilestone('learning_completed_count', LEARNING_COUNT_MILESTONES, 'learning_milestone');
  } catch {
  }
}

export function trackPointsMilestoneAndMaybeReview(totalPoints) {
  try {
    const pts = Number(totalPoints) || 0;
    const lastMilestone = parseInt(localStorage.getItem('last_review_milestone') || '0', 10);
    const crossed = POINTS_MILESTONES.find((m) => pts >= m && lastMilestone < m);
    if (crossed !== undefined) {
      localStorage.setItem('last_review_milestone', String(crossed));
      maybeRequestReview('points_milestone');
    }
  } catch {
  }
}

export function trackSessionEngagementAndMaybeReview() {
  try {
    const today = new Date().toDateString();
    if (localStorage.getItem(REVIEW_SESSION_DATE_KEY) === today) {
      return () => {};
    }

    const timer = setTimeout(() => {
      if (localStorage.getItem(REVIEW_SESSION_DATE_KEY) === today) return;
      const shown = maybeRequestReview('session_engagement');
      if (shown) {
        localStorage.setItem(REVIEW_SESSION_DATE_KEY, today);
      }
    }, SESSION_ENGAGEMENT_MS);

    return () => clearTimeout(timer);
  } catch {
    return () => {};
  }
}

export function dismissReviewPromptForLonger() {
  try {
    localStorage.setItem(REVIEW_LAST_PROMPT_KEY, String(Date.now() + REVIEW_COOLDOWN_MS));
  } catch {
  }
}

export function resetReviewPromptForTesting() {
  try {
    localStorage.removeItem(REVIEW_LAST_PROMPT_KEY);
    localStorage.removeItem(REVIEW_SESSION_DATE_KEY);
    localStorage.removeItem('review_last_reason');
    localStorage.removeItem('games_completed_count');
    localStorage.removeItem('quizzes_completed_count');
    localStorage.removeItem('learning_completed_count');
    localStorage.removeItem('last_review_milestone');
  } catch {
  }
}
