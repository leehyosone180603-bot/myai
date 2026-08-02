// 간편 영상 제작기(maker) E2E — mock xAI/ElevenLabs + 가짜 ffmpeg. 비용 0.
import { createServer } from "node:http";
import { rmSync, existsSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "__maker__";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const MP3 = Buffer.from("MOCK-MP3").toString("base64");
const readJson = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d ? JSON.parse(d) : {})); });
const sendJson = (res, o) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };

const mock = createServer(async (req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (p === "/v1/chat/completions") {
    await readJson(req);
    const content = { character: "a Korean man in his 30s, short black hair, navy shirt", scenes: Array.from({ length: 10 }, (_, i) => `scene ${i + 1}: man at a place`) };
    return sendJson(res, { choices: [{ message: { content: JSON.stringify(content) } }] });
  }
  if (p === "/v1/images/generations") { await readJson(req); return sendJson(res, { data: [{ b64_json: PNG }] }); }
  if (p.startsWith("/el/text-to-speech/")) {
    const b = await readJson(req); const chars = [...(b.text || "안녕")];
    return sendJson(res, { audio_base64: MP3, alignment: { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.2), character_end_times_seconds: chars.map((_, i) => i * 0.2 + 0.2) } });
  }
  res.writeHead(404); res.end();
});

function ok(c, m) { console.log(`${c ? "✅" : "❌"} ${m}`); if (!c) process.exitCode = 1; }

await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const PORT = mock.address().port;

// 가짜 ffmpeg: slides.txt 있으면 final.mp4 생성
const fake = join(ROOT, "test", "fake-ffmpeg.sh");
writeFileSync(fake, `#!/bin/bash
# -version 이면 통과, 아니면 cwd 에 final.mp4 생성
if [ "$1" = "-version" ]; then echo "ffmpeg mock"; exit 0; fi
echo "MOCK-VIDEO" > final.mp4
exit 0
`);
chmodSync(fake, 0o755);

Object.assign(process.env, {
  TEXT_PROVIDER: "xai", XAI_API_KEY: "k", XAI_BASE_URL: `http://127.0.0.1:${PORT}/v1`, XAI_IMAGE_MODEL: "img",
  ELEVENLABS_API_KEY: "k", ELEVENLABS_BASE_URL: `http://127.0.0.1:${PORT}/el`, ELEVENLABS_VOICE_ID: "v", ELEVENLABS_MODEL: "m",
  FFMPEG_PATH: fake,
});
rmSync(join(ROOT, "output", SLUG), { recursive: true, force: true });

const { makerRun } = await import("../src/maker.js");
console.log("\n── maker 실행: AI 자동 프롬프트 (mock) ──");
const r = await makerRun(SLUG, "첫 문장입니다. 두 번째 문장이에요. 세 번째.", { imageCount: 10, speed: 1.1, onLog: (m) => console.log("  ·", m) });

const dir = join(ROOT, "output", SLUG);
console.log("\n── 검증(자동) ──");
for (const f of ["audio/narration.mp3", "narration.srt", "images/img-01.png", "images/img-10.png"]) {
  const ex = existsSync(join(dir, f)) && statSync(join(dir, f)).size > 0;
  ok(ex, `${f} ${ex ? "(" + statSync(join(dir, f)).size + "B)" : "없음"}`);
}
ok(!existsSync(join(dir, "final.mp4")), "영상 합치기 안 함 (final.mp4 없음)");
ok(Array.isArray(r.images) && r.images.length === 10, `이미지 10장 (${r.images.length})`);
ok(r.video === undefined, "결과에 video 없음");

// 사용자 프롬프트 모드: 줄 수 = 이미지 수
console.log("\n── maker 실행: 사용자 프롬프트 3줄 (mock) ──");
rmSync(dir, { recursive: true, force: true });
const r2 = await makerRun(SLUG, "짧은 대본.", { prompts: ["a man walking", "a man at cafe", "  ", "a man at park"], onLog: () => {} });
ok(r2.images.length === 3, `빈 줄 제외 3장 (${r2.images.length})`);
ok(existsSync(join(dir, "images/img-03.png")) && !existsSync(join(dir, "images/img-04.png")), "img-03 있고 img-04 없음");

// ZIP 생성 확인
const { zipStore } = await import("../src/zip.js");
const zbuf = zipStore([{ name: "a.png", data: Buffer.from("hello") }, { name: "b.png", data: Buffer.from("world!!") }]);
ok(zbuf.slice(0, 4).toString("hex") === "504b0304", "ZIP 시그니처(PK\\x03\\x04)");
ok(zbuf.slice(-22, -18).toString("hex") === "504b0506", "ZIP EOCD 시그니처");

rmSync(dir, { recursive: true, force: true });
rmSync(fake, { force: true });
mock.close();
console.log(`\n${process.exitCode ? "❌ 실패" : "✅ maker 통과"}`);
