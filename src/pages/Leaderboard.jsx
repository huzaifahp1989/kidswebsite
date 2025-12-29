import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { watchAuth } from "@/api/firebase";
import { getLeaderboard } from "@/api/leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Watch Firebase auth and load current user's profile
  useEffect(() => {
    const stop = watchAuth(async (u) => {
      const authed = !!u;
      setIsAuthenticated(authed);
      // profile prefetch removed for privacy; leaderboard uses aggregated RPC
    });
    return () => { try { stop?.(); } catch { void 0; } };
  }, []);

  useEffect(() => {
    const handler = () => { try { queryClient.invalidateQueries({ queryKey: ['leaderboard'] }); } catch { void 0; } };
    window.addEventListener('ikz_points_awarded', handler);
    return () => { try { window.removeEventListener('ikz_points_awarded', handler); } catch { void 0; } };
  }, [queryClient]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
    enabled: isAuthenticated,
    retry: false,
  });

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />;
      case 1:
        return <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />;
      case 2:
        return <Medal className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />;
      default:
        return <span className="text-lg sm:text-2xl font-bold text-gray-400">#{index + 1}</span>;
    }
  };

  const getRankBg = (index) => {
    switch (index) {
      case 0:
        return "from-amber-400 to-amber-600";
      case 1:
        return "from-gray-300 to-gray-500";
      case 2:
        return "from-amber-500 to-amber-700";
      default:
        return "from-blue-100 to-purple-100";
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-8 md:py-12 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="text-5xl sm:text-6xl mb-4">🏆</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Top Young Learners
          </h1>
          <p className="text-base sm:text-lg text-gray-600 px-2">
            These amazing kids are learning and earning points!
          </p>
          
          {/* Highest Points Display - Names and points removed */}
        </motion.div>

        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 sm:mb-8"
          >
            <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-4 sm:p-6 text-center">
                <Star className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 sm:mb-4 text-blue-600" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Guest Mode
                </h3>
                <p className="text-sm sm:text-base text-gray-600 px-2">
                  You can play games and view the leaderboard without signing up.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Current user stats removed for privacy */}

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">All-Time Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && <div>Loading...</div>}
            {!isLoading && users.length === 0 && (
              <div className="p-8 sm:p-12 text-center text-gray-500">No learners yet. Be the first to earn points!</div>
            )}
            {!isLoading && users.map((u, index) => (
              <div key={u.id} className="flex items-center gap-3 p-2 border-b">
                <span className="font-bold">{index + 1}.</span>
                <span>{u.full_name || u.email}</span>
                <span className="ml-auto">{Number(u.points || 0)} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
