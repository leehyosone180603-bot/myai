"""STEP 2 · 텔레그램 검토 (Human-in-the-Loop).

- send_candidates : 선별된 후보를 인라인 키보드([✅ 발행][⏭ 건너뛰기])와 함께 전송
- poll_loop       : 콜백(버튼) 수신 → '발행' 시 콘텐츠 생성/발행 파이프라인 실행
Bot API 를 requests 로 직접 호출(추가 의존성 없음).
"""

from __future__ import annotations

import time
from typing import Callable

import requests

from .config import Config
from .models import Candidate
from .store import Store

API = "https://api.telegram.org/bot{token}/{method}"


class TelegramBot:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.token = cfg.require_env("TELEGRAM_BOT_TOKEN")
        self.chat_id = cfg.env("TELEGRAM_CHAT_ID")

    def _call(self, method: str, **params):
        r = requests.post(API.format(token=self.token, method=method), json=params, timeout=60)
        r.raise_for_status()
        return r.json()

    # ── 후보 전송 ────────────────────────────────────────────────
    def send_candidate(self, cand: Candidate) -> None:
        art = cand.article
        stream = {"money": "💰 돈/경제", "general": "🌐 이슈"}.get(cand.topic, cand.category)
        text = (
            f"🗞 <b>검토 요청</b> · {stream}\n\n"
            f"<b>{art.title}</b>\n"
            f"<i>{cand.reason}</i>\n\n"
            f"{art.summary[:400]}\n\n"
            f"출처: {art.source} · <a href=\"{art.url}\">원문</a>"
        )
        keyboard = {"inline_keyboard": [[
            # 콜백에 스트림(topic)을 심어, 사용자가 실제로 누른 목록의 스트림을 그대로 반영
            {"text": "✅ 발행", "callback_data": f"pub:{cand.topic}:{cand.id}"},
            {"text": "⏭ 건너뛰기", "callback_data": f"skip:{cand.id}"},
        ]]}
        self._call("sendMessage", chat_id=self.chat_id, text=text,
                   parse_mode="HTML", disable_web_page_preview=False,
                   reply_markup=keyboard)

    def send_text(self, text: str) -> None:
        self._call("sendMessage", chat_id=self.chat_id, text=text, parse_mode="HTML")

    def answer_callback(self, callback_id: str, text: str) -> None:
        self._call("answerCallbackQuery", callback_query_id=callback_id, text=text)

    def edit_reply_markup(self, chat_id: int, message_id: int, label: str) -> None:
        """버튼을 눌러 처리된 메시지의 키보드를 상태 라벨로 교체."""
        self._call("editMessageReplyMarkup", chat_id=chat_id, message_id=message_id,
                   reply_markup={"inline_keyboard": [[{"text": label, "callback_data": "noop"}]]})

    # ── 롱폴링 ───────────────────────────────────────────────────
    def get_updates(self, offset: int | None, timeout: int = 50):
        params = {"timeout": timeout}
        if offset is not None:
            params["offset"] = offset
        r = requests.get(API.format(token=self.token, method="getUpdates"),
                         params=params, timeout=timeout + 10)
        r.raise_for_status()
        return r.json().get("result", [])


def send_candidates(cfg: Config, candidates: list[Candidate], store: Store,
                    header: str = "") -> None:
    """후보를 저장소에 등록하고 텔레그램으로 전송."""
    bot = TelegramBot(cfg)
    tag = f" · {header}" if header else ""
    if not candidates:
        bot.send_text(f"오늘 조건에 맞는 후보가 없습니다{tag}.")
        return
    bot.send_text(f"📬{tag} 후보 <b>{len(candidates)}건</b> 도착. 발행할 기사의 버튼을 눌러 주세요.")
    for cand in candidates:
        store.add_candidate(cand)
        bot.send_candidate(cand)


def poll_loop(cfg: Config, store: Store,
              on_approve: Callable[[Candidate], object]) -> None:
    """버튼 콜백을 계속 수신. '발행'이면 on_approve 콜백(=콘텐츠 생성/발행) 실행.

    이 함수는 종료되지 않는 데몬 루프다(run_ai_bot.py 에서 실행).
    """
    bot = TelegramBot(cfg)
    offset: int | None = None
    print("텔레그램 봇 대기 중… (Ctrl+C 로 종료)")
    while True:
        try:
            updates = bot.get_updates(offset)
        except Exception as e:
            if "409" in str(e):
                print("⚠ 409 Conflict — 이 봇으로 폴링하는 다른 프로세스가 있습니다.\n"
                      "   run_ai_bot.py 는 창 하나만 켜세요. 중복 창을 닫으면 자동 복구됩니다.")
            else:
                print(f"getUpdates 오류: {e}; 5초 후 재시도")
            time.sleep(5)
            continue

        for upd in updates:
            offset = upd["update_id"] + 1
            # 개별 이벤트 처리 중 오류(네트워크 끊김/만료 등)로 데몬이 죽지 않도록 격리
            try:
                _handle_update(bot, store, on_approve, upd)
            except Exception as e:
                print(f"[warn] 이벤트 처리 오류(무시하고 계속): {e}")


def _handle_update(bot: "TelegramBot", store: Store,
                   on_approve: Callable[[Candidate], None], upd: dict) -> None:
    # chat_id 확인용: 아무 메시지나 보내면 chat id 를 알려줌
    if "message" in upd:
        chat = upd["message"]["chat"]["id"]
        print(f"[info] 메시지 수신. 이 chat_id 를 .env 의 TELEGRAM_CHAT_ID 로 사용: {chat}")
        return

    cb = upd.get("callback_query")
    if not cb:
        return
    # 다른 프로세스(run_ai.py)가 방금 추가한 후보를 반영하기 위해 파일을 다시 읽는다
    store.reload()
    data = cb.get("data", "")
    msg = cb["message"]
    chat_id, message_id = msg["chat"]["id"], msg["message_id"]

    def _safe(fn, *a):
        try:
            fn(*a)
        except Exception as e:  # 텔레그램 응답 실패는 무시(발행 자체엔 영향 없음)
            print(f"[warn] 텔레그램 응답 실패(무시): {e}")

    if data.startswith("skip:"):
        cid = data.split(":", 1)[1]
        store.set_status(cid, Store.STATUS_REJECTED)
        _safe(bot.answer_callback, cb["id"], "건너뛰었습니다.")
        _safe(bot.edit_reply_markup, chat_id, message_id, "⏭ 건너뜀")

    elif data.startswith("pub:"):
        parts = data.split(":", 2)          # pub:topic:cid  (구버전: pub:cid)
        btn_topic, cid = (parts[1], parts[2]) if len(parts) == 3 else (None, parts[1])
        cand = store.get_candidate(cid)
        if not cand:
            _safe(bot.answer_callback, cb["id"], "만료된 후보입니다. run_ai.py 로 새 후보를 받아주세요.")
            return
        if btn_topic in ("money", "general"):
            cand.topic = btn_topic          # 사용자가 누른 목록의 스트림을 신뢰
        _safe(bot.answer_callback, cb["id"], "생성 후 발행 대기열에 넣는 중…")
        _safe(bot.edit_reply_markup, chat_id, message_id, "⏳ 생성 중…")
        store.set_status(cid, Store.STATUS_APPROVED)
        try:
            result = on_approve(cand)
            if bool(getattr(result, "skipped", False)):     # 사진 없어 건너뜀
                store.set_status(cid, Store.STATUS_REJECTED)
                _safe(bot.edit_reply_markup, chat_id, message_id, "⚠ 사진없음 · 건너뜀")
                _safe(bot.send_text, "⚠ 쓸만한 원본 사진이 없어 이 기사는 건너뛰었습니다.")
            else:
                store.set_status(cid, Store.STATUS_PUBLISHED)
                _safe(bot.edit_reply_markup, chat_id, message_id, "✅ 대기열 추가됨")
        except Exception as e:
            _safe(bot.send_text, f"❌ 처리 실패: {e}")
            _safe(bot.edit_reply_markup, chat_id, message_id, "❌ 실패")
