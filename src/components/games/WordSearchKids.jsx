import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WORDS, pickRandom } from "@/data/kids_bank";

export default function WordSearchKids({ onComplete }) {
  const [category, setCategory] = useState(null);
  const [grid, setGrid] = useState([]);
  const [words, setWords] = useState([]);
  const [found, setFound] = useState([]);
  const [sel, setSel] = useState("");
  const [score, setScore] = useState(0);

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const start = (cat) => {
    const list = WORDS[cat] || [];
    const W = pickRandom(list, Math.min(8, list.length)).map(w => w.toUpperCase());
    const size = 12;
    const g = Array.from({ length: size }, () => Array.from({ length: size }, () => letters[Math.floor(Math.random() * letters.length)]));
    W.forEach((w, idx) => {
      const row = idx % size;
      for (let c = 0; c < w.length && c < size; c++) g[row][c] = w[c];
    });
    setGrid(g);
    setWords(W);
    setFound([]);
    setSel("");
    setScore(0);
    setCategory(cat);
  };

  const clickCell = (ch) => {
    const next = (sel + ch).toUpperCase();
    setSel(next);
    if (words.includes(next) && !found.includes(next)) {
      setFound(prev => [...prev, next]);
      setScore(prev => prev + 2);
      setSel("");
      if (found.length + 1 >= words.length) onComplete && onComplete(score + 2);
    }
    if (next.length > 16) setSel("");
  };

  const resetSel = () => setSel("");

  if (!category) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
          <CardTitle className="text-2xl">Word Search</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid sm:grid-cols-2 gap-4">
          {Object.keys(WORDS).map(c => (
            <Button key={c} onClick={() => start(c)} className="bg-gradient-to-r from-indigo-500 to-blue-500">{c.toUpperCase()}</Button>
          ))}
        </CardContent>
      </Card>
    );
  }

  const size = grid.length;
  const progress = words.length ? (found.length / words.length) * 100 : 0;

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl">{category.toUpperCase()}</CardTitle>
          <Badge className="bg-white/30 text-white">Score: {score}</Badge>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden"><div style={{ width: `${progress}%` }} className="h-2 bg-white/70" /></div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-12 gap-1 mb-4">
          {grid.map((row, rIdx) => row.map((ch, cIdx) => (
            <Button key={`${rIdx}-${cIdx}`} onClick={() => clickCell(ch)} className="h-8 w-8 p-0 text-xs bg-white border-2 hover:bg-blue-50">{ch}</Button>
          )))}
        </div>
        <div className="mb-3 text-sm">Find: {words.map(w => (<span key={w} className={`inline-block mr-2 ${found.includes(w) ? 'line-through text-green-600' : 'text-gray-700'}`}>{w}</span>))}</div>
        <div className="flex gap-2">
          <Button onClick={resetSel} className="bg-gradient-to-r from-gray-500 to-gray-700">Clear Selection</Button>
        </div>
      </CardContent>
    </Card>
  );
}
