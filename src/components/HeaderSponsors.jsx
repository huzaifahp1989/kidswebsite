import { useEffect, useState } from "react";
import { sponsorsApi } from "@/api/firebase";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";

/**
 * Featured sponsors strip shown on every page, directly under the header.
 * Items come from the shared sponsors table (Admin → Sponsors), so the list is
 * managed in the dashboard rather than in code.
 *
 * Renders nothing while loading, if the table is empty, or if the fetch fails —
 * a sponsor strip should never leave a broken band on the page.
 */
function linkProps(url) {
  if (isAndroidWebView()) {
    return {
      href: url,
      onClick: (event) => {
        event.preventDefault();
        openExternalUrl(url);
      },
    };
  }
  return { href: url, target: "_blank", rel: "noopener noreferrer" };
}

export default function HeaderSponsors() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await sponsorsApi.list();
        if (cancelled) return;
        setItems(Array.isArray(list) ? list.filter((item) => item.active !== false) : []);
      } catch {
        // Non-critical: the strip just stays hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-3 py-1.5 sm:px-4 md:px-6">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Sponsors
        </span>

        {items.map((item) => {
          const content = item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name || "Sponsor"}
              className="h-6 w-auto max-w-[96px] object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="whitespace-nowrap text-xs font-semibold text-[#1e3a8a]">
              {item.name || "Sponsor"}
            </span>
          );
          const itemClass =
            "flex h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-2 transition hover:border-[#1e3a8a]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1";

          if (!item.linkUrl) {
            return (
              <span key={item.id} className={itemClass} title={item.name || undefined}>
                {content}
              </span>
            );
          }

          return (
            <a
              key={item.id}
              {...linkProps(item.linkUrl)}
              title={item.name || undefined}
              className={itemClass}
            >
              {content}
            </a>
          );
        })}
      </div>
    </div>
  );
}
