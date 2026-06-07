export function triggerInAppReview() {
  try {
    if (window.AndroidReview && typeof window.AndroidReview.requestReview === 'function') {
      window.AndroidReview.requestReview();
    }
  } catch {
  }
}

const GAME_COUNT_MILESTONES = [3, 10, 25];

export function trackGameCompletionAndMaybeReview() {
  try {
    const count = (parseInt(localStorage.getItem('games_completed_count') || '0', 10)) + 1;
    localStorage.setItem('games_completed_count', String(count));
    if (GAME_COUNT_MILESTONES.includes(count)) {
      triggerInAppReview();
    }
  } catch {
  }
}

const POINTS_MILESTONES = [50, 200, 500, 1000];

export function trackPointsMilestoneAndMaybeReview(totalPoints) {
  try {
    const pts = Number(totalPoints) || 0;
    const lastMilestone = parseInt(localStorage.getItem('last_review_milestone') || '0', 10);
    const crossed = POINTS_MILESTONES.find(m => pts >= m && lastMilestone < m);
    if (crossed !== undefined) {
      localStorage.setItem('last_review_milestone', String(crossed));
      triggerInAppReview();
    }
  } catch {
  }
}
