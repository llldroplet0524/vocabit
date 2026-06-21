const ALLOWED_ORIGIN = 'https://llldroplet0524.github.io';

const SYSTEM = `당신은 한국인 영어 선생님입니다. 영어 단어 암기를 위한 JSON을 생성합니다.

발음 규칙:
1. "ko" 필드는 반드시 IPA 발음 기호 기준으로 결정하세요 (철자 기준 금지).
   IPA 모음 → 한국어:
   ɪ/iː→이, ʊ/uː→우, e/ɛ→에, æ→애, ɑː→아, ɔː→오, ʌ→어, ə(schwa)→어, ɜː→어
   eɪ→에이, oʊ→오우, aɪ→아이, aʊ→아우
   IPA 자음: p→프, b→브, t→트, d→드, k→크, g→그, f→프, v→브, s→스, z→즈, ʃ→쉬(sh 소리), tʃ→취, r→르, l→ㄹ/를, m→므, n→느
   ʃ 주의: ʃ는 "sh" 발음 → 반드시 "ㅅ"이 아닌 "쉬/셔/션/쉽" 등으로 표기. 예: ship=/ʃɪp/→쉽, she=/ʃiː/→쉬
   핵심: ə(schwa)와 ʌ는 둘 다 반드시 "어"로 표기. "아", "오", "에"로 쓰면 안 됨.
   예시: important [ɪmˈpɔːrtənt] → im=임(ɪm), por=포(ˈpɔːr), tant=턴트(tənt: ə→어)
   예시: consumption [kənˈsʌmpʃən] → con=컨(kən: ə→어), sump=썸(sʌmp: ʌ→어), tion=션(ʃən)
   예시: relationship [rɪˈleɪʃənʃɪp] → re=리(rɪ), la=레이(leɪ), tion=션(ʃən), ship=십(ʃɪp)
2. IPA 표기에서 ˈ(기본강세) 음절만 stress:true/hint:"강세", ˌ(보조강세) 음절은 hint:"보조강세", 나머지는 hint:"약하게"
   예: [ɪmˈpɔːrtənt] → ˈ가 pɔː 앞 → por만 강세
3. 국립국어원 외래어 표기법: -tion→션, -ble→블, -ple→플, schwa(ə)→어/서
4. examples 한국어 해석에 영어 단어·알파벳·특수문자 혼입 절대 금지
5. mnemonic 규칙:
   - 반드시 발음(소리)과 뜻을 동시에 연결해야 함
   - 영어 단어의 한국어 발음 표기(애드밴테이지, 캔슬, 디테인 등)를 시작점으로 사용 금지
   - 발음 일부와 비슷한 전혀 다른 한국어 단어를 찾고, 그 단어로 뜻까지 연결하는 스토리를 만들 것
   - 나쁜 예: detain → '디테인' 사용 (발음만, 뜻 연결 없음)
   - 좋은 예: detain(억류하다) → '데'(데리고)+테이블에 묶어두다 → 못 떠나게 붙잡는 이미지 (발음+뜻 연결)
   - 좋은 예: ruin(망치다) → '루이'(루이비통) 가방을 망가뜨리다 (발음+뜻 연결)
JSON 외 다른 텍스트 출력 금지.`;

const GENERATE_PROMPT = (word, meaning) => `영어 단어 "${word}"의 뜻은 "${meaning}"입니다.
아래 JSON 형식으로 출력하세요.

외래어 표기 예시:
- cancel → 캔슬 (can→캔, cel→슬) ← "캔셀" 아님
- simple → 심플 (sim→심, ple→플) ← "심펄" 아님
- stable → 스테이블 (sta→스테이, ble→블)
- action → 액션 (ac→액, tion→션) ← "액선" 아님, ʃ→sh 소리
- ship → 쉽 (sh→쉬, ip→이+프) ← "십" 아님, ʃ→sh 소리
- shop → 샵 (sh→샤, op→압) ← "솝" 아님
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

const FOREIGN_RE = /[぀-ヿ㐀-鿿豈-﫿Ѐ-ӿ฀-๿؀-ۿ]/g; // 일어·한자·태국어·아랍어 등

// ko 필드에서 한국어·ASCII 외 문자 제거
function stripForeignChars(str) {
  return (str || '').replace(/[^가-힯ᄀ-ᇿ㄰-㆏ -~]/g, '').trim();
}

function hasForeignScript(str) {
  return FOREIGN_RE.test(str || '');
}

const VOWEL_RE = /[aeiouæɑɒɔəɛɪɨʊʌɜɐɘɵʉ]/gi;

// IPA에서 ˈ(주강세)와 ˌ(보조강세) 위치를 음절 인덱스로 반환
function stressPositionsFromIPA(ipa) {
  const clean = (ipa || '').replace(/[\[\]\/\s]/g, '');
  const result = {}; // { syllableIndex: 'primary'|'secondary' }
  const countVowelsBefore = pos => {
    VOWEL_RE.lastIndex = 0;
    return (clean.substring(0, pos).match(VOWEL_RE) || []).length;
  };
  let i = clean.indexOf('ˈ');
  if (i !== -1) result[countVowelsBefore(i)] = 'primary';
  let j = 0;
  while ((j = clean.indexOf('ˌ', j)) !== -1) {
    const idx = countVowelsBefore(j);
    if (!result[idx]) result[idx] = 'secondary';
    j++;
  }
  return result;
}

function sanitize(parsed) {
  const syls = parsed.pronunciation?.syllables || [];
  syls.forEach(s => { s.ko = stripForeignChars(s.ko); });

  // mnemonic·examples에서 외래어(일어·한자·태국어 등) 제거
  FOREIGN_RE.lastIndex = 0;
  if (parsed.mnemonic) parsed.mnemonic = parsed.mnemonic.replace(FOREIGN_RE, '');
  if (parsed.examples) parsed.examples = parsed.examples.map(ex => {
    FOREIGN_RE.lastIndex = 0;
    return (ex || '').replace(FOREIGN_RE, '');
  });

  const ipa = parsed.pronunciation?.ipa || '';

  if (syls.length === 1) {
    // 단음절: 항상 강세
    syls[0].stress = true;
    syls[0].hint = '강세';
  } else if (syls.length > 1) {
    const pos = stressPositionsFromIPA(ipa);
    if (Object.keys(pos).length > 0) {
      syls.forEach((s, i) => {
        const t = pos[i];
        s.stress = t === 'primary';
        s.hint = t === 'primary' ? '강세' : t === 'secondary' ? '보조강세' : '약하게';
      });
    }
  }

  return parsed;
}

function needsReview(parsed) {
  const syls = (parsed.pronunciation?.syllables) || [];
  if (syls.some(s => !hasKorean(s.ko))) return true;
  const exs = parsed.examples || [];
  if (exs.some(ex => {
    const parts = (ex || '').split('—');
    return parts.length < 2 || !hasKorean(parts[1]);
  })) return true;
  if (!hasKorean(parsed.mnemonic)) return true;
  FOREIGN_RE.lastIndex = 0;
  if (hasForeignScript(parsed.mnemonic)) return true;
  if (parsed.examples?.some(ex => { FOREIGN_RE.lastIndex = 0; return hasForeignScript(ex); })) return true;
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
