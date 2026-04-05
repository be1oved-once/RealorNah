// api/contact.js — Vercel Serverless Function (RealorNah)
//
// RESEND SETUP (contact form — separate from MailerLite notify):
//   Free Resend account → from: onboarding@resend.dev
//   Add env var in Vercel:  RESEND_API_KEY = re_xxxxxxxxxxxxxxxx
//   Change TO_EMAIL below to wherever you want contact messages sent.

const ALLOWED_ORIGIN = 'https://realornah.vercel.app';     // ← your domain
const TO_EMAIL       = 'contact.globalratings@gmail.com';  // ← where you receive contact messages
const FROM_EMAIL     = 'onboarding@resend.dev';             // free Resend sender — do not change
const FROM_NAME      = 'RealorNah Contact';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, message } = req.body || {};

    if (!name || !email || !message)
        return res.status(400).json({ error: 'All fields are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: 'Invalid email address.' });
    if (message.length > 2000)
        return res.status(400).json({ error: 'Message too long (max 2000 chars).' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration: missing RESEND_API_KEY' });

    const htmlBody = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d0221;color:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#ff006e,#8338ec);padding:24px 28px;">
    <h1 style="margin:0;font-size:20px;font-weight:800;">New Contact Message</h1>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px;">via RealorNah Contact Page</p>
  </div>
  <div style="padding:24px 28px;background:#160036;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#06ffa5;font-weight:700;width:80px;">Name</td><td style="padding:8px 0;color:#fff;">${esc(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#06ffa5;font-weight:700;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}" style="color:#ffbe0b;">${esc(email)}</a></td></tr>
    </table>
    <hr style="border:1px solid rgba(131,56,236,.3);margin:16px 0;">
    <p style="color:#06ffa5;font-weight:700;margin:0 0 8px;">Message</p>
    <p style="color:rgba(255,255,255,.85);line-height:1.7;white-space:pre-wrap;margin:0;">${esc(message)}</p>
  </div>
  <div style="padding:16px 28px;background:#0a0118;font-size:12px;color:rgba(255,255,255,.4);text-align:center;">
    RealorNah · Hit Reply to respond to ${esc(name)}
  </div>
</div>`;

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from:     `${FROM_NAME} <${FROM_EMAIL}>`,
                to:       [TO_EMAIL],
                reply_to: email,
                subject:  `New message from ${name} — RealorNah`,
                html:     htmlBody,
                text:     `From: ${name} (${email})\n\n${message}`,
            }),
        });

        if (!r.ok) {
            console.error('Resend error:', await r.text());
            return res.status(502).json({ error: 'Failed to send. Try again later.' });
        }
        return res.status(200).json({ success: true });
    } catch(e) {
        console.error('contact.js unhandled error:', e);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
