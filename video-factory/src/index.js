#!/usr/bin/env node
// video-factory CLI
//
//   node src/index.js run   --input benchmark/<name>.md --slug <slug> [--images] [--videos]
//   node src/index.js plan  --input benchmark/<name>.md
//
// run  : 분석 → 대본/메타데이터 → 이미지·인트로 프롬프트 (+옵션 렌더링) 전체 실행
// plan : 벤치마크 분석(주제+목차)만 빠르게 확인
import { requireTextProvider } from "./config.js";
import { runAll, runPlan, readBenchmark } from "./pipeline.js";

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

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    console.log(`video-factory

사용법:
  node src/index.js run  --input benchmark/<name>.md --slug <slug> [--images] [--videos]
  node src/index.js plan --input benchmark/<name>.md

옵션:
  --input   벤치마크 입력 파일(제목/썸네일/설명/자막 메모 등)
  --slug    산출물 폴더명 (output/<slug>/). 생략 시 입력 파일명 사용
  --images  이미지 프롬프트로 실제 이미지까지 생성(API 비용 발생)
  --videos  인트로 프롬프트로 실제 영상까지 생성(API 비용 발생)`);
    process.exit(0);
  }

  if (!args.input) {
    console.error("오류: --input <벤치마크 파일> 가 필요합니다.");
    process.exit(1);
  }
  requireTextProvider();
  const benchmark = readBenchmark(args.input);

  if (cmd === "plan") {
    const analysis = await runPlan(benchmark);
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  if (cmd === "run") {
    const slug = args.slug || slugFromInput(args.input);
    await runAll(slug, benchmark, { generateImages: !!args.images, generateVideos: !!args.videos });
    return;
  }

  console.error(`알 수 없는 명령: ${cmd} (help 참고)`);
  process.exit(1);
}

main().catch((e) => {
  console.error("\n❌ 실패:", e.message);
  process.exit(1);
});
