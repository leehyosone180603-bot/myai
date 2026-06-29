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
- 절대 원본을 요약하지 마라. 업그레이드는 "더 길고 풍부하게"가 핵심이다. 각 챕터를 충분히 길게 쓴다.
[신빙성 규칙 — 반드시]
- 존재하지 않는 통계·수치·연구·논문·실험·인용을 지어내지 마라(거짓 근거 금지).
- 심리학 용어(예: 자기효능감, 정서적 안정감)는 뜻에 맞게 정확히 쓰고 과장하지 마라.
- 단정적 일반화("여자는 다 ~한다") 대신 "~하는 경향이 있다", "보통 ~한 경우가 많다"처럼 표현해 과장을 피하라.
- 근거는 시청자가 스스로 떠올릴 수 있는 일상적·관찰 가능한 경험과 사례 중심으로 설득하라.
출력은 반드시 JSON 하나로만 한다.`;

export const writePrompt = (analysis) => {
  const minChars = Math.round(config.targetMinutes * 430); // 한국어 내레이션 약 430자/분
  return `아래는 벤치마크 영상 분석 결과다.

<analysis>
${JSON.stringify(analysis, null, 2)}
</analysis>

이 주제로 원본을 능가하는 ${config.targetMinutes}분짜리 영상의 완성 콘텐츠 패키지를 만들어라.
원본의 약점(weaknesses)을 반드시 보완하고, 목차는 더 명확한 챕터 구조로 재설계하라.
대본은 실제 내레이션 그대로(읽으면 바로 녹음 가능한 형태)로 쓰되, 챕터별로 나눈다.

[분량 규칙 — 반드시 지킬 것]
- 전체 대본(chapters 의 script 합계)은 공백 포함 최소 ${minChars}자 이상.
- 챕터는 5~7개로 나누고, 각 챕터 script 는 최소 3~5문단으로 충분히 길게.
- 분량을 채우되 군더더기·반복으로 늘리지 말고, 구체적 예시·심리 근거·실전 대사로 깊이를 더해 채워라.

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
};

// 3단계: 대본 → 장면별 이미지 생성 프롬프트
// 핵심 규칙: (1) 말풍선/글자/자막 절대 금지  (2) 대화 대사가 아니라 '장면'을 묘사
export const NO_TEXT_NEGATIVE =
  "no text, no letters, no words, no speech bubbles, no dialogue balloons, no captions, no subtitles, no comic panels, no panel borders, no watermark, no logo, no signage";

export const imageSystem = `너는 영상용 일러스트레이션 아트 디렉터다.
대본 흐름에 맞춰 장면별 이미지 생성 프롬프트를 만든다.
[매우 중요한 규칙]
- 이미지에는 글자/텍스트/자막/말풍선/만화 칸이 절대 없어야 한다. 인물이 대화하는 내용이어도 '말풍선'이나 '글자'를 그리지 말 것.
- 대사를 적지 말고, 그 순간의 '장면'(표정·몸짓·상황·배경)만 시각적으로 묘사하라.
- 한 장면당 하나의 깔끔한 단일 일러스트(만화 컷 분할 X).
- 모든 프롬프트 끝에 반드시 다음을 붙인다: "${NO_TEXT_NEGATIVE}".
- 모든 이미지에 동일한 스타일 토큰을 포함해 그림체를 통일한다.
이미지 프롬프트 본문은 영어, 설명(ko_desc)은 한국어. 출력은 JSON 하나만.`;

export const imagePrompt = (pkg) => `아래 콘텐츠 패키지의 챕터 흐름에 맞춰 이미지 ${Math.max(8, config.targetMinutes + 2)}장의 생성 프롬프트를 만들어라.
화면비 ${config.imageAspectRatio}. 그림체/분위기는 아래 스타일로 통일하라(보기 편하고 부드러운 톤):
스타일: "${config.imageStyle}"

<package>
${JSON.stringify({ thumbnail_title: pkg.thumbnail_title, chapters: pkg.chapters?.map((c) => ({ title: c.title, gist: (c.script || "").slice(0, 200) })) }, null, 2)}
</package>

규칙(반드시):
- 각 prompt 는 그 챕터 내용을 표현하는 '장면' 묘사 (한국인 인물, 표정·몸짓·상황 중심).
- 말풍선/글자/자막/만화칸 금지. prompt 끝에 항상 "${NO_TEXT_NEGATIVE}" 를 붙일 것.
- style_token 에는 위 스타일 문구를 그대로 넣을 것.

JSON 스키마:
{
  "style_token": "위 스타일 문구(영어) + 16:9",
  "images": [
    {
      "id": "img-01",
      "chapter": "연결되는 챕터 제목",
      "ko_desc": "이 컷이 무엇을 보여주는지(한국어, 대사 아님)",
      "prompt": "영문 장면 묘사 + style_token + '${NO_TEXT_NEGATIVE}'"
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
