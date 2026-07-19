/*
 * Ctrl+C 복사 (Mac용)
 * ---------------------------------------------------------------------------
 * Mac 크롬에서 Ctrl + C 를 눌렀을 때 현재 선택된 텍스트를 복사합니다.
 * (Mac 기본 복사 단축키인 Command + C 도 그대로 동작합니다.)
 *
 * 붙여넣기(Command + V)와 잘라내기(Command + X)는 Mac 기본 동작을
 * 그대로 사용하므로 이 스크립트에서 따로 건드리지 않습니다.
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

  // 현재 눌린 키가 "Ctrl + C" 인지 판별.
  // metaKey(Command)가 함께 눌린 경우는 Mac 기본 복사이므로 건드리지 않습니다.
  function isCtrlC(e) {
    if (e.metaKey || e.altKey) return false;
    if (!e.ctrlKey) return false;
    const key = e.key;
    return key === "c" || key === "C" || e.keyCode === 67 || e.code === "KeyC";
  }

  document.addEventListener(
    "keydown",
    function (e) {
      if (!enabled) return;
      if (!isCtrlC(e)) return;

      // 선택된 텍스트가 없으면 아무 것도 하지 않습니다.
      const hasInputSelection =
        document.activeElement &&
        typeof document.activeElement.selectionStart === "number" &&
        document.activeElement.selectionStart !== document.activeElement.selectionEnd;

      const selection = window.getSelection();
      const hasPageSelection = selection && selection.toString().length > 0;

      if (!hasInputSelection && !hasPageSelection) return;

      // 사용자 제스처(keydown) 안에서 실행되므로 execCommand('copy') 가 동작합니다.
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (err) {
        copied = false;
      }

      if (copied) {
        // 페이지의 기본/자체 Ctrl+C 처리와 중복되지 않도록 이벤트를 여기서 멈춥니다.
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true // capture 단계에서 먼저 처리
  );
})();
