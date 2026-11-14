import { useEffect, useState } from "react";
import { Radio, Play, Pause, Headphones, CalendarDays, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchRadioStats } from "@/lib/radioStats";
import { formatSlotTime, groupSlotsByDay } from "@/utils/radioSchedule";
import { useRadio } from "@/pages/Layout.jsx";

/** How often the live listener count is refreshed from the stream server. */
const LISTENER_POLL_MS = 30_000;

/**
 * Slim bar at the very top of the Home page that plays the Islam Media Central
 * live stream inside the app, showing how many people are listening right now
 * and opening the programme schedule in a pop-up. Tapping again stops the
 * stream — it never leaves the page.
 */
export default function LiveRadioBar() {
  const [listeners, setListeners] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [slots, setSlots] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const { isPlaying, togglePlay } = useRadio();

  useEffect(() => {
    let active = true;

    const load = async () => {
      const stats = await fetchRadioStats();
      if (active && stats) setListeners(stats.listeners);
    };

    load();
    const timer = setInterval(load, LISTENER_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // The schedule is fetched each time the pop-up opens, so it is never stale.
  useEffect(() => {
    if (!scheduleOpen) return undefined;

    let active = true;
    setScheduleLoading(true);
    setScheduleError("");

    const load = async () => {
      try {
        const res = await fetch("/api/radio-schedule");
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) throw new Error(json?.error || "Could not load the schedule");
        setSlots(Array.isArray(json.slots) ? json.slots : []);
      } catch (err) {
        if (active) setScheduleError(err?.message || "Could not load the schedule");
      } finally {
        if (active) setScheduleLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [scheduleOpen]);

  const days = groupSlotsByDay(slots);

  return (
    <>
      <section
        aria-label="Listen to live radio"
        className="border-b border-rose-900/30 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 px-3 py-2 text-white sm:px-4"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <Radio className="h-4 w-4 shrink-0" />
            <p className="truncate text-[13px] font-bold leading-tight">
              Listen to Live Radio
            </p>

            {typeof listeners === "number" ? (
              <span
                title="People listening to the stream right now"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              >
                <Headphones className="h-3 w-3" />
                {listeners} listening
              </span>
            ) : null}

            <span className="hidden truncate text-[11px] text-white/85 sm:inline">
              Islam Media Central stream
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/40 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CalendarDays className="h-3 w-3" />
              Schedule
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? "Stop the live radio stream" : "Listen to the live radio stream"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isPlaying ? "Stop" : "Listen"}
            </button>
          </div>
        </div>
      </section>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="pr-10 text-lg font-bold text-slate-900">
            Live radio schedule
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Programmes on Islam Media Central. Times show in your own timezone.
          </DialogDescription>

          <div className="max-h-[60vh] overflow-y-auto">
            {scheduleLoading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading the schedule…
              </p>
            ) : scheduleError ? (
              <p className="py-10 text-center text-sm text-rose-700">{scheduleError}</p>
            ) : days.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No programmes scheduled right now — please check back soon.
              </p>
            ) : (
              <ul className="space-y-4">
                {days.map((day) => (
                  <li key={day.key}>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1e3a8a]">
                      {day.label}
                    </p>
                    <ul className="mt-1.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {day.slots.map((slot) => (
                        <li key={slot.id} className="px-3 py-2.5">
                          <p className="text-sm font-bold text-slate-900">{slot.title}</p>
                          <p className="mt-0.5 text-xs font-semibold text-rose-700">
                            {formatSlotTime(slot.starts_at, slot.ends_at)}
                          </p>
                          {slot.presenter ? (
                            <p className="mt-0.5 text-xs text-slate-600">
                              with {slot.presenter}
                            </p>
                          ) : null}
                          {slot.description ? (
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                              {slot.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setScheduleOpen(false)}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
