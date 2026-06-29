#!/usr/bin/env node
// video-factory CLI
//
//   node src/index.js run  --url <youtube-url> [--slug <slug>] [--images] [--videos]
//   node src/index.js run  --input benchmark/<name>.md --slug <slug> [--images] [--videos]
//   node src/index.js plan --url <youtube-url>
//   node src/index.js fetch --url <youtube-url>      # 자막만 받아서 benchmark/<id>.md 로 저장
//
// --url   : 유튜브 자막을 yt-dlp 로 자동 수집(외부망 + yt-dlp 필요)
// --input : 자막을 직접 붙여넣은 벤치마크 파일 사용(자동 수집이 막힌 환경용)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, ROOT, requireTextProvider } from "./config.js";
import { runAll, runPlan, readBenchmark } from "./pipeline.js";
import { fetchTranscript, toBenchmarkMd, youtubeId } from "./transcript.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--images") args.images = true;
    else if (a === "--videos") args.videos = true;
    else if (a.startsWith("--")) args[a.slice(2)] = argv[++i];
    else args._.push(a);
  }
  return args;
}

function slugFromInput(path) {
  return path.split("/").pop().replace(/\.[^.]+$/, "");
}

// --url 또는 --input 에서 { benchmark 텍스트, slug } 를 만든다.
function resolveInput(args) {
  if (args.url) {
    const langs = (args.lang || "ko,ko-orig,en").split(",").map((s) => s.trim());
    console.log("• 유튜브 자막 수집 중(yt-dlp)...");
    const result = fetchTranscript(args.url, { langs });
    const md = toBenchmarkMd(args.url, result);
    mkdirSync(join(ROOT, "benchmark"), { recursive: true });
    const file = join(ROOT, "benchmark", `${result.id}.md`);
    writeFileSync(file, md);
    console.log(`• 자막 저장: benchmark/${result.id}.md (언어: ${result.lang}, ${result.text.length}자)`);
    return { benchmark: md, slug: args.slug || youtubeId(args.url) || result.id };
  }
  if (args.input) {
    return { benchmark: readBenchmark(args.input), slug: args.slug || slugFromInput(args.input) };
  }
  return null;
}

const HELP = `video-factory

사용법:
  node src/index.js run   --url <youtube-url> [--slug <slug>] [--images] [--videos]
  node src/index.js run   --input benchmark/<name>.md --slug <slug> [--images] [--videos]
  node src/index.js plan  --url <youtube-url> | --input <file>
  node src/index.js fetch --url <youtube-url>

옵션:
  --url     벤치마크 유튜브 URL (yt-dlp 로 자막 자동 수집; 외부망+yt-dlp 필요)
  --input   자막을 직접 붙여넣은 벤치마크 파일
  --lang    자막 우선순위 (기본: ko,ko-orig,en)
  --slug    산출물 폴더명 (output/<slug>/)
  --images  이미지 프롬프트로 실제 이미지까지 생성(API 비용 발생)
  --videos  인트로 프롬프트로 실제 영상까지 생성(API 비용 발생)`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    console.log(HELP);
    process.exit(0);
  }

  // fetch: 자막만 수집해서 저장(LLM 불필요)
  if (cmd === "fetch") {
    if (!args.url) return fail("fetch 에는 --url 이 필요합니다.");
    const langs = (args.lang || "ko,ko-orig,en").split(",").map((s) => s.trim());
    const result = fetchTranscript(args.url, { langs });
    mkdirSync(join(ROOT, "benchmark"), { recursive: true });
    const file = join(ROOT, "benchmark", `${result.id}.md`);
    writeFileSync(file, toBenchmarkMd(args.url, result));
    console.log(`✅ 자막 저장: benchmark/${result.id}.md (언어: ${result.lang}, ${result.text.length}자)`);
    return;
  }

  const resolved = resolveInput(args);
  if (!resolved) return fail("--url 또는 --input 중 하나가 필요합니다. (help 참고)");

  requireTextProvider();

  if (cmd === "plan") {
    const analysis = await runPlan(resolved.benchmark);
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }
  if (cmd === "run") {
    await runAll(resolved.slug, resolved.benchmark, {
      generateImages: !!args.images,
      generateVideos: !!args.videos,
    });
    return;
  }
  fail(`알 수 없는 명령: ${cmd} (help 참고)`);
}

function fail(msg) {
  console.error("오류:", msg);
  process.exit(1);
}

main().catch((e) => {
  console.error("\n❌ 실패:", e.message);
  process.exit(1);
});
