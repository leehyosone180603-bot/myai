// 파이프라인 오케스트레이션: 벤치마크 → 분석 → 콘텐츠 → 이미지/인트로 프롬프트 → (옵션) 렌더링.
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
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
  const intro = await generateJson({ system: P.introSystem, user: P.introPrompt(pkg, images) });
  writeJson(dir, "04-intro-prompts.json", intro);
  emit(`✓ 인트로 클립 ${intro.clips?.length ?? 0}개`);

  if (generateImages) await renderImages(dir, images, onLog);
  if (generateVideos) await renderVideos(dir, intro, images, onLog);

  emit(`완료 ✅  산출물: output/${slug}/`);
  return { slug, analysis, pkg, images, intro };
}

// 이미지 슬롯에 이미 파일이 있으면 그 경로 반환(업로드본/생성본 재사용용)
const IMG_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
export function existingImagePath(dir, id) {
  for (const e of IMG_EXTS) {
    const p = join(dir, "images", `${id}${e}`);
    if (existsSync(p)) return p;
  }
  return null;
}

// 등장인물(cast) 고정 외모 블록 — 모든 이미지에 주입해 인물 일관성 유지
function castBlock(images) {
  const cast = images?.cast;
  if (!cast) return "";
  let entries = [];
  if (Array.isArray(cast)) {
    entries = cast.map((c) => `${c.name || c.ref || c.role || "character"}: ${c.description || c.desc || c}`);
  } else if (typeof cast === "object") {
    entries = Object.entries(cast)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`);
  }
  if (!entries.length) return "";
  return `Consistent recurring characters — draw them IDENTICALLY across every image (same face, hairstyle, outfit, body type): ${entries.join("; ")}. Only include the characters that actually appear in this scene. `;
}

// 최종 이미지 프롬프트 = 인물고정 + 장면 + 스타일 + 금지어
function composeImagePrompt(images, img) {
  const scene = img?.prompt || img?.ko_desc || "";
  return `${castBlock(images)}Scene: ${scene}. ${images?.style_token || ""} ${P.NO_TEXT_NEGATIVE}`.trim();
}

// 참조 이미지(사용자가 첨부한 "이런 느낌") data URI 배열 — output/<slug>/ref/*
export function readRefDataUrls(dir) {
  const rdir = join(dir, "ref");
  if (!existsSync(rdir)) return [];
  return readdirSync(rdir)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .slice(0, 3)
    .map((f) => {
      const buf = readFileSync(join(rdir, f));
      const ext = f.split(".").pop().toLowerCase();
      return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`;
    });
}

// 슬롯 1개를 실제로 생성(덮어쓰기). refs: 참조 이미지 data URI 배열
async function renderImageById(dir, images, img, refs) {
  const full = composeImagePrompt(images, img);
  const out = await generateImage(full, { refImages: refs });
  const path = join(dir, "images", `${img.id}.png`);
  if (out.b64) writeFileSync(path, Buffer.from(out.b64, "base64"));
  else if (out.url) writeFileSync(path, Buffer.from(await (await fetch(out.url)).arrayBuffer()));
  else throw new Error("이미지 응답이 비어 있습니다");
  return path;
}

// 비어 있는 슬롯만 생성(이미 있는 이미지는 재사용 → 비용 절약). 업로드한 내 이미지도 그대로 보존.
export async function renderImages(dir, images, onLog) {
  const emit = mkEmit(onLog);
  const list = images.images || [];
  const refs = readRefDataUrls(dir);
  if (refs.length) emit(`참조 이미지 ${refs.length}장 반영`);
  const done = [];
  let made = 0,
    reused = 0;
  for (const img of list) {
    if (existingImagePath(dir, img.id)) {
      emit(`↩ 기존 이미지 재사용: ${img.id}`);
      reused++;
      done.push(img.id);
      continue;
    }
    emit(`이미지 생성: ${img.id}`);
    try {
      await renderImageById(dir, images, img, refs);
      made++;
      done.push(img.id);
    } catch (e) {
      emit(`  ⚠ ${img.id} 실패: ${e.message}`);
    }
  }
  emit(`✓ 이미지 ${done.length}/${list.length}장 (신규 ${made}, 재사용 ${reused})`);
  return done;
}

// 슬롯 1개 강제 다시 생성 (UI '↻ 다시' 버튼)
export async function renderOneImage(slug, id, onLog) {
  const emit = mkEmit(onLog);
  const dir = outDir(slug);
  const r = readResult(slug);
  const img = (r.images?.images || []).find((x) => x.id === id);
  if (!img) throw new Error(`이미지 슬롯 ${id} 를 찾을 수 없습니다.`);
  emit(`이미지 다시 생성: ${id}`);
  await renderImageById(dir, r.images, img, readRefDataUrls(dir));
  return { id };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 클립에 쓸 입력 이미지(base64)를 확보한다. 그림체 통일이 핵심:
// 반드시 '영상용 이미지 세트'의 컷에서 출발한다(있으면 재사용, 없으면 그 컷의 이미지 프롬프트로 생성).
// 클립의 모션 프롬프트로 이미지를 만들지 않는다(그림체가 흔들리므로).
async function ensureClipImage(dir, clip, images, emit) {
  const imgList = images?.images || [];
  // from_image_id 가 유효하면 그걸, 아니면 첫 번째 이미지 컷으로 폴백(스타일 통일 보장)
  let refId = clip.from_image_id && imgList.some((i) => i.id === clip.from_image_id) ? clip.from_image_id : imgList[0]?.id;

  if (refId) {
    const existing = existingImagePath(dir, refId);
    if (existing) {
      emit(`  · ${clip.id}: 영상용 이미지(${refId}) 재사용`);
      return readFileSync(existing).toString("base64");
    }
  }
  // 없으면 '그 컷의 이미지 프롬프트'로 통일 스타일 생성 (모션 프롬프트 아님)
  const imgDef = imgList.find((i) => i.id === refId) || { prompt: clip.ko_desc || clip.prompt };
  emit(`  · ${clip.id}: 입력 이미지 생성(${refId || "scene"}, 그림체·인물 통일)`);
  const full = composeImagePrompt(images, imgDef);
  const out = await generateImage(full, { refImages: readRefDataUrls(dir) });
  const savePath = join(dir, "images", `${refId || clip.id}.png`);
  if (out.b64) {
    writeFileSync(savePath, Buffer.from(out.b64, "base64"));
    return out.b64;
  }
  if (out.url) {
    const buf = Buffer.from(await (await fetch(out.url)).arrayBuffer());
    writeFileSync(savePath, buf);
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
      // 모션만 주고, 입력 이미지의 그림체를 유지하도록 명시(영상 그림체 통일)
      const motionPrompt = `${clip.prompt}. Keep the exact same art style, colors, and character design as the input image. Do not change the illustration style or make it photorealistic.`;
      const out = await generateVideo(motionPrompt, {
        seconds: config.introClipSeconds,
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
// 전체 대본을 '한 번의 요청'으로 읽어 하나의 깨끗한 mp3 + 자막을 만든다.
// (챕터별 mp3 를 이어붙이면 플레이어가 첫 조각만 인식하는 문제가 있어 단일 요청 방식 사용)
export async function generateNarration(slug, { voiceId, model, speed, onLog } = {}) {
  const emit = mkEmit(onLog);
  const dir = outDir(slug);
  mkdirSync(join(dir, "audio"), { recursive: true });
  const r = readResult(slug);
  const chunks = (r.pkg?.chapters || []).map((c) => (c.script || "").trim()).filter(Boolean);
  if (!chunks.length) throw new Error("대본이 없습니다. 먼저 콘텐츠(✨생성)를 만들어 주세요.");

  const text = chunks.join("\n\n");
  emit(`전체 음성 생성 중... (${chunks.length}개 챕터, 총 ${text.length}자 · 한 번에)`);
  const { audioB64, alignment } = await ttsWithTimestamps(text, { voiceId, model, speed });
  if (!audioB64) throw new Error("음성 데이터를 받지 못했습니다.");
  writeFileSync(join(dir, "audio", "narration.mp3"), Buffer.from(audioB64, "base64"));
  const lines = buildSegments(alignment);
  writeFileSync(join(dir, "narration.srt"), formatSrt(lines));
  writeFileSync(join(dir, "narration.txt"), text);
  emit(`✓ 전체 음성(audio/narration.mp3) + 자막(narration.srt, ${lines.length}줄) 완료`);
  return { slug, audio: "audio/narration.mp3", srt: "narration.srt", lines: lines.length };
}

// 챕터 1개만 음성+자막 생성 (audio/ch-NN.mp3, chapter-NN.srt)
export async function generateChapterNarration(slug, index, { voiceId, model, speed, onLog } = {}) {
  const emit = mkEmit(onLog);
  const dir = outDir(slug);
  mkdirSync(join(dir, "audio"), { recursive: true });
  const chapters = readResult(slug).pkg?.chapters || [];
  const ch = chapters[index];
  const scriptText = (ch?.script || "").trim();
  if (!scriptText) throw new Error(`${index + 1}번 챕터 대본이 없습니다.`);
  const n = String(index + 1).padStart(2, "0");
  emit(`${index + 1}번 챕터 음성 생성 중... (${scriptText.length}자)`);
  const { audioB64, alignment } = await ttsWithTimestamps(scriptText, { voiceId, model, speed });
  if (!audioB64) throw new Error("음성 데이터를 받지 못했습니다.");
  writeFileSync(join(dir, "audio", `ch-${n}.mp3`), Buffer.from(audioB64, "base64"));
  const lines = buildSegments(alignment);
  writeFileSync(join(dir, `chapter-${n}.srt`), formatSrt(lines));
  emit(`✓ ${index + 1}번 챕터 음성(audio/ch-${n}.mp3) + 자막(chapter-${n}.srt) 완료`);
  return { index, audio: `audio/ch-${n}.mp3`, srt: `chapter-${n}.srt`, lines: lines.length };
}

// output 폴더의 slug 목록 (이전 결과 불러오기용)
export function listOutputs() {
  const base = join(ROOT, "output");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
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
