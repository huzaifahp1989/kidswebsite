/**
 * App data + auth API (Supabase-backed).
 * Filename kept for existing imports across the codebase.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const ANNOUNCEMENTS_LOCAL_KEY = 'homepage_announcements';

function mapUserRow(row) {
  if (!row) return null;
  return {
    ...row,
    full_name: row.full_name ?? row.fullName ?? '',
    madrasah_maktab: row.madrasah_maktab ?? row.madrasah ?? '',
  };
}

function mapUserForList(row) {
  return {
    id: row.id,
    uid: row.id,
    fullName: row.full_name || row.fullName || '',
    full_name: row.full_name || row.fullName || '',
    email: row.email || '',
    role: row.role || 'user',
    points: Number(row.total_points != null ? row.total_points : row.points || 0),
    lastAward: row.last_award || row.lastAward || null,
    last_award: row.last_award || row.lastAward || null,
    madrasah_maktab: row.madrasah_maktab || '',
    city: row.city || '',
    avatar: row.avatar || '👤',
  };
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export function getFirebase() {
  return {
    app: isSupabaseConfigured() ? supabase : null,
    auth: supabase?.auth ?? null,
    db: supabase,
  };
}

export const getSupabase = getFirebase;

export async function signIn(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: data.user.id, uid: data.user.id, email: data.user.email || '' };
}

export async function adminSignIn(email, password) {
  return signIn(email, password);
}

export async function adminSignOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function signUp(email, password, metadata = {}) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  const user = data.user;
  const full_name = metadata?.full_name || (email ? String(email).split('@')[0] : '');
  await client.from('users').upsert(
    {
      id: user.id,
      full_name,
      email: user.email || email,
      points: 0,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  return { id: user.id, uid: user.id, email: user.email || email };
}

export async function saveUserProfile(uid, profile) {
  const client = requireSupabase();
  const src = { ...(profile || {}) };
  const patch = {
    id: uid,
    full_name: src.full_name ?? src.fullName ?? (src.email ? String(src.email).split('@')[0] : ''),
    email: src.email ?? '',
    age: src.age != null ? Number(src.age) : null,
    city: src.city ?? null,
    madrasah_maktab: src.madrasah_maktab ?? src.madrasah ?? null,
    avatar: src.avatar ?? null,
    updated_at: new Date().toISOString(),
  };
  if (src.points != null) patch.points = Number(src.points);
  if (src.total_points != null) patch.total_points = Number(src.total_points);
  await client.from('users').upsert(patch, { onConflict: 'id' });
}

export async function getUserProfile(uid) {
  if (!supabase) return null;
  const { data } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  return mapUserRow(data);
}

export async function ensureUserProfile(uid, email = '') {
  if (!supabase) return;
  const { data } = await supabase.from('users').select('id').eq('id', uid).maybeSingle();
  if (!data) {
    await supabase.from('users').upsert(
      { id: uid, email: email || '', points: 0, created_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  }
}

export function watchAuth(callback) {
  if (!supabase) {
    callback(null);
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      ensureUserProfile(session.user.id, session.user.email || '').catch(() => {});
      callback({ uid: session.user.id, email: session.user.email || '' });
    } else {
      callback(null);
    }
  });

  return () => {
    try {
      data.subscription?.unsubscribe();
    } catch (e) {
      console.warn(e);
    }
  };
}

export async function resetPassword(email) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function sendVerification() {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;
  await supabase.auth.resend({ type: 'signup', email: user.email });
}

export const messagesApi = {
  async add() {
    return { ok: false };
  },
  async list() {
    return [];
  },
  async markRead() {
    return { ok: false };
  },
};

export const usersApi = {
  async list() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('points', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapUserForList);
    } catch (e) {
      console.warn('Users list failed:', e?.message || e);
      return [];
    }
  },
};

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('points', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, ...row }));
}

export const quizApi = {
  async submit({ storyId, answers, score, meta = {} }) {
    try {
      const payload = {
        story_id: storyId,
        answers,
        score,
        user_email: meta?.email || null,
        meta,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('quiz_answers').insert(payload).select('id').single();
      if (error) throw error;
      return { id: data.id };
    } catch (e) {
      try {
        const raw = localStorage.getItem('quizAnswers');
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ storyId, answers, score, meta, id: `local-${Date.now()}` });
        localStorage.setItem('quizAnswers', JSON.stringify(arr));
        return { id: `local-${Date.now()}`, local: true };
      } catch (ee) {
        console.warn(ee);
      }
      return { error: String(e?.message || e) };
    }
  },
};

function mapSponsorRow(row) {
  return {
    id: row.id,
    name: row.name,
    linkUrl: row.link_url ?? row.linkUrl ?? '',
    imageUrl: row.image_url ?? row.imageUrl ?? '',
    type: row.type || 'sponsor',
    placement: row.placement || 'home',
    order: row.order ?? 0,
    active: row.active ?? true,
  };
}

function sponsorToRow(sponsor) {
  return {
    name: sponsor.name,
    link_url: sponsor.linkUrl ?? sponsor.link_url ?? '',
    image_url: sponsor.imageUrl ?? sponsor.image_url ?? '',
    type: sponsor.type || 'sponsor',
    placement: sponsor.placement || 'home',
    order: sponsor.order ?? 0,
    active: sponsor.active ?? true,
  };
}

export const sponsorsApi = {
  async add(sponsor) {
    const { data, error } = await supabase.from('sponsors').insert(sponsorToRow(sponsor)).select('id').single();
    if (error) throw error;
    return { id: data.id };
  },
  async list() {
    try {
      const { data, error } = await supabase.from('sponsors').select('*').order('order', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapSponsorRow);
    } catch (e) {
      console.warn(e);
      const { data } = await supabase.from('sponsors').select('*');
      return (data || []).map(mapSponsorRow);
    }
  },
  async update(id, patch) {
    const rowPatch = { ...patch };
    if ('linkUrl' in rowPatch) {
      rowPatch.link_url = rowPatch.linkUrl;
      delete rowPatch.linkUrl;
    }
    if ('imageUrl' in rowPatch) {
      rowPatch.image_url = rowPatch.imageUrl;
      delete rowPatch.imageUrl;
    }
    const { error } = await supabase.from('sponsors').update(rowPatch).eq('id', id);
    if (error) throw error;
    return { ok: true };
  },
  async remove(id) {
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  },
};

function mapAnnouncementRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    text: row.text || '',
    imageUrl: row.image_url ?? row.imageUrl ?? '',
    linkUrl: row.link_url ?? row.linkUrl ?? '',
    linkLabel: row.link_label ?? row.linkLabel ?? 'Learn more',
    active: row.active ?? true,
    showOnHome: row.show_on_home ?? row.showOnHome ?? true,
    showAsPopup: row.show_as_popup ?? row.showAsPopup ?? false,
    order: row.order ?? 0,
    popupDelaySeconds: row.popup_delay_seconds ?? row.popupDelaySeconds ?? 3,
    popupCooldownHours: row.popup_cooldown_hours ?? row.popupCooldownHours ?? 24,
    updatedAt: row.updated_at ?? row.updatedAt,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function announcementToRow(item) {
  return {
    title: item.title,
    text: item.text,
    image_url: item.imageUrl ?? item.image_url ?? '',
    link_url: item.linkUrl ?? item.link_url ?? '',
    link_label: item.linkLabel ?? item.link_label ?? 'Learn more',
    active: item.active ?? true,
    show_on_home: item.showOnHome ?? item.show_on_home ?? true,
    show_as_popup: item.showAsPopup ?? item.show_as_popup ?? false,
    order: item.order ?? 0,
    popup_delay_seconds: item.popupDelaySeconds ?? item.popup_delay_seconds ?? 3,
    popup_cooldown_hours: item.popupCooldownHours ?? item.popup_cooldown_hours ?? 24,
    updated_at: item.updatedAt || new Date().toISOString(),
    created_at: item.createdAt || new Date().toISOString(),
  };
}

export const announcementsApi = {
  async list() {
    if (!supabase) {
      try {
        const raw = localStorage.getItem(ANNOUNCEMENTS_LOCAL_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    }
    try {
      const { data, error } = await supabase.from('announcements').select('*').order('order', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapAnnouncementRow);
    } catch (e) {
      console.warn(e);
      const { data } = await supabase.from('announcements').select('*');
      return (data || []).map(mapAnnouncementRow);
    }
  },
  async add(announcement) {
    if (!supabase) {
      const list = await this.list();
      const item = { ...announcement, id: `local_${Date.now()}`, _localId: `local_${Date.now()}` };
      localStorage.setItem(ANNOUNCEMENTS_LOCAL_KEY, JSON.stringify([...list, item]));
      return { id: item.id };
    }
    const { data, error } = await supabase
      .from('announcements')
      .insert(announcementToRow(announcement))
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },
  async update(id, patch) {
    if (!supabase || String(id).startsWith('local_')) {
      const list = await this.list();
      const next = list.map((item) =>
        item.id === id || item._localId === id ? { ...item, ...patch, id: item.id } : item
      );
      localStorage.setItem(ANNOUNCEMENTS_LOCAL_KEY, JSON.stringify(next));
      return { ok: true };
    }
    const rowPatch = announcementToRow({ ...patch, updatedAt: new Date().toISOString() });
    delete rowPatch.created_at;
    const { error } = await supabase.from('announcements').update(rowPatch).eq('id', id);
    if (error) throw error;
    return { ok: true };
  },
  async remove(id) {
    if (!supabase || String(id).startsWith('local_')) {
      const list = await this.list();
      const next = list.filter((item) => item.id !== id && item._localId !== id);
      localStorage.setItem(ANNOUNCEMENTS_LOCAL_KEY, JSON.stringify(next));
      return { ok: true };
    }
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  },
};

export async function uploadSponsorImage() {
  throw new Error('Image upload not configured. Paste an image URL instead.');
}

export async function isAdminUser() {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  return adminEmail ? email === adminEmail : true;
}
