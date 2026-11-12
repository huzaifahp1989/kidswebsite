import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jlqrbbqsuksncrxjcmbc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidConfig = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient = null;
try {
  if (isValidConfig) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (error) {
  console.warn('Failed to initialize Supabase client:', error);
  supabaseClient = null;
}

export const supabase = supabaseClient;

export function isSupabaseConfigured() {
  return Boolean(supabaseClient);
}

const authStorageKey = (() => {
  try {
    return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  } catch {
    return '';
  }
})();

/**
 * Reads the persisted Supabase session straight out of localStorage.
 *
 * `supabase.auth.getSession()` and `getUser()` both funnel through a browser
 * wide lock (`lock:sb-<ref>-auth-token`). When another document holds that lock
 * neither call ever settles, which is what left the admin pages stuck. Reading
 * the stored session is synchronous and lock-free, so the admin gate can always
 * reach a decision.
 */
export function getStoredAuthSession() {
  if (!authStorageKey || typeof window === 'undefined') return null;
  try {
    let raw = window.localStorage.getItem(authStorageKey);
    if (!raw) {
      // supabase-js splits large sessions over `<key>.0`, `<key>.1`, ...
      const chunks = [];
      for (let i = 0; ; i += 1) {
        const chunk = window.localStorage.getItem(`${authStorageKey}.${i}`);
        if (chunk == null) break;
        chunks.push(chunk);
      }
      if (!chunks.length) return null;
      raw = chunks.join('');
    }
    const session = JSON.parse(raw);
    return session?.user ? session : null;
  } catch {
    return null;
  }
}

export const supabaseAuth = {
  signUp: async (email, password, metadata = {}) => {
    if (!supabase) throw new Error('Supabase is not configured');
    return supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured');
    return supabase.auth.signInWithPassword({ email, password });
  },

  signOut: async () => {
    if (!supabase) throw new Error('Supabase is not configured');
    return supabase.auth.signOut();
  },

  getSession: async () => {
    if (!supabase) {
      return { data: { session: null }, error: new Error('Supabase is not configured') };
    }
    return supabase.auth.getSession();
  },

  getUser: async () => {
    if (!supabase) {
      return { data: { user: null }, error: new Error('Supabase is not configured') };
    }
    return supabase.auth.getUser();
  },

  onAuthStateChange: (callback) => {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;
