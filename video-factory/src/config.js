// 환경설정 로더.  .env 파일을 (의존성 없이) 직접 파싱한다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");

// .env 를 process.env 에 병합 (이미 있는 환경변수는 덮어쓰지 않음)
function loadDotEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

const env = (k, fallback = "") =>
  process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : fallback;

function buildConfig() {
  return {
    textProvider: env("TEXT_PROVIDER", "xai"),

    xai: {
      apiKey: env("XAI_API_KEY"),
      baseUrl: env("XAI_BASE_URL", "https://api.x.ai/v1"),
      textModel: env("XAI_TEXT_MODEL", "grok-4.3"),
      imageModel: env("XAI_IMAGE_MODEL", "grok-imagine-image-quality"),
      videoModel: env("XAI_VIDEO_MODEL", "grok-imagine-video-1.5"),
    },
    openai: {
      apiKey: env("OPENAI_API_KEY"),
      baseUrl: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
      textModel: env("OPENAI_TEXT_MODEL", "gpt-4o"),
      imageModel: env("OPENAI_IMAGE_MODEL", "gpt-image-1"),
    },
    anthropic: {
      apiKey: env("ANTHROPIC_API_KEY"),
      baseUrl: env("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
      textModel: env("ANTHROPIC_TEXT_MODEL", "claude-opus-4-8"),
    },
    // TTS(음성) — ElevenLabs
    elevenlabs: {
      apiKey: env("ELEVENLABS_API_KEY"),
      baseUrl: env("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io/v1"),
      model: env("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
      voiceId: env("ELEVENLABS_VOICE_ID", ""),
      speed: Number(env("ELEVENLABS_SPEED", "1.0")), // 0.7(느림)~1.2(빠름), 1.0 기본
    },

    channelName: env("CHANNEL_NAME", "호감의 심리학"),
    channelPersona: env(
      "CHANNEL_PERSONA",
      "차분하고 신뢰감 있는 30대 남성 내레이터. 단정적이되 따뜻하고, 심리학 근거를 곁들여 설득력 있게 말한다."
    ),
    targetMinutes: Number(env("TARGET_MINUTES", "7")),
    // 이미지 그림체/분위기 (영어). 순정만화체(부드러운 파스텔·깔끔한 선·따뜻한 반실사).
    imageStyle: env(
      "IMAGE_STYLE",
      "Korean romance webtoon / shoujo manga (sunjeong manhwa) illustration style, soft cel shading with clean delicate linework, warm pastel color palette, gentle soft lighting, tender expressive faces with soft eyes, semi-realistic proportions, cozy warm atmosphere, smooth gradients"
    ),
    imageAspectRatio: env("IMAGE_ASPECT_RATIO", "16:9"),
    videoAspectRatio: env("VIDEO_ASPECT_RATIO", "16:9"),
    imageCount: Number(env("IMAGE_COUNT", "20")),
    introClipSeconds: Number(env("INTRO_CLIP_SECONDS", "6")),
    introClipCount: Number(env("INTRO_CLIP_COUNT", "6")),
  };
}

// 다른 모듈이 import 하는 싱글턴. UI에서 설정을 바꾸면 rebuildConfig() 로 제자리 갱신된다.
export const config = buildConfig();

export function rebuildConfig() {
  Object.assign(config, buildConfig());
  return config;
}

// .env 파일에 key=value 들을 병합 저장하고, process.env + config 를 즉시 갱신한다.
export function saveEnv(updates) {
  const envPath = join(ROOT, ".env");
  const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) return line;
    const key = t.slice(0, t.indexOf("=")).trim();
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) next.push(`${k}=${v}`);
  }
  writeFileSync(envPath, next.join("\n").replace(/\n+$/, "") + "\n");
  for (const [k, v] of Object.entries(updates)) process.env[k] = String(v);
  rebuildConfig();
}

// ── 채널별 설정 (그림체·페르소나) ────────────────────────────
// 채널을 고르면 이미지 그림체와 대본 톤이 그 채널에 맞게 바뀐다.
export const CHANNELS = {
  "인생산책길": {
    persona: "차분하고 사려 깊은 내레이터. 인생과 관계를 산책하듯 편안하고 따뜻하게 풀어준다.",
    imageStyle:
      "Korean romance webtoon / shoujo manga (sunjeong manhwa) illustration style, soft cel shading with clean delicate linework, warm pastel color palette, gentle soft lighting, tender expressive faces with soft eyes, semi-realistic proportions, cozy warm atmosphere, smooth gradients",
  },
  "포모룸": {
    persona: "친근하고 다정한 내레이터. 곁에서 조곤조곤 조언해주는 친구 같은 톤.",
    imageStyle:
      "cozy soft 3D-rendered illustration, friendly rounded characters, warm muted earthy pastel tones, gentle soft studio lighting, clean approachable Pixar-like style, smooth shading, comfortable homey mood",
  },
  "라떼클럽": {
    persona: "따뜻하고 감성적인 내레이터. 카페에서 도란도란 이야기 나누듯 편안하게.",
    imageStyle:
      "warm gouache painterly illustration, cozy cafe palette of cream caramel and soft brown tones, gentle textured brush strokes, soft warm lighting, relaxed friendly storybook mood, hand-painted feel, clean composition",
  },
};
export const DEFAULT_CHANNEL = "인생산책길";

// 선택 채널을 config 에 적용(이번 실행에 반영). 이미지 그림체·대본 페르소나·채널명이 바뀐다.
export function applyChannel(name) {
  const key = name && name in CHANNELS ? name : DEFAULT_CHANNEL;
  const ch = CHANNELS[key];
  config.channelName = key;
  config.channelPersona = ch.persona;
  config.imageStyle = ch.imageStyle;
  return key;
}

export function requireTextProvider() {
  const p = config.textProvider;
  const key = { xai: config.xai.apiKey, openai: config.openai.apiKey, anthropic: config.anthropic.apiKey }[p];
  if (!key) {
    throw new Error(
      `TEXT_PROVIDER='${p}' 인데 해당 API 키가 비어 있습니다. .env 에 키를 설정하세요.`
    );
  }
  return p;
}
