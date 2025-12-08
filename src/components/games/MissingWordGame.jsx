import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { BANK, pickRandom } from "@/data/kids_bank";

export default function MissingWordGame({ onComplete }) {
  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const cats = ["seerah","prophets","quran"];

  useEffect(() => {
    if (category) {
      const src = BANK[category] || [];
      const picked = pickRandom(src, Math.min(8, src.length));
      const shaped = picked
        .filter((row) => row && row.q && row.a)
        .map((row) => {
          const firstToken = String(row.a || '').split(' ')[0] || '';
          const escaped = firstToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const blank = firstToken ? row.q.replace(new RegExp(escaped, 'i'), "_____") : row.q;
          return { q: blank, a: row.a, ref: row.ref };
        });
      setItems(shaped);
      setI(0);
      setScore(0);
      setDone(false);
      setInput("");
    }
  }, [category]);

  const onSubmit = () => {
    if (done) return;
    const current = items[i];
    if (!current) return;
    const correct = String(current.a || "");
    const ok = normalize(input) === normalize(correct);
    if (ok) setScore(prev => prev + 2);
    if (i < items.length - 1) { setI(i + 1); setInput(""); } else { setDone(true); }
  };

  const normalize = (s) => String(s || "").trim().toLowerCase();

  if (!category) {
    return (
      <Card className="max-w-xl mx-auto shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <CardTitle className="text-2xl">Fill in the Missing Word</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid sm:grid-cols-3 gap-4">
          {cats.map(c => (
            <Button key={c} onClick={() => setCategory(c)} className="bg-gradient-to-r from-emerald-500 to-teal-500">{c.toUpperCase()}</Button>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Well Done</h2>
            <p className="text-lg text-gray-700 mb-2">You earned <span className="font-bold text-amber-600">{total}</span> points.</p>
            <Button onClick={() => setCategory(null)} className="bg-gradient-to-r from-emerald-500 to-teal-500">Play Again</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const item = items[i];
  const progress = items.length > 0 ? (((i + 1) / items.length) * 100) : 0;

  return (
    <Card className="max-w-xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl">{category.toUpperCase()}</CardTitle>
          <Badge className="bg-white/30 text-white">Score: {score}</Badge>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden"><div style={{ width: `${progress}%` }} className="h-2 bg-white/70" /></div>
      </CardHeader>
      <CardContent className="p-6">
        {items.length === 0 ? (
          <div className="text-center text-gray-600 py-8">Loading questions…</div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 mb-4">
            <p className="text-xl font-bold text-gray-900 mb-2">{item?.q}</p>
            <p className="text-sm text-gray-600">Reference: {item?.ref}</p>
          </div>
        )}
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Type answer" className="w-full border-2 rounded-lg px-3 py-2 mb-4" />
        <Button onClick={onSubmit} disabled={items.length === 0} className="bg-gradient-to-r from-emerald-500 to-teal-500">Next</Button>
      </CardContent>
    </Card>
  );
}
