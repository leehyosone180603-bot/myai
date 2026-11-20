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
  fortune:   { name: "사주·운세",         ready: true,  color: "#7048e8" },
  life:      { name: "생활정보",          ready: false, color: "#1098ad" },
  column:    { name: "칼럼",              ready: false, color: "#c2255c" }
};

/* 상단 네비게이션에 노출할 카테고리 순서 */
var NAV_ORDER = ["fortune", "life", "column"];

/* 글 목록: 최신 글이 배열 맨 위 */
var POSTS = [
  { id: "mbti-compatibility", title: "MBTI 궁합 — 두 유형 궁합 보기 + 16유형 성격", summary: "내 MBTI·상대 MBTI만 고르면 궁합 등급과 한줄평이 바로. 16유형 성격·잘 맞는 유형까지 정리.", category: "fortune", date: "2026.10.19", url: "/posts/mbti-compatibility.html", image: "" },
  { id: "zodiac-sign", title: "오늘의 별자리 운세 + 성격·궁합 — 생일로 내 별자리 찾기", summary: "생일만 넣으면 내 별자리·성격과 오늘의 운세(매일 갱신), 상대 별자리 궁합 점수까지 바로 확인.", category: "fortune", date: "2026.10.19", url: "/posts/zodiac-sign.html", image: "" },
  { id: "zodiac-aries", title: "양자리 성격·궁합·오늘의 운세 (3/21 ~ 4/19)", summary: "양자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 양자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-aries.html", image: "" },
  { id: "zodiac-taurus", title: "황소자리 성격·궁합·오늘의 운세 (4/20 ~ 5/20)", summary: "황소자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 황소자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-taurus.html", image: "" },
  { id: "zodiac-gemini", title: "쌍둥이자리 성격·궁합·오늘의 운세 (5/21 ~ 6/21)", summary: "쌍둥이자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 쌍둥이자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-gemini.html", image: "" },
  { id: "zodiac-cancer", title: "게자리 성격·궁합·오늘의 운세 (6/22 ~ 7/22)", summary: "게자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 게자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-cancer.html", image: "" },
  { id: "zodiac-leo", title: "사자자리 성격·궁합·오늘의 운세 (7/23 ~ 8/22)", summary: "사자자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 사자자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-leo.html", image: "" },
  { id: "zodiac-virgo", title: "처녀자리 성격·궁합·오늘의 운세 (8/23 ~ 9/22)", summary: "처녀자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 처녀자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-virgo.html", image: "" },
  { id: "zodiac-libra", title: "천칭자리 성격·궁합·오늘의 운세 (9/23 ~ 10/23)", summary: "천칭자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 천칭자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-libra.html", image: "" },
  { id: "zodiac-scorpio", title: "전갈자리 성격·궁합·오늘의 운세 (10/24 ~ 11/22)", summary: "전갈자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 전갈자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-scorpio.html", image: "" },
  { id: "zodiac-sagittarius", title: "사수자리 성격·궁합·오늘의 운세 (11/23 ~ 12/21)", summary: "사수자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 사수자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-sagittarius.html", image: "" },
  { id: "zodiac-capricorn", title: "염소자리 성격·궁합·오늘의 운세 (12/22 ~ 1/19)", summary: "염소자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 염소자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-capricorn.html", image: "" },
  { id: "zodiac-aquarius", title: "물병자리 성격·궁합·오늘의 운세 (1/20 ~ 2/18)", summary: "물병자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 물병자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-aquarius.html", image: "" },
  { id: "zodiac-pisces", title: "물고기자리 성격·궁합·오늘의 운세 (2/19 ~ 3/20)", summary: "물고기자리 성격·강점·약점, 연애·직업운, 궁합, 오늘의 물고기자리 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-pisces.html", image: "" },
  { id: "saju-newyear", title: "올해 신년운세·토정비결 아직 안 보셨나요? 내 총운 확인하기", summary: "새해와 분기 전환점에 급증하는 신년운세. 토정비결과 사주 세운의 차이, 올해 나의 총운과 흐름을 미리 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.22", url: "/blog/saju-newyear/", image: "" },
  { id: "saju-today-fortune", title: "매일 아침 별자리 운세 보시나요? 일진(日辰)으로 하루를 여는 법", summary: "매일 아침 보는 오늘의 운세, 사주에서는 일진으로 봅니다. 일진의 개념과 내 사주 원국·올해 운세를 함께 봐야 하는 이유를 정리했습니다.", category: "fortune", date: "2026.07.11", url: "/blog/saju-today-fortune/", image: "" },
  { id: "saju-gunghab-relationship", title: "친구·연인과 자꾸 싸우는 이유가 '이것' 때문? 재미로 보는 사주 궁합", summary: "자꾸 부딪히는 관계, 사주 궁합으로 보면 이유가 보입니다. 오행의 상생·상극을 쉽게 풀고, 두 사람 생년월일로 궁합을 무료로 확인하는 법을 소개합니다.", category: "fortune", date: "2026.07.09", url: "/blog/saju-gunghab-relationship/", image: "" },
  { id: "saju-monthly", title: "이번 달 나에게 찾아올 행운은? 월별 운세로 한 달 미리 대비하기", summary: "한 달의 흐름을 미리 알면 대처가 쉬워집니다. 사주 오행으로 보는 좋은 달·조심할 달과 이번 달 흐름을 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.23", url: "/blog/saju-monthly/", image: "" },
  { id: "saju-jaemul-timing", title: "\"언제쯤 돈이 모일까?\" 사주로 보는 내 인생 재물운 터지는 시기", summary: "재물운은 사주의 '재성'과 대운·세운의 흐름으로 봅니다. 돈 그릇의 크기와 돈이 크게 열리는 시기, 돈이 새는 시기를 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.12", url: "/blog/saju-jaemul-timing/", image: "" },
  { id: "saju-job-change", title: "올해 이직해도 될까? 사주로 보는 직장운·시험·합격운", summary: "이직·취업·승진의 타이밍은 사주의 '관성'과 '인성' 흐름으로 봅니다. 언제 움직여야 자리가 오르는지, 합격운이 오는 시기를 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.13", url: "/blog/saju-job-change/", image: "" },
  { id: "saju-spouse", title: "\"내 배우자는 어떤 사람일까?\" 사주가 말해주는 인연의 특징", summary: "사주의 배우자 자리(일지)와 배우자성으로 미래 배우자의 성향과 인연이 들어오는 시기를 봅니다. 내 인연의 특징을 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.14", url: "/blog/saju-spouse/", image: "" },
  { id: "saju-sinsal-dohwa", title: "\"내 사주에 도화살 있을까?\" 도화·역마·화개, 신살의 종류 총정리", summary: "도화살·역마살·화개살 등 사주 신살의 뜻을 쉽게 풀었습니다. 무섭기만 한 게 아닌 신살의 진짜 의미와 내 사주 속 신살을 확인하는 법을 알려드립니다.", category: "fortune", date: "2026.07.10", url: "/blog/saju-sinsal-dohwa/", image: "" },
  { id: "saju-gilil", title: "이사·개업·결혼 날짜, 손 없는 날보다 정확한 '나만의 길일' 찾는 법", summary: "손 없는 날은 모두에게 같지만, 진짜 길일은 내 사주와 맞아야 합니다. 대운·세운 흐름으로 나에게 좋은 시기를 찾는 법을 정리했습니다.", category: "fortune", date: "2026.07.16", url: "/blog/saju-gilil/", image: "" },
  { id: "saju-lucky-color", title: "중요한 미팅 있는 날, 행운을 부르는 사주 맞춤 컬러·아이템", summary: "사주에 부족한 오행을 색·음식·숫자·방향으로 채우면 개운에 도움이 됩니다. 내 부족한 오행과 행운의 컬러를 찾는 법을 정리했습니다.", category: "fortune", date: "2026.07.24", url: "/blog/saju-lucky-color/", image: "" },
  { id: "saju-investment", title: "주식·부동산 투자 전 확인! 사주로 보는 내 투자 성향과 타이밍", summary: "무리한 투자를 피해야 할 시기와 재물 흐름이 좋은 시기는 사주로 점검할 수 있습니다. 투자 성향과 조심할 시기를 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.25", url: "/blog/saju-investment/", image: "" },
  { id: "saju-aptitude", title: "나는 직장인 체질일까, 사업가 체질일까? 사주로 보는 진로와 적성", summary: "사주의 십성(식상·재성·관성 등)으로 타고난 적성과 어울리는 직업, 직장인·사업가 체질을 진단합니다. 내 진로 방향을 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.15", url: "/blog/saju-aptitude/", image: "" },
  { id: "saju-naming", title: "개명·작명 고민? 사주에 부족한 기운을 채우는 좋은 이름의 조건", summary: "이름은 사주 원국의 부족한 오행을 보완할 때 좋습니다. 작명·개명에서 오행 균형이 왜 중요한지와 내 부족한 기운을 확인하는 법을 정리했습니다.", category: "fortune", date: "2026.07.26", url: "/blog/saju-naming/", image: "" },
  { id: "saju-gyounki", title: "\"요즘 왜 이렇게 일이 안 풀릴까?\" 삼재보다 무서운 교운기(交運期)", summary: "일이 유독 꼬이는 시기, 사주에서는 대운이 바뀌는 '교운기'로 봅니다. 교운기 증상과 내 대운이 바뀌는 시기를 스스로 진단하는 법을 정리했습니다.", category: "fortune", date: "2026.07.07", url: "/blog/saju-gyounki/", image: "" },
  { id: "saju-before-philosophy", title: "철학관 가기 전 필수! 사주 볼 때 돈 낭비하지 않는 법", summary: "비싼 복채를 내기 전, 내 만세력과 기본 구조를 미리 알고 가면 상담이 훨씬 알찹니다. 철학관 가기 전 준비하면 좋은 것을 정리했습니다.", category: "fortune", date: "2026.07.17", url: "/blog/saju-before-philosophy/", image: "" },
  { id: "saju-reviews", title: "\"어떻게 알았지?\" 사람들이 사주에서 소름 돋는다고 느끼는 이유", summary: "사주 풀이를 보고 '소름 돋는다'고 느끼는 데는 이유가 있습니다. 정확한 만세력과 개인 맞춤 해석이 만드는 공감의 원리를 정리했습니다.", category: "fortune", date: "2026.07.21", url: "/blog/saju-reviews/", image: "" },
  { id: "saju-easy-program", title: "\"한자 가득한 만세력은 그만\" 초보자도 3초 만에 이해하는 사주 프로그램", summary: "복잡한 한자와 어려운 용어 없이, 생년월일시만 넣으면 쉬운 말로 풀어주는 도깨비 사주를 소개합니다. 초보자를 위한 사주 프로그램의 특징을 정리했습니다.", category: "fortune", date: "2026.07.18", url: "/blog/saju-easy-program/", image: "" },
  { id: "saju-engine-story", title: "천문 계산과 정통 명리의 만남: 이 사주 프로그램은 어떻게 만들어졌을까?", summary: "도깨비 사주가 어떤 원리로 사주를 계산하는지 공개합니다. 천문 계산 기반 만세력, 절기·입춘 처리, 검증 방식 등 정확도의 비밀을 정리했습니다.", category: "fortune", date: "2026.07.19", url: "/blog/saju-engine-story/", image: "" },
  { id: "saju-expert-tools", title: "복잡한 대운·세운을 한눈에! 명리 공부에도 쓰는 사주 분석 도구", summary: "십성·십이운성·신살·용신·대운·세운까지 자동으로 계산해 명리 공부와 임상에 활용하기 좋은 사주 분석 도구를 소개합니다.", category: "fortune", date: "2026.07.20", url: "/blog/saju-expert-tools/", image: "" },
  { id: "mbti-vs-saju", title: "MBTI는 마스터했는데... 내 '사주 팔자'는 어떤 글자로 이뤄져 있을까?", summary: "MBTI로 성격을 아는 시대, 타고난 성향은 사주의 일간과 오행으로 봅니다. MBTI와 사주를 비교하며 내 여덟 글자를 확인하는 법을 알려드립니다.", category: "fortune", date: "2026.07.08", url: "/blog/mbti-vs-saju/", image: "" },
  { id: "istj-man-traits", title: "ISTJ 남자 특징 — 원칙적이고 든든한 현실주의자의 성향", summary: "MBTI ISTJ 남자의 특징인 책임감, 원칙주의, 현실적 사고, 신뢰성과 연애·직장에서의 성향, 강점과 약점을 정리했습니다.", category: "fortune", date: "2026.07.05", url: "/blog/istj-man-traits/", image: "/img/istj-man-traits.svg" },
  { id: "istj-woman-traits", title: "ISTJ 여자 특징 — 야무지고 신뢰감 있는 현실주의자의 성향", summary: "MBTI ISTJ 여자의 특징인 책임감, 계획성, 현실적 사고, 신뢰성과 연애·인간관계에서의 성향, 강점과 약점을 정리했습니다.", category: "fortune", date: "2026.07.05", url: "/blog/istj-woman-traits/", image: "/img/istj-woman-traits.svg" },
  { id: "twelve-zodiac-order", title: "십이간지 순서 — 십이지(十二支) 한자와 읽는 법 총정리", summary: "십이간지(십이지)의 한자 순서인 자축인묘진사오미신유술해를 한자·독음·동물과 함께 표로 정리했습니다. 십이지 순서를 한눈에 확인하세요.", category: "fortune", date: "2026.07.05", url: "/blog/twelve-zodiac-order/", image: "/img/twelve-zodiac-order.svg" },
  { id: "zodiac-animals-order", title: "12간지 동물 순서 — 띠 동물 열두 마리 순서와 유래", summary: "12간지 동물 순서인 쥐·소·호랑이·토끼·용·뱀·말·양·원숭이·닭·개·돼지를 정리했습니다. 각 띠 동물의 순서와 유래를 확인하세요.", category: "fortune", date: "2026.07.05", url: "/blog/zodiac-animals-order/", image: "/img/zodiac-animals-order.svg" },
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
