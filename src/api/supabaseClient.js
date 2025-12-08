import { createClient } from '@supabase/supabase-js'

const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || ''
const anon = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || ''

function stub() {
  const err = () => new Error('Supabase not configured')
  return {
    auth: {
      async getSession() { return { data: { session: null } } },
      async getUser() { return { data: { user: null } } },
      async signInWithPassword() { throw err() },
      async signUp() { throw err() },
      async signOut() { return {} },
      onAuthStateChange(cb) { return { data: { subscription: { unsubscribe() {} } } } },
    },
    from() { return { select: async () => ({ data: [], error: err() }), upsert: async () => ({ error: err() }), insert: async () => ({ error: err() }) } },
    storage: {
      from() {
        return {
          async list() { return { data: [], error: err() } },
          getPublicUrl() { return { data: { publicUrl: '' } } },
          async upload() { return { data: null, error: err() } },
        }
      }
    }
  }
}

export const supabase = (url && anon) ? createClient(url, anon) : stub()
