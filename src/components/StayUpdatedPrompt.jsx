import { useEffect, useState } from "react";
import { Mail, Megaphone, MessageCircle, Send, Star, X } from "lucide-react";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  NEWSLETTER_URL,
  TELEGRAM_CHANNEL_URL,
  TIKTOK_URL,
  WHATSAPP_GROUP_URL,
} from "@/constants/externalLinks";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";
import { openPlayStoreReview } from "@/utils/inAppReview";

const DISMISS_KEY = "stay_updated_prompt_dismissed_at";
const DISMISS_MS = import.meta.env.DEV ? 60 * 1000 : 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = import.meta.env.DEV ? 500 : 3000;
const FORCE_SHOW_EVENT = "force-stay-updated-prompt";

function openChannelLink(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function StayUpdatedPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleForceShow = () => {
      localStorage.removeItem(DISMISS_KEY);
      setVisible(true);
    };

    window.addEventListener(FORCE_SHOW_EVENT, handleForceShow);
    return () => window.removeEventListener(FORCE_SHOW_EVENT, handleForceShow);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto fixed inset-0 z-[9998] bg-slate-950/55 backdrop-blur-sm" />
      <div className="pointer-events-auto relative z-[9999] mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-blue-100 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#38bdf8] p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold">Join our updates</p>
                <p className="mt-1 text-sm text-blue-50">
                  Get news, reminders, and Islamic content.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss stay updated prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm leading-6 text-slate-700">
            Sign up for our email newsletter or follow us on WhatsApp and Telegram.
          </p>

          <div className="mt-4 grid gap-3">
            <Button
              size="lg"
              onClick={() => openChannelLink(NEWSLETTER_URL)}
              className="h-12 w-full justify-center bg-[#f5b800] text-slate-950 hover:bg-[#dda600]"
            >
              <Mail className="mr-2 h-4 w-4" />
              Sign Up for Our Newsletter
            </Button>
            <Button
              size="lg"
              onClick={() => openChannelLink(WHATSAPP_GROUP_URL)}
              className="h-12 w-full justify-center bg-[#25D366] text-white hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Join WhatsApp Group
            </Button>
            <Button
              size="lg"
              onClick={() => openChannelLink(TELEGRAM_CHANNEL_URL)}
              className="h-12 w-full justify-center bg-[#229ED9] text-white hover:bg-[#1b8fc7]"
            >
              <Send className="mr-2 h-4 w-4" />
              Open Telegram
            </Button>
            <Button
              size="lg"
              onClick={openPlayStoreReview}
              className="h-12 w-full justify-center bg-[#15803d] text-white hover:bg-[#166534]"
            >
              <Star className="mr-2 h-4 w-4" />
              Review now
            </Button>

            <div className="border-t border-slate-200 pt-4 text-center">
              <p className="text-sm font-bold text-slate-900">Find us</p>
              <p className="mt-1 text-xs text-slate-600">
                Search for Islam Media Central and follow us.
              </p>
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => openChannelLink(FACEBOOK_URL)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:bg-[#166fe5]"
                  aria-label="Find Islam Media Central on Facebook"
                  title="Facebook"
                >
                  <FaFacebookF className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => openChannelLink(INSTAGRAM_URL)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E1306C] text-white transition hover:bg-[#c92a60]"
                  aria-label="Find Islam Media Central on Instagram"
                  title="Instagram"
                >
                  <FaInstagram className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => openChannelLink(TIKTOK_URL)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition hover:bg-slate-800"
                  aria-label="Find Islam Media Central on TikTok"
                  title="TikTok"
                >
                  <FaTiktok className="h-5 w-5" />
                </button>
              </div>
            </div>
            <Button size="lg" variant="outline" onClick={handleDismiss} className="h-12 w-full">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
