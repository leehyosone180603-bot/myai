"""승인 대기/발행 상태를 파일(JSON)로 저장하는 아주 단순한 스토어.

텔레그램 봇(별도 프로세스)이 '발행' 버튼을 눌렀을 때, 어떤 후보였는지
찾아야 하므로 후보를 candidate.id 키로 보관한다.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Candidate


class Store:
    STATUS_PENDING = "pending"     # 텔레그램 검토 대기
    STATUS_APPROVED = "approved"   # 발행 승인됨(생성 대기/진행)
    STATUS_PUBLISHED = "published"
    STATUS_REJECTED = "rejected"

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        return {"items": {}}

    def reload(self) -> None:
        """다른 프로세스(run_ai.py)가 추가한 최신 후보를 반영하기 위해 파일을 다시 읽는다.

        승인 데몬은 시작 시점의 메모리 상태만 갖고 있으므로, 버튼 콜백 처리 직전
        이 메서드로 최신 state.json 을 다시 로드해야 '만료된 후보' 오판을 막는다.
        """
        self._data = self._load()

    def _save(self) -> None:
        self.path.write_text(json.dumps(self._data, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── 후보 등록/조회 ───────────────────────────────────────────
    def add_candidate(self, cand: Candidate) -> None:
        self._data["items"][cand.id] = {
            "candidate": cand.to_dict(),
            "status": self.STATUS_PENDING,
        }
        self._save()

    def get(self, cid: str) -> dict[str, Any] | None:
        return self._data["items"].get(cid)

    def get_candidate(self, cid: str) -> Candidate | None:
        item = self.get(cid)
        return Candidate.from_dict(item["candidate"]) if item else None

    def set_status(self, cid: str, status: str, extra: dict[str, Any] | None = None) -> None:
        item = self._data["items"].get(cid)
        if not item:
            return
        item["status"] = status
        if extra:
            item.update(extra)
        self._save()

    def items_by_status(self, status: str) -> list[tuple[str, Candidate]]:
        out = []
        for cid, item in self._data["items"].items():
            if item.get("status") == status:
                out.append((cid, Candidate.from_dict(item["candidate"])))
        return out
