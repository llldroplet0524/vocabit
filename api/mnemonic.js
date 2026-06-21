const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `당신은 한국인 영어 선생님입니다. 영어 단어 암기를 도와주는 JSON을 생성합니다.
규칙:
- 한자(漢字), 가타카나, 히라가나, 키릴 문자를 절대 사용하지 마세요
- 예문 한국어 해석은 자연스러운 한국어 구어체로 작성하세요 (직역 금지)
- 연상법은 한국어로만, 영어 단어 포함 금지
- JSON 외 다른 텍스트 출력 금지`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

  const prompt = `영어 단어 "${word}"의 뜻은 "${meaning}"입니다.
아래 JSON 형식으로만 출력하세요.

{
  "pronunciation": {
    "syllableWord": "음절 구분 (예: dis·dain)",
    "ipa": "IPA 표기 (예: [dɪsˈdeɪn])",
    "syllables": [
      {"text": "음절", "ko": "한국어 발음", "hint": "강세 또는 약하게 또는 짧게", "stress": true또는false}
    ],
    "combined": "전체 한국어 발음 (예: 디스-데인)"
  },
  "mnemonic": "발음에서 연상되는 재미있는 한국어 기억법. 한국어만 사용. 1~2문장.",
  "examples": [
    "짧은 영어 예문 — 자연스러운 한국어 해석",
    "짧은 영어 예문 — 자연스러운 한국어 해석",
    "짧은 영어 예문 — 자연스러운 한국어 해석"
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
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!r.ok) {
    const err = await r.text();
    console.error('Groq error status:', r.status, 'body:', err);
    return res.status(500).json({ error: 'Groq error', status: r.status, detail: err });
  }

  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  // strip non-Korean/English scripts that may slip through
  const clean = raw.replace(/[぀-ヿ㐀-鿿豈-﫿Ѐ-ӿ]/g, '');
  try {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    res.status(200).json(parsed);
  } catch(e) {
    res.status(200).json({ mnemonic: clean });
  }
}
