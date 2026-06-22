const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word } = req.body || {};
  if (!word) return res.status(400).json({ error: 'word required' });

  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `"${word}"과 어원(라틴어·그리스어 어근)이 같거나 파생된 영어 단어를 최대 20개 JSON 배열로만 답해. 배열만 출력, 설명 없이.\n예: ["section","intersect","scissors","dissect"]`
        }],
        max_tokens: 200,
        temperature: 0.3
      })
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    const related = JSON.parse(match ? match[0] : '[]');
    res.status(200).json({ related });
  } catch (e) {
    console.error('related error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
