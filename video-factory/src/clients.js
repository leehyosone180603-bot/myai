// LLM / 이미지 / 영상 생성 API 클라이언트.
// 텍스트는 provider 교체 가능(xai|openai|anthropic), 이미지·영상은 xAI(OpenAI 이미지도 지원).
import { config } from "./config.js";

async function postJson(url, headers, body) {
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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
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

// ── 이미지 생성 ──────────────────────────────────────────────
// prompt → 이미지 1장 (base64 또는 url). 반환: { b64?, url? }
export async function generateImage(prompt) {
  if (config.textProvider === "openai" || (!config.xai.apiKey && config.openai.apiKey)) {
    const json = await postJson(
      `${config.openai.baseUrl}/images/generations`,
      { Authorization: `Bearer ${config.openai.apiKey}` },
      { model: config.openai.imageModel, prompt, size: "1792x1024", n: 1 }
    );
    const d = json.data?.[0] ?? {};
    return { b64: d.b64_json, url: d.url };
  }
  const json = await postJson(
    `${config.xai.baseUrl}/images/generations`,
    { Authorization: `Bearer ${config.xai.apiKey}` },
    { model: config.xai.imageModel, prompt, n: 1 }
  );
  const d = json.data?.[0] ?? {};
  return { b64: d.b64_json, url: d.url };
}

// ── 영상 생성 (Grok Imagine, 비동기 폴링) ─────────────────────
// 엔드포인트/필드명은 xAI 문서 업데이트에 따라 달라질 수 있어 env 로 모델만 바꾸면 되게 둠.
export async function generateVideo(prompt, { seconds, aspectRatio, imageB64 } = {}) {
  const start = await postJson(
    `${config.xai.baseUrl}/videos/generations`,
    { Authorization: `Bearer ${config.xai.apiKey}` },
    {
      model: config.xai.videoModel,
      prompt,
      duration: seconds ?? config.introClipSeconds,
      aspect_ratio: aspectRatio ?? config.videoAspectRatio,
      ...(imageB64 ? { image: imageB64 } : {}),
    }
  );

  // 동기 응답이면 바로 URL 반환
  const directUrl = start?.data?.[0]?.url || start?.url || start?.video?.url;
  if (directUrl) return { url: directUrl };

  // 비동기면 id 로 폴링
  const id = start?.id || start?.request_id || start?.data?.[0]?.id;
  if (!id) return { raw: start };

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${config.xai.baseUrl}/videos/generations/${id}`, {
      headers: { Authorization: `Bearer ${config.xai.apiKey}` },
    });
    const job = await res.json();
    const status = job.status || job.state;
    const url = job?.data?.[0]?.url || job?.url || job?.video?.url;
    if (url) return { url };
    if (status && /fail|error|cancel/i.test(status)) {
      throw new Error(`영상 생성 실패: ${JSON.stringify(job)}`);
    }
  }
  throw new Error("영상 생성 폴링 타임아웃");
}
