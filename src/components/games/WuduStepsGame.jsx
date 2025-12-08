import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const CORRECT = [
  "Intention (Niyyah)",
  "Bismillah",
  "Wash hands",
  "Rinse mouth",
  "Rinse nose",
  "Wash face",
  "Wash arms",
  "Wipe head",
  "Wipe ears",
  "Wash feet",
];

const shuffle = (arr) => arr.map(a => a).sort(() => Math.random() - 0.5);

export default function WuduStepsGame() {
  const [user, setUser] = useState(null);
  const [steps, setSteps] = useState(shuffle(CORRECT));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const moveUp = (idx) => {
    if (idx === 0) return;
    const next = steps.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setSteps(next);
  };

  const moveDown = (idx) => {
    if (idx === steps.length - 1) return;
    const next = steps.slice();
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setSteps(next);
  };

  const check = async () => {
    const ok = steps.every((s, i) => s === CORRECT[i]);
    setStatus(ok ? "correct" : "wrong");
    if (ok) {
      try { await awardPointsForGame(user, "wudu_steps", { fallbackScore: 15 }); } catch {}
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Wudu Steps Game</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 mb-3">Arrange steps in the Sunnah order</div>
          <div className="space-y-2">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center justify-between p-3 border rounded bg-white">
                <div className="font-semibold">{s}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => moveUp(idx)}>↑</Button>
                  <Button size="sm" variant="secondary" onClick={() => moveDown(idx)}>↓</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={check} className="bg-blue-600 hover:bg-blue-700">Check Order</Button>
            {status === "correct" && <span className="text-green-600 font-semibold">Correct!</span>}
            {status === "wrong" && <span className="text-red-600 font-semibold">Try again</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
