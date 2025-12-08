import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const ITEMS = [
  { dua: "رَبِّ زِدْنِي عِلْمًا", meaning: "My Lord, increase me in knowledge", options: ["My Lord, forgive me", "My Lord, increase me in knowledge", "Guide us to the straight path"], points: 5 },
  { dua: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً", meaning: "Our Lord, grant us good in this world", options: ["Grant us patience", "Grant us good in this world", "Grant us wealth"], points: 5 },
];

export default function DuaMeaningQuiz({ onComplete }) {
  const [user, setUser] = useState(null);
  const [i, setI] = useState(0);
  const [state, setState] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const q = ITEMS[i % ITEMS.length];

  const choose = async (opt) => {
    if (state) return;
    const ok = opt === q.meaning;
    setState(ok ? "correct" : "wrong");
    if (ok) {
      try { await awardPointsForGame(user, "dua_meaning_quiz", { fallbackScore: q.points }); } catch {}
      setTimeout(() => { setI((x) => x + 1); setState(null); if (typeof onComplete === 'function') onComplete(); }, 900);
    } else {
      setTimeout(() => setState(null), 700);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-2xl font-semibold mb-1">Choose the meaning</div>
            <div className="text-3xl text-blue-700 font-bold" dir="rtl" lang="ar">{q.dua}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {q.options.map((o) => (
              <Button key={o} type="button" variant="secondary" onClick={() => choose(o)} className="whitespace-normal py-4">
                {o}
              </Button>
            ))}
          </div>
          {state === "correct" && <div className="mt-4 text-green-600 font-semibold text-center">Correct! +{q.points} points</div>}
          {state === "wrong" && <div className="mt-4 text-red-600 font-semibold text-center">Try again</div>}
        </CardContent>
      </Card>
    </div>
  );
}
