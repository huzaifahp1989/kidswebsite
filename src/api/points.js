// Centralized helper to award points based on backend GameSettings
// Usage: await awardPointsForGame(user, gameType, { isPerfect, fallbackScore })
import { supabase } from '@/api/supabaseClient'

export async function awardPointsForGame(user, gameType, opts = {}) {
  const { fallbackScore = 0, idempotencyKey: providedKey, isPerfect = false, metadata = {} } = opts;
  const inc = Number(fallbackScore || 0);
  if (!inc) return 0;
  let key = null;
  try { key = providedKey || localStorage.getItem('current_game_award_key') || null; } catch {}
  if (key) {
    try {
      const rawKeys = localStorage.getItem('awarded_keys');
      const keys = rawKeys ? JSON.parse(rawKeys) : [];
      if (keys.includes(key)) return 0;
    } catch {}
  }
  try {
    const { data: session } = await supabase.auth.getSession();
    const uid = user?.uid || user?.id || session?.session?.user?.id || null;
    if (!uid) {
      const raw = localStorage.getItem('users');
      const arr = raw ? JSON.parse(raw) : [];
      const guest = { id: 'guest', name: 'Guest', points: 0 };
      const idx = arr.findIndex(u => u.id === guest.id);
      if (idx >= 0) arr[idx].points = Number(arr[idx].points || 0) + inc; else arr.push({ ...guest, points: inc });
      localStorage.setItem('users', JSON.stringify(arr));
      if (key) {
        try {
          const rawKeys = localStorage.getItem('awarded_keys');
          const keys = rawKeys ? JSON.parse(rawKeys) : [];
          keys.push(key);
          while (keys.length > 200) keys.shift();
          localStorage.setItem('awarded_keys', JSON.stringify(keys));
        } catch {}
      }
      return inc;
    }
    const { data, error } = await supabase
      .from('users')
      .select('total_points, full_name, email')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    let next = inc;
    const sessionEmail = session?.session?.user?.email || user?.email || null;
    const defaultName = sessionEmail ? String(sessionEmail).split('@')[0] : null;
    if (!data) {
      const { error: upsertErr } = await supabase
        .from('users')
        .upsert({ id: uid, email: sessionEmail, full_name: defaultName, total_points: inc, points: inc, last_award: new Date().toISOString() });
      if (upsertErr) throw upsertErr;
    } else {
      const current = Number(data?.total_points || 0);
      next = current + inc;
      const patch = { total_points: next, points: next, last_award: new Date().toISOString() };
      if (!data.full_name && defaultName) patch.full_name = defaultName;
      if (!data.email && sessionEmail) patch.email = sessionEmail;
      const { error: upErr } = await supabase
        .from('users')
        .update(patch)
        .eq('id', uid);
      if (upErr) throw upErr;
    }
    try {
      await supabase.from('game_scores').insert({
        user_id: uid,
        game_type: String(gameType || 'game'),
        points_awarded: inc,
        perfect: !!isPerfect,
        at: new Date().toISOString(),
        meta: metadata,
      });
    } catch {}
    try {
      await supabase
        .from('leaderboard')
        .upsert({ user_id: uid, points: next });
    } catch {}
    if (key) {
      try {
        const rawKeys = localStorage.getItem('awarded_keys');
        const keys = rawKeys ? JSON.parse(rawKeys) : [];
        keys.push(key);
        while (keys.length > 200) keys.shift();
        localStorage.setItem('awarded_keys', JSON.stringify(keys));
      } catch {}
    }
    try { window.dispatchEvent(new CustomEvent('ikz_points_total', { detail: { points: next } })); } catch {}
    return inc;
  } catch {
    try {
      const raw = localStorage.getItem('users');
      const arr = raw ? JSON.parse(raw) : [];
      const id = user?.uid || user?.id || 'guest';
      const idx = arr.findIndex(u => u.id === id);
      if (idx >= 0) arr[idx].points = Number(arr[idx].points || 0) + inc; else arr.push({ id, name: 'Guest', points: inc });
      localStorage.setItem('users', JSON.stringify(arr));
      if (key) {
        try {
          const rawKeys = localStorage.getItem('awarded_keys');
          const keys = rawKeys ? JSON.parse(rawKeys) : [];
          keys.push(key);
          while (keys.length > 200) keys.shift();
          localStorage.setItem('awarded_keys', JSON.stringify(keys));
        } catch {}
      }
      return inc;
    } catch {}
    return 0;
  }
}

export async function checkPointsEndpointHealth() {
  try {
    const { data: session } = await supabase.auth.getSession();
    return !!session?.session?.user?.id;
  } catch {
    return false;
  }
}

export function checkAndResetMonthlyLeaderboardLocal() {
  try {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const last = localStorage.getItem('last_reset_month');
    if (last === key) return;
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    localStorage.setItem(`leaderboard_archive_${key}`, JSON.stringify(users));
    const resetUsers = users.map(u => ({ ...u, points: 0 }));
    localStorage.setItem('users', JSON.stringify(resetUsers));
    const scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
    localStorage.setItem(`gameScores_archive_${key}`, JSON.stringify(scores));
    localStorage.setItem('gameScores', JSON.stringify([]));
    localStorage.setItem('last_reset_month', key);
  } catch {}
}

// Convenience API matching the requested shape
export async function saveGameScore(userId, gameName, points) {
  try {
    const payload = {
      user_id: userId,
      game_type: String(gameName || 'game'),
      points_awarded: Number(points || 0),
      at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('game_scores').insert(payload);
    return { data, error };
  } catch (e) {
    return { error: e };
  }
}

export async function updateUserPoints(userId, newTotal) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ total_points: Number(newTotal || 0), points: Number(newTotal || 0), last_award: new Date().toISOString() })
      .eq('id', userId);
    return { data, error };
  } catch (e) {
    return { error: e };
  }
}

// Leaderboard is driven off users.points; keep this for compatibility
export async function updateLeaderboard(userId, newTotal) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .upsert({ user_id: userId, points: Number(newTotal || 0) });
    return { data, error };
  } catch (e) {
    return { error: e };
  }
}

export async function addPoints(userId, gameName, points) {
  const inc = Number(points || 0);
  if (!inc) return 0;
  try {
    const { data: current, error } = await supabase
      .from('users')
      .select('total_points')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    const currentTotal = Number(current?.total_points || 0);
    const newTotal = currentTotal + inc;
    await saveGameScore(userId, gameName, inc);
    await updateUserPoints(userId, newTotal);
    await updateLeaderboard(userId, newTotal);
    try { window.dispatchEvent(new CustomEvent('ikz_points_total', { detail: { points: newTotal } })); } catch {}
    return newTotal;
  } catch (e) {
    return 0;
  }
}
