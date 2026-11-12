import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import {
  AlertCircle,
  BookOpen,
  Check,
  Clock,
  HandHeart,
  Heart,
  Loader2,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addDuaRequest,
  fetchCommunityDuroodStats,
  fetchCommunityJuzStats,
  fetchDuaRequests,
  fetchDuroodLeaderboard,
  fetchJuzLeaderboard,
  fetchWeeklyQuranCompletionStats,
  formatCampaignWeek,
  isWorshipConfigured,
  joinQuranWeeklyCompletion,
  newIdempotencyKey,
  recordDuroodCompletion,
  recordQuranJuz,
  removeDuaRequests,
  removeDuroodEntries,
  removeQuranJuzEntries,
  subscribeWorshipChanges,
} from "@/lib/worshipStats";

const NAME_STORAGE_KEY = "worship_display_name";
const TAB_STORAGE_KEY = "worship_active_tab";
const SELECTED_JUZ_STORAGE_KEY = "worship_selected_juz";
const COMPLETED_JUZ_STORAGE_KEY = "worship_completed_juz";
const BANNER_DISMISSED_KEY = "worship_banner_dismissed";
const POPUP_SEEN_KEY = "worship_popup_seen";
const WEEKLY_JOINED_KEY = "worship_weekly_joined_week";
// The keys of the entries this device created, so a mistake can be undone.
// Only these exact rows can ever be removed — see remove-worship-entries.sql.
const MY_JUZ_KEY = "worship_my_juz_entries";
const MY_DUROOD_KEY = "worship_my_durood_entries";
const MY_DUA_KEY = "worship_my_dua_requests";
// Older than this and the chip is more clutter than help.
const MY_ENTRY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DUROOD_PRESETS = [10, 33, 100, 500];
const JUZ_NUMBERS = Array.from({ length: 30 }, (_, index) => index + 1);
const BOARD_SIZE = 10;
const DUA_BOARD_SIZE = 3;

const TABS = [
  { id: "durood", label: "Durood", icon: Heart },
  { id: "juz", label: "Qur'an Juz", icon: BookOpen },
];

const PERIODS = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
];

function readStoredName() {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeName(value) {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, value);
  } catch {
    // Storage may be unavailable in a private WebView; the entry still counts.
  }
}

/**
 * The open tab and the juz the visitor picked are mirrored into sessionStorage.
 * The widget can be re-created by a layout change elsewhere on the page, and a
 * plain useState would silently drop the visitor back on Durood halfway through
 * choosing juz. Session scope still gives a fresh visit the Durood default.
 */
function readStoredTab() {
  try {
    return sessionStorage.getItem(TAB_STORAGE_KEY) === "juz" ? "juz" : "durood";
  } catch {
    return "durood";
  }
}

function storeTab(value) {
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, value);
  } catch {
    // Non-critical: the tab simply falls back to Durood next time.
  }
}

function readStoredJuz(key) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(Number)
      .filter((number) => Number.isInteger(number) && JUZ_NUMBERS.includes(number));
  } catch {
    return [];
  }
}

function storeJuz(key, numbers) {
  try {
    sessionStorage.setItem(key, JSON.stringify(numbers));
  } catch {
    // Non-critical: the selection just does not survive the re-create.
  }
}

/** Dismissing the call-out lasts for the visit, not forever. */
function readStoredBannerDismissed() {
  try {
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function storeBannerDismissed() {
  try {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
  } catch {
    // Non-critical: the banner simply reappears next visit.
  }
}

/**
 * Which pop-up has already been offered in this visit. The stored value is the
 * aim it was offered for — the week's Friday for the weekly drive, or "1" for
 * the monthly one — rather than a plain flag. That way seeing the monthly
 * pop-up does not swallow the weekly one, and the weekly drive can be offered
 * again next Friday without the monthly pop-up returning with it.
 */
function readStoredPopupSeen() {
  try {
    return sessionStorage.getItem(POPUP_SEEN_KEY) || "";
  } catch {
    return "";
  }
}

function storePopupSeen(marker) {
  try {
    sessionStorage.setItem(POPUP_SEEN_KEY, String(marker || "1"));
  } catch {
    // Non-critical: the pop-up may simply show again next visit.
  }
}

/**
 * The Friday the visitor joined. Kept in localStorage so the "you're in" state
 * survives a reload, and compared against the live week start so a new week
 * silently puts the join button back without anything having to be cleared.
 */
function readStoredJoinedWeek() {
  try {
    return localStorage.getItem(WEEKLY_JOINED_KEY) || "";
  } catch {
    return "";
  }
}

function storeJoinedWeek(weekStart) {
  try {
    if (weekStart) localStorage.setItem(WEEKLY_JOINED_KEY, String(weekStart));
  } catch {
    // Non-critical: the button simply shows again next visit.
  }
}

/**
 * The record of what this device added. Each entry carries the idempotency key
 * it was written with, which is the only thing that can remove it again.
 * Anything older than a month is dropped on read so the list cannot grow stale.
 */
function readStoredMyEntries(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MY_ENTRY_MAX_AGE_MS;
    return parsed.filter(
      (entry) =>
        entry && typeof entry.key === "string" && entry.key && Number(entry.at) >= cutoff
    );
  } catch {
    return [];
  }
}

function storeMyEntries(storageKey, entries) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  } catch {
    // Non-critical: the entry simply cannot be undone from this device later.
  }
}

/**
 * The dua request form is the one place that asks for a whole sentence, so it
 * is the one place where losing a half-typed message really hurts. The widget
 * above it can be re-created by a layout change elsewhere on the page, and the
 * page itself can reload, so the open form, both fields and which field was
 * being typed in are mirrored into sessionStorage and put back on mount.
 */
const DUA_DRAFT_KEY = "worship_dua_draft";
const EMPTY_DUA_DRAFT = { open: false, subject: "", message: "", field: "subject" };

function readStoredDuaDraft() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(DUA_DRAFT_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_DUA_DRAFT };
    return {
      open: Boolean(parsed.open),
      subject: typeof parsed.subject === "string" ? parsed.subject : "",
      message: typeof parsed.message === "string" ? parsed.message : "",
      field: parsed.field === "message" ? "message" : "subject",
    };
  } catch {
    return { ...EMPTY_DUA_DRAFT };
  }
}

function storeDuaDraft(draft) {
  try {
    sessionStorage.setItem(DUA_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Non-critical: the draft simply does not survive a re-create.
  }
}

/** Only a real, finite number is ever displayed. Anything unknown is an em dash. */
function isRealNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * 'Juz 1, 2' for a short run of juz, and 'Juz 1, 2, 3 … +4' once the list stops
 * fitting on a phone. Returns null when there is nothing honest to show.
 */
function formatJuzList(numbers, max = 8) {
  if (!Array.isArray(numbers)) return null;
  const list = Array.from(new Set(numbers.map(Number)))
    .filter((number) => Number.isFinite(number))
    .sort((a, b) => a - b);
  if (list.length === 0) return null;
  if (list.length <= max) return `Juz ${list.join(", ")}`;
  return `Juz ${list.slice(0, max).join(", ")} +${list.length - max}`;
}

/** '1 Nov' for a dua request. Returns null when the date is not usable. */
function formatDuaDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(parsed);
}

/** Turns a raw PostgREST failure into something a visitor can act on. */
function friendlyError(err, fallback) {
  const message = String(err?.message || "");
  if (
    /could not find the function|schema cache|does not exist|structure of query does not match/i.test(
      message
    )
  ) {
    return "Community worship is not set up yet — the shared database still needs the worship migration applied.";
  }
  return message || fallback;
}

function Skeleton({ className }) {
  return <span className={`inline-block animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

Skeleton.propTypes = {
  className: PropTypes.string,
};

/**
 * Four of these sit side by side on a phone, so a big durood total has to step
 * down a size (and wrap as a last resort) instead of spilling out of the tile.
 */
function fitNumberClass(text) {
  if (!text) return "text-sm";
  if (text.length > 10) return "text-[10px]";
  if (text.length > 8) return "text-[11px]";
  if (text.length > 6) return "text-xs";
  return "text-sm";
}

function StatTile({ label, value, hint, loading }) {
  const text = isRealNumber(value) ? value.toLocaleString() : null;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1">
      <p className="text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-slate-500">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1 h-4 w-12" />
      ) : (
        <p
          title={text ?? undefined}
          className={`mt-0 break-all font-bold tabular-nums leading-4 text-[#1e3a8a] ${fitNumberClass(text)}`}
        >
          {text ?? (
            <span className="text-slate-300" aria-label="Not available">
              —
            </span>
          )}
        </p>
      )}
      {hint ? <p className="truncate text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

StatTile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  hint: PropTypes.string,
  loading: PropTypes.bool,
};

function BoardSkeleton() {
  return (
    <ul className="space-y-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((row) => (
        <li
          key={row}
          className="flex h-7 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2"
        >
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-2.5 flex-1" />
          <Skeleton className="h-2.5 w-10" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Fixed-height, internally scrollable board so the widget stays compact and
 * never shifts the page layout between loading, empty and loaded states.
 */
function BoardList({ rows, loading, unit, showJuz }) {
  const badgeTones = [
    "bg-amber-400 text-amber-950",
    "bg-slate-300 text-slate-800",
    "bg-[#e3d0a8] text-amber-950",
  ];
  const isEmpty = !loading && (!rows || rows.length === 0);

  return (
    <div className="h-24 overflow-y-auto pr-0.5">
      {loading ? (
        <BoardSkeleton />
      ) : isEmpty ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-3 text-center text-xs text-slate-500">
          No entries yet. Be the first.
        </div>
      ) : (
        <ol className="space-y-1">
          {rows.map((row, index) => {
            // Which juz this person recited, so "2 juz" never reads as juz two.
            const juzLabel = showJuz ? formatJuzList(row.juz_numbers) : null;
            return (
              <li
                key={`${row.user_id ?? row.display_name ?? "row"}-${index}`}
                className="flex min-h-7 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-0.5"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    badgeTones[index] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {row.rank ?? index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-800">
                    {row.display_name || "Anonymous"}
                  </span>
                  {juzLabel ? (
                    <span
                      title={juzLabel}
                      className="block truncate text-[10px] leading-tight text-slate-500"
                    >
                      {juzLabel}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-[#1e3a8a]">
                  {isRealNumber(row.total) ? Number(row.total).toLocaleString() : "—"}
                  <span className="ml-1 text-[10px] font-medium text-slate-500">{unit}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

BoardList.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  unit: PropTypes.string,
  showJuz: PropTypes.bool,
};

function PeriodToggle({ period, onChange }) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
      {PERIODS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={period === id}
          onClick={() => onChange(id)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100 ${
            period === id ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

PeriodToggle.propTypes = {
  period: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Short call-out above the tabs. The community aim is one whole Qur'an each
 * month, so it leads with how many juz are covered and offers a one-tap jump
 * into either tab rather than sending people hunting for the buttons.
 */
function MonthlyQuranCallout({ covered, total, loading, onAddDurood, onAddJuz, onDismiss }) {
  const known = isRealNumber(covered) && isRealNumber(total) && total > 0;

  return (
    <div className="mb-2 animate-in fade-in slide-in-from-top-1 rounded-xl border border-[#1e3a8a]/20 bg-gradient-to-r from-[#EFF6FF] to-white p-2 duration-300">
      <div className="flex items-start gap-1.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1e3a8a]" />
        <p className="min-w-0 flex-1 text-[11px] font-semibold leading-tight text-[#1e3a8a]">
          Let&apos;s finish one Qur&apos;an this month —{" "}
          <span className="tabular-nums">
            {loading ? "…" : known ? `${covered} / ${total} juz` : "—"}
          </span>{" "}
          done. Add your durood or the juz you recited.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this reminder"
          className="-mr-0.5 -mt-0.5 shrink-0 rounded-md p-1 text-[#1e3a8a]/60 transition hover:bg-white hover:text-[#1e3a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={onAddJuz}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#1e3a8a] px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-[#172554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
        >
          <BookOpen className="h-3.5 w-3.5" /> Add juz
        </button>
        <button
          type="button"
          onClick={onAddDurood}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#1e3a8a]/25 bg-white px-2 py-1 text-[11px] font-semibold text-[#1e3a8a] transition hover:border-[#1e3a8a]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
        >
          <Heart className="h-3.5 w-3.5" /> Add durood
        </button>
      </div>
    </div>
  );
}

MonthlyQuranCallout.propTypes = {
  covered: PropTypes.number,
  total: PropTypes.number,
  loading: PropTypes.bool,
  onAddDurood: PropTypes.func.isRequired,
  onAddJuz: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/**
 * Bottom-anchored pop-up carrying the same monthly Qur'an aim as the call-out,
 * for visitors who scroll straight past the widget. Both buttons dismiss it and
 * drop the visitor on the right tab, so the prompt is one tap from an entry.
 */
function MonthlyQuranPopup({ covered, total, loading, onAddDurood, onAddJuz, onDismiss }) {
  const known = isRealNumber(covered) && isRealNumber(total) && total > 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Add durood or Qur'an juz"
        className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-[#1e3a8a]/15 bg-white p-3 shadow-xl duration-300"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1e3a8a]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-[#1e3a8a]">
              Help finish one Qur&apos;an this month
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-600">
              <span className="font-bold tabular-nums text-[#1e3a8a]">
                {loading ? "…" : known ? `${covered} / ${total} juz` : "—"}
              </span>{" "}
              covered so far. Add your durood, or the juz you recited today.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this reminder"
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onAddDurood}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1e3a8a] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#172554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
          >
            <Heart className="h-4 w-4" /> Add durood
          </button>
          <button
            type="button"
            onClick={onAddJuz}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1e3a8a]/25 bg-white px-3 py-2 text-[12px] font-semibold text-[#1e3a8a] transition hover:border-[#1e3a8a]/50 hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
          >
            <BookOpen className="h-4 w-4" /> Add juz
          </button>
        </div>
      </div>
    </div>
  );
}

MonthlyQuranPopup.propTypes = {
  covered: PropTypes.number,
  total: PropTypes.number,
  loading: PropTypes.bool,
  onAddDurood: PropTypes.func.isRequired,
  onAddJuz: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/**
 * Bottom-anchored pop-up for the current Friday-to-Thursday Qur'an drive. The
 * deadline it quotes is read back from the live week window rather than typed
 * in, so the pop-up can never promise the wrong Thursday, and the aim is stated
 * in full: thirty juz covered by then is one khatam.
 *
 * Two ways on from here, because the drive and the dua board are both one tap
 * from the top of the tracker: pick the juz to recite, or ask for a dua.
 */
function WeeklyQuranPopup({
  covered,
  total,
  participants,
  deadline,
  joined,
  loading,
  onPickJuz,
  onAskDua,
  onDismiss,
}) {
  const known = isRealNumber(covered) && isRealNumber(total) && total > 0;
  const percent = known ? Math.min(100, Math.round((covered / total) * 100)) : 0;
  const joinedCount = isRealNumber(participants) ? participants : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Join this week's Qur'an completion"
        className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-[#1e3a8a]/15 bg-white p-3 shadow-xl duration-300"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1e3a8a]">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-[#1e3a8a]">
              Join this week&apos;s Qur&apos;an completion
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-600">
              Complete one khatam by{" "}
              <span className="font-bold text-[#1e3a8a]">{deadline || "Friday"}</span>. Pick the
              juz you will recite this week.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this reminder"
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Juz covered this week"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-[#1e3a8a] transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-[#1e3a8a]">
            {loading ? "…" : known ? `${covered} / ${total} juz` : "—"}
          </span>
        </div>

        <p className="mt-1 text-[10px] leading-tight text-slate-500">
          {joinedCount && joinedCount > 0
            ? `${joinedCount.toLocaleString()} joined this week`
            : "Be the first to join this week"}
          {joined ? " · you're in" : ""}
        </p>

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onPickJuz}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1e3a8a] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#172554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
          >
            <BookOpen className="h-4 w-4" /> Pick your juz
          </button>
          <button
            type="button"
            onClick={onAskDua}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1e3a8a]/25 bg-white px-3 py-2 text-[12px] font-semibold text-[#1e3a8a] transition hover:border-[#1e3a8a]/50 hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
          >
            <HandHeart className="h-4 w-4" /> Ask for dua
          </button>
        </div>

        <p className="mt-1.5 text-[10px] leading-tight text-slate-500">
          You can also request a dua for someone — it is shown publicly on the timeline.
        </p>
      </div>
    </div>
  );
}

WeeklyQuranPopup.propTypes = {
  covered: PropTypes.number,
  total: PropTypes.number,
  participants: PropTypes.number,
  deadline: PropTypes.string,
  joined: PropTypes.bool,
  loading: PropTypes.bool,
  onPickJuz: PropTypes.func.isRequired,
  onAskDua: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/**
 * Public dua requests at the very top of the tracker. Anyone can ask the
 * community to make dua for someone by name and it is shown to everyone as
 * "Dua request for <name>". No sign-in is involved, so the form is collapsed
 * until it is wanted and the newest requests are the ones on show.
 */
function DuaRequestBoard({ requests, loading, busy, openSignal, onSubmit }) {
  const [draft, setDraft] = useState(readStoredDuaDraft);
  const { open, subject, message } = draft;

  // Written on every keystroke, so a re-create mid-sentence cannot lose it.
  useEffect(() => {
    storeDuaDraft(draft);
  }, [draft]);

  /**
   * The pop-up's "Ask for dua" needs to open this form. The draft lives here so
   * it survives a re-create, so the signal is a counter the parent increments
   * rather than the parent owning a second copy of the open flag.
   */
  useEffect(() => {
    if (!openSignal) return;
    setDraft((previous) => (previous.open ? previous : { ...previous, open: true }));
  }, [openSignal]);

  const ready = subject.trim() !== "" && message.trim() !== "" && !busy;

  function updateField(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value, field }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!ready) return;

    const sent = await onSubmit(subject.trim(), message.trim());
    // Only clear the form once it is genuinely posted, so nothing is retyped.
    if (sent) {
      setDraft({ ...EMPTY_DUA_DRAFT });
    }
  }

  return (
    <div className="border-b border-[#1e3a8a]/10 bg-gradient-to-r from-[#FFFBF3] to-white px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-bold leading-tight text-[#1e3a8a]">
          <HandHeart className="h-3.5 w-3.5" /> Dua requests
        </p>
        <button
          type="button"
          onClick={() => setDraft((previous) => ({ ...previous, open: !previous.open }))}
          aria-expanded={open}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1e3a8a] transition hover:border-[#1e3a8a]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
        >
          {open ? "Cancel" : "Ask for dua"}
        </button>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-1.5 space-y-1.5">
          <Input
            value={subject}
            onChange={(event) => updateField("subject", event.target.value)}
            placeholder="For whom? e.g. Ahmed"
            aria-label="Who the dua is for"
            maxLength={40}
            // Both fields carry autoFocus, so a re-create mid-sentence puts the
            // cursor back in the field that was being typed in.
            autoFocus={draft.field !== "message"}
            className="h-8 text-xs"
          />
          <Textarea
            value={message}
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="Your dua request, e.g. please make dua for my mother's health."
            aria-label="Your dua request"
            maxLength={240}
            rows={2}
            autoFocus={draft.field === "message"}
            className="min-h-[46px] text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] leading-tight text-slate-500">
              Shown publicly with your request.
            </span>
            <Button
              type="submit"
              disabled={!ready}
              className="h-7 shrink-0 bg-[#1e3a8a] px-3 text-[11px] hover:bg-[#172554] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send request"}
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="mt-1.5 space-y-1">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-2.5 w-48" />
        </div>
      ) : requests.length === 0 ? (
        <p className="mt-1 text-[11px] leading-tight text-slate-500">
          No dua requests yet — be the first to ask the community to make dua.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {requests.map((request) => {
            const posted = formatDuaDate(request.created_at);
            return (
              <li
                key={request.id}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1"
              >
                <p className="truncate text-[11px] font-semibold text-[#1e3a8a]">
                  Dua request for {request.subject_name}
                  {posted ? <span className="font-normal text-slate-400"> · {posted}</span> : null}
                </p>
                <p
                  title={request.message}
                  className="line-clamp-2 text-[11px] leading-tight text-slate-700"
                >
                  {request.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

DuaRequestBoard.propTypes = {
  requests: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      subject_name: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      created_at: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  busy: PropTypes.bool,
  openSignal: PropTypes.number,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * Join row that sits above the tabs. The community aim is one whole Qur'an
 * every week (Friday to Thursday), so this states the aim, shows how the week
 * is going and — once someone has joined — hands them straight to the juz
 * picker instead of leaving them to find it.
 */
function WeeklyQuranJoinRow({
  weekLabel,
  covered,
  total,
  participants,
  loading,
  joined,
  busy,
  name,
  onNameChange,
  onJoin,
  onGoToJuz,
}) {
  const knownCovered = isRealNumber(covered);
  const goal = isRealNumber(total) && total > 0 ? total : 30;
  const percent = knownCovered ? Math.min(100, Math.round((covered / goal) * 100)) : 0;
  const complete = knownCovered && covered >= goal;

  return (
    <div className="border-b border-[#1e3a8a]/10 bg-gradient-to-r from-[#F8FAFF] to-white px-2.5 py-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1e3a8a]">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[12px] font-bold leading-tight text-[#1e3a8a]">
              Weekly Qur&apos;an completion
            </p>
            {weekLabel ? (
              <span className="shrink-0 text-[10px] font-medium text-slate-500">{weekLabel}</span>
            ) : null}
          </div>

          <p className="mt-0.5 text-[10px] leading-tight text-slate-600">
            {complete
              ? "This week's Qur'an is complete — Alhamdulillah. "
              : "Join the week, then tap the juz you recite. "}
            <span className="font-bold tabular-nums text-[#1e3a8a]">
              {loading ? "…" : knownCovered ? `${covered} / ${goal} juz` : "—"}
            </span>
            {" · "}
            <span className="font-semibold tabular-nums text-slate-600">
              {loading ? "…" : isRealNumber(participants) ? `${participants} joined` : "—"}
            </span>
          </p>

          <div
            className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-inset ring-slate-200"
            role="progressbar"
            aria-label="Juz covered this week"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={
              loading
                ? "Loading"
                : knownCovered
                  ? `${covered} of ${goal} juz this week`
                  : "Unavailable"
            }
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#214f8d] to-[#48a4d8] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          {joined ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex flex-1 items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <Check className="h-3 w-3 shrink-0" /> You&apos;re in this week.
              </span>
              <button
                type="button"
                onClick={onGoToJuz}
                className="shrink-0 rounded-lg bg-[#1e3a8a] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#172554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
              >
                Pick juz
              </button>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Input
                value={name}
                onChange={onNameChange}
                placeholder="Your name"
                aria-label="Your name for the weekly completion"
                maxLength={60}
                autoComplete="name"
                className="h-7 flex-1 text-xs"
              />
              <Button
                type="button"
                onClick={onJoin}
                disabled={busy}
                className="h-7 shrink-0 bg-[#1e3a8a] px-2.5 text-[11px] hover:bg-[#172554] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Join this week"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

WeeklyQuranJoinRow.propTypes = {
  weekLabel: PropTypes.string,
  covered: PropTypes.number,
  total: PropTypes.number,
  participants: PropTypes.number,
  loading: PropTypes.bool,
  joined: PropTypes.bool,
  busy: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onJoin: PropTypes.func.isRequired,
  onGoToJuz: PropTypes.func.isRequired,
};

/**
 * Undo strip for the entries this device added. Only rows whose key the device
 * still holds are listed, which is why it can never offer someone else's entry.
 */
function MyEntriesStrip({ label, entries, busy, onRemove }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            disabled={busy}
            onClick={() => onRemove(entry.key)}
            title={`Remove ${entry.label}`}
            aria-label={`Remove ${entry.label}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1 disabled:opacity-50"
          >
            {entry.label}
            <X className="h-3 w-3 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

MyEntriesStrip.propTypes = {
  label: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ),
  busy: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
};

/** Shared by both tabs: typed freely, no sign-in, remembered on this device. */
function NameField({ id, value, onChange }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold text-[#1e3a8a]">
        Your name
      </Label>
      <Input
        id={id}
        value={value}
        onChange={onChange}
        placeholder="e.g. Ahmed"
        maxLength={60}
        autoComplete="name"
        className="mt-0.5 h-8"
      />
      <p className="mt-0.5 text-[10px] text-slate-500">
        Shown on the public leaderboard with your entry.
      </p>
    </div>
  );
}

NameField.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function CommunityWorshipTabs() {
  const [tab, setTab] = useState(readStoredTab);
  const [name, setName] = useState(readStoredName);
  const [period, setPeriod] = useState("week");

  const [duroodCount, setDuroodCount] = useState(100);
  const [customDurood, setCustomDurood] = useState("");
  const [selectedJuz, setSelectedJuz] = useState(() => readStoredJuz(SELECTED_JUZ_STORAGE_KEY));
  // Juz this person has successfully recorded here — these show a green tick.
  // Chosen-but-unrecorded juz show red, so the two steps read differently.
  const [completedJuz, setCompletedJuz] = useState(() => readStoredJuz(COMPLETED_JUZ_STORAGE_KEY));
  const [calloutDismissed, setCalloutDismissed] = useState(readStoredBannerDismissed);
  const [popupOpen, setPopupOpen] = useState(false);
  // Incremented when the pop-up asks for the dua form; the board opens on change.
  const [duaOpenSignal, setDuaOpenSignal] = useState(0);
  const [joinedWeek, setJoinedWeek] = useState(readStoredJoinedWeek);
  // What this device added, so a mistake can be undone later in the visit or
  // after a reload. Each item keeps the key its row was written with.
  const [myJuz, setMyJuz] = useState(() => readStoredMyEntries(MY_JUZ_KEY));
  const [myDurood, setMyDurood] = useState(() => readStoredMyEntries(MY_DUROOD_KEY));
  const [myDua, setMyDua] = useState(() => readStoredMyEntries(MY_DUA_KEY));

  const [duroodStats, setDuroodStats] = useState(null);
  const [juzStats, setJuzStats] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [duaRequests, setDuaRequests] = useState([]);
  const [duroodBoard, setDuroodBoard] = useState([]);
  const [juzBoard, setJuzBoard] = useState([]);

  const [loading, setLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [joiningWeekly, setJoiningWeekly] = useState(false);
  const [sendingDua, setSendingDua] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const configured = isWorshipConfigured();
  const debounceRef = useRef(null);
  const periodRef = useRef(period);
  const rootRef = useRef(null);
  const popupSeenRef = useRef(readStoredPopupSeen());

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  // Mirror the in-progress input so it is not lost if the widget is re-created.
  useEffect(() => {
    storeTab(tab);
  }, [tab]);

  useEffect(() => {
    storeJuz(SELECTED_JUZ_STORAGE_KEY, selectedJuz);
  }, [selectedJuz]);

  useEffect(() => {
    storeJuz(COMPLETED_JUZ_STORAGE_KEY, completedJuz);
  }, [completedJuz]);

  useEffect(() => {
    storeMyEntries(MY_JUZ_KEY, myJuz);
  }, [myJuz]);

  useEffect(() => {
    storeMyEntries(MY_DUROOD_KEY, myDurood);
  }, [myDurood]);

  useEffect(() => {
    storeMyEntries(MY_DUA_KEY, myDua);
  }, [myDua]);

  // Ticks the "time left this week" label without re-rendering every second.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  /**
   * allSettled rather than all: one RPC that is missing or broken must not
   * blank out every other figure. Each call reports its own outcome and the
   * caller raises the first real failure.
   */
  const loadStats = useCallback(async () => {
    const results = await Promise.allSettled([
      fetchCommunityDuroodStats(),
      fetchCommunityJuzStats(),
    ]);
    if (results[0].status === "fulfilled") setDuroodStats(results[0].value || null);
    if (results[1].status === "fulfilled") setJuzStats(results[1].value || null);
    return results;
  }, []);

  /**
   * The weekly drive shares the page with the durood and juz figures, so its
   * own table may not be installed yet. It therefore never reports a failure —
   * a missing function just leaves the row showing an em dash instead of
   * blanking out the rest of the tracker.
   */
  const loadWeeklyStats = useCallback(async () => {
    try {
      const data = await fetchWeeklyQuranCompletionStats();
      setWeeklyStats(data || null);
    } catch {
      setWeeklyStats(null);
    }
  }, []);

  /**
   * Same reasoning as the weekly row: the dua board shares this widget, so if
   * its table is not installed yet it stays empty rather than blanking out the
   * durood and juz figures around it.
   */
  const loadDuaRequests = useCallback(async () => {
    try {
      const data = await fetchDuaRequests(DUA_BOARD_SIZE);
      setDuaRequests(Array.isArray(data) ? data : []);
    } catch {
      setDuaRequests([]);
    }
  }, []);

  const loadBoards = useCallback(async (nextPeriod) => {
    const results = await Promise.allSettled([
      fetchDuroodLeaderboard(nextPeriod, BOARD_SIZE),
      fetchJuzLeaderboard(nextPeriod, BOARD_SIZE),
    ]);
    if (results[0].status === "fulfilled") {
      setDuroodBoard(Array.isArray(results[0].value) ? results[0].value : []);
    }
    if (results[1].status === "fulfilled") {
      setJuzBoard(Array.isArray(results[1].value) ? results[1].value : []);
    }
    return results;
  }, []);

  /** silent = keep whatever is on screen while refreshing in the background. */
  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!configured) {
        setLoading(false);
        setBoardsLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const [stats, boards] = await Promise.all([
          loadStats(),
          loadBoards(periodRef.current),
          loadWeeklyStats(),
          loadDuaRequests(),
        ]);
        if (!silent) {
          const failure = [...stats, ...boards].find((result) => result.status === "rejected");
          setError(
            failure ? friendlyError(failure.reason, "Could not load the community totals.") : ""
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setBoardsLoading(false);
        }
      }
    },
    [configured, loadStats, loadBoards, loadWeeklyStats, loadDuaRequests]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates: someone, somewhere adds an entry and we refresh.
  useEffect(() => {
    if (!configured) return undefined;

    const unsubscribe = subscribeWorshipChanges(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => refresh({ silent: true }), 400);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
  }, [configured, refresh]);

  // Safety net in case the socket never connected.
  useEffect(() => {
    if (!configured) return undefined;
    const handleFocus = () => refresh({ silent: true });
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [configured, refresh]);

  useEffect(() => {
    if (!configured) return;
    setBoardsLoading(true);
    loadBoards(period)
      .then((results) => {
        const failure = results.find((result) => result.status === "rejected");
        if (failure) {
          setError(friendlyError(failure.reason, "Could not load the leaderboard."));
        }
      })
      .finally(() => setBoardsLoading(false));
  }, [configured, period, loadBoards]);

  const duroodAmount = useMemo(() => {
    const custom = Number(customDurood);
    if (customDurood.trim() !== "" && Number.isFinite(custom) && custom > 0) {
      return Math.floor(custom);
    }
    return duroodCount;
  }, [customDurood, duroodCount]);

  const juzCoveredPercent = useMemo(() => {
    const covered = juzStats?.juz_covered;
    const total = juzStats?.juz_total;
    if (!isRealNumber(covered) || !isRealNumber(total) || !total) return null;
    return Math.min(100, Math.round((covered / total) * 100));
  }, [juzStats]);

  /** The juz numbers actually logged this month, straight from the database. */
  const juzTakenThisMonth = useMemo(() => {
    const value = juzStats?.juz_numbers;
    if (!Array.isArray(value)) return null;
    return value.map(Number).filter((number) => Number.isFinite(number));
  }, [juzStats]);

  /** null means "we do not know", which renders as an em dash — never a guess. */
  const juzLeftThisMonth = useMemo(() => {
    if (!juzTakenThisMonth) return null;
    const taken = new Set(juzTakenThisMonth);
    return JUZ_NUMBERS.filter((number) => !taken.has(number));
  }, [juzTakenThisMonth]);

  const monthComplete = juzLeftThisMonth?.length === 0;

  /**
   * Juz already recited by the community this month. They are shown — so nobody
   * repeats the same juz — but they cannot be picked, which spreads the 30 juz
   * across the month instead of having everyone log juz 30.
   */
  const takenThisMonth = useMemo(() => {
    if (!juzTakenThisMonth) return null;
    return new Set(juzTakenThisMonth);
  }, [juzTakenThisMonth]);

  /** Every juz is spoken for, so the grid is fully locked until the month rolls. */
  const allJuzTaken = takenThisMonth?.size === JUZ_NUMBERS.length;

  /**
   * The juz this visitor has chosen and can still record. Anything taken this
   * month, or recorded here a moment ago, drops out — so the count, the button
   * label and the submit all work from exactly the same list and a full Qur'an
   * can never be recorded by accident.
   */
  const activeJuz = useMemo(() => {
    const done = new Set(completedJuz);
    return selectedJuz.filter(
      (number) => !done.has(number) && !(takenThisMonth?.has(number) ?? false)
    );
  }, [selectedJuz, completedJuz, takenThisMonth]);

  /** The week's drive is still open while fewer than thirty juz are covered. */
  const weeklyStillOpen = Boolean(weeklyStats?.week_start) && !weeklyStats?.complete;

  /**
   * What the pop-up would be offering right now. Held as a string so it can be
   * compared with what has already been offered this visit and written back
   * when the pop-up is closed.
   */
  const popupMarker = weeklyStillOpen ? String(weeklyStats.week_start) : "1";

  /**
   * 'Thu 5 Nov' — the last day of the live week. It comes from the week window
   * the database returns rather than being written into the copy, so the
   * deadline quoted is always the coming Thursday.
   * formatCampaignWeek produces 'Fri 30 Oct – Thu 5 Nov', so the second half is
   * the last day of the week.
   */
  const weekDeadline = useMemo(() => {
    const label = formatCampaignWeek(weeklyStats?.week_start, weeklyStats?.week_end);
    if (!label) return null;
    return label.split("–")[1]?.trim() || null;
  }, [weeklyStats]);

  /**
   * Offer the pop-up once per visit, a beat after the page settles. It waits for
   * the first load so it cannot appear before the figures are known, and the
   * "seen" flag is captured on the ref so a background refresh never brings it
   * back after the visitor has closed it.
   *
   * The weekly drive is a separate aim from the monthly khatam, so the pop-up
   * stays away only when neither is still open. The weekly flag is a plain
   * boolean rather than the stats object, so a background refresh which hands
   * back a new object cannot keep resetting the delay.
   */
  useEffect(() => {
    if (!configured || popupSeenRef.current === popupMarker) return undefined;
    if (loading) return undefined;
    if (monthComplete && !weeklyStillOpen) return undefined;
    const timer = window.setTimeout(() => setPopupOpen(true), 2500);
    return () => window.clearTimeout(timer);
  }, [configured, loading, monthComplete, weeklyStillOpen, popupMarker]);

  /**
   * Days/hours left in the durood week. The week runs Friday 00:00 -> Thursday
   * 23:59 London and a fresh week opens every Friday, so the label says so
   * explicitly rather than leaving the reset day implicit.
   */
  const countdown = useMemo(() => {
    const end = duroodStats?.week_end ? new Date(duroodStats.week_end).getTime() : null;
    if (!end || Number.isNaN(end)) return null;
    const remaining = end - now;
    if (remaining <= 0) return "New week starts Friday";
    const totalMinutes = Math.floor(remaining / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    return `${days}d ${hours}h left · resets Friday`;
  }, [duroodStats, now]);

  const weekLabel = formatCampaignWeek(duroodStats?.week_start, duroodStats?.week_end);

  /** Joined is per week: the stored Friday has to match the live week start. */
  const weeklyJoined = Boolean(
    joinedWeek && weeklyStats?.week_start && joinedWeek === weeklyStats.week_start
  );

  /**
   * One chip per juz, carrying every key held for it so removing a chip clears
   * the juz completely even if it was recorded more than once.
   */
  const juzChipEntries = useMemo(() => {
    const byJuz = new Map();
    myJuz.forEach((entry) => {
      const juzNumber = Number(entry.juz);
      if (!JUZ_NUMBERS.includes(juzNumber)) return;
      if (!byJuz.has(juzNumber)) byJuz.set(juzNumber, []);
      byJuz.get(juzNumber).push(entry.key);
    });
    return Array.from(byJuz.entries())
      .sort(([a], [b]) => a - b)
      .map(([juzNumber, keys]) => ({ key: String(juzNumber), label: `Juz ${juzNumber}`, keys }));
  }, [myJuz]);

  const duroodChipEntries = useMemo(
    () =>
      myDurood.map((entry) => {
        const count = Number(entry.count);
        return {
          key: entry.key,
          label: isRealNumber(count) && count > 0 ? `${count.toLocaleString()} durood` : "Durood",
          keys: [entry.key],
        };
      }),
    [myDurood]
  );

  /** Requests this device posted, so one sent by mistake can be taken down. */
  const duaChipEntries = useMemo(
    () =>
      myDua.map((entry) => ({
        key: entry.key,
        label: entry.subject ? `Dua for ${entry.subject}` : "Dua request",
        keys: [entry.key],
      })),
    [myDua]
  );

  /** Switching tabs clears the previous tab's feedback. */
  function selectTab(nextTab) {
    setTab(nextTab);
    setNotice("");
    setError("");
  }

  function dismissCallout() {
    setCalloutDismissed(true);
    storeBannerDismissed();
  }

  /** Closing the pop-up — by the cross or by using it — ends it for the visit. */
  function dismissPopup() {
    popupSeenRef.current = popupMarker;
    storePopupSeen(popupMarker);
    setPopupOpen(false);
  }

  /** One tap from the pop-up lands on the right tab, in view and ready to type. */
  function handlePopupJump(nextTab) {
    dismissPopup();
    selectTab(nextTab);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** From the pop-up straight into the dua form, scrolled into view. */
  function handleAskDuaFromPopup() {
    dismissPopup();
    setDuaOpenSignal((previous) => previous + 1);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Hands the visitor to the juz picker, scrolled into view. */
  function handleGoToJuz() {
    selectTab("juz");
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * Join this week's drive, then drop the visitor straight on the juz picker so
   * joining and recording are one continuous step. The RPC is idempotent, so
   * tapping twice is harmless.
   */
  async function handleWeeklyJoin() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name so you can join the weekly completion.");
      return;
    }

    setJoiningWeekly(true);
    setError("");
    setNotice("");

    try {
      const result = await joinQuranWeeklyCompletion({
        displayName: trimmedName,
        idempotencyKey: newIdempotencyKey("weekly"),
      });
      storeName(trimmedName);
      storeJoinedWeek(result?.week_start || weeklyStats?.week_start || null);
      setJoinedWeek(String(result?.week_start || weeklyStats?.week_start || ""));
      // selectTab clears the feedback bars, so it runs before the notice is set.
      selectTab("juz");
      setNotice(`You're in for this week, ${trimmedName}. Tap the juz you recite below.`);
      await loadWeeklyStats();
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(
        friendlyError(err, "Could not join the weekly completion. Please try again.")
      );
    } finally {
      setJoiningWeekly(false);
    }
  }

  /** Saved as they type, so a re-create never wipes a half-entered name. */
  function handleNameChange(event) {
    const value = event.target.value;
    setName(value);
    storeName(value);
  }

  /**
   * Post a public dua request. Returns true only once it is genuinely saved, so
   * the form keeps what was typed instead of clearing on a failed send.
   */
  async function handleDuaSubmit(subject, message) {
    setSendingDua(true);
    setError("");
    setNotice("");

    const idempotencyKey = newIdempotencyKey("dua");

    try {
      await addDuaRequest({ subjectName: subject, message, idempotencyKey });
      setMyDua((previous) =>
        [{ key: idempotencyKey, subject, at: Date.now() }, ...previous].slice(0, 10)
      );
      setNotice(`Dua request for ${subject} is showing publicly. JazakAllah khair.`);
      await loadDuaRequests();
      return true;
    } catch (err) {
      setError(friendlyError(err, "Could not send your dua request. Please try again."));
      return false;
    } finally {
      setSendingDua(false);
    }
  }

  /** Take down a dua request this device posted. */
  async function handleRemoveDua(idempotencyKey) {
    const entry = myDua.find((item) => item.key === idempotencyKey);
    if (!entry) return;

    setSendingDua(true);
    setError("");
    setNotice("");

    try {
      await removeDuaRequests([idempotencyKey]);
      setMyDua((previous) => previous.filter((item) => item.key !== idempotencyKey));
      setNotice(
        entry.subject
          ? `Removed the dua request for ${entry.subject}.`
          : "Removed your dua request."
      );
      await loadDuaRequests();
    } catch (err) {
      setError(friendlyError(err, "Could not remove that dua request. Please try again."));
    } finally {
      setSendingDua(false);
    }
  }

  /**
   * Tapping toggles one juz on or off. Nothing is cleared in between, so several
   * juz (say 1 and 2) can be picked in one go and recorded together.
   */
  function toggleJuz(juzNumber) {
    setSelectedJuz((previous) =>
      previous.includes(juzNumber)
        ? previous.filter((value) => value !== juzNumber)
        : [...previous, juzNumber]
    );
  }

  function clearJuzSelection() {
    setSelectedJuz([]);
  }

  async function handleDuroodSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter your name so your durood can be counted.");
      return;
    }
    if (!Number.isFinite(duroodAmount) || duroodAmount <= 0) {
      setError("Enter how many durood you recited.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    // Kept so the row can be removed again should it be a mistake.
    const idempotencyKey = newIdempotencyKey("durood");
    const recordedAmount = duroodAmount;

    try {
      await recordDuroodCompletion({
        count: recordedAmount,
        displayName: trimmedName,
        idempotencyKey,
      });
      setMyDurood((previous) =>
        [{ key: idempotencyKey, count: recordedAmount, at: Date.now() }, ...previous].slice(0, 10)
      );
      storeName(trimmedName);
      setCustomDurood("");
      setNotice(
        `Recorded ${recordedAmount.toLocaleString()} durood for ${trimmedName}. JazakAllah khair!`
      );
      await refresh({ silent: true });
    } catch (err) {
      setError(err?.message || "Could not record your durood. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Undo one durood entry this device added. */
  async function handleRemoveDurood(idempotencyKey) {
    const entry = myDurood.find((item) => item.key === idempotencyKey);
    if (!entry) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await removeDuroodEntries([idempotencyKey]);
      setMyDurood((previous) => previous.filter((item) => item.key !== idempotencyKey));
      setNotice(
        `Removed ${Number(entry.count).toLocaleString()} durood from the record. JazakAllah khair.`
      );
      await refresh({ silent: true });
    } catch (err) {
      setError(friendlyError(err, "Could not remove that durood entry. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  /** Undo a juz this device added — it also frees the juz up again. */
  async function handleRemoveJuz(juzNumberValue) {
    const juzNumber = Number(juzNumberValue);
    const keys = myJuz
      .filter((entry) => Number(entry.juz) === juzNumber)
      .map((entry) => entry.key);
    if (keys.length === 0) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await removeQuranJuzEntries(keys);
      setMyJuz((previous) => previous.filter((entry) => Number(entry.juz) !== juzNumber));
      setCompletedJuz((previous) => previous.filter((number) => number !== juzNumber));
      setSelectedJuz((previous) => previous.filter((number) => number !== juzNumber));
      setNotice(`Removed juz ${juzNumber}. It is free to be recited again.`);
      await refresh({ silent: true });
    } catch (err) {
      setError(friendlyError(err, "Could not remove that juz. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleJuzSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter your name so your juz can be counted.");
      return;
    }
    if (activeJuz.length === 0) {
      setError("Choose at least one juz you recited.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    // Exactly the juz picked here — never the rest of the Qur'an.
    const ordered = [...activeJuz].sort((a, b) => a - b);
    const failed = [];
    const savedNumbers = [];
    // The keys each of those rows was written with, so it can be undone.
    const savedEntries = [];

    for (const juzNumber of ordered) {
      const idempotencyKey = newIdempotencyKey(`juz-${juzNumber}`);
      try {
        await recordQuranJuz({
          juzNumber,
          displayName: trimmedName,
          idempotencyKey,
        });
        savedNumbers.push(juzNumber);
        savedEntries.push({ juz: juzNumber, key: idempotencyKey, at: Date.now() });
      } catch {
        failed.push(juzNumber);
      }
    }

    // Anything that saved is now done: it flips to a green tick.
    setCompletedJuz((previous) => {
      const merged = new Set(previous);
      savedNumbers.forEach((juzNumber) => merged.add(juzNumber));
      return Array.from(merged).sort((a, b) => a - b);
    });

    if (savedEntries.length > 0) {
      setMyJuz((previous) => [...savedEntries, ...previous].slice(0, 40));
    }

    const saved = savedNumbers.length;

    storeName(trimmedName);
    setBusy(false);
    await refresh({ silent: true });

    if (failed.length === 0) {
      setSelectedJuz([]);
      setNotice(
        `Recorded ${saved === 1 ? `juz ${savedNumbers[0]}` : `juz ${savedNumbers.join(", ")}`} for ${trimmedName}. JazakAllah khair!`
      );
    } else {
      setSelectedJuz(failed);
      setError(
        `${saved} of ${ordered.length} juz were saved. Juz ${failed.join(", ")} did not go through — please try again.`
      );
    }
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Community worship is unavailable right now — the Supabase connection is not configured.
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <p className="border-b border-[#1e3a8a]/10 bg-[#EFF6FF] px-3 py-1.5 text-center text-[11px] font-semibold text-[#1e3a8a]">
        Let&apos;s send durood and recite Qur&apos;an together
      </p>

      {/* Dua requests sit at the very top, so a public request is the first thing seen. */}
      <DuaRequestBoard
        requests={duaRequests}
        loading={loading}
        busy={sendingDua}
        openSignal={duaOpenSignal}
        onSubmit={handleDuaSubmit}
      />

      {duaChipEntries.length > 0 ? (
        <div className="border-b border-[#1e3a8a]/10 bg-white px-2.5 py-1.5">
          <MyEntriesStrip
            label="Sent a dua request by mistake? Remove it"
            entries={duaChipEntries}
            busy={sendingDua}
            onRemove={handleRemoveDua}
          />
        </div>
      ) : null}

      {/* Join the week's Qur'an drive, above the tabs so it is the first thing seen. */}
      <WeeklyQuranJoinRow
        weekLabel={weekLabel}
        covered={weeklyStats?.juz_covered}
        total={weeklyStats?.juz_total}
        participants={weeklyStats?.participants}
        loading={loading}
        joined={weeklyJoined}
        busy={joiningWeekly}
        name={name}
        onNameChange={handleNameChange}
        onJoin={handleWeeklyJoin}
        onGoToJuz={handleGoToJuz}
      />

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Community worship"
        className="flex gap-1 border-b border-slate-200 bg-slate-50 p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1 ${
                active
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-[#1e3a8a]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="p-2 sm:p-2.5">
        {/* While the pop-up is up it says the same thing, so only one shows at a time. */}
        {calloutDismissed || popupOpen || juzLeftThisMonth?.length === 0 ? null : (
          <MonthlyQuranCallout
            covered={juzStats?.juz_covered}
            total={juzStats?.juz_total}
            loading={loading}
            onAddDurood={() => selectTab("durood")}
            onAddJuz={() => selectTab("juz")}
            onDismiss={dismissCallout}
          />
        )}

        {error ? (
          <div
            role="alert"
            className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}

        {tab === "durood" ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#1e3a8a]" />
                {countdown ? (
                  <span className="font-semibold tabular-nums">{countdown}</span>
                ) : loading ? (
                  <Skeleton className="h-3 w-24" />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </span>
              {weekLabel ? <span className="text-slate-500">{weekLabel}</span> : null}
            </div>

            <NameField id="worship-name-durood" value={name} onChange={handleNameChange} />

            <form onSubmit={handleDuroodSubmit} className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {DUROOD_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={customDurood.trim() === "" && duroodCount === preset}
                    onClick={() => {
                      setDuroodCount(preset);
                      setCustomDurood("");
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1 ${
                      customDurood.trim() === "" && duroodCount === preset
                        ? "border-[#1e3a8a] bg-[#1e3a8a] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#1e3a8a]/40"
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label="Custom durood count"
                  value={customDurood}
                  onChange={(event) => setCustomDurood(event.target.value)}
                  placeholder="Custom"
                  className="h-8 w-20"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-9 w-full bg-[#1e3a8a] hover:bg-[#172554] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Heart className="mr-2 h-4 w-4" /> Record{" "}
                    {duroodAmount.toLocaleString()} durood
                  </>
                )}
              </Button>
            </form>

            <div className="grid grid-cols-4 gap-1.5">
              <StatTile label="Recited this week" value={duroodStats?.week_total} loading={loading} />
              <StatTile label="Recited all time" value={duroodStats?.total_completed} loading={loading} />
              <StatTile label="Pledged all time" value={duroodStats?.total_pledged} loading={loading} />
              <StatTile
                label="People this week"
                value={duroodStats?.week_participants}
                loading={loading}
              />
            </div>

            <MyEntriesStrip
              label="Added by mistake? Remove a durood entry"
              entries={duroodChipEntries}
              busy={busy}
              onRemove={handleRemoveDurood}
            />

            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-[#1e3a8a]">
                <Trophy className="h-3.5 w-3.5" /> Top Durood Pledgers
              </h4>
              <PeriodToggle period={period} onChange={setPeriod} />
            </div>
            <BoardList rows={duroodBoard} loading={boardsLoading} unit="durood" />
          </div>
        ) : (
          <div className="space-y-1.5">
            <NameField id="worship-name-juz" value={name} onChange={handleNameChange} />

            <form onSubmit={handleJuzSubmit} className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <Label className="text-xs font-semibold text-[#1e3a8a]">
                  Which juz did you recite?
                </Label>
                {activeJuz.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearJuzSelection}
                    className="rounded-md px-1 text-[10px] font-semibold text-slate-500 underline decoration-dotted transition hover:text-[#1e3a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-10 gap-1" role="group" aria-label="Juz 1 to 30">
                {JUZ_NUMBERS.map((juzNumber) => {
                  const mine = completedJuz.includes(juzNumber);
                  const taken = !mine && Boolean(takenThisMonth?.has(juzNumber));
                  const active = activeJuz.includes(juzNumber);
                  const locked = mine || taken;
                  const tone = mine
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : taken
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : active
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#1e3a8a]/40";
                  return (
                    <button
                      key={juzNumber}
                      type="button"
                      aria-pressed={active}
                      aria-label={
                        mine
                          ? `Juz ${juzNumber} recorded by you`
                          : taken
                            ? `Juz ${juzNumber} already recited this month`
                            : `Juz ${juzNumber}`
                      }
                      title={
                        mine
                          ? "Recorded by you"
                          : taken
                            ? "Already recited this month"
                            : undefined
                      }
                      disabled={locked}
                      onClick={() => toggleJuz(juzNumber)}
                      className={`flex h-8 touch-manipulation select-none items-center justify-center gap-0.5 rounded-md border font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1 ${
                        locked ? "text-[11px]" : "text-xs"
                      } ${tone}`}
                    >
                      {locked ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
                      {juzNumber}
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] leading-tight text-slate-500">
                {activeJuz.length > 0 ? (
                  <>
                    <span className="font-semibold text-red-600">
                      {activeJuz.length === 1
                        ? `Juz ${activeJuz[0]}`
                        : `Juz ${[...activeJuz].sort((a, b) => a - b).join(", ")}`}
                    </span>{" "}
                    selected.{" "}
                  </>
                ) : allJuzTaken ? (
                  "All 30 juz are covered this month — a fresh set opens on the 1st. "
                ) : (
                  "Tap one or more juz — you can pick several at once. "
                )}
                <span className="font-semibold text-red-600">Red</span> = chosen,{" "}
                <span className="font-semibold text-emerald-600">green tick</span> = recorded by you,{" "}
                <span className="font-semibold text-slate-500">grey tick</span> = already taken this
                month.
              </p>
              <p className="text-[10px] leading-tight text-slate-500">
                Only the juz you tap are recorded. A juz is 1/30th of the Qur&apos;an, so juz 30 on
                its own never counts as a completed Qur&apos;an.
              </p>

              <Button
                type="submit"
                disabled={busy || activeJuz.length === 0}
                className="h-9 w-full bg-[#1e3a8a] hover:bg-[#172554] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {activeJuz.length === 0
                      ? "Mark complete"
                      : activeJuz.length === 1
                        ? `Mark juz ${activeJuz[0]} complete`
                        : `Mark ${activeJuz.length} juz complete`}
                  </>
                )}
              </Button>
            </form>

            <div className="grid grid-cols-4 gap-1.5">
              <StatTile label="Qur'an completed" value={juzStats?.quran_completions} loading={loading} />
              <StatTile label="This month" value={juzStats?.month_total} loading={loading} />
              <StatTile label="Today" value={juzStats?.today} loading={loading} />
              <StatTile label="People" value={juzStats?.participants} loading={loading} />
            </div>

            <MyEntriesStrip
              label="Added by mistake? Remove a juz"
              entries={juzChipEntries}
              busy={busy}
              onRemove={handleRemoveJuz}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Juz taken this month
                </span>
                <span className="font-bold tabular-nums text-[#1e3a8a]">
                  {loading ? (
                    <Skeleton className="h-3 w-10" />
                  ) : isRealNumber(juzStats?.juz_covered) ? (
                    `${juzStats.juz_covered} / ${juzStats?.juz_total ?? 30}`
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-inset ring-slate-200"
                role="progressbar"
                aria-label="Juz taken this month"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={juzCoveredPercent ?? 0}
                aria-valuetext={
                  loading
                    ? "Loading"
                    : isRealNumber(juzStats?.juz_covered)
                      ? `${juzStats.juz_covered} of ${juzStats?.juz_total ?? 30} juz`
                      : "Unavailable"
                }
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#214f8d] to-[#48a4d8] transition-[width] duration-500"
                  style={{ width: `${juzCoveredPercent ?? 0}%` }}
                />
              </div>
              <p className="mt-1 max-h-9 overflow-y-auto text-[10px] leading-tight text-slate-600">
                {loading ? (
                  <Skeleton className="h-2.5 w-40" />
                ) : juzLeftThisMonth === null ? (
                  <span className="text-slate-400">Still to recite this month: —</span>
                ) : juzLeftThisMonth.length === 0 ? (
                  <span className="font-semibold text-emerald-700">
                    All 30 juz have been covered by the community this month — Alhamdulillah.
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-[#1e3a8a]">
                      Still to recite ({juzLeftThisMonth.length}):
                    </span>{" "}
                    <span className="tabular-nums">{juzLeftThisMonth.join(", ")}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-[#1e3a8a]">
                <Trophy className="h-3.5 w-3.5" /> Top juz reciters
              </h4>
              <PeriodToggle period={period} onChange={setPeriod} />
            </div>
            <BoardList rows={juzBoard} loading={boardsLoading} unit="juz" showJuz />
          </div>
        )}
      </div>

      {/*
        Portalled to the body: the widget clips its own overflow and sits under
        animated wrappers, either of which would cut off or misplace a fixed
        pop-up rendered in place.
      */}
      {popupOpen
        ? createPortal(
            weeklyStillOpen ? (
              <WeeklyQuranPopup
                covered={weeklyStats?.juz_covered}
                total={weeklyStats?.juz_total}
                participants={weeklyStats?.participants}
                deadline={weekDeadline}
                joined={weeklyJoined}
                loading={loading}
                onPickJuz={handleGoToJuz}
                onAskDua={handleAskDuaFromPopup}
                onDismiss={dismissPopup}
              />
            ) : (
              <MonthlyQuranPopup
                covered={juzStats?.juz_covered}
                total={juzStats?.juz_total}
                loading={loading}
                onAddDurood={() => handlePopupJump("durood")}
                onAddJuz={() => handlePopupJump("juz")}
                onDismiss={dismissPopup}
              />
            ),
            document.body
          )
        : null}
    </div>
  );
}
