import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AdminImagePicker from '@/components/AdminImagePicker.jsx';
import { AlertCircle, Download, Gift, Loader2, RefreshCw, Shuffle, Trash2, Plus } from 'lucide-react';

const ADMIN_HEADERS = { 'x-admin-auth': 'true' };
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'prizes', label: 'Prizes' },
  { id: 'entries', label: 'Entries' },
  { id: 'results', label: 'Survey results' },
  { id: 'winners', label: 'Winners' },
  { id: 'settings', label: 'Settings & T&Cs' },
];

const STATUS_OPTIONS = ['selected', 'contacted', 'claimed', 'dispatched', 'collected'];

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(value);
  }
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
    status === 'selected'
      ? 'bg-slate-100 text-slate-700 ring-slate-200'
      : status === 'contacted'
        ? 'bg-blue-100 text-blue-800 ring-blue-200'
        : status === 'claimed'
          ? 'bg-amber-100 text-amber-800 ring-amber-200'
          : 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}

export default function AdminSurvey() {
  const [tab, setTab] = React.useState('overview');
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState('');
  const [setupRequired, setSetupRequired] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const [prizeForm, setPrizeForm] = React.useState({
    id: null,
    title: '',
    description: '',
    value_label: '',
    image_url: '',
    winners_count: 1,
    sort_order: 0,
    active: true,
  });

  const [settings, setSettings] = React.useState(null);
  const settingsInitialized = React.useRef(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/survey', { headers: ADMIN_HEADERS });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(json);
        setSetupRequired(false);
        if (json?.campaign && !settingsInitialized.current) {
          settingsInitialized.current = true;
          setSettings({
            title: json.campaign.title || '',
            subtitle: json.campaign.subtitle || '',
            intro: json.campaign.intro || '',
            opensAt: toLocalInput(json.campaign.opensAt),
            closesAt: toLocalInput(json.campaign.closesAt),
            maxWinners: json.campaign.maxWinners ?? 3,
            retentionMonths: json.campaign.retentionMonths ?? 12,
            isPublished: json.campaign.isPublished !== false,
          });
        }
      } else if (json?.setupRequired) {
        setSetupRequired(true);
      } else {
        setStatus(json?.error || 'Failed to load survey data');
      }
    } catch (err) {
      setStatus(err?.message || 'Failed to load survey data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const post = async (path, body) => {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ADMIN_HEADERS },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      return json;
    } catch (err) {
      setStatus(err?.message || 'Request failed');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const reload = async () => {
    await load();
  };

  const savePrize = async () => {
    if (!prizeForm.title.trim()) {
      setStatus('Prize title is required');
      return;
    }
    const json = await post('/api/admin/survey/prizes', {
      ...prizeForm,
      slug: data?.campaign?.slug,
      winners_count: Number(prizeForm.winners_count) || 1,
      sort_order: Number(prizeForm.sort_order) || 0,
    });
    if (json) {
      setStatus(prizeForm.id ? 'Prize updated' : 'Prize added');
      setPrizeForm({
        id: null,
        title: '',
        description: '',
        value_label: '',
        image_url: '',
        winners_count: 1,
        sort_order: (data?.prizes?.length || 0),
        active: true,
      });
      await reload();
    }
  };

  const deletePrize = async (id) => {
    if (!window.confirm('Remove this prize from the draw?')) return;
    const json = await post('/api/admin/survey/prizes', { action: 'delete', id, slug: data?.campaign?.slug });
    if (json) {
      setStatus('Prize removed');
      await reload();
    }
  };

  const runDraw = async () => {
    const already = (data?.winners || []).length > 0;
    const message = already
      ? 'A draw has already been made. Running it again will clear the existing winners and select a fresh set. Continue?'
      : 'Select winners at random from all eligible entries? This is recorded with the date and time and cannot target specific people.';
    if (!window.confirm(message)) return;
    const json = await post('/api/admin/survey/draw', { slug: data?.campaign?.slug, replace: already });
    if (json) {
      setStatus(`Draw complete — ${json.winnersDrawn} winner(s) selected from ${json.poolSize} entries.`);
      await reload();
    }
  };

  const updateWinner = async (id, patch) => {
    const json = await post('/api/admin/survey/winners', { id, slug: data?.campaign?.slug, ...patch });
    if (json) {
      setData((prev) => (prev ? { ...prev, winners: json.winners } : prev));
      setStatus('Winner updated');
    }
  };

  const saveSettings = async () => {
    const json = await post('/api/admin/survey/campaign', {
      slug: data?.campaign?.slug,
      title: settings.title,
      subtitle: settings.subtitle,
      intro: settings.intro,
      opensAt: settings.opensAt ? new Date(settings.opensAt).toISOString() : '',
      closesAt: settings.closesAt ? new Date(settings.closesAt).toISOString() : '',
      maxWinners: Number(settings.maxWinners) || 1,
      retentionMonths: Number(settings.retentionMonths) || 12,
      isPublished: settings.isPublished,
    });
    if (json) {
      setStatus('Competition settings saved');
      await reload();
    }
  };

  const exportCsv = async (type) => {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(`/api/admin/survey/export?type=${type}`, { headers: ADMIN_HEADERS });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imc-survey-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${type} to CSV`);
    } catch (err) {
      setStatus(err?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const entries = data?.entries || [];
  const filteredEntries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.guardianEmail || '').toLowerCase().includes(q)
    );
  }, [entries, search]);

  const stats = data?.stats;
  const campaign = data?.campaign;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <Link
            to={createPageUrl('AdminDashboard')}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-800"
          >
            ← Admin Dashboard
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Admin · Survey &amp; prize draw (shared DB)
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            🎁 Survey &amp; Prize Draw
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {campaign
              ? `${campaign.title} · ${campaign.isOpen ? 'Open for entries' : 'Closed'} · ${stats?.entries || 0} entries`
              : 'Manage the public survey, the prizes on offer and the winner draw.'}
          </p>
        </header>

        {setupRequired && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-bold text-amber-900">Migration not applied yet</p>
            <p className="mt-1 text-amber-800">
              Run <code className="rounded bg-white/70 px-1">supabase/create-survey-prize-draw.sql</code>{' '}
              in the Supabase SQL editor on project{' '}
              <code className="rounded bg-white/70 px-1">jlqrbbqsuksncrxjcmbc</code>, then refresh.
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
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{status}</span>
          </div>
        )}

        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === t.id
                  ? 'bg-slate-900 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </nav>

        {loading && !data ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !campaign ? (
          <Card className="p-8 text-center">
            <p className="text-3xl">🗒️</p>
            <p className="mt-2 font-bold text-slate-800">No campaign found</p>
            <p className="mt-1 text-sm text-slate-500">
              Apply the migration to create the starter campaign and prizes.
            </p>
          </Card>
        ) : (
          <>
            {/* ------------------------------ overview ------------------------------ */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat label="Eligible entries" value={stats?.entries ?? 0} />
                  <Stat
                    label="Marketing opt-ins"
                    value={stats?.marketingOptIn ?? 0}
                    hint="Optional consent only"
                  />
                  <Stat label="Under-18 entries" value={stats?.minors ?? 0} hint="Guardian consent recorded" />
                  <Stat
                    label="Winners drawn"
                    value={`${stats?.winners ?? 0} / ${stats?.totalPrizeSlots ?? 0}`}
                    hint={campaign.drawCompletedAt ? formatDateTime(campaign.drawCompletedAt) : 'Not drawn yet'}
                  />
                </div>

                <Card className="p-5">
                  <h2 className="text-lg font-extrabold text-slate-900">Competition status</h2>
                  <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Opens</dt>
                      <dd className="text-slate-800">{formatDateTime(campaign.opensAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Closes</dt>
                      <dd className="text-slate-800">{formatDateTime(campaign.closesAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">State</dt>
                      <dd className="text-slate-800">
                        {campaign.isOpen ? 'Open for entries' : campaign.reason}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Published</dt>
                      <dd className="text-slate-800">{campaign.isPublished ? 'Yes' : 'No (hidden)'}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={createPageUrl('Survey')}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      View public survey page
                    </Link>
                    <Link
                      to={createPageUrl('SurveyTerms')}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      View terms &amp; conditions
                    </Link>
                    <button
                      type="button"
                      onClick={() => void exportCsv('entries')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" /> Export entries CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => void exportCsv('responses')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" /> Export responses CSV
                    </button>
                  </div>
                </Card>

                <Card className="p-5">
                  <h2 className="text-lg font-extrabold text-slate-900">Prizes on offer</h2>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {(data.prizes || []).map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title} className="h-32 w-full object-cover" />
                        ) : (
                          <div className="flex h-32 items-center justify-center bg-slate-100 text-3xl">🎁</div>
                        )}
                        <div className="p-3">
                          <p className="text-sm font-bold text-slate-900">{p.title}</p>
                          <p className="text-xs text-slate-500">
                            {p.valueLabel || 'No value set'} · {p.winnersCount} winner
                            {p.winnersCount === 1 ? '' : 's'}
                            {p.active ? '' : ' · hidden'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(data.prizes || []).length === 0 && (
                      <p className="text-sm text-slate-500">No prizes yet — add one in the Prizes tab.</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* -------------------------------- prizes ------------------------------ */}
            {tab === 'prizes' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Card className="p-5 lg:col-span-2">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {prizeForm.id ? 'Edit prize' : 'Add a prize'}
                  </h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        value={prizeForm.title}
                        onChange={(e) => setPrizeForm({ ...prizeForm, title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={prizeForm.description}
                        onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                        className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Value
                        </label>
                        <input
                          value={prizeForm.value_label}
                          onChange={(e) => setPrizeForm({ ...prizeForm, value_label: e.target.value })}
                          placeholder="£25"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Winners
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={prizeForm.winners_count}
                          onChange={(e) => setPrizeForm({ ...prizeForm, winners_count: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Order
                        </label>
                        <input
                          type="number"
                          value={prizeForm.sort_order}
                          onChange={(e) => setPrizeForm({ ...prizeForm, sort_order: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>

                    <AdminImagePicker
                      label="Prize image"
                      value={prizeForm.image_url}
                      onChange={(url) => setPrizeForm({ ...prizeForm, image_url: url })}
                      folder="survey-prizes"
                    />

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded accent-blue-600"
                        checked={prizeForm.active}
                        onChange={(e) => setPrizeForm({ ...prizeForm, active: e.target.checked })}
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {prizeForm.active ? 'Shown on the page' : 'Hidden'}
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void savePrize()}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" /> {prizeForm.id ? 'Save prize' : 'Add prize'}
                      </button>
                      {prizeForm.id && (
                        <button
                          type="button"
                          onClick={() =>
                            setPrizeForm({
                              id: null,
                              title: '',
                              description: '',
                              value_label: '',
                              image_url: '',
                              winners_count: 1,
                              sort_order: data.prizes?.length || 0,
                              active: true,
                            })
                          }
                          className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden lg:col-span-3">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-extrabold text-slate-900">All prizes</h2>
                    <span className="text-xs text-slate-500">{(data.prizes || []).length} total</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {(data.prizes || []).map((p) => (
                      <li key={p.id} className="flex items-start gap-3 px-5 py-4">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                            🎁
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">{p.title}</p>
                            {!p.active && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {p.valueLabel || 'No value'} · {p.winnersCount} winner
                            {p.winnersCount === 1 ? '' : 's'} · order {p.sortOrder}
                          </p>
                          {p.description && (
                            <p className="mt-1 text-xs text-slate-500">{p.description}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPrizeForm({
                                  id: p.id,
                                  title: p.title || '',
                                  description: p.description || '',
                                  value_label: p.valueLabel || '',
                                  image_url: p.imageUrl || '',
                                  winners_count: p.winnersCount || 1,
                                  sort_order: p.sortOrder || 0,
                                  active: p.active !== false,
                                })
                              }
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deletePrize(p.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                    {(data.prizes || []).length === 0 && (
                      <li className="px-5 py-10 text-center text-sm text-slate-500">No prizes yet.</li>
                    )}
                  </ul>
                </Card>
              </div>
            )}

            {/* -------------------------------- entries ----------------------------- */}
            {tab === 'entries' && (
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Eligible entries</h2>
                    <p className="text-xs text-slate-500">
                      {filteredEntries.length} shown of {entries.length}
                      {stats?.entriesTruncated ? ' (first 1000)' : ''}
                    </p>
                  </div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email or guardian email…"
                    className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:ml-auto sm:w-72"
                  />
                  <button
                    type="button"
                    onClick={() => void exportCsv('responses')}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Submitted</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Age</th>
                        <th className="px-4 py-3">Guardian</th>
                        <th className="px-4 py-3">Consents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/60">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                            {formatDateTime(e.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{e.firstName}</td>
                          <td className="px-4 py-3 text-slate-700">{e.email}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {e.ageBracket === 'minor' ? 'Under 18' : '18 or over'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {e.guardianEmail || '—'}
                            {e.guardianEmail && (
                              <span className="ml-1 text-[10px] font-bold uppercase text-emerald-700">
                                {e.guardianConsent ? 'consent' : 'no consent'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                              T&amp;C ✓
                            </span>
                            {e.marketingOptIn && (
                              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-700">
                                marketing
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredEntries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            No entries yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* -------------------------------- results ----------------------------- */}
            {tab === 'results' && (
              <div className="space-y-6">
                {(data.results || []).map((r) => (
                  <Card key={r.key} className="p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-extrabold text-slate-900">{r.title}</h2>
                      <span className="text-xs font-bold text-slate-500">
                        {r.type === 'text' ? `${r.total} written answers` : `${r.total} responses`}
                      </span>
                    </div>
                    {r.type === 'text' ? (
                      r.samples.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {r.samples.slice(0, 12).map((s, i) => (
                            <li
                              key={i}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700"
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No written answers yet.</p>
                      )
                    ) : (
                      <ul className="mt-3 space-y-2.5">
                        {r.counts.map((c) => {
                          const pct = r.total > 0 ? Math.round((c.count / r.total) * 100) : 0;
                          return (
                            <li key={c.option}>
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                <span>{c.option}</span>
                                <span className="tabular-nums text-slate-500">
                                  {c.count} · {pct}%
                                </span>
                              </div>
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                  style={{ width: `${Math.max(pct, 1)}%` }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                ))}
                <Card className="p-5">
                  <p className="text-xs text-slate-500">
                    Results are anonymised — personal details are never shown here, only tallies.
                  </p>
                </Card>
              </div>
            )}

            {/* -------------------------------- winners ----------------------------- */}
            {tab === 'winners' && (
              <div className="space-y-6">
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">Random winner selection</h2>
                      <p className="mt-1 max-w-2xl text-xs text-slate-500">
                        Winners are chosen with a cryptographically secure random draw from all
                        eligible entries. Every entry has an equal chance, and the date, time and a
                        tamper-evident proof hash are recorded. Administrators cannot target or
                        exclude individual entrants.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runDraw()}
                      disabled={busy || entries.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                    >
                      <Shuffle className="h-4 w-4" />
                      {(data.winners || []).length > 0 ? 'Run a new draw' : 'Select winners now'}
                    </button>
                  </div>
                  {campaign.drawCompletedAt && (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                      Last draw: {formatDateTime(campaign.drawCompletedAt)} · pool at draw time is
                      recorded with each winner.
                    </p>
                  )}
                </Card>

                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-extrabold text-slate-900">Winners</h2>
                    <span className="text-xs text-slate-500">
                      {(data.winners || []).length} selected
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {(data.winners || []).map((w) => (
                      <li key={w.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-lg">
                            🏆
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{w.firstName}</p>
                              <StatusPill status={w.fulfillmentStatus} />
                              {w.notifiedAt && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                  contacted
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-600">{w.email}</p>
                            {w.guardianEmail && (
                              <p className="text-xs text-slate-500">Guardian: {w.guardianEmail}</p>
                            )}
                            <p className="mt-1 text-xs text-slate-500">
                              🎁 {w.prizeTitle || 'Unassigned prize'}
                              {w.prizeValue ? ` · ${w.prizeValue}` : ''} · drawn{' '}
                              {formatDateTime(w.selectedAt)}
                            </p>
                            {w.selectionProof && (
                              <p className="mt-1 truncate text-[10px] text-slate-400">
                                proof: {w.selectionProof}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <select
                                value={w.fulfillmentStatus}
                                onChange={(e) =>
                                  void updateWinner(w.id, { fulfillmentStatus: e.target.value })
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {!w.notifiedAt && (
                                <button
                                  type="button"
                                  onClick={() => void updateWinner(w.id, { markNotified: true })}
                                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                                >
                                  Mark as contacted
                                </button>
                              )}
                              <a
                                href={`mailto:${w.email}?subject=${encodeURIComponent(
                                  'Islam Media Central prize draw'
                                )}`}
                                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                              >
                                Email winner
                              </a>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {(data.winners || []).length === 0 && (
                      <li className="px-5 py-12 text-center">
                        <p className="text-3xl">🎯</p>
                        <p className="mt-2 font-bold text-slate-800">No winners drawn yet</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {entries.length > 0
                            ? 'Run the random draw when you are ready.'
                            : 'Entries will appear here once people take part.'}
                        </p>
                      </li>
                    )}
                  </ul>
                </Card>

                <Card className="p-5">
                  <h2 className="text-base font-extrabold text-slate-900">Past competitions</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {campaign.drawCompletedAt
                      ? `This draw was completed on ${formatDateTime(campaign.drawCompletedAt)}. Winner records are kept with the entry that won, so history is preserved even after entries are anonymised.`
                      : 'Completed draws are recorded here with their winners, prizes and dates.'}
                  </p>
                </Card>
              </div>
            )}

            {/* -------------------------------- settings ---------------------------- */}
            {tab === 'settings' && settings && (
              <div className="space-y-6">
                <Card className="p-5">
                  <h2 className="text-lg font-extrabold text-slate-900">Competition settings</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Title
                      </label>
                      <input
                        value={settings.title}
                        onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Subtitle
                      </label>
                      <textarea
                        rows={2}
                        value={settings.subtitle}
                        onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                        className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Intro line
                      </label>
                      <input
                        value={settings.intro}
                        onChange={(e) => setSettings({ ...settings, intro: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Opens
                      </label>
                      <input
                        type="datetime-local"
                        value={settings.opensAt}
                        onChange={(e) => setSettings({ ...settings, opensAt: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Closes (auto-closes the competition)
                      </label>
                      <input
                        type="datetime-local"
                        value={settings.closesAt}
                        onChange={(e) => setSettings({ ...settings, closesAt: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Maximum winners
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={settings.maxWinners}
                        onChange={(e) => setSettings({ ...settings, maxWinners: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Keep entry data for (months)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={settings.retentionMonths}
                        onChange={(e) => setSettings({ ...settings, retentionMonths: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 sm:col-span-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded accent-blue-600"
                        checked={settings.isPublished}
                        onChange={(e) => setSettings({ ...settings, isPublished: e.target.checked })}
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {settings.isPublished ? 'Published — visible to the public' : 'Hidden from the public'}
                      </span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveSettings()}
                    disabled={busy}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
                  >
                    <Gift className="h-4 w-4" /> Save settings
                  </button>
                </Card>

                <Card className="p-5">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Legal &amp; compliance checklist
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-amber-900">
                      Have the prize draw rules reviewed against UK prize promotion, consumer
                      protection and data protection requirements before you promote the competition.
                    </li>
                    <li>Entry is free with no purchase necessary — stated on the terms page.</li>
                    <li>
                      Marketing consent is a separate, optional checkbox and is never a condition of
                      entry.
                    </li>
                    <li>
                      Under-18 entries collect only a parent or guardian email and require their
                      consent; no other personal details are collected.
                    </li>
                    <li>
                      Entry data is deleted or anonymised after {settings.retentionMonths} months
                      except where records must be kept for legal or accounting purposes.
                    </li>
                    <li>
                      Winner selection uses a secure random draw with a recorded date, time and proof
                      hash — administrators cannot pick individuals.
                    </li>
                  </ul>
                  <Link
                    to={createPageUrl('SurveyTerms')}
                    className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Review the public terms page
                  </Link>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
