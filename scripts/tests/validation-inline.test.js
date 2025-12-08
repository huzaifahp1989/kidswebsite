import { isValidEmail, isStrongPassword, validateInlineSignup } from '../../src/utils/inlineSignupValidation.js'

function assert(name, cond) {
  if (!cond) {
    console.error(`FAIL: ${name}`)
    process.exitCode = 1
  } else {
    console.log(`OK: ${name}`)
  }
}

assert('valid email', isValidEmail('test@example.com'))
assert('invalid email', !isValidEmail('bad@'))

assert('strong password', isStrongPassword('Aa1!aaaa'))
assert('weak password length', !isStrongPassword('Aa1!a'))
assert('weak password missing upper', !isStrongPassword('aa1!aaaa'))
assert('weak password missing lower', !isStrongPassword('AA1!AAAA'))
assert('weak password missing number', !isStrongPassword('Aaaaaaaa!'))
assert('weak password missing symbol', !isStrongPassword('Aaaaaaaa1'))

const errs1 = validateInlineSignup({ firstName: '', lastName: '', email: 'bad', password: 'weak', confirmPassword: 'nomatch', terms: false, honeypot: 'x' })
assert('first name error', !!errs1.firstName)
assert('last name error', !!errs1.lastName)
assert('email error', !!errs1.email)
assert('password error', !!errs1.password)
assert('confirm password error', !!errs1.confirmPassword)
assert('terms error', !!errs1.terms)
assert('honeypot error', !!errs1.honeypot)

const errs2 = validateInlineSignup({ firstName: 'A', lastName: 'B', email: 'ok@test.com', password: 'Aa1!aaaa', confirmPassword: 'Aa1!aaaa', terms: true, honeypot: '' })
assert('no errors when valid', Object.keys(errs2).length === 0)

console.log('Validation tests complete')
