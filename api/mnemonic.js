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

const GENERATE_PROMPT = (word, meaning) => `"${word}" (${meaning}) JSON 출력:
{"pronunciation":{"syllableWord":"","ipa":"[ˈ...]","syllables":[{"text":"","ko":"","hint":"약하게","stress":false}],"combined":"","tip":""},"mnemonic":"'...' — ...이미지","examples":["영어문장 — 한국어해석","영어문장 — 한국어해석","영어문장 — 한국어해석"]}`;

const REVIEW_PROMPT = (word, meaning, json) => `"${word}"(${meaning}) JSON 수정 후 완성본만 출력:
- ko: IPA 기준 한국어 발음 채우기 (ə/ʌ→어, ʃ→쉬)
- examples "—" 뒤: 자연스러운 한국어 구어체 필수
- mnemonic: 발음 일부와 비슷한 한국어 단어+뜻(${meaning}) 연결 스토리

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
  // 다음절인데 IPA에 강세 기호가 없으면 수정 요청
  if (syls.length > 1) {
    const ipa = parsed.pronunciation?.ipa || '';
    if (!ipa.includes('ˈ') && !ipa.includes('ˌ')) return true;
  }
  return false;
}

async function callGroq(messages, apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 700,
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

    // 2차 검토·수정 (ko/hint/해석/연상메모가 비어있거나 한국어가 아닌 경우)
    if (needsReview(parsed)) {
      console.log('문제 감지 → 2차 수정 요청');
      const raw2 = await callGroq([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: REVIEW_PROMPT(word, meaning, JSON.stringify(parsed, null, 2)) }
      ], apiKey);
      console.log('2차 raw_len:', raw2.length);
      let pass2ok = false;
      try {
        parsed = sanitize(parseJSON(raw2));
        pass2ok = true;
      } catch(e) {
        console.error('2차 parse error:', e.message);
      }
      // 2차도 품질 불량이면 3차로 새 생성 시도
      if (!pass2ok || needsReview(parsed)) {
        console.log('2차 품질 미달 → 3차 새 생성');
        try {
          const raw3 = await callGroq([
            { role: 'system', content: SYSTEM },
            { role: 'user', content: GENERATE_PROMPT(word, meaning) }
          ], apiKey);
          console.log('3차 raw_len:', raw3.length);
          parsed = sanitize(parseJSON(raw3));
        } catch(e) {
          console.error('3차 error:', e.message);
        }
      }
    }

    res.status(200).json(parsed);
  } catch(e) {
    console.error('handler error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
