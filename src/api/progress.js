import { db } from '../lib/firebase'
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

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
  await addDoc(collection(db, 'child_progress_logs'), payload)
}

export async function listChildProgressLogs(userId, { fromDate, toDate, limit: max = 30 } = {}) {
  const clauses = [where('user_id', '==', userId)]
  const qy = query(collection(db, 'child_progress_logs'), ...clauses, orderBy('log_date', 'desc'), limit(max))
  const snap = await getDocs(qy)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
