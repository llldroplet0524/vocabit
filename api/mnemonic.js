const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `영어 단어 암기용 JSON 생성 AI. 한국어로만 작성.

pronunciation.ko: 단어 전체 한국어 발음 (예: degree→디그리, adoption→어답션, consumption→컨썸션)
pronunciation.syllables: 반드시 IPA 음절 기준(점 위치)으로 분리. 영어 철자 기준 절대 금지.
각 항목: text(음절), ko(한국어 발음), stress(boolean), desc(설명)
- desc 값: "강세, 강하게"(stress:true) / "짧고 약하게"(약모음: ə ɪ 등) / "짧게"(일반 비강세)
- ə(schwa)는 반드시 "어"로 표기. 단독이면 "어", 자음 뒤면 받침 없이 "어" 추가.
  pro [prə] → "프러" (프+러). "프" 또는 "프로" 절대 금지.
  a·dop·tion [ə.ˈdɑp.ʃən] → a=어, dop=답(강세), tion=션
- oʊ(이중모음) → "오우" 또는 "우" 살짝 추가. mote [moʊt] → "모우트". "모트" 금지.
- ɑ→아, ɪ→이, æ→애, ʊ→우
- ʃ(sh)→쉬/션/쉽. tion=/ʃən/→션, ship=/ʃɪp/→쉽. "선"/"십" 금지.
pronunciation.tip: 한국어 화자가 실제로 틀리기 쉬운 발음이 있을 때만 작성. 없으면 빈 문자열 "".
  형식 강요 없음. 짧고 자연스럽게 핵심만.
  좋은 예) "'spir'는 '스피어'가 아니라 '스파이어'예요." — 실제 오류 교정
  나쁜 예) "자연스럽게 말하면 '그린하우스'예요." — 당연한 말, 쓸모없음
  나쁜 예) "빠르게 말하면 '유저빌리티'처럼..." — 억지 형식, 금지
  greenhouse처럼 한국어로 그대로 읽으면 되는 단어: tip = ""
meanings: 대표 뜻 2~4개. 각 항목: ko(한국어 뜻), example(영어 예시 표현), example_ko(그 예시 문장의 자연스러운 한국어 구어체 번역)
examples: 예문 3개. 각 항목: en(영어 문장), ko(자연스러운 한국어 구어체 번역)
JSON만 출력.`;

const GENERATE_PROMPT = (word, meaning) => `"${word}" (${meaning}) JSON 출력. 아래 예시와 동일한 형식·품질:

{"pronunciation":{"ipa":"[dɪˈɡriː]","ko":"디그리","syllables":[{"text":"de","ko":"디","stress":false,"desc":"짧고 약하게"},{"text":"gree","ko":"그리","stress":true,"desc":"강세, 강하게"}],"tip":"'de'는 '데'가 아닌 '디'로 짧게 읽어요."},"meanings":[{"ko":"도 (온도·각도)","example":"It's 30 degrees.","example_ko":"30도야."},{"ko":"학위","example":"She got a bachelor's degree.","example_ko":"그녀는 학사 학위를 받았어."},{"ko":"정도, 수준","example":"To some degree, that's true.","example_ko":"어느 정도는 맞는 말이야."}],"examples":[{"en":"It's 25 degrees today.","ko":"오늘은 25도야."},{"en":"She has a bachelor's degree.","ko":"그녀는 학사 학위가 있어."},{"en":"To some degree, that's true.","ko":"어느 정도는 맞는 말이야."}]}

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
