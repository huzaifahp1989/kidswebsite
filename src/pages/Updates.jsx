import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CalendarDays, ExternalLink, MapPin, Megaphone } from "lucide-react";
import { formatEventWhen } from "@/utils/events";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";

const POLL_MS = 60000;

const PRIORITY_STYLES = {
  urgent: "border-rose-200 bg-rose-50/50",
  highlight: "border-amber-200 bg-amber-50/50",
  info: "border-amber-200 bg-amber-50/50",
  normal: "border-slate-200 bg-white",
};

function openLink(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Public destination for the "Latest updates" strip pills. Renders the full
 * events and notices lists with #events / #notices anchors.
 */
export default function Updates() {
  const location = useLocation();
  const [data, setData] = useState({ events: [], notices: [] });
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/events");
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setData({
            events: Array.isArray(json.events) ? json.events : [],
            notices: Array.isArray(json.notices) ? json.notices : [],
          });
          setSetupRequired(false);
        } else if (json?.setupRequired) {
          setSetupRequired(true);
        }
      } catch {
        // Non-critical: the page keeps its last known content.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, POLL_MS);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return undefined;
    const id = hash.replace(/^#/, "");
    // Both sections are always in the DOM (empty states included), so the target
    // exists as soon as the page mounts — no need to wait for the fetch.
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1e3a8a]">Latest updates</h1>
      <p className="mt-1 text-sm text-slate-600">
        What is coming up and what is worth knowing right now.
      </p>

      {setupRequired ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
          Events are not set up yet. Apply{" "}
          <code className="font-mono text-xs">supabase/create-events.sql</code> in the Supabase
          SQL editor.
        </p>
      ) : null}

      {/* Events */}
      <section id="events" className="mt-8 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1e3a8a]">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Upcoming events
        </h2>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : data.events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nothing scheduled right now.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.events.map((event) => (
              <li
                key={event.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex gap-3 p-4">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{event.title}</h3>
                    <p className="mt-0.5 text-sm font-medium text-[#1e3a8a]">
                      {formatEventWhen(event.starts_at, event.ends_at)}
                    </p>
                    {event.location ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {event.location}
                      </p>
                    ) : null}
                    {event.description ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                        {event.description}
                      </p>
                    ) : null}
                    {event.link_url ? (
                      <button
                        type="button"
                        onClick={() => openLink(event.link_url)}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#1e3a8a] underline decoration-[#1e3a8a]/30 underline-offset-2 hover:decoration-[#1e3a8a]"
                      >
                        More info
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notices */}
      <section id="notices" className="mt-10 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1e3a8a]">
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          Notices
        </h2>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : data.notices.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No notices at the moment.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.notices.map((notice) => (
              <li
                key={notice.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  PRIORITY_STYLES[notice.priority] || PRIORITY_STYLES.normal
                }`}
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {notice.icon ? <span className="mr-1.5">{notice.icon}</span> : null}
                  {notice.title}
                </h3>
                {notice.body ? (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{notice.body}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">{formatEventWhen(notice.created_at)}</p>
                {notice.url ? (
                  <button
                    type="button"
                    onClick={() => openLink(notice.url)}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#1e3a8a] underline decoration-[#1e3a8a]/30 underline-offset-2 hover:decoration-[#1e3a8a]"
                  >
                    Read more
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
