import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { fundraisingApi } from "@/api/firebase";
import { DONATE_SUPPORT_URL } from "@/constants/externalLinks";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";

/** Money is only ever displayed from the database figures — never guessed. */
function formatMoney(value, currency) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `£${Math.round(value).toLocaleString("en-GB")}`;
  }
}

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

/**
 * Appeal banner shown at the top of the Home page: an appeal title, a goal bar
 * and however much is still needed before the target is met.
 *
 * The title, target and total raised all come from the `fundraising_campaigns`
 * table, so the charity updates the numbers without a redeploy. While the table
 * is empty, missing or unreadable the banner renders nothing at all, and any
 * figure the database has not supplied shows as an em dash rather than a 0.
 */
export default function FundraisingAppealBanner() {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fundraisingApi.active();
        if (cancelled) return;
        setCampaign(Array.isArray(list) && list.length > 0 ? list[0] : null);
      } catch {
        // Non-critical: a missing table or a failed read just hides the banner.
        if (!cancelled) setCampaign(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !campaign) return null;

  const { title, blurb, targetAmount, raisedAmount, currency } = campaign;
  const hasTarget = typeof targetAmount === "number" && targetAmount > 0;
  const hasRaised = typeof raisedAmount === "number" && Number.isFinite(raisedAmount);
  const known = hasTarget && hasRaised;

  const percent = known ? Math.min(100, Math.round((raisedAmount / targetAmount) * 100)) : null;
  const left = known ? Math.max(0, targetAmount - raisedAmount) : null;
  const reached = known && raisedAmount >= targetAmount;

  const donateUrl = campaign.linkUrl || DONATE_SUPPORT_URL;

  return (
    <section
      aria-label="Fundraising appeal"
      className="bg-gradient-to-r from-[#0f2a5f] via-[#123b7a] to-[#0b2454] px-3 py-2.5 text-white sm:px-4"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-bold leading-tight">
              <HeartHandshake className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="truncate">{title}</span>
            </p>
            {blurb ? (
              <p className="mt-0.5 text-[11px] leading-tight text-white/80">{blurb}</p>
            ) : null}
          </div>

          <a
            {...linkProps(donateUrl)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[#0f2a5f] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2a5f]"
          >
            Donate now
          </a>
        </div>

        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20 ring-1 ring-inset ring-white/20"
          role="progressbar"
          aria-label="Appeal progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? 0}
          aria-valuetext={
            known
              ? `${Math.min(100, Math.round((raisedAmount / targetAmount) * 100))}% of the goal`
              : "Unavailable"
          }
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              reached
                ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
                : "bg-gradient-to-r from-amber-400 to-amber-300"
            }`}
            style={{ width: `${percent ?? 0}%` }}
          />
        </div>

        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[11px] leading-tight">
          {known ? (
            <>
              <span className="font-bold tabular-nums text-amber-300">
                {formatMoney(left, currency)}
              </span>
              <span className="text-white/85">still to raise</span>
              <span className="text-white/60">
                · {formatMoney(raisedAmount, currency)} of{" "}
                {formatMoney(targetAmount, currency)} raised
              </span>
            </>
          ) : (
            <span className="text-white/70">
              Goal {hasTarget ? formatMoney(targetAmount, currency) : "—"} · total so far —
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
