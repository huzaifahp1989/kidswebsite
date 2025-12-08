import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const DATA = [
  {
    surah: "Al-Ikhlas",
    ayah: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    words: ["قُلْ", "هُوَ", "اللَّهُ", "أَحَدٌ"],
  },
  {
    surah: "Al-Falaq",
    ayah: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
    words: ["قُلْ", "أَعُوذُ", "بِرَبِّ", "الْفَلَقِ"],
  },
];

function buildQuestion(item) {
  const idx = Math.floor(Math.random() * item.words.length);
  const missing = item.words[idx];
  const options = Array.from(new Set([
    missing,
    ...item.words.filter(w => w !== missing).slice(0, 2),
  ])).sort(() => Math.random() - 0.5);
  return { idx, missing, options };
}

export default function QuranMemorizationGame() {
  const [user, setUser] = useState(null);
  const [i, setI] = useState(0);
  const [q, setQ] = useState(buildQuestion(DATA[0]));
  const [state, setState] = useState(null);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const item = DATA[i % DATA.length];

  const choose = async (opt) => {
    if (state) return;
    const ok = opt === q.missing;
    setState(ok ? "correct" : "wrong");
    if (ok) {
      try { await awardPointsForGame(user, "quran_memorization", { fallbackScore: 25 }); } catch {}
      setTimeout(() => {
        const nextI = i + 1;
        setI(nextI);
        setQ(buildQuestion(DATA[nextI % DATA.length]));
        setState(null);
      }, 900);
    } else {
      setTimeout(() => setState(null), 700);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Quran Memorization Challenge</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center mb-3">
            <div className="text-gray-700">Surah: {item.surah}</div>
            <div className="mt-2 text-2xl font-bold text-blue-700" dir="rtl" lang="ar">
              {item.words.map((w, idx) => (
                <span key={idx} className="mx-1">
                  {idx === q.idx ? "_____" : w}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {q.options.map((o) => (
              <Button key={o} onClick={() => choose(o)} className="text-xl py-5" variant="secondary">
                <span dir="rtl" lang="ar">{o}</span>
              </Button>
            ))}
          </div>
          {state === "correct" && <div className="mt-4 text-green-600 font-semibold text-center">Correct! +25 points</div>}
          {state === "wrong" && <div className="mt-4 text-red-600 font-semibold text-center">Try again</div>}
        </CardContent>
      </Card>
    </div>
  );
}
