/* ============================================================
 * 카드뉴스 현지화 백엔드 — Cloudflare Worker
 *
 * 영어권 인스타그램 카드뉴스 → 한국어 카드뉴스 자동화용 백엔드.
 *   1) Claude 비전 API로 카드 이미지의 영어 헤드라인을 읽어(OCR)
 *      한국어로 번역하고, 캡션도 한국어로 번역한다.
 *   2) 외부 원본 이미지 URL을 프록시해서 브라우저 <canvas> 의
 *      CORS 오염(tainted canvas)을 막는다.
 *
 * 라우트
 *   GET  /health           상태 확인
 *   POST /analyze          { cardImage, captionText } → { headline_en, headline_ko, caption_ko }
 *   GET  /img?url=<URL>     원본 이미지 프록시 (CORS 헤더 부여)
 *
 * 환경변수(시크릿)
 *   ANTHROPIC_API_KEY      Claude API 키
 * 환경변수(vars)
 *   MODEL                  Claude 모델 (기본 claude-sonnet-5)
 *   ALLOWED_ORIGIN         CORS 허용 오리진 (기본 "*")
 * ============================================================ */

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
function json(env, obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, cors(env))
  });
}

// data URL 또는 순수 base64 → { media_type, data }
function parseImage(input) {
  if (!input) return null;
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(input);
  if (m) return { media_type: m[1], data: m[2] };
  // 순수 base64로 온 경우 jpeg로 가정
  return { media_type: "image/jpeg", data: input };
}

// Claude 응답 텍스트에서 첫 JSON 객체를 추출
function extractJson(text) {
  if (!text) return null;
  let t = text.trim();
  // ```json ... ``` 코드펜스 제거
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch (e) { /* fallthrough */ }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try { return JSON.parse(t.slice(s, e + 1)); } catch (e2) { return null; }
  }
  return null;
}

async function analyze(req, env) {
  let body;
  try { body = await req.json(); } catch (e) { return json(env, { ok: false, reason: "잘못된 요청(JSON)" }, 400); }

  const img = parseImage(body.cardImage);
  if (!img) return json(env, { ok: false, reason: "cardImage 없음" }, 400);
  if (!env.ANTHROPIC_API_KEY) return json(env, { ok: false, reason: "서버에 ANTHROPIC_API_KEY 미설정" }, 500);

  const caption = (body.captionText || "").toString().slice(0, 6000);

  const prompt =
    "You are localizing an English Instagram card-news post into Korean.\n" +
    "The attached image is an English card-news graphic (a photo with a bold headline overlaid).\n\n" +
    "Return ONLY a raw JSON object (no markdown, no code fences) with EXACTLY these keys:\n" +
    '  "headline_en": the main headline text exactly as printed on the image.\n' +
    '  "headline_ko": a natural, punchy Korean translation of that headline, suitable for overlaying on a card-news image. Keep it concise and idiomatic (not a literal word-for-word translation). If it reads better on two lines, insert a single "\\n" where the line should break. Do NOT add quotation marks around it.\n' +
    '  "caption_ko": a natural Korean translation of the caption below. Preserve meaning and tone. Leave URLs, @mentions and #hashtags unchanged.\n\n' +
    "Caption:\n" + (caption || "(none)");

  const payload = {
    model: env.MODEL || "claude-sonnet-5",
    max_tokens: 1200,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
        { type: "text", text: prompt }
      ]
    }]
  };

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return json(env, { ok: false, reason: "Claude 호출 실패: " + e.message }, 502);
  }

  if (!res.ok) {
    const errText = await res.text();
    return json(env, { ok: false, reason: "Claude API 오류(" + res.status + "): " + errText.slice(0, 300) }, 502);
  }

  const data = await res.json();
  const text = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
  const parsed = extractJson(text);
  if (!parsed) return json(env, { ok: false, reason: "번역 결과 파싱 실패", raw: text.slice(0, 500) }, 502);

  return json(env, {
    ok: true,
    headline_en: parsed.headline_en || "",
    headline_ko: parsed.headline_ko || "",
    caption_ko: parsed.caption_ko || ""
  });
}

async function proxyImage(url, env) {
  let target;
  try { target = new URL(url); } catch (e) { return json(env, { ok: false, reason: "잘못된 url" }, 400); }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return json(env, { ok: false, reason: "http/https만 허용" }, 400);
  }
  let res;
  try {
    res = await fetch(target.toString(), {
      headers: {
        // 일부 호스트가 기본 UA/Referer를 막으므로 브라우저처럼 요청
        "User-Agent": "Mozilla/5.0 (compatible; CardNewsBot/1.0)",
        "Accept": "image/*,*/*"
      }
    });
  } catch (e) {
    return json(env, { ok: false, reason: "이미지 fetch 실패: " + e.message }, 502);
  }
  if (!res.ok) return json(env, { ok: false, reason: "이미지 응답 오류(" + res.status + ")" }, 502);

  const ct = res.headers.get("content-type") || "";
  if (ct && ct.indexOf("image/") !== 0) {
    return json(env, { ok: false, reason: "이미지가 아님(" + ct + ")" }, 415);
  }

  const headers = new Headers(cors(env));
  headers.set("Content-Type", ct || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(res.body, { status: 200, headers: headers });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });

    if (url.pathname === "/health") return json(env, { ok: true, service: "cardnews-ai", model: env.MODEL || "claude-sonnet-5" });
    if (url.pathname === "/analyze" && req.method === "POST") return analyze(req, env);
    if (url.pathname === "/img" && req.method === "GET") return proxyImage(url.searchParams.get("url"), env);

    return json(env, { ok: false, reason: "not found" }, 404);
  }
};
