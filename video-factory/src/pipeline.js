// 파이프라인 오케스트레이션: 벤치마크 → 분석 → 콘텐츠 → 이미지/인트로 프롬프트 → (옵션) 렌더링.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config, ROOT } from "./config.js";
import { generateJson, generateImage, generateVideo } from "./clients.js";
import * as P from "./prompts.js";

const log = (...a) => console.log("•", ...a);

function outDir(slug) {
  const dir = join(ROOT, "output", slug);
  mkdirSync(join(dir, "images"), { recursive: true });
  mkdirSync(join(dir, "intro"), { recursive: true });
  return dir;
}

const writeJson = (dir, name, data) =>
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n");

// 콘텐츠 패키지를 사람이 읽기 좋은 마크다운으로 변환
function packageToMarkdown(analysis, pkg) {
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

export async function runPlan(benchmarkText) {
  log("벤치마크 분석 중...");
  return generateJson({ system: P.analyzeSystem, user: P.analyzePrompt(benchmarkText) });
}

export async function runAll(slug, benchmarkText, { generateImages = false, generateVideos = false } = {}) {
  const dir = outDir(slug);

  const analysis = await runPlan(benchmarkText);
  writeJson(dir, "01-analysis.json", analysis);
  log("분석 완료 → 01-analysis.json");

  log("업그레이드 대본/메타데이터 생성 중...");
  const pkg = await generateJson({ system: P.writeSystem, user: P.writePrompt(analysis), maxTokens: 8000 });
  writeJson(dir, "02-content-package.json", pkg);
  writeFileSync(join(dir, "content.md"), packageToMarkdown(analysis, pkg));
  log("콘텐츠 완료 → content.md, 02-content-package.json");

  log("이미지 프롬프트 생성 중...");
  const images = await generateJson({ system: P.imageSystem, user: P.imagePrompt(pkg) });
  writeJson(dir, "03-image-prompts.json", images);
  log(`이미지 프롬프트 ${images.images?.length ?? 0}장 → 03-image-prompts.json`);

  log("인트로 영상 프롬프트 생성 중...");
  const intro = await generateJson({ system: P.introSystem, user: P.introPrompt(pkg) });
  writeJson(dir, "04-intro-prompts.json", intro);
  log(`인트로 클립 ${intro.clips?.length ?? 0}개 → 04-intro-prompts.json`);

  if (generateImages) await renderImages(dir, images);
  if (generateVideos) await renderVideos(dir, intro, images);

  log(`\n✅ 완료. 산출물: output/${slug}/`);
  return { analysis, pkg, images, intro };
}

export async function renderImages(dir, images) {
  const list = images.images || [];
  for (const img of list) {
    log(`이미지 생성: ${img.id}`);
    try {
      const full = `${img.prompt} ${images.style_token || ""}`.trim();
      const out = await generateImage(full);
      if (out.b64) {
        writeFileSync(join(dir, "images", `${img.id}.png`), Buffer.from(out.b64, "base64"));
      } else if (out.url) {
        const buf = Buffer.from(await (await fetch(out.url)).arrayBuffer());
        writeFileSync(join(dir, "images", `${img.id}.png`), buf);
      }
    } catch (e) {
      console.error(`  ⚠ ${img.id} 실패:`, e.message);
    }
  }
}

export async function renderVideos(dir, intro, images) {
  const imgB64 = {}; // from_image_id 연결용(이미지가 먼저 생성돼 있으면 image-to-video)
  for (const clip of intro.clips || []) {
    log(`인트로 영상 생성: ${clip.id}`);
    try {
      const out = await generateVideo(clip.prompt, {
        seconds: config.introClipSeconds,
        aspectRatio: config.videoAspectRatio,
        imageB64: clip.from_image_id ? imgB64[clip.from_image_id] : undefined,
      });
      if (out.url) {
        const buf = Buffer.from(await (await fetch(out.url)).arrayBuffer());
        writeFileSync(join(dir, "intro", `${clip.id}.mp4`), buf);
      } else {
        writeJson(dir, `intro/${clip.id}.raw.json`, out);
      }
    } catch (e) {
      console.error(`  ⚠ ${clip.id} 실패:`, e.message);
    }
  }
}

export function readBenchmark(path) {
  return readFileSync(path, "utf8");
}
