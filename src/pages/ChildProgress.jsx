import React, { useEffect, useState } from 'react'
import { addChildProgressLog, listChildProgressLogs } from '@/api/progress'
import { getFirebase } from '@/api/firebase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ChildProgress() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ quran: '', salah: '', tasbeeh: '', durood: '', helping_parents: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const { auth } = getFirebase()
    const u = auth?.currentUser || null
    const init = async () => {
      setUser(u)
      if (u) {
        try {
          const items = await listChildProgressLogs(u.uid, { limit: 14 })
          setLogs(items)
        } catch (e) {
          setError(e?.message || 'Failed to load progress')
        }
      }
    }
    init()
  }, [])

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!user) { setError('Please login first'); return }
    setSaving(true); setError('')
    try {
      await addChildProgressLog({
        userId: user.uid,
        quran: form.quran,
        salah: form.salah,
        tasbeeh: form.tasbeeh,
        durood: form.durood,
        helping_parents: form.helping_parents,
        notes: form.notes,
      })
      const items = await listChildProgressLogs(user.uid, { limit: 14 })
      setLogs(items)
      setForm({ quran: '', salah: '', tasbeeh: '', durood: '', helping_parents: '', notes: '' })
    } catch (e2) {
      setError(e2?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const chartData = logs.slice().reverse().map(it => ({
    date: it.log_date,
    Quran: Number(it.quran || 0),
    Salah: Number(it.salah || 0),
    Tasbeeh: Number(it.tasbeeh || 0),
    Durood: Number(it.durood || 0),
    Helping: Number(it.helping_parents || 0),
  }))

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Child Progress</h1>
      <p className="text-sm text-gray-600 mb-4">Log your daily worship and helpful deeds. Values are numbers (e.g., rakaat, counts, minutes).</p>
      {error && <div className="mb-3 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">{error}</div>}
      <form onSubmit={submit} className="bg-white p-4 rounded border mb-6 grid grid-cols-2 gap-3">
        <label className="text-sm">Quran<input className="w-full p-2 border rounded" value={form.quran} onChange={update('quran')} placeholder="verses/minutes" /></label>
        <label className="text-sm">Salah<input className="w-full p-2 border rounded" value={form.salah} onChange={update('salah')} placeholder="rakaat/prayers" /></label>
        <label className="text-sm">Tasbeeh<input className="w-full p-2 border rounded" value={form.tasbeeh} onChange={update('tasbeeh')} placeholder="counts" /></label>
        <label className="text-sm">Durood<input className="w-full p-2 border rounded" value={form.durood} onChange={update('durood')} placeholder="counts" /></label>
        <label className="text-sm col-span-2">Helping Parents<input className="w-full p-2 border rounded" value={form.helping_parents} onChange={update('helping_parents')} placeholder="minutes/counts" /></label>
        <label className="text-sm col-span-2">Notes<textarea className="w-full p-2 border rounded" value={form.notes} onChange={update('notes')} placeholder="optional" /></label>
        <div className="col-span-2 flex justify-end"><button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
      </form>

      <div className="bg-white p-4 rounded border">
        <h2 className="text-lg font-semibold mb-3">Recent Progress</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Quran" fill="#3b82f6" />
              <Bar dataKey="Salah" fill="#10b981" />
              <Bar dataKey="Tasbeeh" fill="#f59e0b" />
              <Bar dataKey="Durood" fill="#ef4444" />
              <Bar dataKey="Helping" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
