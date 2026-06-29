// 파이프라인 오케스트레이션: 벤치마크 → 분석 → 콘텐츠 → 이미지/인트로 프롬프트 → (옵션) 렌더링.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config, ROOT } from "./config.js";
import { generateJson, generateImage, generateVideo, ttsWithTimestamps } from "./clients.js";
import { buildSegments, formatSrt } from "./srt.js";
import * as P from "./prompts.js";

// onLog 가 있으면 UI로, 없으면 콘솔로 진행상황을 보낸다.
const mkEmit = (onLog) => (msg) => (onLog ? onLog(msg) : console.log("•", msg));

export function outDir(slug) {
  const dir = join(ROOT, "output", slug);
  mkdirSync(join(dir, "images"), { recursive: true });
  mkdirSync(join(dir, "intro"), { recursive: true });
  return dir;
}

const writeJson = (dir, name, data) =>
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n");

// 콘텐츠 패키지를 사람이 읽기 좋은 마크다운으로 변환
export function packageToMarkdown(analysis, pkg) {
  const ch = (pkg.chapters || [])
    .map((c) => `### ${c.timecode ? c.timecode + " · " : ""}${c.title}\n\n${c.script}`)
    .join("\n\n");
  return `# 영상 콘텐츠 패키지

## 주제
${analysis.topic || ""}

## 영상 제목 후보
${(pkg.video_title_options || []).map((t) => `- ${t}`).join("\n")}

## 썸네일 문구
**${pkg.thumbnail_title || ""}**
${pkg.thumbnail_subtext ? `\n_${pkg.thumbnail_subtext}_` : ""}

## 설명글
${pkg.description || ""}

## 목차
${(pkg.chapters || []).map((c) => `- ${c.timecode ? c.timecode + " " : ""}${c.title}`).join("\n")}

## 대본
${ch}

## 한 줄 요약
${pkg.one_line_summary || ""}

## CTA
${pkg.cta || ""}
`;
}

export async function runPlan(benchmarkText, onLog) {
  const emit = mkEmit(onLog);
  emit("벤치마크 분석 중...");
  return generateJson({ system: P.analyzeSystem, user: P.analyzePrompt(benchmarkText) });
}

export async function runAll(slug, benchmarkText, { generateImages = false, generateVideos = false, onLog } = {}) {
  const emit = mkEmit(onLog);
  const dir = outDir(slug);

  const analysis = await runPlan(benchmarkText, onLog);
  writeJson(dir, "01-analysis.json", analysis);
  emit("✓ 분석 완료 (주제·목차·약점)");

  emit("업그레이드 대본/메타데이터 생성 중... (시간이 좀 걸려요)");
  const pkg = await generateJson({ system: P.writeSystem, user: P.writePrompt(analysis), maxTokens: 12000 });
  writeJson(dir, "02-content-package.json", pkg);
  writeFileSync(join(dir, "content.md"), packageToMarkdown(analysis, pkg));
  emit("✓ 제목·썸네일·설명·대본 완료");

  emit("이미지 프롬프트 생성 중...");
  const images = await generateJson({ system: P.imageSystem, user: P.imagePrompt(pkg) });
  writeJson(dir, "03-image-prompts.json", images);
  emit(`✓ 이미지 프롬프트 ${images.images?.length ?? 0}장`);

  emit("인트로 영상 프롬프트 생성 중...");
  const intro = await generateJson({ system: P.introSystem, user: P.introPrompt(pkg) });
  writeJson(dir, "04-intro-prompts.json", intro);
  emit(`✓ 인트로 클립 ${intro.clips?.length ?? 0}개`);

  if (generateImages) await renderImages(dir, images, onLog);
  if (generateVideos) await renderVideos(dir, intro, images, onLog);

  emit(`완료 ✅  산출물: output/${slug}/`);
  return { slug, analysis, pkg, images, intro };
}

export async function renderImages(dir, images, onLog) {
  const emit = mkEmit(onLog);
  const list = images.images || [];
  const done = [];
  for (const img of list) {
    emit(`이미지 생성: ${img.id}`);
    try {
      // 말풍선/글자 금지어를 항상 덧붙여 강제(프롬프트에 빠져 있어도 안전)
      const full = `${img.prompt} ${images.style_token || ""} ${P.NO_TEXT_NEGATIVE}`.trim();
      const out = await generateImage(full);
      const path = join(dir, "images", `${img.id}.png`);
      if (out.b64) {
        writeFileSync(path, Buffer.from(out.b64, "base64"));
      } else if (out.url) {
        writeFileSync(path, Buffer.from(await (await fetch(out.url)).arrayBuffer()));
      }
      done.push(`${img.id}.png`);
    } catch (e) {
      emit(`  ⚠ ${img.id} 실패: ${e.message}`);
    }
  }
  emit(`✓ 이미지 ${done.length}/${list.length}장 생성`);
  return done;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 클립에 쓸 입력 이미지(base64)를 확보한다. from_image_id 로 생성된 이미지가 있으면 그걸,
// 없으면 클립 프롬프트로 이미지를 즉석 생성한다. (grok-imagine 은 image-to-video 만 지원)
async function ensureClipImage(dir, clip, images, emit) {
  const styleToken = images?.style_token || "";
  const candidate = clip.from_image_id ? join(dir, "images", `${clip.from_image_id}.png`) : null;
  if (candidate && existsSync(candidate)) {
    return readFileSync(candidate).toString("base64");
  }
  emit(`  · ${clip.id}: 입력 이미지가 없어 즉석 생성`);
  const out = await generateImage(`${clip.prompt} ${styleToken}`.trim());
  if (out.b64) {
    if (candidate) writeFileSync(candidate, Buffer.from(out.b64, "base64"));
    return out.b64;
  }
  if (out.url) {
    const buf = Buffer.from(await (await fetch(out.url)).arrayBuffer());
    if (candidate) writeFileSync(candidate, buf);
    return buf.toString("base64");
  }
  throw new Error("입력 이미지 생성 실패");
}

export async function renderVideos(dir, intro, images, onLog) {
  const emit = mkEmit(onLog);
  const list = intro.clips || [];
  const done = [];
  for (let i = 0; i < list.length; i++) {
    const clip = list[i];
    emit(`인트로 영상 생성: ${clip.id} (${i + 1}/${list.length})`);
    try {
      const imageB64 = await ensureClipImage(dir, clip, images, emit);
      const out = await generateVideo(clip.prompt, {
        seconds: config.introClipSeconds,
        aspectRatio: config.videoAspectRatio,
        imageB64,
      });
      if (out.url) {
        writeFileSync(join(dir, "intro", `${clip.id}.mp4`), Buffer.from(await (await fetch(out.url)).arrayBuffer()));
        done.push(`${clip.id}.mp4`);
      } else {
        writeJson(dir, `intro/${clip.id}.raw.json`, out);
        emit(`  · ${clip.id}: 응답을 raw.json 으로 저장(엔드포인트 확인 필요)`);
      }
    } catch (e) {
      emit(`  ⚠ ${clip.id} 실패: ${e.message}`);
    }
    if (i < list.length - 1) await sleep(5000); // rate limit 완화용 간격
  }
  emit(`✓ 인트로 영상 ${done.length}/${list.length}개 생성`);
  return done;
}

// ── TTS 음성 + 자막(SRT) 생성 ─────────────────────────────────
// 대본(챕터별)을 ElevenLabs 로 읽어 음성을 만들고, 글자 타임스탬프로 자막을 생성한다.
// 챕터별로 생성해 이어 붙이고, 자막 시간은 누적 오프셋으로 맞춘다.
export async function generateNarration(slug, { voiceId, model, onLog } = {}) {
  const emit = mkEmit(onLog);
  const dir = outDir(slug);
  mkdirSync(join(dir, "audio"), { recursive: true });
  const r = readResult(slug);
  const chunks = (r.pkg?.chapters || []).map((c) => (c.script || "").trim()).filter(Boolean);
  if (!chunks.length) throw new Error("대본이 없습니다. 먼저 콘텐츠(✨생성)를 만들어 주세요.");

  const audioBuffers = [];
  const lines = [];
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    emit(`음성 생성: ${i + 1}/${chunks.length} 챕터`);
    const { audioB64, alignment } = await ttsWithTimestamps(chunks[i], { voiceId, model });
    if (audioB64) audioBuffers.push(Buffer.from(audioB64, "base64"));
    for (const s of buildSegments(alignment)) {
      lines.push({ text: s.text, start: s.start + offset, end: s.end + offset });
    }
    const ends = alignment?.character_end_times_seconds || [];
    offset += ends.length ? ends[ends.length - 1] : 0; // 다음 챕터 자막 시작 오프셋(= 누적 음성 길이)
  }

  writeFileSync(join(dir, "audio", "narration.mp3"), Buffer.concat(audioBuffers));
  writeFileSync(join(dir, "narration.srt"), formatSrt(lines));
  writeFileSync(join(dir, "narration.txt"), chunks.join("\n\n"));
  emit(`✓ 음성(audio/narration.mp3) + 자막(narration.srt, ${lines.length}줄) 생성 완료`);
  return { slug, audio: "audio/narration.mp3", srt: "narration.srt", txt: "narration.txt", lines: lines.length };
}

export function readBenchmark(path) {
  return readFileSync(path, "utf8");
}

// 저장된 산출물 읽기 (UI 새로고침용)
export function readResult(slug) {
  const dir = join(ROOT, "output", slug);
  const read = (n) => (existsSync(join(dir, n)) ? JSON.parse(readFileSync(join(dir, n), "utf8")) : null);
  return {
    slug,
    analysis: read("01-analysis.json"),
    pkg: read("02-content-package.json"),
    images: read("03-image-prompts.json"),
    intro: read("04-intro-prompts.json"),
  };
}
