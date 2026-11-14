import { Users, Clapperboard, ExternalLink } from "lucide-react";

import { IMEDIA_CONNECT_URL } from "@/constants/externalLinks";
import { externalLinkProps } from "@/utils/androidWebView";

/**
 * Banner at the top of the Home page inviting users to the Imedia Connect
 * network, where they can post reels and follow the latest updates.
 */
export default function ImediaConnectBanner() {
  return (
    <section
      aria-label="Join the Imedia Connect network"
      className="bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#4c1d95] px-3 py-2.5 text-white sm:px-4"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-bold leading-tight">
            <Users className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="truncate">Join the Imedia Connect network</span>
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-white/80">
            Write a post with a reel, stay updated with the latest.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            {...externalLinkProps(IMEDIA_CONNECT_URL)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Clapperboard className="h-3 w-3" />
            Write post
          </a>

          <a
            {...externalLinkProps(IMEDIA_CONNECT_URL)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[#3b0764] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4c1d95]"
          >
            Join now
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
