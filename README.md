# 로또 번호 추출기 (Lotto Number Generator)

[kor.pe.kr 로또 유틸](http://kor.pe.kr/util/4/lotto/)과 비슷한, 한국 로또 6/45 번호를 자동으로 추출해 주는 정적 웹사이트입니다. 별도의 빌드 과정 없이 HTML/CSS/JavaScript로만 동작하며 Google AdSense 광고 슬롯이 포함되어 있습니다.

## 주요 기능

- 로또 6/45 번호 자동 추출 (1~45 중 6개, 중복 없음)
- 한 번에 1~5게임 동시 생성
- **포함 번호** 지정 (반드시 들어갈 번호, 최대 5개)
- **제외 번호** 지정 (추첨에서 빠질 번호)
- 한국 로또 공식 색상 구간으로 번호 공(ball) 표시
- 결과 클립보드 복사
- `crypto.getRandomValues` 기반의 고른 난수 (지원 시)
- 모바일 반응형 디자인, SEO 메타태그 포함

## 파일 구성

| 파일 | 설명 |
|------|------|
| `index.html` | 메인 페이지 (마크업 + 광고 슬롯) |
| `style.css` | 스타일 |
| `script.js` | 번호 추출 로직 |
| `ads.txt` | AdSense 게시자 인증 파일 |
| `robots.txt`, `sitemap.xml` | 검색엔진 색인용 |

## 로컬에서 실행

정적 파일이므로 브라우저로 `index.html`을 열면 됩니다. 로컬 서버로 띄우려면:

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 배포

GitHub Pages, Netlify, Vercel, Cloudflare Pages 등 정적 호스팅 어디에나 그대로 올릴 수 있습니다. GitHub Pages 예시: 저장소 Settings → Pages → 브랜치 선택 후 저장.

## Google AdSense 설정

광고가 실제로 노출되려면 아래 자리표시자를 본인 계정 값으로 교체해야 합니다.

1. **게시자 ID** — `index.html`과 `ads.txt`의 `ca-pub-XXXXXXXXXXXXXXXX` / `pub-XXXXXXXXXXXXXXXX` 를 본인 게시자 ID로 변경
2. **광고 단위 슬롯 ID** — `index.html`의 `data-ad-slot="0000000000"`, `data-ad-slot="1111111111"` 값을 AdSense에서 발급받은 광고 단위 ID로 변경
3. AdSense 콘솔에서 사이트 도메인을 등록하고 검토를 통과해야 광고가 게재됩니다.
4. `ads.txt`는 배포 도메인 루트(`https://도메인/ads.txt`)에서 접근 가능해야 합니다.

> 참고: AdSense 승인을 위해서는 실제 도메인, 충분한 콘텐츠, 개인정보처리방침 페이지 등이 필요할 수 있습니다.

## 면책

본 도구는 재미와 참고용이며 당첨을 보장하지 않습니다.
