# 홈페이지에서 제외한 콘텐츠 기록 (복원용)

AdSense 승인을 위해 홈페이지(index.html)를 **"나이·날짜 계산 전문"**으로 좁히면서,
아래 항목들을 **홈페이지 카테고리/링크에서 제외**했습니다.

> ⚠️ 페이지 자체는 삭제하지 않았습니다. URL은 그대로 살아 있고, 홈페이지에서 **링크만 제거**했습니다.
> 나중에 전문 분야를 넓히거나 서브도메인/별도 사이트로 옮길 때, 아래 `tool-card` 조각을 그대로 붙여 복원하면 됩니다.

제외 일자: 2026-07 (나이·날짜 전문 개편)

---

## 1) 계산기 — 급여·세금 (인접하지만 다른 축)

```html
<a class="tool-card" href="/salary/">
  <span class="tc-icon">💰</span>
  <span class="tc-body"><strong>연봉 실수령액 계산기</strong><small>4대보험·세금 공제 후 월 실수령액</small></span>
  <span class="tc-arrow">→</span>
</a>
<a class="tool-card" href="/vat/">
  <span class="tc-icon">🧾</span>
  <span class="tc-body"><strong>부가세 계산기</strong><small>부가가치세 10% 빠르게 계산</small></span>
  <span class="tc-arrow">→</span>
</a>
<a class="tool-card" href="/severance/">
  <span class="tc-icon">💼</span>
  <span class="tc-body"><strong>퇴직금 계산기</strong><small>평균임금 기준 예상 퇴직금</small></span>
  <span class="tc-arrow">→</span>
</a>
<a class="tool-card" href="/freelancer/">
  <span class="tc-icon">🧑‍💻</span>
  <span class="tc-body"><strong>프리랜서 세금 계산기</strong><small>3.3% 원천징수 후 실수령액</small></span>
  <span class="tc-arrow">→</span>
</a>
```
관련 블로그 글(발행됨): `salary-net-pay`, `high-salary`, `vat-guide`, `severance-pay`, `freelancer-tax`

## 2) 계산기 — 로또 (도박성, AdSense 민감)

```html
<a class="tool-card" href="/lotto-prize/">
  <span class="tc-icon">🍀</span>
  <span class="tc-body"><strong>로또 당첨금 실수령액</strong><small>당첨금 세금 공제 후 실수령액</small></span>
  <span class="tc-arrow">→</span>
</a>
<a class="tool-card" href="/lotto/">
  <span class="tc-icon">🎱</span>
  <span class="tc-body"><strong>로또 번호 추출기</strong><small>로또 6/45 번호 자동 추출</small></span>
  <span class="tc-arrow">→</span>
</a>
```
관련 블로그 글(발행됨): `lotto-prize-tax`, `lotto-number`

## 3) 계산기 — 공학용 (범용)

```html
<a class="tool-card" href="/scientific/">
  <span class="tc-icon">🧮</span>
  <span class="tc-body"><strong>공학용 계산기</strong><small>삼각함수·로그·제곱 등 함수 계산</small></span>
  <span class="tc-arrow">→</span>
</a>
```

## 4) 게임 (오락)

```html
<a class="tool-card" href="/spy-game/">
  <span class="tc-icon">🕵️</span>
  <span class="tc-body"><strong>스파이 위장 게임</strong><small>패턴이 어긋나는 스파이를 찾는 관찰력 게임</small></span>
  <span class="tc-arrow">→</span>
</a>
<a class="tool-card" href="/duck-octopus-game/">
  <span class="tc-icon">🦆</span>
  <span class="tc-body"><strong>오리와 문어의 물방울 디펜스</strong><small>물방울을 막아내는 캐주얼 디펜스 게임</small></span>
  <span class="tc-arrow">→</span>
</a>
```

## 5) 사주·궁합 (운세 — 별도 분야)

```html
<a class="tool-card" href="/saju/">
  <span class="tc-icon">👺</span>
  <span class="tc-body"><strong>도깨비 사주</strong><small>천 년 묵은 도깨비가 봐주는 무료 사주풀이</small></span>
  <span class="tc-arrow">→</span>
</a>
<a class="tool-card" href="/gunghap/">
  <span class="tc-icon">💞</span>
  <span class="tc-body"><strong>무료 궁합 계산기</strong><small>두 사람 사주로 보는 오행 궁합</small></span>
  <span class="tc-arrow">→</span>
</a>
```
관련 블로그 글(발행됨, 20편): `saju-*`, `mbti-vs-saju` 등

---

## 참고 — 블로그(/blog/)에는 아직 남아 있는 비주제 글
홈페이지에서는 제외했지만, `/blog/` 목록과 sitemap에는 아래 글들이 **아직 노출**됩니다.
전문성 신호를 더 강화하려면 다음 단계에서 이 글들도 블로그 목록/sitemap에서 분리하는 것을 권장합니다.
- 사주·운세: `saju-*`(약 20편), `mbti-vs-saju`
- 급여·세금: `salary-net-pay`, `high-salary`, `vat-guide`, `severance-pay`, `freelancer-tax`
- 로또: `lotto-prize-tax`, `lotto-number`
- 건강(thin): `omega3-benefits`, `magnesium-benefits`, `milk-thistle-benefits`

## 유지(=나이·날짜 전문, 홈페이지에 노출)
- 계산기: `/age/`, `/birth-year/`, `/business-days/`, `/military/`
- 블로그: `age-calculator`, `birth-year-guide`, `age-types-korean`, `fast-year-birth`,
  `birthyear-to-hakbeon`, `pension-start-age`, `senior-benefits-age`, `milestone-ages`,
  `rrn-age-decode`, `age-table-2026`, `zodiac-year-age`(대기)

---

## [업데이트 2026-07] 블로그·사이트맵도 나이·날짜 전문으로 정리

- **건강 thin 3편 완전 삭제**: `omega3-benefits`, `magnesium-benefits`, `milk-thistle-benefits`
  - `blog/` 디렉토리 삭제 + `posts.json`에서 제거. (원문 데이터는 `scripts/data/benefit.js`에 보존)
- **오프토픽 블로그 글 noindex + 목록/사이트맵 제외**: 사주 20편·급여세금 5편·로또 2편 등
  - `scripts/build-blog.js`의 `ONTOPIC` 허용목록에 없는 발행 글은 자동으로 noindex 처리되고 `/blog/` 목록·`sitemap.xml`에서 빠집니다.
  - 페이지 URL 자체는 살아 있습니다(삭제 아님).
- **오프토픽 정적 페이지 사이트맵 제외**: `scientific/salary/vat/severance/freelancer/lotto-prize/lotto/spy-game/duck-octopus-game/saju*/gunghap`
  - `scripts/build-blog.js`의 `STATIC_URLS`에서 제외. 페이지는 유지.

### 되돌리는 법
- 블로그 글 복원: `scripts/build-blog.js`의 `ONTOPIC` Set에 해당 slug 추가 → `node scripts/build-blog.js`
- 정적 페이지 복원: `STATIC_URLS`에 해당 URL 다시 추가
- 홈페이지 링크 복원: 위 `tool-card` 조각을 `index.html`에 붙여넣기
