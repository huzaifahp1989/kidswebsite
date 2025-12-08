import { supabase } from '@/api/supabaseClient'

export async function addChildProgressLog({ userId, logDate, quran = 0, salah = 0, tasbeeh = 0, durood = 0, helping_parents = 0, notes = '' }) {
  const payload = {
    user_id: userId,
    log_date: logDate || new Date().toISOString().slice(0, 10),
    quran: Number(quran || 0),
    salah: Number(salah || 0),
    tasbeeh: Number(tasbeeh || 0),
    durood: Number(durood || 0),
    helping_parents: Number(helping_parents || 0),
    notes: notes || null,
  }
  const { error } = await supabase.from('child_progress_logs').insert(payload)
  if (error) throw error
}

export async function listChildProgressLogs(userId, { fromDate, toDate, limit = 30 } = {}) {
  let q = supabase.from('child_progress_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false }).limit(limit)
  if (fromDate) q = q.gte('log_date', fromDate)
  if (toDate) q = q.lte('log_date', toDate)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

