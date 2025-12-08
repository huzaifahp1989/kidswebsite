import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, watchAuth, getUserProfile } from "@/api/firebase";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Star, TrendingUp, LogIn } from "lucide-react";
import { Link } from 'react-router-dom'
import { createPageUrl } from '@/utils'
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Watch Firebase auth and load current user's profile
  useEffect(() => {
    const stop = watchAuth(async (u) => {
      const authed = !!u;
      setIsAuthenticated(authed);
      if (authed) {
        try {
          const profile = await getUserProfile(u.uid);
          setCurrentUser(profile ? { id: u.uid, ...profile } : { id: u.uid, email: u.email, points: 0 });
        } catch {
          setCurrentUser({ id: u.uid, email: u.email, points: 0 });
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => { try { stop?.(); } catch {} };
  }, []);

  useEffect(() => {
    try {
      const channel = supabase.channel('lb_users_changes').on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          try { queryClient.invalidateQueries({ queryKey: ['leaderboard-users'] }); } catch {}
        }
      );
      channel.subscribe();
      const handler = () => { try { queryClient.invalidateQueries({ queryKey: ['leaderboard-users'] }); } catch {} };
      window.addEventListener('ikz_points_awarded', handler);
      return () => { try { channel.unsubscribe(); } catch {}; try { window.removeEventListener('ikz_points_awarded', handler); } catch {} };
    } catch {}
  }, [queryClient]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['leaderboard-users'],
    queryFn: async () => {
      try {
        const { data: lbData, error: lbErr } = await supabase
          .from('leaderboard')
          .select('user_id, points')
          .order('points', { ascending: false });
        if (!lbErr && Array.isArray(lbData) && lbData.length > 0) {
          const ids = lbData.map(r => r.user_id).filter(Boolean);
          let infoMap = {};
          if (ids.length > 0) {
            const { data: userRows } = await supabase
              .from('users')
              .select('id, full_name, avatar')
              .in('id', ids);
            if (Array.isArray(userRows)) {
              infoMap = Object.fromEntries(userRows.map(u => [u.id, u]));
            }
          }
          return lbData.map((row) => {
            const info = infoMap[row.user_id] || null;
            return {
              id: row.user_id,
              uid: row.user_id,
              fullName: info?.full_name || row.user_id,
              full_name: info?.full_name || row.user_id,
              points: Math.max(0, Number.isFinite(Number(row.points)) ? Math.floor(Number(row.points)) : 0),
              avatar: info?.avatar || '👤',
            };
          });
        }
        // Fallback to users API
        const list = await usersApi.list();
        return list.sort((a, b) => (Number(b.points || 0) - Number(a.points || 0)));
      } catch {
        return [];
      }
    },
    initialData: [],
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

        {/* Optional: Show gentle prompt for guests (not blocking) */}
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
                  Want to See Your Name Here?
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 px-2">
                  Join Islam Kids Zone to earn points, compete with friends, and climb the leaderboard!
                </p>
                <Link to={createPageUrl('QuizSignup')}>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
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
            {isLoading ? (
              <div className="p-8 sm:p-12 text-center text-gray-500">Loading leaderboard...</div>
            ) : users.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-gray-500">
                <Star className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                <p>No learners yet. Be the first to earn points!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {users.map((user, index) => (
                  <motion.div
                    key={user.uid || user.id || `${user.email || user.full_name || 'user'}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 sm:w-16 flex justify-center flex-shrink-0">
                        {getRankIcon(index)}
                      </div>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${getRankBg(index)} flex items-center justify-center text-xl sm:text-2xl shadow-lg flex-shrink-0`}>
                        {user.avatar || '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{user.full_name || user.fullName || user.email || 'Anonymous'}</div>
                        <div className="text-xs text-gray-500 truncate">{user.city || ''}</div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                        <span className="font-bold text-sm text-amber-900">{Number(user.points || 0)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
