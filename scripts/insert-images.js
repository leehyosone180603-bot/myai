"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const dims = JSON.parse(fs.readFileSync(path.join(ROOT, "blog", "img", "dims.json"), "utf8"));

// 글(slug) → { img: 이미지이름, alt, caption }
const MAP = {
  "salary-net-pay": { img: "salary", alt: "연봉 실수령액 계산기 사용 화면 - 연봉 4000만원 월 실수령액 결과", caption: "▲ 한국인계산기 연봉 실수령액 계산기 화면" },
  "high-salary": { img: "salary", alt: "연봉 실수령액 계산기 사용 화면 (고연봉 월 실수령액)", caption: "▲ 한국인계산기 연봉 실수령액 계산기 화면" },
  "age-calculator": { img: "age", alt: "만 나이 계산기 사용 화면 - 생년월일로 만 나이·띠 계산", caption: "▲ 한국인계산기 만 나이 계산기 화면" },
  "birth-year-guide": { img: "birth-year", alt: "몇년생 계산기 사용 화면 - 나이로 출생연도·띠 찾기", caption: "▲ 한국인계산기 몇년생 계산기 화면" },
  "vat-guide": { img: "vat", alt: "부가세 계산기 사용 화면 - 공급가액 100만원 부가세 계산 결과", caption: "▲ 한국인계산기 부가세 계산기 화면" },
  "severance-pay": { img: "severance", alt: "퇴직금 계산기 사용 화면 - 평균임금 기준 예상 퇴직금", caption: "▲ 한국인계산기 퇴직금 계산기 화면" },
  "freelancer-tax": { img: "freelancer", alt: "프리랜서 세금 계산기 사용 화면 - 3.3% 원천징수 후 실수령액", caption: "▲ 한국인계산기 프리랜서 세금 계산기 화면" },
  "military-discharge": { img: "military", alt: "전역일 계산기 사용 화면 - 전역일과 전역 D-day 결과", caption: "▲ 한국인계산기 전역일 계산기 화면" },
  "business-days-guide": { img: "business-days", alt: "영업일 계산기 사용 화면 - 주말·공휴일 제외 영업일 수", caption: "▲ 한국인계산기 영업일 계산기 화면" },
  "lotto-prize-tax": { img: "lotto-prize", alt: "로또 당첨금 실수령액 계산기 사용 화면 - 세후 실수령액", caption: "▲ 한국인계산기 로또 당첨금 실수령액 계산기 화면" },
  "lotto-number": { img: "lotto", alt: "로또 번호 추출기 사용 화면 - 6개 번호와 보너스 번호", caption: "▲ 한국인계산기 로또 번호 추출기 화면" }
};

Object.keys(MAP).forEach(function (slug) {
  const file = path.join(ROOT, "blog", slug, "index.html");
  if (!fs.existsSync(file)) { console.log("SKIP(없음):", slug); return; }
  let html = fs.readFileSync(file, "utf8");
  const m = MAP[slug];
  const d = dims[m.img];
  const w = 1280, h = d ? d.h * 2 : 1600; // deviceScaleFactor 2

  // 1) CSS 버전 상향 (figure 스타일 반영)
  html = html.replace("style.css?v=5", "style.css?v=6");

  // 2) og:image 추가 (이미 있으면 건너뜀)
  if (html.indexOf('property="og:image"') === -1) {
    html = html.replace(
      /(<meta property="og:url"[^>]*>)/,
      '$1\n  <meta property="og:image" content="https://calcbox.kr/blog/img/' + m.img + '.png">'
    );
  }

  // 3) 첫 <h2> 앞에 스크린샷 figure 삽입 (이미 있으면 건너뜀)
  if (html.indexOf('class="post-shot"') === -1) {
    const fig =
      '      <figure class="post-shot">\n' +
      '        <img src="../img/' + m.img + '.png" alt="' + m.alt + '" width="' + w + '" height="' + h + '" loading="lazy">\n' +
      '        <figcaption>' + m.caption + '</figcaption>\n' +
      '      </figure>\n\n';
    html = html.replace(/\n(\s*)<h2(?=[ >])/, "\n" + fig + "$1<h2");
  }

  fs.writeFileSync(file, html);
  console.log("이미지 삽입:", slug, "→", m.img + ".png", w + "x" + h);
});
console.log("완료");
