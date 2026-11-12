import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatEventWhen } from '@/utils/events';

const MAX_TITLE_LEN = 140;
const MAX_DESCRIPTION_LEN = 2000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdminEvents() {
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [activeInForm, setActiveInForm] = useState(true);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [status, setStatus] = useState('');

  const sortEvents = (list) =>
    [...list].sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.starts_at || '').localeCompare(String(b.starts_at || ''))
    );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setStartsAt('');
    setEndsAt('');
    setLocation('');
    setLinkUrl('');
    setImageUrl('');
    setSortOrder(String(events.length));
    setActiveInForm(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events', { headers: { 'x-admin-auth': 'true' } });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setEvents(sortEvents(Array.isArray(j.events) ? j.events : []));
        setSetupRequired(false);
      } else if (j?.setupRequired) {
        setSetupRequired(true);
      } else {
        setStatus(j?.error || 'Failed to load events');
      }
    } catch (e) {
      setStatus(e?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!title.trim()) {
      setStatus('Title is required');
      return;
    }
    if (!startsAt) {
      setStatus('Start date/time is required');
      return;
    }
    if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setStatus('End date/time must be after the start');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: title.trim(),
        description: description.trim(),
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
        location: location.trim(),
        link_url: linkUrl.trim() ? linkUrl.trim() : null,
        image_url: imageUrl.trim() ? imageUrl.trim() : null,
        active: activeInForm,
        sort_order: Number(sortOrder) || 0,
      };
      const res = await fetch('/api/admin/events', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      const returned = j.event;
      setEvents((prev) =>
        sortEvents(
          editingId ? prev.map((e) => (e.id === editingId ? returned : e)) : [...prev, returned]
        )
      );
      setStatus(editingId ? 'Event updated' : 'Event added');
      resetForm();
    } catch (e) {
      setStatus(e?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (event, next) => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({
          id: event.id,
          title: event.title,
          description: event.description,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          location: event.location,
          link_url: event.link_url,
          image_url: event.image_url,
          sort_order: event.sort_order,
          active: next,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed');
      setEvents((prev) =>
        sortEvents(prev.map((x) => (x.id === event.id ? { ...x, active: next } : x)))
      );
    } catch (e) {
      setStatus(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (event) => {
    setEditingId(event.id);
    setTitle(event.title || '');
    setDescription(event.description || '');
    setStartsAt(toLocalInput(event.starts_at));
    setEndsAt(toLocalInput(event.ends_at));
    setLocation(event.location || '');
    setLinkUrl(event.link_url || '');
    setImageUrl(event.image_url || '');
    setSortOrder(String(event.sort_order ?? 0));
    setActiveInForm(Boolean(event.active));
    setStatus('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to delete');
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      setStatus(e?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const activeCount = useMemo(() => events.filter((e) => e.active).length, [events]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <Link
            to={createPageUrl('AdminDashboard')}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-800"
          >
            ← Admin Dashboard
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Admin · Events (shared DB)
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            📅 Events
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Upcoming events appear in the “Latest updates” strip at the top of every page and on the
            public Updates page. Only active events with a start time in the future are shown.
          </p>
        </header>

        {setupRequired && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-bold text-amber-900">Migration not applied yet</p>
            <p className="text-amber-800 mt-1">
              Run <code className="bg-white/70 rounded px-1">supabase/create-events.sql</code> in the
              Supabase SQL editor on project{' '}
              <code className="bg-white/70 rounded px-1">jlqrbbqsuksncrxjcmbc</code>, then refresh.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              ↻ Check again
            </button>
          </div>
        )}

        {status && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            {status}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingId ? 'Edit event' : 'Add an event'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={MAX_TITLE_LEN}
                  placeholder="e.g. Community Iftar — all welcome"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {title.length}/{MAX_TITLE_LEN}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Starts <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ends (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Location (optional)
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Masjid Hall, Leeds"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={MAX_DESCRIPTION_LEN}
                  rows={3}
                  placeholder="Short details shown on the Updates page."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-y"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Link URL (optional)
                </label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://… (opens externally)"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Image URL (optional)
                </label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://… (thumbnail on the Updates page)"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Display order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Lower numbers appear first.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Active
                  </label>
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded accent-teal-600"
                      checked={activeInForm}
                      onChange={(e) => setActiveInForm(e.target.checked)}
                    />
                    <span className="text-sm font-bold text-slate-700">
                      {activeInForm ? 'Shown' : 'Hidden'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  {editingId ? 'Save changes' : 'Add event'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-60"
                >
                  Reset form
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-extrabold text-slate-900">All events</h2>
              <span className="text-xs text-slate-500">
                {activeCount} active / {events.length} total
              </span>
            </div>
            {loading && events.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-500 text-sm">Loading…</div>
            ) : events.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-4xl mb-2">📅</p>
                <p className="font-bold text-slate-800">No events yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  The strip stays hidden until you add at least one active event.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {events.map((event) => (
                  <li key={event.id} className="px-5 py-4 hover:bg-slate-50/60 transition">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">
                        {event.sort_order ?? 0}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 break-words">
                            {event.title}
                          </p>
                          <span
                            className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1 ${
                              event.active
                                ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}
                          >
                            {event.active ? 'Shown' : 'Hidden'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#1e3a8a]">
                          {formatEventWhen(event.starts_at, event.ends_at)}
                        </p>
                        {event.location && (
                          <p className="mt-0.5 text-xs text-slate-500">📍 {event.location}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(event)}
                            className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(event, !event.active)}
                            className="rounded-lg bg-white border border-slate-300 text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-50"
                          >
                            {event.active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(event.id)}
                            className="ml-auto rounded-lg bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
