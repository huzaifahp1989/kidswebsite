import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

function readItems() { try { return JSON.parse(localStorage.getItem('admin_wudu_steps') || '[]'); } catch { return []; } }
function writeItems(items) { try { localStorage.setItem('admin_wudu_steps', JSON.stringify(items)); } catch {} }

export default function AdminWuduSteps() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => { setItems(readItems()); }, []);

  const add = () => {
    if (!text) return;
    const next = [...items, { id: `${Date.now()}`, text }];
    setItems(next);
    writeItems(next);
    setText("");
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
          <h1 className="text-2xl font-bold">Admin: Wudu Steps</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Step</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Step text" value={text} onChange={e => setText(e.target.value)} />
            <Button onClick={add} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Add</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.length === 0 && <div className="text-gray-600">No steps yet</div>}
              {items.map(it => (
                <div key={it.id} className="flex items-center justify-between p-3 border rounded bg-white">
                  <div className="font-semibold">{it.text}</div>
                  <Button variant="outline" onClick={() => remove(it.id)}><Trash2 className="w-4 h-4 mr-2" /> Remove</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
