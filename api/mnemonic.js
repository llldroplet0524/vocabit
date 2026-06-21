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
아래 형식 그대로 출력해줘. 형식 외 다른 말은 절대 하지 마.

🔊 발음: (발음이 연상시키는 한국어 단어나 느낌, 1줄)
💡 연상: (재미있는 이미지나 스토리로 뜻 연결, 1~2줄)
📝 예문:
• (영어 예문 1 — 한국어 해석)
• (영어 예문 2 — 한국어 해석)
• (영어 예문 3 — 한국어 해석)

조건: 한글·영어 혼용 가능, 한자는 쓰지 말 것.`;

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
  const mnemonic = data.choices?.[0]?.message?.content?.trim() || '';
  res.status(200).json({ mnemonic });
}
