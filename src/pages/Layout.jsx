

import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HIFZ_ASSISTANT_URL } from "@/constants/externalLinks";
import { Home, Gamepad2, BookOpen, Music, GraduationCap, Users, Info, Book, Trophy, ChevronDown, Menu, X, LogOut, User, LogIn, UserPlus, Video, Settings, Play, Pause, Volume2, VolumeX, Radio, Mail, Star, Sparkles, BarChart2, Layers, Shield, Bell, Target, MessageCircle } from "lucide-react";
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
import PropTypes from 'prop-types';
import { watchAuth, getUserProfile, getFirebase } from "@/api/firebase";
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
  const [siteSettings, setSiteSettings] = useState({
    siteTitle: "Islam Media Central",
    tagline: "Media With Purpose",
    logoEmoji: "🌙",
    headerGradient: "from-blue-600 to-purple-600",
    navActiveGradient: "from-blue-500 to-purple-500",
    backgroundGradient: "from-blue-50 via-purple-50 to-pink-50",
    darkModeDefault: false,
    showRadioBar: false,
    showMobileSidebar: false,
  });

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
  const radioSrc = siteSettings.radioUrl || "";

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
    { name: "Kids Zone", icon: Star, external: true, url: "https://islamic-kids-platform.vercel.app/" },
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
        {/* Hidden Audio Element */}
        {siteSettings.showRadioBar && radioSrc ? (
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
              </div>

              {/* Mobile auth is shown inside the drawer above menu; header kept minimal */}

              {/* Mobile Menu Button */}
              {!siteSettings.showMobileSidebar && (
                <>
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
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Home pill (quick return to Home) */}


        {/* Desktop Navigation */}
        <nav className="hidden md:block bg-white shadow-md sticky top-[calc(env(safe-area-inset-top)+68px)] z-40">
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
                  return (
                    <a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0 text-gray-700 hover:bg-gray-100"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.name}</span>
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
                        if (item.url) {
                          return (
                            <a
                              key={`ext-${item.name}`}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow transition-all duration-150"
                            >
                              {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
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
                          if (item.url) {
                            const Icon = item.icon;
                            return (
                              <a
                                key={`ext-${group.title}-${item.name}`}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow transition-all duration-150"
                              >
                                {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
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
                      if (item.url) {
                        return (
                          <a key={`ext-app-${item.name}`} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow">
                            {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
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
                        if (item.url) {
                          const Icon = item.icon;
                          return (
                            <a key={`app-ext-${group.title}-${item.name}`} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium text-gray-800 bg-white hover:bg-blue-100 shadow">
                              {Icon ? <Icon className="w-5 h-5 text-blue-600" /> : null}
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

        {/* (Removed) duplicated mobile menu button at bottom */}
      </div>
    </RadioContext.Provider>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  currentPageName: PropTypes.string
};
