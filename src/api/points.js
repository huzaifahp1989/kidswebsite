import { supabase } from "../lib/supabase";
import { getLeaderboard } from "./leaderboard";

export async function addPoints(points = 1) {
  const inc = Number(points || 0);
  if (!supabase || !inc) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from("users").select("points").eq("id", user.id).maybeSingle();
  const current = Number(profile?.points || 0);

  await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email || "",
        points: current + inc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
}

export async function awardPointsForGame(_user, _gameType, opts = {}) {
  const inc = Number(opts?.fallbackScore ?? opts?.points ?? 0) || 1;
  await addPoints(inc);
  return inc;
}

export async function saveGameScore(gameName, points = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not signed in") };

  const payload = {
    user_id: user.id,
    game_type: String(gameName || "game"),
    points_awarded: Number(points || 0),
    at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("game_scores").insert(payload).select("id").single();
  if (error) return { error };
  return { data: { id: data.id }, error: null };
}

export { getLeaderboard };

export async function checkPointsEndpointHealth() {
  try {
    if (!supabase) return false;
    const { error } = await supabase.from("users").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

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
