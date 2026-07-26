#!/usr/bin/env node
/*
 * 인스타그램 인기 콘텐츠 정렬기 (Instagram Top Content Sorter) — 코어 라이브러리 + CLI
 * ----------------------------------------------------------------
 * 인스타그램 계정(프로필 주소 또는 아이디)의 게시물을 모아
 * 조회수 · 좋아요 순으로 내림차순 정렬합니다.
 *
 * - GUI로 쓰려면:  실행.bat / 실행.command (내부에서 server.js 를 띄웁니다)
 * - 명령어(CLI)로 쓰려면:  node insta-top.js   (config.json 을 읽어 report.html/csv 생성)
 *
 * 이 파일은 server.js 에서 재사용할 수 있도록 runAnalysis() 함수를 export 합니다.
 */
"use strict";

const fs = require("fs");
const path = require("path");

// 실제 브라우저 프로필을 폴더에 저장해 로그인을 유지합니다(가장 안정적).
const PROFILE_DIR = path.join(__dirname, "ig-profile");
const MARKER_FILE = path.join(PROFILE_DIR, ".logged_in"); // 로그인 성공 표시
const LEGACY_SESSION_FILE = path.join(__dirname, "ig-session.json"); // 예전 방식(정리용)
const IG_APP_ID = "936619743392459"; // 인스타그램 웹 API 호출에 필요한 공개 app id
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
// 이전에 로그인에 성공한 적이 있으면 true (→ 창 없이 조용히 실행 시도)
function hasSession() { return fs.existsSync(MARKER_FILE); }
function markLoggedIn() { try { fs.mkdirSync(PROFILE_DIR, { recursive: true }); fs.writeFileSync(MARKER_FILE, new Date().toISOString()); } catch (e) {} }
function clearSession() {
  try { fs.rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch (e) {}
  try { fs.unlinkSync(LEGACY_SESSION_FILE); } catch (e) {}
}

// 프로필 입력에서 인스타그램 아이디(username) 추출
function parseUsername(input) {
  if (!input) return "";
  let s = String(input).trim();
  s = s.replace(/^@/, "");
  const m = s.match(/instagram\.com\/([^/?#]+)/i);
  if (m) s = m[1];
  s = s.replace(/\/+$/, "").split(/[/?#]/)[0];
  return s;
}

// 로그인 여부 확인 — 가장 확실한 방법: 컨텍스트의 sessionid 쿠키 존재 여부.
// (sessionid 는 HttpOnly 라 페이지 스크립트로는 안 보이므로 반드시 컨텍스트 API 로 확인)
async function isLoggedIn(ctx, page) {
  try {
    const cookies = await ctx.cookies("https://www.instagram.com");
    if (cookies.some((c) => c.name === "sessionid" && c.value && c.value.length > 10)) return true;
  } catch (e) { /* 무시하고 DOM 검사로 폴백 */ }
  try {
    return await page.evaluate(() => {
      if (document.querySelector('input[name="password"]')) return false;
      return Boolean(document.querySelector('a[href="/explore/"], a[href^="/direct/"], svg[aria-label="홈"], svg[aria-label="Home"]'));
    });
  } catch (e) { return false; }
}

// 열린 persistent 컨텍스트에서 로그인 상태를 보장합니다.
// 반환: "ok" (로그인됨) 또는 "need-ui" (창을 띄워 직접 로그인이 필요 — 호출측이 headful 로 재실행)
async function ensureLogin(ctx, opts) {
  const { username, password, headless, onLog } = opts;
  const log = onLog || (() => {});
  const page = (ctx.pages()[0]) || (await ctx.newPage());

  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 40000 });
  await sleep(2500);
  if (await isLoggedIn(ctx, page)) { markLoggedIn(); return "ok"; }

  // 아이디/비밀번호가 있으면 자동 로그인 시도
  if (username && password) {
    log("저장된 아이디/비밀번호로 로그인 시도 중...");
    try {
      await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded", timeout: 40000 });
      await dismissCookieBanner(page);
      await page.fill('input[name="username"]', String(username), { timeout: 15000 });
      await page.fill('input[name="password"]', String(password), { timeout: 15000 });
      await page.click('button[type="submit"]');
      for (let i = 0; i < 30; i++) { await sleep(1500); if (await isLoggedIn(ctx, page)) break; }
    } catch (e) { log("자동 로그인 중 문제: " + e.message); }
    if (await isLoggedIn(ctx, page)) { markLoggedIn(); log("로그인 완료 ✅ (프로필에 저장 — 다음부터는 창 없이 자동 로그인)"); return "ok"; }
  }

  // 여기까지 로그인 안 됨
  if (headless) return "need-ui"; // 조용히 실행 중이었다면, 창을 띄우도록 상위에 신호

  // 창이 떠 있는 상태 → 직접 로그인 대기
  log("🔑 열린 인스타그램 창에서 로그인해 주세요. (2단계 인증 포함) — 완료되면 자동으로 진행됩니다.");
  for (let i = 0; i < 200; i++) { // 최대 약 5분
    await sleep(1500);
    if (await isLoggedIn(ctx, page)) { markLoggedIn(); log("로그인 완료 ✅ (프로필에 저장 — 다음부터는 창 없이 자동 로그인)"); return "ok"; }
  }
  throw new Error("로그인이 확인되지 않아 중단했습니다. 다시 시도해 주세요.");
}

async function dismissCookieBanner(page) {
  try {
    const labels = ["필수 쿠키만 허용", "선택 쿠키 허용", "Allow all cookies", "Allow essential and optional cookies", "쿠키 허용", "Only allow essential cookies"];
    for (const t of labels) {
      const btn = page.locator(`button:has-text("${t}")`).first();
      if (await btn.count()) { await btn.click({ timeout: 3000 }).catch(() => {}); break; }
    }
  } catch (e) {}
}

// ----- 게시물 수집 (인스타그램 내부 API) -----
async function fetchUserId(page, username) {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const data = await apiGet(page, url);
  const user = data && data.data && data.data.user;
  if (!user || !user.id) throw new Error(`계정 정보를 찾지 못했습니다: @${username} (아이디가 정확한지, 비공개 계정이면 팔로우했는지 확인하세요)`);
  return {
    id: user.id,
    isPrivate: user.is_private,
    fullName: user.full_name,
    profilePic: user.profile_pic_url,
    postCount: (user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.count) || 0,
    followers: (user.edge_followed_by && user.edge_followed_by.count) || 0,
  };
}

async function apiGet(page, url) {
  return page.evaluate(async ({ url, appId }) => {
    const res = await fetch(url, { headers: { "x-ig-app-id": appId, "x-requested-with": "XMLHttpRequest" }, credentials: "include" });
    if (!res.ok) return { __error: res.status + " " + res.statusText };
    try { return await res.json(); } catch (e) { return { __error: "JSON 파싱 실패" }; }
  }, { url, appId: IG_APP_ID });
}

function num(...cands) {
  for (const c of cands) { if (typeof c === "number" && !isNaN(c)) return c; }
  return null;
}

function normalizeItem(it) {
  const code = it.code || (it.media && it.media.code) || "";
  const mediaType = it.media_type; // 1 사진, 2 동영상, 8 앨범
  const product = it.product_type || "";
  const isVideo = mediaType === 2 || product === "clips" || product === "igtv";
  let type = "사진";
  if (product === "clips") type = "릴스";
  else if (mediaType === 2 || product === "igtv") type = "동영상";
  else if (mediaType === 8) type = "앨범";

  const views = isVideo ? num(it.play_count, it.ig_play_count, it.view_count, it.video_view_count) : null;
  const likes = num(it.like_count, it.likes);
  const comments = num(it.comment_count, it.comments);
  const takenAt = num(it.taken_at, it.taken_at_timestamp);
  let caption = "";
  if (it.caption && it.caption.text) caption = it.caption.text;
  else if (typeof it.caption === "string") caption = it.caption;

  let thumb = "";
  const pick = (m) => {
    if (!m) return "";
    if (m.image_versions2 && m.image_versions2.candidates && m.image_versions2.candidates.length) {
      const cs = m.image_versions2.candidates;
      return cs[cs.length - 1].url;
    }
    return "";
  };
  thumb = pick(it);
  if (!thumb && it.carousel_media && it.carousel_media.length) thumb = pick(it.carousel_media[0]);

  return {
    code, type, isVideo, views, likes, comments, takenAt,
    caption: caption.replace(/\s+/g, " ").trim(),
    thumb,
    url: code ? `https://www.instagram.com/p/${code}/` : "",
  };
}

async function collectPosts(page, userId, opts) {
  const { maxPosts, delayMs, onLog } = opts;
  const log = onLog || (() => {});
  const items = [];
  let maxId = "";
  let guard = 0;
  while (items.length < maxPosts && guard < 80) {
    guard++;
    const url = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=33` + (maxId ? `&max_id=${encodeURIComponent(maxId)}` : "");
    let data = await apiGet(page, url);
    if (!data || data.__error || !data.items) {
      await sleep(3000);
      data = await apiGet(page, url);
      if (!data || data.__error || !data.items) break;
    }
    const batch = (data.items || []).map(normalizeItem).filter((x) => x.code);
    items.push(...batch);
    log(`${items.length}개 게시물 수집됨...`);
    if (!data.more_available || !data.next_max_id) break;
    maxId = data.next_max_id;
    await sleep(delayMs);
  }
  return items.slice(0, maxPosts);
}

// ----- 포맷/정렬/리포트 -----
function fmtNum(n) { if (n === null || n === undefined) return "-"; return n.toLocaleString("ko-KR"); }
function fmtDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts * 1000);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function sortPosts(posts, key) {
  const val = (p) => (key === "views" ? (p.views ?? -1) : (p.likes ?? -1));
  return [...posts].sort((a, b) => val(b) - val(a) || (b.likes ?? -1) - (a.likes ?? -1));
}

// CLI/파일 저장용 정적 HTML 리포트
function buildHtml(posts, meta, stamp, sortBy) {
  const SORT_BY = (sortBy || "likes") === "views" ? "views" : "likes";
  const rows = posts.map((p, i) => {
    const thumb = p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="noimg">🖼️</div>`;
    const cap = p.caption ? esc(p.caption.slice(0, 80)) + (p.caption.length > 80 ? "…" : "") : "<span class='muted'>(캡션 없음)</span>";
    return `<tr data-views="${p.views ?? -1}" data-likes="${p.likes ?? -1}">
      <td class="rank">${i + 1}</td>
      <td class="thumb"><a href="${esc(p.url)}" target="_blank" rel="noopener">${thumb}</a></td>
      <td><span class="badge b-${p.type}">${p.type}</span></td>
      <td class="numcell views">${p.views === null ? "<span class='muted'>-</span>" : fmtNum(p.views)}</td>
      <td class="numcell likes">${fmtNum(p.likes)}</td>
      <td class="numcell">${fmtNum(p.comments)}</td>
      <td class="date">${fmtDate(p.takenAt)}</td>
      <td class="cap"><a href="${esc(p.url)}" target="_blank" rel="noopener">${cap}</a></td>
    </tr>`;
  }).join("\n");
  const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>인스타그램 인기 콘텐츠 — @${esc(meta.username)}</title>
<style>
 :root{--bd:#efeff4;--muted:#8a8f98}*{box-sizing:border-box}
 body{font-family:"Malgun Gothic",-apple-system,system-ui,sans-serif;background:#f6f7fb;color:#22242b;margin:0;padding:24px}
 .wrap{max-width:1080px;margin:0 auto}h1{font-size:1.35rem;margin:0 0 4px}
 h1 .ig{background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);-webkit-background-clip:text;background-clip:text;color:transparent}
 .meta{color:var(--muted);font-size:.88rem;margin-bottom:16px}
 .cards{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px}
 .card{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:12px 16px;min-width:130px;box-shadow:0 1px 6px rgba(0,0,0,.04)}
 .card .k{font-size:.78rem;color:var(--muted)}.card .v{font-size:1.25rem;font-weight:700;margin-top:2px}
 .controls{margin-bottom:10px}.controls button{border:1px solid #d7d9e0;background:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.9rem;margin-right:6px}
 .controls button.on{background:#dc2743;border-color:#dc2743;color:#fff;font-weight:700}
 table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.05);border-radius:12px;overflow:hidden}
 th,td{padding:10px 12px;border-bottom:1px solid var(--bd);font-size:.9rem;text-align:left;vertical-align:middle}
 th{background:#22242b;color:#fff;font-weight:600;white-space:nowrap}tr:hover{background:#fafbff}
 .rank{text-align:center;font-weight:700;color:#888;width:38px}.thumb{width:64px}
 .thumb img{width:56px;height:56px;object-fit:cover;border-radius:8px;display:block;background:#eee}
 .noimg{width:56px;height:56px;border-radius:8px;background:#eef;display:flex;align-items:center;justify-content:center}
 .numcell{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 .views{color:#0b7285;font-weight:600}.likes{color:#e8590c;font-weight:600}
 .date{white-space:nowrap;color:#555}.cap a{color:#22242b;text-decoration:none}.cap a:hover{text-decoration:underline}
 .muted{color:var(--muted)}.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.76rem;font-weight:700}
 .b-릴스{background:#fde2f3;color:#bc1888}.b-동영상{background:#e3f2fd;color:#1565c0}
 .b-사진{background:#e9f7ef;color:#2b8a3e}.b-앨범{background:#fff3e0;color:#e8590c}
 .note{color:var(--muted);font-size:.82rem;margin-top:14px;line-height:1.6}
</style></head><body><div class="wrap">
 <h1><span class="ig">📸 인스타그램 인기 콘텐츠</span> — @${esc(meta.username)}${meta.fullName ? ` <span class="muted" style="font-size:.9rem">(${esc(meta.fullName)})</span>` : ""}</h1>
 <div class="meta">수집 시각: ${esc(stamp)} · 팔로워 ${fmtNum(meta.followers)}명 · 전체 게시물 ${fmtNum(meta.postCount)}개 · 이번에 수집 ${posts.length}개${meta.isPrivate ? " · 🔒 비공개 계정" : ""}</div>
 <div class="cards">
  <div class="card"><div class="k">수집한 게시물</div><div class="v">${fmtNum(posts.length)}</div></div>
  <div class="card"><div class="k">합계 조회수</div><div class="v">${fmtNum(totalViews)}</div></div>
  <div class="card"><div class="k">합계 좋아요</div><div class="v">${fmtNum(totalLikes)}</div></div>
 </div>
 <div class="controls">정렬:
  <button id="btnLikes" onclick="sortBy('likes')">❤️ 좋아요순</button>
  <button id="btnViews" onclick="sortBy('views')">▶️ 조회수순</button>
 </div>
 <table><thead><tr><th>#</th><th>썸네일</th><th>유형</th><th>조회수</th><th>좋아요</th><th>댓글</th><th>게시일</th><th>캡션</th></tr></thead>
 <tbody id="tbody">${rows}</tbody></table>
 <p class="note">※ 조회수는 <b>릴스·동영상</b>에만 표시됩니다. 사진/앨범은 <b>-</b> 로 표시됩니다.<br>
  ※ 좋아요를 숨긴 게시물은 정확한 수가 나오지 않을 수 있습니다. 수치는 수집 시점 기준입니다.</p>
</div><script>
 function sortBy(key){var tb=document.getElementById('tbody');var rows=[].slice.call(tb.querySelectorAll('tr'));
   rows.sort(function(a,b){var av=parseFloat(a.dataset[key]),bv=parseFloat(b.dataset[key]);if(bv!==av)return bv-av;return parseFloat(b.dataset.likes)-parseFloat(a.dataset.likes);});
   rows.forEach(function(r,i){r.cells[0].textContent=i+1;tb.appendChild(r);});
   document.getElementById('btnLikes').className=key==='likes'?'on':'';document.getElementById('btnViews').className=key==='views'?'on':'';}
 sortBy('${SORT_BY}');
</script></body></html>`;
}

function buildCsv(posts) {
  const head = "순위,유형,조회수,좋아요,댓글,게시일,캡션,URL";
  const lines = posts.map((p, i) => {
    const cap = '"' + String(p.caption || "").replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
    return [i + 1, p.type, p.views ?? "", p.likes ?? "", p.comments ?? "", fmtDate(p.takenAt), cap, p.url].join(",");
  });
  return "﻿" + [head].concat(lines).join("\n");
}

// ----- 오케스트레이션: GUI(server.js)와 CLI 가 공유 -----
async function runAnalysis(opts) {
  const profile = opts.profile;
  const maxPosts = Number(opts.maxPosts) > 0 ? Number(opts.maxPosts) : 60;
  const sortBy = (opts.sortBy || "likes").toLowerCase() === "views" ? "views" : "likes";
  const delayMs = Number(opts.delayMs) >= 0 ? Number(opts.delayMs) : 1200;
  const onLog = opts.onLog || (() => {});
  // 세션이 있으면 조용히(headless), 없으면 로그인 창을 띄웁니다.
  const headless = opts.headless !== undefined ? opts.headless : hasSession();

  const username = parseUsername(profile || opts.username);
  if (!username) throw new Error("인스타그램 계정 주소나 아이디를 입력하세요. 예: https://www.instagram.com/instagram/");

  const { chromium } = require("playwright");

  // 실제 브라우저 프로필(PROFILE_DIR)로 로그인을 저장 → 다음 실행부터는 창 없이 자동 로그인
  async function openCtx(hl) {
    return chromium.launchPersistentContext(PROFILE_DIR, {
      headless: hl,
      viewport: { width: 1280, height: 900 },
      locale: "ko-KR",
      args: ["--no-first-run", "--no-default-browser-check", "--disable-blink-features=AutomationControlled"],
    });
  }

  onLog("브라우저 준비 중...");
  let wantHeadless = headless;
  let ctx = await openCtx(wantHeadless);
  try {
    let state = await ensureLogin(ctx, { username: opts.username, password: opts.password, headless: wantHeadless, onLog });
    // 조용히 실행했는데 세션이 만료된 경우 → 창을 띄워 로그인 받기
    if (state === "need-ui") {
      onLog("저장된 로그인이 만료되었어요. 로그인 창을 엽니다...");
      await ctx.close();
      wantHeadless = false;
      ctx = await openCtx(false);
      state = await ensureLogin(ctx, { username: opts.username, password: opts.password, headless: false, onLog });
    }

    const page = (ctx.pages()[0]) || (await ctx.newPage());
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(1500);

    onLog(`@${username} 계정 정보를 가져오는 중...`);
    const info = await fetchUserId(page, username);
    if (info.isPrivate) onLog("🔒 비공개 계정입니다. 로그인 계정이 팔로우 중이어야 게시물을 볼 수 있습니다.");
    onLog(`전체 게시물 ${info.postCount}개 · 최대 ${maxPosts}개 수집을 시작합니다.`);

    const posts = await collectPosts(page, info.id, { maxPosts, delayMs, onLog });
    if (!posts.length) throw new Error("게시물을 하나도 가져오지 못했습니다. (비공개/팔로우 여부 또는 일시적 제한일 수 있습니다. 잠시 후 다시 시도하세요.)");

    const sorted = sortPosts(posts, sortBy);
    const meta = { username, fullName: info.fullName, followers: info.followers, postCount: info.postCount, isPrivate: info.isPrivate, profilePic: info.profilePic };
    onLog(`완료 ✅ ${sorted.length}개 게시물을 정렬했습니다.`);
    return { posts: sorted, meta, sortBy };
  } finally {
    try { await ctx.close(); } catch (e) {}
  }
}

// ----- CLI -----
async function main() {
  const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
  const headless = process.env.HEADLESS ? process.env.HEADLESS !== "false" : hasSession();
  console.log(`\n📸 인스타그램 인기 콘텐츠 정렬기 (CLI)\n`);
  try {
    const { posts, meta, sortBy } = await runAnalysis({
      profile: CFG.profile, username: CFG.username, password: CFG.password,
      maxPosts: CFG.maxPosts, sortBy: CFG.sortBy, delayMs: CFG.delayMs, headless,
      onLog: (m) => console.log("  · " + m),
    });
    const stamp = new Date().toLocaleString("ko-KR");
    fs.writeFileSync(path.join(__dirname, "report.html"), buildHtml(posts, meta, stamp, sortBy));
    fs.writeFileSync(path.join(__dirname, "report.csv"), buildCsv(posts));
    console.log(`\n=== ${sortBy === "views" ? "조회수" : "좋아요"} 상위 미리보기 ===`);
    posts.slice(0, 10).forEach((p, i) => {
      console.log(`${String(i + 1).padStart(2)}. [${p.type}] 좋아요 ${fmtNum(p.likes).padStart(9)} · 조회수 ${(p.views === null ? "-" : fmtNum(p.views)).padStart(11)}  ${p.caption.slice(0, 30)}`);
    });
    console.log(`\n완료 ✅  리포트 저장:\n  - ${path.join(__dirname, "report.html")}\n  - ${path.join(__dirname, "report.csv")}\n`);
  } catch (e) {
    console.error("\n[오류] " + (e && e.message ? e.message : e) + "\n");
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  parseUsername, normalizeItem, sortPosts, buildHtml, buildCsv, fmtNum, fmtDate,
  runAnalysis, hasSession, clearSession, PROFILE_DIR,
};
