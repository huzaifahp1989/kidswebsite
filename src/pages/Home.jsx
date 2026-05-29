
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Sparkles, Heart, Shield, MessageCircle, ExternalLink, Moon, Mail, Users, BookOpen, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// import WordPressFeed from "@/components/WordPressFeed";
import { useState, useEffect, useRef } from "react";
import { sponsorsApi } from "/src/api/firebase";
import React from "react";
import nasihahWorldBanner from "@/assets/brands/nasihah-world-banner.jpg";

const ADS_SECTION_URL = "https://traeadvert8pia.vercel.app/";
const SPONSOR_POPUP_LAST_SHOWN_KEY = "home_sponsor_popup_last_shown_v1";
const SPONSOR_POPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const COMMUNITY_POPUP_LAST_SHOWN_KEY = "home_community_popup_last_shown_v1";
const COMMUNITY_POPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
  const [sponsors, setSponsors] = useState([]);
  const [showSponsorPopup, setShowSponsorPopup] = useState(false);
  const [showCommunityPopup, setShowCommunityPopup] = useState(false);
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

  // Load sponsors/ads for home placement
  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const list = await sponsorsApi.list();
        const filtered = (list || []).filter(it => (it.active ?? true) && (it.placement || 'home') === 'home');
        filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setSponsors(filtered);
      } catch (e) {
        try {
          const raw = localStorage.getItem('homepage_sponsors');
          const list = raw ? JSON.parse(raw) : [];
          const filtered = (Array.isArray(list) ? list : []).filter(it => (it.active ?? true) && (it.placement || 'home') === 'home');
          filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setSponsors(filtered);
        } catch {
          setSponsors([]);
        }
      }
    };
    loadSponsors();
  }, []);

  useEffect(() => {
    const shouldShowPopup = () => {
      try {
        const raw = localStorage.getItem(SPONSOR_POPUP_LAST_SHOWN_KEY);
        const lastShown = raw ? Number(raw) : 0;
        if (!lastShown) return true;
        return Date.now() - lastShown >= SPONSOR_POPUP_COOLDOWN_MS;
      } catch {
        return true;
      }
    };

    if (!shouldShowPopup()) {
      return;
    }

    const timer = setTimeout(() => {
      setShowSponsorPopup(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const closeSponsorPopup = () => {
    setShowSponsorPopup(false);
    try {
      localStorage.setItem(SPONSOR_POPUP_LAST_SHOWN_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors and continue.
    }
  };

  useEffect(() => {
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
  }, []);

  const closeCommunityPopup = () => {
    setShowCommunityPopup(false);
    try {
      localStorage.setItem(COMMUNITY_POPUP_LAST_SHOWN_KEY, String(Date.now()));
    } catch {}
  };

 

  function SponsorTile({ item }) {
    const [imgError, setImgError] = React.useState(false);
    const hasImg = item.imageUrl && !imgError;
    return (
      <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 shadow hover:shadow-lg transition">
          {hasImg ? (
            <img
              src={item.imageUrl}
              alt={item.name || 'Sponsor'}
              className="w-full h-24 md:h-28 object-contain p-4"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="p-6 text-center text-gray-700 font-semibold">{item.name || 'Sponsor'}</div>
          )}
        </div>
      </a>
    );
  }

  function SponsorPopupTile({ item }) {
    const [imgError, setImgError] = React.useState(false);
    const hasImg = item.imageUrl && !imgError;
    return (
      <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm transition group-hover:shadow-md">
          {hasImg ? (
            <img
              src={item.imageUrl}
              alt={item.name || "Sponsor"}
              className="h-20 w-full object-contain p-3 sm:h-24"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-20 items-center justify-center px-3 text-center text-sm font-semibold text-gray-700 sm:h-24">
              {item.name || "Sponsor"}
            </div>
          )}
        </div>
      </a>
    );
  }


  return (
    <ErrorBoundary>
    <div className="min-h-screen" style={{background: '#EFF6FF'}}>
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

      <Dialog open={showSponsorPopup} onOpenChange={(open) => !open && closeSponsorPopup()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl rounded-2xl border-0 bg-gradient-to-b from-white to-slate-50 p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 sm:px-7">
            <DialogTitle className="text-xl font-bold text-slate-900 sm:text-2xl">Our Sponsors</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Supporting our kids learning journey. Tap any logo to visit the sponsor.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Featured Sponsors</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
                {mainFeaturedSponsors.map((item, index) => (
                  <a
                    key={`${item.name}-popup-${index}`}
                    href={ADS_SECTION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="h-[80px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <FeaturedSponsorLogo item={item} />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {sponsors.length > 0 && (
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Community Sponsors</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sponsors.slice(0, 9).map((item) => (
                    <SponsorPopupTile key={item.id || item.name} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <a
              href={ADS_SECTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Explore All Ads
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button type="button" variant="outline" onClick={closeSponsorPopup}>
              Close
            </Button>
          </div>
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

      {/* â"€â"€ Final CTA â"€â"€ */}
      {/* Instagram Feed Section */}
      <section className="bg-white px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Instagram</h2>
                <p className="text-sm text-gray-500">@imediac786</p>
              </div>
            </div>
            <a
              href="https://www.instagram.com/imediac786/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-5 py-2 text-sm font-bold text-white shadow hover:opacity-90 transition"
            >
              Follow Us
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <behold-widget feed-id="uhHqbVSTssPsus4pLLre" />

          <div className="mt-6 text-center">
            <a
              href="https://www.instagram.com/imediac786/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-pink-500 hover:text-pink-600 transition"
            >
              View all posts on Instagram <ExternalLink className="h-3.5 w-3.5" />
            </a>
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



