const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `영어 단어 암기용 JSON 생성 AI. 한국어로만 작성.

pronunciation.ko: 단어 전체 한국어 발음 (예: degree→디그리, important→임포턴트, consumption→컨썸션)
pronunciation.syllables: 음절 배열. text(음절), ko(한국어 발음), stress(강세여부 boolean)
meanings: 대표 뜻 2~4개. 각 항목: ko(한국어 뜻), example(영어 예시 표현)
examples: 예문 3개. 각 항목: en(영어 문장), ko(자연스러운 한국어 구어체 번역)
mnemonic: 발음 일부와 비슷한 한국어 단어로 뜻을 연결하는 스토리. 영어발음 직접 표기 금지.
JSON만 출력.`;

const GENERATE_PROMPT = (word, meaning) => `"${word}" (${meaning}) JSON 출력. 아래 예시와 동일한 형식·품질:

{"pronunciation":{"ipa":"[dɪˈɡriː]","ko":"디그리","syllables":[{"text":"de","ko":"디","stress":false},{"text":"gree","ko":"그리","stress":true}]},"meanings":[{"ko":"도 (온도·각도)","example":"30 degrees"},{"ko":"학위","example":"bachelor's degree"},{"ko":"정도, 수준","example":"to some degree"}],"examples":[{"en":"It's 25 degrees today.","ko":"오늘은 25도야."},{"en":"She has a bachelor's degree.","ko":"그녀는 학사 학위가 있어."},{"en":"To some degree, that's true.","ko":"어느 정도는 맞는 말이야."}],"mnemonic":"디스코장에서 그리워하며 리듬을 타다가 학위 수여식에 나타나는 이미지 = degree(학위·정도)"}

중요: examples의 ko는 자연스러운 한국어 구어체. meanings와 examples 빈 칸 절대 금지.

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
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

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
