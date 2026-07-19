#!/usr/bin/env node
/*
 * 색인(검색 노출) 확인 프로그램 — 구글 / 네이버 / 다음
 * ----------------------------------------------------------------
 * 사이트맵(sitemap.xml)에서 사이트의 모든 페이지 URL을 읽어와,
 * 각 URL이 포털별 검색에 "색인(수집)"되어 있는지 site: 검색으로 확인하고
 * 콘솔과 report.html / report.csv 로 정리합니다.
 *
 * 실행:  node index-check.js
 * 브라우저 창을 보며 실행(구글 차단 회피에 도움):
 *        Windows: set HEADLESS=false && node index-check.js
 *        Mac/Linux: HEADLESS=false node index-check.js
 */
"use strict";

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const SITEMAP = CFG.sitemap || "https://calcbox.kr/sitemap.xml";
const DOMAIN = CFG.domain || "calcbox.kr";
const ENGINES = CFG.engines || ["google", "naver", "daum"];
const MAX_URLS = CFG.maxUrls || 0; // 0 = 전체
const HEADLESS = process.env.HEADLESS !== "false";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// site: 검색어는 프로토콜 없이 host/path 로 (예: calcbox.kr/blog/x/)
function siteTerm(url) {
  return "site:" + url.replace(/^https?:\/\//, "");
}

const ENGINE_DEFS = {
  google: {
    label: "구글",
    delay: 3500,
    url: (term) => `https://www.google.com/search?hl=ko&num=10&q=${encodeURIComponent(term)}`,
    blockMarkers: ["unusual traffic", "비정상적인 트래픽", "g-recaptcha", "systems have detected", "자동으로 전송된"],
    noResult: ["did not match any documents", "일치하는 문서가 없", "결과가 없습니다"]
  },
  naver: {
    label: "네이버",
    delay: 1400,
    url: (term) => `https://search.naver.com/search.naver?ssc=tab.web.all&query=${encodeURIComponent(term)}`,
    blockMarkers: ["비정상적인 검색", "자동 입력 방지"],
    noResult: ["검색결과가 없습니다", "에 대한 검색결과가 없"]
  },
  daum: {
    label: "다음",
    delay: 1400,
    url: (term) => `https://search.daum.net/search?w=web&q=${encodeURIComponent(term)}`,
    blockMarkers: ["자동 입력 방지", "비정상적인"],
    noResult: ["검색결과가 없습니다", "에 대한 검색결과가 없"]
  }
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function loadSitemapUrls(ctx) {
  const page = await ctx.newPage();
  await page.goto(SITEMAP, { waitUntil: "domcontentloaded", timeout: 25000 });
  const xml = await page.content();
  await page.close();
  const urls = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) urls.push(m[1].trim());
  return urls;
}

// 한 URL × 한 엔진: 색인 여부 판정
async function checkOne(ctx, engineKey, url) {
  const def = ENGINE_DEFS[engineKey];
  const target = url.replace(/^https?:\/\//, "").replace(/\/$/, ""); // calcbox.kr/blog/x
  const page = await ctx.newPage();
  let status = "unknown";
  try {
    await page.goto(def.url(siteTerm(url)), { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1200);
    const info = await page.evaluate((args) => {
      const { target } = args;
      const bodyText = (document.body.innerText || "").toLowerCase();
      // 결과 링크에 해당 페이지가 있는가 (검색창 에코가 아닌 실제 결과 링크)
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      let hit = false;
      for (const a of anchors) {
        let h = a.href;
        try { h = decodeURIComponent(h); } catch (e) {}
        if (/search\.naver|search\.daum|google\.[a-z.]+\/search|accounts\.google|support\.google/.test(h)) continue;
        if (h.replace(/^https?:\/\//, "").replace(/\/$/, "").indexOf(target) === 0) { hit = true; break; }
      }
      return { hit: hit, text: bodyText.slice(0, 4000) };
    }, { target });

    const blocked = def.blockMarkers.some((s) => info.text.indexOf(s.toLowerCase()) !== -1);
    const noRes = def.noResult.some((s) => info.text.indexOf(s.toLowerCase()) !== -1);
    if (blocked) status = "blocked";
    else if (info.hit) status = "indexed";
    else if (noRes) status = "no";
    else status = "no"; // 결과 링크도 없고 명시적 no-result도 애매하면 미색인으로 간주
  } catch (e) {
    status = "error";
  }
  await page.close();
  await sleep(def.delay);
  return status;
}

function typeOf(url) {
  if (url.indexOf("/blog/") !== -1) return "블로그";
  if (/calcbox\.kr\/?$/.test(url)) return "홈";
  return "계산기/페이지";
}

const MARK = { indexed: "✅ 색인", no: "❌ 미색인", blocked: "⚠️ 확인불가(차단)", error: "⚠️ 오류", unknown: "-" };

function buildHtml(rows, stamp) {
  const engines = ENGINES.map((e) => ENGINE_DEFS[e].label);
  const head = ["URL", "구분"].concat(engines).map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((r) => {
    const tds = ENGINES.map((e) => {
      const s = r.result[e];
      const cls = s === "indexed" ? "ok" : (s === "no" ? "no" : "warn");
      return `<td style="text-align:center" class="${cls}">${MARK[s] || "-"}</td>`;
    }).join("");
    return `<tr><td><a href="${r.url}" target="_blank">${r.url}</a></td><td>${r.type}</td>${tds}</tr>`;
  }).join("\n");

  const sum = ENGINES.map((e) => {
    const idx = rows.filter((r) => r.result[e] === "indexed").length;
    return `${ENGINE_DEFS[e].label} ${idx}/${rows.length}`;
  }).join(" · ");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title>색인 확인 리포트 - ${DOMAIN}</title>
<style>
 body{font-family:"Malgun Gothic",system-ui,sans-serif;background:#f4f6fb;color:#2b2d42;margin:0;padding:24px}
 h1{font-size:1.4rem}.meta{color:#6c757d;margin:6px 0 16px;font-size:.9rem}
 table{width:100%;border-collapse:collapse;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.06);border-radius:10px;overflow:hidden}
 th,td{padding:10px 12px;border-bottom:1px solid #eef;font-size:.9rem;text-align:left}
 th{background:#3b5bdb;color:#fff}
 tr:hover{background:#fafbff}
 .ok{color:#2b8a3e;font-weight:700}.no{color:#e03131;font-weight:700}.warn{color:#e8590c;font-weight:700}
 a{color:#3b5bdb;word-break:break-all}
 .summary{background:#fff;border-radius:10px;padding:14px 18px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,.06);font-weight:700}
</style></head><body>
<h1>🔎 색인(검색 노출) 확인 리포트 — ${DOMAIN}</h1>
<div class="meta">확인 시각: ${stamp} · 대상 URL ${rows.length}개 · 엔진: ${engines.join(", ")}</div>
<div class="summary">색인된 페이지: ${sum}</div>
<table><thead><tr>${head}</tr></thead><tbody>
${body}
</tbody></table>
<p class="meta">※ 포털의 <b>site:</b> 검색 결과를 기준으로 한 근사 판정입니다. 색인 직후·재수집 시점에 따라 실제와 차이가 있을 수 있습니다. ⚠️ 확인불가(차단)는 포털이 자동 접근을 일시 제한한 경우로, 잠시 후 다시 실행하거나 HEADLESS=false 로 실행해 보세요.</p>
</body></html>`;
}

(async () => {
  console.log(`\n색인 확인 시작 — 대상: ${DOMAIN}`);
  const browser = await chromium.launch({ headless: HEADLESS });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 }, locale: "ko-KR" });

  console.log(`사이트맵에서 URL 읽는 중: ${SITEMAP}`);
  let urls = await loadSitemapUrls(ctx);
  if (MAX_URLS > 0) urls = urls.slice(0, MAX_URLS);
  console.log(`확인할 페이지 ${urls.length}개 × 엔진 ${ENGINES.length}개\n`);

  const rows = [];
  for (const url of urls) {
    const result = {};
    for (const e of ENGINES) result[e] = await checkOne(ctx, e, url);
    const row = { url: url, type: typeOf(url), result: result };
    rows.push(row);
    const line = ENGINES.map((e) => `${ENGINE_DEFS[e].label}:${(MARK[result[e]] || "-").replace(/[✅❌⚠️ ]/g, "").slice(0, 4) || "-"}`).join("  ");
    console.log(`${url.padEnd(48)} ${line}`);
  }

  await browser.close();

  const stamp = new Date().toLocaleString("ko-KR");
  fs.writeFileSync(path.join(__dirname, "report.html"), buildHtml(rows, stamp));
  const header = ["URL", "구분"].concat(ENGINES.map((e) => ENGINE_DEFS[e].label)).join(",");
  const csv = [header].concat(rows.map((r) => [r.url, r.type].concat(ENGINES.map((e) => (MARK[r.result[e]] || "-").replace(/[✅❌⚠️]/g, "").trim())).join(","))).join("\n");
  fs.writeFileSync(path.join(__dirname, "report.csv"), "﻿" + csv);

  console.log(`\n완료 ✅  리포트 저장:`);
  console.log(`  - ${path.join(__dirname, "report.html")}`);
  console.log(`  - ${path.join(__dirname, "report.csv")}\n`);
})();
