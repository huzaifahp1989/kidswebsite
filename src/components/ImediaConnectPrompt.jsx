import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarCheck,
  Clapperboard,
  ExternalLink,
  LogIn,
  MessageSquare,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMEDIA_CONNECT_URL } from "@/constants/externalLinks";
import { externalLinkProps } from "@/utils/androidWebView";

const DISMISS_KEY = "imedia_connect_prompt_dismissed_at";
const DISMISS_MS = import.meta.env.DEV ? 60 * 1000 : 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = import.meta.env.DEV ? 500 : 3000;

const FEATURES = [
  { icon: MessageSquare, label: "Post updates, photos and statuses — just like Facebook" },
  { icon: Clapperboard, label: "Add and watch reels" },
  { icon: Users, label: "Create your own groups and pages" },
  { icon: CalendarCheck, label: "Stay up to date with events and app features" },
];

/**
 * Pop-up inviting users to the Imedia Connect network, listing what they can do
 * there and linking straight to the account page.
 */
export default function ImediaConnectPrompt() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  // Never cover the admin area — this modal has a full-screen backdrop.
  const isAdminRoute = location.pathname.toLowerCase().startsWith("/admin");

  useEffect(() => {
    if (isAdminRoute) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      if (!import.meta.env.DEV && dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;
      if (!cancelled) setVisible(true);
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAdminRoute]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible || isAdminRoute) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center px-2 py-3 pointer-events-none sm:px-4 sm:py-4">
      <div className="pointer-events-auto fixed inset-0 z-[9998] bg-slate-950/55 backdrop-blur-sm" />
      <div className="pointer-events-auto relative z-[9999] mx-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-0.5rem)] max-w-md overflow-y-auto rounded-2xl border border-violet-100 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:rounded-3xl">
        <div className="bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#4c1d95] p-4 text-white sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Users className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-base font-bold">Join Imedia Connect</p>
                <p className="mt-1 text-sm text-violet-50">
                  Our free community network.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss Imedia Connect prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-sm leading-6 text-slate-700">
            Create your Imedia Connect account to post, share and join the community.{" "}
            <span className="font-semibold text-slate-900">
              If you have signed up before, please use your login.
            </span>
          </p>

          <ul className="mt-4 space-y-2.5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm leading-6 text-slate-700">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-3">
            <a
              {...externalLinkProps(IMEDIA_CONNECT_URL)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-normal rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#4c1d95] px-4 text-sm font-extrabold text-white shadow-md transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Create my account
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
            <a
              {...externalLinkProps(IMEDIA_CONNECT_URL)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-normal rounded-xl border border-violet-200 bg-white px-4 text-sm font-bold text-violet-800 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              I already have an account — log in
            </a>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleDismiss}
              className="h-11 w-full text-slate-500"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
