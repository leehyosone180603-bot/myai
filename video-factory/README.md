# 🎬 video-factory

벤치마킹할 영상 **하나**를 넣으면, 그 영상을 분석해서 **더 흥미로운 버전의 영상 제작에 필요한 모든 것**을 한 번에 뽑아내는 자동화 파이프라인입니다.

기존에 손으로 하던 작업 —
**① 잘 나가는 영상 분석 → ② 주제·목차 정리 → ③ 대본 업그레이드 → ④ 제목/썸네일/설명 작성 → ⑤ 영상에 넣을 이미지 생성 → ⑥ 인트로용 짧은 영상(Grok)** —
을 명령어 한 줄로 끝냅니다.

## 무엇을 만들어 주나요

`output/<slug>/` 에 다음이 생성됩니다.

| 파일 | 내용 |
|---|---|
| `01-analysis.json` | 벤치마크 영상 분석 (주제·목차·잘 되는 이유·약점) |
| `02-content-package.json` | 영상 제목 후보 · 썸네일 문구 · 설명글 · 챕터별 대본 |
| `content.md` | 위 패키지를 사람이 읽기 좋게 정리한 문서 |
| `03-image-prompts.json` | 장면별 이미지 생성 프롬프트 (스타일 통일 토큰 포함) |
| `04-intro-prompts.json` | 영상 초입용 짧은 클립(Grok Imagine) 생성 프롬프트 |
| `images/*.png` | (옵션 `--images`) 실제 생성된 이미지 |
| `intro/*.mp4` | (옵션 `--videos`) 실제 생성된 인트로 영상 |

## 빠르게 시작하기

```bash
cd video-factory

# 1) 환경설정
cp .env.example .env
#   .env 를 열어 XAI_API_KEY 를 채우세요. (모델명도 콘솔에서 최신값으로 확인)

# 2) 벤치마크 입력 만들기
#   benchmark/<이름>.md 에 분석할 영상 정보를 적습니다.
#   자막(스크립트)을 통째로 붙여 넣을수록 결과가 좋아집니다.
#   예시: benchmark/yeoyuroun-namja.md

# 3) 분석만 먼저 확인 (주제 + 목차)
node src/index.js plan --input benchmark/yeoyuroun-namja.md

# 4) 전체 생성 (대본 + 메타데이터 + 이미지/인트로 프롬프트)
node src/index.js run --input benchmark/yeoyuroun-namja.md --slug yeoyuroun-namja

# 5) 이미지·인트로 영상까지 실제로 렌더링 (API 비용 발생)
node src/index.js run --input benchmark/yeoyuroun-namja.md --slug yeoyuroun-namja --images --videos
```

> Node 18.17+ 필요 (네이티브 `fetch` 사용, 외부 의존성 0).

## 파이프라인 흐름

```
benchmark/<name>.md
        │
        ▼
 ①  분석   (LLM)  → 01-analysis.json          주제·목차·약점 추출
        ▼
 ②  집필   (LLM)  → 02-content-package.json    제목/썸네일/설명/대본
                    content.md
        ▼
 ③  이미지 (LLM)  → 03-image-prompts.json      장면별 이미지 프롬프트
        ▼
 ④  인트로 (LLM)  → 04-intro-prompts.json      짧은 인트로 영상 프롬프트
        ▼
 ⑤  (옵션) 렌더링                              이미지 → images/, 영상 → intro/
     --images : xAI(또는 OpenAI) 이미지 API
     --videos : xAI Grok Imagine 영상 API (image-to-video / text-to-video)
```

기존에 "이미지를 먼저 만들고 → 그록(Grok)으로 그 이미지를 움직이는 인트로 영상으로" 만들던 흐름을 그대로 자동화했습니다.
`04-intro-prompts.json` 의 각 클립은 `from_image_id` 로 어떤 이미지에서 영상을 뽑을지 연결되며, `--videos` 실행 시 image-to-video 로 처리됩니다.

## 설정 (.env)

| 키 | 설명 |
|---|---|
| `TEXT_PROVIDER` | 대본 생성 LLM (`xai` / `openai` / `anthropic`) |
| `XAI_API_KEY` | xAI(Grok) 키 — 대본·이미지·영상에 사용 |
| `XAI_TEXT_MODEL` | 대본 모델 (예: `grok-4.3` — 콘솔에서 최신명 확인) |
| `XAI_IMAGE_MODEL` | 이미지 모델 (예: `grok-2-image`) |
| `XAI_VIDEO_MODEL` | 인트로 영상 모델 (예: `grok-imagine-video-1.5`) |
| `CHANNEL_NAME` / `CHANNEL_PERSONA` | 채널 톤·문체 (대본에 반영) |
| `TARGET_MINUTES` | 목표 영상 길이(분) — 대본 분량 산정 |
| `IMAGE_ASPECT_RATIO` / `VIDEO_ASPECT_RATIO` | 화면비 |
| `INTRO_CLIP_SECONDS` | 인트로 클립 길이(초) |

> ⚠️ xAI의 모델명·엔드포인트는 업데이트가 잦습니다. 호출이 실패하면 먼저 [xAI 콘솔/문서](https://docs.x.ai)에서 현재 모델명을 확인해 `.env` 를 갱신하세요. 엔드포인트는 `src/clients.js` 에서 조정합니다.

## 새 영상 만들 때 (재사용 방법)

1. `benchmark/새이름.md` 에 벤치마크 영상 정보(가능하면 자막 전체)를 붙여넣기
2. `node src/index.js run --input benchmark/새이름.md --slug 새이름`
3. `output/새이름/content.md` 검토 후 필요시 수정
4. `--images --videos` 로 미디어 렌더링

## 예시 결과물

`output/yeoyuroun-namja/` 에 "여자들이 환장하는 여유로운 남자란?" 영상을 벤치마크해 만든 **완성 콘텐츠 패키지 예시**가 들어 있습니다. (`content.md` 부터 보세요.)

## 폴더 구조

```
video-factory/
├── README.md
├── package.json
├── .env.example
├── src/
│   ├── index.js        # CLI 진입점
│   ├── config.js       # .env 로더 + 설정
│   ├── clients.js      # LLM/이미지/영상 API 클라이언트
│   ├── prompts.js      # 단계별 마스터 프롬프트
│   └── pipeline.js     # 전체 오케스트레이션
├── benchmark/
│   └── yeoyuroun-namja.md
└── output/
    └── yeoyuroun-namja/
        ├── content.md
        ├── 01-analysis.json
        ├── 02-content-package.json
        ├── 03-image-prompts.json
        ├── 04-intro-prompts.json
        ├── images/
        └── intro/
```
