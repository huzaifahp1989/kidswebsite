import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  SURVEY_QUESTIONS,
  countAnswered,
  validateEntryInput,
} from '@/utils/survey';
import { PLAY_STORE_URL } from '@/utils/inAppReview';
import { openExternalUrl } from '@/utils/androidWebView';
import { ArrowLeft, Check, ShieldCheck, Gift, Clock, Loader2, AlertCircle } from 'lucide-react';

const WEBSITE_URL = import.meta.env.VITE_SITE_URL || 'https://islammediacentral.com';

const GOLD = '#C9A227';

function trackEvent(name, params = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  } catch {
    /* analytics is best-effort only */
  }
}

function useCountdown(closesAt) {
  const target = closesAt ? new Date(closesAt).getTime() : null;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!target) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = target - now;
  if (diff <= 0) return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    ended: false,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Countdown({ closesAt }) {
  const parts = useCountdown(closesAt);
  if (!parts) return null;
  if (parts.ended) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700">
        <Clock className="h-4 w-4" /> This prize draw has now closed
      </p>
    );
  }
  const cells = [
    { label: 'Days', value: parts.days },
    { label: 'Hours', value: parts.hours },
    { label: 'Mins', value: parts.minutes },
    { label: 'Secs', value: parts.seconds },
  ];
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f2a5f]/70">
        Closes in
      </p>
      <div className="mt-2 flex gap-2">
        {cells.map((c) => (
          <div
            key={c.label}
            className="min-w-[62px] rounded-xl border border-[#0f2a5f]/10 bg-white px-2 py-2 text-center shadow-sm"
          >
            <div className="text-xl font-extrabold tabular-nums text-[#0f2a5f]">
              {String(c.value).padStart(2, '0')}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrizeCard({ prize }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#0f2a5f]/10 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-[#EFF6FF]">
        {prize.imageUrl ? (
          <img
            src={prize.imageUrl}
            alt={prize.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">🎁</div>
        )}
        {prize.valueLabel && (
          <span
            className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-[#3a2c00] shadow"
            style={{ backgroundColor: GOLD }}
          >
            {prize.valueLabel}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-extrabold text-[#0f2a5f] sm:text-base">{prize.title}</h3>
        {prize.description && (
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{prize.description}</p>
        )}
        <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#0f2a5f]/60">
          {prize.winnersCount || 1} winner{(prize.winnersCount || 1) === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#0f2a5f]/70">
        <span>
          {completed} of {total} answered
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#DBEAFE]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#123b7a] to-[#0f2a5f] transition-all duration-300"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  );
}

function OptionButton({ label, selected, multi, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${
        selected
          ? 'border-[#0f2a5f] bg-[#EFF6FF] shadow-sm'
          : 'border-slate-200 bg-white hover:border-[#0f2a5f]/40 hover:bg-[#F8FBFF]'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${
          multi ? 'rounded-md' : 'rounded-full'
        } ${selected ? 'border-[#0f2a5f] bg-[#0f2a5f] text-white' : 'border-slate-300 text-transparent'}`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
      <span className="text-sm font-semibold text-slate-800">{label}</span>
    </button>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wider text-[#0f2a5f]/80">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-white to-[#DBEAFE]">
      <header className="bg-gradient-to-r from-[#0f2a5f] via-[#123b7a] to-[#0b2454] text-white shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          <Link
            to={createPageUrl('Home')}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label="Islam Media Central home"
          >
            <span className="text-2xl md:text-3xl">🌙</span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight md:text-base">
                Islam Media Central
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Survey &amp; Prize Draw
              </span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">{children}</main>
      <footer className="border-t border-[#0f2a5f]/10 bg-white/70 px-4 py-6 text-center">
        <Link
          to={createPageUrl('SurveyTerms')}
          className="text-xs font-bold text-[#0f2a5f] underline decoration-dotted underline-offset-4"
        >
          Prize draw terms &amp; conditions
        </Link>
        <p className="mt-2 text-[11px] text-slate-500">
          Free to enter — no purchase necessary.
        </p>
      </footer>
    </div>
  );
}

export default function Survey() {
  const [phase, setPhase] = React.useState('loading'); // loading | intro | survey | entry | done | closed | unavailable
  const [campaign, setCampaign] = React.useState(null);
  const [prizes, setPrizes] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [loadError, setLoadError] = React.useState('');
  const [setupRequired, setSetupRequired] = React.useState(false);

  const [answers, setAnswers] = React.useState({});
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [questionError, setQuestionError] = React.useState('');

  const [form, setForm] = React.useState({
    firstName: '',
    email: '',
    ageBracket: '',
    guardianEmail: '',
    guardianConsent: false,
    termsAccepted: false,
    marketingOptIn: false,
  });
  const [company, setCompany] = React.useState(''); // honeypot
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [entry, setEntry] = React.useState(null);

  const startedAt = React.useRef(Date.now());
  const totalQuestions = SURVEY_QUESTIONS.length;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/survey');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          if (json?.setupRequired) setSetupRequired(true);
          setLoadError(json?.error || 'Could not load the survey.');
          setPhase('unavailable');
          return;
        }
        if (!json?.campaign) {
          setPhase('unavailable');
          setLoadError('There is no survey running at the moment. Please check back soon.');
          return;
        }
        setCampaign(json.campaign);
        setPrizes(Array.isArray(json.prizes) ? json.prizes : []);
        setStats(json.stats || null);
        setPhase(json.campaign.isOpen ? 'intro' : 'closed');
        trackEvent('survey_view', { campaign: json.campaign.slug });
      } catch (err) {
        if (cancelled) return;
        setLoadError(err?.message || 'Could not load the survey.');
        setPhase('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentQuestion = SURVEY_QUESTIONS[questionIndex];
  const answeredCount = countAnswered(answers);

  const setAnswer = (key, value) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));
  const resetQuestionError = () => setQuestionError('');

  const handleNext = () => {
    const q = currentQuestion;
    const value = answers[q.key];
    if (q.type === 'multi') {
      if (q.required && (!Array.isArray(value) || value.length === 0)) {
        setQuestionError('Please select at least one option.');
        return;
      }
    } else if (q.required && (typeof value !== 'string' || !value.trim())) {
      setQuestionError('Please choose an option to continue.');
      return;
    }
    resetQuestionError();
    if (questionIndex + 1 < totalQuestions) {
      setQuestionIndex((i) => i + 1);
    } else {
      trackEvent('survey_questions_complete', { answered: answeredCount });
      setPhase('entry');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    resetQuestionError();
    if (questionIndex === 0) {
      setPhase('intro');
      return;
    }
    setQuestionIndex((i) => i - 1);
  };

  const toggleMulti = (key, option) => {
    resetQuestionError();
    const list = Array.isArray(answers[key]) ? answers[key] : [];
    setAnswer(key, list.includes(option) ? list.filter((v) => v !== option) : [...list, option]);
  };

  const submit = async () => {
    const invalid = validateEntryInput(form);
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, answers, company, startedAt: startedAt.current, slug: campaign?.slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(json?.error || 'Sorry, we could not record your entry. Please try again.');
        return;
      }
      setEntry({ id: json.entryId, firstName: form.firstName });
      setPhase('done');
      if (form.marketingOptIn) trackEvent('survey_marketing_opt_in', { campaign: campaign?.slug });
      trackEvent('survey_entry_complete', { campaign: campaign?.slug });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err?.message || 'Sorry, we could not record your entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareText = encodeURIComponent(
    'I just completed the Islam Media Central survey for a chance to win prizes. Have your say too!'
  );
  const shareUrl = encodeURIComponent(`${WEBSITE_URL}/Survey`);
  const shareLinks = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${shareText}%20${shareUrl}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}` },
  ];

  /* ------------------------------- rendering ------------------------------- */

  if (phase === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-[#0f2a5f]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm font-bold">Loading the survey…</p>
        </div>
      </Shell>
    );
  }

  if (phase === 'unavailable') {
    return (
      <Shell>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-3xl">🕰️</p>
          <h1 className="mt-2 text-lg font-extrabold text-amber-900">Survey not available</h1>
          <p className="mt-1 text-sm text-amber-800">{loadError}</p>
          {setupRequired && (
            <p className="mt-3 rounded-lg bg-white/70 p-3 text-left text-xs text-amber-900">
              Admin: run <code>supabase/create-survey-prize-draw.sql</code> in the Supabase SQL
              editor to create the survey tables.
            </p>
          )}
          <Link
            to={createPageUrl('Home')}
            className="mt-4 inline-flex rounded-xl bg-[#0f2a5f] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            Back to Islam Media Central
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === 'closed') {
    return (
      <Shell>
        <div className="rounded-2xl border border-[#0f2a5f]/10 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-xl font-extrabold text-[#0f2a5f]">
            {campaign?.title || 'Have Your Say & Win Prizes!'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{campaign?.reason}</p>
          {prizes.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
              {prizes.map((p) => (
                <PrizeCard key={p.id} prize={p} />
              ))}
            </div>
          )}
          <Link
            to={createPageUrl('Home')}
            className="mt-6 inline-flex rounded-xl bg-[#0f2a5f] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            Back to Islam Media Central
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    const firstName = entry?.firstName || form.firstName;
    return (
      <Shell>
        <div className="rounded-2xl border border-[#0f2a5f]/10 bg-white p-6 text-center shadow-sm sm:p-8">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ backgroundColor: '#FDF6E3' }}
          >
            🎉
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-[#0f2a5f]">
            Thank You for Taking Part{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Thank you for helping Islam Media Central improve.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Your survey has been submitted, and your prize draw entry has been recorded.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            You now have a chance to win a takeaway voucher, an Amazon gift voucher, or a
            personalised Islam Media Central mug and keyring!
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Winners will be contacted using the details provided, in accordance with the competition
            terms and conditions.
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#0f2a5f]">
            Keep following Islam Media Central for more competitions, Islamic reminders and exciting
            activities!
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => openExternalUrl(WEBSITE_URL)}
              className="rounded-xl bg-gradient-to-r from-[#123b7a] to-[#0f2a5f] px-5 py-3 text-sm font-extrabold text-white shadow-md hover:shadow-lg"
            >
              Visit Islam Media Central
            </button>
            <button
              type="button"
              onClick={() => openExternalUrl(PLAY_STORE_URL)}
              className="rounded-xl border-2 border-[#0f2a5f] bg-white px-5 py-3 text-sm font-extrabold text-[#0f2a5f] hover:bg-[#EFF6FF]"
            >
              Download the App
            </button>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f2a5f]/70">
              Share with friends
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {shareLinks.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => openExternalUrl(s.href)}
                  className="rounded-full border border-[#0f2a5f]/20 bg-white px-4 py-2 text-xs font-bold text-[#0f2a5f] hover:bg-[#EFF6FF]"
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(`${WEBSITE_URL}/Survey`);
                  } catch {
                    /* clipboard may be unavailable */
                  }
                }}
                className="rounded-full border border-[#0f2a5f]/20 bg-white px-4 py-2 text-xs font-bold text-[#0f2a5f] hover:bg-[#EFF6FF]"
              >
                Copy link
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'entry') {
    const isMinor = form.ageBracket === 'minor';
    return (
      <Shell>
        <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0f2a5f]/70">
          <ShieldCheck className="h-4 w-4" /> Prize draw entry
        </div>

        <div className="rounded-2xl border border-[#0f2a5f]/10 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-extrabold text-[#0f2a5f] sm:text-2xl">
            Enter the prize draw
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your survey answers are saved. Add a few details so we can contact you if you win.
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <FieldLabel required>First name</FieldLabel>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                maxLength={60}
                autoComplete="given-name"
                placeholder="e.g. Aisha"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f2a5f] focus:ring-2 focus:ring-[#0f2a5f]/20"
              />
            </div>

            <div>
              <FieldLabel required>Email address</FieldLabel>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={160}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f2a5f] focus:ring-2 focus:ring-[#0f2a5f]/20"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                One entry per email address. We only use this to administer the prize draw.
              </p>
            </div>

            <div>
              <FieldLabel required>Age confirmation</FieldLabel>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <OptionButton
                  label="I am 18 or over"
                  selected={form.ageBracket === 'adult'}
                  onClick={() => setForm({ ...form, ageBracket: 'adult' })}
                />
                <OptionButton
                  label="I am under 18"
                  selected={form.ageBracket === 'minor'}
                  onClick={() => setForm({ ...form, ageBracket: 'minor' })}
                />
              </div>
            </div>

            {isMinor && (
              <div className="rounded-xl border border-[#0f2a5f]/15 bg-[#F8FBFF] p-4">
                <p className="text-xs font-semibold text-[#0f2a5f]">
                  Entrants under 18 need a parent or guardian to enter on their behalf.
                </p>
                <div className="mt-3">
                  <FieldLabel required>Parent or guardian email</FieldLabel>
                  <input
                    type="email"
                    value={form.guardianEmail}
                    onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                    maxLength={160}
                    inputMode="email"
                    placeholder="parent@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f2a5f] focus:ring-2 focus:ring-[#0f2a5f]/20"
                  />
                </div>
                <label className="mt-3 flex items-start gap-2.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.guardianConsent}
                    onChange={(e) => setForm({ ...form, guardianConsent: e.target.checked })}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-[#0f2a5f]"
                  />
                  <span>
                    As the parent or guardian, I consent to this entry and to the details above being
                    used to administer the prize draw.
                  </span>
                </label>
              </div>
            )}

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-[#0f2a5f]"
              />
              <span>
                I have read and agree to the{' '}
                <Link
                  to={createPageUrl('SurveyTerms')}
                  className="font-bold text-[#0f2a5f] underline decoration-dotted underline-offset-2"
                >
                  prize draw terms and conditions
                </Link>{' '}
                <span className="text-rose-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.marketingOptIn}
                onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-[#0f2a5f]"
              />
              <span>
                Optional: send me Islam Media Central news, updates and promotional emails. This is
                not required to enter the prize draw, and you can unsubscribe at any time.
              </span>
            </label>

            {/* Honeypot — hidden from people, tempting to bots. */}
            <div className="sr-only" aria-hidden="true">
              <label>
                Company
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#123b7a] to-[#0f2a5f] px-5 py-3.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                {submitting ? 'Submitting…' : 'Submit my entry'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('survey');
                  setQuestionIndex(totalQuestions - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Back to questions
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'survey' && currentQuestion) {
    const q = currentQuestion;
    const value = answers[q.key];
    return (
      <Shell>
        <ProgressBar completed={answeredCount} total={totalQuestions} />

        <div className="rounded-2xl border border-[#0f2a5f]/10 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f2a5f]/60">
            Question {questionIndex + 1} of {totalQuestions}
          </p>
          <h2 className="mt-2 text-lg font-extrabold leading-snug text-[#0f2a5f] sm:text-xl">
            {q.title}
          </h2>
          {q.help && <p className="mt-1 text-xs text-slate-500">{q.help}</p>}

          <div className="mt-4 space-y-2.5">
            {q.type === 'text' ? (
              <>
                <textarea
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => setAnswer(q.key, e.target.value)}
                  rows={4}
                  maxLength={q.maxLength || 600}
                  placeholder={q.placeholder}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f2a5f] focus:ring-2 focus:ring-[#0f2a5f]/20"
                />
                <p className="text-right text-[11px] text-slate-500">
                  {(typeof value === 'string' ? value : '').length}/{q.maxLength || 600}
                </p>
              </>
            ) : (
              q.options.map((option) => {
                const selected =
                  q.type === 'multi'
                    ? Array.isArray(value) && value.includes(option)
                    : value === option;
                return (
                  <OptionButton
                    key={option}
                    label={option}
                    multi={q.type === 'multi'}
                    selected={selected}
                    onClick={() =>
                      q.type === 'multi'
                        ? toggleMulti(q.key, option)
                        : (resetQuestionError(), setAnswer(q.key, option))
                    }
                  />
                );
              })
            )}
          </div>

          {questionError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{questionError}</span>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="ml-auto rounded-xl bg-gradient-to-r from-[#123b7a] to-[#0f2a5f] px-6 py-3 text-sm font-extrabold text-white shadow-md hover:shadow-lg"
            >
              {questionIndex + 1 === totalQuestions ? 'Continue to entry form' : 'Next'}
            </button>
          </div>
          {!q.required && (
            <p className="mt-3 text-center text-[11px] text-slate-500">
              This question is optional — you can skip straight to the next one.
            </p>
          )}
        </div>
      </Shell>
    );
  }

  /* ------------------------------- intro hero ------------------------------ */

  return (
    <Shell>
      <section className="overflow-hidden rounded-2xl border border-[#0f2a5f]/10 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0f2a5f] via-[#123b7a] to-[#0b2454] px-5 py-7 text-center text-white sm:px-8 sm:py-9">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">
            🎁 Have Your Say &amp; Win Prizes!
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {campaign?.subtitle}
          </p>
          <Countdown closesAt={campaign?.closesAt} />
        </div>

        <div className="px-5 py-6 sm:px-8">
          {campaign?.intro && (
            <p className="text-center text-sm text-slate-600">{campaign.intro}</p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {prizes.map((p) => (
              <PrizeCard key={p.id} prize={p} />
            ))}
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-xl bg-[#F8FBFF] px-3.5 py-2.5">
              <Clock className="h-4 w-4 text-[#0f2a5f]" /> Takes 2–3 minutes
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-[#F8FBFF] px-3.5 py-2.5">
              <ShieldCheck className="h-4 w-4 text-[#0f2a5f]" /> 7 quick questions
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-[#F8FBFF] px-3.5 py-2.5">
              <Gift className="h-4 w-4 text-[#0f2a5f]" /> Free to enter
            </li>
          </ul>

          <div className="mt-7 text-center">
            <button
              type="button"
              onClick={() => {
                startedAt.current = Date.now();
                setPhase('survey');
                setQuestionIndex(0);
                trackEvent('survey_start', { campaign: campaign?.slug });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-[#123b7a] to-[#0f2a5f] px-8 py-4 text-base font-extrabold uppercase tracking-[0.08em] text-white shadow-lg transition hover:shadow-xl sm:w-auto"
            >
              Start the Survey
            </button>
            {typeof stats?.entries === 'number' && stats.entries > 0 && (
              <p className="mt-3 text-xs font-semibold text-slate-500">
                {stats.entries} {stats.entries === 1 ? 'person has' : 'people have'} entered so far
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              By taking part you agree to our{' '}
              <Link
                to={createPageUrl('SurveyTerms')}
                className="font-bold text-[#0f2a5f] underline decoration-dotted underline-offset-2"
              >
                terms and conditions
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </Shell>
  );
}
