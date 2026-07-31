#!/usr/bin/env node
/*
 * vidIQ 고득점 영상 수집기 (YouTube 아웃라이어 배수 기반)
 * ----------------------------------------------------------------
 * 주제(예: "첫사랑 잊는 법")를 입력하면 유튜브에서 검색한 뒤,
 * vidIQ 크롬 확장의 빨간 배지(예: 18.8x)에 해당하는 "아웃라이어 배수"를
 * 계산해, 100에 가까운 높은 배수의 영상들을 배수 높은 순으로 모아 줍니다.
 *
 * 모으는 데이터(영상별):
 *   - 영상 링크
 *   - 썸네일
 *   - 제목
 *   - 설명글
 *   - 좋아요가 많은 댓글 5개
 *
 * ■ vidIQ 숫자에 대하여
 *   vidIQ가 썸네일 위에 보여 주는 "N배(x)" 빨간 배지는 그 확장 프로그램만
 *   아는 비공개(사내) 값이라 어떤 공개 API로도 그대로 가져올 수 없습니다.
 *   다만 그 배지가 뜻하는 것은 "이 영상이 채널 평소 조회수의 몇 배로
 *   터졌는가"(과대성과·아웃라이어)입니다. 이 프로그램은 공식 YouTube
 *   Data API로 그 값을 그대로 재현합니다:
 *
 *       아웃라이어 배수 = 영상 조회수 ÷ 채널 최근 영상들의 조회수 중앙값
 *
 *   1배 = 채널 평소 수준, 18.8배 = 평소의 18.8배, 100배 ≈ 대박 아웃라이어.
 *
 * 실행:
 *   node collect.js                 (config.json 의 topic 사용)
 *   node collect.js "첫사랑 잊는 법"   (주제를 바로 입력)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

// 주제: 명령줄 인자 > 환경변수 > config.json
const TOPIC = (process.argv.slice(2).join(" ").trim() || process.env.TOPIC || CFG.topic || "").trim();
const API_KEY = (process.env.YT_API_KEY || CFG.apiKey || "").trim();
const SEARCH_RESULTS = Math.max(1, Math.min(200, CFG.searchResults || 30));
const MIN_MULTIPLIER = Number(CFG.minMultiplier) || 0;
const CHANNEL_SAMPLE = Math.max(3, Math.min(50, CFG.channelSampleSize || 15));
const TOP_COMMENTS = Math.max(0, Math.min(20, CFG.topComments == null ? 5 : CFG.topComments));
const REGION = CFG.regionCode || "KR";
const LANG = CFG.relevanceLanguage || "ko";

const API = "https://www.googleapis.com/youtube/v3";

function die(msg) {
  console.error("\n[오류] " + msg + "\n");
  process.exit(1);
}

function checkPrereqs() {
  if (!API_KEY || API_KEY.indexOf("여기에") === 0) {
    die(
      "YouTube Data API 키가 설정되지 않았습니다.\n" +
      "       config.json 의 \"apiKey\" 값을 본인 키로 바꿔 주세요.\n" +
      "       발급: https://console.cloud.google.com → 'YouTube Data API v3' 사용 설정 → API 키 만들기"
    );
  }
  if (!TOPIC) die('주제가 비어 있습니다. 예:  node collect.js "첫사랑 잊는 법"');
}

// 공용 GET (쿼리 자동 인코딩 + 에러/쿼터 처리)
async function apiGet(endpoint, params) {
  const url = new URL(API + "/" + endpoint);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body && body.error && body.error.errors && body.error.errors[0] && body.error.errors[0].reason;
    const message = (body && body.error && body.error.message) || res.statusText;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      die("YouTube API 하루 사용량(쿼터)을 초과했습니다. 내일 다시 시도하거나 다른 API 키를 사용하세요.");
    }
    if (reason === "keyInvalid" || res.status === 400 || res.status === 403) {
      die("API 요청이 거부되었습니다 (" + (reason || res.status) + "): " + message +
          "\n       키가 올바른지, 'YouTube Data API v3' 가 사용 설정됐는지 확인하세요.");
    }
    throw new Error("API " + endpoint + " 실패: " + res.status + " " + message);
  }
  return body;
}

function num(x) { return Number(x || 0) || 0; }

function median(arr) {
  const a = arr.filter((n) => n > 0).sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// 1) 검색 → 영상 ID 목록
async function searchVideos(topic, want) {
  const ids = [];
  let pageToken = "";
  while (ids.length < want) {
    const data = await apiGet("search", {
      part: "id",
      q: topic,
      type: "video",
      maxResults: Math.min(50, want - ids.length),
      order: "relevance",
      regionCode: REGION,
      relevanceLanguage: LANG,
      pageToken: pageToken || undefined,
    });
    for (const item of data.items || []) {
      if (item.id && item.id.videoId) ids.push(item.id.videoId);
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }
  return [...new Set(ids)];
}

// 2) 영상 상세(제목·설명·썸네일·통계)
async function fetchVideos(ids) {
  const out = [];
  for (const group of chunk(ids, 50)) {
    const data = await apiGet("videos", {
      part: "snippet,statistics",
      id: group.join(","),
      maxResults: 50,
    });
    for (const v of data.items || []) {
      const sn = v.snippet || {};
      const st = v.statistics || {};
      const th = sn.thumbnails || {};
      const thumb = (th.maxres || th.standard || th.high || th.medium || th.default || {}).url || "";
      out.push({
        id: v.id,
        url: "https://www.youtube.com/watch?v=" + v.id,
        title: sn.title || "(제목 없음)",
        description: sn.description || "",
        thumbnail: thumb,
        channelId: sn.channelId || "",
        channelTitle: sn.channelTitle || "",
        publishedAt: sn.publishedAt || "",
        views: num(st.viewCount),
        likes: num(st.likeCount),
        commentCount: num(st.commentCount),
      });
    }
  }
  return out;
}

// 3) 채널 기준선(최근 업로드 조회수 중앙값) — 채널별 1회 계산 후 캐시
const channelBaselineCache = new Map();
async function channelBaseline(channelId) {
  if (channelBaselineCache.has(channelId)) return channelBaselineCache.get(channelId);
  let baseline = { median: 0, subscribers: 0, sampled: 0 };
  try {
    const ch = await apiGet("channels", { part: "contentDetails,statistics", id: channelId, maxResults: 1 });
    const c = (ch.items || [])[0];
    if (c) {
      baseline.subscribers = num(c.statistics && c.statistics.subscriberCount);
      const uploads = c.contentDetails && c.contentDetails.relatedPlaylists && c.contentDetails.relatedPlaylists.uploads;
      if (uploads) {
        const pl = await apiGet("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: CHANNEL_SAMPLE });
        const vids = (pl.items || []).map((i) => i.contentDetails && i.contentDetails.videoId).filter(Boolean);
        const views = [];
        for (const group of chunk(vids, 50)) {
          const vd = await apiGet("videos", { part: "statistics", id: group.join(","), maxResults: 50 });
          for (const v of vd.items || []) views.push(num(v.statistics && v.statistics.viewCount));
        }
        baseline.median = median(views);
        baseline.sampled = views.filter((n) => n > 0).length;
      }
    }
  } catch (e) {
    // 채널 정보 실패 시 기준선 0 → 배수 계산에서 구독자수로 폴백
  }
  channelBaselineCache.set(channelId, baseline);
  return baseline;
}

// 4) 좋아요 많은 댓글 상위 N개
async function topComments(videoId, n) {
  if (n <= 0) return [];
  try {
    const data = await apiGet("commentThreads", {
      part: "snippet",
      videoId,
      maxResults: 100,
      order: "relevance",
      textFormat: "plainText",
    });
    const comments = (data.items || []).map((it) => {
      const c = it.snippet && it.snippet.topLevelComment && it.snippet.topLevelComment.snippet;
      return c ? { text: c.textDisplay || "", author: c.authorDisplayName || "", likes: num(c.likeCount) } : null;
    }).filter(Boolean);
    comments.sort((a, b) => b.likes - a.likes);
    return comments.slice(0, n);
  } catch (e) {
    return []; // 댓글이 꺼져 있거나 접근 불가
  }
}

function computeMultiplier(video, baseline) {
  if (baseline.median > 0) return Math.round((video.views / baseline.median) * 10) / 10;
  // 채널 기준선을 못 구하면 구독자수 대비로 근사(1000명당 조회수 비율 → 배수화)
  if (baseline.subscribers > 0) return Math.round((video.views / baseline.subscribers) * 10) / 10;
  return 0;
}

// ---------- 리포트 ----------
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function badgeColor(m) {
  if (m >= 50) return "#e03131";      // 빨강 (대박)
  if (m >= 20) return "#f76707";      // 주황
  if (m >= 10) return "#f59f00";      // 노랑
  if (m >= 3) return "#2f9e44";       // 초록
  return "#868e96";                    // 회색 (평범)
}

function fmtInt(n) { return num(n).toLocaleString("ko-KR"); }

function buildHtml(rows, stamp) {
  const cards = rows.map((r, i) => {
    const color = badgeColor(r.multiplier);
    const comments = (r.comments || []).map((c) =>
      `<li><span class="clikes">👍 ${fmtInt(c.likes)}</span> <b>${esc(c.author)}</b><br>${esc(c.text)}</li>`
    ).join("\n") || '<li class="none">표시할 댓글이 없습니다(댓글 꺼짐/없음).</li>';
    const desc = esc(r.description).replace(/\n/g, "<br>");
    const baseInfo = r.baselineMedian > 0
      ? `채널 평소 조회수(중앙값) ${fmtInt(r.baselineMedian)}회 기준`
      : (r.baselineSubscribers > 0 ? `구독자수 ${fmtInt(r.baselineSubscribers)}명 기준(근사)` : "기준선 계산 불가");
    return `<article class="card">
  <div class="rank">#${i + 1}</div>
  <a class="thumbwrap" href="${esc(r.url)}" target="_blank" rel="noopener">
    <img class="thumb" src="${esc(r.thumbnail)}" alt="thumbnail" loading="lazy">
    <span class="badge" style="background:${color}">${r.multiplier}x</span>
  </a>
  <div class="body">
    <h2 class="title"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></h2>
    <div class="meta">
      <span>📺 ${esc(r.channelTitle)}</span>
      <span>👁 ${fmtInt(r.views)}회</span>
      <span>👍 ${fmtInt(r.likes)}</span>
      <span>💬 ${fmtInt(r.commentCount)}</span>
    </div>
    <div class="basis">아웃라이어 배수 <b style="color:${color}">${r.multiplier}x</b> · ${esc(baseInfo)}</div>
    <details class="desc"><summary>설명글 보기</summary><div class="descbody">${desc || "(설명 없음)"}</div></details>
    <div class="cwrap">
      <div class="clabel">좋아요 많은 댓글 ${TOP_COMMENTS}개</div>
      <ol class="comments">${comments}</ol>
    </div>
  </div>
</article>`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>vidIQ 고득점 영상 수집 결과 — ${esc(TOPIC)}</title>
<style>
 :root{--bg:#0f1115;--card:#1a1d24;--line:#2a2e37;--txt:#e8eaed;--sub:#9aa0aa;--accent:#ff4d4f}
 *{box-sizing:border-box}
 body{margin:0;background:var(--bg);color:var(--txt);font-family:"Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;padding:24px}
 header{max-width:1100px;margin:0 auto 20px}
 h1{font-size:1.5rem;margin:0 0 6px}
 .sub{color:var(--sub);font-size:.9rem;line-height:1.6}
 .grid{max-width:1100px;margin:0 auto;display:grid;gap:16px}
 .card{display:grid;grid-template-columns:340px 1fr;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;position:relative}
 .rank{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.6);color:#fff;font-weight:800;padding:2px 10px;border-radius:20px;font-size:.85rem;z-index:2}
 .thumbwrap{position:relative;display:block;background:#000}
 .thumb{width:100%;height:100%;object-fit:cover;display:block;aspect-ratio:16/9}
 .badge{position:absolute;right:8px;bottom:8px;color:#fff;font-weight:800;font-size:1.05rem;padding:4px 12px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.4)}
 .body{padding:16px 18px 18px 0}
 .title{font-size:1.1rem;margin:2px 0 8px;line-height:1.4}
 .title a{color:var(--txt);text-decoration:none}
 .title a:hover{color:var(--accent)}
 .meta{display:flex;flex-wrap:wrap;gap:12px;color:var(--sub);font-size:.85rem;margin-bottom:8px}
 .basis{font-size:.85rem;color:var(--sub);margin-bottom:10px}
 .desc{margin-bottom:12px}
 .desc summary{cursor:pointer;color:#7cc0ff;font-size:.85rem}
 .descbody{margin-top:8px;font-size:.85rem;color:#c3c8d1;white-space:normal;max-height:200px;overflow:auto;background:#12151b;padding:10px 12px;border-radius:8px;border:1px solid var(--line)}
 .clabel{font-size:.85rem;color:var(--sub);margin:6px 0 4px;font-weight:700}
 .comments{margin:0;padding-left:20px}
 .comments li{font-size:.85rem;margin-bottom:8px;line-height:1.5;color:#d7dae0}
 .comments li.none{list-style:none;margin-left:-20px;color:var(--sub)}
 .clikes{color:#ff8787;font-weight:700;margin-right:6px}
 a{color:#7cc0ff}
 @media(max-width:720px){.card{grid-template-columns:1fr}.body{padding:0 16px 16px}}
</style></head><body>
<header>
  <h1>🔴 vidIQ 고득점 영상 수집 결과</h1>
  <div class="sub">
    주제: <b>${esc(TOPIC)}</b> · 확인 시각: ${esc(stamp)}<br>
    검색 ${SEARCH_RESULTS}개 중 아웃라이어 배수 <b>${MIN_MULTIPLIER}x 이상</b> ${rows.length}개를 배수 높은 순으로 정렬했습니다.<br>
    ※ 배지의 "N배(x)"는 vidIQ 빨간 배지와 같은 개념 —
    영상 조회수 ÷ 채널 최근 영상 조회수 중앙값(과대성과·아웃라이어) 입니다.
  </div>
</header>
<div class="grid">
${cards || '<p class="sub">조건에 맞는 영상이 없습니다. config.json 의 minMultiplier 를 낮춰 다시 시도해 보세요.</p>'}
</div>
</body></html>`;
}

async function main() {
  checkPrereqs();
  console.log(`\nvidIQ 고득점 영상 수집 시작`);
  console.log(`  주제        : ${TOPIC}`);
  console.log(`  검색 개수   : ${SEARCH_RESULTS}`);
  console.log(`  최소 배수   : ${MIN_MULTIPLIER}x`);
  console.log(`  댓글 상위   : ${TOP_COMMENTS}개\n`);

  console.log("[1/4] 유튜브 검색 중...");
  const ids = await searchVideos(TOPIC, SEARCH_RESULTS);
  if (!ids.length) die("검색 결과가 없습니다. 주제를 바꿔 보세요.");
  console.log(`      영상 ${ids.length}개 발견`);

  console.log("[2/4] 영상 정보 수집 중...");
  const videos = await fetchVideos(ids);

  console.log("[3/4] 채널 기준선 계산 및 아웃라이어 배수 산출 중...");
  for (const v of videos) {
    const base = await channelBaseline(v.channelId);
    v.baselineMedian = base.median;
    v.baselineSubscribers = base.subscribers;
    v.multiplier = computeMultiplier(v, base);
  }

  let kept = videos.filter((v) => v.multiplier >= MIN_MULTIPLIER);
  kept.sort((a, b) => b.multiplier - a.multiplier);
  console.log(`      배수 ${MIN_MULTIPLIER}x 이상 ${kept.length}개 선정`);

  console.log("[4/4] 좋아요 많은 댓글 수집 중...");
  for (const v of kept) {
    v.comments = await topComments(v.id, TOP_COMMENTS);
    console.log(`      ${String(v.multiplier).padStart(6)}x  ${v.title.slice(0, 40)}`);
  }

  const stamp = new Date().toLocaleString("ko-KR");

  // 결과 저장
  fs.writeFileSync(path.join(__dirname, "report.html"), buildHtml(kept, stamp));

  const jsonOut = kept.map((v) => ({
    multiplier: v.multiplier,
    url: v.url,
    thumbnail: v.thumbnail,
    title: v.title,
    description: v.description,
    channelTitle: v.channelTitle,
    views: v.views,
    likes: v.likes,
    topComments: v.comments,
  }));
  fs.writeFileSync(path.join(__dirname, "results.json"), JSON.stringify({ topic: TOPIC, generatedAt: stamp, count: jsonOut.length, videos: jsonOut }, null, 2));

  const csvEsc = (s) => '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
  const csv = ["배수,링크,제목,채널,조회수,좋아요,썸네일"]
    .concat(kept.map((v) => [v.multiplier, v.url, csvEsc(v.title), csvEsc(v.channelTitle), v.views, v.likes, v.thumbnail].join(",")))
    .join("\n");
  fs.writeFileSync(path.join(__dirname, "results.csv"), "﻿" + csv);

  console.log(`\n완료 ✅  결과 저장:`);
  console.log(`  - ${path.join(__dirname, "report.html")}  (표/썸네일/댓글 리포트)`);
  console.log(`  - ${path.join(__dirname, "results.json")}`);
  console.log(`  - ${path.join(__dirname, "results.csv")}\n`);
}

if (require.main === module) {
  main().catch((e) => die(e && e.message ? e.message : String(e)));
} else {
  module.exports = { buildHtml, computeMultiplier, median, badgeColor };
}
