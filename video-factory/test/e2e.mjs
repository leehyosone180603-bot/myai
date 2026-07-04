// 돈 안 쓰는 정확한 E2E 테스트.
// xAI(chat/image/video) + ElevenLabs(voices/tts) API 를 똑같은 모양으로 흉내내는
// 로컬 mock 서버를 띄우고, 실제 파이프라인을 끝까지 돌려서:
//   (1) 우리 코드가 보내는 '요청'이 공식 스펙과 맞는지
//   (2) '응답' 파싱과 파일 생성이 다 되는지
// 를 검증한다.  실행:  node test/e2e.mjs
import { createServer } from "node:http";
import { rmSync, existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "__e2e__";
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const MP3_B64 = Buffer.from("MOCK-MP3-AUDIO").toString("base64");
const captured = []; // 캡처한 요청들

function readJson(req) {
  return new Promise((r) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => r(d ? JSON.parse(d) : {}));
  });
}
const sendJson = (res, obj) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

// ── mock API 서버 ──
const mock = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;

  if (path === "/fake.mp4") {
    res.writeHead(200, { "Content-Type": "video/mp4" });
    return res.end(Buffer.from("MOCK-MP4-VIDEO"));
  }

  // xAI chat completions — system 프롬프트로 어떤 단계인지 판별해 알맞은 JSON 반환
  if (path === "/v1/chat/completions") {
    const body = await readJson(req);
    captured.push({ ep: "chat", model: body.model, system: (body.messages?.[0]?.content || "").slice(0, 24) });
    const sys = body.messages?.[0]?.content || "";
    let content;
    if (sys.includes("콘텐츠 전략가")) {
      content = { topic: "테스트 주제", outline: [{ section: "s", beats: ["b"] }], weaknesses: ["w"] };
    } else if (sys.includes("대본 작가")) {
      content = {
        video_title_options: ["제목A", "제목B", "제목C"],
        thumbnail_title: "썸네일\n문구",
        thumbnail_subtext: "보조",
        description: "설명글 #태그",
        chapters: [
          { timecode: "0:00", title: "후킹", script: "첫 문장입니다. 두 번째 문장이에요." },
          { timecode: "0:30", title: "본론", script: "본론 내용입니다. 충분히 설득합니다." },
        ],
        one_line_summary: "요약",
        cta: "구독",
      };
    } else if (sys.includes("아트 디렉터")) {
      content = {
        style_token: "soft flat illustration",
        cast: { man: "a Korean man in his 30s, short black hair", woman: "" },
        images: [
          { id: "img-01", chapter: "후킹", ko_desc: "장면1", prompt: "scene one" },
          { id: "img-02", chapter: "본론", ko_desc: "장면2", prompt: "scene two" },
        ],
      };
    } else if (sys.includes("인트로")) {
      content = {
        clips: [
          { id: "intro-01", ko_desc: "클립1", prompt: "clip one", from_image_id: "img-01" },
          { id: "intro-02", ko_desc: "클립2", prompt: "clip two", from_image_id: null },
        ],
      };
    } else {
      content = {};
    }
    return sendJson(res, { choices: [{ message: { content: JSON.stringify(content) } }] });
  }

  // xAI image generation
  if (path === "/v1/images/generations") {
    const body = await readJson(req);
    captured.push({ ep: "image", model: body.model, hasPrompt: !!body.prompt });
    return sendJson(res, { data: [{ b64_json: PNG_1x1 }] });
  }

  // xAI video generation (image-to-video) — 비동기: request_id 발급
  if (path === "/v1/videos/generations") {
    const body = await readJson(req);
    captured.push({
      ep: "video",
      model: body.model,
      imageIsObject: typeof body.image === "object",
      imageUrlPrefix: (body.image?.url || "").slice(0, 22),
      duration: body.duration,
    });
    return sendJson(res, { request_id: "vidjob-1" });
  }
  // 폴링: GET /v1/videos/{request_id} → done + url
  if (path === "/v1/videos/vidjob-1") {
    captured.push({ ep: "video-poll" });
    return sendJson(res, { status: "done", url: "http://127.0.0.1:" + PORT + "/fake.mp4" });
  }

  // ElevenLabs voices
  if (path === "/el/voices") {
    return sendJson(res, { voices: [{ voice_id: "voice-test", name: "테스트보이스", labels: { language: "ko" } }] });
  }
  // ElevenLabs TTS with timestamps — 텍스트로 alignment 생성
  if (path.startsWith("/el/text-to-speech/")) {
    const body = await readJson(req);
    const text = body.text || "";
    const chars = [...text];
    const st = chars.map((_, i) => i * 0.1);
    const en = chars.map((_, i) => i * 0.1 + 0.1);
    captured.push({ ep: "tts", model: body.model_id, voicePath: path.split("/")[3], textLen: text.length });
    return sendJson(res, {
      audio_base64: MP3_B64,
      alignment: { characters: chars, character_start_times_seconds: st, character_end_times_seconds: en },
    });
  }

  res.writeHead(404);
  res.end("nope");
});

let PORT;
function ok(c, m) {
  console.log(`${c ? "✅" : "❌"} ${m}`);
  if (!c) process.exitCode = 1;
}

await new Promise((r) => mock.listen(0, "127.0.0.1", r));
PORT = mock.address().port;

// 앱이 mock 을 보도록 환경변수 설정 (config import 전에!)
const base = `http://127.0.0.1:${PORT}`;
Object.assign(process.env, {
  TEXT_PROVIDER: "xai",
  XAI_API_KEY: "test-key",
  XAI_BASE_URL: `${base}/v1`,
  XAI_TEXT_MODEL: "grok-test",
  XAI_IMAGE_MODEL: "img-test",
  XAI_VIDEO_MODEL: "vid-test",
  ELEVENLABS_API_KEY: "test-key",
  ELEVENLABS_BASE_URL: `${base}/el`,
  ELEVENLABS_MODEL: "eleven-test",
  ELEVENLABS_VOICE_ID: "voice-test",
  TARGET_MINUTES: "1",
});

rmSync(join(ROOT, "output", SLUG), { recursive: true, force: true });

const { runAll, generateNarration } = await import("../src/pipeline.js");

console.log("\n── 파이프라인 전체 실행 (mock API) ──");
const result = await runAll(SLUG, "테스트 벤치마크 자막입니다.", {
  generateImages: true,
  generateVideos: true,
  onLog: (m) => console.log("  ·", m),
});
console.log("── 음성+자막 생성 ──");
const tts = await generateNarration(SLUG, { onLog: (m) => console.log("  ·", m) });

// ── 검증 ──
console.log("\n── 산출물 파일 검증 ──");
const dir = join(ROOT, "output", SLUG);
const need = [
  "01-analysis.json",
  "02-content-package.json",
  "content.md",
  "03-image-prompts.json",
  "04-intro-prompts.json",
  "images/img-01.png",
  "intro/intro-01.mp4",
  "audio/narration.mp3",
  "narration.srt",
  "narration.txt",
];
for (const f of need) {
  const p = join(dir, f);
  const exists = existsSync(p) && statSync(p).size > 0;
  ok(exists, `${f} ${exists ? "(" + statSync(p).size + "B)" : "없음/빈파일"}`);
}

console.log("\n── 요청 형식 검증 (공식 스펙 일치 여부) ──");
const chatCalls = captured.filter((c) => c.ep === "chat");
ok(chatCalls.length === 4, `chat/completions 4회 호출 (분석·대본·이미지·인트로) → 실제 ${chatCalls.length}회`);
ok(chatCalls.every((c) => c.model === "grok-test"), "chat 모델명이 설정값(grok-test)으로 전달됨");
const vid = captured.find((c) => c.ep === "video");
ok(vid?.imageIsObject, "video 요청의 image 가 객체({url}) 형식");
ok(vid?.imageUrlPrefix.startsWith("data:image/png;base64"), `video image.url 이 data URI (${vid?.imageUrlPrefix}...)`);
ok(vid?.model === "vid-test", "video 모델명 전달됨");
ok(captured.some((c) => c.ep === "video-poll"), "video 폴링이 GET /videos/{request_id} 로 감 (폴링 경로 검증)");
const img = captured.find((c) => c.ep === "image");
ok(img?.model === "img-test" && img?.hasPrompt, "image 요청에 모델명+프롬프트 포함");
const tcall = captured.find((c) => c.ep === "tts");
ok(tcall?.voicePath === "voice-test", "TTS 요청이 선택 보이스 경로로 감");
ok(tcall?.model === "eleven-test", "TTS 모델명 전달됨");

console.log("\n── 자막(SRT) 내용 확인 ──");
const srt = readFileSync(join(dir, "narration.srt"), "utf8");
ok(/\d\d:\d\d:\d\d,\d\d\d --> \d\d:\d\d:\d\d,\d\d\d/.test(srt), "SRT 타임코드 형식 정상");
console.log(srt.split("\n").slice(0, 8).join("\n"));

console.log("\n── content.md 미리보기 ──");
console.log(readFileSync(join(dir, "content.md"), "utf8").split("\n").slice(0, 10).join("\n"));

rmSync(dir, { recursive: true, force: true });
mock.close();
console.log(`\n${process.exitCode ? "❌ 일부 실패" : "✅ 모든 테스트 통과"} (임시 산출물 정리 완료)`);
