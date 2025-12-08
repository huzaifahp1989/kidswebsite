import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const SIZE = 10;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const TARGETS = [
  { id: "ihram", name: "Ihram Clothing", emoji: "🕋", pos: { x: 0, y: 0 }, points: 10, info: "Wear ihram garments." },
  { id: "talbiyah", name: "Intention + Talbiyah", emoji: "📿", pos: { x: 3, y: 0 }, points: 10, info: "Say 'Labbayk Allahumma Labbayk'." },
  { id: "tawaf", name: "Tawaf", emoji: "🕋", pos: { x: 4, y: 4 }, points: 15, info: "Walk around the Kaaba 7 times." },
  { id: "sai", name: "Sa’i", emoji: "⛰️", pos: { x: 2, y: 7 }, points: 15, info: "Walk between Safa and Marwa." },
  { id: "zamzam", name: "Drinking Zamzam", emoji: "💧", pos: { x: 6, y: 6 }, points: 10, info: "Drink blessed Zamzam water." },
  { id: "mina", name: "Sleeping in Mina", emoji: "⛺", pos: { x: 1, y: 2 }, points: 10, info: "Stay in tents at Mina." },
  { id: "arafah", name: "Arafah", emoji: "🌥️", pos: { x: 9, y: 1 }, points: 20, info: "Stand at Arafah." },
  { id: "muzdalifah", name: "Muzdalifah", emoji: "🪨", pos: { x: 9, y: 8 }, points: 10, info: "Collect pebbles." },
  { id: "jamarat", name: "Throwing Jamarāt", emoji: "🪨", pos: { x: 8, y: 3 }, points: 20, info: "Throw pebbles at pillars." },
  { id: "eid", name: "Eid Day – Sacrifice", emoji: "🕌", pos: { x: 5, y: 1 }, points: 10, info: "Offer sacrifice." },
  { id: "farewell", name: "Farewell Tawaf", emoji: "🕋", pos: { x: 4, y: 5 }, points: 15, info: "Perform Tawaf al-Wada'." },
];

export default function HajjUmrahSimulator({ onComplete }) {
  const [user, setUser] = useState(null);
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const current = TARGETS[step] || null;

  const move = (dx, dy) => {
    setStatus(null);
    setPlayer((p) => {
      const nx = clamp(p.x + dx, 0, SIZE - 1);
      const ny = clamp(p.y + dy, 0, SIZE - 1);
      return { x: nx, y: ny };
    });
  };

  useEffect(() => {
    if (!current) return;
    if (player.x === current.pos.x && player.y === current.pos.y) {
      setStatus("reached");
    }
  }, [player, current]);

  const confirmStep = async () => {
    if (status !== "reached" || !current) return;
    try { await awardPointsForGame(user, `hajj_umrah_${current.id}`, { fallbackScore: current.points }); } catch {}
    setStep((s) => s + 1);
    setStatus(null);
    if (step + 1 >= TARGETS.length) {
      const total = TARGETS.reduce((acc, t) => acc + t.points, 0);
      try { onComplete?.(total); } catch {}
    }
  };

  const done = step >= TARGETS.length;

  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isPlayer = player.x === x && player.y === y;
      const isTarget = current && current.pos.x === x && current.pos.y === y;
      const mark = TARGETS.find(t => t.pos.x === x && t.pos.y === y);
      cells.push({ x, y, isPlayer, isTarget, mark });
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Hajj & Umrah Simulator</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!done ? (
            <div className="mb-3">
              <div className="text-lg font-semibold">Step: {current?.name}</div>
              <div className="text-sm text-gray-600">{current?.info}</div>
            </div>
          ) : (
            <div className="mb-3 text-green-700 font-semibold">Journey complete!</div>
          )}

          <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button onClick={() => move(0, -1)} className="bg-blue-600 hover:bg-blue-700">Up</Button>
            <Button onClick={() => move(0, 1)} className="bg-blue-600 hover:bg-blue-700">Down</Button>
            <Button onClick={() => move(-1, 0)} className="bg-blue-600 hover:bg-blue-700">Left</Button>
            <Button onClick={() => move(1, 0)} className="bg-blue-600 hover:bg-blue-700">Right</Button>
          </div>

          <div className="aspect-square w-full max-w-xl mx-auto">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}>
              {cells.map((c) => (
                <div key={`${c.x}-${c.y}`} className={`border flex items-center justify-center ${c.isTarget ? 'bg-amber-100' : 'bg-white'}`}>
                  {c.mark && <span className="text-xl" title={c.mark.name}>{c.mark.emoji}</span>}
                  {c.isPlayer && <div className="w-6 h-6 rounded-full bg-blue-600" />}
                </div>
              ))}
            </div>
          </div>

          {!done && (
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={confirmStep} disabled={status !== 'reached'} className="bg-amber-600 hover:bg-amber-700">Complete Step</Button>
              {status === 'reached' && <span className="text-green-700 font-semibold">You reached {current?.name}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
