import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const LEVELS = {
  Basic: [
    { name: "Al-Fatiha", order: 1 },
    { name: "Al-Ikhlas", order: 112 },
    { name: "Al-Falaq", order: 113 },
    { name: "An-Nas", order: 114 },
  ],
  Medium: [
    { name: "Al-Baqarah", order: 2 },
    { name: "Ali 'Imran", order: 3 },
    { name: "An-Nisa'", order: 4 },
    { name: "Al-Ma'idah", order: 5 },
  ],
  Hard: [
    { name: "Yunus", order: 10 },
    { name: "Hud", order: 11 },
    { name: "Yusuf", order: 12 },
    { name: "Ar-Ra'd", order: 13 },
  ],
};

const shuffle = (arr) => arr.map(a => ({ ...a })).sort(() => Math.random() - 0.5);

export default function SurahOrderGame() {
  const [user, setUser] = useState(null);
  const [level, setLevel] = useState("Basic");
  const [items, setItems] = useState(shuffle(LEVELS["Basic"]));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const changeLevel = (lvl) => {
    setLevel(lvl);
    setItems(shuffle(LEVELS[lvl]));
    setStatus(null);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const next = items.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setItems(next);
  };

  const moveDown = (idx) => {
    if (idx === items.length - 1) return;
    const next = items.slice();
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setItems(next);
  };

  const checkOrder = async () => {
    const ok = items.every((it, i, arr) => i === 0 || arr[i - 1].order < it.order);
    setStatus(ok ? "correct" : "wrong");
    if (ok) {
      const pts = level === "Basic" ? 10 : level === "Medium" ? 15 : 20;
      try { await awardPointsForGame(user, "surah_order", { fallbackScore: pts }); } catch {}
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Surah Order Game</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-2 mb-4">
            {Object.keys(LEVELS).map(l => (
              <Button key={l} onClick={() => changeLevel(l)} variant={level === l ? "default" : "outline"}>{l}</Button>
            ))}
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={it.name} className="flex items-center justify-between p-3 border rounded bg-white">
                <div className="font-semibold">{it.name}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => moveUp(idx)}>↑</Button>
                  <Button size="sm" variant="secondary" onClick={() => moveDown(idx)}>↓</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={checkOrder} className="bg-blue-600 hover:bg-blue-700">Check Order</Button>
            {status === "correct" && <span className="text-green-600 font-semibold">Correct!</span>}
            {status === "wrong" && <span className="text-red-600 font-semibold">Try again</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
