# 건강상자 (calcbox.kr)

제철 건강음식과 생활 건강정보를 다루는 정적 건강 블로그입니다. GitHub Pages(main 브랜치, CNAME `calcbox.kr`)로 배포합니다.
건강흐름(healthfortune.co.kr)·알고살자(algosalja.com)와 같은 레이아웃·구조를 씁니다.

**운영 규칙은 [CLAUDE.md](CLAUDE.md)에 있습니다.** 글을 쓰거나 고치기 전에 먼저 읽어 주세요.

## 구조

| 경로 | 설명 |
|------|------|
| `index.html` | 홈 — 히어로(대표기사 + 보조카드 2개 + 헤드라인) + 2단(글 목록 + 사이드바) |
| `category.html` | `?cat=food` / `?cat=info` 카테고리, `?q=검색어` 검색 결과 |
| `posts/<slug>.html` | 글 (템플릿 `posts/_template.html`) |
| `js/posts.js` | 카테고리·글 목록 데이터 (최신 글이 위) |
| `js/site.js` | 헤더·푸터·광고 스위치(`ADS_SHOW`)·함께 읽을 글 |
| `js/home.js`, `js/category.js` | 홈 / 카테고리·검색 렌더링 |
| `css/style.css` | 스타일 |
| `img/` | 글 사진 (Pixabay, 가로 1200px) |
| `about.html` `contact.html` `privacy.html` `terms.html` `404.html` | 필수 페이지 |
| `sitemap.xml` `robots.txt` `ads.txt` `CNAME` `.nojekyll` | 검색·광고·배포 설정 |
| `scripts/site_check.py` | 발행 점검 + sitemap 생성 |
| `scripts/pixabay_photos.py` | 픽사베이 사진 후보 → 몽타주 → 선택 |
| 계산기 폴더·`blog/`·`posts/`의 나이날짜 글 | healthfortune.co.kr 로 보내는 리다이렉트 스텁 |

## 새 글 발행

1. `posts/_template.html` 을 복사해 `posts/<slug>.html` 작성
2. 사진: `python3 scripts/pixabay_photos.py cands …` → `montage …` → `pick …` (키는 환경변수 `PIXABAY_API_KEY`)
3. `js/posts.js` 의 `POSTS` 맨 위에 등록
4. `python3 scripts/site_check.py --sitemap` → 오류 0건 확인 후 커밋·푸시

## 로컬 미리보기

```bash
python3 -m http.server 8000
```

## 광고

애드센스 승인 전에는 `js/site.js` 의 `ADS_SHOW = false` 로 광고 자리를 숨깁니다. 로더 스니펫(`ca-pub-7143828779500885`)과 `ads.txt` 는 항상 유지합니다.

## 이전 사이트

사주·운세 사이트 시절 전체 코드는 `archive/calcbox-fortune-site` 브랜치에 있습니다.
