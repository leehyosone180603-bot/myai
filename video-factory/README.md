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
| `audio/narration.mp3` | (UI 🎙️ 버튼) 대본을 읽은 TTS 음성 (ElevenLabs) |
| `narration.srt` | (UI 🎙️ 버튼) 음성에 타이밍이 맞춰진 자막 파일 |

## 음성(TTS) + 자막(SRT)

UI 결과 화면의 **`🎙️ 음성 + 자막(SRT) 생성`** 버튼을 누르면, 대본을 ElevenLabs 음성으로 읽고 그 음성에 맞춘 자막(`.srt`)까지 자동으로 만듭니다.

1. ⚙️설정에 **ElevenLabs API 키** 입력 → 저장
2. **`🔊 보이스 목록 불러오기`** → 원하는 목소리 선택 → 다시 저장
3. 결과 화면에서 **`🎙️ 음성 + 자막`** 클릭 → `audio/narration.mp3` 와 `narration.srt` 생성

> **순서**: 음성이 먼저 만들어지고, 자막은 그 음성의 실제 타이밍에 맞춰 생성됩니다.
> `.srt` 는 시간코드가 들어 있어, 편집기(캡컷·프리미어·곰믹스 등)에 **자막 트랙으로 끌어넣으면 자동으로 타이밍이 맞습니다.**

## 🖱️ 가장 쉬운 사용법 — UI 프로그램 (명령어 X)

명령어를 몰라도 됩니다. **파일을 더블클릭**하면 브라우저에 프로그램 창이 뜹니다.

1. **Node.js 설치** (최초 1회) — https://nodejs.org 에서 LTS 버전 설치
2. 폴더에서 더블클릭
   - 윈도우: **`시작하기-윈도우.bat`**
   - 맥: **`시작하기-맥.command`** (최초 1회는 우클릭 → 열기)
3. 자동으로 열린 브라우저 창에서:
   - ⚙️ **설정**에 API 키 한 번 입력 → 저장
   - **1단계** 유튜브 링크 붙여넣고 `자막 가져오기` (또는 자막 직접 붙여넣기)
   - **2단계** `✨ 생성` 버튼 → 제목·썸네일·설명·대본·이미지/인트로 프롬프트가 화면에 나옴
   - 필요하면 `🖼️ 이미지 생성` / `🎞️ 인트로 영상 생성` 버튼으로 실제 미디어까지 렌더링
   - 각 항목 옆 `복사` 버튼으로 바로 붙여쓰기

> 검은 실행창은 프로그램이 켜져 있는 동안 그대로 두세요(닫으면 종료). 브라우저가 안 열리면 `http://localhost:4399` 로 접속.
> ⚠️ 자막 자동 수집(`자막 가져오기`)은 외부망이 열린 환경 + `yt-dlp` 설치가 필요합니다(아래 참고). 안 되면 자막을 직접 붙여넣으세요.

---

## 명령줄(CLI)로 쓰기

```bash
cd video-factory

# 1) 환경설정
cp .env.example .env
#   .env 를 열어 XAI_API_KEY 를 채우세요. (모델명도 콘솔에서 최신값으로 확인)

# 2) 벤치마크 입력 준비 — 두 가지 방법
#  (A) URL 자동 수집: yt-dlp 로 유튜브 자막을 받아옵니다 (외부망 + yt-dlp 필요)
node src/index.js run --url "https://www.youtube.com/watch?v=VIDEO_ID" --slug 내영상
#  (B) 수동 입력: 자막을 benchmark/<이름>.md 에 직접 붙여넣고 사용
#      (자동 수집이 막힌 환경/자막 없는 영상용. 예시: benchmark/yeoyuroun-namja.md)

# 3) 분석만 먼저 확인 (주제 + 목차)
node src/index.js plan --input benchmark/yeoyuroun-namja.md

# 4) 전체 생성 (대본 + 메타데이터 + 이미지/인트로 프롬프트)
node src/index.js run --input benchmark/yeoyuroun-namja.md --slug yeoyuroun-namja

# 5) 이미지·인트로 영상까지 실제로 렌더링 (API 비용 발생)
node src/index.js run --input benchmark/yeoyuroun-namja.md --slug yeoyuroun-namja --images --videos

# (자막만 따로 받기)
node src/index.js fetch --url "https://www.youtube.com/watch?v=VIDEO_ID"
```

## 자막 자동 수집 (`--url`)

`downsub.com` 같은 사이트가 내부적으로 하는 일(유튜브 자막 트랙 다운로드)을 원천 도구 **yt-dlp** 로 직접 수행합니다. 중간 사이트 스크래핑보다 안정적입니다.

```bash
pip install -U yt-dlp        # 최초 1회 설치
node src/index.js run --url "https://youtu.be/VIDEO_ID" --slug 내영상
```

- 한국어 자막 → 한국어 자동자막 → 영어 순으로 가져옵니다 (`--lang ko,en` 으로 변경 가능).
- 받은 자막은 정제(중복 줄 제거, `[음악]`·타임코드·태그 삭제) 후 `benchmark/<id>.md` 에 저장되고 곧바로 분석에 사용됩니다.
- ⚠️ **외부망이 차단된 환경(예: 일부 원격 세션)에서는 동작하지 않습니다.** 그럴 땐 (B) 수동 입력을 쓰세요 — 영상 페이지의 `...더보기 → 스크립트 표시`에서 복사해 붙여넣으면 됩니다.

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

1. 벤치마크 확보 — URL 자동 수집 `--url "유튜브주소"` 또는 자막을 `benchmark/새이름.md` 에 붙여넣기
2. `node src/index.js run --url "유튜브주소" --slug 새이름`  (또는 `--input benchmark/새이름.md`)
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
├── 시작하기-윈도우.bat   # 더블클릭 실행 (Windows)
├── 시작하기-맥.command   # 더블클릭 실행 (macOS)
├── src/
│   ├── server.js       # UI 서버 (브라우저 프로그램)
│   ├── index.js        # CLI 진입점
│   ├── config.js       # .env 로더 + 설정 저장
│   ├── clients.js      # LLM/이미지/영상 API 클라이언트
│   ├── transcript.js   # 유튜브 자막 자동 수집(yt-dlp)
│   ├── prompts.js      # 단계별 마스터 프롬프트
│   └── pipeline.js     # 전체 오케스트레이션
├── ui/
│   └── index.html      # UI 화면
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
