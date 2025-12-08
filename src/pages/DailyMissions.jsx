import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Target, CalendarClock } from "lucide-react";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const DEFAULT_MISSIONS = [
  { id: "easy_game", title: "Play 1 Easy Game", points: 15 },
  { id: "read_dua", title: "Read 1 Dua", points: 10 },
  { id: "record_audio", title: "Record a nasheed or ayah", points: 15 },
];

export default function DailyMissions() {
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState(DEFAULT_MISSIONS);
  const [state, setState] = useState({});

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("daily_missions_state");
      const obj = raw ? JSON.parse(raw) : {};
      const last = obj.last_reset || 0;
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      if (!last || now - last > day) {
        const next = { last_reset: now, completed: {} };
        localStorage.setItem("daily_missions_state", JSON.stringify(next));
        setState(next);
      } else {
        setState(obj);
      }
    } catch {
      setState({ last_reset: Date.now(), completed: {} });
    }
  }, []);

  const completeMission = async (id, pts) => {
    const already = state?.completed?.[id];
    if (already) return;
    try { await awardPointsForGame(user, `mission_${id}`, { fallbackScore: pts }); } catch {}
    const next = {
      ...(state || {}),
      completed: { ...(state?.completed || {}), [id]: true },
    };
    setState(next);
    try { localStorage.setItem("daily_missions_state", JSON.stringify(next)); } catch {}
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6 border-2 border-blue-300">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-amber-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="w-5 h-5" /> Daily Missions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Resets every 24 hours
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {missions.map((m) => (
            <Card key={m.id} className="border-2">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{m.title}</div>
                  <div className="text-sm text-gray-600">+{m.points} points</div>
                </div>
                {state?.completed?.[m.id] ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" /> Completed
                  </div>
                ) : (
                  <Button onClick={() => completeMission(m.id, m.points)} className="bg-blue-600 hover:bg-blue-700">Mark Done</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
