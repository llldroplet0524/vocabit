import Anthropic from '@anthropic-ai/sdk';

const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word, meaning } = req.body || {};
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning required' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `영어 단어 "${word}"의 뜻은 "${meaning}"야.
한국인이 쉽게 기억할 수 있는 연상 기억법을 만들어줘.
발음 유사성, 이미지, 짧은 스토리 등을 활용해서 2~3문장으로 재미있게.
기억법만 출력하고 앞에 "기억법:" 같은 라벨은 붙이지 마.`
    }]
  });

  res.status(200).json({ mnemonic: msg.content[0].text.trim() });
}
