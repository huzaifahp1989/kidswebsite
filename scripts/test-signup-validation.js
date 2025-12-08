import { isValidEmail, isValidAge, validateSignup } from '../src/utils/signupValidation.js'

const cases = [
  { fullName: 'Aisha Khan', age: 12, city: 'Karachi', madrasah: 'Al-Huda', email: 'a@b.com' },
  { fullName: 'Omar', age: 13, city: 'Lahore', madrasah: 'Darul Uloom', email: 'invalid' },
  { fullName: 'Fatima', age: 15, city: 'Islamabad', madrasah: 'Jamia', email: 'fatima@example.com' },
]

console.log('Email valid a@b.com:', isValidEmail('a@b.com'))
console.log('Email valid invalid:', isValidEmail('invalid'))
console.log('Age valid 12:', isValidAge(12))
console.log('Age valid 13:', isValidAge(13))

for (const c of cases) {
  const errs = validateSignup(c)
  console.log('Case:', c, 'Errors:', errs)
}

