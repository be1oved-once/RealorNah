// api/notify.js — Vercel Serverless Function
//
// FREE RESEND ACCOUNT SETUP:
//   - From: onboarding@resend.dev  (free plan, can't change this)
//   - The email is sent TO the creator's email they optionally entered at quiz creation
//   - Add env var in Vercel: RESEND_API_KEY = re_xxxxxxx
//
// Called from quiz.html saveScore() — fires when plays hits a multiple of NOTIFY_AT

const NOTIFY_AT      = 3;
const ALLOWED_ORIGIN = 'https://realornah.vercel.app';
const FROM_EMAIL     = 'onboarding@resend.dev'; // free Resend — do not change

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    const { creatorEmail, creatorName, quizId, plays, quizLink } = req.body || {};

    // If creator didn't enter email, silently skip — not an error
    if (!creatorEmail) return res.status(200).json({ sent: false, reason: 'No creator email' });
    if (!plays || !quizId) return res.status(400).json({ error: 'Missing fields' });

    // Only fire at multiples of NOTIFY_AT (7, 14, 21…)
    if (plays % NOTIFY_AT !== 0) return res.status(200).json({ sent: false, reason: 'Not a notify threshold' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server misconfiguration.' });

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from:    `RealOrNah <${FROM_EMAIL}>`,
                to:      [creatorEmail],
                subject: `Your quiz just hit ${plays} plays! 🔥`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d0221;color:#fff;border-radius:16px;overflow:hidden;">
                  <div style="background:linear-gradient(135deg,#ff006e,#8338ec);padding:24px 28px;">
                    <h1 style="margin:0;font-size:22px;font-weight:800;">Your Quiz is Poppin'! 🔥</h1>
                    <p style="margin:4px 0 0;opacity:.8;font-size:13px;">RealOrNah Milestone</p>
                  </div>
                  <div style="padding:28px;background:#160036;">
                    <p style="font-size:18px;color:#06ffa5;font-weight:700;margin:0 0 12px;">Hey ${esc(creatorName)} 👋</p>
                    <p style="color:rgba(255,255,255,.85);line-height:1.7;margin:0 0 20px;">
                      Your quiz just hit <strong style="color:#ffbe0b;font-size:22px;">${plays} plays</strong>!
                      People are out here finding out how well they know you. Check the leaderboard!
                    </p>
                    <a href="${esc(quizLink)}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#ff006e,#fb5607);color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">
                      View Leaderboard →
                    </a>
                  </div>
                  <div style="padding:16px 28px;background:#0a0118;font-size:12px;color:rgba(255,255,255,.4);text-align:center;">
                    RealOrNah · realornah.vercel.app · You got this notification because you left your email at quiz creation.
                  </div>
                </div>`,
                text: `Hey ${creatorName}! Your quiz hit ${plays} plays. View it at ${quizLink}`,
            }),
        });
        if (!r.ok) { console.error('Resend:', await r.text()); return res.status(502).json({ error: 'Email failed' }); }
        return res.status(200).json({ sent: true, plays });
    } catch(e) {
        console.error(e);
        return res.status(500).json({ error: 'Internal error' });
    }
}

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
