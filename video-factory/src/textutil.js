// 긴 대본을 문장 경계에서 maxLen 이하 조각들로 분할 (TTS 글자수 한도 대응).
export function chunkText(text, maxLen = 9000) {
  const clean = String(text || "").replace(/\r/g, "");
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.split(/(?<=[.?!。…\n])\s*/);
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if (s.length > maxLen) {
      // 한 문장이 한도보다 길면 강제로 잘라 넣음
      if (cur.trim()) { chunks.push(cur.trim()); cur = ""; }
      for (let i = 0; i < s.length; i += maxLen) chunks.push(s.slice(i, i + maxLen));
      continue;
    }
    if ((cur + s).length > maxLen && cur) { chunks.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [clean];
}
