import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";
import { base44 } from "@/api/base44Client";

const CHAPTERS = [
  { id: "makkah_childhood", title: "Makkah Childhood", emoji: "🏘️" },
  { id: "first_revelation", title: "First Revelation", emoji: "🕋" },
  { id: "secret_dawah", title: "Secret Dawah", emoji: "🤫" },
  { id: "taif_journey", title: "Taif Journey", emoji: "🌄" },
  { id: "hijrah_madinah", title: "Hijrah to Madinah", emoji: "🏞️" },
  { id: "battles", title: "Battles (Badr, Uhud, Khandaq)", emoji: "⚔️" },
  { id: "hudaybiyah", title: "Treaty of Hudaybiyah", emoji: "🕊️" },
  { id: "conquest_makkah", title: "Conquest of Makkah", emoji: "🏛️" },
  { id: "final_sermon", title: "Final Sermon", emoji: "📜" },
];

const FALLBACK_SCENARIOS = {
  makkah_childhood: [
    { text: "Help the poor", correct: true, advice: "Kindness is loved by Allah." },
    { text: "Mock the weak", correct: false, advice: "Show mercy to everyone." },
  ],
  first_revelation: [
    { text: "Say 'Iqra' and calm down", correct: true, advice: "Seek comfort and truth." },
    { text: "Run away", correct: false, advice: "Be brave and patient." },
  ],
  secret_dawah: [
    { text: "Invite close friends wisely", correct: true, advice: "Wisdom in calling to good." },
    { text: "Reveal to enemies loudly", correct: false, advice: "Choose safe methods." },
  ],
  taif_journey: [
    { text: "Make dua for guidance", correct: true, advice: "Dua opens hearts." },
    { text: "Curse the people", correct: false, advice: "Show mercy despite harm." },
  ],
  hijrah_madinah: [
    { text: "Plan the route carefully", correct: true, advice: "Trust Allah and plan." },
    { text: "Walk openly at noon", correct: false, advice: "Use wisdom and secrecy." },
  ],
  battles: [
    { text: "Obey the Prophet ﷺ", correct: true, advice: "Unity brings victory." },
    { text: "Leave the position", correct: false, advice: "Obedience is key." },
  ],
  hudaybiyah: [
    { text: "Sign the treaty patiently", correct: true, advice: "Peace prepares strength." },
    { text: "Refuse and fight", correct: false, advice: "Seek long-term benefit." },
  ],
  conquest_makkah: [
    { text: "Forgive the people", correct: true, advice: "Mercy brings hearts." },
    { text: "Seek revenge", correct: false, advice: "Forgiveness elevates." },
  ],
  final_sermon: [
    { text: "Treat all equally", correct: true, advice: "No racism in Islam." },
    { text: "Prefer tribes", correct: false, advice: "Taqwa is the measure." },
  ],
};

export default function SeerahChaptersGame({ onComplete }) {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({ completed: [] });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [gems, setGems] = useState(0);
  const [loadingStory, setLoadingStory] = useState(false);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    try {
      const raw = localStorage.getItem("seerah_chapters_progress");
      const map = raw ? JSON.parse(raw) : {};
      const key = user?.uid || user?.id || "guest";
      const p = map[key] || { completed: [] };
      setProgress(p);
      const firstLocked = CHAPTERS.findIndex(ch => !p.completed.includes(ch.id));
      setCurrentIdx(firstLocked >= 0 ? firstLocked : 0);
    } catch {}
    return () => { try { stop?.(); } catch {} };
  }, []);

  useEffect(() => {
    const ch = CHAPTERS[currentIdx];
    if (!ch) return;
    setSelected(null);
    setResult(null);
    setLoadingStory(true);
    (async () => {
      try {
        const list = await base44.entities.Story.list('-created_date');
        const match = list.find(s => (String(s.title || '').toLowerCase().includes(ch.title.toLowerCase()) || String(s.category || '').toLowerCase() === 'seerah'));
        if (match && Array.isArray(match.story_nodes) && match.story_nodes.length) {
          const node = match.story_nodes[0];
          const mapped = (node.choices || []).map(c => ({ text: c.text || '', correct: (c.points || 0) > 0, advice: c.text || '' }));
          setChoices(mapped.length ? mapped : FALLBACK_SCENARIOS[ch.id]);
        } else {
          setChoices(FALLBACK_SCENARIOS[ch.id]);
        }
      } catch {
        setChoices(FALLBACK_SCENARIOS[ch.id]);
      } finally {
        setLoadingStory(false);
      }
    })();
  }, [currentIdx]);

  const chapter = CHAPTERS[currentIdx];
  const unlockedCount = useMemo(() => progress.completed.length, [progress]);
  const allDone = unlockedCount >= CHAPTERS.length;

  const choose = async (idx) => {
    if (selected != null) return;
    setSelected(idx);
    const choice = choices[idx];
    const correct = !!choice?.correct;
    setResult({ correct, advice: choice?.advice || '' });
    if (correct) {
      setGems((g) => g + 1);
      try { await awardPointsForGame(user, `seerah_${chapter.id}`, { fallbackScore: 5 }); } catch {}
    }
  };

  const next = () => {
    if (!chapter) return;
    const key = user?.uid || user?.id || "guest";
    const raw = localStorage.getItem("seerah_chapters_progress");
    const map = raw ? JSON.parse(raw) : {};
    const cur = map[key] || { completed: [] };
    const nextCompleted = Array.from(new Set([...(cur.completed || []), chapter.id]));
    const nextProgress = { completed: nextCompleted };
    map[key] = nextProgress;
    try { localStorage.setItem("seerah_chapters_progress", JSON.stringify(map)); } catch {}
    setProgress(nextProgress);
    const nextIdx = currentIdx + 1;
    if (nextIdx < CHAPTERS.length) {
      setCurrentIdx(nextIdx);
      setSelected(null);
      setResult(null);
    } else {
      try { onComplete?.(gems * 5); } catch {}
    }
  };

  if (!chapter) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-12 text-center">No chapters</CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-rose-600 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{chapter.emoji}</span>
              {chapter.title}
            </CardTitle>
            <Badge className="bg-white text-rose-700">Gems {gems}</Badge>
          </div>
          <p className="text-sm">Chapter {currentIdx + 1} of {CHAPTERS.length}</p>
        </CardHeader>
        <CardContent className="p-6">
          {loadingStory ? (
            <div className="text-center py-10">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {choices.map((c, i) => (
                  <Button key={i} onClick={() => choose(i)} disabled={selected != null} className="bg-rose-600 hover:bg-rose-700 whitespace-normal py-4">
                    {c.text}
                  </Button>
                ))}
              </div>
              {selected != null && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded ${result?.correct ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
                  {result?.correct ? "Correct choice!" : "Think again: "}{result?.advice || ''}
                </motion.div>
              )}
              {selected != null && (
                <div className="text-center">
                  <Button onClick={next} className="mt-2 bg-blue-600 hover:bg-blue-700">Continue</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

