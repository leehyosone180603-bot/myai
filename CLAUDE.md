# 건강상자(calcbox.kr) 운영 규칙

이 저장소에서 글을 쓰거나 고칠 때는 항상 이 규칙을 따른다.
(「홈페이지 글 발행 요청 가이드(건강흐름·알고살자)」의 프롬프트 0 규칙을 이 사이트에 맞게 옮긴 것)

## [사이트]
- 사이트: 건강상자 https://calcbox.kr / 저장소 leehyosone180603-bot/myai / 배포 브랜치 main (GitHub Pages, CNAME=calcbox.kr)
- 같은 발행인의 다른 건강 사이트: 건강흐름 https://healthfortune.co.kr (leehyosone180603-bot/secondwebsite),
  알고살자 https://algosalja.com (leehyosone180603-bot/algosalja). **세 사이트끼리 글 주제가 겹치면 안 된다.**
  새 주제를 고르기 전에 두 저장소의 js/posts.js 제목도 확인한다.
- 정적 HTML/CSS/JS(빌드 도구 없음), 모든 경로는 루트 절대경로(/css, /js, /img).
- 헤더·푸터·광고·'함께 읽으면 좋은 글'은 js/site.js 가 주입. 각 페이지는 `<header id="site-header">`, `<footer id="site-footer">` 만 둔다.
- 글 파일: posts/<영문-슬러그>.html, 템플릿 posts/_template.html
- 새 글은 js/posts.js 의 POSTS 맨 위에 등록하고 sitemap.xml 에도 추가 (`python3 scripts/site_check.py --sitemap` 이 자동 생성)
- 카테고리: 활성 food=건강음식, info=건강정보 / 준비중 exercise·diet·disease·life (js/posts.js CATEGORIES)
- 필수 페이지: about.html, contact.html, privacy.html(애드센스·애널리틱스 쿠키 고지), terms.html — 푸터에 연결, 죽은 링크(#) 금지
- 애드센스 게시자 ID ca-pub-7143828779500885: 모든 페이지 `<head>` 의 로더 스니펫과 ads.txt 는 항상 유지
- GA4(G-JMGXSV1PJ2)와 index.html 의 google/naver site-verification 메타는 지우지 않는다.
- 발행 정보(푸터): 건강흐름과 동일 — 굿윌스토어, 부산 사하구 오작로 34, 202호, 010-2934-1351, 발행·편집인/청소년보호책임자 이효선, leelin12@naver.com (js/site.js SITE)

## [옛 주소 — 지우지 말 것]
- calcbox.kr 은 2026-11 이전에 계산기·나이날짜·사주운세 사이트였다. 계산기 11개와 나이·날짜 글은 healthfortune.co.kr 로 이전됐다.
  - 계산기 폴더(age, birth-year, business-days, freelancer, lotto, lotto-prize, military, salary, scientific, severance, vat)의 index.html,
    posts/ 의 나이·날짜 글 14편, blog/ 의 21개 폴더는 healthfortune 으로 보내는 **리다이렉트 스텁**이다. 목록·사이트맵에 넣지 않는다.
  - 사주·운세 사이트 전체는 `archive/calcbox-fortune-site` 브랜치에 보존돼 있다.
  - about/ contact/ privacy/ terms/ 폴더는 *.html 로 보내는 스텁.
- 없는 주소는 404.html(최신 글 목록 표시)로 간다.

## [글 작성]
- 구글 SEO 구조: H1 1개 → H2(항목별) → H3(활용법·팁). 상단 핵심 요약 박스(.keybox, 제목은 글마다 다르게), 리드 문단(.article__lead),
  하단 의학적 면책 문구(.disclaimer, 글 내용에 맞게 글마다 다르게).
- meta description·keywords·canonical·Open Graph(og:image 포함)·JSON-LD(Article, image 배열) 넣기. 날짜 형식 YYYY-MM-DD.
- 분량: 본문 한국어 2,500~3,800자. 얇은 글 금지 — 구체적 방법·기준·주의점·병원에 가야 할 신호를 담는다.
- AI가 쓴 티가 나지 않게: 글마다 화자·톤을 다르게(경험담, 살림 팁, 간병 조언, 직장인 공감, 문답형 등), 구성도 다르게(표·체크리스트·단계별).
  과장된 비유(기적·보물·방패·묘약·만병통치) 금지, 섹션마다 같은 요약 문장 반복 금지, "공감·댓글·이웃추가·널리 공유" 같은 복붙 마무리 금지,
  "오늘은 ~에 대해 알아보겠습니다" 같은 상투적 도입 금지, 본문 이모지 금지. 화자가 의사·약사인 척하지 않는다.
- 성분·수치 같은 사실은 바꾸지 말고, 확실하지 않은 의학 정보는 쓰지 않는다. 효능은 "도움이 될 수 있다" 수준, 질병을 '치료'한다고 쓰지 않는다.
  약 복용자·임신부·질환자 주의점을 넣는다.
- 이미 발행된 글(js/posts.js)과 주제가 겹치지 않게, 건강음식·건강정보 카테고리 균형 맞추기.
- 내부 링크는 실제로 있는 글(/posts/<slug>.html)로만, 외부 가짜 URL 금지.
- 사용자가 원고를 주면 사실은 유지하고 문장만 사람이 쓴 것처럼 다듬는다.

## [사진 — 픽사베이]
- API 키는 환경변수 PIXABAY_API_KEY 에서만 읽고, 파일·커밋·로그에 절대 남기지 않는다. (사용자가 대화로 키를 주면 저장소 밖 임시 파일에서 환경변수로만 사용)
- 요청에 User-Agent 헤더를 넣는다(없으면 차단됨). 네트워크 허용: pixabay.com, cdn.pixabay.com
- 도구: `scripts/pixabay_photos.py` — 후보·몽타주는 저장소 밖 작업 폴더(PIX_WORK, 기본 /home/user/pixtools)에만 저장하고 최종 사진만 커밋
  1. `python3 scripts/pixabay_photos.py cands <slug> <n> "<영어 장면 키워드>" ["대체 키워드" ...]` → 슬롯별 가로 사진 후보 6장
  2. `python3 scripts/pixabay_photos.py montage <slug>` → 몽타주를 눈으로 확인
  3. `python3 scripts/pixabay_photos.py pick <slug> <n> <번호> .` → img/<slug>-<n>.jpg (가로 1200px JPG)
- 키워드는 영어 '장면'(음식·일상·병원 장면). 증상·질병 단어를 그대로 검색하지 않는다(혐오·확대 사진이 섞임).
- 빼야 할 사진: 주제와 무관한 동물·아기·의료기기 사진, 누드·혐오·어두운 사진, 글리치·과한 클로즈업, 다른 나라 글자가 크게 보이는 사진.
  맞는 게 없으면 키워드를 바꿔 재검색.
- 글당 2~3장: 히어로 1장(리드 문단 위) + 본문 1~2장(요약 박스 밖, 소제목 아래).
- 각 사진에 alt·figcaption, width·height 실제 값. og:image·JSON-LD image·js/posts.js 썸네일(image)도 갱신.
- 사용자가 zip 으로 사진을 주면 그 사진을 우선 사용.

## [광고]
- 애드센스 승인 전에는 광고 자리를 끈다(js/site.js `ADS_SHOW = false`). "광고 켜줘"라고 할 때만 true 로 바꾸고 ADSENSE.slots 에 슬롯 번호를 넣는다.
- 광고 자리: 상단(header), 글 목록 상단(inList), 사이드바(sidebar), 글 본문 중간(inArticle — site.js 가 세 번째 H2 앞에 자동 삽입).
  자동광고도 켜져 있으므로 광고가 너무 많아 보이지 않게 한다.

## [배포·보고]
- 발행 전 `python3 scripts/site_check.py --sitemap` 으로 점검(오류 0건)하고, 로컬 서버(`python3 -m http.server`)에서 홈·글·카테고리를 렌더링 스크린샷으로 확인한다.
- 작업 브랜치에서 했으면 main 으로 병합·푸시한다(main 이 배포 브랜치).
- 외부 사이트(라이브 calcbox.kr, 애드센스 화면)는 직접 못 여니, 라이브 확인이 필요하면 사용자에게 요청한다.
- 끝나면 발행한 글 제목·카테고리·주소, 총 글 수 표, 사용자가 확인할 것만 짧게 보고한다.

## [로컬 도구]
- tools/ : 사용자가 PC에서 실행하는 색인·검색순위 확인 도구(robots.txt 에서 크롤링 제외). 사이트 콘텐츠가 아니다.
- docs/homepage-archive.md : 예전 홈페이지 기록.
