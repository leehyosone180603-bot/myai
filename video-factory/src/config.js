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
    // 이미지 그림체/분위기 (영어). 벤치마크의 웹툰풍과 다르게, 보기 편한 부드러운 스타일이 기본.
    imageStyle: env(
      "IMAGE_STYLE",
      "soft modern flat illustration, warm pastel color palette, clean minimal background, gentle soft lighting, calm cozy mood, simple rounded shapes, smooth subtle shading, tasteful negative space"
    ),
    imageAspectRatio: env("IMAGE_ASPECT_RATIO", "16:9"),
    videoAspectRatio: env("VIDEO_ASPECT_RATIO", "16:9"),
    introClipSeconds: Number(env("INTRO_CLIP_SECONDS", "6")),
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
