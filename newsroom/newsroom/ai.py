"""LLM(선별/작가) 호출 공통 헬퍼 — Claude 또는 Gemini.

config 의 ai.provider 로 백엔드를 고른다(claude | gemini).
구조화 출력(JSON 스키마)을 강제해 파싱 안정성을 확보한다.
"""

from __future__ import annotations

import json
from typing import Any

from .config import Config

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None

_claude_client = None
_gemini_client = None


def structured(cfg: Config, system: str, user: str, schema: dict[str, Any],
               model: str | None = None, max_tokens: int = 4000) -> dict[str, Any]:
    """스키마에 맞는 JSON 을 받아 dict 로 반환. provider 는 config 에서 결정."""
    provider = cfg.get("ai.provider", "claude")
    if provider == "gemini":
        return _gemini_structured(cfg, system, user, schema, model, max_tokens)
    return _claude_structured(cfg, system, user, schema, model, max_tokens)


# ── Claude ──────────────────────────────────────────────────────────
def _get_claude():
    global _claude_client
    if anthropic is None:
        raise RuntimeError("anthropic 미설치: `pip install anthropic`")
    if _claude_client is None:
        _claude_client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 자동 사용
    return _claude_client


def _claude_structured(cfg, system, user, schema, model, max_tokens):
    client = _get_claude()
    resp = client.messages.create(
        model=model or cfg.get("ai.claude_model", "claude-opus-4-8"),
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    text = next((b.text for b in resp.content if b.type == "text"), "{}")
    return json.loads(text)


# ── Gemini (Google) ─────────────────────────────────────────────────
def _get_gemini(cfg):
    global _gemini_client
    try:
        from google import genai
    except ImportError:
        raise RuntimeError("google-genai 미설치: `pip install google-genai`")
    if _gemini_client is None:
        key = cfg.require_env("GOOGLE_API_KEY")
        _gemini_client = genai.Client(api_key=key)
    return _gemini_client


def _clean_json(text: str) -> str:
    """```json ... ``` 코드펜스를 제거."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        t = t.rsplit("```", 1)[0]
    return t.strip()


def _gemini_structured(cfg, system, user, schema, model, max_tokens):
    client = _get_gemini(cfg)
    # 단계별 model 인자가 Claude ID(claude-...)일 수 있으므로 gemini 모델만 인정
    model_name = model if (model and model.startswith("gemini")) \
        else cfg.get("ai.gemini_model", "gemini-2.5-flash")
    # 스키마를 프롬프트에 명시(호환성 위해 JSON 모드 + 스키마 안내 방식 사용)
    sys_full = (
        system
        + "\n\n반드시 아래 JSON 스키마에 정확히 맞는 JSON '하나만' 출력하세요. "
        + "설명·코드펜스 없이 순수 JSON 만.\n"
        + json.dumps(schema, ensure_ascii=False)
    )
    resp = client.models.generate_content(
        model=model_name,
        contents=user,
        config={
            "system_instruction": sys_full,
            "response_mime_type": "application/json",
            "max_output_tokens": max_tokens,
            "temperature": 0.5,
        },
    )
    return json.loads(_clean_json(resp.text))
