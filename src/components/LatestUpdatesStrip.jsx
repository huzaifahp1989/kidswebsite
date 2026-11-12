import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Megaphone } from "lucide-react";
import { createPageUrl } from "@/utils";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";

const POLL_MS = 60000;
const CHARS_PER_SECOND = 6;
const MIN_DURATION_SECONDS = 18;
const MAX_EVENTS = 4;
const MAX_NOTICES = 3;
const MAX_TEXT_LENGTH = 90;

function truncate(text) {
  const value = String(text || "").trim();
  if (value.length <= MAX_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_TEXT_LENGTH).trimEnd()}…`;
}

function openLink(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Site-wide "Latest updates" strip. Shows the newest events and notices in a
 * compact scrolling ticker with two pills linking to the full lists.
 *
 * Mounted in Layout so it appears on every page. Renders nothing when there is
 * nothing to show, so it never occupies space on a quiet site.
 */
export default function LatestUpdatesStrip() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/events");
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setData({
          events: Array.isArray(json.events) ? json.events : [],
          notices: Array.isArray(json.notices) ? json.notices : [],
        });
      } catch {
        // Non-critical: the strip simply stays hidden if the API is unavailable.
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

  const eventCount = data?.events?.length || 0;
  const noticeCount = data?.notices?.length || 0;

  const items = useMemo(() => {
    if (!data) return [];
    const list = [];
    (data.events || []).slice(0, MAX_EVENTS).forEach((event) => {
      list.push({
        key: `event-${event.id}`,
        kind: "event",
        text: truncate(event.title),
        url: event.link_url || null,
      });
    });
    (data.notices || []).slice(0, MAX_NOTICES).forEach((notice) => {
      list.push({
        key: `notice-${notice.id}`,
        kind: "notice",
        text: truncate(notice.title),
        url: notice.url || null,
      });
    });
    return list;
  }, [data]);

  if (items.length === 0) return null;

  const plainText = items.map((item) => item.text).join("   •   ");
  const duration = Math.max(
    MIN_DURATION_SECONDS,
    Math.round(plainText.length / CHARS_PER_SECOND)
  );

  const handleItemClick = (item) => {
    if (item.url) {
      openLink(item.url);
      return;
    }
    const base = createPageUrl("Updates");
    navigate(item.kind === "event" ? `${base}#events` : `${base}#notices`);
  };

  return (
    <div
      role="region"
      aria-label="Latest updates"
      className="relative flex items-stretch overflow-hidden bg-[#1e3a8a] text-white shadow-sm"
    >
      <span className="z-10 flex shrink-0 items-center gap-1.5 bg-black/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] sm:px-3 sm:text-xs">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Latest</span>
      </span>

      <div className="marquee-viewport relative flex-1 overflow-hidden">
        <div
          className="marquee-track flex w-max items-center py-1"
          style={{ "--marquee-duration": `${duration}s` }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center"
              aria-hidden={copy === 1 ? "true" : undefined}
            >
              {items.map((item) => (
                <span
                  key={`${copy}-${item.key}`}
                  className="flex shrink-0 items-center whitespace-nowrap px-3 text-xs font-semibold sm:text-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-1.5 underline decoration-white/40 underline-offset-2 transition hover:decoration-white"
                  >
                    {item.kind === "event" ? (
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {item.text}
                  </button>
                  <span className="px-3 opacity-50" aria-hidden="true">
                    •
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="z-10 flex shrink-0 items-center gap-1 bg-black/20 px-1.5">
        <Link
          to={`${createPageUrl("Updates")}#events`}
          className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-bold text-[#1e3a8a] transition hover:bg-amber-300"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Events</span>
          <span className="tabular-nums">{eventCount}</span>
        </Link>
        <Link
          to={`${createPageUrl("Updates")}#notices`}
          className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-bold text-[#1e3a8a] transition hover:bg-amber-300"
        >
          <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Notices</span>
          <span className="tabular-nums">{noticeCount}</span>
        </Link>
      </div>
    </div>
  );
}
