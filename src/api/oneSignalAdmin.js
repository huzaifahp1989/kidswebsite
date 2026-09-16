import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Sign in as admin first');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function request(path, options = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }

  return data;
}

export const oneSignalAdminApi = {
  getStatus() {
    return request('/api/onesignal?action=status');
  },

  list({ limit = 25, offset = 0 } = {}) {
    return request(`/api/onesignal?limit=${limit}&offset=${offset}`);
  },

  send(payload) {
    return request('/api/onesignal', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancel(id) {
    return request(`/api/onesignal?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export default oneSignalAdminApi;
