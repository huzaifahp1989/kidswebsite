import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarqueeBanner from '@/components/MarqueeBanner.jsx';

const MAX_LEN = 200;

export default function AdminMarquee() {
  const [editingId, setEditingId] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState('0');
  const [activeInForm, setActiveInForm] = React.useState(true);
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [setupRequired, setSetupRequired] = React.useState(false);
  const [status, setStatus] = React.useState('');

  const resetForm = () => {
    setEditingId(null);
    setMessage('');
    setLinkUrl('');
    setSortOrder(String(messages.length));
    setActiveInForm(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marquee', { headers: { 'x-admin-auth': 'true' } });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessages(Array.isArray(j.messages) ? j.messages : []);
        setSetupRequired(false);
      } else if (j?.setupRequired) {
        setSetupRequired(true);
      } else {
        setStatus(j?.error || 'Failed to load messages');
      }
    } catch (e) {
      setStatus(e?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!message.trim()) {
      setStatus('Message text is required');
      return;
    }
    setLoading(true);
    setStatus('');
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        message: message.trim(),
        link_url: linkUrl.trim() ? linkUrl.trim() : null,
        active: activeInForm,
        sort_order: Number(sortOrder) || 0,
      };
      const res = await fetch('/api/admin/marquee', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      const returned = j.message;
      setMessages((prev) => {
        const next = editingId
          ? prev.map((m) => (m.id === editingId ? returned : m))
          : [...prev, returned];
        return next.sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            String(a.created_at || '').localeCompare(String(b.created_at || ''))
        );
      });
      setStatus(editingId ? 'Message updated' : 'Message added');
      resetForm();
    } catch (e) {
      setStatus(e?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (m, next) => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/admin/marquee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({
          id: m.id,
          message: m.message,
          link_url: m.link_url,
          sort_order: m.sort_order,
          active: next,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed');
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: next } : x)));
    } catch (e) {
      setStatus(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setMessage(m.message || '');
    setLinkUrl(m.link_url || '');
    setSortOrder(String(m.sort_order ?? 0));
    setActiveInForm(Boolean(m.active));
    setStatus('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/marquee?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to delete');
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      setStatus(e?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const activeMessages = React.useMemo(
    () => messages.filter((m) => m.active),
    [messages]
  );

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
            Admin · Top banner (shared DB)
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            📢 Marquee Banner Messages
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Each active message scrolls across the animated banner at the very top of every page.
            Messages are ordered by the display-order number, then by the time they were added.
          </p>
        </header>

        {setupRequired && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-bold text-amber-900">Migration not applied yet</p>
            <p className="text-amber-800 mt-1">
              Run <code className="bg-white/70 rounded px-1">supabase/create-marquee-messages.sql</code>{' '}
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

        {/* Live preview */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Live preview
            </h2>
            <p className="text-[11px] text-slate-500">
              Exactly how the banner appears on the site (active messages only).
            </p>
          </div>
          {activeMessages.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              The banner is hidden while there are no active messages.
            </p>
          ) : (
            <MarqueeBanner messages={activeMessages} />
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingId ? 'Edit message' : 'Add a message'}
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
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_LEN}
                  rows={3}
                  placeholder="e.g. New weekly competition is live — join now!"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-y"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {message.length}/{MAX_LEN} · keep it short so it reads well while scrolling.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Link URL (optional)
                </label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://… (makes the message tappable)"
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
                  <p className="mt-1 text-[11px] text-slate-500">Lower numbers scroll first.</p>
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
                  {editingId ? 'Save changes' : 'Add message'}
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
              <h2 className="text-lg font-extrabold text-slate-900">All messages</h2>
              <span className="text-xs text-slate-500">
                {activeMessages.length} active / {messages.length} total
              </span>
            </div>
            {loading && messages.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-500 text-sm">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-4xl mb-2">📢</p>
                <p className="font-bold text-slate-800">No messages yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  The banner stays hidden until you add at least one active message.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {messages.map((m) => (
                  <li key={m.id} className="px-5 py-4 hover:bg-slate-50/60 transition">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">
                        {m.sort_order ?? 0}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 break-words">{m.message}</p>
                          <span
                            className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1 ${
                              m.active
                                ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}
                          >
                            {m.active ? 'Shown' : 'Hidden'}
                          </span>
                        </div>
                        {m.link_url && (
                          <p className="mt-1 text-xs text-teal-700 truncate">🔗 {m.link_url}</p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(m)}
                            className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(m, !m.active)}
                            className="rounded-lg bg-white border border-slate-300 text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-50"
                          >
                            {m.active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(m.id)}
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
