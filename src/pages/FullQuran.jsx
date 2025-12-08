
import { useState, useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // Added for search functionality
import { motion } from "framer-motion";
import { BookOpen, Volume2, Play, ChevronDown, ChevronUp, Loader2, Search, Repeat, StopCircle, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import PropTypes from 'prop-types';
 
import { fetchSajdaList, TRANSLATIONS as CLOUD_TRANSLATIONS, getAudioEdition as cloudAudioEdition } from '@/api/quranCloud.js';
import { setSurahCache, getSurahCache, setJuzCache, getJuzCache } from '@/api/quranOfflineDb.js';
import { getQuarterStart } from '@/api/juzQuarterMap.js';
import { supabase } from '@/api/supabaseClient'

const defaultReciters = [
  { id: "alafasy", name: "Mishary Rashid Alafasy", url: "https://server8.mp3quran.net/afs/", flag: "🇰🇼" },
  { id: "sudais", name: "Abdur-Rahman As-Sudais", url: "https://server11.mp3quran.net/sds/", flag: "🇸🇦" },
  { id: "basit", name: "Abdul Basit", url: "https://server7.mp3quran.net/basit/", flag: "🇪🇬" },
  { id: "husary", name: "Mahmoud Khalil Al-Husary", url: "https://server13.mp3quran.net/husr/", flag: "🇪🇬" },
  { id: "awhaneef", name: "Abdul Wadud Haneef", url: "https://download.quranicaudio.com/quran/abdul_wadud_haneef/", flag: "🇸🇦" },
  { id: "ghamdi", name: "Saad Al-Ghamdi", url: "https://download.quranicaudio.com/quran/saad_al_ghamdi/", flag: "🇸🇦" },
  { id: "maher", name: "Maher Al-Muaiqly", url: "https://download.quranicaudio.com/quran/maher_al_muaiqly/", flag: "🇸🇦" },
];

const surahs = [
  { number: 1, name: "Al-Fatihah", englishName: "The Opening", verses: 7, revelation: "Meccan" },
  { number: 2, name: "Al-Baqarah", englishName: "The Cow", verses: 286, revelation: "Medinan" },
  { number: 3, name: "Ali 'Imran", englishName: "Family of Imran", verses: 200, revelation: "Medinan" },
  { number: 4, name: "An-Nisa", englishName: "The Women", verses: 176, revelation: "Medinan" },
  { number: 5, name: "Al-Ma'idah", englishName: "The Table Spread", verses: 120, revelation: "Medinan" },
  { number: 6, name: "Al-An'am", englishName: "The Cattle", verses: 165, revelation: "Meccan" },
  { number: 7, name: "Al-A'raf", englishName: "The Heights", verses: 206, revelation: "Meccan" },
  { number: 8, name: "Al-Anfal", englishName: "The Spoils of War", verses: 75, revelation: "Medinan" },
  { number: 9, name: "At-Tawbah", englishName: "The Repentance", verses: 129, revelation: "Medinan" },
  { number: 10, name: "Yunus", englishName: "Jonah", verses: 109, revelation: "Meccan" },
  { number: 36, name: "Ya-Sin", englishName: "Ya-Sin", verses: 83, revelation: "Meccan" },
  { number: 55, name: "Ar-Rahman", englishName: "The Beneficent", verses: 78, revelation: "Medinan" },
  { number: 67, name: "Al-Mulk", englishName: "The Sovereignty", verses: 30, revelation: "Meccan" },
  { number: 112, name: "Al-Ikhlas", englishName: "The Sincerity", verses: 4, revelation: "Meccan" },
  { number: 113, name: "Al-Falaq", englishName: "The Daybreak", verses: 5, revelation: "Meccan" },
  { number: 114, name: "An-Nas", englishName: "Mankind", verses: 6, revelation: "Meccan" }
];

// Translations list (includes Urdu options)
const translations = CLOUD_TRANSLATIONS;

// Commonly used Juz (Para) names to make selection intuitive
const JUZ_NAMES = [
  { number: 1, name: "Alif Lām Mīm" },
  { number: 2, name: "Sayaqūl" },
  { number: 3, name: "Tilka ar-Rusul" },
  { number: 4, name: "Lan Tanālu" },
  { number: 5, name: "Wal Muḥsanāt" },
  { number: 6, name: "Lā Yuḥibbullāhu al-jahr" },
  { number: 7, name: "Wa Iḏā Samiʿū" },
  { number: 8, name: "Wa Lau'annā" },
  { number: 9, name: "Qāl al-Mala'u" },
  { number: 10, name: "Wa Aʿlamū" },
  { number: 11, name: "Yataḏakkarūn" },
  { number: 12, name: "Wa Mā Ubarriʾu Nafsi" },
  { number: 13, name: "Wa Mā Uʾūtītum" },
  { number: 14, name: "Rubamā" },
  { number: 15, name: "Subḥānalladhī" },
  { number: 16, name: "Qāla Alam" },
  { number: 17, name: "Iqtaraba" },
  { number: 18, name: "Qad Aflaha" },
  { number: 19, name: "Wa Qālalladhīna" },
  { number: 20, name: "Aʿmān" },
  { number: 21, name: "Utlu Mā" },
  { number: 22, name: "Wa Māli" },
  { number: 23, name: "Wa Mā Lī" },
  { number: 24, name: "Faman Aẓlamu" },
  { number: 25, name: "Ilayhi Yuraddu" },
  { number: 26, name: "Ḥāʾ Mīm" },
  { number: 27, name: "Qāla Fama" },
  { number: 28, name: "Qad Samiʿallāhu" },
  { number: 29, name: "Tabārakalladhī" },
  { number: 30, name: "ʿAmma" }
];

// Urdu script Juz (Para) names for users who prefer Urdu labels
const JUZ_NAMES_URDU = [
  { number: 1, name: "الم" },
  { number: 2, name: "سَيَقُولُ" },
  { number: 3, name: "تِلْكَ الرُّسُلُ" },
  { number: 4, name: "لَنْ تَنَالُوا" },
  { number: 5, name: "وَٱلْمُحْصَنَاتُ" },
  { number: 6, name: "لَا يُحِبُّ ٱللَّهُ ٱلْجَهْرَ" },
  { number: 7, name: "وَإِذَا سَمِعُوا" },
  { number: 8, name: "وَلَوْ أَنَّنَا" },
  { number: 9, name: "قَالَ ٱلْمَلَأُ" },
  { number: 10, name: "وَٱعْلَمُوا" },
  { number: 11, name: "يَتَذَّرُونَ" },
  { number: 12, name: "وَمَا أُبَرِّئُ نَفْسِي" },
  { number: 13, name: "وَمَا أُوتِيتُمْ" },
  { number: 14, name: "رُبَمَا" },
  { number: 15, name: "سُبْحَانَ ٱلَّذِي" },
  { number: 16, name: "قَالَ أَلَمْ" },
  { number: 17, name: "ٱقْتَرَبَ" },
  { number: 18, name: "قَدْ أَفْلَحَ" },
  { number: 19, name: "وَقَالَ ٱلَّذِينَ" },
  { number: 20, name: "أَمَّنْ" },
  { number: 21, name: "ٱتْلُ مَا" },
  { number: 22, name: "وَمَالِي" },
  { number: 23, name: "وَمَا لِيَ" },
  { number: 24, name: "فَمَنْ أَظْلَمُ" },
  { number: 25, name: "إِلَيْهِ يُرَدُّ" },
  { number: 26, name: "حم" },
  { number: 27, name: "قَالَ فَمَا" },
  { number: 28, name: "قَدْ سَمِعَ ٱللَّهُ" },
  { number: 29, name: "تَبَارَكَ ٱلَّذِي" },
  { number: 30, name: "عَمَّ" }
];


  const VerseCard = ({ verse, expanded, onToggle, onPlay, isHighlighted = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow mb-4 ${
        isHighlighted ? 'ring-2 ring-green-500 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className="bg-green-600 text-white text-sm px-3 py-1">
            {verse.numberInSurah}
          </Badge>
          {verse.isSajda && (
            <Badge className="bg-orange-500 text-white text-xs px-2 py-1" title="Sajda Ayah">
              <AlertTriangle className="w-3 h-3 mr-1 inline" /> Sajda
            </Badge>
          )}
        </div>
        <div className="flex-1">
          <p
            dir="rtl"
            style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
            onClick={() => onPlay && onPlay(verse)}
            title="Click to play ayah audio"
            role="button"
            className="text-right text-2xl md:text-3xl leading-loose mb-4 font-arabic cursor-pointer hover:text-green-700 text-green-900"
          >
            {verse.arabic}
          </p>
          <p className="text-gray-700 leading-relaxed text-base">
            {verse.translation}
          </p>

          

          {verse.tafsir && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(verse.numberInSurah)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Tafsir
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Tafsir
                  </>
                )}
              </Button>

              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <p className="text-sm font-semibold text-blue-900 mb-2">📚 Tafsir (Explanation):</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{verse.tafsir}</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

VerseCard.propTypes = {
  verse: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onPlay: PropTypes.func,
};

export default function FullQuran() {
  const location = useLocation();
  const [selectedSurah, setSelectedSurah] = useState(surahs[0]); // Initialize with first surah object
  const [reciters, setReciters] = useState(defaultReciters);
  const [selectedReciter, setSelectedReciter] = useState(defaultReciters[0]);
  const [selectedTranslation, setSelectedTranslation] = useState(translations[0]); // Initialize with first translation object
  const [searchQuery, setSearchQuery] = useState("");
  const [surahVerses, setSurahVerses] = useState([]);
  const [juzVerses, setJuzVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Renamed from 'playing' for clarity
  const [expandedVerse, setExpandedVerse] = useState(null);
  const [repeat, setRepeat] = useState(false);
  const [playbackMode, setPlaybackMode] = useState('verse');
  const [playingVerseNumber, setPlayingVerseNumber] = useState(null);
  const [isSurahSequence, setIsSurahSequence] = useState(false);
  const [surahPlayIndex, setSurahPlayIndex] = useState(null);
  const [sajdaSet, setSajdaSet] = useState(new Set());

  // Read query params for deep links (e.g., ?surah=36)
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const surahParam = params.get('surah');
    if (surahParam) {
      const num = Number(surahParam);
      const found = surahs.find(s => s.number === num);
      if (found) {
        setSelectedSurah(found);
      }
    }
  }, [location.search]);

  
  

  // Verse refs for scrolling when selecting an ayah
  const verseRefs = useRef({});
  // Highlight state for QA: which verse to visually emphasize after deep-link scroll
  const [highlightVerse, setHighlightVerse] = useState(null);

  const audioRef = useRef(null);
  const isStartingRef = useRef(false);
  const ensureHttps = (u) => (typeof u === 'string' && u.startsWith('http://') ? 'https://' + u.slice('http://'.length) : u);

  // Function to stop any currently playing audio
  const stopCurrentAudio = () => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}
      a.src = '';
      setIsPlaying(false);
    }
    setIsSurahSequence(false);
    setSurahPlayIndex(null);
  };

  

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
      stopCurrentAudio();
    };
  }, []);

  // Load available reciters from Supabase (if configured)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('quran_reciters').select('*').eq('active', true);
        if (!mounted || error || !Array.isArray(data) || data.length === 0) return;
        const rows = data.map(r => ({
          id: r.id,
          name: r.name,
          url: r.base_url,
          flag: r.flag || '🎧',
          supportsVerseAudio: !!r.supports_verse_audio,
          verseEditionId: r.verse_edition_id || null,
        }));
        setReciters(rows);
        const current = rows.find(x => x.id === selectedReciter?.id) || rows[0];
        if (current) setSelectedReciter(current);
      } catch {}
    })();
    return () => { mounted = false };
  }, []);

  // Load Sajda list once
  useEffect(() => {
    let mounted = true;
    fetchSajdaList().then((list) => {
      if (!mounted) return;
      const s = new Set(list.map((x) => `${x.surah}-${x.ayah}`));
      setSajdaSet(s);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Load surah verses when selectedSurah or selectedTranslation changes
  useEffect(() => {
    if (selectedSurah) {
      loadSurah(selectedSurah.number, selectedTranslation.id);
    }
  }, [selectedSurah, selectedTranslation]);

  

  

  // Map reciter to audio edition for verse-level audio (default to Alafasy)
  const getAudioEditionForReciter = () => {
    if (selectedReciter?.supportsVerseAudio && selectedReciter?.verseEditionId) {
      return selectedReciter.verseEditionId;
    }
    const mapped = cloudAudioEdition?.(selectedReciter?.id);
    return mapped || "ar.alafasy";
  };

  const loadSurah = async (surahNum, translationId) => {
    setLoading(true);
    stopCurrentAudio(); // Stop audio when a new surah is loading or translation changes
    try {
      const audioEdition = getAudioEditionForReciter();
      // Use cache if available
      const cacheKey = `${surahNum}|${translationId}|${audioEdition}`;
      const cached = await getSurahCache(cacheKey);
      if (cached?.verses?.length) {
        setSurahVerses(cached.verses.map(v => ({
          ...v,
          isSajda: sajdaSet.has(`${surahNum}-${v.numberInSurah}`),
          tafsir: v.tafsir || null,
        })));
      } else {
        const response = await fetch(
          `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-simple,${translationId},${audioEdition}`
        );
        const data = await response.json();

        if (data.status === "OK") {
          const arabicAyahs = data.data[0].ayahs;
          const englishAyahs = data.data[1] ? data.data[1].ayahs : []; // Check if translation data exists
          const audioAyahs = data.data[2] ? data.data[2].ayahs : [];

          const formattedVerses = arabicAyahs.map((ayah, index) => ({
            numberInSurah: ayah.numberInSurah,
            arabic: ayah.text,
            translation: englishAyahs[index] ? englishAyahs[index].text : "Translation not available for this verse.",
            tafsir: null,
            audio: ensureHttps(audioAyahs[index]?.audio || null),
            surahNumber: surahNum,
            isSajda: sajdaSet.has(`${surahNum}-${ayah.numberInSurah}`),
          }));

          setSurahVerses(formattedVerses);
          // Save to cache
          setSurahCache(cacheKey, { verses: formattedVerses, cachedAt: Date.now() }).catch(() => {});
        } else {
          toast.error("Failed to load surah details from API.");
        }
      }
    } catch (error) {
      console.error("Error loading surah:", error);
      toast.error("Failed to load surah. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const loadJuz = async (juzNum, translationId) => {
    setLoading(true);
    stopCurrentAudio();
    const audioEdition = getAudioEditionForReciter();
    const buildUrl = (scriptEdition) => {
      const editions = [scriptEdition, translationId, audioEdition].filter(Boolean);
      return `https://api.alquran.cloud/v1/juz/${juzNum}/editions/${editions.join(',')}`;
    };
    try {
      const cacheKey = `${juzNum}|${translationId}|${audioEdition}`;
      const cached = await getJuzCache(cacheKey);
      if (cached?.verses?.length) {
        setJuzVerses(cached.verses.map(v => ({
          ...v,
          isSajda: sajdaSet.has(`${v.surahNumber}-${v.numberInSurah}`),
        })));
      } else {
        // First try our API wrapper (handles uthmani/simple fallback and formatting)
        try {
          const formattedViaWrapper = await cloudFetchJuz({
            juzNumber: juzNum,
            translationId,
            audioEdition,
          });
          const formatted = (formattedViaWrapper || []).map(v => ({
            ...v,
            isSajda: sajdaSet.has(`${v.surahNumber}-${v.numberInSurah}`),
          }));
          setJuzVerses(formatted);
          setJuzCache(cacheKey, { verses: formatted, cachedAt: Date.now() }).catch(() => {});
          if (!formatted.length) {
            // If wrapper returned empty, attempt a direct fetch as a secondary fallback
            let res = await fetch(buildUrl("quran-uthmani"));
            let data = await res.json();
            if (data.status !== "OK" || !data?.data?.[0]?.ayahs?.length) {
              res = await fetch(buildUrl("quran-simple"));
              data = await res.json();
            }

            if (data.status === "OK") {
              const arabicAyahs = data.data[0]?.ayahs || [];
              const translationAyahs = data.data[1]?.ayahs || [];
              const audioAyahs = data.data[2]?.ayahs || [];
              const translationMap = new Map();
              for (const t of translationAyahs) {
                const key = `${t?.surah?.number}-${t?.numberInSurah}`;
                if (key) translationMap.set(key, t?.text ?? "");
              }
              const audioMap = new Map();
              for (const a of audioAyahs) {
                const key = `${a?.surah?.number}-${a?.numberInSurah}`;
                if (key) audioMap.set(key, ensureHttps(a?.audio ?? null));
              }
              const formattedDirect = arabicAyahs.map((ayah) => {
                const key = `${ayah?.surah?.number}-${ayah?.numberInSurah}`;
                return {
                  surahNumber: ayah.surah.number,
                  surahName: ayah.surah.englishName || ayah.surah.name,
                  numberInSurah: ayah.numberInSurah,
                  arabic: ayah.text,
                  translation: translationMap.get(key) || "",
                  audio: audioMap.get(key) || null,
                  isSajda: sajdaSet.has(`${ayah.surah.number}-${ayah.numberInSurah}`),
                };
              });
              setJuzVerses(formattedDirect);
              setJuzCache(cacheKey, { verses: formattedDirect, cachedAt: Date.now() }).catch(() => {});
              if (!formattedDirect.length) {
                toast.info("No verses loaded for this Juz. Try a different translation or check your network.");
              }
            } else {
              toast.error("Failed to load Juz.");
            }
          }
        } catch (innerErr) {
          // If wrapper throws, attempt direct fetch immediately
          let res = await fetch(buildUrl("quran-uthmani"));
          let data = await res.json();
          if (data.status !== "OK" || !data?.data?.[0]?.ayahs?.length) {
            res = await fetch(buildUrl("quran-simple"));
            data = await res.json();
          }
          if (data.status === "OK") {
            const arabicAyahs = data.data[0]?.ayahs || [];
            const translationAyahs = data.data[1]?.ayahs || [];
            const audioAyahs = data.data[2]?.ayahs || [];
            const translationMap = new Map();
            for (const t of translationAyahs) {
              const key = `${t?.surah?.number}-${t?.numberInSurah}`;
              if (key) translationMap.set(key, t?.text ?? "");
            }
            const audioMap = new Map();
            for (const a of audioAyahs) {
              const key = `${a?.surah?.number}-${a?.numberInSurah}`;
              if (key) audioMap.set(key, ensureHttps(a?.audio ?? null));
            }
            const formatted = arabicAyahs.map((ayah) => {
              const key = `${ayah?.surah?.number}-${ayah?.numberInSurah}`;
              return {
                surahNumber: ayah.surah.number,
                surahName: ayah.surah.englishName || ayah.surah.name,
                numberInSurah: ayah.numberInSurah,
                arabic: ayah.text,
                translation: translationMap.get(key) || "",
                audio: audioMap.get(key) || null,
                isSajda: sajdaSet.has(`${ayah.surah.number}-${ayah.numberInSurah}`),
              };
            });
            setJuzVerses(formatted);
            setJuzCache(cacheKey, { verses: formatted, cachedAt: Date.now() }).catch(() => {});
            if (!formatted.length) {
              toast.info("No verses loaded for this Juz. Try a different translation or check your network.");
            }
          } else {
            toast.error("Failed to load Juz.");
          }
        }
      }
    } catch (error) {
      console.error("Error loading juz:", error);
      toast.error("Failed to load Juz. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (audioUrl, verseNumber = null, onEnded = null) => {
    if (!audioUrl) {
      toast.error("No audio available for this selection.");
      return;
    }
    if (isStartingRef.current) {
      // Prevent rapid double-start triggering AbortError
      return;
    }
    isStartingRef.current = true;
    try {
      stopCurrentAudio();
      const a = audioRef.current;
      if (!a) {
        isStartingRef.current = false;
        return;
      }
      a.loop = repeat;
      a.src = audioUrl;
      await a.play();
      setIsPlaying(true);
      setPlayingVerseNumber(verseNumber);

      a.onended = () => {
        if (typeof onEnded === "function") {
          onEnded();
          return;
        }
        if (!repeat) {
          setIsPlaying(false);
          setPlayingVerseNumber(null);
        }
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        // Benign interruption (e.g., user pressed stop while starting). Don't show error toast.
        console.debug("Audio play aborted (pause/stop triggered). Ignoring.");
      } else {
        console.error("Error playing audio:", error);
        toast.error("Unable to play audio. The reciter might not have audio for this ayah/surah, or there's a network issue.");
      }
      setIsPlaying(false);
      setPlayingVerseNumber(null);
    } finally {
      isStartingRef.current = false;
    }
  };

  const playFullSurahAudio = async () => {
    if (!selectedReciter || !selectedSurah) {
      toast.error("Please select a Surah and Reciter first.");
      return;
    }
    const surahNumber = selectedSurah.number.toString().padStart(3, "0");
    const candidates = [
      `${selectedReciter.url}${surahNumber}.mp3`,
      `${reciters.find(r => r.id === 'alafasy')?.url || ''}${surahNumber}.mp3`,
      `${reciters.find(r => r.id === 'ghamdi')?.url || ''}${surahNumber}.mp3`,
    ].filter(Boolean);
    stopCurrentAudio();
    const a = audioRef.current;
    if (!a) return;
    a.loop = false;
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) {
        toast.error('Unable to play full surah audio from available sources.');
        setIsPlaying(false);
        return;
      }
      const url = candidates[idx++];
      a.src = url;
      a.oncanplay = () => {
        a.oncanplay = null;
        a.onerror = null;
        a.play().then(() => setIsPlaying(true)).catch(() => tryNext());
      };
      a.onerror = () => {
        tryNext();
      };
    };
    tryNext();
  };

  const pauseAudio = () => {
    // Stop current audio, but preserve juzPlayIndex so we can resume later
    stopCurrentAudio();
    setIsJuzSequence(false);
    setIsSurahSequence(false);
  };

  const toggleRepeat = () => {
    const next = !repeat;
    setRepeat(next);
    if (audioRef.current) audioRef.current.loop = next;
  };

  const onPlayVerse = (verse) => {
    if (Array.isArray(surahVerses) && surahVerses.length > 0) {
      const idx = surahVerses.findIndex(v => v.numberInSurah === verse.numberInSurah);
      if (idx >= 0) {
        startSurahSequenceAt(idx);
        return;
      }
    }
    if (verse?.audio) {
      handlePlayAudio(verse.audio, verse.numberInSurah);
    } else {
      toast.info("Ayah audio not available for this reciter. Playing full surah instead.");
      playFullSurahAudio();
    }
  };

  const onSelectAyah = (num) => {
    const v = surahVerses.find(v => v.numberInSurah === num);
    if (v) {
      // Scroll into view
      const ref = verseRefs.current[num];
      if (ref && ref.scrollIntoView) ref.scrollIntoView({ behavior: "smooth", block: "center" });
      // Play audio
      onPlayVerse(v);
    }
  };

  const jumpToStartOfJuz = () => {
    const el = verseRefs.current?.juzStart;
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  

  // Surah sequence playback starting at given index
  const startSurahSequenceAt = (startIdx = 0) => {
    if (!selectedSurah) {
      toast.error("Please select a Surah first.");
      return;
    }
    if (!surahVerses || surahVerses.length === 0) {
      toast.error("No ayat loaded for this Surah yet. Please wait or reselect the Surah.");
      return;
    }
    setIsSurahSequence(true);
    setSurahPlayIndex(startIdx);

    const playAtIndex = (idx) => {
      const verse = surahVerses[idx];
      if (!verse) {
        setIsSurahSequence(false);
        setPlayingVerseNumber(null);
        setIsPlaying(false);
        return;
      }

      const onVerseEnded = () => {
        if (repeat) return; // audio.loop handles repeat
        const next = idx + 1;
        if (next < surahVerses.length) {
          setSurahPlayIndex(next);
          playAtIndex(next);
        } else {
          setIsSurahSequence(false);
          setPlayingVerseNumber(null);
          setIsPlaying(false);
        }
      };

      setPlayingVerseNumber(verse.numberInSurah);
      if (verse.audio) {
        handlePlayAudio(verse.audio, verse.numberInSurah, onVerseEnded);
      } else {
        const surahNumberStr = String(selectedSurah.number).padStart(3, "0");
        const surahAudioUrl = `${selectedReciter.url}${surahNumberStr}.mp3`;
        toast.info("Verse-level audio unavailable; playing full surah audio as fallback.");
        handlePlayAudio(surahAudioUrl, verse.numberInSurah, onVerseEnded);
      }
    };

    playAtIndex(startIdx);
  };

  

  const handleReciterChange = (reciter) => {
    stopCurrentAudio(); // Stop current audio if playing
    setSelectedReciter(reciter);
  };

  const handleSurahSelect = (surah) => {
    stopCurrentAudio(); // Stop current audio if playing
    setSelectedSurah(surah);
  };

  const handleTranslationChange = (translationId) => {
    const newTranslation = translations.find(t => t.id === translationId);
    if (newTranslation) {
      setSelectedTranslation(newTranslation);
      // loadSurah will be triggered by the useEffect on selectedTranslation change
    }
  };

  const filteredSurahs = surahs.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString().includes(searchQuery)
  );

  const downloadCurrentSelection = async () => {
    try {
      if (selectedSurah) {
        const audioEdition = getAudioEditionForReciter();
        const cacheKey = `${selectedSurah.number}|${selectedTranslation.id}|${audioEdition}`;
        if (surahVerses.length) {
          await setSurahCache(cacheKey, { verses: surahVerses, cachedAt: Date.now() });
        } else {
          await loadSurah(selectedSurah.number, selectedTranslation.id);
        }
        toast.success(`Surah ${selectedSurah.name} cached for offline use.`);
      }
    } catch (e) {
      toast.error('Failed to cache selection.');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap');
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            The Noble Qur&apos;an
          </h1>
          <p className="text-lg text-gray-600">
            Read, listen, and understand Allah&apos;s words
          </p>
        </motion.div>

        <Card className="mb-8 border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50">
            <CardTitle>Select Reciter, Surah & Translation</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Choose Reciter
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {reciters.map((reciter) => (
                    <Button
                      key={reciter.id}
                      onClick={() => handleReciterChange(reciter)}
                      variant={selectedReciter.id === reciter.id ? "default" : "outline"}
                      className={`h-auto py-3 px-4 ${
                        selectedReciter.id === reciter.id
                          ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="text-center w-full">
                        <div className="text-2xl mb-1">{reciter.flag}</div>
                        <p className="text-xs font-semibold truncate">{reciter.name}</p>
                        <p className="text-[10px] mt-1 text-gray-700">
                          {reciter.supportsVerseAudio ? 'Verse audio available' : 'Full surah only'}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={playbackMode === 'verse' ? 'default' : 'outline'} onClick={() => setPlaybackMode('verse')}>Verse-by-verse</Button>
                  <Button size="sm" variant={playbackMode === 'full' ? 'default' : 'outline'} onClick={() => setPlaybackMode('full')}>Full surah</Button>
                </div>
              </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Choose Translation
              </label>
              <Select
                value={selectedTranslation.id}
                onValueChange={handleTranslationChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a translation" />
                </SelectTrigger>
                <SelectContent>
                  {translations.map((translation) => (
                    <SelectItem key={translation.id} value={translation.id}>
                      {translation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search & Choose Surah
              </label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search Surah by name or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 w-full"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredSurahs.map((surah) => (
                  <Button
                    key={surah.number}
                    onClick={() => handleSurahSelect(surah)}
                    variant={selectedSurah?.number === surah.number ? "default" : "outline"}
                    className={`h-auto py-3 px-4 ${
                      selectedSurah?.number === surah.number
                        ? "bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold">{surah.name}</p>
                      <p className="text-xs text-gray-500">({surah.englishName})</p>
                    </div>
                  </Button>
                ))}
              </div>
              {filteredSurahs.length === 0 && searchQuery && (
                <p className="text-center text-gray-500 mt-4">No surahs found for "{searchQuery}"</p>
              )}
            </div>

            {/* Ayah & Juz selection controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Ayah (verse)</label>
                <Select onValueChange={(val) => onSelectAyah(Number(val))} disabled={!selectedSurah}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose Ayah number" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSurah && Array.from({ length: selectedSurah.verses }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Audio Controls</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={pauseAudio} variant="outline" className="flex-1">
                    <StopCircle className="w-4 h-4 mr-1" /> Stop
                  </Button>
                  <Button onClick={toggleRepeat} variant={repeat ? "default" : "outline"} className="flex-1">
                    <Repeat className="w-4 h-4 mr-1" /> {repeat ? "Repeat: On" : "Repeat: Off"}
                  </Button>
                  <Button onClick={downloadCurrentSelection} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-1" /> Cache Offline
                  </Button>
                </div>
              </div>
              </div>

            <Button
              onClick={() => {
                if (isPlaying) {
                  pauseAudio();
                  return;
                }
                if (playbackMode === 'full') {
                  playFullSurahAudio();
                } else {
                  startSurahSequenceAt(0);
                }
              }}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              size="lg"
              disabled={false}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {"Loading Surah..."}
                </>
              ) : isPlaying ? (
                <>
                  <StopCircle className="w-5 h-5 mr-2" />
                  Stop Audio
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  {playbackMode === 'full' ? "Play Full Surah" : "Play Surah (verse)"}
                </>
              )}
            </Button>
            
            {/* Juz-specific controls */}
            
          </CardContent>
        </Card>

        {selectedSurah && (
          <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedSurah.name}
                  </h2>
                  <p className="text-lg text-gray-700 mb-1">
                    {selectedSurah.englishName}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Badge className="bg-blue-600">
                      {selectedSurah.verses} Verses
                    </Badge>
                    <Badge className="bg-purple-600">
                      {selectedSurah.revelation}
                    </Badge>
                  </div>
                </div>
      <div className="flex items-center gap-3 flex-wrap">
        <BookOpen className="w-8 h-8 text-blue-600" />
        <Volume2 className="w-8 h-8 text-green-600" />
        
      </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedSurah && selectedSurah.number !== 9 && selectedSurah.number !== 1 && (
          <div className="text-center py-6 mb-6 border-b-2 border-green-200 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
            <p
              className="text-4xl md:text-5xl mb-3 font-arabic"
              dir="rtl"
              style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
            <p className="text-sm text-gray-600 font-medium">
              In the name of Allah, the Most Gracious, the Most Merciful
            </p>
          </div>
        )}

        {loading && !isPlaying ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600">{"Loading Surah Verses..."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {surahVerses.map((verse, idx) => (
              <div key={`${verse.surahNumber || selectedSurah?.number}-${verse.numberInSurah}`}
                   ref={(el) => {
                     verseRefs.current[verse.numberInSurah] = el;
                     if (!verseRefs.current.byIndex) verseRefs.current.byIndex = [];
                     verseRefs.current.byIndex[idx] = el;
                   }}>
                <VerseCard
                  verse={verse}
                  expanded={expandedVerse === verse.numberInSurah}
                  onToggle={(verseNum) =>
                    setExpandedVerse(expandedVerse === verseNum ? null : verseNum)
                  }
                  onPlay={onPlayVerse}
                  isHighlighted={!!(highlightVerse && highlightVerse.surah === verse.surahNumber && highlightVerse.ayah === verse.numberInSurah)}
                />
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button onClick={() => onPlayVerse(verse)} className="bg-green-600">
                    <Play className="w-4 h-4 mr-1" /> Play Ayah
                  </Button>
                  <Button onClick={pauseAudio} variant="outline">
                    <StopCircle className="w-4 h-4 mr-1" /> Stop
                  </Button>
                  <Button onClick={toggleRepeat} variant={repeat ? "default" : "outline"}>
                    <Repeat className="w-4 h-4 mr-1" /> {repeat ? "Repeat On" : "Repeat Off"}
                  </Button>
                  {playingVerseNumber === verse.numberInSurah && isPlaying && (
                    <Badge className="bg-green-600">Playing</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
