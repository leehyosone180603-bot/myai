/*
 * 건강상자(calcbox.kr) - 블로그 글 목록 데이터
 * ==================================================================
 * ▷ 새 글을 추가하는 방법 (자세한 규칙은 /CLAUDE.md)
 *   1) posts/_template.html 을 복사해 posts/<slug>.html 을 만듭니다.
 *   2) 아래 POSTS 배열의 "맨 위"에 한 줄(객체)을 추가합니다. (앞쪽일수록 최신글)
 *   {
 *     id: "unique-slug",              // 파일명과 같은 영문 슬러그
 *     title: "글 제목",
 *     summary: "홈/목록에 노출될 1~2줄 요약",
 *     category: "food",               // "food"(건강음식) 또는 "info"(건강정보)
 *     date: "2026-11-22",             // 작성일 (YYYY-MM-DD)
 *     url: "/posts/unique-slug.html",
 *     image: "/img/unique-slug-1.jpg", // 대표(히어로) 사진
 *   }
 *   3) python3 scripts/site_check.py --sitemap  → 점검 + sitemap.xml 갱신
 * ==================================================================
 */

/* 카테고리 정의 (ready:false = 준비중, 클릭 시 준비중 안내) */
const CATEGORIES = {
  food:     { slug: "food",     name: "건강음식", ready: true,  desc: "제철 식재료의 영양, 고르는 법, 영양을 덜 잃는 조리법과 먹을 때 주의할 점" },
  info:     { slug: "info",     name: "건강정보", ready: true,  desc: "계절마다 늘어나는 증상의 원인과 생활 관리, 병원에 가야 하는 신호" },
  exercise: { slug: "exercise", name: "건강운동", ready: false },
  diet:     { slug: "diet",     name: "다이어트", ready: false },
  disease:  { slug: "disease",  name: "질환·병",  ready: false },
  life:     { slug: "life",     name: "생활정보", ready: false },
};

/* 상단 네비게이션에 노출할 순서 */
const NAV_ORDER = ["food", "info", "exercise", "diet", "disease", "life"];

/*
 * 실제 발행 글 목록 (최신 글이 위로).
 * 새 글을 추가할 때 이 배열 맨 위에 객체를 추가하세요.
 */
const POSTS = [
  {
    id: "winter-radish-benefits",
    title: "겨울 무 효능과 무청까지 알뜰하게 먹는 법",
    summary: "겨울 무가 단 이유와 소화효소 이야기, 윗부분·가운데·아랫부분 쓰임새, 무청 시래기를 베란다에서 말리는 순서와 보관법까지 담았어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/winter-radish-benefits.html",
    image: "/img/winter-radish-benefits-1.jpg",
  },
  {
    id: "stroke-warning-signs",
    title: "뇌졸중 전조증상 '이웃손발시선'과 골든타임",
    summary: "얼굴·팔·말·시선 중 하나라도 갑자기 이상하면 바로 119. 증상이 사라져도 응급실에 가야 하는 이유와 4.5시간 골든타임을 문답으로 정리했습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/stroke-warning-signs.html",
    image: "/img/stroke-warning-signs-1.jpg",
  },
  {
    id: "ginger-tea-benefits",
    title: "생강차 효능과 만드는 법, 이런 분은 조심하세요",
    summary: "진저롤과 쇼가올 이야기, 퇴근 후 한 시간이면 되는 생강청 담그는 순서와 설탕 줄이는 법, 마시기 전 상의가 필요한 분들을 정리했어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/ginger-tea-benefits.html",
    image: "/img/ginger-tea-benefits-1.jpg",
  },
  {
    id: "shingles-early-symptoms",
    title: "대상포진 초기 증상과 예방접종, 72시간이 중요한 이유",
    summary: "물집보다 몸 한쪽의 통증이 먼저 오는 대상포진. 72시간 이내 치료, 바로 진료할 신호, 간병 요령과 예방접종 종류를 정리했습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/shingles-early-symptoms.html",
    image: "/img/shingles-early-symptoms-1.jpg",
  },
  {
    id: "sweet-potato-blood-sugar",
    title: "고구마 효능, 찐 고구마와 군고구마 혈당 차이",
    summary: "공복혈당 경계 판정 뒤 고구마 먹는 법을 바꾼 기록. 찐 것과 군 것의 차이, 식혀 먹기, 한 번에 먹는 양과 주의점을 문답으로 정리했어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/sweet-potato-blood-sugar.html",
    image: "/img/sweet-potato-blood-sugar-1.jpg",
  },
  {
    id: "winter-itchy-skin",
    title: "겨울철 피부 가려움증 원인과 보습 루틴",
    summary: "겨울마다 정강이가 가렵다면 뜨거운 샤워부터 점검해 보세요. 미지근한 물, 짧은 샤워, 샤워 직후 보습 루틴과 진료가 필요한 신호를 담았습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/winter-itchy-skin.html",
    image: "/img/winter-itchy-skin-1.jpg",
  },
  {
    id: "yuja-tea-benefits",
    title: "유자차 효능과 당분 덜 먹는 유자청 활용법",
    summary: "수험생 아이에게 겨울 내내 타 준 유자차. 생각보다 단 유자청의 당을 줄이는 방법, 껍질차 만들기, 껍질 씻는 순서와 주의점을 담았어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/yuja-tea-benefits.html",
    image: "/img/yuja-tea-benefits-1.jpg",
  },
  {
    id: "cholesterol-test-results",
    title: "건강검진 콜레스테롤 수치 보는 법 (LDL·HDL·중성지방)",
    summary: "건강검진 결과지의 총콜레스테롤·LDL·HDL·중성지방을 참고 기준표로 읽는 법과 경계 수치일 때 바꿀 생활 습관을 문답으로 정리했습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/cholesterol-test-results.html",
    image: "/img/cholesterol-test-results-1.jpg",
  },
  {
    id: "winter-spinach-seomcho",
    title: "겨울 시금치(섬초·포항초) 효능과 데치는 시간",
    summary: "해풍 맞고 자란 섬초·포항초가 단 이유, 뿌리 붉고 잎 두꺼운 시금치 고르는 법, 뚜껑 열고 30초~1분 데치는 요령과 주의할 분들을 정리했어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/winter-spinach-seomcho.html",
    image: "/img/winter-spinach-seomcho-1.jpg",
  },
  {
    id: "cold-hands-feet",
    title: "수족냉증 원인과 손발 따뜻하게 관리하는 법",
    summary: "수족냉증은 병명이라기보다 증상입니다. 레이노 현상처럼 진료가 필요한 신호와 출근길·사무실·퇴근 후 손발 관리법, 족욕·핫팩 주의점을 정리했습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/cold-hands-feet.html",
    image: "/img/cold-hands-feet-1.jpg",
  },
  {
    id: "broccoli-cooking-nutrients",
    title: "브로콜리 효능과 영양 덜 잃는 조리법",
    summary: "삶기보다 찌기·전자레인지가 유리한 이유, 냉동 브로콜리 익히는 시간과 세척법, 와파린 복용자 주의점까지 자취생 눈높이로 정리했어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/broccoli-cooking-nutrients.html",
    image: "/img/broccoli-cooking-nutrients-1.jpg",
  },
  {
    id: "frostbite-chilblains",
    title: "동상과 동창 차이, 응급처치와 예방법",
    summary: "동상과 동창은 생기는 환경부터 다릅니다. 비비지 않고 서서히 녹이는 응급처치, 119가 필요한 저체온증 신호, 겨울 산행 준비물 체크리스트까지.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/frostbite-chilblains.html",
    image: "/img/frostbite-chilblains-1.jpg",
  },
  {
    id: "shiitake-mushroom-benefits",
    title: "표고버섯 효능, 햇볕에 말리면 달라지는 점",
    summary: "표고를 주름이 위로 오게 햇볕에 말리는 이유, 건표고 불리는 법과 불린 물 활용, 생표고를 충분히 익혀야 하는 이유를 정리했다.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/shiitake-mushroom-benefits.html",
    image: "/img/shiitake-mushroom-benefits-1.jpg",
  },
  {
    id: "seasonal-depression-winter",
    title: "겨울만 되면 우울한 이유, 계절성 우울증 신호와 대처",
    summary: "해가 짧아지면 잠이 늘고 무기력해지는 프리랜서의 겨울 기록. 계절성 우울증 신호와 '겨울 타는 것'과의 차이, 병원에 가야 할 기준까지.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/seasonal-depression-winter.html",
    image: "/img/seasonal-depression-winter-1.jpg",
  },
  {
    id: "sweet-pumpkin-benefits",
    title: "단호박 효능과 딱딱한 단호박 쉽게 자르는 법",
    summary: "딱딱한 단호박을 전자레인지로 쉽게 자르는 순서, 고르는 법과 보관법, 두 돌 아이 간식으로 줄 때 챙길 점을 정리했어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/sweet-pumpkin-benefits.html",
    image: "/img/sweet-pumpkin-benefits-1.jpg",
  },
  {
    id: "mouth-ulcer-healing",
    title: "구내염 원인과 빨리 낫는 법, 병원 가야 할 때",
    summary: "마감마다 입병이 나는 편집자가 정리한 구내염 메모. 흔한 아프타성 구내염 구별법과 덜 아프게 지내는 법, 2주 넘으면 병원에 가야 하는 이유.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/mouth-ulcer-healing.html",
    image: "/img/mouth-ulcer-healing-1.jpg",
  },
  {
    id: "natto-benefits",
    title: "낫토 효능과 먹는 법, 와파린 복용 중이라면 주의",
    summary: "낫토 냄새 덜 나게 먹는 법과 젓는 순서, 와파린 복용자가 낫토를 조심해야 하는 이유, 나토키나아제 광고의 오해를 문답으로 정리했습니다.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/natto-benefits.html",
    image: "/img/natto-benefits-1.jpg",
  },
  {
    id: "saline-nasal-rinse",
    title: "식염수 코세척 방법, 비염·코막힘에 제대로 하는 법",
    summary: "비염 15년차의 코세척 실패담으로 배운 0.9% 식염수 농도, 끓여 식힌 물과 체온 온도, 단계별 방법과 멈춰야 할 신호를 정리했습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/saline-nasal-rinse.html",
    image: "/img/saline-nasal-rinse-1.jpg",
  },
  {
    id: "lotus-root-benefits",
    title: "연근 효능과 갈변 없이 손질하는 법",
    summary: "시어머니께 배운 연근 고르는 법, 식초 물로 갈변 없이 손질하는 법, 간장·물엿을 줄인 연근조림과 보관법을 정리했어요.",
    category: "food",
    date: "2026-11-22",
    url: "/posts/lotus-root-benefits.html",
    image: "/img/lotus-root-benefits-1.jpg",
  },
  {
    id: "tinnitus-causes",
    title: "귀에서 삐 소리, 이명 원인과 병원 가야 할 때",
    summary: "무선 이어폰을 달고 살던 대학원생이 겪은 이명. 흔한 원인과 돌발성 난청 같은 위험 신호, 이어폰 60·60 규칙 등 생활 관리법을 담았습니다.",
    category: "info",
    date: "2026-11-22",
    url: "/posts/tinnitus-causes.html",
    image: "/img/tinnitus-causes-1.jpg",
  },
];

/* 다른 스크립트(site.js·home.js·category.js)에서 쓰도록 전역에 노출 */
if (typeof window !== "undefined") {
  window.CATEGORIES = CATEGORIES;
  window.NAV_ORDER = NAV_ORDER;
  window.POSTS = POSTS;
}
/* Node(점검 스크립트)에서도 읽을 수 있게 */
if (typeof module !== "undefined") module.exports = { CATEGORIES, NAV_ORDER, POSTS };
