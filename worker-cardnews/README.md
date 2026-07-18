# cardnews-ai — 카드뉴스 현지화 백엔드 (Cloudflare Worker)

`card-news/` 웹페이지의 백엔드입니다. Claude API 키를 서버에 숨기고, 외부 원본
이미지를 프록시해 브라우저 `<canvas>` 의 CORS 오염(tainted canvas)을 막습니다.

## 라우트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET  | `/health` | 상태 확인 |
| POST | `/analyze` | `{ cardImage, captionText }` → `{ headline_en, headline_ko, caption_ko }` (Claude 비전) |
| GET  | `/img?url=<URL>` | 원본 이미지 프록시(CORS 헤더 부여) |

## 배포

```bash
cd worker-cardnews
npm i -g wrangler          # 이미 있으면 생략

# Claude API 키를 시크릿으로 등록 (커밋 금지)
wrangler secret put ANTHROPIC_API_KEY

wrangler deploy
```

배포 후 나오는 주소(예: `https://cardnews-ai.<계정>.workers.dev`)를
`card-news/` 페이지의 **⚙️ 백엔드 설정 → 백엔드 Worker URL** 에 입력하면 됩니다.

## 설정 (wrangler.toml `[vars]`)

- `MODEL` — 사용할 Claude 모델. 기본 `claude-sonnet-5`(비전·저비용). 품질을 더
  올리려면 `claude-opus-4-8` 로 교체.
- `ALLOWED_ORIGIN` — CORS 허용 오리진. 본인 사이트로 좁히려면
  `"https://calcbox.kr"` 처럼 지정(기본 `"*"`).

## 비용 메모

`/analyze` 호출마다 Claude 비전 API 요금이 발생합니다(이미지 1장 + 짧은 텍스트).
`/img` 프록시는 Claude를 호출하지 않으므로 무료입니다.
