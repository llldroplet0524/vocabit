const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `당신은 한국인 영어 선생님입니다. 영어 단어 암기를 도와주는 JSON을 생성합니다.
규칙:
- 한자(漢字), 가타카나, 히라가나, 키릴 문자를 절대 사용하지 마세요
- 예문 한국어 해석은 자연스러운 한국어 구어체로 작성하세요 (직역 금지)
- 연상법은 한국어로만, 영어 단어 포함 금지
- 반드시 유효한 JSON만 출력하세요`;

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
  "mnemonic": "발음이 비슷한 한국어 단어나 상황을 이용해 뜻을 연결하는 기억법. 예: '루인'→'루이'→루이비통 가방을 망가뜨린 이미지. 단순히 '외워요', '기억하세요' 같은 말은 절대 금지. 재미있는 스토리나 이미지로. 한국어만.",
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
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });

  if (!r.ok) {
    const err = await r.text();
    console.error('Groq error status:', r.status, 'body:', err);
    return res.status(500).json({ error: 'Groq error', status: r.status, detail: err });
  }

  const data = await r.json();
  const finish = data.choices?.[0]?.finish_reason;
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  console.log('finish_reason:', finish, 'raw_len:', raw.length);

  const clean = raw.replace(/[぀-ヿ㐀-鿿豈-﫿Ѐ-ӿ]/g, '');
  try {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    res.status(200).json(parsed);
  } catch(e) {
    console.error('JSON parse error:', e.message, 'raw:', raw.substring(0, 300));
    res.status(200).json({ _raw: clean, mnemonic: clean });
  }
}
