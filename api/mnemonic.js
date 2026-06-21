const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `영어 단어 "${word}"의 뜻은 "${meaning}"야.
한국인이 쉽게 기억할 수 있는 연상 기억법을 만들어줘.
발음 유사성, 이미지, 짧은 스토리 등을 활용해서 2~3문장으로 재미있게.
기억법만 출력하고 앞에 "기억법:" 같은 라벨은 붙이지 마.`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );

  if (!r.ok) {
    const err = await r.text();
    console.error('Gemini error status:', r.status, 'body:', err);
    return res.status(500).json({ error: 'Gemini error', status: r.status, detail: err });
  }

  const data = await r.json();
  const mnemonic = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  res.status(200).json({ mnemonic });
}
