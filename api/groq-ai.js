// api/groq-ai.js — Vercel Serverless Function
// Proxies requests to Groq API so the key stays server-side.
// Expects: POST { prompt: string }
// Returns: { result: string }

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'GROQ_API_KEY env variable not set' });
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
                        content: 'You are a quiz question generator. You only output valid JSON arrays — no markdown, no preamble, no explanation.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 1.0,
                max_tokens: 800
            })
        });

        if (!groqRes.ok) {
            const err = await groqRes.text();
            console.error('Groq API error:', err);
            return res.status(502).json({ error: 'Groq API request failed', detail: err });
        }

        const data = await groqRes.json();
        const result = data?.choices?.[0]?.message?.content || '';

        return res.status(200).json({ result });

    } catch (err) {
        console.error('Serverless function error:', err);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
}
