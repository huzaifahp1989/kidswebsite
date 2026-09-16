export function resolvePublicSupabaseUrl() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
      const v = String(import.meta.env.VITE_SUPABASE_URL).trim();
      if (v) return v;
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) {
      const v = String(process.env.VITE_SUPABASE_URL).trim();
      if (v) return v;
    }
  } catch {}
  return 'https://jlqrbbqsuksncrxjcmbc.supabase.co';
}

export function resolvePublicSupabaseAnonKey() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
      const v = String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim();
      if (v) return v;
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) {
      const v = String(process.env.VITE_SUPABASE_ANON_KEY).trim();
      if (v) return v;
    }
  } catch {}
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTQ2MjYsImV4cCI6MjA4MTQ5MDYyNn0.LAphA03H5Jj7yjAKf6k5N_auYfLkgHiApGOURDQEy_w';
}

export function resolveStorageKeyPrefix() {
  return 'jlqrbbqsuksncrxjcmbc';
}

function readStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  try {
    const prefix = resolveStorageKeyPrefix();
    const key = `sb-${prefix}-auth-token`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || parsed?.accessToken || null;
  } catch {
    return null;
  }
}

async function resolveAccessToken(timeoutMs = 2500) {
  const stored = readStoredAccessToken();
  if (stored) return stored;
  try {
    const { supabaseAuth } = await import('@/lib/supabase.js');
    if (!supabaseAuth?.getSession) return null;
    const result = await Promise.race([
      supabaseAuth.getSession(),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (result && typeof result === 'object' && 'data' in result) {
      const token = result?.data?.session?.access_token ?? null;
      if (token) return token;
    }
  } catch {}
  return readStoredAccessToken();
}

export async function getAuthFetchHeaders(extra) {
  const token = await resolveAccessToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
