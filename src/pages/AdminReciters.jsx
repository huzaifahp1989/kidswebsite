import React, { useEffect, useState } from 'react'
import { getFirebase } from '@/api/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default function AdminReciters() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', flag: '🎧', base_url: '', supports_verse_audio: false, verse_edition_id: '', active: true })
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true); setMsg('')
    try {
      setRows([])
    } catch (e) {
      setMsg(e?.message || 'Failed to load reciters')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const upsert = async () => {
    setMsg('')
    try {
      const { auth } = getFirebase();
      const u = auth?.currentUser;
      if (!u?.uid) { setMsg('Admin login required'); return }
      setForm({ id: '', name: '', flag: '🎧', base_url: '', supports_verse_audio: false, verse_edition_id: '', active: true })
      load();
      setMsg('Saved')
    } catch (e) { setMsg(e?.message || 'Save failed') }
  }

  const remove = async (id) => {
    setMsg('')
    try {
      const { auth } = getFirebase();
      const u = auth?.currentUser;
      if (!u?.uid) { setMsg('Admin login required'); return }
      load();
      setMsg('Deleted')
    } catch (e) { setMsg(e?.message || 'Delete failed') }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Quran Reciters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {msg && <div className="text-sm p-2 rounded border bg-white/60">{msg}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="id">ID</Label>
              <Input id="id" value={form.id} onChange={e=>setForm({ ...form, id: e.target.value.trim() })} placeholder="e.g., awhaneef" />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} placeholder="Display name" />
            </div>
            <div>
              <Label htmlFor="flag">Flag/Emoji</Label>
              <Input id="flag" value={form.flag} onChange={e=>setForm({ ...form, flag: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="base_url">Base URL</Label>
              <Input id="base_url" value={form.base_url} onChange={e=>setForm({ ...form, base_url: e.target.value })} placeholder="https://.../<reciter>/" />
            </div>
            <div>
              <Label htmlFor="verse_edition_id">Verse Edition ID</Label>
              <Input id="verse_edition_id" value={form.verse_edition_id} onChange={e=>setForm({ ...form, verse_edition_id: e.target.value })} placeholder="e.g., ar.saadalghamdi" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.supports_verse_audio} onCheckedChange={(v)=>setForm({ ...form, supports_verse_audio: v })} />
              <span className="text-sm">Supports verse audio</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v)=>setForm({ ...form, active: v })} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={upsert}>Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reciters</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div>Loading…</div> : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2 border rounded">
                  <div className="text-2xl">{r.flag || '🎧'}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{r.name} <span className="text-xs text-gray-500">({r.id})</span></div>
                    <div className="text-xs text-gray-600 truncate">{r.base_url}</div>
                    <div className="text-xs">{r.supports_verse_audio ? 'Verse audio' : 'Full surah only'} · {r.active ? 'Active' : 'Inactive'}</div>
                  </div>
                  <Button variant="outline" onClick={() => setForm({ id: r.id, name: r.name, flag: r.flag || '🎧', base_url: r.base_url, supports_verse_audio: !!r.supports_verse_audio, verse_edition_id: r.verse_edition_id || '', active: !!r.active })}>Edit</Button>
                  <Button variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
