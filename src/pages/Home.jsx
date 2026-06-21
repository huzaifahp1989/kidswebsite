import { createPageUrl } from "@/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Star, Sparkles, Heart, Shield, MessageCircle, ExternalLink, Moon, Mail, Users, BookOpen, Radio, ClipboardList, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// import WordPressFeed from "@/components/WordPressFeed";
import { useState, useEffect, useRef } from "react";
import React from "react";
import nasihahWorldBanner from "@/assets/brands/nasihah-world-banner.jpg";
import { isAndroidWebView, openExternalUrl } from "@/utils/androidWebView";
import { HIFZ_ASSISTANT_URL, SURVEY_FORM_URL } from "@/constants/externalLinks";
import { announcementsApi } from "@/api/firebase";
import AnnouncementImageSlider from "@/components/AnnouncementImageSlider";
import { getAnnouncementImages } from "@/utils/announcementImages";

const ADS_SECTION_URL = "https://traeadvert8pia.vercel.app/";
const COMMUNITY_POPUP_LAST_SHOWN_KEY = "home_community_popup_last_shown_v1";
const COMMUNITY_POPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function announcementPopupKey(id) {
  return `announcement_popup_${id}_last_shown`;
}

function canShowAnnouncementPopup(item) {
  try {
    const hours = Number(item.popupCooldownHours) || 24;
    const cooldownMs = hours * 60 * 60 * 1000;
    const raw = localStorage.getItem(announcementPopupKey(item.id));
    const last = raw ? Number(raw) : 0;
    if (!last) return true;
    return Date.now() - last >= cooldownMs;
  } catch {
    return true;
  }
}

function openAnnouncementLink(url) {
  if (!url) return;
  if (isAndroidWebView()) {
    openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">Something went wrong</div>
            <div className="text-sm text-gray-600">Please refresh the page</div>
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
      <div className="h-full w-full bg-black flex items-center justify-center gap-2 px-3">
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
      <div className="relative h-full w-full bg-[#1A234D] text-white flex flex-col items-center justify-center gap-0.5 px-2">
        <div className="text-[7px] italic tracking-wide text-white/70 text-center leading-none">Thinking of Selling or Letting?</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white font-serif font-semibold">
          <span className="text-[11px] text-[#8F143B]">E</span>
          <span className="text-[11px] text-white">P</span>
        </div>
        <div className="text-center text-[11px] font-serif leading-tight tracking-wide">Express Properties</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#5B85E5] text-white flex flex-col items-center justify-center px-2 text-center">
      <div className="text-[18px] font-black leading-none tracking-wide">THEORY</div>
      <div className="mt-0.5 text-[11px] font-black uppercase tracking-wide text-orange-300">Translated</div>
      <div className="mt-0.5 text-[7px] font-semibold tracking-wide text-white/90">Multilingual App</div>
    </div>
  );
}



const islamicValues = [
  {
    icon: Heart,
    title: "Love & Compassion",
    description: "Teaching kindness and mercy to all",
    color: "text-red-500"
  },
  {
    icon: Star,
    title: "Knowledge & Wisdom",
    description: "Seeking knowledge is obligatory",
    color: "text-yellow-500"
  },
  {
    icon: Shield,
    title: "Safety & Security",
    description: "A safe environment for children",
    color: "text-blue-500"
  }
];



export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCommunityPopup, setShowCommunityPopup] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [popupAnnouncement, setPopupAnnouncement] = useState(null);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
  const [lightboxAnnouncement, setLightboxAnnouncement] = useState(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const audioRef = useRef(null);
  const [gregorianDate, setGregorianDate] = useState("");
  const [islamicDate, setIslamicDate] = useState("");

  // Banner slides data
  const bannerSlides = [
    {
      id: 1,
      text: "Welcome to Islam Media Central",
      subtext: "Learn, Grow and Strengthen Iman",
      gradient: "from-blue-600 via-purple-600 to-pink-600"
    },
    {
      id: 2,
      text: "\"Whoever guides someone to goodness will have a reward like one who did it.\"",
      subtext: "Sahih Muslim",
      gradient: "from-green-600 via-teal-600 to-cyan-600"
    },
    {
      id: 3,
      text: "\"The best among you are those who learn the Qur'an and teach it.\"",
      subtext: "Sahih Bukhari",
      gradient: "from-amber-600 via-orange-600 to-red-600"
    },
    {
      id: 4,
      text: "\"Remember Allah much so that you may be successful.\"",
      subtext: "Qur'an 62:10",
      gradient: "from-purple-600 via-pink-600 to-rose-600"
    }
  ];

  // Auto-play banner slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load today's Gregorian and Islamic (Hijri) date (API-first for consistency on mobile)
  useEffect(() => {
    const d = new Date();
    try {
      setGregorianDate(d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    } catch {
      setGregorianDate(d.toDateString());
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`)
      .then(r => r.json())
      .then(j => {
        const h = j?.data?.hijri;
        if (h) {
          const monthMap = (m) => {
            const x = String(m || '').toLowerCase();
            if (x.includes('jumada') && x.includes('ii')) return 'Jumada al-Thani';
            if (x.includes('jumada') && (x.includes('i') || x.includes('awwal') || x.includes('ula'))) return 'Jumada al-Ula';
            if (x.includes('rabi') && x.includes('ii')) return 'Rabi al-Thani';
            if (x.includes('rabi') && (x.includes('i') || x.includes('awwal'))) return 'Rabi al-Awwal';
            if (x.includes('dhu') && (x.includes('qa') || x.includes('qadah') || x.includes("qa'dah"))) return 'Dhu al-Qadah';
            if (x.includes('dhu') && x.includes('hij')) return 'Dhu al-Hijjah';
            return m;
          };
          const monthName = monthMap(h.month?.en);
          setIslamicDate(`${monthName} ${h.day} ${h.year} AH`);
        } else {
          throw new Error('No hijri data');
        }
      })
      .catch(() => {
        try {
          const fmt = new Intl.DateTimeFormat('en-GB-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' });
          const parts = fmt.formatToParts(d);
          const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
          const monthMap = (m) => {
            const x = String(m || '').toLowerCase();
            if (x.includes('jumada') && x.includes('ii')) return 'Jumada al-Thani';
            if (x.includes('jumada') && (x.includes('i') || x.includes('awwal') || x.includes('ula'))) return 'Jumada al-Ula';
            if (x.includes('rabi') && x.includes('ii')) return 'Rabi al-Thani';
            if (x.includes('rabi') && (x.includes('i') || x.includes('awwal'))) return 'Rabi al-Awwal';
            if (x.includes('dhu') && (x.includes('qa') || x.includes('qadah') || x.includes("qa'dah"))) return 'Dhu al-Qadah';
            if (x.includes('dhu') && x.includes('hij')) return 'Dhu al-Hijjah';
            return m;
          };
          const monthName = monthMap(obj.month);
          setIslamicDate(`${monthName} ${obj.day} ${obj.year} AH`);
        } catch {
          setIslamicDate('');
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

  const homeAnnouncements = announcements.filter((item) => item.showOnHome);

  useEffect(() => {
    if (isAndroidWebView()) return;

    const candidates = announcements.filter((item) => item.showAsPopup);
    if (!candidates.length) return;

    const nextPopup = candidates.find((item) => canShowAnnouncementPopup(item));
    if (!nextPopup) return;

    const delayMs = Math.max(0, Number(nextPopup.popupDelaySeconds) || 3) * 1000;
    const timer = setTimeout(() => {
      setPopupAnnouncement(nextPopup);
      setShowAnnouncementPopup(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [announcements]);

  useEffect(() => {
    if (isAndroidWebView()) return;
    if (showAnnouncementPopup || popupAnnouncement) return;

    const shouldShow = () => {
      try {
        const raw = localStorage.getItem(COMMUNITY_POPUP_LAST_SHOWN_KEY);
        const last = raw ? Number(raw) : 0;
        if (!last) return true;
        return Date.now() - last >= COMMUNITY_POPUP_COOLDOWN_MS;
      } catch {
        return true;
      }
    };
    if (!shouldShow()) return;
    const timer = setTimeout(() => setShowCommunityPopup(true), 7000);
    return () => clearTimeout(timer);
  }, [showAnnouncementPopup, popupAnnouncement]);

  const closeAnnouncementPopup = () => {
    if (popupAnnouncement?.id) {
      try {
        localStorage.setItem(announcementPopupKey(popupAnnouncement.id), String(Date.now()));
      } catch {}
    }
    setShowAnnouncementPopup(false);
    setPopupAnnouncement(null);
  };

  const closeCommunityPopup = () => {
    setShowCommunityPopup(false);
    try {
      localStorage.setItem(COMMUNITY_POPUP_LAST_SHOWN_KEY, String(Date.now()));
    } catch {}
  };

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

  const surveyLinkProps = isAndroidWebView()
    ? {
        href: SURVEY_FORM_URL,
        onClick: (e) => {
          e.preventDefault();
          openExternalUrl(SURVEY_FORM_URL);
        },
      }
    : {
        href: SURVEY_FORM_URL,
        target: "_blank",
        rel: "noopener noreferrer",
      };

  return (
    <ErrorBoundary>
    <div className="min-h-screen" style={{background: '#EFF6FF'}}>
      {/* Survey tab link */}
      <section className="border-b border-blue-200 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-center text-white sm:text-left">
            <ClipboardList className="h-5 w-5 shrink-0 text-sky-200" />
            <p className="text-sm font-semibold md:text-base">
              Take part in survey that can help us
            </p>
          </div>

          <a
            {...surveyLinkProps}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white px-5 py-2 text-sm font-bold text-[#1e3a8a] shadow-md transition hover:bg-sky-50"
          >
            Open Survey
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Stay Connected Popup */}
      <Dialog open={showCommunityPopup} onOpenChange={(open) => !open && closeCommunityPopup()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-0 p-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] px-6 pt-6 pb-4 text-white text-center">
            <div className="text-2xl font-bold mb-1">Stay Connected</div>
            <p className="text-sm text-blue-100">Join our community and never miss an update</p>
          </div>
          <div className="bg-white px-6 py-5 space-y-3">
            <a
              href="https://chat.whatsapp.com/EYJ9EPbBJP15r7NEXzlkTy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeCommunityPopup}
              className="flex items-center gap-3 w-full rounded-xl bg-green-500 hover:bg-green-600 text-white px-4 py-3 font-semibold transition shadow-md"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">Join WhatsApp Group</div>
                <div className="text-xs text-green-100">Get latest updates instantly</div>
              </div>
            </a>
            <a
              href="https://mailchi.mp/3a9b946d45cb/imedia"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeCommunityPopup}
              className="flex items-center gap-3 w-full rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-4 py-3 font-semibold transition shadow-md"
            >
              <Mail className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">Subscribe to Newsletter</div>
                <div className="text-xs text-blue-200">Monthly Islamic content digest</div>
              </div>
            </a>
          </div>
          <div className="bg-gray-50 px-6 py-3 text-center border-t border-gray-100">
            <button onClick={closeCommunityPopup} className="text-xs text-gray-400 hover:text-gray-600 transition">Maybe later</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnnouncementPopup} onOpenChange={(open) => !open && closeAnnouncementPopup()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl rounded-2xl border-0 p-0 shadow-2xl overflow-hidden">
          {popupAnnouncement && getAnnouncementImages(popupAnnouncement).length > 0 && (
            <AnnouncementImageSlider
              images={getAnnouncementImages(popupAnnouncement)}
              title={popupAnnouncement.title || "Announcement"}
              variant="popup"
              onImageClick={(index) => openAnnouncementLightbox(popupAnnouncement, index)}
            />
          )}
          <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] px-6 py-4 text-white">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-sky-200" />
              <div className="text-xl font-bold">{popupAnnouncement?.title || "Announcement"}</div>
            </div>
            {getAnnouncementImages(popupAnnouncement).length > 1 && (
              <p className="mt-1 text-xs text-blue-100">Tap the image to view full size</p>
            )}
          </div>
          <div className="bg-white px-6 py-5">
            {popupAnnouncement?.text && (
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {popupAnnouncement.text}
              </p>
            )}
            {popupAnnouncement?.linkUrl && (
              <button
                type="button"
                onClick={() => {
                  openAnnouncementLink(popupAnnouncement.linkUrl);
                  closeAnnouncementPopup();
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                {popupAnnouncement.linkLabel || "Learn more"}
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="bg-gray-50 px-6 py-3 text-center border-t border-gray-100">
            <button
              type="button"
              onClick={closeAnnouncementPopup}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lightboxAnnouncement)} onOpenChange={(open) => !open && closeAnnouncementLightbox()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-5xl rounded-2xl border-0 bg-black p-0 shadow-2xl overflow-hidden">
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
                    ({lightboxImageIndex + 1} of {getAnnouncementImages(lightboxAnnouncement).length})
                  </span>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Floating WhatsApp Chat Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
      >
        <a
          href="https://chat.whatsapp.com/EYJ9EPbBJP15r7NEXzlkTy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full px-4 py-2.5 shadow-xl hover:shadow-2xl transition-all duration-300 text-sm font-semibold"
          aria-label="Join WhatsApp Group"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">Join Group</span>
        </a>
      </motion.div>

      {/* Radio Player Bar */}
      <div className="bg-[#1e3a8a] px-4 py-2.5 flex items-center justify-between gap-3">
        <audio ref={audioRef} src="https://a4.asurahosting.com:7820/radio.mp3" preload="none" />
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Radio className="h-4 w-4 text-sky-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">Islam Media Central</span>
              <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">LIVE</span>
            </div>
            <div className="text-[10px] text-sky-300 truncate">Islamic Radio Stream</div>
          </div>
        </div>
        <button
          onClick={() => {
            if (!audioRef.current) return;
            if (isRadioPlaying) {
              audioRef.current.pause();
              setIsRadioPlaying(false);
            } else {
              audioRef.current.play().catch(() => {});
              setIsRadioPlaying(true);
            }
          }}
          className="shrink-0 flex items-center gap-1.5 rounded-full bg-sky-400 hover:bg-sky-300 text-[#1e3a8a] px-4 py-1.5 text-xs font-extrabold transition"
          aria-label={isRadioPlaying ? "Pause radio" : "Play radio"}
        >
          {isRadioPlaying ? (
            <>
              <span className="h-2 w-2 rounded-full bg-[#1e3a8a] animate-pulse" />
              Pause
            </>
          ) : (
            <>
              <span className="border-l-[10px] border-y-[6px] border-y-transparent border-l-[#1e3a8a]" />
              Play
            </>
          )}
        </button>
      </div>

      {/* Sponsor Ticker Bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">Featured Sponsors</span>
          </div>
          <a
            href={ADS_SECTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
          >
            View All Ads <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="max-w-6xl mx-auto mt-3 relative overflow-hidden">
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
                <div className="w-[150px] h-[80px] rounded-xl overflow-hidden border border-gray-200">
                  <FeaturedSponsorLogo item={item} />
                </div>
              </a>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      {homeAnnouncements.length > 0 && (
        <section className="border-b border-amber-100 bg-amber-50 px-4 py-4">
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">
                Announcements
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {homeAnnouncements.map((item) => {
                const images = getAnnouncementImages(item);
                return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
                >
                  {images.length > 0 && (
                    <AnnouncementImageSlider
                      images={images}
                      title={item.title || "Announcement"}
                      variant="preview"
                      onImageClick={(index) => openAnnouncementLightbox(item, index)}
                    />
                  )}
                  <div className="p-4">
                    {item.title && (
                      <h3 className="text-lg font-bold text-[#1e3a8a]">{item.title}</h3>
                    )}
                    {item.text && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                        {item.text}
                      </p>
                    )}
                    {images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => openAnnouncementLightbox(item, 0)}
                        className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
                      >
                        View full image{images.length > 1 ? "s" : ""}
                      </button>
                    )}
                    {item.linkUrl && (
                      <button
                        type="button"
                        onClick={() => openAnnouncementLink(item.linkUrl)}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
                      >
                        {item.linkLabel || "Learn more"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              )})}
            </div>
          </div>
        </section>
      )}

      {/* â"€â"€ Hero Section â"€â"€ */}
      <section className="relative overflow-hidden bg-[#1e3a8a]">
        {/* Geometric overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{backgroundImage: 'repeating-linear-gradient(45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 60px), repeating-linear-gradient(-45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 60px)'}} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a] via-[#1e40af] to-[#172554]" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-sky-400/60 bg-sky-400/15 shadow-lg">
              <Moon className="h-10 w-10 text-sky-300" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Islam Media{" "}
              <span className="text-sky-300">Central</span>
            </h1>
            <p className="mt-3 text-lg text-blue-200 font-medium tracking-wide">Media With Purpose</p>
            <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-white/70">
              A trusted platform for Islamic education, interactive content and community - built for every age.
            </p>
            {/* Date pill */}
            <div className="mt-8 inline-flex flex-col items-center rounded-2xl border border-white/15 bg-white/8 px-6 py-4 backdrop-blur" style={{background: 'rgba(255,255,255,0.08)'}}>
              <span className="text-xs text-white/60 uppercase tracking-widest">Today</span>
              <span className="mt-1 text-sm font-medium text-white/80">{gregorianDate || 'Loading...'}</span>
              <span className="mt-0.5 text-xl font-bold text-sky-200">{islamicDate || 'Loading Hijri...'}</span>
            </div>
          </motion.div>
        </div>
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#EFF6FF]" style={{clipPath: 'ellipse(55% 100% at 50% 100%)'}} />
      </section>

      {/* ── Quran Hifz Assistant ── */}
      <section className="px-4 pt-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <motion.a
            href={HIFZ_ASSISTANT_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.25 }}
            className="group block"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 md:p-10 shadow-2xl">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" /> New Feature
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-white leading-tight">
                  Quran Hifz Assistant
                </h2>
                <p className="mt-3 max-w-2xl text-emerald-50 text-base md:text-lg leading-relaxed">
                  Learn the Quran with colour-coded tajweed rules, tap any ayah for translation and
                  rule guidance, and practise word-by-word recitation for memorisation.
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-emerald-50 md:grid-cols-3">
                  <li className="rounded-xl bg-white/10 px-3 py-2">Colour-coded tajweed</li>
                  <li className="rounded-xl bg-white/10 px-3 py-2">Ayah translation + rules</li>
                  <li className="rounded-xl bg-white/10 px-3 py-2">Word-by-word audio</li>
                </ul>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-emerald-700 shadow-lg group-hover:bg-emerald-50 transition-colors">
                  <BookOpen className="h-4 w-4" />
                  Open Hifz Assistant
                  <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </div>
          </motion.a>
        </div>
      </section>

      {/* â"€â"€ Kids Zone Featured Card â"€â"€ */}
      <section className="px-4 pt-14 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-700">
              <Star className="h-3.5 w-3.5" /> Featured
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-[#1e3a8a]">Kids Zone</h2>
            <p className="mt-2 text-gray-500">Our flagship interactive platform for young learners</p>
          </div>
          <motion.a
            href="https://islamic-kids-platform.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.25 }}
            className="group block"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-8 md:p-12 shadow-2xl">
              {/* Background shimmer */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex-1">
                  <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Explore Kids Zone</h3>
                  <p className="mt-3 max-w-lg text-white/90 text-base md:text-lg leading-relaxed">
                    Interactive Islamic games, stories, quizzes, Quran activities and creative challenges - designed just for children.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-orange-600 shadow-lg group-hover:bg-orange-50 transition-colors">
                    Open Kids Zone <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </motion.a>
        </div>
      </section>

      {/* â"€â"€ Community CTAs â"€â"€ */}
      <section className="px-4 py-10 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1e3a8a]">Join Our Community</h2>
            <p className="mt-2 text-gray-500">Stay connected - get updates, resources and reminders</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* WhatsApp Group */}
            <motion.a
              href="https://chat.whatsapp.com/EYJ9EPbBJP15r7NEXzlkTy"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group block"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-[#075e54] via-[#128c7e] to-[#25d366] p-7 md:p-8 shadow-xl">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-white">Join WhatsApp Group</h3>
                <p className="mt-2 text-green-100 text-sm md:text-base leading-relaxed">
                  Connect with our growing Muslim community. Get daily reminders, Islamic content and updates directly in your WhatsApp.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-green-700 shadow group-hover:bg-green-50 transition-colors">
                  Join Now <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </motion.a>

            {/* Newsletter */}
            <motion.a
              href="https://mailchi.mp/3a9b946d45cb/imedia"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="group block"
            >
              <div className="h-full rounded-3xl bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#3949ab] p-7 md:p-8 shadow-xl">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Mail className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-extrabold text-white">Newsletter Signup</h3>
                <p className="mt-2 text-indigo-200 text-sm md:text-base leading-relaxed">
                  Weekly Islamic content, platform updates, new features and curated resources delivered straight to your inbox.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow group-hover:bg-indigo-50 transition-colors">
                  Subscribe Free <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </motion.a>
          </div>
        </div>
      </section>

      {/* â"€â"€ Hadith / Quote Slider â"€â"€ */}
      <section className="bg-[#1e3a8a] px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-white/5 shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45 }}
                className="px-8 py-10 md:px-14 md:py-14 text-center"
              >
                
                <p className="text-lg md:text-2xl font-semibold text-white leading-relaxed">
                  {bannerSlides[currentSlide].text}
                </p>
                {bannerSlides[currentSlide].subtext && (
                  <p className="mt-4 text-sm md:text-base text-sky-300 font-medium">
                    {bannerSlides[currentSlide].subtext}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-center gap-2 pb-6">
              {bannerSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentSlide ? 'w-8 bg-sky-400' : 'w-2 bg-white/30'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* â"€â"€ Stats â"€â"€ */}
      <section className="px-4 py-12 md:py-16 bg-[#EFF6FF]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { value: '12+', label: 'Interactive Games' },
              { value: '7', label: 'Learning Modules' },
              { value: '100+', label: 'Active Learners' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="rounded-2xl border border-blue-100 bg-white p-5 md:p-8 text-center shadow-md"
              >
                <div className="text-3xl md:text-4xl font-extrabold text-[#1e3a8a]">{stat.value}</div>
                <div className="mt-1 text-xs md:text-sm text-gray-500 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â"€â"€ Core Values â"€â"€ */}
      <section className="px-4 py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1e3a8a]">Our Core Values</h2>
            <p className="mt-2 text-gray-500">Building strong Islamic character through engaging content</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {islamicValues.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 * i }}
                className="group rounded-2xl border border-gray-100 bg-[#EFF6FF] p-7 text-center shadow-md hover:shadow-xl transition-shadow duration-300 hover:border-emerald-200"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a8a]/10 to-[#1e3a8a]/5">
                  <value.icon className={`h-8 w-8 ${value.color}`} />
                </div>
                <h3 className="text-lg font-bold text-[#1e3a8a] mb-2">{value.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#1e3a8a] px-4 py-16 md:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{backgroundImage: 'repeating-linear-gradient(45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 60px), repeating-linear-gradient(-45deg, #C8960C 0px, #C8960C 1px, transparent 1px, transparent 60px)'}} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Begin Your Islamic Learning Journey
            </h2>
            <p className="mt-4 text-base md:text-lg text-blue-200">
              Explore our Kids Zone - no sign-up required
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://islamic-kids-platform.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-8 py-3.5 text-base font-extrabold text-[#1e3a8a] shadow-xl hover:bg-sky-300 transition-colors"
              >
                <Sparkles className="h-5 w-5" /> Open Kids Zone
              </a>
              <a
                href="https://chat.whatsapp.com/EYJ9EPbBJP15r7NEXzlkTy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3.5 text-base font-bold text-white hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="h-5 w-5" /> Join WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
    </ErrorBoundary>
  );
}



