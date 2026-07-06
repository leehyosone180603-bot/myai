# 도깨비 사주 결제 백엔드 (Cloudflare Worker)

포트원(PortOne) V2 결제를 **서버에서 검증**하고, 상세 페이지 접근용 **토큰(HMAC)** 을 발급/검증합니다.
정적 사이트(GitHub Pages)는 그대로 두고, 결제 검증만 이 Worker가 담당합니다.

## 라우트
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 상태 확인 |
| POST | `/pay/complete` | `{ paymentId, params }` → 포트원 검증 → `{ ok, token }` |
| POST | `/pay/access` | `{ token, params }` → 토큰 검증 → `{ ok }` |

`params`는 생년월일시 등 사주 파라미터(y,m,d,g,h,mi,cal,leap). 토큰은 이 값에 묶여, 결제한 본인 사주에서만 잠금이 풀립니다.

## 배포 방법

### 1) 사전 준비
- Cloudflare 계정 (무료)
- 포트원 콘솔에서 **V2 API Secret** 발급 (실결제는 PG 심사 후, 테스트는 테스트 채널로)

### 2) 설치 & 배포
```bash
cd worker
npm i -g wrangler
wrangler login

# 시크릿 등록 (커밋 금지)
wrangler secret put PORTONE_API_SECRET   # 포트원 V2 API Secret 붙여넣기
wrangler secret put TOKEN_SECRET         # 아무 긴 임의 문자열 (예: openssl rand -hex 32)

wrangler deploy
```

### 3) 배포 결과
- `https://dokkaebi-pay.<계정>.workers.dev` 형태의 URL이 나옵니다.
- 이 URL을 프론트엔드 `saju/saju-dokkaebi.js`의 `CONFIG.WORKER_URL`에 넣으세요.
- 포트원 콘솔 **웹훅 URL**에도 등록해두면 좋습니다(선택).

### 4) 가격/오리진 변경
`wrangler.toml`의 `[vars]`에서 `PRICE`(원), `ALLOWED_ORIGIN`(사이트 주소)을 수정 후 재배포.

## 보안 메모
- 결제 검증은 **반드시 이 Worker(서버)** 에서 포트원 API Secret으로 수행합니다. 프론트에는 절대 Secret을 두지 않습니다.
- 접근 토큰은 `TOKEN_SECRET`으로 서명(HMAC-SHA256)해 위변조를 막습니다.
- 참고: 상세 풀이 텍스트는 클라이언트에서 생성되므로, 결제 없이 소스를 역설계해 값을 만드는 것까지 100% 막지는 못합니다(엔터테인먼트 상품 기준 허용 범위). 완전 차단이 필요하면 상세 텍스트 생성도 Worker로 옮기면 됩니다.
