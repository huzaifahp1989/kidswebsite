export function validateAdminNoticeInput(input) {
  const title = String((input && input.title) || '').trim();
  const body = String((input && input.body) || '').trim();
  if (!title) return 'Notice title is required';
  if (!body) return 'Notice body is required';
  if (title.length > 200) return 'Title is too long (max 200 characters)';
  if (body.length > 2000) return 'Body is too long (max 2000 characters)';
  if (input && typeof input.url === 'string' && input.url.trim()) {
    try { new URL(input.url.trim()); } catch { return 'URL is not valid'; }
  }
  return null;
}

export function buildAdminNoticeRow(input) {
  const raw = input || {};
  const priority =
    raw.priority === 'urgent' || raw.priority === 'info' || raw.priority === 'normal'
      ? raw.priority
      : 'normal';
  const icon = String(raw.icon || '🔔' || '').trim().slice(0, 8) || '🔔';
  const url = typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : null;
  const publishAt =
    typeof raw.publish_at === 'string' && raw.publish_at.trim()
      ? new Date(raw.publish_at).toISOString()
      : new Date().toISOString();
  const expireAt =
    typeof raw.expire_at === 'string' && raw.expire_at.trim()
      ? new Date(raw.expire_at).toISOString()
      : null;
  return {
    title: String(raw.title || '').trim(),
    body: String(raw.body || '').trim(),
    url,
    icon,
    priority,
    active: typeof raw.active === 'boolean' ? raw.active : true,
    publish_at: publishAt,
    expire_at: expireAt,
  };
}
