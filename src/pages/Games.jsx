
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/firebase";
import { trackGameCompletionAndMaybeReview, trackPointsMilestoneAndMaybeReview } from "@/utils/inAppReview";
// Optional Supabase import - won't break if Supabase is not configured
import { supabase as supabaseClient, isSupabaseConfigured as checkSupabaseConfig } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Star, Medal, Crown, ArrowLeft, Gamepad2, Users, Gift, LogIn, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { watchAuth } from "@/api/firebase";
import { awardPointsForGame } from "@/api/points";
import { checkPointsEndpointHealth, checkAndResetMonthlyLeaderboardLocal } from "@/api/points";
import NoticeBanner from "@/components/NoticeBanner";

// Curated advanced working titles
const KidsQuiz = lazy(() => import("../components/games/KidsQuiz"));
const MissingWordGame = lazy(() => import("../components/games/MissingWordGame"));
const MatchPairsGame = lazy(() => import("../components/games/MatchPairsGame"));
const FlashcardsGame = lazy(() => import("../components/games/FlashcardsGame"));
const WordSearchKids = lazy(() => import("../components/games/WordSearchKids"));
const SurahOrderGame = lazy(() => import("../components/games/SurahOrderGame"));
const WuduStepsGame = lazy(() => import("../components/games/WuduStepsGame"));
const HajjUmrahSimulator = lazy(() => import("../components/games/HajjUmrahSimulator"));

const gamesList = [
  {
    id: "kids_quiz",
    title: "🧠 Islamic Kids Quiz",
    description: "2 points per correct, randomized questions",
    emoji: "🧠",
    difficulty: "Medium",
    component: KidsQuiz
  },
  {
    id: "missing_word",
    title: "✍️ Fill in the Missing Word",
    description: "Seerah, Prophets, Quran prompts",
    emoji: "✍️",
    difficulty: "Easy",
    component: MissingWordGame
  },
  {
    id: "match_pairs",
    title: "🧩 Match the Pairs",
    description: "Prophet to miracle pairs",
    emoji: "🧩",
    difficulty: "Easy",
    component: MatchPairsGame
  },
  {
    id: "flashcards",
    title: "📇 Flashcards",
    description: "Learn and earn by marking known",
    emoji: "📇",
    difficulty: "Easy",
    component: FlashcardsGame
  },
  {
    id: "word_search",
    title: "🔎 Word Search",
    description: "Prophets, Quran, Seerah, Akhlaq words",
    emoji: "🔎",
    difficulty: "Easy",
    component: WordSearchKids
  },
  {
    id: "surah_order",
    title: "📜 Surah Order Game",
    description: "Arrange surahs in correct order",
    emoji: "📜",
    difficulty: "Medium",
    component: SurahOrderGame
  },
  {
    id: "wudu_steps",
    title: "💧 Wudu Steps Game",
    description: "Arrange the steps of Wudu",
    emoji: "💧",
    difficulty: "Easy",
    component: WuduStepsGame
  },
  {
    id: "hajj_umrah",
    title: "🕋 Hajj & Umrah Simulator",
    description: "Interactive journey through key rites",
    emoji: "🕋",
    difficulty: "Hard",
    component: HajjUmrahSimulator
  }
];

// Removed basic titles: Dua Meaning, Word Scramble, Word Search, Memory Match

// Removed builder and some legacy items to keep advanced set

const GameLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="text-6xl mb-4 animate-bounce">🎮</div>
      <p className="text-gray-600 font-medium">Loading game...</p>
    </div>
  </div>
);

export default function Games() {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [showMonthlyLeaderboard, setShowMonthlyLeaderboard] = useState(false);

  const emitPointsAwarded = () => {
    try { window.dispatchEvent(new CustomEvent('ikz_points_awarded')); } catch {}
  };

  const testSupabaseConnection = async () => {
    if (!checkSupabaseConfig() || !supabaseClient) {
      alert('Supabase is not configured. Please check your environment variables.');
      return;
    }
    
    try {
      // Test connection by fetching the current session
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        alert(`Supabase connection error: ${error.message}`);
        return;
      }
      
      // Test database connection by making a simple query
      const { data, error: dbError } = await supabaseClient
        .from('users')
        .select('count')
        .limit(1);
      
      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is fine for testing
        alert(`Supabase database connection: ${dbError.message}`);
        return;
      }
      
      alert(`✅ Supabase connection successful!\n\nSession: ${session ? 'Authenticated' : 'Not authenticated'}\nDatabase: Connected`);
    } catch (error) {
      alert(`Supabase connection failed: ${error.message}`);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    (async () => {
      try { setBackendOnline(await checkPointsEndpointHealth()); } catch {}
      try { checkAndResetMonthlyLeaderboardLocal(); } catch {}
      
      unsubscribe = watchAuth(async (fbUser) => {
        if (fbUser) {
          setIsAuthenticated(true);
          setUser({ id: fbUser.uid, email: fbUser.email || '', points: 0, full_name: fbUser.email || 'Anonymous', badges: [] });
        } else {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setIsAuthenticated(true);
            setUser(JSON.parse(storedUser));
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
        setIsLoading(false);
      });
    })();
    return () => { try { unsubscribe && unsubscribe(); } catch {} };
  }, [navigate]);

  const { data: monthlyLeaderboard = [] } = useQuery({
    queryKey: ['monthly-leaderboard'],
    queryFn: async () => {
      const list = await usersApi.list();
      return list
        .filter(u => Number(u.points || 0) > 0)
        .sort((a, b) => Number(b.points || 0) - Number(a.points || 0))
        .slice(0, 10)
        .map(u => ({ id: u.id, name: u.full_name || u.fullName || u.email || 'Anonymous', monthly_score: Number(u.points || 0) }));
    },
    enabled: isAuthenticated,
    initialData: [],
  });

  const { data: leaderboardUsers = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const list = await usersApi.list();
      return list.sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).slice(0, 10);
    },
    enabled: isAuthenticated,
    initialData: [],
  });

  

  const handleGameSelect = (game) => {
    setSelectedGame(game);
    try {
      const scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
      scores.push({ game_id: game.id, user_id: user?.id || 'guest', score: 0, created_date: new Date().toISOString() });
      localStorage.setItem('gameScores', JSON.stringify(scores));
      const sessionKey = `${user?.id || 'guest'}:${game.id}:${Date.now()}`;
      localStorage.setItem('current_game_award_key', sessionKey);
    } catch {}
  };

  const [earnedPoints, setEarnedPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(null);
  const handleGameComplete = async (score = 0) => {
    try {
      const inc = Number(score || 0);
      if (inc > 0) {
        try {
          const idKey = localStorage.getItem('current_game_award_key') || null;
          await awardPointsForGame(user, selectedGame?.id || 'game', { fallbackScore: inc, idempotencyKey: idKey });
          setEarnedPoints(inc);
          emitPointsAwarded();
          // Supabase profile refresh removed
        } catch {
          try {
            const raw = localStorage.getItem('users');
            const arr = raw ? JSON.parse(raw) : [];
            const id = user?.id || 'guest';
            const idx = arr.findIndex(u => u.id === id);
            if (idx >= 0) arr[idx].points = Number(arr[idx].points || 0) + inc; else arr.push({ id, name: 'Guest', points: inc });
            localStorage.setItem('users', JSON.stringify(arr));
            setEarnedPoints(inc);
            const tot = Number((arr.find(u=>u.id===id)?.points) || inc);
            setTotalPoints(tot);
            try { window.dispatchEvent(new CustomEvent('ikz_points_total', { detail: { points: tot } })); } catch {}
          } catch {}
        }
      }
    } finally {
      try { localStorage.removeItem('current_game_award_key'); } catch {}

      trackGameCompletionAndMaybeReview();

      try {
        const raw = localStorage.getItem('users');
        const arr = raw ? JSON.parse(raw) : [];
        const id = user?.id || user?.uid || 'guest';
        const pts = Number(arr.find(u => u.id === id)?.points || totalPoints || 0);
        trackPointsMilestoneAndMaybeReview(pts);
      } catch {}

      setTimeout(() => {
        setSelectedGame(null);
        try { navigate(createPageUrl('Games')); } catch {}
      }, 1200);
    }
  };

  // Supabase connection test removed

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <p className="text-gray-600 font-medium">Loading games...</p>
        </div>
      </div>
    );
  }

  const GameComponent = selectedGame?.component;

  if (selectedGame) {
    return (
      <div className="min-h-screen py-6 px-4 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setSelectedGame(null)}
            className="mb-6 bg-white/80 backdrop-blur-sm hover:bg-white"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
          <Suspense fallback={<GameLoader />}>
            {earnedPoints > 0 ? (
              <div className="mb-4 p-3 rounded-lg border-2 border-amber-300 bg-amber-50 text-amber-900 text-sm">
                You earned <strong>{earnedPoints}</strong> points!{typeof totalPoints === 'number' ? ` Total: ${totalPoints}` : ''}
              </div>
            ) : null}
            {GameComponent && <GameComponent onComplete={handleGameComplete} user={user} />}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <div className="max-w-7xl mx-auto">
        <NoticeBanner storageKey="notice_leaderboard_points_unavailable" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div 
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            🎮
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Islamic Knowledge Games
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Play fun games and test your Islamic knowledge!
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Backend: {backendOnline ? <span className="text-green-600 font-semibold">Online</span> : <span className="text-red-600 font-semibold">Offline</span>}
          </div>
        </motion.div>

        <div className="flex justify-center mb-8">
          <a
            href="https://studio--studio-653801381-47983.us-central1.hosted.app/news"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg">
              latest updates click on here
            </Button>
          </a>
          <Button onClick={testSupabaseConnection} className="ml-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg">
            TEST SUPABASE
          </Button>
        </div>

        

        {/* Show leaderboard and monthly champions only for authenticated users */}
        {isAuthenticated && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap justify-center gap-3 mb-12"
            >
              <Button
                onClick={() => setShowMonthlyLeaderboard(!showMonthlyLeaderboard)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Monthly Champions
              </Button>
              <Link to={createPageUrl("Challenges")}>
                <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Challenge Friends
                </Button>
              </Link>
            </motion.div>

            <AnimatePresence>
              {showMonthlyLeaderboard && monthlyLeaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-12 max-w-xl mx-auto"
                >
                  <Card className="border-2 border-purple-300 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
                      <CardTitle className="text-2xl flex items-center gap-2 justify-center">
                        <Trophy className="w-6 h-6" />
                        Monthly Champions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-4">
                      <div className="space-y-3">
                        {monthlyLeaderboard.slice(0, 10).map((player, index) => {
                          const medals = [
                            { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50" },
                            { icon: Medal, color: "text-gray-400", bg: "bg-gray-50" },
                            { icon: Medal, color: "text-orange-600", bg: "bg-orange-50" }
                          ];
                          const medal = medals[index];
                          const Icon = medal?.icon || Star;
                          
                          return (
                            <motion.div
                              key={player.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`flex items-center gap-3 p-3 rounded-xl ${medal?.bg || 'bg-white'} border-2 ${index === 0 ? 'border-amber-400' : 'border-gray-200'}`}
                            >
                              <div className={`w-8 h-8 rounded-full ${medal?.bg || 'bg-blue-50'} flex items-center justify-center ${medal?.color || 'text-gray-600'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm text-gray-900">
                                  {player.full_name || 'Anonymous'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {player.monthly_games} games this month
                                </p>
                              </div>
                              <div className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
                                <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
                                <span className="font-bold text-sm text-purple-900">{player.monthly_score}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-4 border-amber-400 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🏆</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Win Prizes Every Month!
                  </h3>
                  <p className="text-gray-800 font-medium">
                    Play games, earn points, compete! Top 3 players win prizes!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-800 font-semibold text-center">
                Our competitions are not live. Will update with details on here soon
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {leaderboardUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-2 border-purple-200 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-500" />
                    Top Players (All Time)
                  </CardTitle>
                  <Button
                    onClick={() => navigate(createPageUrl("Leaderboard"))}
                    variant="outline"
                    size="sm"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboardUsers.slice(0, 3).map((player, index) => {
                    const medals = [
                      { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50" },
                      { icon: Medal, color: "text-gray-400", bg: "bg-gray-50" },
                      { icon: Medal, color: "text-orange-600", bg: "bg-orange-50" }
                    ];
                    const medal = medals[index];
                    const Icon = medal?.icon || Star;
                    
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-4 p-4 rounded-xl ${medal?.bg || 'bg-white'} border-2 ${index === 0 ? 'border-amber-400' : 'border-gray-200'}`}
                      >
                        <div className={`w-10 h-10 rounded-full ${medal?.bg || 'bg-blue-50'} flex items-center justify-center ${medal?.color || 'text-gray-600'}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-base text-gray-900">
                            {player.full_name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {player.city || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full">
                          <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                          <span className="font-bold text-sm text-amber-900">{player.points}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        

        <div className="space-y-8 max-w-6xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold text-blue-800 mb-3">Easy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {gamesList.filter(g => g.difficulty === 'Easy').map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full border-2 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
                      <CardHeader className="bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="flex justify-between items-start mb-2">
                          <motion.div 
                            className="text-5xl"
                            whileHover={{ scale: 1.2, rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            {game.emoji}
                          </motion.div>
                        </div>
                        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                          {game.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{game.description}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
                          <Button
                            onClick={() => handleGameSelect(game)}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            Play Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-800 mb-3">Medium</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {gamesList.filter(g => g.difficulty === 'Medium').map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full border-2 hover:border-amber-300 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
                      <CardHeader className="bg-gradient-to-br from-amber-50 to-yellow-50">
                        <div className="flex justify-between items-start mb-2">
                          <motion.div 
                            className="text-5xl"
                            whileHover={{ scale: 1.2, rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            {game.emoji}
                          </motion.div>
                        </div>
                        <CardTitle className="text-xl group-hover:text-amber-600 transition-colors">
                          {game.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{game.description}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
                          <Button
                            onClick={() => handleGameSelect(game)}
                            className="bg-amber-600 hover:bg-amber-700"
                            size="sm"
                          >
                            Play Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-800 mb-3">Hard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {gamesList.filter(g => g.difficulty === 'Hard').map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full border-2 hover:border-purple-300 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
                      <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50">
                        <div className="flex justify-between items-start mb-2">
                          <motion.div 
                            className="text-5xl"
                            whileHover={{ scale: 1.2, rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            {game.emoji}
                          </motion.div>
                        </div>
                        <CardTitle className="text-xl group-hover:text-purple-600 transition-colors">
                          {game.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{game.description}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">{game.difficulty}</Badge>
                          <Button
                            onClick={() => handleGameSelect(game)}
                            className="bg-purple-600 hover:bg-purple-700"
                            size="sm"
                          >
                            Play Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
