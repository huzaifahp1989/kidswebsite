import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

function readItems() { try { return JSON.parse(localStorage.getItem('admin_prophet_clues') || '[]'); } catch { return []; } }
function writeItems(items) { try { localStorage.setItem('admin_prophet_clues', JSON.stringify(items)); } catch {} }

export default function AdminProphetClues() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [clue, setClue] = useState("");
  const [options, setOptions] = useState("");
  const [correctIdx, setCorrectIdx] = useState(0);
  const [refs, setRefs] = useState("");

  useEffect(() => { setItems(readItems()); }, []);

  const add = () => {
    const opts = options.split(',').map(s => s.trim()).filter(Boolean);
    if (!clue || opts.length < 2) return;
    const next = [...items, { id: `${Date.now()}`, clues: [clue], options: opts, correct: Number(correctIdx) || 0, refs: refs ? refs.split(',').map(s=>s.trim()) : [] }];
    setItems(next);
    writeItems(next);
    setClue(""); setOptions(""); setCorrectIdx(0); setRefs("");
  };

  const remove = (id) => {
    const next = items.filter(it => it.id !== id);
    setItems(next);
    writeItems(next);
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl("AdminDashboard")}>
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </Link>
          <h1 className="text-2xl font-bold">Admin: Prophet Clues</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Clue Set</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Clue" value={clue} onChange={e => setClue(e.target.value)} />
            <Input placeholder="Options (comma separated)" value={options} onChange={e => setOptions(e.target.value)} />
            <Input placeholder="Correct index (0-based)" type="number" value={correctIdx} onChange={e => setCorrectIdx(e.target.value)} />
            <Input placeholder="Quran refs (comma separated)" value={refs} onChange={e => setRefs(e.target.value)} />
            <Button onClick={add} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Add</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clue Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.length === 0 && <div className="text-gray-600">No clue sets yet</div>}
              {items.map(it => (
                <div key={it.id} className="p-3 border rounded bg-white">
                  <div className="font-semibold">{it.clues?.[0]}</div>
                  <div className="text-sm text-gray-600">Options: {it.options.join(', ')}</div>
                  <div className="text-sm text-gray-600">Correct: {it.options[it.correct]}</div>
                  {it.refs?.length > 0 && <div className="text-xs text-gray-500">Refs: {it.refs.join(', ')}</div>}
                  <div className="mt-2">
                    <Button variant="outline" onClick={() => remove(it.id)}><Trash2 className="w-4 h-4 mr-2" /> Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
