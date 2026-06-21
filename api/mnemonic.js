const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `영어 단어 암기용 JSON 생성 AI. 한국어로만 작성.

IPA→한국어: ə/ʌ→어, ɪ/iː→이, ʊ/uː→우, æ→애, ɑː→아, ɔː→오, eɪ→에이, aɪ→아이, aʊ→아우
ʃ(sh소리)→쉬: ship→쉽, tion→션 ("선"/"십" 절대 금지)
자음군: plɪ→플리, blɪ→블리 (모음 ɪ 빠뜨리지 말 것)
연음: r+ɪ 뒤 l음절 → 받침ㄹ 추가 (re+la→릴레이)
IPA: 다음절 단어 ˈ(주강세) 반드시 포함. ˌ→보조강세, ˈ→강세/stress:true, 나머지→약하게

mnemonic: 발음 일부 소리와 비슷한 전혀 다른 한국어 단어로 뜻을 연결하는 스토리. 영어발음 직접 표기 금지.
examples: "영어문장 — 한국어구어체" 3개. 한국어 반드시 포함, 영어단어·알파벳 혼입 금지.
tip: 연음·묵음 등 실제 발음 팁 한 문장.
JSON만 출력.`;

const GENERATE_PROMPT = (word, meaning) => `"${word}" (${meaning}) JSON 출력. 아래 예시와 동일한 형식·품질:

{"pronunciation":{"syllableWord":"un·sta·ble","ipa":"[ʌnˈsteɪbl]","syllables":[{"text":"un","ko":"언","hint":"약하게","stress":false},{"text":"sta","ko":"스테이","hint":"강세","stress":true},{"text":"ble","ko":"블","hint":"약하게","stress":false}],"combined":"언-스테이-블","tip":"sta에 힘주어 언-스테이-블, 빠르면 언스테이블"},"mnemonic":"언니가 스테이크를 블렌더에 갈다가 불안정하게 넘어지는 이미지 = unstable(불안정한)","examples":["The unstable economy is causing problems. — 불안정한 경제가 문제를 일으키고 있어.","She has an unstable personality. — 그녀는 성격이 좀 불안정해.","The table is unstable and might fall over. — 그 테이블이 불안정해서 넘어질 것 같아."]}

중요: mnemonic은 반드시 한국어 스토리 문장으로 채울 것. examples의 — 뒤는 반드시 자연스러운 한국어 번역으로 채울 것. 빈 칸 절대 금지.

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

    const parsed = parseJSON(raw);
    res.status(200).json(parsed);
  } catch(e) {
    console.error('handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
