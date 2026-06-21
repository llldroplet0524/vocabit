const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `영어 단어 암기용 JSON 생성 AI. 한국어로만 작성.

meanings: 대표 뜻 2~4개. 각 항목: ko(한국어 뜻), example(영어 예시 표현), example_ko(그 예시 문장의 자연스러운 한국어 번역, ~했다/~한다 체)
examples: 예문 3개. 각 항목: en(영어 문장), ko(자연스러운 한국어 번역, ~했다/~한다/~이다 체. "~했어/~해/~야" 금지)
중요: examples·meanings 빈 칸 절대 금지.
JSON만 출력.`;

const GENERATE_PROMPT = (word, meaning) => `"${word}"${meaning?` (${meaning})`:''} JSON 출력. 아래 예시와 동일한 형식·품질:

{"meanings":[{"ko":"도 (온도·각도)","example":"It's 30 degrees.","example_ko":"30도이다."},{"ko":"학위","example":"She got a bachelor's degree.","example_ko":"그녀는 학사 학위를 받았다."},{"ko":"정도, 수준","example":"To some degree, that's true.","example_ko":"어느 정도는 맞는 말이다."}],"examples":[{"en":"It's 25 degrees today.","ko":"오늘은 25도이다."},{"en":"She has a bachelor's degree.","ko":"그녀는 학사 학위가 있다."},{"en":"To some degree, that's true.","ko":"어느 정도는 맞는 말이다."}]}

이제 "${word}" (${meaning}) JSON:`;

async function callOpenAI(messages, apiKey) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`OpenAI ${r.status}: ${err}`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function parseJSON(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word) return res.status(400).json({ error: 'word required' });

  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const raw = await callOpenAI([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: GENERATE_PROMPT(word, meaning) }
    ], apiKey);

    res.status(200).json(parseJSON(raw));
  } catch(e) {
    console.error('handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
