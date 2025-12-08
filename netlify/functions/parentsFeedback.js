import { json } from '@netlify/functions'
import { createClient } from '@base44/sdk'

let RATE = new Map()

export const handler = async (event) => {
  try {
    const ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '').split(',')[0].trim()
    const now = Date.now()
    const list = RATE.get(ip) || []
    const recent = list.filter(t => now - t < 60_000)
    if (recent.length >= 10) return json({ ok: false, error: 'rate_limited' }, { statusCode: 429 })
    recent.push(now)
    RATE.set(ip, recent)

    const csrfHeader = event.headers['x-csrf-token'] || event.headers['X-CSRF-Token'] || ''
    const cookie = event.headers.cookie || ''
    const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('csrf_token=')) || ''
    const csrfCookie = match ? match.split('=')[1] : ''
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) return json({ ok: false, error: 'csrf_invalid' }, { statusCode: 403 })

    const body = event.body ? JSON.parse(event.body) : {}
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()
    if (!name || !email || !subject || !message) return json({ ok: false, error: 'invalid_input' }, { statusCode: 400 })

    const appId = process.env.BASE44_APP_ID || '68fcd301afef087bf759dba3'
    const base44 = createClient({ appId, requiresAuth: false })

    const prettyHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f3f4f6; border-radius: 10px;">
        <h2 style="color: #3B82F6;">📧 New Parent Feedback</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <p><strong>👤 Name:</strong> ${name}</p>
          <p><strong>📧 Email:</strong> ${email}</p>
          <p><strong>📝 Subject:</strong> ${subject}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p><strong>💬 Message:</strong></p>
          <p style="background-color: #f9fafb; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</p>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">📅 Sent on: ${new Date().toLocaleString()}</p>
      </div>
    `

    try {
      await base44.integrations.Core.SendEmail({ from_name: 'Islam Kids Zone - Parents', to: 'imediac786@gmail.com', subject: `Parent Feedback: ${subject}`, body: prettyHtml })
    } catch (e) {
      return json({ ok: false, error: 'send_failed' }, { statusCode: 502 })
    }

    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: 'server_error' }, { statusCode: 500 })
  }
}

