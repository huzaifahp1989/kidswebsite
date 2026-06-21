/**
 * App data + auth API (Supabase-backed).
 * Filename kept for existing imports across the codebase.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const ANNOUNCEMENTS_LOCAL_KEY = 'homepage_announcements';

function isMissingTableError(error, tableName) {
  const message = error?.message || String(error || '');
  return new RegExp(tableName, 'i').test(message) && /schema cache|does not exist|not find/i.test(message);
}

function readLocalAnnouncements() {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocalAnnouncements(list) {
  localStorage.setItem(ANNOUNCEMENTS_LOCAL_KEY, JSON.stringify(list));
}

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
  const imageUrls = Array.isArray(row.image_urls) && row.image_urls.length
    ? row.image_urls.filter(Boolean)
    : row.image_url || row.imageUrl
      ? [row.image_url || row.imageUrl]
      : [];

  return {
    id: row.id,
    title: row.title || '',
    text: row.text || '',
    imageUrl: imageUrls[0] || '',
    imageUrls,
    linkUrl: row.link_url ?? row.linkUrl ?? '',
    linkLabel: row.link_label ?? row.linkLabel ?? 'Learn more',
    active: row.active ?? true,
    showOnHome: row.show_on_home ?? row.showOnHome ?? true,
    showAsPopup: Boolean(row.show_as_popup ?? row.showAsPopup ?? false),
    order: row.order ?? 0,
    popupDelaySeconds: row.popup_delay_seconds ?? row.popupDelaySeconds ?? 3,
    popupCooldownHours: row.popup_cooldown_hours ?? row.popupCooldownHours ?? 24,
    updatedAt: row.updated_at ?? row.updatedAt,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function announcementToRow(item) {
  const row = {
    updated_at: item.updatedAt || new Date().toISOString(),
  };

  if (item.createdAt) row.created_at = item.createdAt;
  if (item.title !== undefined) row.title = item.title;
  if (item.text !== undefined) row.text = item.text;
  if (item.linkUrl !== undefined || item.link_url !== undefined) {
    row.link_url = item.linkUrl ?? item.link_url ?? '';
  }
  if (item.linkLabel !== undefined || item.link_label !== undefined) {
    row.link_label = item.linkLabel ?? item.link_label ?? 'Learn more';
  }
  if (item.active !== undefined) row.active = item.active;
  if (item.showOnHome !== undefined || item.show_on_home !== undefined) {
    row.show_on_home = item.showOnHome ?? item.show_on_home ?? true;
  }
  if (item.showAsPopup !== undefined || item.show_as_popup !== undefined) {
    row.show_as_popup = item.showAsPopup ?? item.show_as_popup ?? false;
  }
  if (item.order !== undefined) row.order = item.order ?? 0;
  if (item.popupDelaySeconds !== undefined || item.popup_delay_seconds !== undefined) {
    row.popup_delay_seconds = item.popupDelaySeconds ?? item.popup_delay_seconds ?? 3;
  }
  if (item.popupCooldownHours !== undefined || item.popup_cooldown_hours !== undefined) {
    row.popup_cooldown_hours = item.popupCooldownHours ?? item.popup_cooldown_hours ?? 24;
  }

  if (item.imageUrls !== undefined || item.imageUrl !== undefined || item.image_url !== undefined) {
    const imageUrls = Array.isArray(item.imageUrls) && item.imageUrls.length
      ? item.imageUrls.filter(Boolean)
      : item.imageUrl || item.image_url
        ? [item.imageUrl || item.image_url]
        : [];
    row.image_url = imageUrls[0] || '';
    row.image_urls = imageUrls;
  }

  return row;
}

export const announcementsApi = {
  async list() {
    if (!supabase) return readLocalAnnouncements().map(mapAnnouncementRow);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapAnnouncementRow);
      if (mapped.length) {
        return mapped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      return readLocalAnnouncements().map(mapAnnouncementRow);
    } catch (e) {
      console.warn(e);
      if (isMissingTableError(e, 'announcements')) {
        return readLocalAnnouncements().map(mapAnnouncementRow);
      }
      try {
        const { data } = await supabase.from('announcements').select('*');
        const mapped = (data || []).map(mapAnnouncementRow);
        if (mapped.length) {
          return mapped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        return readLocalAnnouncements().map(mapAnnouncementRow);
      } catch {
        return readLocalAnnouncements().map(mapAnnouncementRow);
      }
    }
  },
  async add(announcement) {
    if (!supabase) {
      const list = readLocalAnnouncements();
      const item = { ...announcement, id: `local_${Date.now()}`, _localId: `local_${Date.now()}` };
      writeLocalAnnouncements([...list, item]);
      return { id: item.id };
    }
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcementToRow(announcement))
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (e) {
      if (!isMissingTableError(e, 'announcements')) throw e;
      const list = readLocalAnnouncements();
      const item = { ...announcement, id: `local_${Date.now()}`, _localId: `local_${Date.now()}` };
      writeLocalAnnouncements([...list, item]);
      return { id: item.id };
    }
  },
  async update(id, patch) {
    if (!supabase || String(id).startsWith('local_')) {
      const list = readLocalAnnouncements();
      const next = list.map((item) =>
        item.id === id || item._localId === id ? { ...item, ...patch, id: item.id } : item
      );
      writeLocalAnnouncements(next);
      return { ok: true };
    }
    try {
      const rowPatch = announcementToRow({ ...patch, updatedAt: new Date().toISOString() });
      delete rowPatch.created_at;
      const { error } = await supabase.from('announcements').update(rowPatch).eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      if (!isMissingTableError(e, 'announcements')) throw e;
      const list = readLocalAnnouncements();
      const next = list.map((item) =>
        item.id === id || item._localId === id ? { ...item, ...patch, id: item.id } : item
      );
      writeLocalAnnouncements(next);
      return { ok: true };
    }
  },
  async remove(id) {
    if (!supabase || String(id).startsWith('local_')) {
      const list = readLocalAnnouncements();
      const next = list.filter((item) => item.id !== id && item._localId !== id);
      writeLocalAnnouncements(next);
      return { ok: true };
    }
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      if (!isMissingTableError(e, 'announcements')) throw e;
      const list = readLocalAnnouncements();
      const next = list.filter((item) => item.id !== id && item._localId !== id);
      writeLocalAnnouncements(next);
      return { ok: true };
    }
  },
};

export async function uploadSponsorImage(file, label = 'sponsor') {
  const { uploadSponsorImage: upload } = await import('./mediaLibrary.js');
  return upload(file, label);
}

export async function isAdminUser() {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  return adminEmail ? email === adminEmail : true;
}
