#!/usr/bin/env node
/*
 * 인스타그램 인기 콘텐츠 정렬기 (Instagram Top Content Sorter)
 * ----------------------------------------------------------------
 * config.json 에 넣은 인스타그램 계정(프로필 주소 또는 아이디)의 게시물을
 * 모아, 조회수 · 좋아요 순으로 내림차순 정렬해 report.html / report.csv 로 정리합니다.
 *
 * 동작 방식
 *  1) Playwright 로 인스타그램에 로그인합니다.
 *     - config.json 에 username/password 가 있으면 자동 로그인
 *     - 없으면 창(브라우저)이 열리며 직접 로그인 → 로그인되면 자동으로 진행
 *     - 한 번 로그인하면 세션(ig-session.json)이 저장되어 다음부터는 바로 실행됩니다.
 *  2) 로그인된 상태에서 인스타그램 내부 API 를 호출해 대상 계정의 게시물
 *     (좋아요/조회수/댓글/게시일/캡션)을 수집합니다.
 *  3) 조회수 · 좋아요 기준 내림차순으로 정렬해 리포트를 만듭니다.
 *
 * 실행:  node insta-top.js
 * 브라우저 창을 보려면(권장, 로그인 확인용):  HEADLESS=false node insta-top.js
 *   (윈도우 cmd: set HEADLESS=false && node insta-top.js)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const MAX_POSTS = Number(CFG.maxPosts) > 0 ? Number(CFG.maxPosts) : 60;
const SORT_BY = (CFG.sortBy || "likes").toLowerCase(); // likes | views
const DELAY_MS = Number(CFG.delayMs) >= 0 ? Number(CFG.delayMs) : 1200;
// 세션이 저장되어 있으면 조용히(headless) 실행, 아니면 로그인 확인을 위해 창을 띄웁니다.
const SESSION_FILE = path.join(__dirname, "ig-session.json");
const HAS_SESSION = fs.existsSync(SESSION_FILE);
const HEADLESS = process.env.HEADLESS ? process.env.HEADLESS !== "false" : HAS_SESSION;
const IG_APP_ID = "936619743392459"; // 인스타그램 웹 API 호출에 필요한 공개 app id
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

// ----- 로그인 처리 -----
async function ensureLogin(browser) {
  const ctxOpts = {
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
  };
  if (HAS_SESSION) ctxOpts.storageState = SESSION_FILE;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  // 이미 로그인되어 있는지 확인
  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 40000 });
  await sleep(2500);
  if (await isLoggedIn(page)) {
    await ctx.storageState({ path: SESSION_FILE });
    await page.close();
    return ctx;
  }

  // 자동 로그인 시도
  if (CFG.username && CFG.password) {
    console.log("[로그인] 저장된 아이디/비밀번호로 로그인합니다...");
    try {
      await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded", timeout: 40000 });
      await dismissCookieBanner(page);
      await page.fill('input[name="username"]', String(CFG.username), { timeout: 15000 });
      await page.fill('input[name="password"]', String(CFG.password), { timeout: 15000 });
      await page.click('button[type="submit"]');
      // 로그인 완료(혹은 챌린지) 대기
      for (let i = 0; i < 30; i++) {
        await sleep(1500);
        if (await isLoggedIn(page)) break;
      }
    } catch (e) {
      console.log("[로그인] 자동 로그인 중 문제:", e.message);
    }
  }

  // 여전히 로그인 안 됨 → 직접 로그인 안내
  if (!(await isLoggedIn(page))) {
    if (HEADLESS) {
      throw new Error(
        "로그인이 필요합니다. config.json 에 username/password 를 넣거나,\n" +
        "  HEADLESS=false node insta-top.js  로 실행해 열린 창에서 직접 로그인하세요."
      );
    }
    console.log("\n[로그인] 열린 브라우저 창에서 직접 로그인해 주세요. (2단계 인증 포함)");
    console.log("        로그인이 완료되면 자동으로 다음 단계로 넘어갑니다. 최대 3분 대기...\n");
    let ok = false;
    for (let i = 0; i < 120; i++) { // 최대 3분
      await sleep(1500);
      if (await isLoggedIn(page)) { ok = true; break; }
    }
    if (!ok) throw new Error("로그인이 확인되지 않아 종료합니다.");
  }

  // "로그인 정보 저장", "알림 켜기" 등의 팝업은 무시하고 세션 저장
  await ctx.storageState({ path: SESSION_FILE });
  console.log("[로그인] 완료 ✅ (세션을 저장했습니다.)\n");
  await page.close();
  return ctx;
}

async function isLoggedIn(page) {
  try {
    return await page.evaluate(() => {
      // 로그인 폼이 보이면 미로그인
      if (document.querySelector('input[name="password"]')) return false;
      // 로그인 시 존재하는 요소들
      const hasNav = document.querySelector('svg[aria-label="홈"], svg[aria-label="Home"], a[href="/"] svg');
      const cookie = document.cookie || "";
      return Boolean(hasNav) || /sessionid=/.test(cookie);
    });
  } catch (e) {
    return false;
  }
}

async function dismissCookieBanner(page) {
  try {
    const labels = ["필수 쿠키만 허용", "선택 쿠키 허용", "Allow all cookies", "Allow essential and optional cookies", "쿠키 허용", "Only allow essential cookies"];
    for (const t of labels) {
      const btn = page.locator(`button:has-text("${t}")`).first();
      if (await btn.count()) { await btn.click({ timeout: 3000 }).catch(() => {}); break; }
    }
  } catch (e) { /* ignore */ }
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
    postCount: (user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.count) || 0,
    followers: (user.edge_followed_by && user.edge_followed_by.count) || 0,
  };
}

// 페이지 컨텍스트에서 fetch (쿠키/헤더 자동 포함)
async function apiGet(page, url) {
  return page.evaluate(async ({ url, appId }) => {
    const res = await fetch(url, {
      headers: { "x-ig-app-id": appId, "x-requested-with": "XMLHttpRequest" },
      credentials: "include",
    });
    if (!res.ok) return { __error: res.status + " " + res.statusText };
    try { return await res.json(); } catch (e) { return { __error: "JSON 파싱 실패" }; }
  }, { url, appId: IG_APP_ID });
}

function num(...cands) {
  for (const c of cands) {
    if (typeof c === "number" && !isNaN(c)) return c;
  }
  return null;
}

function normalizeItem(it) {
  const code = it.code || (it.media && it.media.code) || "";
  const mediaType = it.media_type; // 1 사진, 2 동영상, 8 앨범(캐러셀)
  const product = it.product_type || ""; // clips=릴스, feed, igtv
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

  // 썸네일
  let thumb = "";
  const pick = (m) => {
    if (!m) return "";
    if (m.image_versions2 && m.image_versions2.candidates && m.image_versions2.candidates.length) {
      const cs = m.image_versions2.candidates;
      return cs[cs.length - 1].url; // 작은 썸네일
    }
    return "";
  };
  thumb = pick(it);
  if (!thumb && it.carousel_media && it.carousel_media.length) thumb = pick(it.carousel_media[0]);

  return {
    code, type, isVideo,
    views, likes, comments, takenAt,
    caption: caption.replace(/\s+/g, " ").trim(),
    thumb,
    url: code ? `https://www.instagram.com/p/${code}/` : "",
  };
}

async function collectPosts(page, userId) {
  const items = [];
  let maxId = "";
  let guard = 0;
  while (items.length < MAX_POSTS && guard < 60) {
    guard++;
    const url = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=33` + (maxId ? `&max_id=${encodeURIComponent(maxId)}` : "");
    const data = await apiGet(page, url);
    if (!data || data.__error) {
      console.log(`[수집] 응답 오류: ${data && data.__error ? data.__error : "빈 응답"} — 잠시 후 재시도`);
      await sleep(3000);
      const retry = await apiGet(page, url);
      if (!retry || retry.__error) break;
      Object.assign(data || {}, retry);
      if (retry.__error) break;
      if (!retry.items) break;
      data.items = retry.items; data.more_available = retry.more_available; data.next_max_id = retry.next_max_id;
    }
    const batch = (data.items || []).map(normalizeItem).filter((x) => x.code);
    items.push(...batch);
    process.stdout.write(`\r[수집] ${items.length}개 게시물 수집됨...`);
    if (!data.more_available || !data.next_max_id) break;
    maxId = data.next_max_id;
    await sleep(DELAY_MS);
  }
  process.stdout.write("\n");
  return items.slice(0, MAX_POSTS);
}

// ----- 리포트 생성 -----
function fmtNum(n) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR");
}
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

function buildHtml(posts, meta, stamp) {
  const rows = posts.map((p, i) => {
    const thumb = p.thumb
      ? `<img src="${esc(p.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="noimg">🖼️</div>`;
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
 :root{--bd:#efeff4;--muted:#8a8f98}
 *{box-sizing:border-box}
 body{font-family:"Malgun Gothic",-apple-system,system-ui,sans-serif;background:#f6f7fb;color:#22242b;margin:0;padding:24px}
 .wrap{max-width:1080px;margin:0 auto}
 h1{font-size:1.35rem;margin:0 0 4px}
 h1 .ig{background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);-webkit-background-clip:text;background-clip:text;color:transparent}
 .meta{color:var(--muted);font-size:.88rem;margin-bottom:16px}
 .cards{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px}
 .card{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:12px 16px;min-width:130px;box-shadow:0 1px 6px rgba(0,0,0,.04)}
 .card .k{font-size:.78rem;color:var(--muted)}
 .card .v{font-size:1.25rem;font-weight:700;margin-top:2px}
 .controls{margin-bottom:10px;font-size:.9rem}
 .controls button{border:1px solid #d7d9e0;background:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.9rem;margin-right:6px}
 .controls button.on{background:#dc2743;border-color:#dc2743;color:#fff;font-weight:700}
 table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.05);border-radius:12px;overflow:hidden}
 th,td{padding:10px 12px;border-bottom:1px solid var(--bd);font-size:.9rem;text-align:left;vertical-align:middle}
 th{background:#22242b;color:#fff;font-weight:600;white-space:nowrap}
 tr:hover{background:#fafbff}
 .rank{text-align:center;font-weight:700;color:#888;width:38px}
 .thumb{width:64px}
 .thumb img{width:56px;height:56px;object-fit:cover;border-radius:8px;display:block;background:#eee}
 .noimg{width:56px;height:56px;border-radius:8px;background:#eef;display:flex;align-items:center;justify-content:center}
 .numcell{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
 .views{color:#0b7285;font-weight:600}.likes{color:#e8590c;font-weight:600}
 .date{white-space:nowrap;color:#555}
 .cap a{color:#22242b;text-decoration:none}.cap a:hover{text-decoration:underline}
 .muted{color:var(--muted)}
 .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.76rem;font-weight:700}
 .b-릴스{background:#fde2f3;color:#bc1888}.b-동영상{background:#e3f2fd;color:#1565c0}
 .b-사진{background:#e9f7ef;color:#2b8a3e}.b-앨범{background:#fff3e0;color:#e8590c}
 .note{color:var(--muted);font-size:.82rem;margin-top:14px;line-height:1.6}
 a.thumb-link{display:block}
</style></head><body>
<div class="wrap">
 <h1><span class="ig">📸 인스타그램 인기 콘텐츠</span> — @${esc(meta.username)}${meta.fullName ? ` <span class="muted" style="font-size:.9rem">(${esc(meta.fullName)})</span>` : ""}</h1>
 <div class="meta">수집 시각: ${esc(stamp)} · 팔로워 ${fmtNum(meta.followers)}명 · 전체 게시물 ${fmtNum(meta.postCount)}개 · 이번에 수집 ${posts.length}개${meta.isPrivate ? " · 🔒 비공개 계정" : ""}</div>

 <div class="cards">
  <div class="card"><div class="k">수집한 게시물</div><div class="v">${fmtNum(posts.length)}</div></div>
  <div class="card"><div class="k">합계 조회수</div><div class="v">${fmtNum(totalViews)}</div></div>
  <div class="card"><div class="k">합계 좋아요</div><div class="v">${fmtNum(totalLikes)}</div></div>
 </div>

 <div class="controls">
  정렬:
  <button id="btnLikes" onclick="sortBy('likes')">❤️ 좋아요순</button>
  <button id="btnViews" onclick="sortBy('views')">▶️ 조회수순</button>
 </div>

 <table>
  <thead><tr>
   <th>#</th><th>썸네일</th><th>유형</th><th>조회수</th><th>좋아요</th><th>댓글</th><th>게시일</th><th>캡션</th>
  </tr></thead>
  <tbody id="tbody">
${rows}
  </tbody>
 </table>

 <p class="note">
  ※ 조회수는 <b>릴스·동영상</b>에만 표시됩니다. 사진/앨범은 조회수가 제공되지 않아 <b>-</b> 로 표시됩니다.<br>
  ※ 좋아요를 숨긴 게시물은 정확한 수가 나오지 않을 수 있습니다. 수치는 수집 시점 기준입니다.<br>
  ※ 인스타그램은 비공개 API 사용을 제한하므로, 많이 실행하면 일시적으로 데이터가 비어 보일 수 있습니다. 잠시 후 다시 실행하세요.
 </p>
</div>

<script>
 function sortBy(key){
   var tb=document.getElementById('tbody');
   var rows=Array.prototype.slice.call(tb.querySelectorAll('tr'));
   rows.sort(function(a,b){
     var av=parseFloat(a.dataset[key]), bv=parseFloat(b.dataset[key]);
     if(bv!==av) return bv-av;
     return parseFloat(b.dataset.likes)-parseFloat(a.dataset.likes);
   });
   rows.forEach(function(r,i){ r.cells[0].textContent=i+1; tb.appendChild(r); });
   document.getElementById('btnLikes').className = key==='likes'?'on':'';
   document.getElementById('btnViews').className = key==='views'?'on':'';
 }
 sortBy('${SORT_BY === "views" ? "views" : "likes"}');
</script>
</body></html>`;
}

function buildCsv(posts) {
  const head = "순위,유형,조회수,좋아요,댓글,게시일,캡션,URL";
  const lines = posts.map((p, i) => {
    const cap = '"' + String(p.caption || "").replace(/"/g, '""').replace(/\r?\n/g, " ") + '"';
    return [i + 1, p.type, p.views ?? "", p.likes ?? "", p.comments ?? "", fmtDate(p.takenAt), cap, p.url].join(",");
  });
  return "﻿" + [head].concat(lines).join("\n");
}

// ----- 메인 -----
async function main() {
  const username = parseUsername(CFG.profile || CFG.username);
  if (!username) {
    console.error("config.json 의 \"profile\" 에 인스타그램 계정 주소나 아이디를 넣어주세요. 예: https://www.instagram.com/instagram/");
    process.exit(1);
  }

  console.log(`\n📸 인스타그램 인기 콘텐츠 정렬기`);
  console.log(`대상 계정: @${username}`);
  console.log(`최대 수집: ${MAX_POSTS}개 · 기본 정렬: ${SORT_BY === "views" ? "조회수순" : "좋아요순"}\n`);

  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: HEADLESS });
  let ctx;
  try {
    ctx = await ensureLogin(browser);
    const page = await ctx.newPage();
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(1500);

    console.log(`[조회] @${username} 계정 정보를 가져오는 중...`);
    const info = await fetchUserId(page, username);
    if (info.isPrivate) {
      console.log("[주의] 비공개 계정입니다. 로그인 계정이 이 계정을 팔로우하고 있어야 게시물을 볼 수 있습니다.");
    }
    console.log(`[조회] user id=${info.id}, 전체 게시물 ${info.postCount}개\n`);

    const posts = await collectPosts(page, info.id);
    if (!posts.length) {
      throw new Error("게시물을 하나도 가져오지 못했습니다. (비공개/팔로우 여부, 또는 일시적 제한일 수 있습니다. 잠시 후 다시 실행해 보세요.)");
    }

    const sorted = sortPosts(posts, SORT_BY === "views" ? "views" : "likes");
    const stamp = new Date().toLocaleString("ko-KR");
    const meta = { username, fullName: info.fullName, followers: info.followers, postCount: info.postCount, isPrivate: info.isPrivate };

    fs.writeFileSync(path.join(__dirname, "report.html"), buildHtml(sorted, meta, stamp));
    fs.writeFileSync(path.join(__dirname, "report.csv"), buildCsv(sorted));

    // 콘솔 상위 10개 미리보기
    console.log(`\n=== ${SORT_BY === "views" ? "조회수" : "좋아요"} 상위 미리보기 ===`);
    sorted.slice(0, 10).forEach((p, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. [${p.type}] 좋아요 ${fmtNum(p.likes).padStart(9)} · 조회수 ${(p.views === null ? "-" : fmtNum(p.views)).padStart(11)}  ${p.caption.slice(0, 30)}`
      );
    });

    console.log(`\n완료 ✅  리포트 저장:`);
    console.log(`  - ${path.join(__dirname, "report.html")}`);
    console.log(`  - ${path.join(__dirname, "report.csv")}\n`);
  } catch (e) {
    console.error("\n[오류] " + (e && e.message ? e.message : e) + "\n");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseUsername, normalizeItem, sortPosts, buildHtml, buildCsv, fmtNum, fmtDate };
