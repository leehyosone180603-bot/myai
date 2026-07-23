"""예약 발행 대기열 — 승인 시 생성/업로드한 결과를 큐에 넣고, 정해진 시간대에 하나씩 발행.

흐름:
  1) 밤 검토 → 승인 시 stage_for_publish 가 카드/릴스를 만들고 R2 업로드까지 끝낸 뒤
     이 큐에 '발행 준비 완료' 항목으로 적재(topic=money|general).
  2) 다음날 정해진 시간대(작업 스케줄러)에 publish_next 가 큐에서 오래된 것부터 하나 꺼내
     인스타그램에 발행.

파일: out/publish_queue.json  (프로세스 간 공유되므로 매번 파일을 다시 읽고 씀)
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


class PublishQueue:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> dict[str, Any]:
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        return {"items": []}

    def _save(self, data: dict[str, Any]) -> None:
        self.path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def enqueue(self, item: dict[str, Any]) -> None:
        """발행 준비 완료 항목을 큐 끝에 추가."""
        data = self._load()
        item.setdefault("status", "queued")
        item.setdefault("staged_at", datetime.utcnow().isoformat())
        data["items"].append(item)
        self._save(data)

    def pending(self, topic: str | None = None) -> list[dict[str, Any]]:
        items = [it for it in self._load()["items"] if it.get("status") == "queued"]
        if topic:
            items = [it for it in items if it.get("topic") == topic]
        return items

    def pop_next(self, topic: str | None = None) -> dict[str, Any] | None:
        """가장 오래된 대기 항목을 꺼내 'publishing' 으로 표시하고 반환. 없으면 None."""
        data = self._load()
        for it in data["items"]:                       # 파일 순서 = 적재 순서(오래된 것 먼저)
            if it.get("status") == "queued" and (topic is None or it.get("topic") == topic):
                it["status"] = "publishing"
                self._save(data)
                return it
        return None

    def mark(self, item_id: str, status: str, extra: dict[str, Any] | None = None) -> None:
        data = self._load()
        for it in data["items"]:
            if it.get("id") == item_id:
                it["status"] = status
                if extra:
                    it.update(extra)
                break
        self._save(data)

    def counts(self) -> dict[str, int]:
        c: dict[str, int] = {}
        for it in self._load()["items"]:
            if it.get("status") == "queued":
                c[it.get("topic", "?")] = c.get(it.get("topic", "?"), 0) + 1
        return c
