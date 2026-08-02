// 간편 영상 제작기: 대본 → (사실적 이미지 N장 + TTS + 자막).
// 영상 합치기(ffmpeg 조립)는 제외 — 브루에서 직접 편집. 이미지/음성/자막을 각각 다운로드해서 사용.
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { config, ROOT } from "./config.js";
import { generateJson, generateImage, ttsWithTimestamps } from "./clients.js";
import { buildSegments, formatSrt } from "./srt.js";
import { chunkText } from "./textutil.js";
import { existingImagePath } from "./pipeline.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function writeRetry(path, data) {
  for (let i = 0; ; i++) {
    try { writeFileSync(path, data); return; }
    catch (e) {
      if ((e.code === "EBUSY" || e.code === "EPERM" || e.code === "EACCES") && i < 8) { await sleep(700); continue; }
      throw e;
    }
  }
}

// 사실적(포토리얼) 스타일 토큰 — 자동 생성 시 기본 스타일
const REAL_STYLE =
  "cinematic photorealistic photograph, realistic Korean person, natural soft golden lighting, shallow depth of field, high detail, film-like color grading, 16:9";
const NO_TEXT = "no text, no letters, no captions, no subtitles, no watermark, no logo";

// 대본 → 동일 인물 유지 + 다양한 장면의 사실적 이미지 프롬프트 N개 (사용자가 프롬프트를 안 넣었을 때만 사용)
async function makerScenePrompts(text, count) {
  const system = `너는 사실적(포토리얼) 유튜브 영상용 장면 연출가다. 대본을 바탕으로 '사진 같은' 장면 ${count}개의 이미지 프롬프트를 만든다.
- 한 명의 동일 인물(한국인)을 모든 컷에서 일관되게 유지(같은 얼굴·헤어·분위기). 장면·배경·표정·구도는 다양하게.
- 글자/자막/워터마크 없음. 출력은 JSON 하나.`;
  const user = `대본:
${(text || "").slice(0, 3500)}

JSON 스키마:
{
  "character": "주인공 고정 외모(영어, 사실적 사진 묘사: 나이·헤어·인상·복장)",
  "scenes": ["영문 장면 프롬프트 ${count}개 (배경·행동·표정·조명 포함)"]
}`;
  return generateJson({ system, user });
}

function hasFfmpeg(ffmpegPath) {
  try { execFileSync(ffmpegPath, ["-version"], { stdio: ["ignore", "ignore", "ignore"] }); return true; }
  catch { return false; }
}

// 이미지 N장만 생성 (음성/자막과 분리해서 재사용). prompts 있으면 그대로, 없으면 script 로 AI 자동 생성.
async function makeImages(dir, { prompts = [], imageCount = 10, script = "", emit }) {
  const userPrompts = (Array.isArray(prompts) ? prompts : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const useUserPrompts = userPrompts.length > 0;
  const count = useUserPrompts ? userPrompts.length : Math.max(1, imageCount);

  let scenes = [];
  let character = "";
  if (useUserPrompts) {
    emit(`직접 입력한 프롬프트로 이미지 ${count}장 생성`);
  } else {
    if (!String(script || "").trim()) throw new Error("이미지 프롬프트를 넣거나, 대본을 넣어주세요. (프롬프트가 비면 대본으로 자동 생성)");
    emit(`사실적 이미지 ${count}장 프롬프트 자동 생성 중...`);
    const p = await makerScenePrompts(script, count);
    character = p.character || "a Korean person in their 30s";
    scenes = (p.scenes || []).slice(0, count);
  }

  const images = [];
  for (let i = 0; i < count; i++) {
    const id = `img-${String(i + 1).padStart(2, "0")}`;
    if (existingImagePath(dir, id)) { emit(`↩ 기존 이미지 재사용 ${id}`); images.push(`images/${id}.png`); continue; }
    let prompt;
    if (useUserPrompts) {
      prompt = `${userPrompts[i]}. ${NO_TEXT}`;
    } else {
      const scene = scenes[i] || scenes[scenes.length - 1] || "a Korean person, natural scene";
      prompt = `${scene}. The same recurring person throughout: ${character}. ${REAL_STYLE}. ${NO_TEXT}`;
    }
    emit(`이미지 생성 ${i + 1}/${count}`);
    try {
      const out = await generateImage(prompt);
      if (out.b64) await writeRetry(join(dir, "images", `${id}.png`), Buffer.from(out.b64, "base64"));
      else if (out.url) await writeRetry(join(dir, "images", `${id}.png`), Buffer.from(await (await fetch(out.url)).arrayBuffer()));
      if (existsSync(join(dir, "images", `${id}.png`))) images.push(`images/${id}.png`);
    } catch (e) {
      emit(`  ⚠ ${id} 실패: ${e.message}`);
    }
  }
  return images;
}

// 이미지만 생성 (음성/자막 없이). "이미지만 생성" 버튼 전용.
export async function makerImagesOnly(slug, { prompts = [], imageCount = 10, script = "", onLog } = {}) {
  const emit = (m) => (onLog ? onLog(m) : console.log(m));
  const dir = join(ROOT, "output", slug);
  mkdirSync(join(dir, "images"), { recursive: true });
  const images = await makeImages(dir, { prompts, imageCount, script, emit });
  emit(`🎉 이미지 ${images.length}장 완료 (output/${slug})`);
  return { slug, images };
}

// 전체 실행: 대본 → TTS + 자막 + 이미지 N장 (영상 합치기는 하지 않음)
// prompts: 사용자가 직접 넣은 이미지 프롬프트 배열(한 줄에 1장). 비어 있으면 AI가 대본으로 자동 생성.
export async function makerRun(slug, text, { voiceId, speed, imageCount = 10, prompts = [], onLog } = {}) {
  const emit = (m) => (onLog ? onLog(m) : console.log(m));
  const dir = join(ROOT, "output", slug);
  mkdirSync(join(dir, "images"), { recursive: true });
  mkdirSync(join(dir, "audio"), { recursive: true });

  const script = (text || "").trim();
  if (!script) throw new Error("대본을 넣어주세요.");

  // 1) TTS + 자막 (10000자 한도 → 조각으로 나눠 생성 후 이어붙임)
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const chunks = chunkText(script, 9000);
  emit(`음성(TTS) + 자막 생성 중... (${chunks.length}조각)`);
  const parts = [];
  const lines = [];
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (chunks.length > 1) emit(`  음성 조각 ${i + 1}/${chunks.length}`);
    const { audioB64, alignment } = await ttsWithTimestamps(chunks[i], { voiceId, speed });
    if (!audioB64) throw new Error("음성 데이터를 못 받았습니다. (⚙️설정에 ElevenLabs 키·보이스 확인)");
    const pf = `part-${String(i + 1).padStart(2, "0")}.mp3`;
    await writeRetry(join(dir, "audio", pf), Buffer.from(audioB64, "base64"));
    parts.push(pf);
    for (const s of buildSegments(alignment)) lines.push({ text: s.text, start: s.start + offset, end: s.end + offset });
    const ends = alignment?.character_end_times_seconds || [];
    offset += ends.length ? ends[ends.length - 1] : 0;
  }
  // 조각 음성 → narration.mp3
  if (parts.length === 1) {
    copyFileSync(join(dir, "audio", parts[0]), join(dir, "audio", "narration.mp3"));
  } else {
    if (!hasFfmpeg(ffmpeg)) throw new Error("긴 대본은 음성 조각을 이어붙이려면 ffmpeg 가 필요합니다. (winget install Gyan.FFmpeg 후 재시작)");
    writeFileSync(join(dir, "parts.txt"), parts.map((p) => `file 'audio/${p}'`).join("\n") + "\n");
    execFileSync(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", "parts.txt", "-c", "copy", "audio/narration.mp3"], { cwd: dir, stdio: ["ignore", "ignore", "pipe"] });
  }
  await writeRetry(join(dir, "narration.srt"), formatSrt(lines));
  await writeRetry(join(dir, "narration.txt"), script);
  const duration = offset || (lines.length ? lines[lines.length - 1].end : 0);
  emit(`✓ 음성+자막 완료 (길이 ${Math.round(duration)}초, 자막 ${lines.length}줄)`);

  // 2) 이미지 N장
  const images = await makeImages(dir, { prompts, imageCount, script, emit });

  emit(`🎉 완료: 음성·자막·이미지 ${images.length}장 (output/${slug})`);
  return { slug, audio: "audio/narration.mp3", srt: "narration.srt", duration, images };
}
