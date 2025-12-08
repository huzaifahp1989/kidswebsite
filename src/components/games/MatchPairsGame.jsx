import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { MATCH_PAIRS, pickRandom } from "@/data/kids_bank";

export default function MatchPairsGame({ onComplete }) {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const pairs = pickRandom(MATCH_PAIRS, MATCH_PAIRS.length);
    const left = pairs.map(p => ({ id: `L_${p.left}`, text: p.left, group: p.left }));
    const right = pairs.map(p => ({ id: `R_${p.right}`, text: p.right, group: p.left }));
    const shuffled = pickRandom([...left, ...right], left.length + right.length);
    setCards(shuffled);
    setSelected([]);
    setMatched([]);
    setScore(0);
    setDone(false);
  }, []);

  const onCard = (id) => {
    if (done || matched.includes(id)) return;
    const nextSel = selected.includes(id) ? selected : [...selected, id].slice(-2);
    setSelected(nextSel);
    if (nextSel.length === 2) {
      const [a, b] = nextSel.map(x => cards.find(c => c.id === x));
      if (a && b && a.group === b.group && a.id !== b.id) {
        setMatched(prev => [...prev, a.id, b.id]);
        setScore(prev => prev + 2);
        setSelected([]);
        if (matched.length + 2 >= cards.length) setDone(true);
      } else {
        setTimeout(() => setSelected([]), 600);
      }
    }
  };

  if (done) {
    const total = score;
    onComplete && onComplete(total);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <Card className="max-w-md mx-auto border-2 border-amber-400 shadow-2xl">
          <CardContent className="pt-10 pb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pairs Matched</h2>
            <p className="text-lg text-gray-700 mb-2">You earned <span className="font-bold text-amber-600">{total}</span> points.</p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-pink-500 to-rose-500">Play Again</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl">Match the Pairs</CardTitle>
          <Badge className="bg-white/30 text-white">Score: {score}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(c => {
          const isSel = selected.includes(c.id);
          const isMat = matched.includes(c.id);
          return (
            <Button key={c.id} onClick={() => onCard(c.id)} disabled={isMat} className={`h-16 text-sm ${isMat ? 'bg-green-500 text-white' : isSel ? 'bg-yellow-200' : 'bg-white'} border-2`}>{c.text}</Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
