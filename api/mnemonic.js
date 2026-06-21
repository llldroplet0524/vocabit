const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `당신은 한국인 영어 선생님입니다. 영어 단어 암기를 위한 JSON을 생성합니다.

발음 규칙:
1. IPA 표기에서 ˈ(기본강세) 또는 ˌ(보조강세) 기호가 앞에 붙은 음절이 stress:true 입니다. 예: [ju:səˈbɪlɪti] → bil이 강세
2. 국립국어원 외래어 표기법 준수:
   - ə(schwa): 어 또는 서/저 등 약한 소리 (usability의 sa→서, cancel의 cel→슬)
   - -ble: 블, -ple: 플, -tle: 틀, -tion: 션, -ness: 니스
3. examples 한국어 해석에 영어 단어·알파벳·특수문자 혼입 절대 금지
4. mnemonic 규칙:
   - 영어 단어의 한국어 발음 표기(애드밴테이지, 캔슬, 디테인 등)를 시작점으로 사용 금지
   - 발음의 일부가 연상시키는 전혀 다른 한국어 단어를 찾고, 그 단어와 영어 뜻을 연결하는 스토리를 만들 것
   - 스토리가 반드시 단어의 뜻과 연결되어야 함 (detain=억류 → 스토리에 '가두다/못 가게 하다'가 있어야 함)
   - 나쁜 예: detain → '디테인' 사용, 스토리가 뜻과 무관
   - 좋은 예: detain(억류하다) → '데려다가 테이블에 묶어두다' — 못 떠나게 붙잡는 이미지
   - 좋은 예: ruin(망치다) → '루이비통 가방을 망가뜨리다' — 망치는 이미지 연결
JSON 외 다른 텍스트 출력 금지.`;

const GENERATE_PROMPT = (word, meaning) => `영어 단어 "${word}"의 뜻은 "${meaning}"입니다.
아래 JSON 형식으로 출력하세요.

외래어 표기 예시:
- cancel → 캔슬 (can→캔, cel→슬) ← "캔셀" 아님
- simple → 심플 (sim→심, ple→플) ← "심펄" 아님
- stable → 스테이블 (sta→스테이, ble→블)
- action → 액션 (ac→액, tion→션)
- people → 피플 (peo→피, ple→플)
- butter → 버터 (but→버, ter→터)

출력 예시 (unstable / 불안정한):
{
  "pronunciation": {
    "syllableWord": "un·sta·ble",
    "ipa": "[ʌnˈsteɪbl]",
    "syllables": [
      {"text": "un", "ko": "언", "hint": "약하게", "stress": false},
      {"text": "sta", "ko": "스테이", "hint": "강세", "stress": true},
      {"text": "ble", "ko": "블", "hint": "약하게", "stress": false}
    ],
    "combined": "언-스테이-블"
  },
  "mnemonic": "'언니 스테이크 블렌더' — 언니가 스테이크를 블렌더에 갈다가 불안정하게 넘어지는 이미지",
  "examples": [
    "The unstable economy is causing problems. — 불안정한 경제가 문제를 일으키고 있어.",
    "She has an unstable personality. — 그녀는 성격이 좀 불안정해.",
    "The table is unstable and might fall over. — 그 테이블이 불안정해서 넘어질 것 같아."
  ]
}

이제 "${word}" (${meaning})에 대해 JSON을 출력하세요:`;

const REVIEW_PROMPT = (word, meaning, json) => `아래는 "${word}" (${meaning})에 대한 JSON입니다.
다음 문제를 수정해서 완성된 JSON만 출력하세요:
- syllables의 "ko" 필드: 국립국어원 외래어 표기법으로 채우세요. cancel→캔슬(can→캔,cel→슬), simple→심플(sim→심,ple→플), action→액션(ac→액,tion→션). "캔셀","심펄" 같은 잘못된 표기 금지
- syllables의 "hint" 필드: "강세" 또는 "약하게" 중 하나만
- examples의 "—" 뒤 한국어 해석: 자연스러운 한국어 구어체로 채우세요
- mnemonic: 영어 발음 일부와 비슷한 전혀 다른 한국어 단어로 스토리를 만드세요. 스토리가 반드시 단어의 뜻(${meaning})과 연결되어야 합니다. 영어 단어의 한국어 발음 표기 사용 금지.

수정할 JSON:
${json}`;

function hasKorean(str) {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(str || '');
}

// ko/hint 필드에서 한국어·ASCII·공백·기본부호 외 문자(일어·태국어 등) 제거
function stripForeignChars(str) {
  return (str || '').replace(/[^가-힯ᄀ-ᇿ㄰-㆏ -~]/g, '').trim();
}

function sanitize(parsed) {
  const syls = parsed.pronunciation?.syllables || [];
  syls.forEach(s => {
    s.ko = stripForeignChars(s.ko);
    s.hint = stripForeignChars(s.hint);
  });
  return parsed;
}

function needsReview(parsed) {
  const syls = (parsed.pronunciation?.syllables) || [];
  if (syls.some(s => !hasKorean(s.ko))) return true;
  if (syls.some(s => s.hint !== '강세' && s.hint !== '약하게')) return true;
  const exs = parsed.examples || [];
  if (exs.some(ex => {
    const parts = (ex || '').split('—');
    return parts.length < 2 || !hasKorean(parts[1]);
  })) return true;
  if (!hasKorean(parsed.mnemonic)) return true;
  return false;
}

async function callGroq(messages, apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 2000,
      temperature: 0.7
    })
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Groq ${r.status}: ${err}`);
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

  const apiKey = process.env.GROQ_API_KEY;

  try {
    // 1차 생성
    const raw1 = await callGroq([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: GENERATE_PROMPT(word, meaning) }
    ], apiKey);
    console.log('1차 raw_len:', raw1.length);

    let parsed = sanitize(parseJSON(raw1));

    // 2차 검토·수정 (ko/hint/해석이 비어있거나 한국어가 아닌 경우)
    if (needsReview(parsed)) {
      console.log('문제 감지 → 2차 수정 요청');
      const raw2 = await callGroq([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: REVIEW_PROMPT(word, meaning, JSON.stringify(parsed, null, 2)) }
      ], apiKey);
      console.log('2차 raw_len:', raw2.length);
      try {
        parsed = sanitize(parseJSON(raw2));
      } catch(e) {
        console.error('2차 parse error:', e.message);
        // 2차 실패시 1차 결과라도 반환
      }
    }

    res.status(200).json(parsed);
  } catch(e) {
    console.error('handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
