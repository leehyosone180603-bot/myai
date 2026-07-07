// ElevenLabs 글자별 타임스탬프(alignment) → 자막(SRT) 변환.

// 초 → SRT 타임코드 "HH:MM:SS,mmm"
function tc(sec) {
  const s = Math.max(0, sec);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  const t = Math.floor(s);
  const hh = String(Math.floor(t / 3600)).padStart(2, "0");
  const mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss},${String(ms).padStart(3, "0")}`;
}

/**
 * alignment 를 자막 줄 단위로 자른다(상대 시간).
 * 문장부호/길이/최대길이 기준으로 자연스럽게 분할.
 * @returns {Array<{text:string,start:number,end:number}>}
 */
export function buildSegments(alignment, { maxChars = 30, maxDur = 5 } = {}) {
  if (!alignment) return [];
  const chars = alignment.characters || [];
  const st = alignment.character_start_times_seconds || [];
  const en = alignment.character_end_times_seconds || [];
  const out = [];
  let cur = { text: "", start: null, end: 0 };
  const flush = () => {
    const t = cur.text.trim();
    if (t) out.push({ text: t, start: cur.start ?? 0, end: cur.end });
    cur = { text: "", start: null, end: 0 };
  };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (cur.start === null) cur.start = st[i] ?? cur.end;
    cur.text += c;
    cur.end = en[i] ?? cur.end;
    const dur = cur.end - (cur.start ?? cur.end);
    const trimmedLen = cur.text.trim().length;
    const endsSentence = /[.?!。…\n]/.test(c);
    const breakable = /[\s,，、。.?!…]/.test(c);
    if (endsSentence || (trimmedLen >= maxChars && breakable) || dur >= maxDur) flush();
  }
  flush();
  return out;
}

// SRT 문자열 → [{start, end, text}] (초 단위). 편집 가이드의 총 길이 계산 등에 사용.
export function parseSrt(content) {
  const out = [];
  for (const block of String(content || "").split(/\r?\n\r?\n/)) {
    const m = block.match(/(\d\d):(\d\d):(\d\d),(\d\d\d)\s*-->\s*(\d\d):(\d\d):(\d\d),(\d\d\d)/);
    if (!m) continue;
    const start = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
    const end = +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000;
    const text = block.split(/\r?\n/).slice(2).join(" ").trim();
    out.push({ start, end, text });
  }
  return out;
}

// 절대시간 줄 배열 → SRT 문자열
export function formatSrt(lines) {
  return (
    lines
      .map((l, i) => `${i + 1}\n${tc(l.start)} --> ${tc(l.end)}\n${l.text}`)
      .join("\n\n") + "\n"
  );
}
