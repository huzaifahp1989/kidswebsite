export const PRODUCTION_SUPABASE_URL = 'https://jlqrbbqsuksncrxjcmbc.supabase.co';

export const PRODUCTION_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTQ2MjYsImV4cCI6MjA4MTQ5MDYyNn0.LAphA03H5Jj7yjAKf6k5N_auYfLkgHiApGOURDQEy_w';

export const SUPABASE_PROJECT_REF = 'jlqrbbqsuksncrxjcmbc';

function envValue(name) {
  const val =
    typeof process !== 'undefined' && process.env?.[name] != null
      ? String(process.env[name])
      : typeof import.meta !== 'undefined' && import.meta.env?.[name] != null
        ? String(import.meta.env[name])
        : '';
  return val.trim();
}

export function isPlaceholderSupabaseUrl(url) {
  const value = String(url || '').trim();
  return !value || value.includes('placeholder.supabase.co');
}

export function isPlaceholderAnonKey(key) {
  const value = String(key || '').trim();
  return !value || value === 'placeholder';
}

export function allowProductionSupabaseFallback() {
  if (typeof process !== 'undefined' && (Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production')) {
    return true;
  }
  const envUrl =
    envValue('NEXT_PUBLIC_SUPABASE_URL') ||
    envValue('VITE_SUPABASE_URL') ||
    envValue('SUPABASE_URL');
  const envKey =
    envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    envValue('VITE_SUPABASE_ANON_KEY') ||
    envValue('SUPABASE_ANON_KEY');
  return !envUrl && !envKey;
}

export function usesProductionSupabaseProject() {
  if (allowProductionSupabaseFallback()) return true;
  const envUrl = (
    envValue('NEXT_PUBLIC_SUPABASE_URL') ||
    envValue('VITE_SUPABASE_URL') ||
    envValue('SUPABASE_URL')
  ).replace(/\/$/, '');
  return envUrl === PRODUCTION_SUPABASE_URL;
}

export function resolvePublicSupabaseUrl() {
  const envUrl =
    envValue('NEXT_PUBLIC_SUPABASE_URL') ||
    envValue('VITE_SUPABASE_URL') ||
    envValue('SUPABASE_URL');
  if (!isPlaceholderSupabaseUrl(envUrl)) return envUrl;
  if (allowProductionSupabaseFallback()) return PRODUCTION_SUPABASE_URL;
  return 'https://placeholder.supabase.co';
}

export function resolvePublicSupabaseAnonKey() {
  const envKey =
    envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    envValue('VITE_SUPABASE_ANON_KEY') ||
    envValue('SUPABASE_ANON_KEY');
  if (!isPlaceholderAnonKey(envKey)) return envKey;
  if (allowProductionSupabaseFallback()) return PRODUCTION_SUPABASE_ANON_KEY;
  return 'placeholder';
}

export function resolveStorageKeyPrefix() {
  return SUPABASE_PROJECT_REF;
}
