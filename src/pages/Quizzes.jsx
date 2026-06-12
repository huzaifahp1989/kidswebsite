import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { awardPointsForGame } from "@/api/points";
import { trackQuizCompletionAndMaybeReview, trackPointsMilestoneAndMaybeReview } from "@/utils/inAppReview";
import { watchAuth, getUserProfile } from "@/api/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Clock, Target, Star, CheckCircle2, XCircle, Award, Brain, BookOpen } from "lucide-react";
// Supabase removed
 

const localQuizzes = [
  {
    id: "local_aqeedah_1",
    title: "Aqeedah Basics",
    description: "Core beliefs in Islam",
    subject: "Aqeedah",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🧠",
    questions: [
      { id: "aq22", category: "Aqeedah", question: "How many articles of faith are there in Islam?", options: ["4", "5", "6", "10"], correct_answer_index: 2, explanation: "Six articles of faith.", source: "Iman" },
      { id: "aq23", category: "Aqeedah", question: "Which angel is responsible for blowing the trumpet?", options: ["Jibreel", "Mikail", "Israfeel", "Malik"], correct_answer_index: 2, explanation: "Israfeel blows the trumpet.", source: "Angels" },
      { id: "aq24", category: "Aqeedah", question: "Belief in Qadr means:", options: ["Angels’ creation", "Fate and destiny", "Prophethood", "Books"], correct_answer_index: 1, explanation: "Belief in divine decree.", source: "Iman" },
      { id: "aq25", category: "Aqeedah", question: "Who is the leader of all Prophets?", options: ["Musa", "Ibrahim", "Isa", "Muhammad ﷺ"], correct_answer_index: 3, explanation: "Prophet Muhammad ﷺ.", source: "Prophets" }
    ]
  },
  {
    id: "local_quran_1",
    title: "Quran Basics",
    description: "Key facts about the Qur'an",
    subject: "Quran",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    is_featured: true,
    icon: "📖",
    questions: [
      { id: "q1", category: "Quran", question: "Which Surah was the first revealed in the Qur’an?", options: ["Al-Fatiha", "Al-Muddathir", "Al-‘Alaq", "Al-Baqarah"], correct_answer_index: 2, explanation: "The first revelation was Surah Al-‘Alaq.", source: "Revelation" },
      { id: "q2", category: "Quran", question: "How many Makki surahs are there?", options: ["86", "28", "100", "72"], correct_answer_index: 0, explanation: "There are 86 Makki surahs.", source: "Makki/Medinan" },
      { id: "q3", category: "Quran", question: "Which Prophet is mentioned most in the Qur’an?", options: ["Musa", "Muhammad ﷺ", "Ibrahim", "Isa"], correct_answer_index: 0, explanation: "Prophet Musa is mentioned most.", source: "Quran" },
      { id: "q4", category: "Quran", question: "What does the word “Qur’an” mean?", options: ["Recitation", "Reading", "Writing", "Message"], correct_answer_index: 0, explanation: "Qur’an means recitation.", source: "Definition" },
      { id: "q5", category: "Quran", question: "Which Surah must be recited in every rak’ah of Salah?", options: ["Al-Falaq", "Al-Fatiha", "Al-Ikhlas", "Al-Kafirun"], correct_answer_index: 1, explanation: "Al-Fatiha is required in each rak’ah.", source: "Salah" }
    ]
  },
  {
    id: "local_hadith_1",
    title: "Hadith Essentials",
    description: "Core hadith knowledge for kids",
    subject: "Hadith",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "📜",
    questions: [
      { id: "h6", category: "Hadith", question: "Which book is the most authentic after the Qur’an?", options: ["Sahih Muslim", "Sunan Abi Dawood", "Sahih Bukhari", "Muwatta Malik"], correct_answer_index: 2, explanation: "Sahih Bukhari is considered most authentic.", source: "Hadith Collections" },
      { id: "h7", category: "Hadith", question: "The hadith “Actions are judged by intentions” is found in:", options: ["Bukhari & Muslim", "Abu Dawood", "Tirmidhi", "Nasai"], correct_answer_index: 0, explanation: "Reported by Bukhari and Muslim.", source: "Hadith" },
      { id: "h8", category: "Hadith", question: "What did Prophet ﷺ say is the best charity?", options: ["Helping animals", "Giving secretly", "Sadaqah Jariyah", "Feeding birds"], correct_answer_index: 2, explanation: "Sadaqah Jariyah is ongoing charity.", source: "Charity" },
      { id: "h9", category: "Hadith", question: "What does the Prophet ﷺ say cannot be removed from the heart once it enters?", options: ["Pride", "Love of Qur’an", "Brotherhood", "Hatred"], correct_answer_index: 0, explanation: "Pride remains unless repented.", source: "Character" }
    ]
  },
  {
    id: "local_seerah_1",
    title: "Seerah Highlights",
    description: "Life of the Prophet Muhammad ﷺ",
    subject: "Seerah",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🕌",
    questions: [
      { id: "s10", category: "Seerah", question: "How old was the Prophet ﷺ when his mother passed away?", options: ["4", "6", "8", "10"], correct_answer_index: 1, explanation: "Six years old.", source: "Seerah" },
      { id: "s11", category: "Seerah", question: "Where did Hijrah take the Muslims?", options: ["Badr", "Uhud", "Madinah", "Taif"], correct_answer_index: 2, explanation: "To Madinah.", source: "Hijrah" },
      { id: "s12", category: "Seerah", question: "What miracle happened during the Battle of the Trench?", options: ["Moon split", "Angels helping", "Rock breaking into sparks", "Water gushed from fingers"], correct_answer_index: 2, explanation: "Rock struck produced sparks and glad tidings.", source: "Trench" },
      { id: "s13", category: "Seerah", question: "Who was the nurse of the Prophet ﷺ?", options: ["Halimah Sa’diyyah", "Fatimah bint Asad", "Maryah", "Asma bint Abi Bakr"], correct_answer_index: 0, explanation: "Halimah Sa’diyyah was his wet nurse.", source: "Seerah" }
    ]
  },
  {
    id: "local_fiqh_1",
    title: "Fiqh Basics",
    description: "Simple rulings and worship",
    subject: "Fiqh",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "⚖️",
    questions: [
      { id: "f30", category: "Fiqh", question: "How many fard acts are in wudu?", options: ["2", "4", "6", "8"], correct_answer_index: 1, explanation: "There are four fard acts.", source: "Wudu" },
      { id: "f31", category: "Fiqh", question: "Which direction must a Muslim face in Salah?", options: ["East", "Kaaba", "North", "South"], correct_answer_index: 1, explanation: "Face the Kaaba/Qibla.", source: "Salah" },
      { id: "f32", category: "Fiqh", question: "Which prayer cannot be shortened while travelling?", options: ["Fajr", "Dhuhr", "Asr", "Isha"], correct_answer_index: 0, explanation: "Fajr stays two rak’ahs.", source: "Travel" },
      { id: "f33", category: "Fiqh", question: "What breaks wudu?", options: ["Sleeping lightly", "Touching Kaaba cover", "Passing wind", "Drinking water"], correct_answer_index: 2, explanation: "Passing wind breaks wudu.", source: "Wudu" }
    ]
  },
  {
    id: "local_salah_1",
    title: "Salah Basics",
    description: "Prayer essentials",
    subject: "Salah",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🕋",
    questions: [
      { id: "sl1", category: "Salah", question: "How many daily prayers?", options: ["3", "4", "5", "6"], correct_answer_index: 2, explanation: "Five daily prayers.", source: "Salah" },
      { id: "sl2", category: "Salah", question: "Which direction must a Muslim face in Salah?", options: ["East", "Kaaba", "North", "South"], correct_answer_index: 1, explanation: "Face the Kaaba/Qibla.", source: "Salah" },
      { id: "sl3", category: "Salah", question: "Which prayer cannot be shortened while travelling?", options: ["Fajr", "Dhuhr", "Asr", "Isha"], correct_answer_index: 0, explanation: "Fajr stays two rak’ahs.", source: "Travel" },
      { id: "sl4", category: "Salah", question: "What breaks wudu?", options: ["Sleeping lightly", "Touching Kaaba cover", "Passing wind", "Drinking water"], correct_answer_index: 2, explanation: "Passing wind breaks wudu.", source: "Wudu" }
    ]
  },
  {
    id: "local_prophets_1",
    title: "Prophets of Allah",
    description: "Stories of the Prophets",
    subject: "Prophets",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "⭐",
    questions: [
      { id: "p14", category: "Prophets", question: "Which Prophet built the Kaaba with his son?", options: ["Musa & Harun", "Adam & Idris", "Ibrahim & Ismail", "Dawood & Sulaiman"], correct_answer_index: 2, explanation: "Ibrahim and Ismail.", source: "Ka'bah" },
      { id: "p15", category: "Prophets", question: "Which Prophet was swallowed by a whale?", options: ["Yunus", "Isa", "Yusuf", "Nuh"], correct_answer_index: 0, explanation: "Prophet Yunus.", source: "Quran" },
      { id: "p16", category: "Prophets", question: "Which Prophet spoke from the cradle as a baby?", options: ["Isa", "Musa", "Yahya", "Idris"], correct_answer_index: 0, explanation: "Prophet Isa.", source: "Quran" },
      { id: "p17", category: "Prophets", question: "Which Prophet’s people were punished by stones from the sky?", options: ["Hud", "Salih", "Shu’ayb", "Lut"], correct_answer_index: 3, explanation: "People of Lut.", source: "Quran" }
    ]
  },
  {
    id: "local_sahabah_1",
    title: "Sahabah Knowledge",
    description: "Companions of the Prophet ﷺ",
    subject: "Sahabah",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🛡️",
    questions: [
      { id: "sa1", category: "Sahabah", question: "First Caliph?", options: ["Umar", "Uthman", "Ali", "Abu Bakr"], correct_answer_index: 3, explanation: "Abu Bakr as-Siddiq.", source: "Caliphs" },
      { id: "sa2", category: "Sahabah", question: "Muezzin known for his voice?", options: ["Abu Musa", "Bilal", "Ibn Mas'ud", "Ubay"], correct_answer_index: 1, explanation: "Bilal ibn Rabah.", source: "Voice" },
      { id: "sa3", category: "Sahabah", question: "Daughter of the Prophet ﷺ?", options: ["Fatimah", "Aisha", "Hafsa", "Zaynab"], correct_answer_index: 0, explanation: "Fatimah az-Zahra.", source: "Family" },
      { id: "sa4", category: "Sahabah", question: "Caliph titled al-Faruq?", options: ["Umar", "Uthman", "Ali", "Mu'awiya"], correct_answer_index: 0, explanation: "Umar ibn al-Khattab.", source: "Titles" }
    ]
  },
  {
    id: "local_akhlaq_1",
    title: "Akhlaq & Manners",
    description: "Islamic character and manners",
    subject: "Akhlaq",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "💖",
    questions: [
      { id: "ak26", category: "Akhlaq", question: "If someone hurts you, what is the best Islamic response?", options: ["Hurt back", "Ignore them", "Make dua for them & forgive", "Argue"], correct_answer_index: 2, explanation: "Forgive and make dua.", source: "Manners" },
      { id: "ak27", category: "Akhlaq", question: "Which act increases rizq (provision)?", options: ["Sleeping more", "Helping parents", "Eating more", "Complaining"], correct_answer_index: 1, explanation: "Helping parents increases rizq.", source: "Family" },
      { id: "ak28", category: "Akhlaq", question: "A Muslim should speak:", options: ["Loudly always", "Only when angry", "Good or stay silent", "Rudely"], correct_answer_index: 2, explanation: "Speak good or remain silent.", source: "Manners" },
      { id: "ak29", category: "Akhlaq", question: "What should you do if you break someone’s property?", options: ["Hide it", "Blame someone else", "Replace it or apologise", "Walk away"], correct_answer_index: 2, explanation: "Replace or apologise.", source: "Ethics" }
    ]
  },
  {
    id: "local_tawheed_1",
    title: "Tawheed Basics",
    description: "Oneness of Allah",
    subject: "Tawheed",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "☝️",
    questions: [
      { id: "tw1", category: "Tawheed", question: "Tawheed means?", options: ["Oneness of Allah", "Many gods", "Following desires", "Worship angels"], correct_answer_index: 0, explanation: "Oneness of Allah in Lordship, Names/Attributes, Worship.", source: "Belief" },
      { id: "tw2", category: "Tawheed", question: "Shirk is?", options: ["A minor error", "Associating partners with Allah", "Generosity", "Kindness"], correct_answer_index: 1, explanation: "Shirk is the gravest sin.", source: "Belief" },
      { id: "tw3", category: "Tawheed", question: "Which pillar affirms Tawheed?", options: ["Salah", "Shahadah", "Zakat", "Hajj"], correct_answer_index: 1, explanation: "Shahadah affirms Allah's oneness and Muhammad's prophethood.", source: "Pillars" },
      { id: "tw4", category: "Tawheed", question: "Acts of worship should be directed to?", options: ["Saints", "Prophets", "Allah alone", "Angels"], correct_answer_index: 2, explanation: "All worship is for Allah alone.", source: "Belief" }
    ]
  },
  {
    id: "local_history_1",
    title: "Islamic History",
    description: "Timeline and events",
    subject: "History",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🏺",
    questions: [
      { id: "hi1", category: "History", question: "Year of Hijrah?", options: ["610", "622", "630", "632"], correct_answer_index: 1, explanation: "622 CE.", source: "Timeline" },
      { id: "hi2", category: "History", question: "Conquest of Mecca year?", options: ["610", "622", "630", "632"], correct_answer_index: 2, explanation: "630 CE.", source: "Timeline" },
      { id: "hi3", category: "History", question: "Hudaibiyah is?", options: ["Battle", "Treaty", "City", "Surah"], correct_answer_index: 1, explanation: "Treaty of Hudaibiyah.", source: "Events" },
      { id: "hi4", category: "History", question: "First revelation year?", options: ["610", "622", "630", "632"], correct_answer_index: 0, explanation: "610 CE.", source: "Timeline" }
    ]
  },
  {
    id: "local_tajweed_1",
    title: "Tajweed Basics",
    description: "Rules of recitation",
    subject: "Tajweed",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🔤",
    questions: [
      { id: "tj18", category: "Tajweed", question: "What is Ikhfa?", options: ["Clear pronunciation", "Complete hiding", "Partial hiding of noon/ tanween", "Echoing sound"], correct_answer_index: 2, explanation: "Ikhfa is partial hiding.", source: "Rules" },
      { id: "tj19", category: "Tajweed", question: "Qalqalah occurs with how many letters?", options: ["3", "4", "5", "6"], correct_answer_index: 2, explanation: "Five letters of qalqalah.", source: "Rules" },
      { id: "tj20", category: "Tajweed", question: "What does Ghunnah mean?", options: ["Long vowel", "Nose sound", "Stopping", "Stretching"], correct_answer_index: 1, explanation: "A nasal sound.", source: "Rules" },
      { id: "tj21", category: "Tajweed", question: "Madd means:", options: ["To stop", "To stretch", "To hide", "To echo"], correct_answer_index: 1, explanation: "Madd means lengthening.", source: "Rules" }
    ]
  },
  {
    id: "local_ramadan_1",
    title: "Ramadan & Worship",
    description: "Fasting and worship basics",
    subject: "Ramadan",
    duration_minutes: 5,
    points_reward: 15,
    bonus_points: 10,
    icon: "🌙",
    questions: [
      { id: "rw34", category: "Ramadan", question: "Which night is better than 1,000 months?", options: ["Laylat al-Qadr", "15th Shaban", "Eid night", "Friday"], correct_answer_index: 0, explanation: "Laylat al-Qadr.", source: "Ramadan" },
      { id: "rw35", category: "Ramadan", question: "What invalidates fasting?", options: ["Forgetful eating", "Intentional eating", "Smelling food", "Showering"], correct_answer_index: 1, explanation: "Intentional eating breaks the fast.", source: "Fasting" },
      { id: "rw36", category: "Ramadan", question: "Who must pay Zakat?", options: ["Children always", "Anyone rich enough (Nisab)", "Only imams", "Only shop owners"], correct_answer_index: 1, explanation: "Those above nisab threshold.", source: "Zakat" }
    ]
  },
  {
    id: "local_dailylife_1",
    title: "Daily Life Scenarios",
    description: "Practical Islamic guidance",
    subject: "DailyLife",
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🧭",
    questions: [
      { id: "dl37", category: "DailyLife", question: "Your friend cheats in a school test. What is the Islamic teaching?", options: ["Encourage him", "Stay quiet", "Tell him cheating is haram", "Help him cheat"], correct_answer_index: 2, explanation: "Cheating is haram.", source: "Ethics" },
      { id: "dl38", category: "DailyLife", question: "You see someone dropping rubbish in the masjid. What should you do?", options: ["Ignore it", "Throw more", "Pick it up for Allah", "Shout at them"], correct_answer_index: 2, explanation: "Maintain cleanliness.", source: "Masjid" },
      { id: "dl39", category: "DailyLife", question: "Someone gives you a gift. What Sunnah should you follow?", options: ["Don’t say anything", "Say Alhamdulillah", "Say JazakAllah Khair & appreciate it", "Ask for a bigger gift"], correct_answer_index: 2, explanation: "Thank and appreciate.", source: "Sunnah" },
      { id: "dl40", category: "DailyLife", question: "You are angry. What should you do?", options: ["Stay standing", "Shout loudly", "Make wudu or sit down", "Hit something"], correct_answer_index: 2, explanation: "Change state and make wudu.", source: "Anger" }
    ]
  },
  {
    id: "local_mixed_1",
    title: "Mixed Knowledge",
    description: "A bit of everything",
    subject: "Mixed",
    is_full_quiz: true,
    version: 1,
    duration_minutes: 5,
    points_reward: 20,
    bonus_points: 10,
    icon: "🎯",
    questions: [
      { id: "mx41", category: "Mixed", question: "Which Sahabi was known as “The Sword of Allah”?", options: ["Abu Bakr", "Khalid ibn Waleed", "Umar", "Ali"], correct_answer_index: 1, explanation: "Khalid ibn Waleed.", source: "Sahabah" },
      { id: "mx42", category: "Mixed", question: "Who was the first mu’adhin of Islam?", options: ["Bilal", "Abu Musa", "Sa’d", "Zaid"], correct_answer_index: 0, explanation: "Bilal ibn Rabah.", source: "Sahabah" },
      { id: "mx43", category: "Mixed", question: "Which surah is equal to one-third of the Qur’an?", options: ["Al-Ikhlas", "Al-Falaq", "Al-Nas", "Al-Asr"], correct_answer_index: 0, explanation: "Surah Al-Ikhlas.", source: "Quran" },
      { id: "mx44", category: "Mixed", question: "Which Prophet had control over jinn?", options: ["Yusuf", "Sulaiman", "Ismail", "Adam"], correct_answer_index: 1, explanation: "Prophet Sulaiman.", source: "Quran" },
      { id: "mx45", category: "Mixed", question: "What is the biggest sin in Islam?", options: ["Backbiting", "Lying", "Shirk", "Anger"], correct_answer_index: 2, explanation: "Shirk is the gravest sin.", source: "Beliefs" }
    ]
  }
];

export default function Quizzes({ initialSubject = "all" } = {}) {
  const [user, setUser] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [filterSubject, setFilterSubject] = useState(initialSubject);
  const [fbUser, setFbUser] = useState(null);
  const [totalPoints, setTotalPoints] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const queryClient = useQueryClient();

  // Watch Firebase auth and mirror into local state for awarding
  useEffect(() => {
    const unsub = watchAuth((u) => {
      setFbUser(u);
      if (u) setUser({ id: u.uid, email: u.email || "" }); else setUser(null);
    });
    return () => unsub && unsub();
    
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (fbUser?.uid) {
          const p = await getUserProfile(fbUser.uid);
          setTotalPoints(Number((p?.total_points != null ? p.total_points : p?.points) || 0));
        }
      } catch { void 0; }
    })();
  }, [fbUser]);

  // Removed Base44 user bootstrap; Firebase auth drives user state

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      return localQuizzes;
    },
    initialData: [],
  });

  // Removed Base44 attempts tracking

  const { data: questions = [] } = useQuery({
    queryKey: ['quiz-questions', selectedQuiz?.id],
    queryFn: async () => {
      if (!selectedQuiz) return [];
      return selectedQuiz.questions || [];
    },
    enabled: !!selectedQuiz,
    initialData: [],
  });

  const startQuiz = (quiz) => {
    if (isFullQuizLocked(quiz)) return;
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowResult(false);
    setQuizComplete(false);
    setStartTime(Date.now());
  };

  const handleAnswerSelect = (answerIndex) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer_index;
    
    setUserAnswers([...userAnswers, {
      question_id: currentQuestion.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect
    }]);
    
    setShowResult(true);

    // Immediate per-question awarding via Supabase removed
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const correctCount = userAnswers.filter(a => a.is_correct).length + (selectedAnswer === questions[currentQuestionIndex]?.correct_answer_index ? 1 : 0);
    const totalQuestions = questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= (selectedQuiz.passing_score || 70);
    const baseEarned = (() => {
      try {
        const byId = Object.fromEntries((selectedQuiz?.questions || []).map(q => [q.id, q]));
        const earnedFromAnswered = userAnswers.reduce((sum, a) => sum + (a.is_correct ? Number((byId[a.question_id]?.points) || 5) : 0), 0);
        const current = questions[currentQuestionIndex];
        const addCurrent = selectedAnswer === current?.correct_answer_index ? Number((current?.points) || 5) : 0;
        return earnedFromAnswered + addCurrent;
      } catch {
        return correctCount * 5;
      }
    })();
    const perfectBonus = scorePercentage === 100 ? 10 : 0;
    const pointsEarned = baseEarned + perfectBonus;
    
    const results = {
      score: scorePercentage,
      correct_answers: correctCount,
      total_questions: totalQuestions,
      time_taken: timeTaken,
      points_earned: pointsEarned,
      passed: passed
    };
    
    setQuizResults(results);
    setQuizComplete(true);

    if (isFullQuiz(selectedQuiz)) {
      const version = String(selectedQuiz?.version || 1);
      try {
        localStorage.setItem(fullLockKey, version);
      } catch { void 0; }
    }
    try {
      setUserBestScore(selectedQuiz.id, scorePercentage);
    } catch { void 0; }
    
    // Award only perfect bonus via unified pipeline; base points already added per question
    try {
      if (perfectBonus > 0) {
        await awardPointsForGame(user, 'quiz', {
          isPerfect: true,
          fallbackScore: perfectBonus,
          metadata: {
            quiz_id: selectedQuiz.id,
            score_percentage: scorePercentage,
            correct_answers: correctCount,
            total_questions: totalQuestions,
            time_taken_seconds: timeTaken,
            passed,
          }
        });
      }
      window._lastEarnedPoints = pointsEarned;
      try {
        if (fbUser?.uid) {
          const p = await getUserProfile(fbUser.uid);
          setTotalPoints(Number(p?.points || 0));
        }
      } catch { void 0; }
      try {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['monthly-leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard-users'] });
      } catch { void 0; }
    } catch (e) {
      console.warn('awardPointsForGame failed:', e?.message || e);
    }

    trackQuizCompletionAndMaybeReview();
    try {
      const pts = fbUser?.uid
        ? Number((await getUserProfile(fbUser.uid))?.points || 0)
        : Number(totalPoints || pointsEarned || 0);
      trackPointsMilestoneAndMaybeReview(pts);
    } catch {
      trackPointsMilestoneAndMaybeReview(Number(pointsEarned || 0));
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setUserAnswers([]);
    setQuizComplete(false);
    setQuizResults(null);
  };

  // Removed Base44 best-score computation

  const subjects = ["all", "Aqeedah", "Akhlaq", "Seerah", "Quran", "Prophets", "Tawheed", "Salah", "Fiqh", "Sahabah", "History", "Tajweed", "Ramadan", "DailyLife", "Mixed"];
  
  const filteredQuizzes = filterSubject === "all" 
    ? quizzes 
    : quizzes.filter(q => q.subject === filterSubject);

  const featuredQuizzes = quizzes.filter(q => q.is_featured);

  const userKey = user?.id ? String(user.id) : 'guest';
  const fullLockKey = `full_quiz_lock_${userKey}`;
  const isFullQuiz = (q) => Boolean(q?.is_full_quiz || String(q?.subject || '').toLowerCase() === 'mixed');
  const isFullQuizLocked = (q) => {
    if (!isFullQuiz(q)) return false;
    const v = String(q?.version || 1);
    return String(localStorage.getItem(fullLockKey) || '') === v;
  };

  const bestKeyBase = `best_scores_${userKey}`;
  const getUserBestScore = (quizId) => {
    try {
      const raw = localStorage.getItem(bestKeyBase);
      const map = raw ? JSON.parse(raw) : {};
      const v = map[quizId];
      return typeof v === 'number' ? v : null;
    } catch {
      return null;
    }
  };
  const setUserBestScore = (quizId, score) => {
    try {
      const raw = localStorage.getItem(bestKeyBase);
      const map = raw ? JSON.parse(raw) : {};
      const prev = typeof map[quizId] === 'number' ? map[quizId] : null;
      const next = prev != null ? Math.max(prev, score) : score;
      map[quizId] = next;
      localStorage.setItem(bestKeyBase, JSON.stringify(map));
    } catch { void 0; }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 animate-bounce text-blue-600" />
          <p className="text-gray-600 font-medium">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  // Quiz taking view
  if (selectedQuiz && !quizComplete) {
    if (questions.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 mb-4">Loading quiz questions...</p>
              <Button onClick={resetQuiz}>Back to Quizzes</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl">{selectedQuiz.title}</CardTitle>
                <Badge className="bg-white/20 text-white">
                  <Clock className="w-4 h-4 mr-1" />
                  Question {currentQuestionIndex + 1}/{questions.length}
                </Badge>
              </div>
              <Progress value={progress} className="bg-white/20" />
            </CardHeader>
            <CardContent className="p-8">
              {!showResult ? (
                <div className="space-y-6">
                  <div>
                    <Badge className="mb-4">{currentQuestion.category}</Badge>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      {currentQuestion.question}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswerSelect(index)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedAnswer === index
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            selectedAnswer === index ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1 text-gray-900">{option}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswer === null}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-lg py-6"
                    size="lg"
                  >
                    Submit Answer
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-6">
                    {selectedAnswer === currentQuestion.correct_answer_index ? '🎉' : '📚'}
                  </div>
                  <h3 className={`text-3xl font-bold mb-4 ${
                    selectedAnswer === currentQuestion.correct_answer_index ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedAnswer === currentQuestion.correct_answer_index ? 'Correct!' : 'Not Quite!'}
                  </h3>
                  <div className="bg-blue-50 rounded-xl p-6 mb-6">
                    {selectedAnswer !== currentQuestion.correct_answer_index && (
                      <p className="text-lg mb-3">
                        <strong>Correct Answer:</strong> {currentQuestion.options[currentQuestion.correct_answer_index]}
                      </p>
                    )}
                    <p className="text-gray-700">
                      <strong>Explanation:</strong> {currentQuestion.explanation}
                    </p>
                    {statusMessage && (
                      <p className="text-sm text-gray-800 mt-3">
                        {statusMessage}
                      </p>
                    )}
                    {currentQuestion.source && (
                      <p className="text-sm text-gray-600 mt-3">
                        <strong>Source:</strong> {currentQuestion.source}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-500"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Results view
  if (quizComplete && quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="shadow-2xl border-4 border-blue-300">
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-6">
                  {quizResults.passed ? '🏆' : '📖'}
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  {quizResults.passed ? 'Congratulations!' : 'Keep Learning!'}
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                    <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-4xl font-bold text-blue-600">{quizResults.score}%</p>
                    <p className="text-sm text-gray-600">Score</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                    <Award className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-4xl font-bold text-purple-600">{quizResults.points_earned}</p>
                    <p className="text-sm text-gray-600">Points</p>
                  </div>
                </div>
                {typeof totalPoints === 'number' && (
                  <div className="text-sm text-gray-700 mb-6">Total points: {totalPoints}</div>
                )}

                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <div className="flex justify-around text-center">
                    <div>
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" />
                      <p className="text-2xl font-bold text-gray-900">{quizResults.correct_answers}</p>
                      <p className="text-xs text-gray-600">Correct</p>
                    </div>
                    <div>
                      <XCircle className="w-6 h-6 mx-auto mb-1 text-red-600" />
                      <p className="text-2xl font-bold text-gray-900">
                        {quizResults.total_questions - quizResults.correct_answers}
                      </p>
                      <p className="text-xs text-gray-600">Wrong</p>
                    </div>
                    <div>
                      <Clock className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.floor(quizResults.time_taken / 60)}:{(quizResults.time_taken % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-gray-600">Time</p>
                    </div>
                  </div>
                </div>

                

                <div className="flex gap-4 justify-center">
                  <Button onClick={resetQuiz} variant="outline" size="lg">
                    Back to Quizzes
                  </Button>
                  <Button onClick={() => startQuiz(selectedQuiz)} className="bg-gradient-to-r from-blue-500 to-purple-500" size="lg">
                    Retry Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Quiz selection view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {null}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Islamic Quizzes</h1>
          <p className="text-xl text-gray-600">Test your knowledge on various Islamic topics</p>
        </motion.div>

        {/* Subject Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {subjects.map((subject) => (
            <Button
              key={subject}
              onClick={() => setFilterSubject(subject)}
              variant={filterSubject === subject ? "default" : "outline"}
              className={filterSubject === subject ? "bg-blue-600" : ""}
            >
              {subject === "all" ? "All Subjects" : subject}
            </Button>
          ))}
          {quizzes.length > 0 && (
            <div className="w-full mt-3 flex flex-wrap justify-center gap-2">
              {quizzes.map((q) => (
                <Button
                  key={q.id}
                  onClick={() => startQuiz(q)}
                  variant="outline"
                  className="whitespace-nowrap"
                  disabled={isFullQuizLocked(q)}
                >
                  {isFullQuizLocked(q) ? `${q.title} (Locked)` : q.title}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Featured Quizzes */}
        {featuredQuizzes.length > 0 && filterSubject === "all" && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
              Featured This Week
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredQuizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-4 border-amber-400 hover:shadow-2xl transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{quiz.icon}</div>
                          <div>
                            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500">Featured</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge>{quiz.subject}</Badge>
                        <Badge variant="outline">{quiz.questions?.length || 0} Questions</Badge>
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {quiz.duration_minutes} min
                        </Badge>
                        <Badge variant="outline">
                          <Award className="w-3 h-3 mr-1" />
                          {quiz.points_reward} pts
                        </Badge>
                      </div>
                      {user && getUserBestScore(quiz.id) !== null && (
                        <div className="bg-blue-100 rounded-lg p-2 mb-4">
                          <p className="text-sm text-blue-900">
                            <strong>Your Best:</strong> {getUserBestScore(quiz.id)}%
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() => startQuiz(quiz)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                        size="lg"
                        disabled={isFullQuizLocked(quiz)}
                      >
                        {isFullQuizLocked(quiz) ? 'Locked' : 'Start Quiz'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* All Quizzes */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {filterSubject === "all" ? "All Quizzes" : `${filterSubject} Quizzes`}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-xl transition-all cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-4xl">{quiz.icon}</div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{quiz.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge>{quiz.subject}</Badge>
                    <Badge variant="outline">{quiz.questions?.length || 0} Qs</Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {quiz.duration_minutes}m
                    </Badge>
                  </div>
                  {/* Removed best score display tied to Base44 attempts */}
                  <Button
                    onClick={() => startQuiz(quiz)}
                    className="w-full bg-blue-600"
                    disabled={isFullQuizLocked(quiz)}
                  >
                    {isFullQuizLocked(quiz) ? 'Locked' : 'Take Quiz'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredQuizzes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No quizzes available in this category yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

Quizzes.propTypes = {
  initialSubject: PropTypes.string,
};
