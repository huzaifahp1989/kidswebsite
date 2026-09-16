export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatScheduleLabel(item) {
  const start = item?.startsAt || item?.starts_at;
  const end = item?.endsAt || item?.ends_at;
  if (!start && !end) return 'Always on';

  const fmt = (value) => {
    try {
      return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return value;
    }
  };

  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end)}`;
}

export function isAnnouncementScheduledNow(item, now = new Date()) {
  const start = item?.startsAt || item?.starts_at;
  const end = item?.endsAt || item?.ends_at;
  const time = now.getTime();

  if (start) {
    const startTime = new Date(start).getTime();
    if (!Number.isNaN(startTime) && time < startTime) return false;
  }

  if (end) {
    const endTime = new Date(end).getTime();
    if (!Number.isNaN(endTime) && time > endTime) return false;
  }

  return true;
}
