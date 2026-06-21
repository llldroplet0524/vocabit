const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `당신은 한국인 영어 선생님입니다. 영어 단어 암기를 위한 JSON을 생성합니다.
반드시 아래 규칙을 따르세요:
1. 모든 한국어 필드(ko, hint, mnemonic, examples 해석)는 순수 한글로만 작성
2. 한자(漢字), 가타카나, 히라가나, 키릴 문자 절대 사용 금지
3. examples의 한국어 해석에 영어 단어 절대 삽입 금지 (예: "세금申告" 금지, "multim으로" 금지)
4. syllables의 "ko" 필드는 오직 그 음절의 영어 발음을 한글 소리로 적은 것. 의미 있는 단어일 필요 없음
5. syllables의 "hint" 필드는 "강세" 또는 "약하게" 중 하나만
6. mnemonic 규칙:
   - 영어 단어를 그대로 한국어 발음으로 쓰는 것 절대 금지 (change→체인지 금지)
   - 영어 발음과 비슷하게 들리는 전혀 다른 한국어 단어를 찾아 이미지나 스토리로 연결
   - "외워요", "기억하세요", "연상하세요" 절대 금지
7. JSON 외 다른 텍스트 출력 금지`;

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

중요 규칙:
- "ko" 필드: 그 음절 소리를 한글로만 표기. sim→심, pli→플리, fy→파이, tion→션, dain→데인, ness→니스
- "ko"는 발음 소리 표기일 뿐, 의미 있는 단어나 연상 단어를 쓰면 안 됩니다
- "hint" 필드: "강세" 또는 "약하게" 중 하나만. 다른 말 금지
- examples 해석: 한글만. 영어 단어나 한자 절대 혼입 금지

출력 예시 (simplify 단순화하다):
{
  "pronunciation": {
    "syllableWord": "sim·pli·fy",
    "ipa": "[ˈsɪmplɪfaɪ]",
    "syllables": [
      {"text": "sim", "ko": "심", "hint": "강세", "stress": true},
      {"text": "pli", "ko": "플리", "hint": "약하게", "stress": false},
      {"text": "fy", "ko": "파이", "hint": "약하게", "stress": false}
    ],
    "combined": "심-플리-파이"
  },
  "mnemonic": "'심플리파이' → '심(心)플하게 파이를 나눠' — 복잡한 파이 레시피를 심플하게 만드는 이미지",
  "examples": [
    "We need to simplify this process. — 이 과정을 좀 단순하게 만들어야 해.",
    "The teacher simplified the explanation. — 선생님이 설명을 알기 쉽게 풀어줬어.",
    "Simplify your life by reducing distractions. — 신경 쓸 것들을 줄여서 삶을 단순하게 만들어봐."
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

  // strip CJK/Katakana/Hiragana/Cyrillic that slip through (Korean Hangul U+AC00-D7AF is safe)
  const clean = raw.replace(/[぀-ヿ㐀-鿿豈-﫿Ѐ-ӿ]/g, '');
  try {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    res.status(200).json(parsed);
  } catch(e) {
    console.error('JSON parse error:', e.message, 'raw:', raw.substring(0, 300));
    res.status(200).json({ mnemonic: clean });
  }
}
