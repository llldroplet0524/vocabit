const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `당신은 한국인 영어 선생님입니다. 영어 단어 암기를 위한 JSON을 생성합니다.
반드시 아래 규칙을 따르세요:
1. ko, hint, mnemonic, examples의 한국어 내용은 반드시 한국어(한글)로만 작성하세요
2. 한자, 가타카나, 히라가나, 키릴 문자 절대 사용 금지
3. mnemonic 규칙:
   - 영어 단어를 그대로 한국어 발음으로 쓰는 것 절대 금지 (예: change→체인지 사용 금지, build→빌드 사용 금지)
   - 영어 발음과 비슷하게 들리는 전혀 다른 한국어 단어를 찾아야 함 (예: ruin→루이 (루이비통), disdain→디스+데인 (데인저러스))
   - 그 한국어 단어와 영어 뜻을 연결하는 재미있는 이미지나 스토리로 작성
   - "외워요", "기억하세요", "연상하세요" 절대 금지
4. examples 한국어 해석은 자연스러운 구어체로 (직역 금지)
5. JSON 외 다른 텍스트 출력 금지`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

  const prompt = `영어 단어 "${word}"의 뜻은 "${meaning}"입니다.
아래 JSON 형식으로 출력하세요. ko와 hint 필드는 반드시 한국어로 채워야 합니다.

출력 예시 (pollinator 수분매개체):
{
  "pronunciation": {
    "syllableWord": "pol·li·na·tor",
    "ipa": "[ˈpɒlɪneɪtər]",
    "syllables": [
      {"text": "pol", "ko": "팔", "hint": "강세", "stress": true},
      {"text": "li", "ko": "리", "hint": "약하게", "stress": false},
      {"text": "na", "ko": "내", "hint": "약하게", "stress": false},
      {"text": "tor", "ko": "터", "hint": "약하게", "stress": false}
    ],
    "combined": "팔-리-내-터"
  },
  "mnemonic": "'팔리내터' → '팔려고 내가 터뜨렸다' — 꽃가루 봉지를 팔려고 터뜨리는 벌 이미지. pollinator=꽃가루 옮기는 존재",
  "examples": [
    "Bees are the most important pollinators in the world. — 벌은 세상에서 가장 중요한 수분매개체야.",
    "Without pollinators, many plants cannot survive. — 수분매개체 없이는 많은 식물이 살아남지 못해.",
    "The garden attracts pollinators with colorful flowers. — 그 정원은 알록달록한 꽃으로 수분매개체를 끌어들여."
  ]
}

이제 "${word}" (${meaning})에 대해 같은 형식으로 JSON을 출력하세요:`;

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
      temperature: 0.7
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

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    res.status(200).json(parsed);
  } catch(e) {
    console.error('JSON parse error:', e.message, 'raw:', raw.substring(0, 300));
    res.status(200).json({ mnemonic: raw });
  }
}
