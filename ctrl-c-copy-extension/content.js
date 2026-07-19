/*
 * Ctrl+C 복사 / Ctrl+V 붙여넣기 (Mac용)
 * ---------------------------------------------------------------------------
 * Mac 크롬에서
 *   - Ctrl + C : 선택된 텍스트를 복사
 *   - Ctrl + V : 클립보드 내용을 커서 위치에 붙여넣기
 * 를 할 수 있게 해 줍니다.
 *
 * Mac 기본 단축키인 Command + C(복사) / Command + V(붙여넣기) 도
 * 그대로 동작합니다.
 */

(function () {
  "use strict";

  // 확장 프로그램 사용 여부. 팝업에서 껐다 켤 수 있습니다. 기본값: 켜짐.
  let enabled = true;

  // 저장된 상태 불러오기 (storage 접근이 불가능한 문맥에서도 안전하게 동작).
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ enabled: true }, function (data) {
        enabled = data.enabled !== false;
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === "local" && changes.enabled) {
          enabled = changes.enabled.newValue !== false;
        }
      });
    }
  } catch (e) {
    // storage 접근 실패 시에는 항상 켜진 상태로 동작.
  }

  // 현재 눌린 키가 "Ctrl + <문자>" 인지 판별.
  // metaKey(Command)/altKey 가 함께 눌린 경우는 Mac 기본 동작이므로 건드리지 않습니다.
  function isCtrl(e, letter, keyCode) {
    if (e.metaKey || e.altKey) return false;
    if (!e.ctrlKey) return false;
    const key = e.key;
    return (
      key === letter ||
      key === letter.toUpperCase() ||
      e.keyCode === keyCode ||
      e.code === "Key" + letter.toUpperCase()
    );
  }

  // 편집 가능한 요소(입력창/텍스트영역/contenteditable)인지 확인.
  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return !el.disabled && !el.readOnly;
    if (tag === "INPUT") {
      // 텍스트를 넣을 수 있는 input 타입만 대상으로.
      const t = (el.type || "text").toLowerCase();
      const textLike = [
        "text", "search", "url", "tel", "password", "email", "number", "",
      ];
      return textLike.indexOf(t) !== -1 && !el.disabled && !el.readOnly;
    }
    return el.isContentEditable === true;
  }

  // input/textarea 에 텍스트를 커서 위치(선택 영역 대체)로 삽입.
  function insertIntoField(el, text) {
    const start = typeof el.selectionStart === "number" ? el.selectionStart : el.value.length;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);

    // React 등 프레임워크가 값 변경을 인식하도록 네이티브 setter 사용.
    const proto = el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(el, before + text + after);
    } else {
      el.value = before + text + after;
    }

    const caret = start + text.length;
    try { el.setSelectionRange(caret, caret); } catch (_) {}
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // contenteditable 영역에 텍스트 삽입.
  function insertIntoEditable(el, text) {
    el.focus();
    let done = false;
    try {
      done = document.execCommand("insertText", false, text);
    } catch (_) {
      done = false;
    }
    if (!done) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ----- 복사(Ctrl + C) -----
  function handleCopy(e) {
    const hasInputSelection =
      document.activeElement &&
      typeof document.activeElement.selectionStart === "number" &&
      document.activeElement.selectionStart !== document.activeElement.selectionEnd;

    const selection = window.getSelection();
    const hasPageSelection = selection && selection.toString().length > 0;

    if (!hasInputSelection && !hasPageSelection) return; // 선택 없으면 손 뗌

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (err) {
      copied = false;
    }
    if (copied) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ----- 붙여넣기(Ctrl + V) -----
  function handlePaste(e) {
    const el = document.activeElement;
    if (!isEditable(el)) return; // 편집 가능한 곳이 아니면 기본 동작에 맡김

    // Linux/Windows 는 Ctrl+V 가 기본 붙여넣기라, 중복 붙여넣기를 막기 위해
    // 우리가 처리할 때는 기본 동작을 멈춘다. (Mac 은 기본 동작이 없어 영향 없음)
    e.preventDefault();
    e.stopPropagation();

    try {
      navigator.clipboard.readText().then(function (text) {
        if (typeof text !== "string" || text.length === 0) return;
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          insertIntoField(el, text);
        } else {
          insertIntoEditable(el, text);
        }
      }).catch(function () {
        // 클립보드 읽기 실패 시(권한/포커스 등) 조용히 무시.
      });
    } catch (_) {
      // navigator.clipboard 미지원 등.
    }
  }

  document.addEventListener(
    "keydown",
    function (e) {
      if (!enabled) return;
      if (isCtrl(e, "c", 67)) {
        handleCopy(e);
      } else if (isCtrl(e, "v", 86)) {
        handlePaste(e);
      }
    },
    true // capture 단계에서 먼저 처리
  );
})();
