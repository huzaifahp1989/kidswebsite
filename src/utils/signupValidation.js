export function isValidEmail(v) {
  const s = String(v || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function isValidAge(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 13
}

export function validateSignup({ fullName, age, city, madrasah, email }) {
  const errs = {}
  if (!String(fullName || '').trim()) errs.fullName = 'Full name is required'
  if (!isValidAge(age)) errs.age = 'You must be at least 13 years old'
  if (!String(city || '').trim()) errs.city = 'City is required'
  if (!String(madrasah || '').trim()) errs.madrasah = 'Madrasah name is required'
  if (!isValidEmail(email)) errs.email = 'Invalid email format'
  return errs
}

