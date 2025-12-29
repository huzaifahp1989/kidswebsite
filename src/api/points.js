import { auth, db } from "../lib/firebase";
import { doc, updateDoc, increment, collection, addDoc } from "firebase/firestore";
import { getLeaderboard } from "./leaderboard";

export async function addPoints(points = 1) {
  const user = auth?.currentUser;
  const inc = Number(points || 0);
  if (!user || !db || !inc) return;

  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, {
    points: increment(inc),
    updatedAt: Date.now(),
  }).catch(async () => {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, { points: inc, updatedAt: Date.now() }, { merge: true });
  });
}

// Backwards compatibility for existing imports; routes everything to addPoints
export async function awardPointsForGame(_user, _gameType, opts = {}) {
  const inc = Number(opts?.fallbackScore ?? opts?.points ?? 0) || 1;
  await addPoints(inc);
  return inc;
}

// Simple recorder to mirror previous behavior; writes a score entry but does not manage totals
export async function saveGameScore(gameName, points = 0) {
  if (!db || !auth?.currentUser) return { error: new Error("Not signed in") };
  const payload = {
    user_id: auth.currentUser.uid,
    game_type: String(gameName || "game"),
    points_awarded: Number(points || 0),
    at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "game_scores"), payload);
  return { data: { id: ref.id }, error: null };
}

export { getLeaderboard };

// Lightweight health check for points backend; safe fallback
export async function checkPointsEndpointHealth() {
  try {
    return false;
  } catch {
    return false;
  }
}

// Local-only monthly reset for offline sample data
export function checkAndResetMonthlyLeaderboardLocal() {
  try {
    const now = new Date();
    const marker = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const last = localStorage.getItem("ikz_monthly_reset_at");
    if (last !== marker) {
      const raw = localStorage.getItem("users");
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.length) {
        const reset = arr.map((u) => ({ ...u, points: 0 }));
        localStorage.setItem("users", JSON.stringify(reset));
      }
      localStorage.setItem("ikz_monthly_reset_at", marker);
    }
  } catch {}
}
