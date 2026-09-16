import { createClient } from '@supabase/supabase-js';
import {
  isPlaceholderAnonKey,
  isPlaceholderSupabaseUrl,
  PRODUCTION_SUPABASE_ANON_KEY,
  PRODUCTION_SUPABASE_URL,
  allowProductionSupabaseFallback,
} from './supabase-public-config.js';
import { hasEffectiveServiceRoleKey, resolveServiceRoleKey } from './supabase-server-secrets.js';

function cleanEnv(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

function envValue(name) {
  if (typeof process !== 'undefined' && process.env?.[name] != null) {
    return cleanEnv(process.env[name]);
  }
  return '';
}

const envUrl =
  envValue('NEXT_PUBLIC_SUPABASE_URL') ||
  envValue('VITE_SUPABASE_URL') ||
  envValue('SUPABASE_URL');
const allowFallback = allowProductionSupabaseFallback();

const SUPABASE_URL =
  (!isPlaceholderSupabaseUrl(envUrl) && envUrl) ||
  (allowFallback ? PRODUCTION_SUPABASE_URL : 'https://placeholder.supabase.co');

const envAnon =
  envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  envValue('VITE_SUPABASE_ANON_KEY') ||
  envValue('SUPABASE_ANON_KEY');
const ANON_KEY =
  (!isPlaceholderAnonKey(envAnon) && envAnon) ||
  (allowFallback ? PRODUCTION_SUPABASE_ANON_KEY : '');

export function hasSupabaseServiceRole() {
  return hasEffectiveServiceRoleKey();
}

const SUPABASE_SERVICE_ROLE_KEY = hasSupabaseServiceRole()
  ? resolveServiceRoleKey()
  : ANON_KEY || 'placeholder';

let _adminClient = null;
export function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

export const supabaseAdmin = getSupabaseAdmin();

export default supabaseAdmin;
