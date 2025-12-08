import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUp, saveUserProfile } from '@/api/firebase'

export default function QuizSignup() {
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [madrasah, setMadrasah] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  const validate = () => {
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Full name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Invalid email'
    const pwd = password.trim()
    const strong = pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd)
    if (!strong) errs.password = 'Min 8 chars, with uppercase, lowercase and a number'
    if (!age.trim()) errs.age = 'Age is required'
    if (!city.trim()) errs.city = 'City is required'
    if (!madrasah.trim()) errs.madrasah = 'Madrasah name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!validate()) return
    setSubmitting(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const user = await signUp(normalizedEmail, password.trim())
      try {
        await saveUserProfile(user.id, {
          fullName: fullName.trim(),
          email: normalizedEmail,
          age: age.trim(),
          city: city.trim(),
          madrasah: madrasah.trim(),
        })
      } catch {}
      setMsg('Account created. Please check your email to verify your address. Redirecting to Quizzes…')
      setTimeout(() => navigate('/Quizzes'), 1000)
    } catch (err) {
      setMsg(err?.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold mb-2">Quiz Signup</h1>
        <p className="text-sm text-gray-600 mb-4">Create your account to play quiz games and earn points.</p>
        {msg && <div className="mb-3 text-blue-700 bg-blue-50 border border-blue-200 rounded p-2 text-sm">{msg}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="fullName">Full Name</label>
            <input id="fullName" className="w-full p-2 border rounded" value={fullName} onChange={e=>setFullName(e.target.value)} />
            {errors.fullName && <div className="text-red-600 text-xs mt-1">{errors.fullName}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="age">Age</label>
            <input id="age" type="number" className="w-full p-2 border rounded" value={age} onChange={e=>setAge(e.target.value)} />
            {errors.age && <div className="text-red-600 text-xs mt-1">{errors.age}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="city">City</label>
            <input id="city" className="w-full p-2 border rounded" value={city} onChange={e=>setCity(e.target.value)} />
            {errors.city && <div className="text-red-600 text-xs mt-1">{errors.city}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="madrasah">Madrasah</label>
            <input id="madrasah" className="w-full p-2 border rounded" value={madrasah} onChange={e=>setMadrasah(e.target.value)} />
            {errors.madrasah && <div className="text-red-600 text-xs mt-1">{errors.madrasah}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input id="email" type="email" className="w-full p-2 border rounded" value={email} onChange={e=>setEmail(e.target.value)} />
            {errors.email && <div className="text-red-600 text-xs mt-1">{errors.email}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input id="password" type="password" className="w-full p-2 border rounded" value={password} onChange={e=>setPassword(e.target.value)} />
            {errors.password && <div className="text-red-600 text-xs mt-1">{errors.password}</div>}
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={submitting}>{submitting ? 'Creating…' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
