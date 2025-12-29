import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore'

 

export function getFirebase() {
  return { app: true, auth, db }
}

export async function signIn(email, password) {
  const res = await signInWithEmailAndPassword(auth, email, password)
  return { id: res.user.uid, uid: res.user.uid, email: res.user.email || '' }
}

export async function adminSignIn(email, password) {
  const res = await signInWithEmailAndPassword(auth, email, password)
  return { id: res.user.uid, uid: res.user.uid, email: res.user.email || '' }
}

export async function adminSignOut() {
  await auth.signOut()
}

export async function signUp(email, password, metadata = {}) {
  const res = await createUserWithEmailAndPassword(auth, email, password)
  const user = res.user
  const full_name = metadata?.full_name || (email ? String(email).split('@')[0] : '')
  await setDoc(doc(db, 'users', user.uid), {
    full_name,
    email: user.email || email,
    points: 0,
    created_at: new Date()
  })
  return { id: user.uid, uid: user.uid, email: user.email || email }
}

export async function saveUserProfile(uid, profile) {
  const src = { ...(profile || {}) }
  const full_name = src.full_name ?? src.fullName ?? (src.email ? String(src.email).split('@')[0] : '')
  const patch = {
    full_name,
    email: src.email ?? '',
    age: (src.age != null ? Number(src.age) : null),
    city: src.city ?? null,
    madrasah_maktab: src.madrasah_maktab ?? src.madrasah ?? null,
    avatar: src.avatar ?? null,
    updated_at: new Date().toISOString(),
    points: (src.points != null ? Number(src.points) : undefined),
    total_points: (src.total_points != null ? Number(src.total_points) : undefined),
  }
  await setDoc(doc(db, 'users', uid), patch, { merge: true })
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function ensureUserProfile(uid, email = '') {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { email: email || '', points: 0, created_at: new Date() }, { merge: true })
  }
}

export function watchAuth(callback) {
  if (!auth) {
    // If Firebase auth is not available, call callback with null immediately
    callback(null);
    return () => {}; // Return no-op unsubscribe function
  }
  
  const unsub = onAuthStateChanged(auth, (u) => {
    if (u) {
      try { ensureUserProfile(u.uid, u.email || '') } catch {}
      callback({ uid: u.uid, email: u.email || '' })
    } else {
      callback(null)
    }
  })
  return () => { try { unsub?.() } catch (e) { console.warn(e) } }
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function sendVerification() {
  const u = auth.currentUser
  if (u) {
    await sendEmailVerification(u)
  }
}

// Messages helpers
export const messagesApi = {
  async add() {
    return { ok: false }
  },
  async list() {
    return []
  },
  async markRead() {
    return { ok: false }
  },
};

// Admin-backed users listing via Netlify function with Firestore fallback
export const usersApi = {
  async list() {
    try {
      const q = query(collection(db, 'users'), orderBy('points', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => {
        const u = d.data()
        return {
          id: d.id,
          uid: d.id,
          fullName: u.full_name || '',
          full_name: u.full_name || '',
          email: u.email || '',
          role: u.role || 'user',
          points: Number((u.total_points != null ? u.total_points : u.points) || 0),
          lastAward: u.last_award || null,
          last_award: u.last_award || null,
          madrasah_maktab: u.madrasah_maktab || '',
          city: u.city || '',
          avatar: u.avatar || '👤',
        }
      })
    } catch (e) {
      console.warn('Users list failed:', e?.message || e)
      return []
    }
  }
};

export async function getLeaderboard() {
  const q = query(collection(db, 'users'), orderBy('points', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Quiz submission API
export const quizApi = {
  async submit({ storyId, answers, score, meta = {} }) {
    try {
      const userEmail = meta?.email || null
      const payload = {
        story_id: storyId,
        answers,
        score,
        user_email: userEmail,
        meta,
        created_at: new Date().toISOString(),
      }
      const ref = await addDoc(collection(db, 'quiz_answers'), payload)
      return { id: ref.id }
    } catch (e) {
      try {
        const raw = localStorage.getItem('quizAnswers')
        const arr = raw ? JSON.parse(raw) : []
        arr.push({ storyId, answers, score, meta, id: `local-${Date.now()}` })
        localStorage.setItem('quizAnswers', JSON.stringify(arr))
        return { id: `local-${Date.now()}`, local: true }
      } catch (ee) { console.warn(ee) }
      return { error: String(e?.message || e) }
    }
  }
}

// Sponsors/Ads helpers (Firestore-backed)

export const sponsorsApi = {
  async add(sponsor) {
    const ref = await addDoc(collection(db, 'sponsors'), sponsor)
    return { id: ref.id }
  },
  async list() {
    try {
      const col = collection(db, 'sponsors')
      const qy = query(col, orderBy('order', 'asc'))
      const snap = await getDocs(qy)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) {
      console.warn(e)
      const snap = await getDocs(collection(db, 'sponsors'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  },
  async update(id, patch) {
    const ref = doc(db, 'sponsors', id)
    await updateDoc(ref, patch)
    return { ok: true }
  },
  async remove(id) {
    const ref = doc(db, 'sponsors', id)
    await deleteDoc(ref)
    return { ok: true }
  },
};

// Upload an image file to Firebase Storage and return a public download URL
export async function uploadSponsorImage() {
  throw new Error('Not supported')
}

// Utility: check if current user is the admin email in env
export async function isAdminUser() {
  const u = auth.currentUser
  if (!u) return false
  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase()
  const email = String(u.email || '').toLowerCase()
  return adminEmail ? email === adminEmail : true
}
