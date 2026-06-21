const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

  const prompt = `[IMPORTANT] Never use Chinese/Japanese characters (漢字). Only Korean (한글), English, numbers, and symbols are allowed.

English word: "${word}", meaning: "${meaning}"
Output ONLY valid JSON, no other text.

{
  "pronunciation": {
    "syllableWord": "syllables with dots (e.g. in·crease)",
    "ipa": "IPA (e.g. [ɪnˈkriːs])",
    "syllables": [
      {"text": "syllable", "ko": "Korean pronunciation", "hint": "강세 or 약하게 or 짧게", "stress": true or false}
    ],
    "combined": "full Korean reading (e.g. 인-크리스)"
  },
  "mnemonic": "Creative mnemonic using sound or image. MUST be written entirely in Korean (한국어). No English sentences here. NO Chinese characters.",
  "examples": [
    "English sentence — Korean translation",
    "English sentence — Korean translation",
    "English sentence — Korean translation"
  ]
}`;

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.8
    })
  });

  if (!r.ok) {
    const err = await r.text();
    console.error('Groq error status:', r.status, 'body:', err);
    return res.status(500).json({ error: 'Groq error', status: r.status, detail: err });
  }

  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  // strip CJK characters (漢字) that may slip through
  const clean = raw.replace(/[一-鿿㐀-䶿]/g, '');
  try {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    res.status(200).json(parsed);
  } catch(e) {
    res.status(200).json({ mnemonic: clean });
  }
}
