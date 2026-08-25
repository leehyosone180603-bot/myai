/* =============================================================
   posts.js — 사이트의 데이터 계층 (글·카테고리)
   -------------------------------------------------------------
   ▶ 새 글 추가 방법
     1) /posts/_template.html 을 복사해 /posts/<슬러그>.html 로 저장하고 내용 작성
     2) 아래 POSTS 배열 "맨 위"에 한 줄 추가 (최신 글이 위로 오도록)
        { id, title, summary, category, date, url, image }
     - category 값은 아래 CATEGORIES 의 키(slug)와 일치해야 합니다.
     - date 는 "YYYY.MM.DD" 형식(문자열 정렬로 최신순 처리).
     - image 는 카드 썸네일 경로(/img/... , 가급적 실제 사진 권장).
   ============================================================= */

/* 카테고리: slug(키) → {name 표시명, ready 준비 여부, color 포인트색} */
var CATEGORIES = {
  age:       { name: "만 나이·나이계산", ready: true,  color: "#3b5bdb" },
  birthyear: { name: "몇년생·띠·학번",   ready: true,  color: "#2b8a3e" },
  system:    { name: "나이기준·제도",     ready: true,  color: "#e8590c" },
  date:      { name: "날짜계산",          ready: true,  color: "#9c36b5" },
  life:      { name: "생활정보",          ready: false, color: "#1098ad" },
  column:    { name: "칼럼",              ready: false, color: "#c2255c" }
};

/* 상단 네비게이션에 노출할 카테고리 순서 */
var NAV_ORDER = ["age", "birthyear", "system", "date", "life", "column"];

/* 글 목록: 최신 글이 배열 맨 위 */
var POSTS = [
  { id: "zodiac-year-age", title: "십이지 띠로 나이·출생연도 찾기 — 내 띠, N띠는 몇년생·몇 살?", summary: "열두 띠별 출생연도와 2026년 나이를 표로 한눈에. 띠로 나이를 가늠할 때 헷갈리는 점까지 정리했습니다.", category: "birthyear", date: "2026.08.13", url: "/posts/zodiac-year-age.html", image: "/img/zodiac-year-age.jpg" },
  { id: "elementary-school-age", title: "초등학교 입학 나이 — 몇년생이 몇 년에 입학? (2026년 기준 표)", summary: "출생연도별 초등학교 입학연도 표와 2026년 학년별 몇년생, 조기입학·유예까지 정리했습니다.", category: "birthyear", date: "2026.08.13", url: "/posts/elementary-school-age.html", image: "/img/elementary-school-age.jpg" },
  { id: "age-table-2026", title: "2026년 나이표 총정리 — 출생연도별 올해 만 나이·띠 한눈에", summary: "출생연도별 2026 만 나이·띠표. 연말연초에 왜 제일 헷갈리는지, 나이로 출생연도 역산까지.", category: "age", date: "2026.07.27", url: "/posts/age-table-2026.html", image: "/img/age-table-2026.jpg" },
  { id: "rrn-age-decode", title: "주민등록번호로 나이·출생연도·성별 알아내는 법", summary: "뒷자리 첫 숫자로 세기·성별·나이 읽기 + 7자리 각 의미(6번째=신고순번), 지역번호 폐지까지.", category: "age", date: "2026.07.26", url: "/posts/rrn-age-decode.html", image: "/img/rrn-age-decode.jpg" },
  { id: "milestone-ages", title: "환갑·진갑·칠순·팔순·구순은 몇 살? 나이별 기념 명칭 총정리", summary: "환갑·칠순·팔순 몇 살? 만나이 통일돼도 칠순·팔순은 그대로 + 여행 대체 트렌드까지.", category: "system", date: "2026.07.25", url: "/posts/milestone-ages.html", image: "/img/milestone-ages.jpg" },
  { id: "senior-benefits-age", title: "지하철 무임승차·경로우대 나이 총정리 (만 65세 혜택)", summary: "지하철 무임·기초연금 만 65세 혜택. 자동 vs 신청 + 무임 연령 70세 상향 논의까지.", category: "system", date: "2026.07.24", url: "/posts/senior-benefits-age.html", image: "/img/senior-benefits-age.jpg" },
  { id: "pension-start-age", title: "국민연금 수급 개시 나이 — 출생연도별 노령연금 받는 나이 (2026)", summary: "출생연도별 62~65세부터. 실제 얼마 받나(왜 짠지)·기초연금 구분·조기/연기수급까지.", category: "system", date: "2026.07.23", url: "/posts/pension-start-age.html", image: "/img/pension-start-age.jpg" },
  { id: "birthyear-to-hakbeon", title: "몇년생 몇 학번? 출생연도–학번 환산표 (재수·빠른년생 포함)", summary: "출생연도 + 19 = 학번. 재수·빠른년생·같은 학번 나이차 + 입사동기·후배 족보 꼬임까지.", category: "birthyear", date: "2026.07.22", url: "/posts/birthyear-to-hakbeon.html", image: "/img/birthyear-to-hakbeon.jpg" },
  { id: "fast-year-birth", title: "빠른 년생이란? 빠른 05·06년생 학년·나이 완전정리", summary: "빠른 년생은 나이가 아니라 학년만 앞선다. 요즘 사회에선 어떻게 대하나(년도로 끊기·합의)까지.", category: "birthyear", date: "2026.07.21", url: "/posts/fast-year-birth.html", image: "/img/fast-year-birth.jpg" },
  { id: "age-types-korean", title: "만 나이 vs 세는 나이 vs 연 나이 차이 (2023 개정 후 완전정리)", summary: "세 나이 차이와 '같은 년생 형·친구?', '몇년생으로 답하기', 통일 오해(연금·정년)까지.", category: "age", date: "2026.07.20", url: "/posts/age-types-korean.html", image: "/img/age-types-korean.jpg" },
  { id: "birth-year-guide", title: "몇년생 계산기 — 나이로 출생연도·띠 찾기 (나이 조견표)", summary: "이제 나이 대신 '몇년생·띠'로 답하는 시대 — 나이↔출생연도↔띠 변환과 12띠표, 호적나이 주의점.", category: "birthyear", date: "2026.07.06", url: "/posts/birth-year-guide.html", image: "/img/birth-year-guide.png" },
  { id: "business-days-guide", title: "영업일 계산기 사용법 — 주말·공휴일 제외 영업일 수 구하는 법", summary: "주말·공휴일 제외 영업일 계산법 + 은행 '5영업일' 세는 법(대출 이자 예시)까지.", category: "date", date: "2026.07.04", url: "/posts/business-days-guide.html", image: "/img/business-days-guide.png" },
  { id: "military-discharge", title: "전역일 계산기 사용법 — 입대일로 전역일·전역 D-day 구하는 법", summary: "입대일로 전역일·D-day 구하기. 군별 복무기간 + 미복귀 전역·징계로 당겨지거나 밀리는 경우까지.", category: "date", date: "2026.07.03", url: "/posts/military-discharge.html", image: "/img/military-discharge.png" },
  { id: "age-calculator", title: "만 나이 계산기 사용법 — 만 나이·세는 나이 차이 한눈에", summary: "생년월일로 만 나이 1초 계산. 계산에서 가장 많이 틀리는 3가지.", category: "age", date: "2026.06.29", url: "/posts/age-calculator.html", image: "/img/age-calculator.png" }
];

/* 최신순 정렬된 배열 반환 (date 문자열 내림차순, 동일 날짜는 입력 순서 유지) */
function getPostsSorted() {
  return POSTS.slice().sort(function (a, b) {
    return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
  });
}

/* 특정 카테고리 글만 반환 */
function getPostsByCategory(slug) {
  return getPostsSorted().filter(function (p) { return p.category === slug; });
}

/* 브라우저(window)와 Node(require) 양쪽에서 사용 가능하도록 노출 */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CATEGORIES: CATEGORIES, NAV_ORDER: NAV_ORDER, POSTS: POSTS, getPostsSorted: getPostsSorted, getPostsByCategory: getPostsByCategory };
}
