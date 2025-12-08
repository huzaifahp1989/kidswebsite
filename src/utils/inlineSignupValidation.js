export function isValidEmail(v) {
  const s = String(v || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function isStrongPassword(v) {
  const s = String(v || '')
  if (s.length < 8) return false
  if (!/[A-Z]/.test(s)) return false
  if (!/[a-z]/.test(s)) return false
  if (!/[0-9]/.test(s)) return false
  if (!/[!@#$%^&*(),.?":{}|<>\-_/]/.test(s)) return false
  return true
}

export function validateInlineSignup({ firstName, lastName, email, password, confirmPassword, terms, honeypot }) {
  const errs = {}
  if (!String(firstName || '').trim()) errs.firstName = 'First name is required'
  if (!String(lastName || '').trim()) errs.lastName = 'Last name is required'
  if (!isValidEmail(email)) errs.email = 'Enter a valid email address'
  if (!isStrongPassword(password)) errs.password = 'Weak password'
  if (String(password || '') !== String(confirmPassword || '')) errs.confirmPassword = 'Passwords do not match'
  if (!terms) errs.terms = 'You must accept the terms and conditions'
  if (String(honeypot || '').trim()) errs.honeypot = 'Invalid form submission'
  return errs
}
