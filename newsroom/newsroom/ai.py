"""Claude(Anthropic) 호출 공통 헬퍼.

- 구조화 출력(output_config.format)으로 JSON 스키마를 강제해 파싱 안정성 확보.
- anthropic SDK 미설치/키 없음 시 명확한 에러.
"""

from __future__ import annotations

import json
from typing import Any

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None


_client = None


def get_client():
    global _client
    if anthropic is None:
        raise RuntimeError("anthropic 미설치: `pip install anthropic` 후 다시 실행하세요.")
    if _client is None:
        # ANTHROPIC_API_KEY 환경변수를 자동으로 사용
        _client = anthropic.Anthropic()
    return _client


def structured(model: str, system: str, user: str, schema: dict[str, Any],
               max_tokens: int = 4000) -> dict[str, Any]:
    """스키마에 맞는 JSON 을 강제로 받아 dict 로 반환한다."""
    client = get_client()
    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    text = next((b.text for b in resp.content if b.type == "text"), "{}")
    return json.loads(text)
