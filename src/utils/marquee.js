const MAX_MESSAGE_LENGTH = 200;

export function validateMarqueeInput(input) {
  const message = String((input && input.message) || '').trim();
  if (!message) return 'Message text is required';
  if (message.length > MAX_MESSAGE_LENGTH) {
    return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`;
  }
  if (input && typeof input.link_url === 'string' && input.link_url.trim()) {
    try {
      new URL(input.link_url.trim());
    } catch {
      return 'Link URL is not valid';
    }
  }
  return null;
}

export function buildMarqueeRow(input) {
  const raw = input || {};
  const linkUrl =
    typeof raw.link_url === 'string' && raw.link_url.trim() ? raw.link_url.trim() : null;
  const sortOrder = Number.isFinite(Number(raw.sort_order)) ? Math.trunc(Number(raw.sort_order)) : 0;
  return {
    message: String(raw.message || '').trim(),
    link_url: linkUrl,
    active: typeof raw.active === 'boolean' ? raw.active : true,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
}
