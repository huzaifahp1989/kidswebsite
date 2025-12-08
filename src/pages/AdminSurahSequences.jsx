import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

function readItems() {
  try { return JSON.parse(localStorage.getItem('admin_surah_sequences') || '[]'); } catch { return []; }
}
function writeItems(items) {
  try { localStorage.setItem('admin_surah_sequences', JSON.stringify(items)); } catch {}
}

export default function AdminSurahSequences() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");

  useEffect(() => { setItems(readItems()); }, []);

  const add = () => {
    const o = Number(order);
    if (!name || !o) return;
    const next = [...items, { id: `${Date.now()}`, name, order: o }];
    setItems(next);
    writeItems(next);
    setName("");
    setOrder("");
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
          <h1 className="text-2xl font-bold">Admin: Surah Sequences</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Surah</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Surah name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Order number" type="number" value={order} onChange={e => setOrder(e.target.value)} />
            <Button onClick={add} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Add</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Surahs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.length === 0 && <div className="text-gray-600">No surahs yet</div>}
              {items.sort((a,b)=>a.order-b.order).map(it => (
                <div key={it.id} className="flex items-center justify-between p-3 border rounded bg-white">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-sm text-gray-600">Order: {it.order}</div>
                  </div>
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
