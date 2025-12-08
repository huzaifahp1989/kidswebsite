import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap, BookOpen } from "lucide-react";
import { BANK, pickRandom } from "@/data/kids_bank";

export default function KidsQuiz({ onComplete, user }) {
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const categories = [
    { id: "seerah", name: "Seerah", emoji: "📖", color: "from-blue-500 to-indigo-500" },
    { id: "prophets", name: "Prophets", emoji: "🕊️", color: "from-emerald-500 to-teal-500" },
    { id: "quran", name: "Quran", emoji: "📚", color: "from-purple-500 to-pink-500" },
    { id: "akhlaq", name: "Akhlaq", emoji: "✨", color: "from-amber-500 to-orange-500" },
  ];

  useEffect(() => {
    if (category) {
      const src = BANK[category] || [];
      const qs = pickRandom(src, Math.min(10, src.length)).map((row, idx) => {
        const variants = buildOptions(row);
        return { id: `${category}_${idx}`, q: row.q, a: row.a, ref: row.ref, options: variants };
      });
      setQuestions(qs);
      setI(0);
      setScore(0);
      setDone(false);
      setSelected(null);
      setShowResult(false);
    }
  }, [category]);

  const buildOptions = (row) => {
    const correct = row.a;
    const pool = Object.values(BANK).flat().map(x => x.a).filter(x => x !== correct);
    const distractors = pickRandom(pool, 3);
    const opts = pickRandom([correct, ...distractors], 4);
    return opts;
  };

  const current = questions[i];

  const handleAnswer = (opt) => {
    if (done || showResult) return;
    setSelected(opt);
    const isCorrect = normalize(opt) === normalize(current.a) || normalizeAkhlaq(opt, current.a);
    if (isCorrect) setScore(prev => prev + 2);
    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
      setSelected(null);
      if (i < questions.length - 1) setI(i + 1); else setDone(true);
    }, 700);
  };

  const normalize = (s) => String(s || "").trim().toLowerCase();
  const normalizeAkhlaq = (opt, answer) => {
    const a = normalize(answer).split('/').map(x => normalize(x));
    return a.includes(normalize(opt));
  };

  if (!category) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> Islamic Kids Quiz
          </CardTitle>
          <p className="text-blue-100">Pick a topic to start</p>
        </CardHeader>
        <CardContent className="p-6 grid sm:grid-cols-2 gap-4">
          {categories.map(cat => (
            <Button key={cat.id} onClick={() => setCategory(cat.id)} className={`h-20 bg-gradient-to-r ${cat.color}`}>
              <span className="text-2xl mr-2">{cat.emoji}</span> {cat.name}
            </Button>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete</h2>
            <p className="text-lg text-gray-700 mb-2">You earned <span className="font-bold text-amber-600">{total}</span> points.</p>
            <Button onClick={() => { setCategory(null); }} className="bg-gradient-to-r from-blue-500 to-purple-500">Play Again</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!current) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-gray-600">Loading questions...</p>
        </CardContent>
      </Card>
    );
  }

  const progress = ((i + 1) / questions.length) * 100;

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl">{category.toUpperCase()}</CardTitle>
          <Badge className="bg-white/30 text-white">Score: {score}</Badge>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div style={{ width: `${progress}%` }} className="h-2 bg-white/70" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{current.q}</h3>
              <p className="text-sm text-gray-600">Reference: {current.ref}</p>
            </div>
            <div className="grid gap-3">
              {current.options.map((opt, idx) => {
                const isCorrect = normalize(opt) === normalize(current.a) || normalizeAkhlaq(opt, current.a);
                const isSelected = opt === selected;
                const showCorrect = showResult && isCorrect;
                const showWrong = showResult && isSelected && !isCorrect;
                return (
                  <Button key={idx} onClick={() => handleAnswer(opt)} disabled={showResult} className={`h-auto py-4 text-lg justify-start transition-all ${showCorrect ? "bg-green-500 hover:bg-green-600 text-white" : showWrong ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white hover:bg-blue-50 text-gray-900 border-2"}`} variant={showResult ? "default" : "outline"}>
                    <span className="flex-1 text-left">{opt}</span>
                    {showCorrect && <Zap className="w-5 h-5 ml-2 text-yellow-300" />}
                  </Button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
