// 유튜브 자막 자동 수집 모듈.
// downsub.com 같은 사이트가 내부적으로 하는 일(유튜브 자막 트랙 다운로드)을
// 원천 도구인 yt-dlp 로 직접 수행하고, 받은 자막(vtt/srt/json3)을 깨끗한 대본 텍스트로 정제한다.
//
// ⚠️ 외부망이 열린 환경 + yt-dlp 설치가 필요하다.
//    설치: pip install -U yt-dlp   (또는  brew install yt-dlp)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 유튜브 URL/문자열에서 영상 ID 추출
export function youtubeId(url) {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/shorts\/([\w-]{11})/) ||
    url.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

// 사운드 큐([음악],[Music],[박수] 등)·HTML/타이밍 태그 제거
function stripNoise(line) {
  return line
    .replace(/<[^>]+>/g, "") // <00:00:01.000>, <c> 등
    .replace(/\[[^\]]*\]/g, "") // [음악], [Music], [박수]
    .replace(/\s+/g, " ")
    .trim();
}

// WebVTT 파싱 → 중복 제거된 평문
export function parseVtt(raw) {
  const out = [];
  let last = "";
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "WEBVTT" || line.startsWith("NOTE") || line.startsWith("Kind:") || line.startsWith("Language:")) continue;
    if (line.includes("-->")) continue; // 타이밍 줄
    if (/^\d+$/.test(line)) continue; // 큐 번호
    const clean = stripNoise(line);
    if (!clean) continue;
    if (clean === last) continue; // 자동자막의 연속 중복 줄 제거
    out.push(clean);
    last = clean;
  }
  return joinSentences(out);
}

// SRT 파싱
export function parseSrt(raw) {
  const out = [];
  let last = "";
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^\d+$/.test(line) || line.includes("-->")) continue;
    const clean = stripNoise(line);
    if (!clean || clean === last) continue;
    out.push(clean);
    last = clean;
  }
  return joinSentences(out);
}

// YouTube json3 자막 파싱
export function parseJson3(raw) {
  const data = JSON.parse(raw);
  const out = [];
  let last = "";
  for (const ev of data.events || []) {
    if (!ev.segs) continue;
    const text = stripNoise(ev.segs.map((s) => s.utf8 || "").join(""));
    if (!text || text === last) continue;
    out.push(text);
    last = text;
  }
  return joinSentences(out);
}

// 짧은 자막 조각들을 자연스러운 문단으로 합침
function joinSentences(lines) {
  return lines
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/([.?!。…])\s+/g, "$1\n")
    .trim();
}

function parseByExt(file, raw) {
  if (file.endsWith(".json3") || file.endsWith(".json")) return parseJson3(raw);
  if (file.endsWith(".srt")) return parseSrt(raw);
  return parseVtt(raw);
}

// 받은 자막 파일들 중 선호 언어를 고른다 (ko > ko-orig > en > 그 외)
function pickBest(files, langs) {
  const order = [...langs, "ko", "ko-orig", "en"];
  for (const lang of order) {
    const hit = files.find((f) => f.includes(`.${lang}.`));
    if (hit) return hit;
  }
  return files[0];
}

/**
 * 유튜브 URL → 정제된 대본 텍스트.
 * @param {string} url
 * @param {{langs?: string[], ytdlpPath?: string}} opts
 * @returns {{ id: string, lang: string, text: string }}
 */
export function fetchTranscript(url, { langs = ["ko", "ko-orig", "en"], ytdlpPath = process.env.YTDLP_PATH || "yt-dlp" } = {}) {
  const id = youtubeId(url) || "video";
  const dir = mkdtempSync(join(tmpdir(), "vf-sub-"));
  try {
    try {
      execFileSync(
        ytdlpPath,
        [
          "--skip-download",
          "--write-subs",
          "--write-auto-subs",
          "--sub-langs", langs.join(","),
          "--sub-format", "vtt/srt/json3/best",
          "-o", join(dir, "%(id)s.%(ext)s"),
          url,
        ],
        { stdio: ["ignore", "ignore", "pipe"] }
      );
    } catch (e) {
      const msg = (e.stderr || e.message || "").toString();
      if (e.code === "ENOENT") {
        throw new Error("yt-dlp 가 설치되어 있지 않습니다.  설치: pip install -U yt-dlp");
      }
      throw new Error(`yt-dlp 실행 실패(네트워크 차단/자막 없음 등):\n${msg.slice(0, 500)}`);
    }

    const subs = readdirSync(dir).filter((f) => /\.(vtt|srt|json3|json)$/.test(f));
    if (!subs.length) {
      throw new Error("이 영상에서 자막을 찾지 못했습니다(자동자막 비활성/없음). 수동으로 --input 파일에 붙여넣어 주세요.");
    }
    const chosen = pickBest(subs, langs);
    const langMatch = chosen.match(/\.([\w-]+)\.(?:vtt|srt|json3|json)$/);
    const text = parseByExt(chosen, readFileSync(join(dir, chosen), "utf8"));
    return { id, lang: langMatch ? langMatch[1] : "unknown", text };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// fetchTranscript 결과를 benchmark/*.md 형식 문자열로 변환
export function toBenchmarkMd(url, { id, lang, text }) {
  return `# 벤치마크 영상 입력 (자동 수집)

## 출처
- URL: ${url}
- 영상 ID: ${id}
- 자막 언어: ${lang}

## 자막/스크립트 (전체)
${text}
`;
}
