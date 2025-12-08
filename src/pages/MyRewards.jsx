import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Flame } from "lucide-react";
import { watchAuth, getUserProfile } from "@/api/firebase";

const REWARDS = [
  { id: "badge_100", title: "100 Points", threshold: 100 },
  { id: "badge_500", title: "500 Points", threshold: 500 },
  { id: "badge_1000", title: "1000 Points", threshold: 1000 },
];

export default function MyRewards() {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const stop = watchAuth(async (u) => {
      setUser(u);
      if (!u) return;
      try {
        const p = await getUserProfile(u.uid);
        setPoints(Number((p?.total_points != null ? p.total_points : p?.points) || 0));
      } catch {}
    });
    return () => { try { stop?.(); } catch {} };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('daily_streak');
      setStreak(Number(raw || 0));
    } catch {}
  }, []);

  const earned = REWARDS.filter(r => points >= r.threshold);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 border-2 border-amber-300">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-amber-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="w-5 h-5" /> My Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-gray-800 font-semibold">Total Points: {points}</div>
            <div className="mt-1 text-sm text-gray-600 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-600" /> Daily streak: {streak} days</div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REWARDS.map(r => {
            const has = earned.some(e => e.id === r.id);
            return (
              <Card key={r.id} className={`border-2 ${has ? 'border-amber-400' : 'border-gray-200'}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" /> {r.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge className={has ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700'}>
                      {has ? 'Unlocked' : `Unlock at ${r.threshold}`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
