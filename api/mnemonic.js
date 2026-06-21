const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

  const prompt = `영어 단어 "${word}"의 뜻은 "${meaning}"야.
아래 JSON 형식으로만 출력해줘. JSON 외 다른 텍스트는 절대 출력하지 마.

{
  "pronunciation": {
    "syllableWord": "음절 점으로 나눈 단어 (예: al·most)",
    "ipa": "IPA 표기 (예: [ˈɔːlmoʊst])",
    "syllables": [
      {"text": "음절", "ko": "한국어 발음", "hint": "강세 ⭐ 또는 약하게 또는 짧게 등", "stress": true또는false}
    ],
    "combined": "전체 한국어 발음 (예: 올-모스트)"
  },
  "mnemonic": "발음이나 생김새에서 뜻을 연결하는 재미있고 창의적인 연상법 1~2문장. 한자 금지.",
  "examples": [
    "영어 예문 1 — 한국어 해석",
    "영어 예문 2 — 한국어 해석",
    "영어 예문 3 — 한국어 해석"
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
      max_tokens: 300,
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
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    res.status(200).json(parsed);
  } catch(e) {
    res.status(200).json({ mnemonic: raw });
  }
}
