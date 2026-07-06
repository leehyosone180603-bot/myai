/* ============================================================
 * 도깨비 사주 결제 백엔드 — Cloudflare Worker
 * 포트원(PortOne) V2 결제 검증 + 접근 토큰(HMAC) 발급/검증
 *
 * 라우트
 *   GET  /health            상태 확인
 *   POST /pay/complete      { paymentId, params } → 포트원 검증 → { ok, token }
 *   POST /pay/access        { token, params }     → 토큰 검증 → { ok }
 *
 * 환경변수(시크릿)
 *   PORTONE_API_SECRET   포트원 V2 API Secret (콘솔 발급)
 *   TOKEN_SECRET         접근 토큰 서명용 임의 비밀문자열
 * 환경변수(vars)
 *   PRICE                결제 금액(원), 기본 9900
 *   ALLOWED_ORIGIN       CORS 허용 오리진, 예: https://calcbox.kr
 * ============================================================ */

const enc = new TextEncoder();

function b64url(bytes) {
  let s = btoa(String.fromCharCode.apply(null, bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(str) { return b64url(enc.encode(str)); }

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return b64url(new Uint8Array(sig));
}

// 사주 파라미터 → 정규화 키 (토큰을 특정 사주에 묶음)
function paramsKey(p) {
  return ["y", "m", "d", "g", "h", "mi", "cal", "leap"].map(function (k) { return k + "=" + (p[k] == null ? "" : String(p[k])); }).join("&");
}

async function issueToken(env, paymentId, params, ttlSec) {
  const ph = await hmac(env.TOKEN_SECRET, paramsKey(params));
  const exp = 0; // exp는 클라 시계 의존 없이, 검증 시 별도 정책. 여기선 무기한(재열람 허용).
  const payloadObj = { pid: paymentId, ph: ph, v: 1 };
  const payload = b64urlStr(JSON.stringify(payloadObj));
  const sig = await hmac(env.TOKEN_SECRET, payload);
  return payload + "." + sig;
}

async function verifyToken(env, token, params) {
  if (!token || token.indexOf(".") < 0) return false;
  const parts = token.split(".");
  const payload = parts[0], sig = parts[1];
  const expect = await hmac(env.TOKEN_SECRET, payload);
  if (sig !== expect) return false;
  let obj;
  try { obj = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))); } catch (e) { return false; }
  const ph = await hmac(env.TOKEN_SECRET, paramsKey(params));
  return obj.ph === ph; // 토큰이 이 사주에 대해 발급된 것인지
}

function cors(env, req) {
  const origin = env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
function json(env, req, obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ "Content-Type": "application/json" }, cors(env, req)) });
}

// 포트원 결제 단건 조회 → PAID & 금액 확인
async function verifyPortonePayment(env, paymentId, wantAmount) {
  const res = await fetch("https://api.portone.io/payments/" + encodeURIComponent(paymentId), {
    headers: { "Authorization": "PortOne " + env.PORTONE_API_SECRET }
  });
  if (!res.ok) return { ok: false, reason: "조회 실패(" + res.status + ")" };
  const pay = await res.json();
  if (pay.status !== "PAID") return { ok: false, reason: "미결제 상태(" + pay.status + ")" };
  const paid = (pay.amount && (pay.amount.total != null ? pay.amount.total : pay.amount.paid)) || 0;
  if (paid < wantAmount) return { ok: false, reason: "결제 금액 부족" };
  return { ok: true, pay: pay };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env, req) });
    if (url.pathname === "/health") return json(env, req, { ok: true, service: "dokkaebi-pay" });

    if (url.pathname === "/pay/complete" && req.method === "POST") {
      let body; try { body = await req.json(); } catch (e) { return json(env, req, { ok: false, reason: "잘못된 요청" }, 400); }
      const paymentId = body.paymentId, params = body.params || {};
      if (!paymentId) return json(env, req, { ok: false, reason: "paymentId 없음" }, 400);
      const price = parseInt(env.PRICE || "9900", 10);
      const v = await verifyPortonePayment(env, paymentId, price);
      if (!v.ok) return json(env, req, { ok: false, reason: v.reason }, 402);
      const token = await issueToken(env, paymentId, params);
      return json(env, req, { ok: true, token: token });
    }

    if (url.pathname === "/pay/access" && req.method === "POST") {
      let body; try { body = await req.json(); } catch (e) { return json(env, req, { ok: false }, 400); }
      const ok = await verifyToken(env, body.token, body.params || {});
      return json(env, req, { ok: ok });
    }

    return json(env, req, { ok: false, reason: "not found" }, 404);
  }
};
