import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bqmfrmfevnjdvpttsvof.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbWZybWZldm5qZHZwdHRzdm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTAzNTgsImV4cCI6MjA4MDk2NjM1OH0.Fe-_d_gcCD1lpdgZ6sA6Uwz492GN-ZoKvElUkj8hr_4';

// Validate configuration
const isValidConfig = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client with error handling
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

// Helper function to check if Supabase is configured
export function isSupabaseConfigured() {
  return isValidConfig;
}

// Export auth helpers
export const supabaseAuth = {
  signUp: async (email, password, metadata = {}) => {
    if (!supabase) throw new Error('Supabase is not configured');
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
  },
  
  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured');
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },
  
  signOut: async () => {
    if (!supabase) throw new Error('Supabase is not configured');
    return await supabase.auth.signOut();
  },
  
  getSession: async () => {
    if (!supabase) return { data: { session: null }, error: new Error('Supabase is not configured') };
    return await supabase.auth.getSession();
  },
  
  getUser: async () => {
    if (!supabase) return { data: { user: null }, error: new Error('Supabase is not configured') };
    return await supabase.auth.getUser();
  },
  
  onAuthStateChange: (callback) => {
    if (!supabase) return { data: { subscription: null }, error: new Error('Supabase is not configured') };
    return supabase.auth.onAuthStateChange(callback);
  }
};

export default supabase;

