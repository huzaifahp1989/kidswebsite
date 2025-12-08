const { json } = require('@netlify/functions');

async function sendWithSendGrid(to, subject, content) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return { ok: false, reason: 'missing_key' };
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'no-reply@imediackids.com', name: 'Islam Media Central' },
    subject,
    content: [{ type: 'text/html', value: content }],
  };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: res.status >= 200 && res.status < 300, status: res.status };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json({ error: 'Method Not Allowed' }, { statusCode: 405 });
    }
    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); } catch {}
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const honeypot = String(payload.honeypot || '').trim();
    if (honeypot) {
      return json({ ok: true, ignored: true });
    }
    if (!email) {
      return json({ error: 'Missing email' }, { statusCode: 400 });
    }
    const to = process.env.NOTIFY_TO_EMAIL || 'imediac786@gmail.com';
    const subject = 'New Signup - Islam Media Central Kids';
    const content = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
        <h2>New Signup</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p style="color:#64748b;font-size:12px">Sent automatically by Islam Media Central</p>
      </div>
    `;
    let ok = false;
    let channel = 'none';
    try {
      const sg = await sendWithSendGrid(to, subject, content);
      ok = !!sg.ok;
      channel = 'sendgrid';
    } catch (e) {
      ok = false;
    }
    // Always return 200 to avoid blocking signup UX; include status for observability
    return json({ ok, channel });
  } catch (e) {
    return json({ error: String(e?.message || e) }, { statusCode: 500 });
  }
};
