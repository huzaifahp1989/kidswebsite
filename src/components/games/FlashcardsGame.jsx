import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BANK, pickRandom } from "@/data/kids_bank";

export default function FlashcardsGame({ onComplete }) {
  const categories = ["seerah","prophets","quran","akhlaq"];
  const [category, setCategory] = useState(null);
  const [cards, setCards] = useState([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const start = (cat) => {
    const src = BANK[cat] || [];
    const picked = pickRandom(src, Math.min(10, src.length));
    setCards(picked);
    setI(0);
    setFlipped(false);
    setScore(0);
    setDone(false);
    setCategory(cat);
  };

  const markKnown = () => {
    if (!flipped) return;
    setScore(prev => prev + 2);
    next();
  };

  const next = () => {
    if (i < cards.length - 1) { setI(i + 1); setFlipped(false); } else { setDone(true); }
  };

  if (!category) {
    return (
      <Card className="max-w-xl mx-auto shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardTitle className="text-2xl">Flashcards</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid sm:grid-cols-2 gap-4">
          {categories.map(c => (
            <Button key={c} onClick={() => start(c)} className="bg-gradient-to-r from-amber-500 to-orange-500">{c.toUpperCase()}</Button>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (done) {
    const total = score;
    onComplete && onComplete(total);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <Card className="max-w-md mx-auto border-2 border-amber-400 shadow-2xl">
          <CardContent className="pt-10 pb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Great Learning</h2>
            <p className="text-lg text-gray-700 mb-2">You earned <span className="font-bold text-amber-600">{total}</span> points.</p>
            <Button onClick={() => setCategory(null)} className="bg-gradient-to-r from-amber-500 to-orange-500">Play Again</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const current = cards[i];
  const progress = ((i + 1) / cards.length) * 100;

  return (
    <Card className="max-w-xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl">{category.toUpperCase()}</CardTitle>
          <Badge className="bg-white/30 text-white">Score: {score}</Badge>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden"><div style={{ width: `${progress}%` }} className="h-2 bg-white/70" /></div>
      </CardHeader>
      <CardContent className="p-6 text-center">
        <div className={`rounded-xl p-6 border-2 ${flipped ? 'bg-amber-50' : 'bg-white'}`}>
          <p className="text-xl font-bold text-gray-900 mb-2">{flipped ? current.a : current.q}</p>
          <p className="text-sm text-gray-600">{flipped ? `Reference: ${current.ref}` : 'Tap Reveal to see the answer'}</p>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <Button onClick={() => setFlipped(true)} className="bg-gradient-to-r from-blue-500 to-purple-500">Reveal</Button>
          <Button onClick={markKnown} className="bg-gradient-to-r from-green-500 to-emerald-500">I knew it</Button>
          <Button onClick={next} className="bg-gradient-to-r from-gray-500 to-gray-700">Skip</Button>
        </div>
      </CardContent>
    </Card>
  );
}
