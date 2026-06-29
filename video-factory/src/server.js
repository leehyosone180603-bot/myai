#!/usr/bin/env node
// video-factory UI 서버.  의존성 0 (Node 내장 http).
// 브라우저에서 클릭만으로 자막 수집 → 대본/메타데이터/이미지·인트로 프롬프트 생성 → 미디어 렌더링.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { config, ROOT, saveEnv, requireTextProvider } from "./config.js";
import { runAll, renderImages, renderVideos, readResult, outDir, generateNarration } from "./pipeline.js";
import { fetchTranscript, toBenchmarkMd, youtubeId } from "./transcript.js";
import { listModels, listVoices } from "./clients.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIR = join(ROOT, "ui");
const PORT = Number(process.env.PORT || 4399);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".srt": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.writeHead(code, { "Content-Type": type });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

// 폴더명으로 안전한 slug (윈도우 금지문자 제거, 끝 마침표/공백 제거, 공백→하이픈)
function sanitizeSlug(s) {
  return (
    String(s || "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 80) || "video"
  );
}

const readBody = (req) =>
  new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch {
        resolve({});
      }
    });
  });

function health() {
  const p = config.textProvider;
  const key = { xai: config.xai.apiKey, openai: config.openai.apiKey, anthropic: config.anthropic.apiKey }[p];
  return {
    provider: p,
    hasKey: !!key,
    models: {
      text: config[p]?.textModel,
      image: config.xai.imageModel,
      video: config.xai.videoModel,
    },
    channelName: config.channelName,
    channelPersona: config.channelPersona,
    targetMinutes: config.targetMinutes,
    imageStyle: config.imageStyle,
    tts: {
      hasKey: !!config.elevenlabs.apiKey,
      model: config.elevenlabs.model,
      voiceId: config.elevenlabs.voiceId,
    },
  };
}

// 스트리밍(ndjson) 시작
function startStream(res) {
  res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" });
  return (obj) => res.write(JSON.stringify(obj) + "\n");
}

function serveStatic(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return send(res, 404, "Not found", "text/plain");
  const ext = filePath.slice(filePath.lastIndexOf("."));
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  try {
    // ── 정적: UI ──
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      return serveStatic(res, join(UI_DIR, "index.html"));
    }
    // ── 정적: 생성된 미디어 미리보기 ──
    if (req.method === "GET" && path.startsWith("/output/")) {
      const rel = normalize(decodeURIComponent(path.replace(/^\/output\//, "")));
      if (rel.includes("..")) return send(res, 400, "bad path", "text/plain");
      return serveStatic(res, join(ROOT, "output", rel));
    }

    // ── API ──
    if (path === "/api/health" && req.method === "GET") return send(res, 200, health());

    if (path === "/api/settings" && req.method === "POST") {
      const b = await readBody(req);
      const map = {};
      if (b.provider) map.TEXT_PROVIDER = b.provider;
      if (b.apiKey) {
        if ((b.provider || config.textProvider) === "xai") map.XAI_API_KEY = b.apiKey;
        else if (b.provider === "openai") map.OPENAI_API_KEY = b.apiKey;
        else if (b.provider === "anthropic") map.ANTHROPIC_API_KEY = b.apiKey;
      }
      if (b.textModel) map[`${(b.provider || config.textProvider).toUpperCase()}_TEXT_MODEL`] = b.textModel;
      if (b.imageModel) map.XAI_IMAGE_MODEL = b.imageModel;
      if (b.videoModel) map.XAI_VIDEO_MODEL = b.videoModel;
      if (b.channelName) map.CHANNEL_NAME = b.channelName;
      if (b.channelPersona) map.CHANNEL_PERSONA = b.channelPersona;
      if (b.targetMinutes) map.TARGET_MINUTES = String(b.targetMinutes);
      if (b.imageStyle !== undefined) map.IMAGE_STYLE = b.imageStyle;
      if (b.elevenKey) map.ELEVENLABS_API_KEY = b.elevenKey;
      if (b.voiceId) map.ELEVENLABS_VOICE_ID = b.voiceId;
      if (b.ttsModel) map.ELEVENLABS_MODEL = b.ttsModel;
      if (Object.keys(map).length) saveEnv(map);
      return send(res, 200, health());
    }

    if (path === "/api/models" && req.method === "GET") {
      try {
        const models = await listModels();
        return send(res, 200, { models });
      } catch (e) {
        return send(res, 200, { models: [], error: e.message });
      }
    }

    if (path === "/api/voices" && req.method === "GET") {
      try {
        return send(res, 200, { voices: await listVoices() });
      } catch (e) {
        return send(res, 200, { voices: [], error: e.message });
      }
    }

    if (path === "/api/tts" && req.method === "POST") {
      const b = await readBody(req);
      const emit = startStream(res);
      try {
        if (!config.elevenlabs.apiKey) throw new Error("ElevenLabs API 키가 없습니다. ⚙️설정에서 입력하세요.");
        const slug = sanitizeSlug(b.slug?.trim());
        if (!slug) throw new Error("slug 가 필요합니다.");
        const result = await generateNarration(slug, { onLog: (msg) => emit({ type: "log", msg }) });
        emit({ type: "done", result });
      } catch (e) {
        emit({ type: "error", msg: e.message });
      }
      return res.end();
    }

    if (path === "/api/fetch" && req.method === "POST") {
      const b = await readBody(req);
      if (!b.url) return send(res, 400, { error: "url 이 필요합니다." });
      try {
        const langs = (b.lang || "ko,ko-orig,en").split(",").map((s) => s.trim());
        const r = fetchTranscript(b.url, { langs });
        return send(res, 200, { id: r.id, lang: r.lang, text: r.text });
      } catch (e) {
        return send(res, 200, { error: e.message });
      }
    }

    if (path === "/api/result" && req.method === "GET") {
      const slug = sanitizeSlug(url.searchParams.get("slug"));
      if (!slug) return send(res, 400, { error: "slug 필요" });
      return send(res, 200, readResult(slug));
    }

    if (path === "/api/run" && req.method === "POST") {
      const b = await readBody(req);
      const emit = startStream(res);
      try {
        requireTextProvider();
        if (!b.benchmark || !b.benchmark.trim()) throw new Error("대본/벤치마크 내용이 비어 있습니다.");
        const slug = sanitizeSlug(b.slug?.trim() || youtubeId(b.benchmark) || "video");
        const result = await runAll(slug, b.benchmark, {
          generateImages: !!b.images,
          generateVideos: !!b.videos,
          onLog: (msg) => emit({ type: "log", msg }),
        });
        emit({ type: "done", result });
      } catch (e) {
        emit({ type: "error", msg: e.message });
      }
      return res.end();
    }

    if (path === "/api/render" && req.method === "POST") {
      const b = await readBody(req);
      const emit = startStream(res);
      try {
        requireTextProvider();
        const slug = sanitizeSlug(b.slug?.trim());
        if (!slug) throw new Error("slug 가 필요합니다.");
        const r = readResult(slug);
        const dir = outDir(slug);
        const out = {};
        if (b.images && r.images) out.images = await renderImages(dir, r.images, (msg) => emit({ type: "log", msg }));
        if (b.videos && r.intro) out.videos = await renderVideos(dir, r.intro, r.images, (msg) => emit({ type: "log", msg }));
        emit({ type: "done", result: out });
      } catch (e) {
        emit({ type: "error", msg: e.message });
      }
      return res.end();
    }

    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
});

// 포트가 이미 쓰이고 있으면(이전 창이 켜져 있는 경우 등) 다음 포트로 자동 이동.
let port = PORT;
function listen() {
  server.listen(port, "127.0.0.1");
}
server.on("listening", () => {
  const link = `http://localhost:${port}`;
  console.log(`\n  video-factory UI is running`);
  console.log(`  Open in your browser ->  ${link}\n`);
  tryOpen(link);
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < PORT + 15) {
    console.log(`  port ${port} busy, trying ${port + 1} ...`);
    port += 1;
    setTimeout(listen, 200);
  } else {
    console.error("server error:", e.message);
    process.exit(1);
  }
});
listen();

// OS별 브라우저 자동 열기 (실패해도 무시)
function tryOpen(link) {
  import("node:child_process").then(({ spawn }) => {
    const cmd =
      process.platform === "win32" ? ["cmd", ["/c", "start", "", link]]
      : process.platform === "darwin" ? ["open", [link]]
      : ["xdg-open", [link]];
    try {
      spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).on("error", () => {});
    } catch {}
  });
}
