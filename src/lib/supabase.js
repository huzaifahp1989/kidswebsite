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
