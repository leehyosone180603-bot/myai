"use strict";
/* 정적 가이드 4편: 스크린샷 figure는 유지하고, 실제 사진을 본문에 추가 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const meta = {
  "age-calculator": { h: 798, alt: "세월을 보여주는 오래된 나무 — 나이", cap: "▲ '만 나이'는 태어난 날을 기준으로 실제 살아온 햇수를 셉니다." },
  "military-discharge": { h: 802, alt: "노을 앞에서 경례하는 군인 실루엣 — 전역", cap: "▲ 입대일과 군별만 알면 만기 전역일과 전역 D-day가 나옵니다." },
  "business-days-guide": { h: 800, alt: "지갑 속 카드 — 은행 영업일·결제", cap: "▲ 은행 '5영업일'은 주말·공휴일을 빼고 셉니다." },
  "birth-year-guide": { h: 801, alt: "십이지 열두 띠 석상 — 몇년생·띠 찾기", cap: "▲ 십이지 열두 띠는 12년 주기로 돌아옵니다." }
};

Object.keys(meta).forEach(function (slug) {
  const f = path.join(ROOT, "posts", slug + ".html");
  let s = fs.readFileSync(f, "utf8");

  // og:image 만 png -> jpg (본문 스크린샷 <img>는 건드리지 않음)
  s = s.replace(new RegExp('(og:image" content="https://calcbox\\.kr/img/' + slug + ')\\.png"'), '$1.jpg"');

  // 새 사진 figure를 첫 h2 섹션의 첫 문단 뒤에 삽입 (스크린샷 figure는 유지)
  const m = meta[slug];
  const fig = "\n      <figure class=\"post-shot\">\n" +
    "        <img src=\"/img/" + slug + ".jpg\" alt=\"" + m.alt + "\" width=\"1200\" height=\"" + m.h + "\" loading=\"lazy\">\n" +
    "        <figcaption>" + m.cap + "</figcaption>\n" +
    "      </figure>";
  let inserted = false;
  s = s.replace(/<h2[^>]*>[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>/, function (x) { inserted = true; return x + fig; });

  fs.writeFileSync(f, s);
  console.log(slug, inserted ? "OK figure added" : "WARN no insert",
    "| og jpg:", /og:image[^>]*\.jpg/.test(s) ? "y" : "n",
    "| screenshot png kept:", s.indexOf("/img/" + slug + ".png") !== -1 ? "y" : "n");
});
