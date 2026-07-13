# 검색 순위 확인 프로그램 (네이버 · 다음)

`keywords.json`에 넣은 키워드를 **네이버·다음에서 검색**해, 내 사이트(`calcbox.kr`)가
**몇 페이지 / 어느 영역 / 대략 몇 번째**에 나오는지 자동으로 찾아 **HTML 리포트**로 정리합니다.

## 준비 (처음 한 번만)

1. **Node.js 설치** — https://nodejs.org 에서 LTS 버전 설치
2. 이 폴더(`tools/rank-checker`)에서 명령창(cmd/터미널)을 엽니다.
3. 아래 명령으로 필요한 프로그램 설치:
   ```
   npm install playwright
   npx playwright install chromium
   ```

## 실행

```
node rank-check.js
```

- 실행이 끝나면 같은 폴더에 **`report.html`** 과 **`report.csv`** 가 생성됩니다.
- `report.html` 을 더블클릭하면 결과를 표로 볼 수 있습니다.
- 브라우저가 검색하는 모습을 직접 보고 싶다면:
  - Windows: `set HEADLESS=false && node rank-check.js`
  - Mac/Linux: `HEADLESS=false node rank-check.js`

## 확인할 키워드 바꾸기

`keywords.json` 파일을 메모장으로 열어 수정하세요.

```json
{
  "domain": "calcbox.kr",            // 찾을 내 사이트 주소
  "engines": ["naver", "daum"],       // 검색엔진
  "verticals": ["웹문서", "통합"],     // 확인할 영역 (블로그도 추가 가능)
  "maxPages": 5,                       // 각 영역에서 몇 페이지까지 확인할지
  "keywords": ["연봉 실수령액", "만 나이 계산기"]
}
```

## 결과 보는 법

| 열 | 의미 |
|----|------|
| 노출 | ✅ 노출 / ❌ 미노출 |
| 영역 | 웹문서 · 통합 · 블로그 중 어디서 발견됐는지 |
| 페이지 | 몇 페이지에서 발견됐는지 |
| 대략 순위 | 그 페이지에서 대략 몇 번째 결과인지 |

## 참고 / 한계

- "대략 순위"는 페이지 내 결과 링크 기준 **근사값**입니다. 광고·스마트블록 등으로 실제 화면과 차이가 있을 수 있습니다.
- 검색 결과는 **지역·로그인·개인화·시점**에 따라 달라질 수 있습니다.
- 네이버는 자동화 접근을 제한할 수 있어, 결과가 비어 보이면 잠시 후 다시 실행하거나 `HEADLESS=false`로 실행해 보세요.
- 새로 발행한 글은 검색엔진에 **수집·색인된 뒤에야** 노출됩니다. 색인 전에는 미노출로 표시됩니다.
