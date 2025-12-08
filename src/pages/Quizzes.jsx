import React, { useState, useEffect } from "react";
import { awardPointsForGame } from "@/api/points";
import { watchAuth, getUserProfile } from "@/api/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Target, Star, CheckCircle2, XCircle, Award, Brain, BookOpen, Users, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const localQuizzes = [
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
      {
        id: "q1",
        category: "Quran",
        question: "How many surahs are in the Qur'an?",
        options: ["110", "112", "113", "114"],
        correct_answer_index: 3,
        explanation: "There are 114 surahs.",
        source: "Basic Quran Facts"
      },
      {
        id: "q2",
        category: "Quran",
        question: "Which surah is called The Opening?",
        options: ["Al-Baqarah", "Al-Fatiha", "An-Nas", "Al-Ikhlas"],
        correct_answer_index: 1,
        explanation: "Al-Fatiha is The Opening.",
        source: "Surah Names"
      },
      {
        id: "q3",
        category: "Quran",
        question: "Which surah has Ayat al-Kursi?",
        options: ["Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah"],
        correct_answer_index: 0,
        explanation: "Ayat al-Kursi is verse 255 of Al-Baqarah.",
        source: "Surah Al-Baqarah"
      },
      {
        id: "q4",
        category: "Quran",
        question: "Which surah is the shortest?",
        options: ["Al-Kawthar", "Al-Ikhlas", "Al-Asr", "Al-Falaq"],
        correct_answer_index: 0,
        explanation: "Al-Kawthar has 3 verses.",
        source: "Surah Al-Kawthar"
      }
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
      {
        id: "h1",
        category: "Hadith",
        question: "Which collection is by Imam Bukhari?",
        options: ["Sahih Muslim", "Sahih Bukhari", "Sunan Abu Dawud", "Muwatta Malik"],
        correct_answer_index: 1,
        explanation: "Sahih Bukhari was compiled by Imam al-Bukhari.",
        source: "Hadith Collections"
      },
      {
        id: "h2",
        category: "Hadith",
        question: "What does 'Sahih' mean in hadith classification?",
        options: ["Weak", "Sound", "Narration", "Chain"],
        correct_answer_index: 1,
        explanation: "Sahih means sound/ authentic.",
        source: "Hadith Terms"
      },
      {
        id: "h3",
        category: "Hadith",
        question: "Which companion narrated many hadiths?",
        options: ["Abu Hurairah", "Bilal", "Umar", "Ali"],
        correct_answer_index: 0,
        explanation: "Abu Hurairah narrated a large number of hadiths.",
        source: "Companions"
      },
      {
        id: "h4",
        category: "Hadith",
        question: "Hadith are sayings of?",
        options: ["Prophets", "Sahabah", "The Prophet Muhammad ﷺ", "Scholars"],
        correct_answer_index: 2,
        explanation: "Hadith are sayings, actions, approvals of the Prophet ﷺ.",
        source: "Definition"
      }
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
      { id: "s1", category: "Seerah", question: "City of birth?", options: ["Medina", "Mecca", "Ta'if", "Jerusalem"], correct_answer_index: 1, explanation: "Born in Mecca.", source: "Seerah" },
      { id: "s2", category: "Seerah", question: "First revelation surah?", options: ["Al-Alaq", "Al-Fatiha", "Al-Qadr", "Ad-Duha"], correct_answer_index: 0, explanation: "Read: Al-Alaq.", source: "Revelation" },
      { id: "s3", category: "Seerah", question: "Migration year (Hijrah)?", options: ["610 CE", "622 CE", "630 CE", "632 CE"], correct_answer_index: 1, explanation: "Hijrah occurred in 622 CE.", source: "Timeline" },
      { id: "s4", category: "Seerah", question: "Battle known for angels' support?", options: ["Uhud", "Badr", "Khandaq", "Hunayn"], correct_answer_index: 1, explanation: "Battle of Badr.", source: "Battles" }
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
      { id: "f1", category: "Fiqh", question: "How many daily prayers?", options: ["3", "4", "5", "6"], correct_answer_index: 2, explanation: "Five daily prayers.", source: "Salah" },
      { id: "f2", category: "Fiqh", question: "Wudu includes?", options: ["Wash face", "Comb hair", "Eat", "Sleep"], correct_answer_index: 0, explanation: "Wudu includes washing face.", source: "Wudu" },
      { id: "f3", category: "Fiqh", question: "Month of fasting?", options: ["Muharram", "Rajab", "Ramadan", "Shawwal"], correct_answer_index: 2, explanation: "Fasting in Ramadan.", source: "Sawm" },
      { id: "f4", category: "Fiqh", question: "Charity pillar?", options: ["Sadaqah", "Zakat", "Kaffarah", "Fitrah"], correct_answer_index: 1, explanation: "Zakat is a pillar.", source: "Zakat" }
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
      { id: "p1", category: "Prophets", question: "Prophet who built the Ka'bah?", options: ["Musa", "Isa", "Ibrahim", "Yusuf"], correct_answer_index: 2, explanation: "Ibrahim with his son Ismail.", source: "Ka'bah" },
      { id: "p2", category: "Prophets", question: "Prophet swallowed by a fish?", options: ["Yunus", "Nuh", "Ayub", "Lut"], correct_answer_index: 0, explanation: "Prophet Yunus.", source: "Story" },
      { id: "p3", category: "Prophets", question: "Prophet who received the Torah?", options: ["Dawud", "Musa", "Isa", "Muhammad"], correct_answer_index: 1, explanation: "Prophet Musa.", source: "Books" },
      { id: "p4", category: "Prophets", question: "Prophet with the Psalms (Zabur)?", options: ["Dawud", "Isa", "Nuh", "Ishaq"], correct_answer_index: 0, explanation: "Prophet Dawud.", source: "Books" }
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
      { id: "ak1", category: "Akhlaq", question: "Greeting in Islam?", options: ["Hello", "Salam", "Hi", "Peace"], correct_answer_index: 1, explanation: "Assalamu Alaikum.", source: "Manners" },
      { id: "ak2", category: "Akhlaq", question: "Best among you are those who?", options: ["Are strongest", "Are richest", "Learn and teach Qur'an", "Travel"], correct_answer_index: 2, explanation: "Hadith.", source: "Hadith" },
      { id: "ak3", category: "Akhlaq", question: "Truthfulness is?", options: ["Bad", "Neutral", "A virtue", "Optional"], correct_answer_index: 2, explanation: "Truthfulness is a virtue.", source: "Values" },
      { id: "ak4", category: "Akhlaq", question: "Helping others is?", options: ["Discouraged", "Recommended", "Forbidden", "Makruh"], correct_answer_index: 1, explanation: "Recommended (mustahabb).",
        source: "Virtues" }
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
      { id: "mx1", category: "Mixed", question: "How many pillars of Islam?", options: ["3", "4", "5", "6"], correct_answer_index: 2, explanation: "Five pillars.", source: "Basics" },
      { id: "mx2", category: "Mixed", question: "City of the Prophet's Masjid?", options: ["Mecca", "Medina", "Ta'if", "Jerusalem"], correct_answer_index: 1, explanation: "Medina.", source: "Seerah" },
      { id: "mx3", category: "Mixed", question: "Zakat is?", options: ["Optional", "Forbidden", "Pillar", "Makruh"], correct_answer_index: 2, explanation: "Zakat is a pillar.", source: "Fiqh" },
      { id: "mx4", category: "Mixed", question: "Surah with Ikhlas?", options: ["112", "113", "114", "1"], correct_answer_index: 0, explanation: "Surah 112.", source: "Quran" }
    ]
  }
];

export default function Quizzes() {
  const [user, setUser] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [filterSubject, setFilterSubject] = useState("all");
  const [fbUser, setFbUser] = useState(null);
  const [totalPoints, setTotalPoints] = useState(null);
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
      } catch {}
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
    
    const pointsEarned = (correctCount * 5) + (scorePercentage === 100 ? 10 : 0);
    
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
      } catch (e) {}
    }
    
    // Removed Base44 attempt persistence
    // Award points via unified Firebase-backed pipeline regardless of Base44 auth
    try {
      await awardPointsForGame(user, 'quiz', {
        isPerfect: scorePercentage === 100,
        fallbackScore: pointsEarned,
        metadata: {
          quiz_id: selectedQuiz.id,
          score_percentage: scorePercentage,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          time_taken_seconds: timeTaken,
          passed,
        }
      });
      window._lastEarnedPoints = pointsEarned;
      try {
        if (fbUser?.uid) {
          const p = await getUserProfile(fbUser.uid);
          setTotalPoints(Number(p?.points || 0));
        }
      } catch {}
      try {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['monthly-leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard-users'] });
      } catch {}
    } catch (e) {
      console.warn('awardPointsForGame failed:', e?.message || e);
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

  const subjects = ["all", "Quran", "Hadith", "Seerah", "Fiqh", "Prophets", "Sahabah", "Akhlaq", "History", "Mixed"];
  
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
        {/* Firebase sign-in notice for Leaderboard points */}
        {!fbUser && (
          <div className="mb-4">
            <Card className="border-2 border-yellow-300 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-yellow-900">
                    To track your points on the Leaderboard, please sign in.
                  </div>
                  <Link to="/QuizSignup">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Sign in / Signup
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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
