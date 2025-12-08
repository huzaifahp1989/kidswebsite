import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const QUESTIONS = [
  {
    clues: ["Swallowed by a big fish", "Called his people to Allah"],
    options: ["Musa (AS)", "Yunus (AS)", "Ibrahim (AS)"],
    correct: 1,
    refs: ["Quran 37:139-148"],
  },
  {
    clues: ["Built the Kaaba", "Father of Ismail (AS)"],
    options: ["Ibrahim (AS)", "Yusuf (AS)", "Nuh (AS)"],
    correct: 0,
    refs: ["Quran 2:127"],
  },
];

export default function WhichProphetGame() {
  const [user, setUser] = useState(null);
  const [i, setI] = useState(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const q = QUESTIONS[i % QUESTIONS.length];

  const pick = async (idx) => {
    if (state) return;
    const ok = idx === q.correct;
    setState(ok ? "correct" : "wrong");
    if (ok) {
      try { await awardPointsForGame(user, "which_prophet", { fallbackScore: 15 }); } catch {}
      setTimeout(() => { setI((x) => x + 1); setState(null); }, 900);
    } else {
      setTimeout(() => setState(null), 700);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Which Prophet?</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-3">
            <div className="text-gray-700 font-semibold">Clues</div>
            <ul className="list-disc list-inside text-gray-800">
              {q.clues.map((c, idx) => (<li key={idx}>{c}</li>))}
            </ul>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {q.options.map((o, idx) => (
              <Button key={o} onClick={() => pick(idx)} className="whitespace-normal py-4">
                {o}
              </Button>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">References: {q.refs.join(", ")}</div>
          {state === "correct" && <div className="mt-3 text-green-600 font-semibold">Correct! +15 points</div>}
          {state === "wrong" && <div className="mt-3 text-red-600 font-semibold">Try again</div>}
        </CardContent>
      </Card>
    </div>
  );
}
