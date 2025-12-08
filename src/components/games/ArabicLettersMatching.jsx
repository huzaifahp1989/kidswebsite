import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const LETTERS = [
  { ar: "ا", opts: ["ا", "ب", "ت"], sound: "alif" },
  { ar: "ب", opts: ["ت", "ب", "ث"], sound: "baa" },
  { ar: "ت", opts: ["ت", "ج", "ح"], sound: "taa" },
];

export default function ArabicLettersMatching() {
  const [user, setUser] = useState(null);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const current = LETTERS[idx % LETTERS.length];

  const speak = () => {
    try {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(current.ar);
        u.lang = "ar-SA";
        u.rate = 0.8;
        speechSynthesis.speak(u);
      }
    } catch {}
  };

  const pick = async (opt) => {
    if (status) return;
    const ok = opt === current.ar;
    setStatus(ok ? "correct" : "wrong");
    if (ok) {
      try { await awardPointsForGame(user, "arabic_letters_matching", { fallbackScore: 5 }); } catch {}
      setTimeout(() => { setIdx((i) => i + 1); setStatus(null); }, 800);
    } else {
      setTimeout(() => setStatus(null), 600);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="text-6xl font-bold text-blue-700" dir="rtl" lang="ar">{current.ar}</div>
            <Button onClick={speak} variant="outline" className="mt-2">Play Sound</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {current.opts.map((o, i) => (
              <Button key={i} onClick={() => pick(o)} className="text-2xl py-6" variant="secondary">
                <span dir="rtl" lang="ar">{o}</span>
              </Button>
            ))}
          </div>
          {status === "correct" && <div className="mt-4 text-green-600 font-semibold text-center">Correct! +5 points</div>}
          {status === "wrong" && <div className="mt-4 text-red-600 font-semibold text-center">Try again</div>}
        </CardContent>
      </Card>
    </div>
  );
}
