#!/usr/bin/env node
/*
 * 검색 순위 확인 프로그램 (네이버 / 다음)
 * ----------------------------------------------------------------
 * keywords.json 의 키워드를 네이버·다음에서 검색해,
 * 내 사이트(domain)가 "몇 페이지 / 어느 영역 / 대략 몇 번째"에 나오는지 찾아
 * 콘솔과 report.html 로 정리해 줍니다.
 *
 * 실행:  node rank-check.js
 * 브라우저 창을 보려면:  HEADLESS=false node rank-check.js   (윈도우: set HEADLESS=false && node rank-check.js)
 */
"use strict";

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "keywords.json"), "utf8"));
const DOMAIN = CFG.domain || "calcbox.kr";
const MAX_PAGES = CFG.maxPages || 5;
const ENGINES = CFG.engines || ["naver", "daum"];
const VERTS = CFG.verticals || ["웹문서", "통합"];
const HEADLESS = process.env.HEADLESS !== "false";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// 엔진별 검색 URL 빌더 (p = 1부터)
const ENGINE_DEFS = {
  naver: {
    label: "네이버",
    host: "naver.com",
    verticals: {
      "웹문서": (q, p) => `https://search.naver.com/search.naver?ssc=tab.web.all&query=${encodeURIComponent(q)}&start=${(p - 1) * 10 + 1}`,
      "블로그": (q, p) => `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(q)}&start=${(p - 1) * 10 + 1}`,
      "통합": (q, p) => `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}&start=${(p - 1) * 10 + 1}`
    }
  },
  daum: {
    label: "다음",
    host: "daum.net",
    verticals: {
      "웹문서": (q, p) => `https://search.daum.net/search?w=web&q=${encodeURIComponent(q)}&p=${p}`,
      "블로그": (q, p) => `https://search.daum.net/search?w=blog&q=${encodeURIComponent(q)}&p=${p}`,
      "통합": (q, p) => `https://search.daum.net/search?w=tot&q=${encodeURIComponent(q)}&p=${p}`
    }
  }
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 한 페이지에서 domain 을 찾아 대략 순위/제목/URL 반환 (없으면 null)
async function scanPage(page, url, domain, engineHost) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(1000);
  // 지연 로딩(무한스크롤) 대응: 몇 번 스크롤
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(400);
  }
  return page.evaluate((args) => {
    const { domain, engineHost } = args;
    const anchors = Array.from(document.querySelectorAll("a[href^='http']"));
    const seen = new Set();
    let rank = 0;
    for (const a of anchors) {
      const href = a.href;
      if (href.indexOf(engineHost) !== -1) continue;        // 검색엔진 내부 링크 제외
      const text = (a.innerText || a.textContent || "").trim();
      if (!text) continue;
      if (seen.has(href)) continue;
      seen.add(href);
      rank++;                                                 // 결과성 외부 링크 순번(대략 순위)
      if (href.indexOf(domain) !== -1) {
        return { rank: rank, href: href, title: text.slice(0, 90) };
      }
    }
    return null;
  }, { domain, engineHost });
}

// 한 키워드 × 한 엔진: 영역/페이지를 돌며 첫 노출 위치 찾기
async function checkKeyword(ctx, engineKey, keyword) {
  const def = ENGINE_DEFS[engineKey];
  for (const vert of VERTS) {
    const build = def.verticals[vert];
    if (!build) continue;
    for (let p = 1; p <= MAX_PAGES; p++) {
      const page = await ctx.newPage();
      let hit = null;
      try {
        hit = await scanPage(page, build(keyword, p), DOMAIN, def.host);
      } catch (e) {
        hit = null;
      }
      await page.close();
      await sleep(600 + Math.floor((keyword.length * 37) % 500)); // 예의상 지연
      if (hit) {
        const type = hit.href.indexOf("/blog/") !== -1 ? "블로그 글" : "계산기/페이지";
        return { found: true, engine: def.label, vertical: vert, page: p, rank: hit.rank, title: hit.title, url: hit.href, type: type };
      }
    }
  }
  return { found: false, engine: def.label, vertical: "-", page: null, rank: null, title: "", url: "", type: "-" };
}

function fmt(r) {
  if (!r.found) return `❌ 미노출 (${MAX_PAGES}페이지까지 확인)`;
  return `✅ [${r.type}] ${r.vertical} ${r.page}페이지 · 대략 ${r.rank}번째`;
}

function buildHtml(rows, stamp) {
  const tr = rows.map((r) => {
    const status = r.found
      ? `<span class="ok">✅ 노출</span>`
      : `<span class="no">❌ 미노출</span>`;
    return `<tr>
      <td>${r.keyword}</td>
      <td>${r.engine}</td>
      <td>${status}</td>
      <td>${r.found ? r.type : "-"}</td>
      <td>${r.found ? r.vertical : "-"}</td>
      <td style="text-align:center">${r.found ? r.page + "페이지" : "-"}</td>
      <td style="text-align:center">${r.found ? "약 " + r.rank + "번째" : "-"}</td>
      <td>${r.found ? `<a href="${r.url}" target="_blank">${(r.title || r.url).replace(/</g, "&lt;")}</a>` : "-"}</td>
    </tr>`;
  }).join("\n");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>검색 순위 리포트 - ${DOMAIN}</title>
<style>
 body{font-family:"Malgun Gothic",system-ui,sans-serif;background:#f4f6fb;color:#2b2d42;margin:0;padding:24px}
 h1{font-size:1.4rem}.meta{color:#6c757d;margin-bottom:16px;font-size:.9rem}
 table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.06);border-radius:10px;overflow:hidden}
 th,td{padding:11px 12px;border-bottom:1px solid #eef;font-size:.92rem;text-align:left}
 th{background:#3b5bdb;color:#fff}
 tr:hover{background:#fafbff}
 .ok{color:#2b8a3e;font-weight:700}.no{color:#e03131;font-weight:700}
 a{color:#3b5bdb}
</style></head><body>
<h1>🔎 검색 순위 리포트 — ${DOMAIN}</h1>
<div class="meta">확인 시각: ${stamp} · 엔진: ${ENGINES.join(", ")} · 확인 영역: ${VERTS.join(", ")} · 최대 ${MAX_PAGES}페이지</div>
<table>
<thead><tr><th>키워드</th><th>검색엔진</th><th>노출</th><th>구분</th><th>영역</th><th>페이지</th><th>대략 순위</th><th>발견된 결과(제목/URL)</th></tr></thead>
<tbody>
${tr}
</tbody></table>
<p class="meta">※ "대략 순위"는 페이지 내 결과성 링크 기준 근사값이며, 광고·스마트블록 등으로 실제 화면과 차이가 있을 수 있습니다. 검색 결과는 지역·개인화·시점에 따라 달라집니다.</p>
</body></html>`;
}

(async () => {
  console.log(`\n검색 순위 확인 시작 — 대상: ${DOMAIN}`);
  console.log(`키워드 ${CFG.keywords.length}개 × 엔진 ${ENGINES.length}개 × 영역 ${VERTS.length}개 (최대 ${MAX_PAGES}p)\n`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 }, locale: "ko-KR" });

  const rows = [];
  for (const keyword of CFG.keywords) {
    for (const engineKey of ENGINES) {
      const r = await checkKeyword(ctx, engineKey, keyword);
      r.keyword = keyword;
      rows.push(r);
      console.log(`[${r.engine}] ${keyword.padEnd(16)} → ${fmt(r)}`);
    }
  }

  await browser.close();

  const stamp = new Date().toLocaleString("ko-KR");
  const outHtml = path.join(__dirname, "report.html");
  fs.writeFileSync(outHtml, buildHtml(rows, stamp));

  // CSV 도 저장
  const csv = ["키워드,검색엔진,노출,구분,영역,페이지,대략순위,URL"]
    .concat(rows.map((r) => [r.keyword, r.engine, r.found ? "노출" : "미노출", r.found ? r.type : "", r.found ? r.vertical : "", r.found ? r.page : "", r.found ? r.rank : "", r.url].join(",")))
    .join("\n");
  fs.writeFileSync(path.join(__dirname, "report.csv"), "﻿" + csv);

  console.log(`\n완료 ✅  리포트 저장:`);
  console.log(`  - ${outHtml}`);
  console.log(`  - ${path.join(__dirname, "report.csv")}\n`);
})();
