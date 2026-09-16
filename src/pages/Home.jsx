import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Star,
  Sparkles,
  Heart,
  Shield,
  MessageCircle,
  ExternalLink,
  Mail,
  BookOpen,
  Radio,
  ClipboardList,
  Megaphone,
  HeartHandshake,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useRadio } from "./Layout.jsx";
import nasihahWorldBanner from "@/assets/brands/nasihah-world-banner.jpg";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";
import {
  AICT_GLOBAL_URL,
  DONATE_SUPPORT_URL,
  HIFZ_ASSISTANT_URL,
  SURVEY_FORM_URL,
  WHATSAPP_GROUP_URL,
} from "@/constants/externalLinks";
import { announcementsApi } from "@/api/firebase";
import AnnouncementImageSlider from "@/components/AnnouncementImageSlider";
import { getAnnouncementImages, isAnnouncementScheduledNow } from "@/utils/announcementImages";
import { supabase } from "@/lib/supabase";

const ADS_SECTION_URL = "https://traeadvert8pia.vercel.app/";
const KIDS_ZONE_PATH = createPageUrl("KidsZone");
const NEWSLETTER_URL = "https://mailchi.mp/3a9b946d45cb/imedia";
const SURVEY_POPUP_DISMISS_KEY = "survey_popup_dismissed_at_v2";
const SURVEY_POPUP_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const HOME_HIT_COUNTER_KEY = "home_hit_counter";
const HOME_VISITOR_COUNTED_KEY = "home_visitor_counted";
const HOME_HIT_COUNTER_START = 6000;
const HOME_VISITOR_ID_KEY = "home_visitor_id";
const HOME_VISIT_SESSION_KEY = "home_visitor_counted_session";
const HOME_VISIT_SESSION_ID_KEY = "home_visitor_session_id";

function readCachedHomeHitCount() {
  try {
    const storedCount = Number(localStorage.getItem(HOME_HIT_COUNTER_KEY));
    if (Number.isFinite(storedCount) && storedCount >= HOME_HIT_COUNTER_START) {
      return storedCount;
    }
  } catch {}
  return HOME_HIT_COUNTER_START;
}
const LIGHTBOX_DIALOG_CLOSE_CLASS =
  "[&>button]:z-30 [&>button]:right-3 [&>button]:top-3 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-white/15 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/25 [&>button]:touch-manipulation";

function openAnnouncementLink(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function externalLinkProps(url) {
  if (isAndroidWebView()) {
    return {
      href: url,
      onClick: (e) => {
        e.preventDefault();
        openExternalUrl(url);
      },
    };
  }
  return {
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

const mainFeaturedSponsors = [
  { name: "Nasihah World", accent: "sky" },
  { name: "Tile Planet", accent: "dark" },
  { name: "Express Properties", accent: "navy" },
  { name: "Theory Translated", accent: "blue" },
];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">Something went wrong</div>
            <div className="text-sm text-slate-600">Please refresh the page</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function FeaturedSponsorLogo({ item }) {
  if (item.accent === "sky") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <img
          src={nasihahWorldBanner}
          alt="Nasihah World"
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  if (item.accent === "dark") {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 bg-black px-3">
        <div className="h-7 w-7 shrink-0 rotate-45 border-[5px] border-red-600" />
        <div className="flex flex-col leading-none">
          <span className="text-[14px] font-black tracking-wide text-red-500">TILE</span>
          <span className="text-[14px] font-black tracking-wide text-white">PLANET</span>
        </div>
      </div>
    );
  }

  if (item.accent === "navy") {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#1A234D] px-2 text-white">
        <div className="text-center text-[7px] italic leading-none tracking-wide text-white/70">
          Thinking of Selling or Letting?
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white font-serif font-semibold">
          <span className="text-[11px] text-[#8F143B]">E</span>
          <span className="text-[11px] text-white">P</span>
        </div>
        <div className="text-center text-[11px] font-serif leading-tight tracking-wide">
          Express Properties
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#5B85E5] px-2 text-center text-white">
      <div className="text-[18px] font-black leading-none tracking-wide">THEORY</div>
      <div className="mt-0.5 text-[11px] font-black uppercase tracking-wide text-orange-300">
        Translated
      </div>
      <div className="mt-0.5 text-[7px] font-semibold tracking-wide text-white/90">
        Multilingual App
      </div>
    </div>
  );
}

const islamicValues = [
  {
    icon: Heart,
    title: "Love & Compassion",
    description: "Teaching kindness and mercy in every activity and story.",
  },
  {
    icon: Star,
    title: "Knowledge & Wisdom",
    description: "Making Islamic learning clear, practical and engaging.",
  },
  {
    icon: Shield,
    title: "Safety & Trust",
    description: "A family-friendly space designed with children in mind.",
  },
];

const bannerSlides = [
  {
    id: 1,
    text: "Welcome to Islam Media Central",
    subtext: "Learn, grow and strengthen iman",
  },
  {
    id: 2,
    text: '"Whoever guides someone to goodness will have a reward like one who did it."',
    subtext: "Sahih Muslim",
  },
  {
    id: 3,
    text: '"The best among you are those who learn the Qur\'an and teach it."',
    subtext: "Sahih Bukhari",
  },
  {
    id: 4,
    text: '"Remember Allah much so that you may be successful."',
    subtext: "Qur'an 62:10",
  },
];

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700/80">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1e3a8a] md:text-3xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [lightboxAnnouncement, setLightboxAnnouncement] = useState(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const { isPlaying: isRadioPlaying, togglePlay: toggleRadio } = useRadio();
  const [gregorianDate, setGregorianDate] = useState("");
  const [islamicDate, setIslamicDate] = useState("");
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const initialHitCount = readCachedHomeHitCount();
  const [homeHitCount, setHomeHitCount] = useState(initialHitCount);
  const [displayHitCount, setDisplayHitCount] = useState(initialHitCount);
  const displayHitCountRef = useRef(initialHitCount);
  const shouldAnimateHitCountRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    displayHitCountRef.current = displayHitCount;
  }, [displayHitCount]);

  useEffect(() => {
    const end = homeHitCount;
    if (!shouldAnimateHitCountRef.current) {
      displayHitCountRef.current = end;
      setDisplayHitCount(end);
      return undefined;
    }

    const start = displayHitCountRef.current;
    if (start === end) {
      shouldAnimateHitCountRef.current = false;
      return undefined;
    }

    const diff = end - start;
    const durationMs = Math.min(1200, Math.max(400, Math.abs(diff) * 40));
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + diff * eased);
      displayHitCountRef.current = next;
      setDisplayHitCount(next);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        shouldAnimateHitCountRef.current = false;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [homeHitCount]);

  useEffect(() => {
    let cancelled = false;

    const readSessionCounted = () => {
      try {
        return sessionStorage.getItem(HOME_VISIT_SESSION_KEY) === "true";
      } catch {
        return false;
      }
    };

    const markSessionCounted = () => {
      try {
        sessionStorage.setItem(HOME_VISIT_SESSION_KEY, "true");
      } catch {}
    };

    const getSessionVisitorId = () => {
      try {
        let visitorId = sessionStorage.getItem(HOME_VISIT_SESSION_ID_KEY);
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          sessionStorage.setItem(HOME_VISIT_SESSION_ID_KEY, visitorId);
        }
        if (!localStorage.getItem(HOME_VISITOR_ID_KEY)) {
          localStorage.setItem(HOME_VISITOR_ID_KEY, visitorId);
        }
        return visitorId;
      } catch {
        return `anon-${Date.now()}`;
      }
    };

    const applyCount = (value, { animate }) => {
      const next = Number(value);
      if (!Number.isFinite(next) || next < HOME_HIT_COUNTER_START) return false;
      if (cancelled) return false;
      shouldAnimateHitCountRef.current = Boolean(animate);
      if (!animate) {
        displayHitCountRef.current = next;
        setDisplayHitCount(next);
      }
      setHomeHitCount(next);
      try {
        localStorage.setItem(HOME_HIT_COUNTER_KEY, String(next));
      } catch {}
      return true;
    };

    const registerVisit = async () => {
      // Claim this session synchronously so StrictMode remounts / refresh
      // never send a second increment.
      const alreadyCountedThisSession = readSessionCounted();
      if (!alreadyCountedThisSession) {
        markSessionCounted();
      }

      const shouldIncrement = !alreadyCountedThisSession;
      const visitorId = shouldIncrement ? getSessionVisitorId() : null;

      if (supabase) {
        try {
          const { data, error } = await supabase.rpc("register_home_visitor", {
            p_visitor_id: visitorId,
          });
          if (!error && applyCount(data, { animate: shouldIncrement })) {
            return;
          }
        } catch {}
      }

      try {
        const storedCount = Number(localStorage.getItem(HOME_HIT_COUNTER_KEY));
        const base = Number.isFinite(storedCount)
          ? Math.max(HOME_HIT_COUNTER_START, storedCount)
          : HOME_HIT_COUNTER_START;
        const nextCount = shouldIncrement ? base + 1 : base;
        localStorage.setItem(HOME_HIT_COUNTER_KEY, String(nextCount));
        localStorage.setItem(HOME_VISITOR_COUNTED_KEY, "true");
        applyCount(nextCount, { animate: shouldIncrement });
      } catch {
        if (shouldIncrement && !cancelled) {
          shouldAnimateHitCountRef.current = true;
          setHomeHitCount((prev) => prev + 1);
        }
      }
    };

    registerVisit();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const delayMs = import.meta.env.DEV ? 1500 : 5000;
    const timer = window.setTimeout(() => {
      try {
        const dismissedAt = parseInt(localStorage.getItem(SURVEY_POPUP_DISMISS_KEY) || "0", 10);
        if (dismissedAt && Date.now() - dismissedAt < SURVEY_POPUP_COOLDOWN_MS) return;
      } catch {}
      setSurveyDialogOpen(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const d = new Date();
    try {
      setGregorianDate(
        d.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    } catch {
      setGregorianDate(d.toDateString());
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`)
      .then((r) => r.json())
      .then((j) => {
        const h = j?.data?.hijri;
        if (h) {
          const monthMap = (m) => {
            const x = String(m || "").toLowerCase();
            if (x.includes("jumada") && x.includes("ii")) return "Jumada al-Thani";
            if (x.includes("jumada") && (x.includes("i") || x.includes("awwal") || x.includes("ula"))) {
              return "Jumada al-Ula";
            }
            if (x.includes("rabi") && x.includes("ii")) return "Rabi al-Thani";
            if (x.includes("rabi") && (x.includes("i") || x.includes("awwal"))) return "Rabi al-Awwal";
            if (x.includes("dhu") && (x.includes("qa") || x.includes("qadah") || x.includes("qa'dah"))) {
              return "Dhu al-Qadah";
            }
            if (x.includes("dhu") && x.includes("hij")) return "Dhu al-Hijjah";
            return m;
          };
          const monthName = monthMap(h.month?.en);
          setIslamicDate(`${monthName} ${h.day} ${h.year} AH`);
        } else {
          throw new Error("No hijri data");
        }
      })
      .catch(() => {
        try {
          const fmt = new Intl.DateTimeFormat("en-GB-u-ca-islamic", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const parts = fmt.formatToParts(d);
          const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
          setIslamicDate(`${obj.month} ${obj.day} ${obj.year} AH`);
        } catch {
          setIslamicDate("");
        }
      });
  }, []);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const list = await announcementsApi.list();
        const active = (list || [])
          .filter((item) => item && (item.active ?? true))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setAnnouncements(active);
      } catch {
        setAnnouncements([]);
      }
    };
    loadAnnouncements();
  }, []);

  const homeAnnouncements = announcements.filter(
    (item) => item.showOnHome && isAnnouncementScheduledNow(item)
  );

  const openAnnouncementLightbox = (item, imageIndex = 0) => {
    const images = getAnnouncementImages(item);
    if (!images.length) return;
    setLightboxAnnouncement(item);
    setLightboxImageIndex(imageIndex);
  };

  const closeAnnouncementLightbox = () => {
    setLightboxAnnouncement(null);
    setLightboxImageIndex(0);
  };

  const donateLinkProps = externalLinkProps(DONATE_SUPPORT_URL);
  const aictDonateLinkProps = externalLinkProps(AICT_GLOBAL_URL);
  const surveyLinkProps = externalLinkProps(SURVEY_FORM_URL);

  const dismissSurveyPopup = () => {
    try {
      localStorage.setItem(SURVEY_POPUP_DISMISS_KEY, String(Date.now()));
    } catch {}
    setSurveyDialogOpen(false);
  };

  const openSurveyForm = () => {
    dismissSurveyPopup();
    if (isAndroidWebView()) {
      openExternalUrl(SURVEY_FORM_URL);
      return;
    }
    window.open(SURVEY_FORM_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#EFF6FF]">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900 sm:text-sm">
          Visitors:{" "}
          <span className="inline-block tabular-nums">
            {displayHitCount.toLocaleString()}
          </span>
        </div>
        {/* Utility bar: donate + survey */}
        <div className="border-b border-white/10 bg-[#1e3a8a] px-4 py-2">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
              <p className="text-center text-xs text-blue-100 sm:text-left">
                Your giving will be a sadaqah jariyah — ongoing reward, insha&apos;Allah
              </p>
              <a
                {...donateLinkProps}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1e3a8a] transition hover:bg-sky-50"
              >
                <HeartHandshake className="h-3.5 w-3.5" />
                Donate to our projects
              </a>
              <a
                {...aictDonateLinkProps}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <img
                  src="https://aictglobal.org/assets/aict-logo-D5H_R8Jb.png?v=512"
                  alt="AICT Global"
                  className="h-4 w-4 rounded-full bg-white object-contain"
                />
                Donate to AICT
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            </div>
            <a
              {...surveyLinkProps}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Survey
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          </div>
        </div>

        <Dialog
          open={Boolean(lightboxAnnouncement)}
          onOpenChange={(open) => !open && closeAnnouncementLightbox()}
        >
          <DialogContent
            className={`z-[70] w-[calc(100%-2rem)] max-h-[90dvh] max-w-5xl overflow-y-auto rounded-2xl border-0 bg-black p-0 shadow-2xl ${LIGHTBOX_DIALOG_CLOSE_CLASS}`}
          >
            {lightboxAnnouncement && (
              <>
                <AnnouncementImageSlider
                  images={getAnnouncementImages(lightboxAnnouncement)}
                  title={lightboxAnnouncement.title || "Announcement"}
                  variant="lightbox"
                  startIndex={lightboxImageIndex}
                  onSlideChange={setLightboxImageIndex}
                />
                <div className="border-t border-white/10 bg-black/90 px-4 py-3 text-center text-sm text-white">
                  {lightboxAnnouncement.title || "Announcement"}
                  {getAnnouncementImages(lightboxAnnouncement).length > 1 && (
                    <span className="ml-2 text-white/60">
                      ({lightboxImageIndex + 1} of{" "}
                      {getAnnouncementImages(lightboxAnnouncement).length})
                    </span>
                  )}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={closeAnnouncementLightbox}
                      className="min-h-[44px] rounded-full bg-white/15 px-6 py-2.5 text-sm font-semibold text-white touch-manipulation hover:bg-white/25"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={surveyDialogOpen && !lightboxAnnouncement}
          onOpenChange={(open) => {
            if (!open) dismissSurveyPopup();
          }}
        >
          <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border-0 p-0 shadow-2xl">
            <div className="bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#172554] px-6 pb-5 pt-7 text-white">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <ClipboardList className="h-6 w-6 text-sky-200" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold leading-tight text-white">
                We need to know our users
              </DialogTitle>
              <DialogDescription className="mt-3 text-center text-sm leading-relaxed text-blue-100/90">
                Your feedback is very important for us. Please take a minute to fill in the survey
                so we can improve Islam Media Central for everyone.
              </DialogDescription>
            </div>
            <div className="space-y-3 bg-white px-6 py-5">
              <button
                type="button"
                onClick={openSurveyForm}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1e3a8a] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
              >
                Take the survey
                <ExternalLink className="h-4 w-4 opacity-90" />
              </button>
              <button
                type="button"
                onClick={dismissSurveyPopup}
                className="inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Maybe later
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating WhatsApp */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6"
        >
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1ebe57]"
            aria-label="Join WhatsApp Group"
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">Join Group</span>
          </a>
        </motion.div>

        {/* Hero */}
        <section className="relative overflow-hidden bg-[#1e3a8a]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 56px), repeating-linear-gradient(-45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 56px)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a] via-[#1e40af]/95 to-[#172554]" />
          <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-16 text-center md:pb-20 md:pt-20">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300/90">
                Media With Purpose
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Islam Media Central
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-blue-100/85 md:text-lg">
                Islamic education, interactive learning and community resources for every age.
              </p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-8 flex flex-col items-center gap-1 text-sm text-blue-100/70 sm:flex-row sm:justify-center sm:gap-3"
              >
                <span>{gregorianDate || "Loading date…"}</span>
                <span className="hidden text-sky-400/60 sm:inline">|</span>
                <span className="font-medium text-sky-200">
                  {islamicDate || "Loading Hijri…"}
                </span>
              </motion.div>
            </motion.div>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-7 bg-[#EFF6FF]"
            style={{ clipPath: "ellipse(58% 100% at 50% 100%)" }}
          />
        </section>

        {/* Live radio */}
        <section className="border-b border-blue-100 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Radio className="h-4 w-4 text-[#1e3a8a]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    Islamic Radio
                  </span>
                  <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">Islam Media Central stream</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleRadio}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1e3a8a] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1e40af]"
              aria-label={isRadioPlaying ? "Pause radio" : "Play radio"}
            >
              {isRadioPlaying ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />
                  Pause
                </>
              ) : (
                <>
                  <span className="border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
                  Play
                </>
              )}
            </button>
          </div>
        </section>

        {/* Announcements */}
        {homeAnnouncements.length > 0 && (
          <section className="border-b border-amber-100 bg-amber-50/80 px-4 py-10">
            <div className="mx-auto max-w-5xl">
              <SectionHeading
                eyebrow="Updates"
                title="Announcements"
                subtitle="Latest news and notices from Islam Media Central"
              />
              <div className="grid gap-4 md:grid-cols-2">
                {homeAnnouncements.map((item) => {
                  const images = getAnnouncementImages(item);
                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm"
                    >
                      {images.length > 0 && (
                        <AnnouncementImageSlider
                          images={images}
                          title={item.title || "Announcement"}
                          variant="preview"
                          onImageClick={(index) => openAnnouncementLightbox(item, index)}
                        />
                      )}
                      <div className="p-5">
                        {item.title ? (
                          <h3 className="text-lg font-semibold text-[#1e3a8a]">{item.title}</h3>
                        ) : null}
                        {item.text ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                            {item.text}
                          </p>
                        ) : null}
                        {item.linkUrl ? (
                          <button
                            type="button"
                            onClick={() => openAnnouncementLink(item.linkUrl)}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
                          >
                            {item.linkLabel || "Learn more"}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Sponsors */}
        <section className="border-b border-slate-100 bg-white px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700/80">
                  Partners
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#1e3a8a]">Featured sponsors</h2>
              </div>
              <a
                href={ADS_SECTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                View all ads <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="relative overflow-hidden">
              <motion.div
                className="flex w-max gap-3"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 28, ease: "linear", repeat: Infinity }}
              >
                {[...mainFeaturedSponsors, ...mainFeaturedSponsors].map((item, index) => (
                  <a
                    key={`${item.name}-ticker-${index}`}
                    href={ADS_SECTION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block shrink-0"
                  >
                    <div className="h-[72px] w-[140px] overflow-hidden rounded-xl border border-slate-200">
                      <FeaturedSponsorLogo item={item} />
                    </div>
                  </a>
                ))}
              </motion.div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="px-4 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Platforms"
              title="Learn with purpose"
              subtitle="Tools for Qur’an memorisation and engaging Islamic learning for children."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <motion.a
                href={HIFZ_ASSISTANT_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="group block"
              >
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-[#0f766e] to-[#134e4a] p-7 text-white shadow-sm md:p-8">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-50">
                    <Sparkles className="h-3 w-3" />
                    Qur’an
                  </span>
                  <h3 className="mt-4 text-2xl font-bold leading-tight">Quran Hifz Assistant</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-emerald-50/90">
                    Colour-coded tajweed, ayah translations and word-by-word practice for
                    memorisation.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    <BookOpen className="h-4 w-4" />
                    Open assistant
                    <ExternalLink className="h-3.5 w-3.5 opacity-80 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.a>

              <Link
                to={KIDS_ZONE_PATH}
                className="group block"
              >
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-[#1e3a8a] to-[#172554] p-7 text-white shadow-sm md:p-8"
                >
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-100">
                    <Star className="h-3 w-3" />
                    Featured
                  </span>
                  <h3 className="mt-4 text-2xl font-bold leading-tight">Kids Zone</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-blue-100/90">
                    Games, stories, quizzes and creative challenges designed for young Muslim
                    learners.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-200">
                    Explore Kids Zone
                  </span>
                </motion.div>
              </Link>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="border-y border-slate-100 bg-white px-4 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Community"
              title="Stay connected"
              subtitle="Join the conversation and receive weekly updates."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-slate-200 bg-[#EFF6FF] p-6 transition hover:border-emerald-200 hover:shadow-md md:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#128c7e]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#1e3a8a]">WhatsApp group</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Daily reminders, Islamic content and community updates.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#128c7e]">
                  Join now <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>

              <a
                href={NEWSLETTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-slate-200 bg-[#EFF6FF] p-6 transition hover:border-blue-200 hover:shadow-md md:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1e3a8a]/10 text-[#1e3a8a]">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#1e3a8a]">Newsletter</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Platform updates, curated resources and new features by email.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a8a]">
                  Subscribe free <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Donate */}
        <section className="px-4 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <a
              {...donateLinkProps}
              className="group block overflow-hidden rounded-2xl border border-[#1e3a8a]/15 bg-[#1e3a8a] p-8 text-white shadow-sm transition hover:shadow-md md:p-10"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/90">
                    Sadaqah jariyah
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                    Support our mission
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-blue-100/85 md:text-base">
                    Your giving will be a sadaqah jariyah — helping fund prizes, new features and
                    hosting for families worldwide.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1e3a8a] transition group-hover:bg-sky-50 md:self-center">
                  <HeartHandshake className="h-4 w-4" />
                  Donate now
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          </div>
        </section>

        {/* Quotes */}
        <section className="bg-[#1e3a8a] px-4 py-14 md:py-16">
          <div className="mx-auto max-w-3xl">
            <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300/90">
              Inspiration
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="px-8 py-10 text-center md:px-12 md:py-12"
                >
                  <p className="text-lg font-medium leading-relaxed text-white md:text-xl">
                    {bannerSlides[currentSlide].text}
                  </p>
                  {bannerSlides[currentSlide].subtext ? (
                    <p className="mt-4 text-sm font-medium text-sky-300">
                      {bannerSlides[currentSlide].subtext}
                    </p>
                  ) : null}
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-center gap-2 pb-6">
                {bannerSlides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentSlide ? "w-7 bg-sky-300" : "w-1.5 bg-white/30"
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-white px-4 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Our values"
              title="Built with care"
              subtitle="A calm, trusted foundation for Islamic learning at home."
            />
            <div className="grid gap-5 md:grid-cols-3">
              {islamicValues.map((value, i) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className="rounded-2xl border border-slate-100 bg-[#EFF6FF] p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#1e3a8a] shadow-sm">
                    <value.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1e3a8a]">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="relative overflow-hidden bg-[#172554] px-4 py-16 md:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 56px)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Begin your learning journey
            </h2>
            <p className="mt-3 text-base text-blue-200/90">
              Explore Kids Zone — no sign-up required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={KIDS_ZONE_PATH}
                className="inline-flex items-center gap-2 rounded-full bg-sky-300 px-7 py-3 text-sm font-bold text-[#1e3a8a] transition hover:bg-sky-200"
              >
                <Sparkles className="h-4 w-4" />
                Open Kids Zone
              </Link>
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <MessageCircle className="h-4 w-4" />
                Join WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}
