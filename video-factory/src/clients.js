// LLM / 이미지 / 영상 생성 API 클라이언트.
// 텍스트는 provider 교체 가능(xai|openai|anthropic), 이미지·영상은 xAI(OpenAI 이미지도 지원).
import { config } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 429(rate limit)면 점점 더 기다리며 재시도한다.
async function postJson(url, headers, body, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (res.ok) return json;
    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 4000 * 2 ** attempt);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status} ${url}\n${JSON.stringify(json, null, 2)}`);
  }
}

// ── 텍스트 생성 ──────────────────────────────────────────────
// system + user 프롬프트를 받아 문자열 응답을 돌려준다.
export async function generateText({ system, user, temperature = 0.8, maxTokens = 6000 }) {
  const p = config.textProvider;

  if (p === "anthropic") {
    const json = await postJson(
      `${config.anthropic.baseUrl}/v1/messages`,
      { "x-api-key": config.anthropic.apiKey, "anthropic-version": "2023-06-01" },
      {
        model: config.anthropic.textModel,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }
    );
    return json.content?.map((c) => c.text).join("") ?? "";
  }

  // xai / openai 는 OpenAI 호환 chat/completions
  const isXai = p === "xai";
  const conf = isXai ? config.xai : config.openai;
  const json = await postJson(
    `${conf.baseUrl}/chat/completions`,
    { Authorization: `Bearer ${conf.apiKey}` },
    {
      model: conf.textModel,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }
  );
  return json.choices?.[0]?.message?.content ?? "";
}

// JSON 응답을 강제로 받고 파싱한다. 모델이 코드펜스를 붙여도 견디게 처리.
export async function generateJson(args) {
  const raw = await generateText({ ...args, temperature: args.temperature ?? 0.7 });
  return parseLooseJson(raw);
}

export function parseLooseJson(raw) {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const first = s.search(/[[{]/);
  const lastObj = s.lastIndexOf("}");
  const lastArr = s.lastIndexOf("]");
  const last = Math.max(lastObj, lastArr);
  if (first !== -1 && last !== -1) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

// ── TTS (ElevenLabs) ─────────────────────────────────────────
// ElevenLabs 오류 응답을 사람이 이해할 수 있는 원인으로 변환
function elevenReason(status, body) {
  let detail = body;
  try {
    const j = JSON.parse(body);
    detail = j?.detail?.message || j?.detail?.status || j?.detail || j?.message || body;
    if (typeof detail === "object") detail = JSON.stringify(detail);
  } catch {
    /* body 가 JSON 이 아니면 그대로 */
  }
  const d = String(detail);
  if (status === 401 || /invalid.?api.?key|api_key/i.test(d))
    return `키가 거부됨. 확인: ①생성 팝업에서 '전체 키'를 복사했는지(목록의 가려진 키 ●●●는 안 됨) ②키 권한에 'Text to Speech'와 'Voices'가 포함됐는지 ③맞는 계정 키인지. (원문: ${d.slice(0, 100)})`;
  if (/missing_permission|permission|unauthorized/i.test(d))
    return `키 권한 부족 — 'Text to Speech'·'Voices' 권한 포함해 새 키를 발급하세요. (원문: ${d.slice(0, 100)})`;
  if (status === 429 || /quota|credit|limit/i.test(d))
    return `크레딧 부족/한도초과 — 잔액을 충전하세요. (원문: ${d.slice(0, 100)})`;
  return d.slice(0, 200) || "알 수 없는 오류";
}

// 보이스 목록 조회 (UI 보이스 선택용)
export async function listVoices() {
  if (!config.elevenlabs.apiKey) throw new Error("ElevenLabs API 키가 비어 있습니다. ⚙️설정에서 키를 저장하세요.");
  const r = await fetch(`${config.elevenlabs.baseUrl}/voices`, {
    headers: { "xi-api-key": config.elevenlabs.apiKey },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    // ElevenLabs 는 이유를 body 에 담아줌(invalid_api_key / missing_permissions 등)
    throw new Error(`HTTP ${r.status} — ${elevenReason(r.status, body)}`);
  }
  const j = await r.json();
  return (j.voices || []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    labels: v.labels || {},
    preview: v.preview_url || "",
  }));
}

// 텍스트 → 음성(mp3 base64) + 글자별 타임스탬프(자막 생성용). speed: 0.7~1.2
export async function ttsWithTimestamps(text, { voiceId, model, speed } = {}) {
  const vid = voiceId || config.elevenlabs.voiceId;
  if (!vid) throw new Error("보이스가 선택되지 않았습니다. ⚙️설정에서 ElevenLabs 보이스를 고르세요.");
  const spd = Math.min(1.2, Math.max(0.7, Number(speed || config.elevenlabs.speed) || 1.0));
  const r = await fetch(`${config.elevenlabs.baseUrl}/text-to-speech/${vid}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": config.elevenlabs.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: model || config.elevenlabs.model, voice_settings: { speed: spd } }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`음성 생성 실패 (HTTP ${r.status}) — ${elevenReason(r.status, txt)}`);
  const j = JSON.parse(txt);
  return { audioB64: j.audio_base64, alignment: j.alignment || j.normalized_alignment };
}

// ── 사용 가능한 모델 목록 조회 ────────────────────────────────
// xAI 의 여러 모델 목록 엔드포인트를 모아 id 배열로 돌려준다(계정이 접근 가능한 것만 나옴).
export async function listModels() {
  const headers = { Authorization: `Bearer ${config.xai.apiKey}` };
  const endpoints = ["/models", "/language-models", "/image-generation-models"];
  const ids = new Set();
  for (const ep of endpoints) {
    try {
      const r = await fetch(`${config.xai.baseUrl}${ep}`, { headers });
      if (!r.ok) continue;
      const j = await r.json();
      const arr = j.data || j.models || [];
      for (const m of arr) {
        const id = m.id || m.name;
        if (id) ids.add(id);
      }
    } catch {
      /* 무시하고 다음 엔드포인트 */
    }
  }
  return [...ids].sort();
}

// ── 이미지 생성 ──────────────────────────────────────────────
// prompt → 이미지 1장. refImages: 참조 이미지 data URI 배열(최대 3장, xAI 이미지 편집).
export async function generateImage(prompt, { refImages } = {}) {
  if (config.textProvider === "openai" || (!config.xai.apiKey && config.openai.apiKey)) {
    const json = await postJson(
      `${config.openai.baseUrl}/images/generations`,
      { Authorization: `Bearer ${config.openai.apiKey}` },
      { model: config.openai.imageModel, prompt, size: "1792x1024", n: 1 }
    );
    const d = json.data?.[0] ?? {};
    return { b64: d.b64_json, url: d.url };
  }
  const body = { model: config.xai.imageModel, prompt, n: 1 };
  const refs = (refImages || []).filter(Boolean).slice(0, 3);
  if (refs.length) {
    // xAI 이미지 편집: image 로 참조 이미지 전달(1장이면 객체, 여러 장이면 배열)
    body.image = refs.length === 1 ? { url: refs[0] } : refs.map((u) => ({ url: u }));
  }
  const json = await postJson(
    `${config.xai.baseUrl}/images/generations`,
    { Authorization: `Bearer ${config.xai.apiKey}` },
    body
  );
  const d = json.data?.[0] ?? {};
  return { b64: d.b64_json, url: d.url };
}

// ── 영상 생성 (Grok Imagine, 비동기 폴링) ─────────────────────
// grok-imagine-video 계열은 text-to-video 미지원 → 반드시 입력 이미지(image-to-video)가 필요.
// 이미지는 data URI(data:image/png;base64,...) 로 전달. 필드명은 모델에 따라 다를 수 있어
// XAI_VIDEO_IMAGE_FIELD 로 바꿀 수 있게 둠(기본 image_url).
export async function generateVideo(prompt, { seconds, imageB64, imageUrl } = {}) {
  const imageValue = imageUrl || (imageB64 ? `data:image/png;base64,${imageB64}` : null);
  if (!imageValue) {
    throw new Error("이 영상 모델은 이미지→영상만 지원합니다. 먼저 '이미지 생성'을 한 뒤 인트로 영상을 만들어 주세요.");
  }
  // xAI 영상 API: 이미지는 image: { url } 중첩 객체. url 에 data URI(base64) 가능.
  const start = await postJson(
    `${config.xai.baseUrl}/videos/generations`,
    { Authorization: `Bearer ${config.xai.apiKey}` },
    {
      model: config.xai.videoModel,
      prompt,
      image: { url: imageValue },
      duration: seconds ?? config.introClipSeconds,
    }
  );

  // 동기 응답이면 바로 URL 반환
  const directUrl = start?.url || start?.video?.url || start?.data?.[0]?.url;
  if (directUrl) return { url: directUrl };

  // 비동기(deferred): request_id 로 GET /videos/{request_id} 폴링 (status: done/failed/expired)
  const id = start?.request_id || start?.id || start?.data?.[0]?.id;
  if (!id) return { raw: start };

  const pickUrl = (j) => j?.url || j?.video?.url || j?.result?.url || j?.data?.[0]?.url;
  for (let i = 0; i < 90; i++) {
    await sleep(4000);
    const res = await fetch(`${config.xai.baseUrl}/videos/${id}`, {
      headers: { Authorization: `Bearer ${config.xai.apiKey}` },
    });
    if (!res.ok) continue;
    const job = await res.json();
    const status = (job.status || job.state || "").toString().toLowerCase();
    const url = pickUrl(job);
    if (url) return { url };
    if (status === "done") return { raw: job }; // done 인데 url 위치를 못 찾으면 원본 저장(점검용)
    if (/fail|expir|error|cancel/.test(status)) throw new Error(`영상 생성 실패 (status=${status})`);
  }
  throw new Error("영상 생성 폴링 타임아웃");
}
