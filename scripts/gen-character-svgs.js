"use strict";
/* 궁합 결과 유형별 캐릭터 SVG 4종 생성 (/assets/characters/<id>.svg) */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const dir = path.join(ROOT, "assets", "characters");
fs.mkdirSync(dir, { recursive: true });

var C = [
  { id: "cosmic_explorers", g1: "#9b5de5", g2: "#5f3dc4", cheek: "#ff8fab", acc: "⭐", accs: ["#ffd43b"] },
  { id: "playful_rivals", g1: "#ffd43b", g2: "#f59f00", cheek: "#ff6b6b", acc: "✨", accs: ["#fff3bf"] },
  { id: "silent_anchors", g1: "#69db7c", g2: "#2f9e44", cheek: "#ffa8a8", acc: "🌙", accs: ["#d3f9d8"] },
  { id: "polar_alchemists", g1: "#ced4da", g2: "#868e96", cheek: "#ffc9c9", acc: "🌀", accs: ["#f1f3f5"] }
];

function svg(c) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="궁합 캐릭터">\n' +
    '  <defs><radialGradient id="g" cx="40%" cy="35%" r="75%">' +
    '<stop offset="0" stop-color="' + c.g1 + '"/><stop offset="1" stop-color="' + c.g2 + '"/></radialGradient></defs>\n' +
    '  <rect width="400" height="400" fill="none"/>\n' +
    '  <circle cx="200" cy="205" r="150" fill="url(#g)"/>\n' +
    // 반짝이
    '  <circle cx="92" cy="90" r="7" fill="#fff" opacity=".85"/>' +
    '  <circle cx="320" cy="120" r="5" fill="#fff" opacity=".7"/>' +
    '  <circle cx="300" cy="300" r="6" fill="#fff" opacity=".6"/>\n' +
    // 눈
    '  <ellipse cx="158" cy="195" rx="22" ry="26" fill="#fff"/>' +
    '  <ellipse cx="242" cy="195" rx="22" ry="26" fill="#fff"/>' +
    '  <circle cx="163" cy="200" r="11" fill="#2b2d42"/>' +
    '  <circle cx="247" cy="200" r="11" fill="#2b2d42"/>' +
    '  <circle cx="167" cy="196" r="3.5" fill="#fff"/>' +
    '  <circle cx="251" cy="196" r="3.5" fill="#fff"/>\n' +
    // 볼터치
    '  <circle cx="138" cy="240" r="14" fill="' + c.cheek + '" opacity=".55"/>' +
    '  <circle cx="262" cy="240" r="14" fill="' + c.cheek + '" opacity=".55"/>\n' +
    // 입
    '  <path d="M175 243 Q200 268 225 243" stroke="#2b2d42" stroke-width="7" fill="none" stroke-linecap="round"/>\n' +
    // 악센트 이모지
    '  <text x="300" y="110" font-size="46" text-anchor="middle">' + c.acc + '</text>\n' +
    '</svg>\n';
}

C.forEach(function (c) { fs.writeFileSync(path.join(dir, c.id + ".svg"), svg(c)); });
console.log("character svgs:", C.length);
