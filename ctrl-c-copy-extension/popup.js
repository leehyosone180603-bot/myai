"use strict";

const toggle = document.getElementById("toggle");

// 저장된 상태를 불러와 토글에 반영.
chrome.storage.local.get({ enabled: true }, function (data) {
  toggle.checked = data.enabled !== false;
});

// 토글 변경 시 상태 저장.
toggle.addEventListener("change", function () {
  chrome.storage.local.set({ enabled: toggle.checked });
});
