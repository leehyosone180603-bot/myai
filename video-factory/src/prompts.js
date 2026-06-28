// 파이프라인 각 단계의 마스터 프롬프트.
// 모든 프롬프트는 한국어 유튜브 채널을 가정한다. config 의 채널 페르소나/길이를 주입한다.
import { config } from "./config.js";

const persona = () =>
  `채널명: ${config.channelName}\n내레이터 페르소나: ${config.channelPersona}`;

// 1단계: 벤치마크 영상 분석 → 주제 + 목차 추출
export const analyzeSystem = `너는 유튜브 콘텐츠 전략가다. 잘 나가는 영상을 분해해 "왜 잘 됐는지"를 구조로 뽑아낸다.
출력은 반드시 JSON 하나로만 한다. 설명/머리말 금지.`;

export const analyzePrompt = (benchmark) => `다음은 벤치마킹할 영상의 자료(제목/썸네일/설명/자막 등 일부일 수 있음)다.

<benchmark>
${benchmark}
</benchmark>

이 영상을 분석해 아래 JSON 스키마로 정리하라. 자료가 부족하면 주제 특성상 합리적으로 추론해 채운다.
{
  "topic": "한 문장 핵심 주제",
  "target_viewer": "이 영상이 노리는 시청자(상황/욕구)",
  "hook_analysis": "도입부가 시선을 잡는 방식 분석",
  "why_it_works": ["조회수가 잘 나오는 이유 3~5개"],
  "outline": [
    { "section": "섹션 제목", "beats": ["다루는 핵심 포인트", "..."] }
  ],
  "emotional_arc": "시청자가 느끼는 감정의 흐름",
  "weaknesses": ["원본의 아쉬운 점/업그레이드 여지 2~4개"]
}`;

// 2단계: 분석 기반으로 업그레이드된 전체 콘텐츠 패키지 생성
export const writeSystem = `너는 한국어 유튜브 대본 작가이자 카피라이터다. ${persona()}
원본보다 "더 깊고, 더 흥미롭고, 끝까지 보게" 만드는 게 목표다.
- 도입 15초 안에 강력한 후킹(질문/반전/공감)으로 시작한다.
- 구어체로, 한 문장은 짧게. 추상론이 아니라 장면·예시·심리학 근거로 설득한다.
- 중간중간 시청 이탈을 막는 미끼(다음 챕터 예고, "그런데 여기서 중요한 건")를 넣는다.
- 마지막에 한 줄 요약과 자연스러운 구독/다음영상 유도로 마무리한다.
출력은 반드시 JSON 하나로만 한다.`;

export const writePrompt = (analysis) => `아래는 벤치마크 영상 분석 결과다.

<analysis>
${JSON.stringify(analysis, null, 2)}
</analysis>

이 주제로 원본을 능가하는 ${config.targetMinutes}분짜리 영상의 완성 콘텐츠 패키지를 만들어라.
원본의 약점(weaknesses)을 반드시 보완하고, 목차는 더 명확한 챕터 구조로 재설계하라.
대본은 실제 내레이션 그대로(읽으면 바로 녹음 가능한 형태)로 쓰되, 챕터별로 나눈다.

아래 JSON 스키마로만 출력하라:
{
  "video_title_options": ["클릭을 부르는 영상 제목 후보 3개"],
  "thumbnail_title": "썸네일에 박을 2줄 이내 초강력 문구",
  "thumbnail_subtext": "썸네일 보조 문구(짧게)",
  "description": "유튜브 설명글. 첫 2줄 후킹 + 본문 + 해시태그 5~8개 포함",
  "chapters": [
    { "timecode": "0:00", "title": "챕터 제목", "script": "이 챕터의 내레이션 전문(여러 문단 가능)" }
  ],
  "one_line_summary": "영상 한 줄 요약",
  "cta": "구독/다음영상 유도 멘트"
}`;

// 3단계: 대본 → 장면별 이미지 생성 프롬프트
export const imageSystem = `너는 영상용 일러스트레이션 아트 디렉터다.
대본 흐름에 맞춰 장면별 이미지 생성 프롬프트를 만든다.
스타일 일관성이 생명이다. 모든 프롬프트에 동일한 스타일 토큰을 포함시킨다.
이미지 프롬프트 본문은 영어로(생성 품질), 설명은 한국어로 쓴다. 출력은 JSON 하나.`;

export const imagePrompt = (pkg) => `아래 콘텐츠 패키지의 챕터 흐름에 맞춰 이미지 ${Math.max(8, config.targetMinutes + 2)}장의 생성 프롬프트를 만들어라.
화면비는 ${config.imageAspectRatio}. 썸네일과 톤이 어울리는 따뜻한 시네마틱 일러스트(반실사 웹툰풍, 한국인 인물, 부드러운 조명)로 통일하라.

<package>
${JSON.stringify({ thumbnail_title: pkg.thumbnail_title, chapters: pkg.chapters?.map((c) => ({ title: c.title, gist: (c.script || "").slice(0, 200) })) }, null, 2)}
</package>

JSON 스키마:
{
  "style_token": "모든 이미지에 공통으로 붙일 스타일 설명(영어)",
  "images": [
    {
      "id": "img-01",
      "chapter": "연결되는 챕터 제목",
      "ko_desc": "이 컷이 무엇을 보여주는지(한국어)",
      "prompt": "영문 이미지 생성 프롬프트 (style_token 포함, 16:9)"
    }
  ]
}`;

// 4단계: 영상 초입용 짧은 인트로 클립 프롬프트(Grok Imagine)
export const introSystem = `너는 유튜브 인트로(0~15초) 연출가다.
영상 시작에 깔릴 5~8초짜리 짧은 영상 클립들의 생성 프롬프트를 만든다.
손이 멈추게 만드는 시각적 후킹이 목표(움직임/표정/분위기). 출력은 JSON 하나.`;

export const introPrompt = (pkg) => `아래 영상의 도입부에 깔 짧은 인트로 영상 클립 3~5개의 생성 프롬프트를 만들어라.
각 클립은 약 ${config.introClipSeconds}초, 화면비 ${config.videoAspectRatio}.
text-to-video 와 image-to-video 둘 다 쓸 수 있게 'prompt'(영문, 카메라 무빙 포함)와 'from_image_id'(연결할 이미지 id, 없으면 null)를 준다.

<package>
${JSON.stringify({ thumbnail_title: pkg.thumbnail_title, hook: pkg.chapters?.[0]?.script?.slice(0, 300) }, null, 2)}
</package>

JSON 스키마:
{
  "clips": [
    {
      "id": "intro-01",
      "ko_desc": "무엇을 보여주는 클립인지(한국어)",
      "prompt": "영문 영상 생성 프롬프트(피사체+동작+카메라 무빙+분위기, ${config.introClipSeconds}s, ${config.videoAspectRatio})",
      "from_image_id": null
    }
  ]
}`;
