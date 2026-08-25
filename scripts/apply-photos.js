"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const meta = {
  "senior-benefits-age": { h: 783, alt: "지하철 승강장 — 만 65세 이상 무임승차·경로우대", cap: "▲ 만 65세부터 지하철 무임승차 등 경로우대가 시작됩니다." },
  "age-table-2026": { h: 800, alt: "새해를 맞아 뛰어오르는 사람들 — 2026년 나이", cap: "▲ 해가 바뀌면 태어난 해로 세는 나이도 함께 올라갑니다." },
  "milestone-ages": { h: 800, alt: "지팡이를 짚고 산책하는 어르신 — 환갑·칠순·팔순", cap: "▲ 환갑(60)·칠순(70)·팔순(80)은 장수를 축하하는 대표 나이입니다." },
  "rrn-age-decode": { h: 800, alt: "아기의 발 — 출생과 주민등록번호", cap: "▲ 태어나면 생년월일·성별이 담긴 주민등록번호가 부여됩니다." }
};

Object.keys(meta).forEach(function (slug) {
  const f = path.join(ROOT, "posts", slug + ".html");
  let s = fs.readFileSync(f, "utf8");

  // 1) 모든 svg 경로 → jpg (og:image, JSON-LD image, 상단 figure src)
  s = s.split("/img/" + slug + ".svg").join("/img/" + slug + ".jpg");

  // 2) 상단 figure(post-shot) 블록 제거
  s = s.replace(/\n[ \t]*<figure class="post-shot">[\s\S]*?<\/figure>\n/, "\n");

  // 3) 첫 h2 섹션의 첫 문단 뒤에 figure 삽입
  const m = meta[slug];
  const fig = "\n      <figure class=\"post-shot\">\n" +
    "        <img src=\"/img/" + slug + ".jpg\" alt=\"" + m.alt + "\" width=\"1200\" height=\"" + m.h + "\" loading=\"lazy\">\n" +
    "        <figcaption>" + m.cap + "</figcaption>\n" +
    "      </figure>";
  let inserted = false;
  s = s.replace(/<h2[^>]*>[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>/, function (x) { inserted = true; return x + fig; });

  fs.writeFileSync(f, s);
  console.log(slug, inserted ? "OK figure inserted" : "WARN no insert point",
    "| svg left:", (s.match(new RegExp(slug + "\\.svg", "g")) || []).length,
    "| figcaption:", (s.match(/figcaption/g) || []).length);
});
