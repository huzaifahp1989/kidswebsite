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
