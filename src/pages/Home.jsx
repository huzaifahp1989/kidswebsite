
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Gamepad2, BookOpen, Headphones, Video, Trophy, Star, Sparkles, Heart, Shield, MessageCircle, ExternalLink, Palette, Newspaper, Target, Award, Users, UserPlus, User, Moon, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// import WordPressFeed from "@/components/WordPressFeed";
import { useState, useEffect } from "react";
import { sponsorsApi } from "/src/api/firebase";
import { signUp, saveUserProfile } from "/src/api/firebase";
import React from "react";

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
 

const features = [
  {
    title: "99 Names of Allah",
    description: "Asma’ul Husna with meanings and audio",
    icon: Star,
    link: "LearningLibrary",
    query: "?section=names",
    color: "from-purple-600 to-indigo-500"
  },
  {
    title: "Full Quran",
    description: "Read and learn the full Qur'an",
    icon: BookOpen,
    link: "FullQuran",
    color: "from-green-600 to-teal-500"
  },
  {
    title: "Quran Dictionary",
    description: "Word-by-word meanings and transliteration",
    icon: Sparkles,
    link: "QuranDictionary",
    color: "from-purple-600 to-indigo-500"
  },
  {
    title: "Hadith",
    description: "Explore authentic hadith collections",
    icon: Newspaper,
    link: "Hadith",
    color: "from-amber-600 to-orange-500"
  },
  {
    title: "Duas",
    description: "Daily duas for kids to learn",
    icon: Heart,
    link: "Duas",
    color: "from-rose-600 to-pink-500"
  },
  {
    title: "Islamic Games",
    description: "Fun educational games to learn about Islam",
    icon: Gamepad2,
    link: "Games",
    color: "from-blue-600 to-purple-500"
  },
];

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
      subtext: "— Sahih Muslim",
      gradient: "from-green-600 via-teal-600 to-cyan-600"
    },
    {
      id: 3,
      text: "\"The best among you are those who learn the Qur'an and teach it.\"",
      subtext: "— Sahih Bukhari",
      gradient: "from-amber-600 via-orange-600 to-red-600"
    },
    {
      id: 4,
      text: "\"Remember Allah much so that you may be successful.\"",
      subtext: "— Qur'an 62:10",
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

  function InlineSignupForm() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [terms, setTerms] = useState(false);
    const [honeypot, setHoneypot] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const sanitizeEmail = (v) => String(v || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().toLowerCase();
    const validateEmail = (v) => {
      const s = sanitizeEmail(v);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    };
    const validatePassword = (v) => {
      const s = String(v || "");
      if (s.length < 8) return false;
      if (!/[A-Z]/.test(s)) return false;
      if (!/[a-z]/.test(s)) return false;
      if (!/[0-9]/.test(s)) return false;
      if (!/[!@#$%^&*(),.?":{}|<>\-_/]/.test(s)) return false;
      return true;
    };
    const validate = () => {
      const errs = [];
      if (!firstName.trim()) errs.push("First name is required");
      if (!lastName.trim()) errs.push("Last name is required");
      if (!email.trim() || !validateEmail(email)) errs.push("Enter a valid email address");
      if (!password || !validatePassword(password)) errs.push("Password must be 8+ chars with upper, lower, number, symbol");
      if (password !== confirmPassword) errs.push("Passwords do not match");
      if (!terms) errs.push("You must accept the terms and conditions");
      if (honeypot) errs.push("Invalid form submission");
      return errs;
    };

    const onSubmit = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      const errs = validate();
      if (errs.length) { setErrorMsg(errs[0]); return; }
      setSubmitting(true);
      try {
        const normalizedEmail = sanitizeEmail(email);
        const user = await signUp(normalizedEmail, password);
        try { await saveUserProfile(user.id, { full_name: `${firstName.trim()} ${lastName.trim()}`.trim(), email: normalizedEmail }); } catch {}
        try {
          const endpoint = import.meta.env?.DEV ? '/.netlify/functions/signupNotify' : '/api/signupNotify';
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: normalizedEmail, honeypot }),
          });
        } catch (_) {}
        setSuccess(true);
      } catch (e) {
        const m = String(e?.message || e || "");
        if (m.toLowerCase().includes("already") || m.toLowerCase().includes("exists") || m.toLowerCase().includes("registered")) {
          setErrorMsg("This email is already registered");
        } else {
          setErrorMsg("Failed to sign up. Please try again");
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <form onSubmit={onSubmit} noValidate className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name</label>
            <input id="firstName" type="text" value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring" required />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name</label>
            <input id="lastName" type="text" value={lastName} onChange={(e)=>setLastName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring" required />
          </div>
        </div>
        <div className="mt-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" value={email} onChange={(e)=>setEmail(e.target.value)} onBlur={(e)=>setEmail(sanitizeEmail(e.target.value))} className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring" required />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring" required />
            <div className="mt-1 text-xs text-gray-500">Use 8+ chars with upper, lower, number, symbol</div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring" required />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="terms" className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input id="terms" type="checkbox" checked={terms} onChange={(e)=>setTerms(e.target.checked)} className="rounded" />
            I agree to the Terms & Conditions
          </label>
        </div>
        <input aria-hidden="true" tabIndex="-1" type="text" value={honeypot} onChange={(e)=>setHoneypot(e.target.value)} className="hidden" />
        {errorMsg ? <div className="mt-4 text-sm text-red-600">{errorMsg}</div> : null}
      {success ? <div className="mt-4 text-sm text-green-600">Registration successful. A confirmation has been sent, and the admin has been notified.</div> : null}
        <div className="mt-6">
          <Button type="submit" disabled={submitting} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
            {submitting ? "Signing up..." : "Sign Up"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-white">
      {/* WhatsApp Chat Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
      >
        <a
          href="https://wa.me/447447999284?text=Assalamu%20Alaikum!%20I%20have%20a%20question%20about%20Islam%20Kids%20Zone."
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-green-500 hover:bg-green-600 text-white rounded-full p-2 md:p-3 shadow-lg hover:shadow-xl transition-all duration-300"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
        </a>
      </motion.div>

      <section className="relative py-12 md:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8BB9FF] via-[#9A7CFF]/20 to-[#8BB9FF]/10 opacity-70" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#F6C94B] flex items-center justify-center shadow">
              <Moon className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Islam Kids Zone</h1>
            <div className="mt-1 text-lg md:text-xl text-gray-700">Learn, Play & Grow</div>
            <div className="mt-4 text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              Explore interactive Islamic games, stories, quizzes, and fun learning activities designed just for kids.
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a href={createPageUrl("Games")}><Button className="rounded-full px-6 bg-blue-600 hover:bg-blue-700">Play Games</Button></a>
              <a href={createPageUrl("Stories")}><Button className="rounded-full px-6 bg-purple-600 hover:bg-purple-700">Read Stories</Button></a>
              <a href={createPageUrl("Quizzes")}><Button className="rounded-full px-6 bg-rose-600 hover:bg-rose-700">Start Quiz</Button></a>
            </div>
            <div className="mt-6 w-full max-w-sm sm:max-w-md mx-auto text-center">
              <div className="px-5 py-4 rounded-2xl bg-white/80 backdrop-blur border shadow">
                <div className="text-xs sm:text-sm text-gray-500">Today</div>
                <div className="text-sm sm:text-base font-semibold text-gray-900 leading-snug break-words">{gregorianDate || 'Loading…'}</div>
                <div className="text-lg sm:text-xl font-bold text-purple-700 mt-1 leading-snug break-words">{islamicDate || 'Loading Hijri…'}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      
      <section className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Quick Access</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 justify-center">
            <a href={createPageUrl("KidsZone")} className="group flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
                <Moon className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
              </div>
              <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Kids Zone</div>
            </a>

            <a href={createPageUrl("Videos")} className="group flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-purple-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
                <Play className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
              </div>
              <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Videos</div>
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4">
            <a href={createPageUrl("Signup")}>
              <Button className="rounded-full px-6 bg-blue-600 hover:bg-blue-700">Sign Up</Button>
            </a>
            <a href={createPageUrl("Login")}>
              <Button className="rounded-full px-6 bg-purple-600 hover:bg-purple-700">Sign In</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Animated Text Slider Banner */}
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className={`bg-gradient-to-r ${bannerSlides[currentSlide].gradient} flex items-center justify-center p-8 md:p-12`}
              >
                <div className="text-center text-white">
                  <h2 className="text-2xl md:text-4xl font-bold mb-2">
                    {bannerSlides[currentSlide].text}
                  </h2>
                  {bannerSlides[currentSlide].subtext && (
                    <p className="text-sm md:text-lg text-white/90">
                      {bannerSlides[currentSlide].subtext}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {bannerSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-6 md:w-8' : 'bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-8 md:py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200"
            >
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">12+</h3>
              <p className="text-gray-600 font-medium">Interactive Games</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl border-2 border-green-200"
            >
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">7</h3>
              <p className="text-gray-600 font-medium">Educational Modules</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200"
            >
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">100+</h3>
              <p className="text-gray-600 font-medium">Active Learners</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sponsors & Ads */}
      {/* Removed sponsors section as per request */}
      

      {/* Islamic Values */}
      <section className="py-12 md:py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Building strong Islamic character and knowledge through engaging content
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {islamicValues.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 border-2 hover:border-purple-300">
                  <CardContent className="p-6 text-center">
                    <value.icon className={`w-16 h-16 mx-auto mb-4 ${value.color}`} />
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      

      {/* Monthly Competition Section */}
      <section className="py-12 md:py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-4 border-amber-400 shadow-2xl bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-8 md:p-12">
                <div className="text-center">
                  <div className="text-6xl mb-6">🏆</div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Monthly Learning Competition
                  </h2>
                  <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
                    Compete with learners worldwide! Top 3 students each month win amazing prizes. 
                    Play games, complete challenges, and climb the leaderboard.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <a href={createPageUrl("Leaderboard")}>
                      <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                        <Trophy className="w-5 h-5 mr-2" />
                        View Leaderboard
                      </Button>
                    </a>
                    <a href={createPageUrl("Games")}>
                      <Button size="lg" variant="outline" className="border-2 border-amber-500">
                        <Gamepad2 className="w-5 h-5 mr-2" />
                        Start Playing
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      

      {/* Blog section removed per request: external link not pointing to correct page */}

      {/* CTA Section */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Start Your Islamic Learning Journey Today
            </h2>
            <p className="text-lg md:text-xl text-blue-100 mb-8">
              Join thousands of children learning about Islam through our engaging platform
            </p>
            <a href={createPageUrl("Games")}>
              <Button size="lg" className="bg-white text-purple-600 hover:bg-blue-50 text-base md:text-lg px-8 md:px-12 py-4 md:py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <Sparkles className="mr-2 w-5 h-5 md:w-6 md:h-6" />
                Get Started Now
              </Button>
            </a>
          </motion.div>
        </div>
      </section>
      <section className="py-12 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Create Your Account</h2>
            <p className="text-sm text-gray-600">Join thousands of children learning about Islam through our engaging platform</p>
          </div>
          <noscript>
            <div className="mb-4 p-3 rounded border bg-white text-sm text-gray-700">JavaScript is required to sign up. Please enable JavaScript in your browser.</div>
          </noscript>
          <InlineSignupForm />
        </div>
      </section>
    </div>
    </ErrorBoundary>
  );
}
