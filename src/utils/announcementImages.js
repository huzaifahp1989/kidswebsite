export function getAnnouncementImages(item) {
  if (!item) return [];

  const fromArray = Array.isArray(item.imageUrls)
    ? item.imageUrls.filter(Boolean)
    : Array.isArray(item.image_urls)
      ? item.image_urls.filter(Boolean)
      : [];

  if (fromArray.length) return fromArray;

  const single = item.imageUrl || item.image_url || '';
  return single ? [single] : [];
}

export function isPopupAnnouncement(item) {
  const value = item?.showAsPopup ?? item?.show_as_popup;
  return value === true || value === 1 || value === 'true' || value === '1';
}

export function announcementPopupStorageKey(item) {
  const version = item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at || 'v1';
  return `announcement_popup_${item?.id}_${version}_last_shown`;
}

export function canShowAnnouncementPopup(item) {
  if (!item?.id) return false;

  try {
    const hours = Number(item.popupCooldownHours ?? item.popup_cooldown_hours) || 24;
    const cooldownMs = hours * 60 * 60 * 1000;
    const raw = localStorage.getItem(announcementPopupStorageKey(item));
    const last = raw ? Number(raw) : 0;
    if (!last) return true;
    return Date.now() - last >= cooldownMs;
  } catch {
    return true;
  }
}

export function markAnnouncementPopupShown(item) {
  if (!item?.id) return;
  try {
    localStorage.setItem(announcementPopupStorageKey(item), String(Date.now()));
  } catch {}
}

export function pickAnnouncementPopup(announcements = []) {
  const candidates = announcements
    .filter(isPopupAnnouncement)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return candidates.find(canShowAnnouncementPopup) || null;
}
