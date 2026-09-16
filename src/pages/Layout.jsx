

import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HIFZ_ASSISTANT_URL } from "@/constants/externalLinks";
import { Home, Gamepad2, BookOpen, Music, GraduationCap, Users, Info, Book, Trophy, ChevronDown, Menu, X, LogOut, User, LogIn, UserPlus, Settings, Play, Pause, Volume2, VolumeX, Radio, Mail, Star, Sparkles, BarChart2, Layers, Shield, Bell, Target, MessageCircle, BellRing, CheckCheck, Clock, ExternalLink, ArrowRight, Flame } from "lucide-react";
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  NOTICES_STORAGE_KEY,
  NOTICE_PRIORITY,
  PRIORITY_META,
  countUnreadNotices,
  isNoticeNew,
  listNotices,
  markNoticeReadById,
  setLastReadNow,
} from "@/utils/noticeStore";
import PropTypes from 'prop-types';
import { watchAuth, getUserProfile, getFirebase } from "@/api/firebase";
import { trackRadioListeningAndMaybeReview } from "@/utils/inAppReview";
import GlobalNoticeBell from "@/components/GlobalNoticeBell.jsx";
// Base44 auth removed from public UI; email-only access in place

// Create Radio Context
const RadioContext = createContext();

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    return {
      isPlaying: false,
      isMuted: false,
      volume: 0.7,
      togglePlay: () => {},
      toggleMute: () => {},
      setVolume: () => {}
    };
  }
  return context;
};

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Radio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef(null);

  // Site settings (localStorage-driven)
  const DEFAULT_SITE_SETTINGS = {
    siteTitle: "Islam Media Central",
    tagline: "Media With Purpose",
    logoEmoji: "🌙",
    headerGradient: "from-blue-600 to-purple-600",
    navActiveGradient: "from-blue-500 to-purple-500",
    backgroundGradient: "from-blue-50 via-purple-50 to-pink-50",
    darkModeDefault: false,
    showRadioBar: false,
    showMobileSidebar: false,
    radioUrl:
      import.meta.env.VITE_RADIO_URL ||
      "https://a4.asurahosting.com:7820/radio.mp3",
  };
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("siteSettings");
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = { ...parsed };

        // Migrate legacy branding values from older deployments.
        if (migrated.siteTitle === "Islam Kids Zone") {
          migrated.siteTitle = "Islam Media Central";
        }
        if (migrated.tagline === "Learn, Play & Grow") {
          migrated.tagline = "Media With Purpose";
        }

        // Seed missing fields (e.g. radioUrl) with defaults.
        for (const [k, v] of Object.entries(DEFAULT_SITE_SETTINGS)) {
          if (
            migrated[k] === undefined ||
            migrated[k] === null ||
            migrated[k] === ""
          ) {
            migrated[k] = v;
          }
        }

        setSiteSettings((prev) => ({ ...prev, ...migrated, showMobileSidebar: false }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const standalone = (typeof window !== 'undefined' && (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)) || (typeof navigator !== 'undefined' && navigator.standalone === true);
      setIsStandalone(!!standalone);
    } catch {}
  }, []);

  // Realtime subscription removed; points shown in dedicated pages/components

  useEffect(() => {
    if (siteSettings.darkModeDefault) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [siteSettings.darkModeDefault]);

  const bgClass = `min-h-screen bg-gradient-to-br ${siteSettings.backgroundGradient}`;
  const headerClass = `bg-gradient-to-r ${siteSettings.headerGradient} text-white shadow-lg sticky top-0 z-50`;
  const supportEmail = siteSettings.supportEmail || "imedia786@gmail.com";
  const radioSrc =
    siteSettings.radioUrl ||
    DEFAULT_SITE_SETTINGS.radioUrl ||
    "https://a4.asurahosting.com:7820/radio.mp3";

  // ===== Notifications / Bell =====
  const [noticesDrawerOpen, setNoticesDrawerOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [noticeTick, setNoticeTick] = useState(0);

  const refreshNotices = () => {
    try {
      setNotices(listNotices({ includeInactive: false }));
    } catch {
      setNotices([]);
    }
    try {
      setUnreadCount(countUnreadNotices());
    } catch {
      setUnreadCount(0);
    }
  };

  // Initial load + interval for cross-tab/admin writes.
  useEffect(() => {
    const run = () => {
      refreshNotices();
      setNoticeTick((t) => (t + 1) % 1000000);
    };
    run();
    const every = window.setInterval(run, 10000);
    const onChanged = () => run();
    const onRead = () => run();
    try {
      window.addEventListener("notices:changed", onChanged);
      window.addEventListener("notices:read-marker", onRead);
      window.addEventListener("storage", (e) => {
        if (!e || !e.key) return;
        if (
          e.key === NOTICES_STORAGE_KEY ||
          e.key === "notice_read_ids_v1" ||
          e.key.startsWith("notices_")
        ) {
          run();
        }
      });
    } catch {}
    return () => {
      window.clearInterval(every);
      try {
        window.removeEventListener("notices:changed", onChanged);
        window.removeEventListener("notices:read-marker", onRead);
      } catch {}
    };
  }, []);

  const openNotices = () => {
    setNoticesDrawerOpen(true);
  };
  const closeNoticesDrawer = () => {
    setNoticesDrawerOpen(false);
    try {
      setLastReadNow();
    } catch {}
    refreshNotices();
  };
  const markAllRead = () => {
    try {
      setLastReadNow();
    } catch {}
    refreshNotices();
  };

  const highestPriority = (() => {
    const list = notices;
    if (list.some((n) => n.priority === NOTICE_PRIORITY.urgent && isNoticeNew(n)))
      return NOTICE_PRIORITY.urgent;
    if (list.some((n) => n.priority === NOTICE_PRIORITY.highlight && isNoticeNew(n)))
      return NOTICE_PRIORITY.highlight;
    if (unreadCount > 0) return NOTICE_PRIORITY.normal;
    return null;
  })();

  // ===== Floating Radio FAB: free-drag with viewport bounds + persist to localStorage =====
  const FAB_POS_KEY = "fab_radio_pos_v1";
  const FAB_SIZE_PX = typeof window !== "undefined" && window.innerWidth < 640 ? 48 : 52;
  const FAB_MARGIN_PX = 8;
  const readInitialFabPos = () => {
    if (typeof window === "undefined") return { x: null, y: null };
    try {
      const saved = JSON.parse(localStorage.getItem(FAB_POS_KEY) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        return saved;
      }
    } catch {}
    return { x: null, y: null };
  };
  const [fabPos, setFabPos] = useState(readInitialFabPos);
  const draggingRef = useRef({
    active: false,
    pointerId: null,
    moved: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const clampFab = (x, y) => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    const safeTop = typeof window !== "undefined"
      ? (window.innerWidth < 640 ? 92 : 76)
      : 80;
    const safeBottom = 28;
    return {
      x: Math.max(FAB_MARGIN_PX, Math.min(vw - FAB_SIZE_PX - FAB_MARGIN_PX, x)),
      y: Math.max(safeTop, Math.min(vh - FAB_SIZE_PX - safeBottom, y)),
    };
  };

  const handleFabPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    const rect = target.getBoundingClientRect();
    const startX = typeof e.clientX === "number" ? e.clientX : (e.touches?.[0]?.clientX || 0);
    const startY = typeof e.clientY === "number" ? e.clientY : (e.touches?.[0]?.clientY || 0);
    let origX = rect.left;
    let origY = rect.top;
    if (fabPos.x !== null && fabPos.y !== null) {
      origX = fabPos.x;
      origY = fabPos.y;
    }
    draggingRef.current = {
      active: true,
      pointerId: e.pointerId ?? null,
      moved: false,
      startX,
      startY,
      origX,
      origY,
    };
  };

  const handleFabPointerMove = (e) => {
    const d = draggingRef.current;
    if (!d.active) return;
    const cx = typeof e.clientX === "number" ? e.clientX : (e.touches?.[0]?.clientX ?? d.startX);
    const cy = typeof e.clientY === "number" ? e.clientY : (e.touches?.[0]?.clientY ?? d.startY);
    const dx = cx - d.startX;
    const dy = cy - d.startY;
    if (!d.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      d.moved = true;
    }
    if (d.moved) {
      const next = clampFab(d.origX + dx, d.origY + dy);
      setFabPos(next);
    }
  };

  const endFabDrag = (e) => {
    const d = draggingRef.current;
    if (!d.active) return;
    try { if (e?.currentTarget && e.pointerId != null) e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const moved = d.moved;
    draggingRef.current = { active: false, pointerId: null, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 };
    if (moved && fabPos.x !== null && fabPos.y !== null) {
      try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPos)); } catch {}
    }
  };

  const handleFabClick = (e) => {
    // Suppress play/pause toggle when the pointer just finished a drag
    if (draggingRef.current.moved || (e?.detail === 0 && !e)) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }
    togglePlay();
  };

  useEffect(() => {
    // Define public pages that do NOT require authentication
    const publicPages = [
      "Home", "About", "ContactUs", "Welcome", "ParentZone", "PrivacyPolicy", "Games", "Leaderboard", "Stories", "Learn", "Quran", "Duas", "RecordAndShare", "IslamicEncyclopedia", "IslamicFacts", "ColoringPages", "PoetryWriting", "Worksheets", "MonthlyContest", "CreativeCorner", "Videos", "History", "Hadith", "Tajweed", "LearningLibrary"
    ];
    console.log("currentPageName:", currentPageName);
    console.log("publicPages:", publicPages);
    // Email-only flow: skip external auth checks entirely
  }, [currentPageName]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Watch Firebase auth and load profile for username indicator
  useEffect(() => {
    const unsub = watchAuth(async (u) => {
      try {
        if (u) {
          setIsAuthenticated(true);
          const fullName = u.email || "User";
          let points = 0;
          try {
            const p = await getUserProfile(u.uid);
            points = Number((p?.total_points != null ? p.total_points : p?.points) || 0);
          } catch {}
          setUser({ full_name: fullName, points, email: u.email, uid: u.uid });
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (e) {
        console.warn('Auth/profile load failed:', e?.message || e);
        setIsAuthenticated(!!u);
        setUser(u ? { full_name: u.email || 'User', points: 0, email: u.email, uid: u.uid } : null);
      }
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const handler = async () => {
      try {
        if (user?.uid) {
          const p = await getUserProfile(user.uid);
          const nextPoints = Number((p?.total_points != null ? p.total_points : p?.points) || 0);
          setUser(prev => prev ? { ...prev, points: nextPoints } : prev);
        }
      } catch {}
    };
    window.addEventListener('ikz_points_awarded', handler);
    const directHandler = (e) => {
      try { const pts = Number(e?.detail?.points || NaN); if (!Number.isNaN(pts)) setUser(prev => prev ? { ...prev, points: pts } : prev); } catch {}
    };
    window.addEventListener('ikz_points_total', directHandler);
    return () => { try { window.removeEventListener('ikz_points_awarded', handler); } catch {}; try { window.removeEventListener('ikz_points_total', directHandler); } catch {} };
  }, [user?.uid]);

  const handleLogout = () => {
    try { const { auth } = getFirebase(); auth?.signOut?.(); } catch { void 0; }
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleLogin = () => {
    // Login functionality removed
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error("Error playing radio:", error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Only continuous active playback counts toward the ten-minute radio trigger.
  useEffect(() => {
    if (!isPlaying) return undefined;
    return trackRadioListeningAndMaybeReview();
  }, [isPlaying]);

  // Keep `isPlaying` in sync with the actual <audio> element and auto-recover
  // from live-stream drops instead of silently freezing on a stale "playing" state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    let retryTimeout = null;

    const handlePlay = () => setIsPlaying(true);
    const handlePauseOrEnd = () => setIsPlaying(false);
    const handleStallOrError = () => {
      clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => {
        if (!audioRef.current) return;
        // Reconnect to the live stream if we were expected to be playing.
        audioRef.current.load();
        audioRef.current.play().catch(() => setIsPlaying(false));
      }, 1500);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("playing", handlePlay);
    audio.addEventListener("pause", handlePauseOrEnd);
    audio.addEventListener("ended", handlePauseOrEnd);
    audio.addEventListener("error", handleStallOrError);
    audio.addEventListener("stalled", handleStallOrError);

    return () => {
      clearTimeout(retryTimeout);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("playing", handlePlay);
      audio.removeEventListener("pause", handlePauseOrEnd);
      audio.removeEventListener("ended", handlePauseOrEnd);
      audio.removeEventListener("error", handleStallOrError);
      audio.removeEventListener("stalled", handleStallOrError);
    };
  }, [radioSrc]);

  // Resume the stream automatically if the tab regains focus mid-stall while
  // it was supposed to be playing (mobile browsers often suspend background audio).
  useEffect(() => {
    if (!isPlaying) return undefined;
    const resumeIfStuck = () => {
      const audio = audioRef.current;
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", resumeIfStuck);
    return () => document.removeEventListener("visibilitychange", resumeIfStuck);
  }, [isPlaying]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const baseNavItems = [
    { name: "Kids Home", icon: Home, path: "Home" },
    { name: "Kids Zone", icon: Star, path: "KidsZone" },
    { name: "WhatsApp Channel", icon: MessageCircle, path: "WhatsAppChannel" },
    { name: "Kids Recording Studio", icon: Radio, path: "KidsRecordingStudio" },
    {
      name: "Learn",
      icon: GraduationCap,
      dropdown: [
        { name: "Hadith", path: "Hadith", icon: BookOpen },
        { name: "History", path: "History", icon: Book },
        { name: "Tajweed", path: "Tajweed", icon: GraduationCap },
        { name: "99 Names of Allah", path: "LearningLibrary", icon: Star },
      ]
    },
    {
      name: "Quran",
      icon: BookOpen,
      dropdown: [
        { name: "Quran Hifz Assistant", external: true, url: HIFZ_ASSISTANT_URL, icon: Sparkles },
        { name: "Learn Quran", path: "Quran", icon: BookOpen },
        { name: "Full Quran", path: "FullQuran", icon: Book },
        { name: "Quran Dictionary", path: "QuranDictionary", icon: BookOpen },
        { name: "Hifz Dashboard", path: "HifzDashboard", icon: BarChart2 },
      ]
    },
    { name: "Parents", icon: Users, path: "ParentZone" },
    { name: "About", icon: Info, path: "About" },
  ];

  const navItems = baseNavItems;

  // Add Privacy Policy link to navigation for mobile quick nav
  const navItemsWithPrivacy = [
    ...navItems,
    { name: "Privacy Policy", icon: Shield, external: true, url: "https://studio--studio-653801381-47983.us-central1.hosted.app/privacy" }
  ];
  // On mobile, the top quick icon bar should not show parent items with dropdowns
  // (e.g., Quran, Learn) because they have no direct path and taps do nothing.
  // Keep these accessible via the side menu (drawer) only.
  

  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const toggleDropdown = (itemName) => {
    setOpenDropdown(openDropdown === itemName ? null : itemName);
  };

  const [menuQuery, setMenuQuery] = useState("");
  const normalizedQuery = menuQuery.trim().toLowerCase();
  const kidsNames = ["Kids Home", "Kids Zone"];
  const quranItem = navItemsWithPrivacy.find((i) => i.name === "Quran");
  const learnItem = navItemsWithPrivacy.find((i) => i.name === "Learn");
  const allItems = navItemsWithPrivacy.filter((i) => !i.dropdown && i.name !== "Quran" && i.name !== "Learn");
  const kidsLinks = allItems.filter((i) => kidsNames.includes(i.name));
  const moreLinks = allItems.filter((i) => !kidsNames.includes(i.name));

  const groups = [
    { title: "Kids", entries: kidsLinks },
    { title: "Quran", entries: quranItem?.dropdown || [] },
    { title: "Learn", entries: learnItem?.dropdown || [] },
    { title: "More", entries: moreLinks },
  ];
  const flatEntries = [
    ...kidsLinks,
    ...((quranItem?.dropdown || []).map((e) => ({ ...e, _isSub: true }))),
    ...((learnItem?.dropdown || []).map((e) => ({ ...e, _isSub: true }))),
    ...moreLinks,
  ];

  const radioContextValue = {
    isPlaying,
    isMuted,
    volume,
    togglePlay,
    toggleMute,
    setVolume: handleVolumeChange
  };

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

  return (
    <RadioContext.Provider value={radioContextValue}>
      <div className={bgClass}>
        {/* Hidden Audio Element — always attach whenever a stream URL exists */}
        {radioSrc ? (
          <audio
            ref={audioRef}
            src={radioSrc}
            preload="none"
          />
        ) : null}

        {/* Header */}
        <header className={headerClass}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 safe-pt">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl("Home")} className="flex items-center gap-2 md:gap-3 hover:opacity-90 transition-opacity">
                <div className="text-3xl md:text-4xl">{siteSettings.logoEmoji}</div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">{siteSettings.siteTitle}</h1>
                  <p className="text-xs md:text-sm text-blue-100">{siteSettings.tagline}</p>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2">
                {radioSrc && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause live radio" : "Listen live radio"}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                      isPlaying
                        ? "bg-red-500/90 border-red-300 text-white shadow-lg"
                        : "bg-white/15 border-white/30 text-white hover:bg-white/25"
                    }`}
                  >
                    {isPlaying ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                      </span>
                    ) : (
                      <Radio className="w-4 h-4" />
                    )}
                    {isPlaying ? "Live" : "Listen Live"}
                  </button>
                )}
                {!isAuthenticated ? (
                  <>
                    <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10">
                      <Home className="w-4 h-4" />
                      Home
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10">
                      <Home className="w-4 h-4" />
                      Home
                    </Link>
                    <Badge className="bg-white/30 text-white border-white/40">
                      {Number(user?.points || 0)} pts
                    </Badge>
                    <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={openNotices}
                  aria-label="Open announcements"
                  className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg transition-all hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {highestPriority === NOTICE_PRIORITY.urgent ? (
                    <>
                      <span className="absolute inset-0 rounded-lg bg-rose-500/25 animate-ping" />
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                    </>
                  ) : highestPriority === NOTICE_PRIORITY.highlight ? (
                    <>
                      <span className="absolute inset-0 rounded-lg bg-amber-400/25" />
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                    </>
                  ) : unreadCount > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white" />
                  ) : null}
                  {highestPriority === NOTICE_PRIORITY.urgent ? (
                    <BellRing className="w-5 h-5 text-rose-100 drop-shadow relative z-10" />
                  ) : highestPriority === NOTICE_PRIORITY.highlight ? (
                    <BellRing className="w-5 h-5 text-amber-100 drop-shadow relative z-10" />
                  ) : unreadCount > 0 ? (
                    <Bell className="w-5 h-5 text-white drop-shadow relative z-10" />
                  ) : (
                    <Bell className="w-5 h-5 text-white/80 drop-shadow relative z-10" />
                  )}
                  {unreadCount > 0 ? (
                    <span className="pointer-events-none absolute left-8 top-0 -translate-y-1 rounded-full bg-white text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center ring-1 ring-indigo-200">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                <GlobalNoticeBell />
              </div>

              {/* Mobile auth is shown inside the drawer above menu; header kept minimal */}

              {/* Mobile Menu Button */}
              {!siteSettings.showMobileSidebar && (
                <>
                  <div className="md:hidden flex items-center gap-1">
                    {radioSrc && (
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pause live radio" : "Listen live radio"}
                        className={`relative inline-flex items-center justify-center h-10 w-10 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                          isPlaying ? "bg-red-500/90" : "hover:bg-white/15"
                        }`}
                      >
                        {isPlaying && (
                          <span className="absolute inset-0 rounded-lg bg-red-400/30 animate-ping" />
                        )}
                        <Radio className={`w-5 h-5 relative z-10 ${isPlaying ? "text-white" : "text-white/90"}`} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={openNotices}
                      aria-label="Open announcements"
                      className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg transition-all hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      {highestPriority === NOTICE_PRIORITY.urgent ? (
                        <>
                          <span className="absolute inset-0 rounded-lg bg-rose-500/25 animate-ping" />
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                        </>
                      ) : highestPriority === NOTICE_PRIORITY.highlight ? (
                        <>
                          <span className="absolute inset-0 rounded-lg bg-amber-400/25" />
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                        </>
                      ) : unreadCount > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white" />
                      ) : null}
                      {highestPriority === NOTICE_PRIORITY.urgent ? (
                        <BellRing className="w-5 h-5 text-rose-100 drop-shadow relative z-10" />
                      ) : highestPriority === NOTICE_PRIORITY.highlight ? (
                        <BellRing className="w-5 h-5 text-amber-100 drop-shadow relative z-10" />
                      ) : unreadCount > 0 ? (
                        <Bell className="w-5 h-5 text-white drop-shadow relative z-10" />
                      ) : (
                        <Bell className="w-5 h-5 text-white/80 drop-shadow relative z-10" />
                      )}
                      {unreadCount > 0 ? (
                        <span className="pointer-events-none absolute left-7 top-0 -translate-y-1 rounded-full bg-white text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center ring-1 ring-indigo-200">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </button>
                    <GlobalNoticeBell compact />
                    <Link to={createPageUrl("Home")} className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10">
                      <Home className="w-4 h-4" />
                      Home
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden text-white hover:bg-white/20"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                      {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Home pill (quick return to Home) */}


        {/* Desktop Navigation */}
        <nav className="hidden md:block bg-white shadow-md sticky top-[calc(env(safe-area-inset-top)+100px)] z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide gap-1 py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path && currentPageName === item.path;
                
                if (item.dropdown && item.dropdown.length > 0) {
                  const isDropdownActive = item.dropdown.some(subItem => currentPageName === subItem.path);
                  
                  return (
                    <DropdownMenu key={item.name}>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${
                            isDropdownActive
                              ? `bg-gradient-to-r ${siteSettings.navActiveGradient} text-white shadow-md`
                              : "text-gray-700 hover:bg-gray-100"
                          }`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.name}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {item.dropdown.map((subItem) => {
                          const SubIcon = subItem.icon;
                          if (subItem.url) {
                            return (
                              <DropdownMenuItem key={`ext-${subItem.name}`} asChild>
                                <a
                                  href={subItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                  {SubIcon ? <SubIcon className="w-4 h-4" /> : null}
                                  <span>{subItem.name}</span>
                                </a>
                              </DropdownMenuItem>
                            );
                          }
                          return (
                            <DropdownMenuItem key={subItem.path} asChild>
                              <Link to={createPageUrl(subItem.path)} className="cursor-pointer flex items-center gap-2">
                                {SubIcon ? <SubIcon className="w-4 h-4" /> : null}
                                <span>{subItem.name}</span>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }
                
                if (item.external && item.url) {
                  const highlightClass = item._highlight
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow hover:from-amber-300 hover:to-amber-400 animate-pulse"
                    : "text-gray-700 hover:bg-gray-100";
                  return (
                    <a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${highlightClass}`}
                    >
                      <Icon className={`w-4 h-4 ${item._highlight ? "" : ""}`} />
                      <span className="text-sm font-bold">{item.name}</span>
                    </a>
                  );
                }
                
                return (
                  <Link
                    key={item.path}
                    to={createPageUrl(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${
                      isActive
                        ? `bg-gradient-to-r ${siteSettings.navActiveGradient} text-white shadow-md`
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && !siteSettings.showMobileSidebar && (
          <div className="fixed inset-0 z-[1000] md:hidden">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            <div className="absolute top-0 right-0 h-full w-[85vw] max-w-[360px] bg-white shadow-2xl overflow-y-auto z-[1001]">
              <div className="p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {isAuthenticated && user ? (
                  <div className="mb-4 p-3 border rounded-lg bg-gray-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{user.full_name || "User"}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700">{Number(user.points || 0)} pts</Badge>
                        <a href={createPageUrl("MyRewards")} className="text-blue-700">Rewards</a>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mb-3">
                  <Input
                    value={menuQuery}
                    onChange={(e) => setMenuQuery(e.target.value)}
                    placeholder="Search menu"
                  />
                </div>

                <nav className="flex flex-col gap-2 py-4">
                  {normalizedQuery ? (
                    flatEntries
                      .filter((it) => it.name?.toLowerCase().includes(normalizedQuery))
                      .map((item) => {
                        const Icon = item.icon;
                        const isHi = item._highlight;
                        if (item.url) {
                          return (
                            <a
                              key={`ext-${item.name}`}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-all duration-150 shadow ${
                                isHi
                                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400 animate-pulse"
                                  : "text-gray-800 bg-white hover:bg-blue-100"
                              }`}
                            >
                              {Icon ? <Icon className={`w-5 h-5 ${isHi ? "text-amber-900" : "text-blue-600"}`} /> : null}
                              {item.name}
                            </a>
                          );
                        }
                        return (
                          <Link
                            key={`link-${item.name}`}
                            to={createPageUrl(item.path)}
                            onClick={handleMobileLinkClick}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow transition-all duration-150"
                          >
                            {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
                            {item.name}
                          </Link>
                        );
                      })
                  ) : (
                    groups.map((group) => (
                      <div key={group.title} className="flex flex-col gap-2">
                        <div className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.title}</div>
                        {group.entries.map((item) => {
                          const isHi = item._highlight;
                          if (item.url) {
                            const Icon = item.icon;
                            return (
                              <a
                                key={`ext-${group.title}-${item.name}`}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-all duration-150 shadow ${
                                  isHi
                                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400 animate-pulse"
                                    : "text-gray-800 bg-white hover:bg-blue-100"
                                }`}
                              >
                                {Icon ? <Icon className={`w-5 h-5 ${isHi ? "text-amber-900" : "text-blue-600"}`} /> : null}
                                {item.name}
                              </a>
                            );
                          }
                          const Icon = item.icon;
                          return (
                            <Link
                              key={`link-${group.title}-${item.name}`}
                              to={createPageUrl(item.path)}
                              onClick={handleMobileLinkClick}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow transition-all duration-150"
                            >
                              {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    ))
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}

        {siteSettings.showMobileSidebar && (
          <div className="md:hidden fixed top-[56px] bottom-0 left-0 w-72 bg-white shadow-2xl z-40 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              {isAuthenticated && user ? (
                <div className="mb-4 p-3 border rounded-lg bg-gray-50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{user.full_name || "User"}</div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">{Number(user.points || 0)} pts</Badge>
                      <a href={createPageUrl("MyRewards")} className="text-blue-700">Rewards</a>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mb-3">
                <Input value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)} placeholder="Search menu" />
              </div>
              <nav className="flex flex-col gap-2 py-2">
                {normalizedQuery ? (
                  flatEntries
                    .filter((it) => it.name?.toLowerCase().includes(normalizedQuery))
                    .map((item) => {
                      const Icon = item.icon;
                      const isHi = item._highlight;
                      if (item.url) {
                        return (
                          <a
                            key={`ext-app-${item.name}`}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium shadow ${
                              isHi
                                ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400 animate-pulse"
                                : "text-gray-800 bg-white hover:bg-blue-100"
                            }`}
                          >
                            {Icon ? <Icon className={`w-5 h-5 ${isHi ? "text-amber-900" : "text-blue-600"}`} /> : null}
                            {item.name}
                          </a>
                        );
                      }
                      return (
                        <Link key={`link-app-${item.name}`} to={createPageUrl(item.path)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow">
                          {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
                          {item.name}
                        </Link>
                      );
                    })
                ) : (
                  groups.map((group) => (
                    <div key={`app-${group.title}`} className="flex flex-col gap-2">
                      <div className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{group.title}</div>
                      {group.entries.map((item) => {
                        const isHi = item._highlight;
                        if (item.url) {
                          const Icon = item.icon;
                          return (
                            <a
                              key={`app-ext-${group.title}-${item.name}`}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium shadow ${
                                isHi
                                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400 animate-pulse"
                                  : "text-gray-800 bg-white hover:bg-blue-100"
                              }`}
                            >
                              {Icon ? <Icon className={`w-5 h-5 ${isHi ? "text-amber-900" : "text-blue-600"}`} /> : null}
                              {item.name}
                            </a>
                          );
                        }
                        const Icon = item.icon;
                        return (
                          <Link key={`app-link-${group.title}-${item.name}`} to={createPageUrl(item.path)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow">
                            {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  ))
                )}
              </nav>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 safe-pb" style={{ paddingBottom: isPlaying ? '100px' : '24px', marginLeft: siteSettings.showMobileSidebar ? '18rem' : undefined }}>
          {siteSettings.maintenanceMode && (
            <div className="mb-4">
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 shadow-md">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm text-gray-800">
                    <strong className="text-yellow-700">Maintenance Mode:</strong> Some features may be temporarily unavailable.
                    For support, email <span className="font-medium">{supportEmail}</span>
                    {siteSettings.supportWhatsappNumber && (
                      <> or WhatsApp <span className="font-medium">{siteSettings.supportWhatsappNumber}</span></>
                    )}.
                  </div>
                </div>
              </div>
            </div>
          )}
          <ErrorBoundary>{children}</ErrorBoundary>
          
          
        </main>

        {/* Persistent Radio Player Bar */}
        {siteSettings.showRadioBar && isPlaying && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-2xl z-50 border-t-4 border-purple-400"
          >
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Now Playing Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Radio className="w-6 h-6 text-white flex-shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">Islamic Radio 24/7</p>
                    <p className="text-xs text-purple-200 truncate">Live Islamic Content</p>
                  </div>
                </div>
                {/* Controls */}
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Volume Control - Hidden on small screens */}
                  <div className="hidden sm:flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full backdrop-blur-sm">
                    <Button
                      onClick={toggleMute}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20 p-1 h-8 w-8"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  {/* Play/Pause Button */}
                  <Button
                    onClick={togglePlay}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 rounded-full w-10 h-10 p-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </Button>
                  {/* Mute button for mobile */}
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="ghost"
                    className="sm:hidden text-white hover:bg-white/20 p-2 h-10 w-10"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Floating Radio — Islam Media Central (freely draggable, viewport-bounded, click=toggle play/pause, drag=reposition, remembers position) */}
        {radioSrc && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 22 }}
            className="fixed z-[60] touch-none select-none"
            style={(() => {
              // Use explicit top/left so framer-motion's `animate` transform never
              // overrides our position, and the fixed element is always anchored
              // to the viewport instead of inheriting the in-flow position.
              if (typeof window === "undefined") {
                return { top: "80px", right: "8px" };
              }
              const isMobile = window.innerWidth < 640;
              const sizePx = isMobile ? 48 : 52;
              const marginPx = isMobile ? 8 : 12;
              const safeTopPx = isMobile ? 92 : 76;
              let x, y;
              if (fabPos.x !== null && fabPos.y !== null) {
                x = fabPos.x;
                y = fabPos.y;
              } else {
                x = Math.max(0, window.innerWidth - sizePx - marginPx);
                y = safeTopPx;
              }
              return {
                top: `${y}px`,
                left: `${x}px`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
              };
            })()}
          >
            <div className="group relative">
              <button
                type="button"
                onClick={handleFabClick}
                onPointerDown={handleFabPointerDown}
                onPointerMove={handleFabPointerMove}
                onPointerUp={endFabDrag}
                onPointerCancel={endFabDrag}
                onPointerLeave={endFabDrag}
                aria-label={isPlaying ? "Pause live radio" : "Play Islam Media Central live radio"}
                title="Islam Media Central — Live Radio (drag to move)"
                className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center
                           rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white
                           shadow-[0_10px_25px_-8px_rgba(16,185,129,0.55)] ring-1 ring-white/60
                           hover:scale-105 active:scale-95
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300
                           max-sm:h-12 max-sm:w-12"
                style={{
                  cursor: draggingRef.current.active ? "grabbing" : "grab",
                  touchAction: "none",
                  transition: draggingRef.current.active
                    ? "box-shadow 120ms ease-out, background 120ms ease-out"
                    : "transform 160ms ease-out, box-shadow 120ms ease-out, background 120ms ease-out",
                }}
              >
                {/* Subtle drag-handle hint ring (non-interactive) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/25"
                />
                {/* Pulsing halo when live/playing */}
                {isPlaying && (
                  <>
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                    <span className="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-emerald-300/60 animate-pulse" />
                  </>
                )}
                {isPlaying ? (
                  <Pause className="relative z-10 h-6 w-6 drop-shadow" />
                ) : (
                  <Radio className="relative z-10 h-6 w-6 drop-shadow" />
                )}
                <span className="sr-only">Islam Media Central Live Radio — drag to reposition</span>
              </button>

              {/* Desktop: rich tooltip on hover/focus-visible, appears to the left */}
              <div
                role="tooltip"
                className="pointer-events-none invisible opacity-0 translate-x-2
                           hidden sm:flex absolute top-1/2 right-full mr-3 -translate-y-1/2
                           items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900/95
                           px-3.5 py-2 text-[0.75rem] font-semibold text-white shadow-xl ring-1 ring-black/10 backdrop-blur
                           transition-all duration-150 ease-out
                           group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
                           group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-x-0"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Radio · drag to move
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-1/2 translate-x-[7px] -translate-y-1/2 h-0 w-0
                             border-y-[8px] border-y-transparent
                             border-l-[8px] border-l-slate-900/95"
                />
              </div>

              {/* Tiny badge under button (non-interactive) */}
              {isMuted && (
                <div className="pointer-events-none absolute left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-rose-600/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow ring-1 ring-white/30">
                  Muted
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* (Removed) duplicated mobile menu button at bottom */}

        {/* Notices / Announcements drawer — universal on all pages */}
        {noticesDrawerOpen && (
          <div className="fixed inset-0 z-[1200]">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeNoticesDrawer}
            />
            <motion.div
              initial={null}
              animate={{ x: 0, y: 0 }}
              className={`
                absolute bg-white shadow-2xl border border-slate-200
                md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-md md:rounded-l-3xl
                max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:top-auto
                max-sm:h-[88dvh] max-sm:max-h-[88dvh]
                max-sm:rounded-t-[1.5rem] max-sm:rounded-b-none
                max-sm:data-[state=open]:animate-in
                max-sm:data-[state=open]:slide-in-from-bottom-0
                flex flex-col overflow-hidden
              `}
              data-state="open"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 md:px-5 md:py-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    {highestPriority === NOTICE_PRIORITY.urgent ? (
                      <BellRing className="w-5 h-5 text-rose-200" />
                    ) : highestPriority === NOTICE_PRIORITY.highlight ? (
                      <BellRing className="w-5 h-5 text-amber-200" />
                    ) : (
                      <Bell className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg md:text-xl font-bold flex items-center gap-2">
                      Notices & Announcements
                      {unreadCount > 0 ? (
                        <Badge className="bg-white/25 text-white border-white/30">
                          {unreadCount > 99 ? "99+" : unreadCount} new
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs md:text-sm text-indigo-100 mt-0.5">
                      Site-wide updates from Islam Media Central
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {unreadCount > 0 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={markAllRead}
                      className="text-white hover:bg-white/15 h-9 gap-1.5 hidden sm:inline-flex"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark all read
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={closeNoticesDrawer}
                    className="text-white hover:bg-white/15"
                    aria-label="Close announcements"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="hidden sm:block border-t border-indigo-100/60 px-4 py-2 bg-indigo-50/60 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Auto-refreshes every 10 s · close this drawer to mark as read
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshNotices}
                  className="gap-1.5 h-8 border-slate-200 text-slate-700 hover:bg-white"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
                {notices.length === 0 ? (
                  <div className="p-6 md:p-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="text-lg font-semibold text-slate-800">No announcements yet</div>
                    <div className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                      Admin posts show here as notices. Urgent posts have a pinging red badge, highlights have an amber pulse.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 md:p-4 space-y-3">
                    {notices.map((n, idx) => {
                      const meta = PRIORITY_META[n.priority];
                      const isNew = isNoticeNew(n);
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(0.5, idx * 0.03) }}
                        >
                          <Card className={`overflow-hidden border bg-gradient-to-br ${meta.accentClass}`}>
                            <div className={`px-3 py-2 flex items-center justify-between gap-2 ${meta.accentRibbon} text-xs`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dotClass}`} />
                                <Badge className={`${meta.chipClass} truncate`}>
                                  {meta.label}
                                </Badge>
                                <span className="flex items-center gap-1 opacity-90 truncate">
                                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                  {(() => {
                                    const diff = Date.now() - (n.createdAt || 0);
                                    const m = Math.floor(diff / 60000);
                                    if (m < 1) return "just now";
                                    if (m < 60) return `${m}m ago`;
                                    const h = Math.floor(m / 60);
                                    if (h < 24) return `${h}h ago`;
                                    const d = Math.floor(h / 24);
                                    return `${d}d ago`;
                                  })()}
                                </span>
                                {isNew ? (
                                  <Badge className="bg-indigo-600 text-white border-0 ml-auto flex-shrink-0">
                                    New
                                  </Badge>
                                ) : null}
                              </div>
                              {n.priority === NOTICE_PRIORITY.urgent ? (
                                <Flame className="w-4 h-4 text-rose-100 flex-shrink-0" />
                              ) : null}
                            </div>
                            <CardContent className="p-3 md:p-4">
                              <div className="font-bold text-slate-900 break-words leading-snug">{n.title}</div>
                              {n.body ? (
                                <div className="text-sm text-slate-700 whitespace-pre-wrap mt-2 leading-relaxed">
                                  {n.body}
                                </div>
                              ) : null}
                              {n.linkUrl ? (
                                <div className="mt-3">
                                  <a
                                    href={n.linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                      try { markNoticeReadById(n.id); } catch {}
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-3 py-2 shadow min-h-[40px]"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    {n.linkLabel || "Open link"}
                                    <ArrowRight className="w-4 h-4" />
                                  </a>
                                </div>
                              ) : null}
                              <div className="mt-3 flex flex-wrap items-center gap-2 justify-between">
                                <div className="text-[11px] text-slate-500 truncate">
                                  Posted: {(() => {
                                    try {
                                      return new Date(n.createdAt || 0).toLocaleString();
                                    } catch {
                                      return "—";
                                    }
                                  })()}
                                </div>
                                {isNew ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      try { markNoticeReadById(n.id); } catch {}
                                      refreshNotices();
                                    }}
                                    className="h-8 gap-1 text-indigo-700 hover:bg-indigo-50"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Dismiss
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="sm:hidden border-t border-slate-200 bg-white/80 backdrop-blur px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] flex items-center justify-between gap-2">
                {unreadCount > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={markAllRead}
                    className="gap-1.5 h-10 text-slate-700 border-slate-300 hover:bg-white flex-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </Button>
                ) : (
                  <div className="text-xs text-slate-500 flex-1">
                    Closing marks all as read
                  </div>
                )}
                <Button
                  onClick={closeNoticesDrawer}
                  className="gap-1.5 h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow"
                >
                  Close
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </RadioContext.Provider>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  currentPageName: PropTypes.string
};
