"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const meta = {
  "pension-start-age": { h: 831, alt: "공원 벤치에 앉은 노인 — 국민연금 수급 나이", cap: "▲ 국민연금 노령연금은 출생연도에 따라 62~65세부터 받습니다." },
  "age-types-korean": { h: 911, alt: "다이어리와 손목시계 — 만·세는·연 나이", cap: "▲ 만·세는·연 나이는 '무엇을 기준으로 세느냐'에서 갈립니다." },
  "fast-year-birth": { h: 800, alt: "물음표를 떠올리는 사람 — 빠른 년생 개념", cap: "▲ 빠른 년생은 '나이'가 아니라 '학년'이 한 해 빠른 것입니다." },
  "birthyear-to-hakbeon": { h: 790, alt: "책과 가방을 든 학생 — 몇년생·학번", cap: "▲ 입학연도(학번)는 보통 '출생연도 + 19'입니다." }
};

Object.keys(meta).forEach(function (slug) {
  const f = path.join(ROOT, "posts", slug + ".html");
  let s = fs.readFileSync(f, "utf8");
  s = s.split("/img/" + slug + ".svg").join("/img/" + slug + ".jpg");
  s = s.replace(/\n[ \t]*<figure class="post-shot">[\s\S]*?<\/figure>\n/, "\n");
  const m = meta[slug];
  const fig = "\n      <figure class=\"post-shot\">\n" +
    "        <img src=\"/img/" + slug + ".jpg\" alt=\"" + m.alt + "\" width=\"1200\" height=\"" + m.h + "\" loading=\"lazy\">\n" +
    "        <figcaption>" + m.cap + "</figcaption>\n" +
    "      </figure>";
  let inserted = false;
  s = s.replace(/<h2[^>]*>[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>/, function (x) { inserted = true; return x + fig; });
  fs.writeFileSync(f, s);
  console.log(slug, inserted ? "OK" : "WARN no insert", "| svg left:", (s.match(new RegExp(slug + "\\.svg", "g")) || []).length);
});
