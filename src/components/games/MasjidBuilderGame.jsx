import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";

const PARTS = [
  { id: "dome", name: "Dome", cost: 20 },
  { id: "minaret", name: "Minaret", cost: 25 },
  { id: "carpet", name: "Carpet", cost: 15 },
];

const BLOCKS = [
  { id: "grass", name: "Grass", color: "bg-green-200" },
  { id: "sand", name: "Sand", color: "bg-yellow-200" },
  { id: "water", name: "Water", color: "bg-blue-200" },
  { id: "stone", name: "Stone", color: "bg-gray-300" },
  { id: "wood", name: "Wood", color: "bg-amber-300" },
  { id: "carpet", name: "Carpet", color: "bg-red-200" },
  { id: "wall", name: "Masjid Wall", color: "bg-gray-400" },
  { id: "dome_top", name: "Dome Top", color: "bg-emerald-300" },
  { id: "window", name: "Window", color: "bg-white" },
  { id: "minaret", name: "Minaret", color: "bg-purple-300" },
];

export default function MasjidBuilderGame() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(30);
  const [owned, setOwned] = useState({});
  const [grid, setGrid] = useState(Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => null)));
  const [tool, setTool] = useState("place");
  const [selectedBlock, setSelectedBlock] = useState("grass");
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    try {
      const raw = localStorage.getItem("masjid_builder_state");
      if (raw) {
        const s = JSON.parse(raw);
        setCoins(Number(s.coins || 30));
        setOwned(s.owned || {});
        if (Array.isArray(s.grid)) setGrid(s.grid);
        if (s.tool) setTool(s.tool);
        if (s.selectedBlock) setSelectedBlock(s.selectedBlock);
      }
    } catch {}
    return () => { try { stop?.(); } catch {} };
  }, []);

  const save = (nextCoins, nextOwned, nextGrid = grid, nextTool = tool, nextSelected = selectedBlock) => {
    setCoins(nextCoins);
    setOwned(nextOwned);
    setGrid(nextGrid);
    setTool(nextTool);
    setSelectedBlock(nextSelected);
    try { localStorage.setItem("masjid_builder_state", JSON.stringify({ coins: nextCoins, owned: nextOwned, grid: nextGrid, tool: nextTool, selectedBlock: nextSelected })); } catch {}
  };

  const earnCoins = async () => {
    const next = coins + 10;
    save(next, owned);
    try { await awardPointsForGame(user, "masjid_builder_coins", { fallbackScore: 10 }); } catch {}
  };

  const buy = async (part) => {
    if (owned[part.id]) return;
    if (coins < part.cost) return;
    const nextCoins = coins - part.cost;
    const nextOwned = { ...owned, [part.id]: true };
    save(nextCoins, nextOwned);
    try { await awardPointsForGame(user, "masjid_builder_purchase", { fallbackScore: 15 }); } catch {}
  };

  const complete = PARTS.every(p => owned[p.id]);

  const placeAt = async (x, y) => {
    const next = grid.map(row => row.slice());
    if (tool === "remove") {
      next[y][x] = null;
    } else if (tool === "paint") {
      if (next[y][x]) next[y][x] = { ...next[y][x], id: selectedBlock };
    } else if (tool === "rotate") {
      if (next[y][x]) next[y][x] = { ...next[y][x], r: ((next[y][x].r || 0) + 90) % 360 };
    } else {
      next[y][x] = { id: selectedBlock, r: rotation };
      try { await awardPointsForGame(user, "masjid_builder_build", { fallbackScore: 2 }); } catch {}
    }
    save(coins, owned, next);
  };

  const gridView = useMemo(() => {
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`, gridTemplateRows: `repeat(${grid.length}, 1fr)` }}>
        {grid.flatMap((row, y) => row.map((cell, x) => (
          <div key={`${x}-${y}`} className="border aspect-square flex items-center justify-center">
            <div
              onClick={() => placeAt(x, y)}
              className={`w-full h-full ${BLOCKS.find(b => b.id === (cell?.id || selectedBlock))?.color || 'bg-white'}`}
              style={{ transform: `rotate(${cell?.r || 0}deg)` }}
            >
              {cell?.id ? '' : ''}
            </div>
          </div>
        )))}
      </div>
    );
  }, [grid, selectedBlock, tool, rotation]);

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Masjid Builder</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Coins: {coins}</div>
            <Button onClick={earnCoins} variant="outline">Earn +10 Coins</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {PARTS.map(p => (
              <div key={p.id} className="p-3 border rounded">
                <div className="font-semibold mb-1">{p.name}</div>
                <div className="text-sm text-gray-600 mb-2">Cost: {p.cost}</div>
                {owned[p.id] ? (
                  <div className="text-green-600 font-semibold">Owned</div>
                ) : (
                  <Button onClick={() => buy(p)} disabled={coins < p.cost} className="bg-blue-600 hover:bg-blue-700">Buy</Button>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {BLOCKS.map(b => (
              <Button key={b.id} variant={selectedBlock === b.id ? 'default' : 'outline'} onClick={() => setSelectedBlock(b.id)}>{b.name}</Button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant={tool === 'place' ? 'default' : 'outline'} onClick={() => setTool('place')}>Place</Button>
            <Button variant={tool === 'remove' ? 'default' : 'outline'} onClick={() => setTool('remove')}>Remove</Button>
            <Button variant={tool === 'paint' ? 'default' : 'outline'} onClick={() => setTool('paint')}>Paint</Button>
            <Button variant={tool === 'rotate' ? 'default' : 'outline'} onClick={() => setTool('rotate')}>Rotate</Button>
          </div>
          <div className="mb-4">
            {gridView}
          </div>
          <div className="p-4 border rounded bg-gradient-to-br from-blue-50 to-amber-50">
            <div className="text-center font-semibold mb-2">Your Masjid</div>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded ${owned.dome ? 'bg-amber-200' : 'bg-gray-200'}`}>Dome</div>
              <div className={`p-3 rounded ${owned.minaret ? 'bg-amber-200' : 'bg-gray-200'}`}>Minaret</div>
              <div className={`p-3 rounded ${owned.carpet ? 'bg-amber-200' : 'bg-gray-200'}`}>Carpet</div>
            </div>
          </div>
          {complete && <div className="mt-4 text-green-700 font-semibold text-center">Masjid Complete! +20 points</div>}
        </CardContent>
      </Card>
    </div>
  );
}
