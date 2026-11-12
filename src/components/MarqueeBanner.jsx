import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";

const CHARS_PER_SECOND = 6;
const MIN_DURATION_SECONDS = 18;

function openLink(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Animated top banner. Messages are managed from /AdminMarquee and served by
 * GET /api/marquee. Renders nothing when there are no active messages.
 *
 * Pass `messages` to skip fetching — used for the live preview on the admin page.
 */
export default function MarqueeBanner({ messages: previewMessages }) {
  const [fetched, setFetched] = useState([]);
  const isPreview = Array.isArray(previewMessages);

  useEffect(() => {
    if (isPreview) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marquee");
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(json.messages)) {
          setFetched(json.messages);
        }
      } catch {
        // The banner is non-critical — stay hidden if the API is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPreview]);

  const messages = isPreview ? previewMessages : fetched;
  if (!messages || messages.length === 0) return null;

  const plainText = messages.map((m) => m.message).join("   •   ");
  const duration = Math.max(
    MIN_DURATION_SECONDS,
    Math.round(plainText.length / CHARS_PER_SECOND)
  );

  return (
    <div className="relative flex items-stretch overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white shadow-sm">
      <span className="z-10 flex shrink-0 items-center gap-1.5 bg-black/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] sm:px-3 sm:text-xs">
        <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">News</span>
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
              {messages.map((m) => (
                <span
                  key={`${copy}-${m.id}`}
                  className="flex shrink-0 items-center whitespace-nowrap px-3 text-xs font-semibold sm:text-sm"
                >
                  {m.link_url ? (
                    <button
                      type="button"
                      onClick={() => openLink(m.link_url)}
                      className="underline decoration-white/40 underline-offset-2 transition hover:decoration-white"
                    >
                      {m.message}
                    </button>
                  ) : (
                    m.message
                  )}
                  <span className="px-3 opacity-50" aria-hidden="true">
                    •
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
