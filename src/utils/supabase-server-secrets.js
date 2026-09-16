import { usesProductionSupabaseProject } from './supabase-public-config.js';

const PRODUCTION_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkxNDYyNiwiZXhwIjoyMDgxNDkwNjI2fQ.dCgntlDUdEBWte2Ry7R_sNmxCN2WpnqaOYMovmYo2Tc';

function clean(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

function envValue(name) {
  if (typeof process !== 'undefined' && process.env?.[name] != null) {
    return clean(process.env[name]);
  }
  return '';
}

export function resolveServiceRoleKey() {
  const envKey =
    envValue('SUPABASE_SERVICE_ROLE_KEY') ||
    envValue('VITE_SUPABASE_SERVICE_ROLE_KEY');
  if (envKey.length > 40) return envKey;
  if (usesProductionSupabaseProject()) return PRODUCTION_SUPABASE_SERVICE_ROLE_KEY;
  return '';
}

export function hasEffectiveServiceRoleKey() {
  return resolveServiceRoleKey().length > 40;
}
