#!/usr/bin/env node
/*
 * 인스타그램 인기 콘텐츠 정렬기 — 로컬 GUI 서버
 * ----------------------------------------------------------------
 * 브라우저에서 열리는 조작 화면(ui.html)을 제공하고,
 * "분석 시작"을 누르면 insta-top.js 의 runAnalysis() 를 실행해
 * 진행 상황을 실시간(SSE)으로 보내고 결과(JSON)를 돌려줍니다.
 *
 * 실행:  node server.js   (보통은 실행.bat / 실행.command 가 대신 띄웁니다)
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { runAnalysis, hasSession, clearSession } = require("./insta-top.js");

const HOST = "127.0.0.1";
const START_PORT = Number(process.env.PORT) || 8787;
const UI_PATH = path.join(__dirname, "ui.html");
const SAVE_DIR = path.join(__dirname, "saved"); // 저장된 분석 결과 폴더

let busy = false; // 동시에 하나만 분석

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function sendJson(res, code, obj) {
  send(res, code, "application/json; charset=utf-8", JSON.stringify(obj));
}

// 요청 본문(JSON) 읽기 — 최대 20MB
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 20 * 1024 * 1024) { reject(new Error("본문이 너무 큽니다.")); req.destroy(); return; }
      data += c;
    });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error("JSON 파싱 실패")); } });
    req.on("error", reject);
  });
}

function ensureSaveDir() { try { fs.mkdirSync(SAVE_DIR, { recursive: true }); } catch (e) {} }
function safeName(s) { return String(s || "").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 40); }

// 저장 파일 목록(메타만) — 최신순
function listSaved() {
  ensureSaveDir();
  let files = [];
  try { files = fs.readdirSync(SAVE_DIR).filter((f) => f.endsWith(".json")); } catch (e) { return []; }
  const out = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(SAVE_DIR, f), "utf8"));
      out.push({
        id: f.replace(/\.json$/, ""),
        username: (j.meta && j.meta.username) || "",
        fullName: (j.meta && j.meta.fullName) || "",
        savedAt: j.savedAt || "",
        count: (j.posts && j.posts.length) || 0,
        sortBy: j.sortBy || "likes",
      });
    } catch (e) { /* 손상 파일 건너뜀 */ }
  }
  out.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  return out;
}

function sse(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  return (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  // 홈 — UI
  if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/index.html")) {
    fs.readFile(UI_PATH, (err, buf) => {
      if (err) return send(res, 500, "text/plain; charset=utf-8", "ui.html 을 찾을 수 없습니다.");
      send(res, 200, "text/html; charset=utf-8", buf);
    });
    return;
  }

  // 로그인 세션 초기화
  if (req.method === "POST" && u.pathname === "/api/logout") {
    clearSession();
    return send(res, 200, "application/json", JSON.stringify({ ok: true }));
  }

  // 현재 상태
  if (req.method === "GET" && u.pathname === "/api/status") {
    return send(res, 200, "application/json", JSON.stringify({ hasSession: hasSession(), busy }));
  }

  // 저장된 목록
  if (req.method === "GET" && u.pathname === "/api/saved") {
    return sendJson(res, 200, { items: listSaved() });
  }

  // 저장된 항목 하나 불러오기
  if (req.method === "GET" && u.pathname === "/api/saved/get") {
    const id = safeName(u.searchParams.get("id") || "");
    const file = path.join(SAVE_DIR, id + ".json");
    if (!id || !fs.existsSync(file)) return sendJson(res, 404, { error: "저장된 항목을 찾을 수 없습니다." });
    try { return sendJson(res, 200, JSON.parse(fs.readFileSync(file, "utf8"))); }
    catch (e) { return sendJson(res, 500, { error: "파일을 읽지 못했습니다." }); }
  }

  // 결과 저장
  if (req.method === "POST" && u.pathname === "/api/save") {
    try {
      const body = await readBody(req);
      if (!body || !Array.isArray(body.posts) || !body.posts.length) {
        return sendJson(res, 400, { error: "저장할 데이터가 없습니다." });
      }
      ensureSaveDir();
      const savedAt = new Date().toISOString();
      const stampId = savedAt.replace(/[:.]/g, "-");
      const user = safeName((body.meta && body.meta.username) || "profile");
      const id = `${stampId}__${user}`;
      const record = { savedAt, meta: body.meta || {}, sortBy: body.sortBy || "likes", posts: body.posts };
      fs.writeFileSync(path.join(SAVE_DIR, id + ".json"), JSON.stringify(record));
      return sendJson(res, 200, { ok: true, id, savedAt });
    } catch (e) {
      return sendJson(res, 400, { error: (e && e.message) || "저장 실패" });
    }
  }

  // 저장된 항목 삭제
  if (req.method === "POST" && u.pathname === "/api/saved/delete") {
    const id = safeName(u.searchParams.get("id") || "");
    const file = path.join(SAVE_DIR, id + ".json");
    try { if (id && fs.existsSync(file)) fs.unlinkSync(file); return sendJson(res, 200, { ok: true }); }
    catch (e) { return sendJson(res, 500, { error: "삭제 실패" }); }
  }

  // 분석 (SSE 스트림)
  if (req.method === "GET" && u.pathname === "/api/analyze") {
    const emit = sse(res);
    if (busy) { emit("error", { message: "이미 분석이 진행 중입니다. 끝난 뒤 다시 시도하세요." }); return res.end(); }
    busy = true;
    const profile = u.searchParams.get("profile") || "";
    const maxPosts = u.searchParams.get("max") || "60";
    const sortBy = u.searchParams.get("sort") || "likes";
    const username = u.searchParams.get("username") || "";
    const password = u.searchParams.get("password") || "";

    // 첫 실행(세션 없음)이면 로그인 창을 띄우기 위해 headful
    const headless = hasSession();
    emit("log", { message: headless ? "저장된 로그인으로 진행합니다." : "첫 실행입니다. 잠시 후 인스타그램 로그인 창이 열립니다." });

    let closed = false;
    req.on("close", () => { closed = true; });

    try {
      const data = await runAnalysis({
        profile, maxPosts, sortBy, username, password, headless,
        onLog: (m) => { if (!closed) emit("log", { message: m }); },
      });
      if (!closed) emit("result", data);
    } catch (e) {
      if (!closed) emit("error", { message: (e && e.message) ? e.message : String(e) });
    } finally {
      busy = false;
      if (!closed) { emit("done", {}); res.end(); }
    }
    return;
  }

  send(res, 404, "text/plain; charset=utf-8", "Not found");
});

function listen(port, triesLeft) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && triesLeft > 0) {
      listen(port + 1, triesLeft - 1);
    } else {
      console.error("서버를 시작하지 못했습니다:", err.message);
      process.exit(1);
    }
  });
  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}/`;
    // 런처가 이 URL 을 읽어 브라우저를 엽니다.
    console.log(`READY ${url}`);
    console.log(`\n📸 인스타그램 인기 콘텐츠 정렬기 실행 중`);
    console.log(`   브라우저에서 열기 →  ${url}`);
    console.log(`   (이 창을 닫으면 프로그램이 종료됩니다.)\n`);
  });
}

listen(START_PORT, 20);
