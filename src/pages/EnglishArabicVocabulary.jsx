import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Eye, EyeOff, Shuffle, ChevronRight, ChevronLeft, Star, BookOpen, Globe, Headphones } from 'lucide-react';
import { awardPointsForGame } from '@/api/points';
import { watchAuth } from '@/api/firebase';

// Comprehensive English to Arabic vocabulary data
const vocabularyCategories = {
  basics: {
    title: 'Basic Words',
    icon: '🏠',
    words: [
      { english: 'Hello', arabic: 'مرحباً', transliteration: 'marḥaban', pronunciation: 'mar-ha-ban' },
      { english: 'Goodbye', arabic: 'وداعاً', transliteration: 'wadāʿan', pronunciation: 'wa-da-an' },
      { english: 'Please', arabic: 'من فضلك', transliteration: 'min faḍlik', pronunciation: 'min fad-lik' },
      { english: 'Thank you', arabic: 'شكراً', transliteration: 'shukran', pronunciation: 'shuk-ran' },
      { english: 'Yes', arabic: 'نعم', transliteration: 'naʿam', pronunciation: 'na-am' },
      { english: 'No', arabic: 'لا', transliteration: 'lā', pronunciation: 'la' },
      { english: 'Water', arabic: 'ماء', transliteration: 'māʾ', pronunciation: 'ma' },
      { english: 'Food', arabic: 'طعام', transliteration: 'ṭaʿām', pronunciation: 'ta-am' }
    ]
  },
  numbers: {
    title: 'Numbers',
    icon: '🔢',
    words: [
      { english: 'One', arabic: 'واحد', transliteration: 'wāḥid', pronunciation: 'wa-hid' },
      { english: 'Two', arabic: 'اثنان', transliteration: 'ithnān', pronunciation: 'ith-nan' },
      { english: 'Three', arabic: 'ثلاثة', transliteration: 'thalāthah', pronunciation: 'tha-la-tha' },
      { english: 'Four', arabic: 'أربعة', transliteration: 'arbaʿah', pronunciation: 'ar-ba-a' },
      { english: 'Five', arabic: 'خمسة', transliteration: 'khamsah', pronunciation: 'kham-sa' },
      { english: 'Six', arabic: 'ستة', transliteration: 'sittah', pronunciation: 'sit-ta' },
      { english: 'Seven', arabic: 'سبعة', transliteration: 'sabʿah', pronunciation: 'sab-a' },
      { english: 'Eight', arabic: 'ثمانية', transliteration: 'thamāniyah', pronunciation: 'tha-ma-ni-ya' }
    ]
  },
  family: {
    title: 'Family',
    icon: '👨‍👩‍👧‍👦',
    words: [
      { english: 'Father', arabic: 'أب', transliteration: 'ab', pronunciation: 'ab' },
      { english: 'Mother', arabic: 'أم', transliteration: 'umm', pronunciation: 'umm' },
      { english: 'Brother', arabic: 'أخ', transliteration: 'akh', pronunciation: 'akh' },
      { english: 'Sister', arabic: 'أخت', transliteration: 'ukht', pronunciation: 'ukht' },
      { english: 'Son', arabic: 'ابن', transliteration: 'ibn', pronunciation: 'ibn' },
      { english: 'Daughter', arabic: 'ابنة', transliteration: 'ibnah', pronunciation: 'ib-na' },
      { english: 'Grandfather', arabic: 'جد', transliteration: 'jad', pronunciation: 'jad' },
      { english: 'Grandmother', arabic: 'جدة', transliteration: 'jadah', pronunciation: 'ja-da' }
    ]
  },
  colors: {
    title: 'Colors',
    icon: '🎨',
    words: [
      { english: 'Red', arabic: 'أحمر', transliteration: 'aḥmar', pronunciation: 'ah-mar' },
      { english: 'Blue', arabic: 'أزرق', transliteration: 'azraq', pronunciation: 'az-raq' },
      { english: 'Green', arabic: 'أخضر', transliteration: 'akhḍar', pronunciation: 'akh-dar' },
      { english: 'Yellow', arabic: 'أصفر', transliteration: 'aṣfar', pronunciation: 'as-far' },
      { english: 'Black', arabic: 'أسود', transliteration: 'aswad', pronunciation: 'as-wad' },
      { english: 'White', arabic: 'أبيض', transliteration: 'abyaḍ', pronunciation: 'ab-yaḍ' },
      { english: 'Brown', arabic: 'بني', transliteration: 'banī', pronunciation: 'ba-ni' },
      { english: 'Pink', arabic: 'وردي', transliteration: 'wardī', pronunciation: 'war-di' }
    ]
  },
  animals: {
    title: 'Animals',
    icon: '🦁',
    words: [
      { english: 'Cat', arabic: 'قطة', transliteration: 'qiṭṭah', pronunciation: 'qit-ta' },
      { english: 'Dog', arabic: 'كلب', transliteration: 'kalb', pronunciation: 'kalb' },
      { english: 'Bird', arabic: 'طائر', transliteration: 'ṭāʾir', pronunciation: 'ta-ir' },
      { english: 'Horse', arabic: 'حصان', transliteration: 'ḥiṣān', pronunciation: 'ḥi-ṣan' },
      { english: 'Camel', arabic: 'جمل', transliteration: 'jamal', pronunciation: 'ja-mal' },
      { english: 'Lion', arabic: 'أسد', transliteration: 'asad', pronunciation: 'as-ad' },
      { english: 'Elephant', arabic: 'فيل', transliteration: 'fīl', pronunciation: 'fīl' },
      { english: 'Fish', arabic: 'سمكة', transliteration: 'samakah', pronunciation: 'sam-ka' }
    ]
  },
  food: {
    title: 'Food & Drinks',
    icon: '🍽️',
    words: [
      { english: 'Bread', arabic: 'خبز', transliteration: 'khubz', pronunciation: 'khubz' },
      { english: 'Milk', arabic: 'حليب', transliteration: 'ḥalīb', pronunciation: 'ḥa-līb' },
      { english: 'Rice', arabic: 'أرز', transliteration: 'aruzz', pronunciation: 'ar-ruz' },
      { english: 'Meat', arabic: 'لحم', transliteration: 'laḥm', pronunciation: 'laḥm' },
      { english: 'Fruit', arabic: 'فاكهة', transliteration: 'fākihah', pronunciation: 'fa-ki-ha' },
      { english: 'Vegetable', arabic: 'خضار', transliteration: 'khuḍār', pronunciation: 'khu-ḍar' },
      { english: 'Coffee', arabic: 'قهوة', transliteration: 'qahwah', pronunciation: 'qa-hwa' },
      { english: 'Tea', arabic: 'شاي', transliteration: 'shāy', pronunciation: 'shāy' }
    ]
  },
  school: {
    title: 'School',
    icon: '🏫',
    words: [
      { english: 'School', arabic: 'مَدرسة', transliteration: 'madrasa', pronunciation: 'mad-ra-sa' },
      { english: 'Teacher', arabic: 'مُعلِّم', transliteration: 'muʿallim', pronunciation: 'mu-al-lim' },
      { english: 'Student', arabic: 'طالِب', transliteration: 'ṭālib', pronunciation: 'ṭa-lib' },
      { english: 'Classroom', arabic: 'فصل', transliteration: 'faṣl', pronunciation: 'faṣl' },
      { english: 'Book', arabic: 'كتاب', transliteration: 'kitāb', pronunciation: 'ki-tāb' },
      { english: 'Pen', arabic: 'قلم', transliteration: 'qalam', pronunciation: 'qa-lam' },
      { english: 'Notebook', arabic: 'دفتر', transliteration: 'daftar', pronunciation: 'daf-tar' },
      { english: 'Lesson', arabic: 'درس', transliteration: 'dars', pronunciation: 'dars' },
      { english: 'Homework', arabic: 'واجب', transliteration: 'wājib', pronunciation: 'wā-jib' },
      { english: 'Exam', arabic: 'امتحان', transliteration: 'imtiḥān', pronunciation: 'im-ti-ḥān' }
    ]
  },
  household: {
    title: 'Household',
    icon: '🏠',
    words: [
      { english: 'House', arabic: 'بيت', transliteration: 'bayt', pronunciation: 'bayt' },
      { english: 'Room', arabic: 'غرفة', transliteration: 'ghurfah', pronunciation: 'ghur-fah' },
      { english: 'Kitchen', arabic: 'مطبخ', transliteration: 'maṭbakh', pronunciation: 'maṭ-bakh' },
      { english: 'Bathroom', arabic: 'حمّام', transliteration: 'ḥammām', pronunciation: 'ḥam-mām' },
      { english: 'Door', arabic: 'باب', transliteration: 'bāb', pronunciation: 'bāb' },
      { english: 'Window', arabic: 'نافذة', transliteration: 'nāfidha', pronunciation: 'nā-fi-dha' },
      { english: 'Bed', arabic: 'سرير', transliteration: 'sarīr', pronunciation: 'sa-rīr' },
      { english: 'Chair', arabic: 'كرسي', transliteration: 'kursī', pronunciation: 'kur-sī' },
      { english: 'Table', arabic: 'طاولة', transliteration: 'ṭāwilah', pronunciation: 'ṭā-wi-lah' },
      { english: 'Lamp', arabic: 'مصباح', transliteration: 'miṣbāḥ', pronunciation: 'miṣ-bāḥ' }
    ]
  },
  verbs: {
    title: 'Common Verbs',
    icon: '⚙️',
    words: [
      { english: 'Read', arabic: 'قرأ', transliteration: 'qaraʾa', pronunciation: 'qa-ra-a' },
      { english: 'Write', arabic: 'كتب', transliteration: 'kataba', pronunciation: 'ka-ta-ba' },
      { english: 'Speak', arabic: 'تكلّم', transliteration: 'takallama', pronunciation: 'ta-kal-la-ma' },
      { english: 'Listen', arabic: 'استمع', transliteration: 'istamaʿa', pronunciation: 'is-ta-ma-a' },
      { english: 'Eat', arabic: 'أكل', transliteration: 'akala', pronunciation: 'a-ka-la' },
      { english: 'Drink', arabic: 'شرب', transliteration: 'shariba', pronunciation: 'sha-ri-ba' },
      { english: 'Go', arabic: 'ذهب', transliteration: 'dhahaba', pronunciation: 'dha-ha-ba' },
      { english: 'Come', arabic: 'جاء', transliteration: 'jāʾa', pronunciation: 'jā-a' },
      { english: 'See', arabic: 'رأى', transliteration: 'raʾā', pronunciation: 'ra-a' },
      { english: 'Learn', arabic: 'تعلّم', transliteration: 'taʿallama', pronunciation: 'ta-al-la-ma' }
    ]
  },
  adjectives: {
    title: 'Adjectives',
    icon: '✨',
    words: [
      { english: 'Big', arabic: 'كبير', transliteration: 'kabīr', pronunciation: 'ka-bīr' },
      { english: 'Small', arabic: 'صغير', transliteration: 'ṣaghīr', pronunciation: 'ṣa-ghīr' },
      { english: 'Beautiful', arabic: 'جميل', transliteration: 'jamīl', pronunciation: 'ja-mīl' },
      { english: 'Good', arabic: 'جيد', transliteration: 'jayyid', pronunciation: 'jay-yid' },
      { english: 'Easy', arabic: 'سهل', transliteration: 'sahl', pronunciation: 'sahl' },
      { english: 'Hard', arabic: 'صعب', transliteration: 'ṣaʿb', pronunciation: 'ṣaʿb' },
      { english: 'New', arabic: 'جديد', transliteration: 'jadīd', pronunciation: 'ja-dīd' },
      { english: 'Old', arabic: 'قديم', transliteration: 'qadīm', pronunciation: 'qa-dīm' },
      { english: 'Hot', arabic: 'حارّ', transliteration: 'ḥārr', pronunciation: 'ḥār' },
      { english: 'Cold', arabic: 'بارد', transliteration: 'bārid', pronunciation: 'bā-rid' }
    ]
  },
  body: {
    title: 'Body Parts',
    icon: '🧍',
    words: [
      { english: 'Head', arabic: 'رأس', transliteration: 'raʾs', pronunciation: 'raʾs' },
      { english: 'Face', arabic: 'وجه', transliteration: 'wajh', pronunciation: 'wajh' },
      { english: 'Eye', arabic: 'عين', transliteration: 'ʿayn', pronunciation: 'ʿayn' },
      { english: 'Ear', arabic: 'أُذُن', transliteration: 'udhun', pronunciation: 'u-dhun' },
      { english: 'Hand', arabic: 'يد', transliteration: 'yad', pronunciation: 'yad' },
      { english: 'Foot', arabic: 'قدم', transliteration: 'qadam', pronunciation: 'qa-dam' },
      { english: 'Heart', arabic: 'قلب', transliteration: 'qalb', pronunciation: 'qalb' },
      { english: 'Mouth', arabic: 'فم', transliteration: 'fam', pronunciation: 'fam' },
      { english: 'Nose', arabic: 'أنف', transliteration: 'anf', pronunciation: 'anf' },
      { english: 'Hair', arabic: 'شَعر', transliteration: 'shaʿr', pronunciation: 'shaʿr' }
    ]
  },
  time: {
    title: 'Time & Days',
    icon: '🗓️',
    words: [
      { english: 'Day', arabic: 'يوم', transliteration: 'yawm', pronunciation: 'yawm' },
      { english: 'Night', arabic: 'ليل', transliteration: 'layl', pronunciation: 'layl' },
      { english: 'Morning', arabic: 'صباح', transliteration: 'ṣabāḥ', pronunciation: 'ṣa-bāḥ' },
      { english: 'Evening', arabic: 'مساء', transliteration: 'masāʾ', pronunciation: 'ma-sā' },
      { english: 'Monday', arabic: 'الإثنين', transliteration: 'al-ithnayn', pronunciation: 'al-ith-nayn' },
      { english: 'Tuesday', arabic: 'الثلاثاء', transliteration: 'ath-thulāthāʾ', pronunciation: 'ath-thu-lā-thā' },
      { english: 'Wednesday', arabic: 'الأربعاء', transliteration: 'al-arbiʿāʾ', pronunciation: 'al-ar-bi-ʿā' },
      { english: 'Thursday', arabic: 'الخميس', transliteration: 'al-khamīs', pronunciation: 'al-kha-mīs' },
      { english: 'Friday', arabic: 'الجمعة', transliteration: 'al-jumuʿah', pronunciation: 'al-ju-mu-a' },
      { english: 'Saturday', arabic: 'السبت', transliteration: 'as-sabt', pronunciation: 'as-sabt' }
    ]
  },
  places: {
    title: 'Places',
    icon: '📍',
    words: [
      { english: 'City', arabic: 'مدينة', transliteration: 'madīnah', pronunciation: 'ma-dī-nah' },
      { english: 'Village', arabic: 'قرية', transliteration: 'qaryah', pronunciation: 'qa-ryah' },
      { english: 'Market', arabic: 'سوق', transliteration: 'sūq', pronunciation: 'sūq' },
      { english: 'Mosque', arabic: 'مسجد', transliteration: 'masjid', pronunciation: 'mas-jid' },
      { english: 'Hospital', arabic: 'مستشفى', transliteration: 'mustashfā', pronunciation: 'mus-tash-fā' },
      { english: 'Library', arabic: 'مكتبة', transliteration: 'maktabah', pronunciation: 'mak-ta-bah' },
      { english: 'Park', arabic: 'حديقة', transliteration: 'ḥadīqah', pronunciation: 'ḥa-dī-qah' },
      { english: 'Street', arabic: 'شارع', transliteration: 'shāriʿ', pronunciation: 'shā-riʿ' },
      { english: 'Airport', arabic: 'مطار', transliteration: 'maṭār', pronunciation: 'ma-ṭār' },
      { english: 'Beach', arabic: 'شاطئ', transliteration: 'shāṭiʾ', pronunciation: 'shā-ṭi' }
    ]
  },
  religion: {
    title: 'Islamic Terms',
    icon: '🕋',
    words: [
      { english: 'Allah', arabic: 'الله', transliteration: 'Allāh', pronunciation: 'Al-lāh' },
      { english: 'Prophet', arabic: 'نبيّ', transliteration: 'nabiyy', pronunciation: 'na-biy-y' },
      { english: 'Prayer', arabic: 'صلاة', transliteration: 'ṣalāh', pronunciation: 'ṣa-lāh' },
      { english: 'Fasting', arabic: 'صوم', transliteration: 'ṣawm', pronunciation: 'ṣawm' },
      { english: 'Charity', arabic: 'زكاة', transliteration: 'zakāh', pronunciation: 'za-kāh' },
      { english: 'Pilgrimage', arabic: 'حجّ', transliteration: 'ḥajj', pronunciation: 'ḥajj' },
      { english: 'Quran', arabic: 'قُرآن', transliteration: 'Qurʾān', pronunciation: 'Qur-ān' },
      { english: 'Mosque', arabic: 'مسجد', transliteration: 'masjid', pronunciation: 'mas-jid' },
      { english: 'Iman', arabic: 'إيمان', transliteration: 'īmān', pronunciation: 'ī-mān' },
      { english: 'Islam', arabic: 'إسلام', transliteration: 'islām', pronunciation: 'is-lām' }
    ]
  }
};

// Learning modes
const LEARNING_MODES = {
  FLASHCARD: 'flashcard',
  BROWSE: 'browse',
  MATCHING: 'matching',
  LISTENING: 'listening',
};

export default function EnglishArabicVocabulary() {
  const [selectedCategory, setSelectedCategory] = useState('basics');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [learningMode, setLearningMode] = useState(LEARNING_MODES.FLASHCARD);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [languageMode, setLanguageMode] = useState('english-arabic'); // 'english-arabic' or 'arabic-english'
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [browseView, setBrowseView] = useState('grid');
  const [showTransliteration, setShowTransliteration] = useState(true);

  const [matchingPairs, setMatchingPairs] = useState([
    { english: 'Sun', emoji: '☀️', arabic: 'شمس' },
    { english: 'Moon', emoji: '🌙', arabic: 'قمر' },
    { english: 'Boy', emoji: '👦', arabic: 'ولد' },
    { english: 'Girl', emoji: '👧', arabic: 'بنت' },
    { english: 'House', emoji: '🏠', arabic: 'بيت' },
  ]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [dragItem, setDragItem] = useState(null);
  const [matchTimer, setMatchTimer] = useState(60);
  const [matchActive, setMatchActive] = useState(false);
  const [matchAwarded, setMatchAwarded] = useState(false);

  const [listeningActive, setListeningActive] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [pronounceIndex, setPronounceIndex] = useState(0);
  const [pronounceCorrect, setPronounceCorrect] = useState(null);

  useEffect(() => {
    const words = [...currentCategory.words];
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    setShuffledWords(words);
    setCurrentWordIndex(0);
    setShowTranslation(false);
  }, [selectedCategory]);

  useEffect(() => {
    const timer = matchActive ? setInterval(() => {
      setMatchTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000) : null;
    return () => { if (timer) clearInterval(timer); };
  }, [matchActive]);

  useEffect(() => {
    try {
      const unsub = watchAuth((u) => setUser(u));
      return () => { try { unsub?.(); } catch {} };
    } catch {}
  }, []);

  const currentCategory = vocabularyCategories[selectedCategory];
  const currentWord = currentCategory.words[currentWordIndex];

  useEffect(() => {
    // Shuffle words when category changes
    const words = [...currentCategory.words];
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    setShuffledWords(words);
    setCurrentWordIndex(0);
    setShowTranslation(false);
  }, [selectedCategory]);

  const nextWord = () => {
    if (currentWordIndex < currentCategory.words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setShowTranslation(false);
    }
  };

  const previousWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
      setShowTranslation(false);
    }
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const shuffleWords = () => {
    const words = [...currentCategory.words];
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    setShuffledWords(words);
    setCurrentWordIndex(0);
    setShowTranslation(false);
  };

  const toggleFavorite = (word) => {
    const isFavorite = favorites.some(fav => fav.english === word.english);
    if (isFavorite) {
      setFavorites(favorites.filter(fav => fav.english !== word.english));
    } else {
      setFavorites([...favorites, word]);
    }
  };

  const isFavorite = (word) => {
    return favorites.some(fav => fav.english === word.english);
  };

  const playPronunciation = () => {
    // Simple pronunciation guide - in a real app, you'd use Web Speech API or audio files
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1000);
    
    // Web Speech API for pronunciation (if available)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.arabic);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.7;
      speechSynthesis.speak(utterance);
    }
  };

  const startMatchingGame = () => {
    const shuffled = [...matchingPairs].sort(() => Math.random() - 0.5);
    setMatchingPairs(shuffled);
    setMatchedCount(0);
    setMatchTimer(60);
    setMatchActive(true);
    setMatchAwarded(false);
  };

  const handleDragStart = (item) => {
    setDragItem(item);
  };

  const handleDrop = (targetArabic) => {
    if (!dragItem) return;
    if (dragItem.arabic === targetArabic) {
      setMatchedCount((c) => c + 1);
    }
    setDragItem(null);
  };

  useEffect(() => {
    if (matchedCount === matchingPairs.length && matchActive && !matchAwarded) {
      setMatchActive(false);
      const base = 100;
      const bonus = Math.max(0, matchTimer) * 1;
      const fallbackScore = base + bonus;
      setMatchAwarded(true);
      try {
        awardPointsForGame(user, 'english_arabic_matching', { fallbackScore });
      } catch {}
    }
  }, [matchedCount, matchActive, matchAwarded, matchTimer, matchingPairs.length, user]);

  const startListening = () => {
    setPronounceCorrect(null);
    setLastHeard('');
    const target = currentCategory.words[pronounceIndex]?.arabic;
    if (!target) return;
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        setListeningActive(false);
        return;
      }
      const rec = new SR();
      rec.lang = 'ar-SA';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setListeningActive(true);
      rec.onresult = (e) => {
        const said = String(e.results?.[0]?.[0]?.transcript || '').trim();
        setLastHeard(said);
        const normalizedTarget = target.replace(/\s+/g, '').toLowerCase();
        const normalizedSaid = said.replace(/\s+/g, '').toLowerCase();
        const ok = normalizedSaid.includes(normalizedTarget) || normalizedTarget.includes(normalizedSaid);
        setPronounceCorrect(ok);
        setListeningActive(false);
        if (ok) {
          try { awardPointsForGame(user, 'arabic_pronunciation', { fallbackScore: 20 }); } catch {}
        }
      };
      rec.onerror = () => {
        setListeningActive(false);
        setPronounceCorrect(false);
      };
      rec.onend = () => setListeningActive(false);
      rec.start();
    } catch {
      setListeningActive(false);
    }
  };

  const nextPronounce = () => {
    setPronounceIndex((i) => (i + 1) % currentCategory.words.length);
    setPronounceCorrect(null);
    setLastHeard('');
  };

  const renderFlashcardMode = () => {
    const isEnglishToArabic = languageMode === 'english-arabic';
    
    return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentWordIndex + 1) / currentCategory.words.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <motion.div
        key={currentWordIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:shadow-xl transition-shadow"
        onClick={toggleTranslation}
      >
        <div className="mb-4">
          <span className="text-3xl sm:text-4xl">{currentCategory.icon}</span>
        </div>
        
        <div className="mb-6">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 break-words">
            {isEnglishToArabic ? currentWord.english : currentWord.arabic}
          </h3>
          {!isEnglishToArabic && (
            <div className="text-base sm:text-lg text-gray-600 mb-2 break-words">
              {currentWord.transliteration}
            </div>
          )}
          <div className="text-sm text-gray-500 mb-4">
            {currentCategory.title} - {isEnglishToArabic ? 'English to Arabic' : 'Arabic to English'}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showTranslation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="border-t pt-4">
                <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2 break-words">
                  {isEnglishToArabic ? currentWord.arabic : currentWord.english}
                </div>
                {isEnglishToArabic && (
                  <div className="text-base sm:text-lg text-gray-600 mb-2 break-words">
                    {currentWord.transliteration}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  [{currentWord.pronunciation}]
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showTranslation && (
          <div className="text-gray-400 text-sm">
            {isEnglishToArabic ? 'Click to reveal Arabic translation' : 'Click to reveal English translation'}
          </div>
        )}
      </motion.div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Button
          onClick={previousWord}
          disabled={currentWordIndex === 0}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Button
            onClick={playPronunciation}
            disabled={!showTranslation}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Headphones className="w-4 h-4" />
            Pronounce
          </Button>
          
          <Button
            onClick={() => toggleFavorite(currentWord)}
            className={`flex items-center gap-2 w-full sm:w-auto ${
              isFavorite(currentWord) ? 'bg-yellow-500 hover:bg-yellow-600' : ''
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite(currentWord) ? 'fill-current' : ''}`} />
            {isFavorite(currentWord) ? 'Favorited' : 'Favorite'}
          </Button>
          
          <Button
            onClick={shuffleWords}
            className="hidden sm:flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </Button>
        </div>

        <Button
          onClick={nextWord}
          disabled={currentWordIndex === currentCategory.words.length - 1}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Word Counter */}
      <div className="text-center text-gray-500">
        {currentWordIndex + 1} / {currentCategory.words.length}
      </div>
    </div>
    );
  };

  const renderBrowseMode = () => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? currentCategory.words.filter((w) =>
          w.english.toLowerCase().includes(q) ||
          w.arabic.replace(/\s/g, '').toLowerCase().includes(q) ||
          String(w.transliteration || '').toLowerCase().includes(q)
        )
      : currentCategory.words;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex-1">
            <Input
              placeholder="Search words"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setBrowseView('grid')}
              className={browseView === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'}
            >
              Grid
            </Button>
            <Button
              onClick={() => setBrowseView('table')}
              className={browseView === 'table' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'}
            >
              Table
            </Button>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <Switch checked={showTransliteration} onCheckedChange={setShowTransliteration} />
              <span>Transliteration</span>
            </label>
          </div>
        </div>

        {browseView === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((word, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="font-bold text-gray-800 mb-1 break-words">
                  {languageMode === 'english-arabic' ? word.english : word.arabic}
                </div>
                <div className="text-blue-600 text-base sm:text-lg mb-1 break-words" dir={languageMode === 'arabic-english' ? 'rtl' : undefined} lang={languageMode === 'arabic-english' ? 'ar' : undefined}>
                  {languageMode === 'english-arabic' ? word.arabic : word.english}
                </div>
                {showTransliteration && (
                  <div className="text-xs sm:text-sm text-gray-600">{word.transliteration}</div>
                )}
                <div className="text-[11px] sm:text-xs text-gray-500">[{word.pronunciation}]</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2">English</th>
                  <th className="px-3 py-2">Arabic</th>
                  {showTransliteration && <th className="px-3 py-2">Transliteration</th>}
                  <th className="px-3 py-2">Pronunciation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((word, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{word.english}</td>
                    <td className="px-3 py-2" dir="rtl" lang="ar">{word.arabic}</td>
                    {showTransliteration && <td className="px-3 py-2">{word.transliteration}</td>}
                    <td className="px-3 py-2">[{word.pronunciation}]</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-gray-500">{filtered.length} items</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-3 sm:py-8 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-5xl sm:text-6xl mb-4">🌍</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {languageMode === 'english-arabic' ? 'English to Arabic Vocabulary' : 'Arabic to English Vocabulary'}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            {languageMode === 'english-arabic' 
              ? 'Learn essential Arabic vocabulary with pronunciation guides and interactive flashcards'
              : 'Practice translating Arabic words to English with interactive learning tools'
            }
          </p>
        </motion.div>

        {/* Language Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-md flex w-full max-w-md">
            <Button
              onClick={() => setLanguageMode('english-arabic')}
              className={`flex-1 px-3 py-2 rounded-md transition-all ${
                languageMode === 'english-arabic'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              English → Arabic
            </Button>
            <Button
              onClick={() => setLanguageMode('arabic-english')}
              className={`flex-1 px-3 py-2 rounded-md transition-all ${
                languageMode === 'arabic-english'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Arabic → English
            </Button>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Choose a Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Object.entries(vocabularyCategories).map(([key, category]) => (
              <Button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`p-3 sm:p-4 rounded-lg transition-all ${
                  selectedCategory === key
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-blue-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl sm:text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs sm:text-sm font-medium">{category.title}</div>
                  <div className="text-[11px] sm:text-xs opacity-75">{category.words.length} words</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Learning Mode Selection */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {[LEARNING_MODES.FLASHCARD, LEARNING_MODES.BROWSE, LEARNING_MODES.MATCHING, LEARNING_MODES.LISTENING].map((mode) => (
              <Button
                key={mode}
                onClick={() => setLearningMode(mode)}
                className={`px-3 py-2 rounded-lg text-sm sm:text-base ${
                  learningMode === mode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-blue-50'
                }`}
              >
                {mode === LEARNING_MODES.FLASHCARD && <BookOpen className="w-4 h-4 mr-2" />}
                {mode === LEARNING_MODES.BROWSE && <Eye className="w-4 h-4 mr-2" />}
                {mode === LEARNING_MODES.MATCHING && <Globe className="w-4 h-4 mr-2" />}
                {mode === LEARNING_MODES.LISTENING && <Headphones className="w-4 h-4 mr-2" />}
                {mode === LEARNING_MODES.FLASHCARD ? 'Flashcard' : mode === LEARNING_MODES.BROWSE ? 'Browse' : mode === LEARNING_MODES.MATCHING ? 'Matching' : 'Pronunciation'}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              {currentCategory.title} Vocabulary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {learningMode === LEARNING_MODES.FLASHCARD && renderFlashcardMode()}
            {learningMode === LEARNING_MODES.BROWSE && renderBrowseMode()}
            {learningMode === LEARNING_MODES.MATCHING && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <Badge className="bg-blue-500 text-white">Pairs: {matchedCount}/{matchingPairs.length}</Badge>
                  <Badge className={`text-white ${matchTimer > 10 ? 'bg-green-500' : 'bg-red-500'}`}>Time: {matchTimer}s</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold mb-2">Drag English to match Arabic</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchingPairs.map((p, idx) => (
                        <div key={`e-${idx}`} draggable onDragStart={() => handleDragStart(p)} className="p-3 bg-white rounded-md shadow text-center cursor-move overflow-hidden">
                          <div className="text-xl sm:text-2xl mb-1">{p.emoji}</div>
                          <div className="font-bold text-sm sm:text-base break-words leading-tight">{p.english}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold mb-2">Drop on correct Arabic</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {matchingPairs.map((p, idx) => (
                        <div
                          key={`a-${idx}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(p.arabic)}
                          className="p-3 bg-white rounded-md shadow text-center border-2 border-dashed overflow-hidden"
                        >
                          <div className="text-xl sm:text-2xl mb-1">{p.emoji}</div>
                          <div className="text-blue-700 font-bold text-sm sm:text-base break-words leading-tight" dir="rtl" lang="ar">{p.arabic}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={startMatchingGame} className="bg-blue-500 text-white">Start</Button>
                  <Button onClick={() => { setMatchedCount(0); setMatchTimer(60); setMatchActive(false); setMatchAwarded(false); }} variant="outline">Reset</Button>
                </div>
              </div>
            )}
            {learningMode === LEARNING_MODES.LISTENING && (
              <div className="space-y-6 text-center max-w-xl mx-auto">
                <div className="text-4xl sm:text-5xl">🎤</div>
                <div className="text-lg sm:text-xl font-bold">Say: {currentCategory.words[pronounceIndex]?.arabic}</div>
                <div className="text-gray-500 text-sm sm:text-base">[{currentCategory.words[pronounceIndex]?.transliteration}]</div>
                <div className="flex justify-center gap-2">
                  <Button onClick={startListening} className={`flex items-center gap-2 ${listeningActive ? 'bg-gray-400' : 'bg-green-500'} text-white`} disabled={listeningActive}>
                    <Headphones className="w-4 h-4" />
                    Tap Mic
                  </Button>
                  <Button onClick={nextPronounce} variant="outline">Next Word</Button>
                </div>
                {pronounceCorrect != null && (
                  <div className={`mx-auto max-w-md p-4 rounded-lg ${pronounceCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {pronounceCorrect ? '✔ Correct pronunciation!' : '🔁 Try again'}
                  </div>
                )}
                {lastHeard && (
                  <div className="text-sm text-gray-600">Heard: {lastHeard}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  {languageMode === 'english-arabic' ? 'English to Arabic Favorites' : 'Arabic to English Favorites'} ({favorites.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {favorites.map((word, index) => (
                    <div key={index} className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
                      <div className="font-bold text-gray-800">
                        {languageMode === 'english-arabic' ? word.english : word.arabic}
                      </div>
                      <div className="text-base sm:text-lg text-blue-600">
                        {languageMode === 'english-arabic' ? word.arabic : word.english}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">{word.transliteration}</div>
                      <div className="text-[11px] sm:text-xs text-gray-500">[{word.pronunciation}]</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
