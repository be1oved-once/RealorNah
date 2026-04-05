// api/groq-ai.js — Vercel Serverless Function (CommonJS)
// Place this file at: /api/groq-ai.js in your project root.
// Set GROQ_API_KEY in Vercel dashboard → Settings → Environment Variables.

module.exports = async function handler(req, res) {
    // CORS headers (in case you call from a different origin)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY env variable not set on server' });
    }

    try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a quiz question generator. Output ONLY a valid JSON array. No markdown, no backticks, no explanation whatsoever.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 1.1,
                max_tokens: 800
            })
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            console.error('Groq API error:', groqRes.status, errText);
            return res.status(502).json({ error: 'Groq API request failed', detail: errText });
        }

        const data = await groqRes.json();
        const result = data?.choices?.[0]?.message?.content || '';

        return res.status(200).json({ result });

    } catch (err) {
        console.error('Handler error:', err);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
