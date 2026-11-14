import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AdminImagePicker from '@/components/AdminImagePicker';
import {
  DEFAULT_DAILY_SCHEDULE,
  formatDailySlotTime,
  formatSlotDay,
  formatSlotTime,
} from '@/utils/radioSchedule';

const MAX_TITLE_LEN = 140;
const MAX_PRESENTER_LEN = 80;
const MAX_DESCRIPTION_LEN = 600;

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

function timeInputValue(value) {
  return value ? String(value).slice(0, 5) : '';
}

export default function AdminRadioSchedule() {
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [presenter, setPresenter] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comingSoon, setComingSoon] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [activeInForm, setActiveInForm] = useState(true);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [status, setStatus] = useState('');

  const sortSlots = (list) =>
    [...list].sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.start_time || '').localeCompare(String(b.start_time || '')) ||
        String(a.starts_at || '').localeCompare(String(b.starts_at || ''))
    );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setPresenter('');
    setDescription('');
    setPosterUrl('');
    setRepeatDaily(true);
    setStartTime('');
    setEndTime('');
    setComingSoon(false);
    setStartsAt('');
    setEndsAt('');
    setSortOrder(String(slots.length));
    setActiveInForm(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/radio-schedule', { headers: { 'x-admin-auth': 'true' } });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setSlots(sortSlots(Array.isArray(j.slots) ? j.slots : []));
        setSetupRequired(false);
      } else if (j?.setupRequired) {
        setSetupRequired(true);
      } else {
        setStatus(j?.error || 'Failed to load the schedule');
      }
    } catch (e) {
      setStatus(e?.message || 'Failed to load the schedule');
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
    if (repeatDaily) {
      if (!startTime) {
        setStatus('Start time is required for a daily programme');
        return;
      }
      if (endTime && endTime <= startTime) {
        setStatus('End time must be after the start time');
        return;
      }
    } else {
      if (!startsAt) {
        setStatus('Start date/time is required');
        return;
      }
      if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        setStatus('End date/time must be after the start');
        return;
      }
    }
    setLoading(true);
    setStatus('');
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: title.trim(),
        presenter: presenter.trim(),
        description: description.trim(),
        poster_url: posterUrl,
        coming_soon: comingSoon,
        repeat_daily: repeatDaily,
        starts_at: repeatDaily ? null : fromLocalInput(startsAt),
        ends_at: repeatDaily ? null : fromLocalInput(endsAt),
        start_time: repeatDaily ? startTime : null,
        end_time: repeatDaily ? endTime : null,
        active: activeInForm,
        sort_order: Number(sortOrder) || 0,
      };
      const res = await fetch('/api/admin/radio-schedule', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      const returned = j.slot;
      setSlots((prev) =>
        sortSlots(
          editingId ? prev.map((s) => (s.id === editingId ? returned : s)) : [...prev, returned]
        )
      );
      setStatus(editingId ? 'Programme updated' : 'Programme added');
      resetForm();
    } catch (e) {
      setStatus(e?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Adds the standard daily line-up (8:00am–11:00pm) as separate rows so each
   * programme can then be edited, re-postered or removed on its own.
   */
  const addDefaultSchedule = async () => {
    if (
      dailySlots.length > 0 &&
      !window.confirm('You already have daily programmes. Add the default line-up as well?')
    ) {
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const created = [];
      for (const slot of DEFAULT_DAILY_SCHEDULE) {
        const res = await fetch('/api/admin/radio-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
          body: JSON.stringify({ ...slot, repeat_daily: true, active: true }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || 'Failed to add the default schedule');
        if (j.slot) created.push(j.slot);
      }
      setSlots((prev) => sortSlots([...prev, ...created]));
      setStatus(`Added ${created.length} daily programmes — edit them below.`);
    } catch (e) {
      setStatus(e?.message || 'Failed to add the default schedule');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (slot, next) => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/admin/radio-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({
          id: slot.id,
          title: slot.title,
          presenter: slot.presenter,
          description: slot.description,
          poster_url: slot.poster_url,
          coming_soon: slot.coming_soon,
          repeat_daily: slot.repeat_daily,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          start_time: slot.start_time,
          end_time: slot.end_time,
          sort_order: slot.sort_order,
          active: next,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed');
      setSlots((prev) => sortSlots(prev.map((x) => (x.id === slot.id ? { ...x, active: next } : x))));
    } catch (e) {
      setStatus(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (slot) => {
    setEditingId(slot.id);
    setTitle(slot.title || '');
    setPresenter(slot.presenter || '');
    setDescription(slot.description || '');
    setPosterUrl(slot.poster_url || '');
    setRepeatDaily(Boolean(slot.repeat_daily));
    setStartTime(timeInputValue(slot.start_time));
    setEndTime(timeInputValue(slot.end_time));
    setComingSoon(Boolean(slot.coming_soon));
    setStartsAt(toLocalInput(slot.starts_at));
    setEndsAt(toLocalInput(slot.ends_at));
    setSortOrder(String(slot.sort_order ?? 0));
    setActiveInForm(Boolean(slot.active));
    setStatus('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this programme?')) return;
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/radio-schedule?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to delete');
      setSlots((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      setStatus(e?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const dailySlots = useMemo(() => slots.filter((s) => s.repeat_daily), [slots]);
  const datedSlots = useMemo(() => slots.filter((s) => !s.repeat_daily), [slots]);
  const activeCount = useMemo(() => slots.filter((s) => s.active).length, [slots]);

  const renderSlot = (slot) => {
    const timeLabel = slot.repeat_daily
      ? formatDailySlotTime(slot.start_time, slot.end_time)
      : `${formatSlotDay(slot.starts_at)} · ${formatSlotTime(slot.starts_at, slot.ends_at)}`;
    return (
      <li key={slot.id} className="px-5 py-4 hover:bg-slate-50/60 transition">
        <div className="flex items-start gap-3">
          {slot.poster_url ? (
            <img
              src={slot.poster_url}
              alt=""
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
            />
          ) : (
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">
              {slot.sort_order ?? 0}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900 break-words">{slot.title}</p>
              <span
                className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1 ${
                  slot.active
                    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-200'
                }`}
              >
                {slot.active ? 'Shown' : 'Hidden'}
              </span>
              {slot.coming_soon ? (
                <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 ring-1 ring-amber-200">
                  Coming soon
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-semibold text-rose-700">
              {slot.repeat_daily ? `Every day · ${timeLabel}` : timeLabel}
            </p>
            {slot.presenter && <p className="mt-0.5 text-xs text-slate-500">🎙 {slot.presenter}</p>}
            {slot.description && (
              <p className="mt-1 text-xs text-slate-500">{slot.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startEdit(slot)}
                className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void toggleActive(slot, !slot.active)}
                className="rounded-lg bg-white border border-slate-300 text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-50"
              >
                {slot.active ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={() => void remove(slot.id)}
                className="ml-auto rounded-lg bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <Link
            to={createPageUrl('AdminDashboard')}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-800"
          >
            ← Admin Dashboard
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Admin · Radio Schedule (shared DB)
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            📻 Live radio schedule
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Daily programmes repeat at the same time every day — the default line-up runs 8:00am to
            11:00pm. One-off specials are shown on their own date only. Everything appears in the
            “Schedule” pop-up on the home-page radio bar.
          </p>
        </header>

        {setupRequired && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-bold text-amber-900">Migration not applied yet</p>
            <p className="text-amber-800 mt-1">
              Run <code className="bg-white/70 rounded px-1">supabase/create-radio-schedule.sql</code>{' '}
              and then{' '}
              <code className="bg-white/70 rounded px-1">
                supabase/add-radio-schedule-daily-posters.sql
              </code>{' '}
              in the Supabase SQL editor on project{' '}
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
                {editingId ? 'Edit programme' : 'Add a programme'}
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
                  Programme <span className="text-rose-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={MAX_TITLE_LEN}
                  placeholder="e.g. Tafsir of Surah Al-Kahf"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {title.length}/{MAX_TITLE_LEN}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  When
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRepeatDaily(true)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                      repeatDaily
                        ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Every day
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
                      Same time, daily
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatDaily(false)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                      !repeatDaily
                        ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    One date
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
                      Special only
                    </span>
                  </button>
                </div>
              </div>

              {repeatDaily ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Starts <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ends (optional)
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Starts <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
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
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Presenter (optional)
                </label>
                <input
                  value={presenter}
                  onChange={(e) => setPresenter(e.target.value)}
                  maxLength={MAX_PRESENTER_LEN}
                  placeholder="e.g. Ustadh Bilal"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
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
                  placeholder="Short details shown under the programme name."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none resize-y"
                />
              </div>

              <AdminImagePicker
                value={posterUrl}
                onChange={setPosterUrl}
                folder="radio-schedule"
                label="Poster (optional)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Display order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
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
                      className="h-5 w-5 rounded accent-rose-600"
                      checked={activeInForm}
                      onChange={(e) => setActiveInForm(e.target.checked)}
                    />
                    <span className="text-sm font-bold text-slate-700">
                      {activeInForm ? 'Shown' : 'Hidden'}
                    </span>
                  </label>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 rounded accent-amber-600"
                  checked={comingSoon}
                  onChange={(e) => setComingSoon(e.target.checked)}
                />
                <span className="text-sm text-slate-700">
                  <span className="font-bold">Coming soon</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Shows an amber “Coming soon” badge in the schedule pop-up.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  {editingId ? 'Save changes' : 'Add programme'}
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
              <h2 className="text-lg font-extrabold text-slate-900">All programmes</h2>
              <span className="text-xs text-slate-500">
                {activeCount} active / {slots.length} total
              </span>
            </div>
            {loading && slots.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-500 text-sm">Loading…</div>
            ) : slots.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-4xl mb-2">📻</p>
                <p className="font-bold text-slate-800">No programmes yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Start from the daily line-up — Quran and Nasheeds from 8:00am, then the shows
                  through to 11:00pm. Everything is editable afterwards.
                </p>
                <button
                  type="button"
                  onClick={() => void addDefaultSchedule()}
                  disabled={loading}
                  className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  Add the default 8:00am–11:00pm schedule
                </button>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {dailySlots.length > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                        Every day
                      </p>
                      <button
                        type="button"
                        onClick={() => void addDefaultSchedule()}
                        disabled={loading}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 disabled:opacity-60"
                      >
                        + Add the default line-up
                      </button>
                    </div>
                    <ul className="divide-y divide-slate-100">{dailySlots.map(renderSlot)}</ul>
                  </>
                )}
                {datedSlots.length > 0 && (
                  <>
                    <div className="border-y border-slate-100 bg-slate-50/80 px-5 py-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                        One-off dates
                      </p>
                    </div>
                    <ul className="divide-y divide-slate-100">{datedSlots.map(renderSlot)}</ul>
                  </>
                )}
                {dailySlots.length === 0 && datedSlots.length > 0 && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => void addDefaultSchedule()}
                      disabled={loading}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 disabled:opacity-60"
                    >
                      + Add the default daily line-up (8:00am–11:00pm)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
