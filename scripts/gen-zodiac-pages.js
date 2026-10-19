"use strict";
/* 12별자리 개별 페이지 생성: /posts/zodiac-<en>.html + posts.js 등록 + sitemap */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

var S = [
  { en:"aries", ko:"양자리", emoji:"♈", el:"불", color:"#e8590c", p:"3/21 ~ 4/19", planet:"화성(Mars)", symbol:"숫양", lc:"레드", ln:9, ld:"화요일",
    per:"12별자리의 첫 주자답게 시작과 도전을 두려워하지 않는 선두주자입니다. 에너지가 넘치고 솔직하며, 한번 마음먹으면 곧바로 행동으로 옮깁니다. 리더십이 강하지만 참을성이 부족해 즉흥적으로 보일 때도 있습니다.",
    str:["추진력과 결단력","솔직하고 뒤끝 없음","도전·개척 정신"], wk:["성급함·욱하는 기질","싫증을 빨리 냄","마무리가 약함"],
    love:"직진형 연애. 좋으면 먼저 다가가고 표현도 솔직합니다. 다만 쟁취한 뒤 식지 않도록 꾸준함을 더하면 좋습니다.",
    career:"새로 시작하는 일, 영업·스포츠·창업처럼 추진력이 필요한 분야에서 빛납니다. 재물은 들어올 때 크지만 충동 지출을 조심하세요.",
    best:["사자자리","사수자리","쌍둥이자리"], worst:["게자리","염소자리"] },
  { en:"taurus", ko:"황소자리", emoji:"♉", el:"흙", color:"#2b8a3e", p:"4/20 ~ 5/20", planet:"금성(Venus)", symbol:"황소", lc:"그린", ln:6, ld:"금요일",
    per:"안정과 꾸준함의 대명사입니다. 한번 정한 것은 묵묵히 끝까지 밀고 나가며, 감각이 좋아 아름답고 맛있는 것을 즐깁니다. 고집이 센 편이라 변화에 적응이 느릴 수 있습니다.",
    str:["끈기와 성실함","현실 감각·안정감","미적 감각"], wk:["고집·변화에 둔감","소유욕","느린 결단"],
    love:"천천히 깊어지는 연애. 한번 마음을 주면 오래 지키는 든든한 타입입니다. 질투·소유욕만 조절하면 좋습니다.",
    career:"금융·요식·예술·부동산 등 꾸준함과 감각이 통하는 분야에 강합니다. 재물운이 안정적이며 저축·자산 관리에 능합니다.",
    best:["처녀자리","염소자리","게자리"], worst:["물병자리","사자자리"] },
  { en:"gemini", ko:"쌍둥이자리", emoji:"♊", el:"공기", color:"#1098ad", p:"5/21 ~ 6/21", planet:"수성(Mercury)", symbol:"쌍둥이", lc:"옐로", ln:5, ld:"수요일",
    per:"호기심과 재치가 넘치는 소통의 달인입니다. 말솜씨가 좋고 두뇌 회전이 빨라 새로운 정보와 사람을 즐깁니다. 관심사가 자주 바뀌어 변덕스러워 보일 수 있습니다.",
    str:["재치·순발력","뛰어난 소통력","빠른 학습"], wk:["변덕·싫증","산만함","깊이 부족"],
    love:"대화가 즐거운 연애. 지루함을 못 견디니 함께 새로운 걸 경험하는 상대와 잘 맞습니다.",
    career:"기획·마케팅·방송·영업·작가 등 말과 아이디어가 무기인 분야에 강합니다. 수입원을 한두 개로 집중하면 재물이 모입니다.",
    best:["천칭자리","물병자리","양자리"], worst:["전갈자리","처녀자리"] },
  { en:"cancer", ko:"게자리", emoji:"♋", el:"물", color:"#7048e8", p:"6/22 ~ 7/22", planet:"달(Moon)", symbol:"게", lc:"화이트", ln:2, ld:"월요일",
    per:"정이 깊고 가정적인 보호자형입니다. 공감 능력이 뛰어나 주변을 잘 챙기지만, 감수성이 예민해 상처를 오래 담아둡니다. 내 사람에게는 한없이 따뜻합니다.",
    str:["공감·배려심","헌신·보호 본능","섬세한 감수성"], wk:["감정 기복","상처를 오래 담음","낯가림"],
    love:"깊고 헌신적인 연애. 안정감을 주는 상대에게 마음을 활짝 엽니다. 서운함은 쌓지 말고 그때그때 표현하세요.",
    career:"교육·간호·상담·요식·가정 관련 분야에서 공감력이 빛납니다. 재물은 알뜰하게 모으는 편입니다.",
    best:["전갈자리","물고기자리","황소자리"], worst:["양자리","천칭자리"] },
  { en:"leo", ko:"사자자리", emoji:"♌", el:"불", color:"#e8590c", p:"7/23 ~ 8/22", planet:"태양(Sun)", symbol:"사자", lc:"골드", ln:1, ld:"일요일",
    per:"타고난 주인공입니다. 당당하고 자신감이 넘치며, 베풀기를 좋아하는 따뜻한 리더형입니다. 인정받고 싶은 욕구가 커서 자존심이 상하면 크게 흔들립니다.",
    str:["리더십·카리스마","너그러움·의리","자신감"], wk:["강한 인정 욕구","자존심","고집"],
    love:"화끈하고 주도적인 연애. 아낌없이 표현하고 베풉니다. 상대를 존중하고 함께 빛나려 하면 오래갑니다.",
    career:"리더·연예·경영·교육 등 주목받는 무대에서 역량이 폭발합니다. 재물운이 좋지만 과시성 지출을 조심하세요.",
    best:["양자리","사수자리","천칭자리"], worst:["황소자리","전갈자리"] },
  { en:"virgo", ko:"처녀자리", emoji:"♍", el:"흙", color:"#2b8a3e", p:"8/23 ~ 9/22", planet:"수성(Mercury)", symbol:"처녀", lc:"베이지", ln:5, ld:"수요일",
    per:"꼼꼼하고 분석적인 완벽주의자입니다. 성실하고 똑똑하며 디테일을 놓치지 않습니다. 다만 자신과 타인에게 기준이 높아 걱정이 많고 비판적으로 보일 수 있습니다.",
    str:["분석력·꼼꼼함","성실·책임감","현실적 문제 해결"], wk:["완벽주의·걱정","비판적","융통성 부족"],
    love:"신중하고 헌신적인 연애. 말보다 행동으로 챙깁니다. 잔소리 대신 믿어주면 관계가 편안해집니다.",
    career:"회계·의료·연구·편집·품질관리 등 정확성이 필요한 분야의 강자입니다. 계획적인 소비로 재물을 잘 관리합니다.",
    best:["황소자리","염소자리","게자리"], worst:["사수자리","쌍둥이자리"] },
  { en:"libra", ko:"천칭자리", emoji:"♎", el:"공기", color:"#1098ad", p:"9/23 ~ 10/23", planet:"금성(Venus)", symbol:"천칭", lc:"핑크", ln:7, ld:"금요일",
    per:"균형과 조화를 추구하는 세련된 외교관입니다. 공정하고 매너가 좋아 사람들과 두루 잘 지냅니다. 다만 결정을 어려워하고 갈등을 피하려다 우유부단해 보일 수 있습니다.",
    str:["균형 감각·공정함","세련된 매너","조화·중재력"], wk:["우유부단","갈등 회피","타인 시선 의식"],
    love:"로맨틱하고 배려 깊은 연애. 함께 결정하고 맞춰가는 걸 좋아합니다. 할 말은 미루지 말고 솔직히 하세요.",
    career:"디자인·법률·외교·서비스·HR 등 사람과 미감이 중요한 분야에 강합니다. 재물은 들어오는 만큼 쓰기 쉬우니 계획이 필요합니다.",
    best:["쌍둥이자리","물병자리","사자자리"], worst:["게자리","염소자리"] },
  { en:"scorpio", ko:"전갈자리", emoji:"♏", el:"물", color:"#7048e8", p:"10/24 ~ 11/22", planet:"명왕성·화성", symbol:"전갈", lc:"블랙", ln:8, ld:"화요일",
    per:"강렬한 집중력과 통찰을 지닌 몰입형입니다. 한번 믿으면 깊고 의리 있지만, 호불호가 분명하고 속을 잘 드러내지 않습니다. 목표를 향한 끈기가 대단합니다.",
    str:["집중력·끈기","통찰력","강한 의리"], wk:["의심·집착","복수심","감정 숨김"],
    love:"깊고 뜨거운 올인형 연애. 한 사람에게 진심을 다합니다. 의심·집착을 내려놓으면 가장 든든한 상대입니다.",
    career:"수사·연구·심리·투자·의료 등 깊이 파고드는 분야의 최강자입니다. 재물운이 강하며 한번에 크게 모으는 편입니다.",
    best:["게자리","물고기자리","처녀자리"], worst:["쌍둥이자리","사자자리"] },
  { en:"sagittarius", ko:"사수자리", emoji:"♐", el:"불", color:"#e8590c", p:"11/23 ~ 12/21", planet:"목성(Jupiter)", symbol:"궁수", lc:"퍼플", ln:3, ld:"목요일",
    per:"자유롭고 낙천적인 모험가입니다. 솔직하고 통이 크며 새로운 세계를 탐험하길 좋아합니다. 구속을 싫어하고 즉흥적이라 마무리가 느슨할 수 있습니다.",
    str:["낙천·긍정","솔직·개방성","모험·확장력"], wk:["즉흥·산만","구속 싫어함","현실감 부족"],
    love:"자유롭고 쿨한 연애. 함께 성장하고 모험하는 관계를 좋아합니다. 구속보다 신뢰로 묶이면 오래갑니다.",
    career:"여행·교육·무역·출판·스포츠 등 넓은 세계와 연결된 분야에 강합니다. 재물은 크게 벌고 크게 쓰니 관리가 관건입니다.",
    best:["양자리","사자자리","물병자리"], worst:["처녀자리","물고기자리"] },
  { en:"capricorn", ko:"염소자리", emoji:"♑", el:"흙", color:"#2b8a3e", p:"12/22 ~ 1/19", planet:"토성(Saturn)", symbol:"염소", lc:"브라운", ln:4, ld:"토요일",
    per:"책임감 강한 현실주의 노력가입니다. 목표가 뚜렷하고 인내심이 커서 묵묵히 정상을 향해 올라갑니다. 다만 일에 몰두하다 여유와 표현이 부족해질 수 있습니다.",
    str:["목표의식·인내","책임감·신뢰","현실적 실행력"], wk:["일 중심·여유 부족","보수적","감정 표현 서툼"],
    love:"진중하고 책임감 있는 연애. 말보다 꾸준함으로 신뢰를 쌓습니다. 가끔은 계획을 내려놓고 함께 즐겨보세요.",
    career:"경영·행정·금융·건설·전문직 등 장기적 성취가 중요한 분야의 대기만성형입니다. 재물을 착실히 불립니다.",
    best:["황소자리","처녀자리","전갈자리"], worst:["천칭자리","양자리"] },
  { en:"aquarius", ko:"물병자리", emoji:"♒", el:"공기", color:"#1098ad", p:"1/20 ~ 2/18", planet:"천왕성·토성", symbol:"물병", lc:"블루", ln:4, ld:"토요일",
    per:"독창적이고 자유로운 개성파입니다. 틀에 얽매이지 않고 공정하며 멀리 보는 시야를 지녔습니다. 쿨해 보이지만 속내를 잘 드러내지 않아 거리감이 느껴질 수 있습니다.",
    str:["독창성·아이디어","공정·박애","독립심"], wk:["감정 표현 부족","고집·개인주의","거리감"],
    love:"친구 같은 연애. 서로의 자유를 존중하는 관계를 좋아합니다. 마음을 조금 더 표현하면 가까워집니다.",
    career:"IT·과학·기획·사회혁신 등 새로움이 통하는 분야에 강합니다. 재물은 독특한 아이디어에서 기회가 옵니다.",
    best:["쌍둥이자리","천칭자리","사수자리"], worst:["황소자리","전갈자리"] },
  { en:"pisces", ko:"물고기자리", emoji:"♓", el:"물", color:"#7048e8", p:"2/19 ~ 3/20", planet:"해왕성·목성", symbol:"물고기", lc:"민트", ln:7, ld:"목요일",
    per:"감수성이 풍부한 낭만·공감형입니다. 상상력이 뛰어나고 다정하며 예술적 기질이 있습니다. 정에 약해 거절을 어려워하고 현실보다 이상을 좇기 쉽습니다.",
    str:["공감·다정함","풍부한 상상력","예술적 감각"], wk:["우유부단·현실감 부족","정에 약함","쉽게 상처받음"],
    love:"헌신적이고 낭만적인 연애. 상대에게 깊이 빠져듭니다. 현실 감각을 더하면 꿈 같은 사랑이 오래갑니다.",
    career:"예술·음악·디자인·상담·의료 등 감성과 공감이 통하는 분야에 강합니다. 재물은 계획적으로 관리하는 게 좋습니다.",
    best:["게자리","전갈자리","황소자리"], worst:["쌍둥이자리","사수자리"] }
];
var ELEMOJI = { "불":"🔥", "흙":"⛰️", "공기":"💨", "물":"💧" };

function li(a) { return a.map(function (x) { return "<li>" + x + "</li>"; }).join(""); }
function chips(a, cls) { return a.map(function (x) { return '<span class="zs-chip ' + cls + '">' + x + '</span>'; }).join(""); }

function page(s, prev, next) {
  var title = s.ko + " 성격·궁합·오늘의 운세 — 날짜·강점·연애·직업 총정리";
  var desc = s.ko + "(" + s.p + ") 성격과 강점·약점, 연애·직업·재물운, 잘 맞는/안 맞는 별자리, 오늘의 " + s.ko + " 운세까지 한 번에 정리했습니다.";
  var canon = "https://calcbox.kr/posts/zodiac-" + s.en + ".html";
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n' +
'  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <script async src="https://www.googletagmanager.com/gtag/js?id=G-JMGXSV1PJ2"></script>\n' +
'  <script>\n    window.dataLayer = window.dataLayer || [];\n    function gtag(){dataLayer.push(arguments);}\n    gtag(\'js\', new Date());\n    gtag(\'config\', \'G-JMGXSV1PJ2\');\n  </script>\n' +
'  <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
'  <title>' + title + ' | 한국인계산기</title>\n' +
'  <meta name="description" content="' + desc + '">\n' +
'  <meta name="keywords" content="' + s.ko + ', ' + s.ko + ' 성격, ' + s.ko + ' 궁합, ' + s.ko + ' 오늘의 운세, ' + s.ko + ' 날짜, ' + s.ko + ' 연애">\n' +
'  <meta name="robots" content="index, follow">\n  <meta name="author" content="한국인계산기">\n' +
'  <meta property="og:title" content="' + title + '">\n  <meta property="og:description" content="' + desc + '">\n' +
'  <meta property="og:type" content="article">\n  <meta property="og:url" content="' + canon + '">\n  <meta property="og:site_name" content="한국인계산기">\n' +
'  <link rel="canonical" href="' + canon + '">\n' +
'  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org", "@type": "Article",\n    "headline": "' + title + '",\n    "description": "' + desc + '",\n    "datePublished": "2026-10-19", "dateModified": "2026-10-19", "inLanguage": "ko",\n    "author": { "@type": "Organization", "name": "한국인계산기" },\n    "publisher": { "@type": "Organization", "name": "한국인계산기", "url": "https://calcbox.kr/" },\n    "mainEntityOfPage": { "@type": "WebPage", "@id": "' + canon + '" }\n  }\n  </script>\n' +
'  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7143828779500885" crossorigin="anonymous"></script>\n' +
'  <link rel="stylesheet" href="/css/style.css">\n</head>\n<body>\n  <header id="site-header"></header>\n\n' +
'  <main class="post-wrap">\n' +
'    <nav class="crumbs"><a href="/">홈</a> · <a href="/category.html?cat=fortune">사주·운세</a> · <a href="/posts/zodiac-sign.html">별자리</a></nav>\n' +
'    <article class="post">\n' +
'      <h1>' + s.ko + '(' + s.symbol + ') 완전정리 — 성격·궁합·오늘의 운세</h1>\n' +
'      <p class="post-meta"><span class="cat-badge" style="--cat:#7048e8">🔮 사주·운세</span> · 한국인계산기</p>\n' +
'      <p class="lead"><strong>' + s.ko + '</strong>(' + s.p + ', ' + ELEMOJI[s.el] + ' ' + s.el + ' 원소)의 성격과 강점·약점, 연애·직업·재물운, 잘 맞는 별자리, 그리고 <strong>오늘의 ' + s.ko + ' 운세</strong>까지 정리했습니다. (운세는 재미로 참고해 주세요.)</p>\n' +
'      <div class="today-box" id="todayBox"></div>\n' +
'      <h2>' + s.ko + ' 기본 정보</h2>\n' +
'      <table class="calc-table"><tbody>' +
'<tr><th>기간(양력)</th><td>' + s.p + '</td></tr>' +
'<tr><th>원소</th><td>' + ELEMOJI[s.el] + ' ' + s.el + '</td></tr>' +
'<tr><th>지배행성</th><td>' + s.planet + '</td></tr>' +
'<tr><th>상징</th><td>' + s.symbol + '</td></tr>' +
'<tr><th>행운의 색 / 숫자 / 요일</th><td>' + s.lc + ' / ' + s.ln + ' / ' + s.ld + '</td></tr>' +
'</tbody></table>\n' +
'      <h2>' + s.ko + ' 성격</h2>\n      <p>' + s.per + '</p>\n' +
'      <div class="zs-chips" style="margin:8px 0"><span class="zs-chip good">강점</span></div><ul>' + li(s.str) + '</ul>\n' +
'      <div class="zs-chips" style="margin:8px 0"><span class="zs-chip bad">약점</span></div><ul>' + li(s.wk) + '</ul>\n' +
'      <h2>' + s.ko + ' 연애 스타일</h2>\n      <p>' + s.love + '</p>\n' +
'      <h2>' + s.ko + ' 직업·재물운</h2>\n      <p>' + s.career + '</p>\n' +
'      <h2>' + s.ko + ' 궁합</h2>\n' +
'      <p><strong>잘 맞는 별자리</strong></p><div class="zs-chips">' + chips(s.best, "good") + '</div>\n' +
'      <p style="margin-top:10px"><strong>조심할 별자리</strong></p><div class="zs-chips">' + chips(s.worst, "bad") + '</div>\n' +
'      <div class="callout">💡 상대와의 <strong>궁합 점수</strong>가 궁금하면 <a href="/posts/zodiac-sign.html">별자리 궁합 도구</a>에서 바로 확인하세요. 생일로 <a href="/posts/zodiac-year-age.html">띠·나이</a>, 성향은 <a href="/posts/mbti-compatibility.html">MBTI 궁합</a>, 타고난 기질은 <a href="/saju/">무료 사주풀이</a>도 함께 보면 좋습니다.</div>\n' +
'      <h2>자주 묻는 질문</h2>\n' +
'      <h3>Q. ' + s.ko + '는 몇 월생인가요?</h3>\n      <p>' + s.ko + '는 양력 <strong>' + s.p + '</strong>에 태어난 사람입니다. 경계일에 태어났다면 해에 따라 하루 차이가 날 수 있습니다.</p>\n' +
'      <h3>Q. ' + s.ko + '와 가장 잘 맞는 별자리는?</h3>\n      <p>전통적으로 <strong>' + s.best.join("·") + '</strong>와 잘 맞는다고 봅니다. 다만 궁합은 재미로 보는 참고이며 실제 관계는 서로의 노력이 가장 중요합니다.</p>\n' +
'      <div class="related"><strong>다른 별자리</strong> — <a href="/posts/zodiac-' + prev.en + '.html">' + prev.emoji + ' ' + prev.ko + '</a> · <a href="/posts/zodiac-' + next.en + '.html">' + next.emoji + ' ' + next.ko + '</a> · <a href="/posts/zodiac-sign.html">별자리 전체·궁합 도구</a></div>\n' +
'    </article>\n  </main>\n\n  <footer id="site-footer"></footer>\n\n' +
'  <script src="/js/posts.js"></script>\n  <script src="/js/site.js"></script>\n' +
'  <script>\n  (function(){\n' +
'    var ko="' + s.ko + '", idx=' + s.idx + ', color="' + s.color + '";\n' +
'    var POOL={total:["흐름이 순조로워 마음먹은 일이 술술 풀리는 하루.","작은 변화가 좋은 기회로 이어질 수 있는 날.","서두르기보다 차분히 가면 결과가 좋습니다.","주변의 도움으로 막혔던 일이 풀립니다.","컨디션이 좋아 집중력이 오르는 하루.","예상 밖의 반가운 소식이 들려올 수 있어요.","욕심을 조금 내려놓으면 오히려 얻는 날.","준비해온 일이 인정받기 좋은 타이밍."],love:["먼저 다가가면 분위기가 한층 가까워집니다.","솔직한 한마디가 관계를 부드럽게 해요.","작은 표현이 큰 호감으로 돌아옵니다.","오래 연락 없던 인연에게서 소식이 올 수도.","함께 있는 시간이 유독 편안한 하루.","서운함은 담아두지 말고 가볍게 푸세요."],money:["충동구매만 참으면 지출이 안정적입니다.","뜻밖의 작은 수입이 생길 수 있어요.","큰 결정은 하루 미루는 게 유리합니다.","아껴 쓴 만큼 여유가 생기는 날.","정보를 꼼꼼히 확인하면 손해를 막습니다.","나눌수록 돌아오는 재물운."],work:["맡은 일을 빠르게 처리해 인정받습니다.","협업에서 좋은 아이디어가 나오는 날.","실수만 조심하면 순조롭게 마무리됩니다.","새 제안·시도가 좋은 평가를 받습니다.","집중할수록 능률이 오르는 하루.","미뤘던 일을 끝내기 좋은 타이밍."],color:["화이트","블루","레드","그린","옐로","퍼플","핑크","블랙","베이지","오렌지"],item:["향수","손수건","텀블러","이어폰","노트","작은 식물","모자","반지"]};\n' +
'    function hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*16777619)>>>0;}return h;}\n' +
'    function pk(a,s){return a[s%a.length];}\n' +
'    var d=new Date(),w=["일","월","화","수","목","금","토"];\n' +
'    var key=d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()+"#"+idx;\n' +
'    var st=2+(hash(key+"s")%4), stars="★★★★★".slice(0,st)+"☆☆☆☆☆".slice(0,5-st);\n' +
'    document.getElementById("todayBox").innerHTML=\n' +
'      \'<div class="today-head"><b>🔮 \'+ko+\' 오늘의 운세</b><span class="today-date">\'+(d.getMonth()+1)+"월 "+d.getDate()+"일 ("+w[d.getDay()]+")"+\'</span></div>\'+\n' +
'      \'<div class="today-stars">총운 \'+stars+\'</div>\'+\n' +
'      \'<div class="ti" style="border:0;padding-top:2px">\'+pk(POOL.total,hash(key+"t"))+\'</div>\'+\n' +
'      \'<div class="today-grid"><div class="ti"><b>💗 애정운</b>\'+pk(POOL.love,hash(key+"l"))+\'</div>\'+\n' +
'      \'<div class="ti"><b>💰 금전운</b>\'+pk(POOL.money,hash(key+"m"))+\'</div>\'+\n' +
'      \'<div class="ti"><b>💼 직장·학업운</b>\'+pk(POOL.work,hash(key+"w"))+\'</div>\'+\n' +
'      \'<div class="ti"><b>🍀 조언</b>작은 것에 감사하면 운이 따릅니다.</div></div>\'+\n' +
'      \'<div class="today-luck"><span class="luck-chip">행운의 색 \'+pk(POOL.color,hash(key+"c"))+\'</span><span class="luck-chip">행운의 숫자 \'+(1+hash(key+"n")%45)+\'</span><span class="luck-chip">행운의 아이템 \'+pk(POOL.item,hash(key+"i"))+\'</span></div>\';\n' +
'  })();\n  </script>\n</body>\n</html>\n';
}

// idx 부여 + 생성
S.forEach(function (s, i) { s.idx = i; });
S.forEach(function (s, i) {
  var prev = S[(i + S.length - 1) % S.length], next = S[(i + 1) % S.length];
  fs.writeFileSync(path.join(ROOT, "posts", "zodiac-" + s.en + ".html"), page(s, prev, next));
});
console.log("pages written:", S.length);

// posts.js 등록 (zodiac-sign 항목 바로 뒤에 삽입)
var pf = path.join(ROOT, "js", "posts.js");
var p = fs.readFileSync(pf, "utf8");
if (p.indexOf('"zodiac-aries"') === -1) {
  var entries = S.map(function (s) {
    return '  { id: "zodiac-' + s.en + '", title: "' + s.ko + ' 성격·궁합·오늘의 운세 (' + s.p + ')", summary: "' + s.ko + ' 성격·강점·약점, 연애·직업운, 궁합, 오늘의 ' + s.ko + ' 운세까지 정리.", category: "fortune", date: "2026.10.18", url: "/posts/zodiac-' + s.en + '.html", image: "" },';
  }).join("\n");
  p = p.replace(/(\{ id: "zodiac-sign"[^\n]*\},\n)/, "$1" + entries + "\n");
  fs.writeFileSync(pf, p);
  console.log("posts.js: +12 sign entries");
} else { console.log("posts.js already has sign entries"); }

// sitemap
var sf = path.join(ROOT, "sitemap.xml");
var sm = fs.readFileSync(sf, "utf8");
var add = "";
S.forEach(function (s) {
  var loc = "https://calcbox.kr/posts/zodiac-" + s.en + ".html";
  if (sm.indexOf(loc) === -1) add += "  <url>\n    <loc>" + loc + "</loc>\n    <lastmod>2026-10-19</lastmod>\n    <priority>0.7</priority>\n  </url>\n";
});
if (add) { sm = sm.replace("</urlset>", add + "</urlset>"); fs.writeFileSync(sf, sm); console.log("sitemap: +12"); }
