"use strict";
/* ============================================================
 * 카드뉴스 현지화 — 로컬 실행 서버 (의존성 0, Node 내장 모듈만)
 *
 * 실행하면:
 *   1) 127.0.0.1 로컬 웹서버를 띄우고
 *   2) 기본 브라우저로 웹페이지를 자동으로 연다.
 *
 * 엔드포인트
 *   GET  /                정적 웹 UI (public/)
 *   GET  /config          { hasKey, model }
 *   POST /config          { apiKey?, model? } → config.json 저장
 *   POST /analyze         { cardImage, captionText } → Claude 비전 번역
 *   GET  /img?url=<URL>   원본 이미지 프록시 (캔버스 CORS 오염 방지)
 *
 * API 키는 이 폴더의 config.json 또는 환경변수 ANTHROPIC_API_KEY 에서 읽는다.
 * ============================================================ */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const CONFIG_PATH = path.join(ROOT, "config.json");
const START_PORT = parseInt(process.env.PORT || "8787", 10);
const MOCK = process.env.CARDNEWS_MOCK === "1";

// ---- 설정 로드/저장 ----
function loadConfig() {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch (e) { /* 없음 */ }
  if (!cfg.apiKey && process.env.ANTHROPIC_API_KEY) cfg.apiKey = process.env.ANTHROPIC_API_KEY;
  if (!cfg.model) cfg.model = process.env.CARDNEWS_MODEL || "claude-sonnet-5";
  return cfg;
}
function saveConfig(patch) {
  const cur = (function () { try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch (e) { return {}; } })();
  const next = Object.assign(cur, patch);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

// ---- 응답 헬퍼 ----
function sendJson(res, obj, status) {
  const body = JSON.stringify(obj);
  res.writeHead(status || 200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}
function readBody(req, limitBytes) {
  return new Promise(function (resolve, reject) {
    let size = 0; const chunks = [];
    req.on("data", function (c) {
      size += c.length;
      if (size > (limitBytes || 16 * 1024 * 1024)) { reject(new Error("요청 본문이 너무 큽니다")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon"
};

// ---- 정적 파일 ----
function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end("forbidden"); return; }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

// ---- Claude 응답에서 JSON 추출 ----
function extractJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch (e) { /* */ }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (e2) { return null; } }
  return null;
}
function parseImage(input) {
  if (!input) return null;
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(input);
  if (m) return { media_type: m[1], data: m[2] };
  return { media_type: "image/jpeg", data: input };
}

// ---- Claude 호출 ----
function callClaude(cfg, img, caption) {
  return new Promise(function (resolve, reject) {
    const prompt =
      "You are localizing an English Instagram card-news post into Korean.\n" +
      "The attached image is an English card-news graphic (a photo with a bold headline overlaid).\n\n" +
      "Return ONLY a raw JSON object (no markdown, no code fences) with EXACTLY these keys:\n" +
      '  "headline_en": the main headline text exactly as printed on the image.\n' +
      '  "headline_ko": a natural, punchy Korean translation of that headline, suitable for overlaying on a card-news image. Keep it concise and idiomatic. If it reads better on two lines, insert a single "\\n" where the line should break. No surrounding quotation marks.\n' +
      '  "caption_ko": a natural Korean translation of the caption below. Preserve meaning and tone. Leave URLs, @mentions and #hashtags unchanged.\n\n' +
      "Caption:\n" + (caption || "(none)");

    const payloadStr = JSON.stringify({
      model: cfg.model || "claude-sonnet-5",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
          { type: "text", text: prompt }
        ]
      }]
    });

    const r = https.request({
      hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payloadStr)
      }
    }, function (resp) {
      const parts = [];
      resp.on("data", function (c) { parts.push(c); });
      resp.on("end", function () {
        const raw = Buffer.concat(parts).toString("utf8");
        if (resp.statusCode !== 200) { reject(new Error("Claude API 오류(" + resp.statusCode + "): " + raw.slice(0, 300))); return; }
        try {
          const data = JSON.parse(raw);
          const text = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
          const parsed = extractJson(text);
          if (!parsed) { reject(new Error("번역 결과 파싱 실패")); return; }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    r.on("error", reject);
    r.write(payloadStr);
    r.end();
  });
}

async function handleAnalyze(req, res) {
  let body;
  try { body = JSON.parse((await readBody(req)).toString("utf8")); } catch (e) { return sendJson(res, { ok: false, reason: "잘못된 요청(JSON)" }, 400); }
  const img = parseImage(body.cardImage);
  if (!img) return sendJson(res, { ok: false, reason: "cardImage 없음" }, 400);

  if (MOCK) {
    return sendJson(res, {
      ok: true,
      headline_en: "World's oldest woman smoked, drank wine, ate chocolate daily - lived to 122 and outlived her family.",
      headline_ko: "담배·와인·매일 초콜릿…\n122세까지 산 세계 최고령 여성",
      caption_ko: "잔 칼망은 122년 164일을 살아 역사상 가장 오래 산 것으로 검증된 인물입니다. #ViralFacts #장수기록"
    });
  }

  const cfg = loadConfig();
  if (!cfg.apiKey) return sendJson(res, { ok: false, reason: "API 키가 없습니다. 페이지의 ⚙️ 설정에서 Claude API 키를 저장하세요." }, 400);

  try {
    const parsed = await callClaude(cfg, img, (body.captionText || "").toString().slice(0, 6000));
    sendJson(res, { ok: true, headline_en: parsed.headline_en || "", headline_ko: parsed.headline_ko || "", caption_ko: parsed.caption_ko || "" });
  } catch (e) {
    sendJson(res, { ok: false, reason: e.message }, 502);
  }
}

// ---- 이미지 프록시 (리다이렉트 추적) ----
function fetchUrl(urlStr, res, depth) {
  if (depth > 4) { sendJson(res, { ok: false, reason: "리다이렉트 과다" }, 502); return; }
  let target;
  try { target = new URL(urlStr); } catch (e) { return sendJson(res, { ok: false, reason: "잘못된 url" }, 400); }
  if (target.protocol !== "http:" && target.protocol !== "https:") return sendJson(res, { ok: false, reason: "http/https만 허용" }, 400);
  const lib = target.protocol === "https:" ? https : http;
  const r = lib.get(target, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CardNewsBot/1.0)", "Accept": "image/*,*/*" } }, function (resp) {
    if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
      resp.resume();
      fetchUrl(new URL(resp.headers.location, target).toString(), res, depth + 1);
      return;
    }
    if (resp.statusCode !== 200) { res.writeHead(502); res.end("이미지 응답 오류(" + resp.statusCode + ")"); resp.resume(); return; }
    const ct = resp.headers["content-type"] || "";
    if (ct && ct.indexOf("image/") !== 0) { res.writeHead(415); res.end("이미지가 아님(" + ct + ")"); resp.resume(); return; }
    res.writeHead(200, { "Content-Type": ct || "image/jpeg", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" });
    resp.pipe(res);
  });
  r.on("error", function (e) { res.writeHead(502); res.end("이미지 fetch 실패: " + e.message); });
}

// ---- 라우팅 ----
const server = http.createServer(async function (req, res) {
  const u = req.url.split("?")[0];
  try {
    if (u === "/config" && req.method === "GET") {
      const cfg = loadConfig();
      return sendJson(res, { ok: true, hasKey: !!cfg.apiKey, model: cfg.model });
    }
    if (u === "/config" && req.method === "POST") {
      let body;
      try { body = JSON.parse((await readBody(req)).toString("utf8")); } catch (e) { return sendJson(res, { ok: false, reason: "잘못된 요청" }, 400); }
      const patch = {};
      if (typeof body.apiKey === "string" && body.apiKey.trim()) patch.apiKey = body.apiKey.trim();
      if (typeof body.model === "string" && body.model.trim()) patch.model = body.model.trim();
      const next = saveConfig(patch);
      return sendJson(res, { ok: true, hasKey: !!next.apiKey, model: next.model });
    }
    if (u === "/analyze" && req.method === "POST") return handleAnalyze(req, res);
    if (u === "/img" && req.method === "GET") {
      const url = new URL(req.url, "http://localhost").searchParams.get("url");
      if (!url) return sendJson(res, { ok: false, reason: "url 없음" }, 400);
      return fetchUrl(url, res, 0);
    }
    return serveStatic(req, res);
  } catch (e) {
    sendJson(res, { ok: false, reason: e.message }, 500);
  }
});

// ---- 포트 확보 후 시작 + 브라우저 열기 ----
function openBrowser(url) {
  const cmd = process.platform === "win32" ? 'start "" "' + url + '"'
    : process.platform === "darwin" ? 'open "' + url + '"'
      : 'xdg-open "' + url + '"';
  exec(cmd, function () { /* 실패해도 무시 (URL은 콘솔에 출력됨) */ });
}
function listen(port, triesLeft) {
  server.once("error", function (e) {
    if (e.code === "EADDRINUSE" && triesLeft > 0) { listen(port + 1, triesLeft - 1); }
    else { console.error("서버 시작 실패:", e.message); process.exit(1); }
  });
  server.listen(port, "127.0.0.1", function () {
    const url = "http://127.0.0.1:" + port + "/";
    const cfg = loadConfig();
    console.log("\n  카드뉴스 현지화 도구가 실행되었습니다.");
    console.log("  주소: " + url);
    console.log("  API 키: " + (cfg.apiKey ? "설정됨" : "미설정 (페이지 ⚙️ 설정에서 입력)"));
    console.log("  모델: " + cfg.model);
    console.log("  종료하려면 이 창에서 Ctrl+C\n");
    if (process.env.CARDNEWS_NO_OPEN !== "1") openBrowser(url);
  });
}
listen(START_PORT, 10);
