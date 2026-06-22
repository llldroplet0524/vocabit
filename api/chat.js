const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

async function callOpenAI(messages, apiKey) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 600, temperature: 0.7 })
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, messages } = req.body || {};
  if (!word || !messages) return res.status(400).json({ error: 'word and messages required' });

  const apiKey = process.env.OPENAI_API_KEY;
  const system = `너는 한국인 영어 학습자를 위한 영어 튜터야. 지금 학습 중인 단어는 "${word}"이야.\n- 설명은 한국어로 해\n- 예문 요청 시: 영어 문장을 먼저 쓰고 바로 아래 줄에 한국어 번역을 써. 예) "She earns a high salary.\\n→ 그녀는 높은 월급을 받는다."\n- 발음 요청 시: 반드시 아래 형식의 표로만 답해 (다른 설명 없이):\n한글 발음 | 영어 발음 | 강세\n-------|---------|-----\n샐러리 | SAL-uh-ree | 첫째 음절\n- 연상법/어원은 접두사·어근·접미사 기반으로 설명해\n- 간결하게 핵심만 답해`;

  try {
    const reply = await callOpenAI([{ role: 'system', content: system }, ...messages], apiKey);
    res.status(200).json({ reply });
  } catch (e) {
    console.error('chat handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
