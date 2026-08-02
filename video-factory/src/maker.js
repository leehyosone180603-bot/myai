// 간편 영상 제작기: 대본 → (사실적 이미지 N장 + TTS + 자막) → ffmpeg 로 최종 영상(mp4) 조립.
// 기존 video-factory 파이프라인과 별개(이대로 두고 추가). 이미지는 영상 길이/ N 로 균등 배치.
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
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

// 사실적(포토리얼) 스타일 토큰 — 예시 이미지 같은 시네마틱 실사
const REAL_STYLE =
  "cinematic photorealistic photograph, realistic Korean person, natural soft golden lighting, shallow depth of field, high detail, film-like color grading, 16:9";
const NO_TEXT = "no text, no letters, no captions, no subtitles, no watermark, no logo";

// 대본 → 동일 인물 유지 + 다양한 장면의 사실적 이미지 프롬프트 N개
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

// ffmpeg 존재 확인
function hasFfmpeg(ffmpegPath) {
  try { execFileSync(ffmpegPath, ["-version"], { stdio: ["ignore", "ignore", "ignore"] }); return true; }
  catch { return false; }
}

// 이미지 N장 + 음성 길이 → ffmpeg 로 슬라이드쇼+음성+자막(번인) 합치기 → final.mp4
function assemble(dir, count, durationSec, emit) {
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  if (!hasFfmpeg(ffmpeg)) {
    throw new Error(
      "ffmpeg 가 설치되어 있지 않습니다. (영상 합치기에 필요)\n" +
        "설치: https://ffmpeg.org/download.html 또는 PowerShell 에 `winget install Gyan.FFmpeg` 후 재시작.\n" +
        "설치 전에도 이미지·음성·자막 파일은 이미 만들어졌으니 브루로 합치셔도 됩니다."
    );
  }
  const per = Math.max(0.5, (durationSec || count * 3) / count);
  // concat 데모서: 각 이미지 duration 초, 마지막 프레임 한 번 더(concat 관례)
  let list = "";
  for (let i = 1; i <= count; i++) {
    const id = `img-${String(i).padStart(2, "0")}.png`;
    list += `file 'images/${id}'\nduration ${per.toFixed(3)}\n`;
  }
  list += `file 'images/img-${String(count).padStart(2, "0")}.png'\n`;
  writeFileSync(join(dir, "slides.txt"), list);

  const vf =
    "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080," +
    "subtitles=narration.srt:force_style='FontName=Malgun Gothic,FontSize=22,PrimaryColour=&H00FFFFFF,BorderStyle=3,Outline=1,Shadow=0,BackColour=&H80000000'";
  const args = [
    "-y",
    "-f", "concat", "-safe", "0", "-i", "slides.txt",
    "-i", "audio/narration.mp3",
    "-vf", vf,
    "-r", "30",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-shortest",
    "final.mp4",
  ];
  emit("영상 합치는 중 (ffmpeg)...");
  try {
    execFileSync(ffmpeg, args, { cwd: dir, stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    const err = (e.stderr || e.message || "").toString().slice(-500);
    throw new Error(`ffmpeg 합치기 실패:\n${err}`);
  }
  return "final.mp4";
}

// 전체 실행: 대본 → 이미지 N장 + TTS + 자막 → final.mp4
export async function makerRun(slug, text, { voiceId, speed, imageCount = 10, onLog } = {}) {
  const emit = (m) => (onLog ? onLog(m) : console.log(m));
  const dir = join(ROOT, "output", slug);
  mkdirSync(join(dir, "images"), { recursive: true });
  mkdirSync(join(dir, "audio"), { recursive: true });

  const script = (text || "").trim();
  if (!script) throw new Error("대본을 넣어주세요.");

  // 1) TTS + 자막 (10000자 한도 → 조각으로 나눠 생성 후 ffmpeg 로 이어붙임)
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

  // 2) 사실적 이미지 N장
  emit(`사실적 이미지 ${imageCount}장 프롬프트 생성 중...`);
  const p = await makerScenePrompts(script, imageCount);
  const character = p.character || "a Korean person in their 30s";
  const scenes = (p.scenes || []).slice(0, imageCount);
  for (let i = 0; i < imageCount; i++) {
    const id = `img-${String(i + 1).padStart(2, "0")}`;
    if (existingImagePath(dir, id)) { emit(`↩ 기존 이미지 재사용 ${id}`); continue; }
    const scene = scenes[i] || scenes[scenes.length - 1] || "a Korean person, natural scene";
    const prompt = `${scene}. The same recurring person throughout: ${character}. ${REAL_STYLE}. ${NO_TEXT}`;
    emit(`이미지 생성 ${i + 1}/${imageCount}`);
    try {
      const out = await generateImage(prompt);
      if (out.b64) await writeRetry(join(dir, "images", `${id}.png`), Buffer.from(out.b64, "base64"));
      else if (out.url) await writeRetry(join(dir, "images", `${id}.png`), Buffer.from(await (await fetch(out.url)).arrayBuffer()));
    } catch (e) {
      emit(`  ⚠ ${id} 실패: ${e.message}`);
    }
  }

  // 3) ffmpeg 조립 (이미지 = 길이/ N 균등)
  const video = assemble(dir, imageCount, duration, emit);
  emit(`🎉 완료: output/${slug}/final.mp4`);
  return { slug, audio: "audio/narration.mp3", srt: "narration.srt", video, duration, images: imageCount };
}
