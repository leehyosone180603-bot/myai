"use strict";
/* 카드뉴스 현지화 — 프런트 로직 (로컬 서버와 동일 오리진) */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  // ---- 폰트 목록 (family + 사용 weight) ----
  var FONTS = [
    { name: "Pretendard ExtraBold", family: "Pretendard", weight: 800 },
    { name: "검은고딕 (Black Han Sans)", family: "Black Han Sans", weight: 400 },
    { name: "도현 (Do Hyeon)", family: "Do Hyeon", weight: 400 },
    { name: "주아 (Jua)", family: "Jua", weight: 400 },
    { name: "Gothic A1 Black", family: "Gothic A1", weight: 900 },
    { name: "Noto Sans KR Black", family: "Noto Sans KR", weight: 900 },
    { name: "나눔고딕 ExtraBold", family: "Nanum Gothic", weight: 800 },
    { name: "고운바탕 Bold (명조)", family: "Gowun Batang", weight: 700 }
  ];
  var customFont = null; // { name, family:'CustomHeadline', weight:400 }

  // ---- 상태 ----
  var cardImageDataUrl = null, origMode = "url", origImageEl = null;

  // ---- DOM ----
  var status = (function () {
    var el = $("status");
    return function (msg, kind) { el.textContent = msg || ""; el.className = "status" + (msg ? " show " + (kind || "busy") : ""); };
  })();

  // ================= 설정(API 키) =================
  function refreshKeyBadge() {
    fetch("/config").then(function (r) { return r.json(); }).then(function (j) {
      var b = $("keyBadge");
      b.textContent = j.hasKey ? "키 설정됨" : "키 미설정";
      b.className = "keybadge " + (j.hasKey ? "on" : "off");
      if (j.model) $("modelInput").value = j.model;
    }).catch(function () { });
  }
  $("saveKeyBtn").addEventListener("click", function () {
    var apiKey = $("apiKey").value.trim(), model = $("modelInput").value.trim();
    fetch("/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: apiKey, model: model }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.ok) { $("apiKey").value = ""; status("설정을 저장했습니다.", "ok"); refreshKeyBadge(); } else { status(j.reason || "저장 실패", "err"); } })
      .catch(function (e) { status("저장 실패: " + e.message, "err"); });
  });
  refreshKeyBadge();

  // ================= 폰트 셀렉트 =================
  function buildFontSelect() {
    var sel = $("fontSelect");
    sel.innerHTML = "";
    FONTS.forEach(function (f, i) {
      var o = document.createElement("option");
      o.value = String(i); o.textContent = f.name;
      o.style.fontFamily = "'" + f.family + "'";
      sel.appendChild(o);
    });
    if (customFont) {
      var o = document.createElement("option");
      o.value = "custom"; o.textContent = "★ " + customFont.name;
      sel.appendChild(o); sel.value = "custom";
    }
  }
  function selectedFont() {
    var v = $("fontSelect").value;
    if (v === "custom" && customFont) return customFont;
    return FONTS[parseInt(v, 10) || 0];
  }
  buildFontSelect();

  $("fontFile").addEventListener("change", function () {
    var f = $("fontFile").files[0];
    if (!f) return;
    f.arrayBuffer().then(function (buf) {
      var face = new FontFace("CustomHeadline", buf);
      return face.load().then(function (loaded) {
        document.fonts.add(loaded);
        customFont = { name: f.name.replace(/\.[^.]+$/, ""), family: "CustomHeadline", weight: 400 };
        buildFontSelect();
        status("커스텀 폰트 '" + customFont.name + "' 적용됨.", "ok");
      });
    }).catch(function (e) { status("폰트 로드 실패: " + e.message, "err"); });
  });

  $("sizeRange").addEventListener("input", function () { $("sizeVal").textContent = $("sizeRange").value + "%"; });
  $("sizeVal").textContent = "100%";

  // ================= 이미지 유틸 =================
  function fileToImage(file) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error("이미지를 읽을 수 없습니다.")); }; i.src = URL.createObjectURL(file); });
  }
  function urlToImage(src, cross) {
    return new Promise(function (res, rej) { var i = new Image(); if (cross) i.crossOrigin = "anonymous"; i.onload = function () { res(i); }; i.onerror = function () { rej(new Error("이미지 로드 실패")); }; i.src = src; });
  }
  function downscaleToDataUrl(img, max) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }

  // ================= 카드/원본 입력 =================
  function setCardImage(file) {
    fileToImage(file).then(function (img) {
      cardImageDataUrl = downscaleToDataUrl(img, 1568);
      $("cardThumb").src = cardImageDataUrl; $("cardThumb").hidden = false;
      $("cardDrop").textContent = "✓ 카드 이미지 선택됨 · 다시 클릭해 변경";
    }).catch(function (e) { status(e.message, "err"); });
  }
  $("cardDrop").addEventListener("click", function () { $("cardFile").click(); });
  $("cardFile").addEventListener("change", function () { if ($("cardFile").files[0]) setCardImage($("cardFile").files[0]); });
  wireDrop($("cardDrop"), setCardImage);
  document.addEventListener("paste", function (e) {
    var items = (e.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) { if (items[i].type && items[i].type.indexOf("image") === 0) { setCardImage(items[i].getAsFile()); e.preventDefault(); return; } }
  });

  Array.prototype.forEach.call(document.querySelectorAll(".tab[data-omode]"), function (btn) {
    btn.addEventListener("click", function () {
      origMode = btn.getAttribute("data-omode");
      Array.prototype.forEach.call(document.querySelectorAll(".tab[data-omode]"), function (b) { b.classList.toggle("on", b === btn); });
      $("origUrlBox").hidden = origMode !== "url";
      $("origFileBox").hidden = origMode !== "file";
    });
  });
  function setOrigImage(file) {
    fileToImage(file).then(function (img) { origImageEl = img; $("origThumb").src = img.src; $("origThumb").hidden = false; $("origDrop").textContent = "✓ 원본 이미지 선택됨"; }).catch(function (e) { status(e.message, "err"); });
  }
  $("origDrop").addEventListener("click", function () { $("origFile").click(); });
  $("origFile").addEventListener("change", function () { if ($("origFile").files[0]) setOrigImage($("origFile").files[0]); });
  wireDrop($("origDrop"), setOrigImage);

  function wireDrop(el, onFile) {
    ["dragenter", "dragover"].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add("drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove("drag"); }); });
    el.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onFile(f); });
  }

  function loadOriginalForRender() {
    if (origMode === "file") { return origImageEl ? Promise.resolve(origImageEl) : Promise.reject(new Error("원본 이미지 파일을 선택하세요.")); }
    var url = $("origUrl").value.trim();
    if (!url) return Promise.reject(new Error("원본 이미지 URL을 입력하세요."));
    return urlToImage("/img?url=" + encodeURIComponent(url), true);
  }

  // ================= ① 분석·번역 =================
  $("analyzeBtn").addEventListener("click", function () {
    if (!cardImageDataUrl) { status("카드뉴스 이미지를 먼저 선택하세요.", "err"); return; }
    status("Claude가 헤드라인을 읽고 번역하는 중…", "busy");
    $("analyzeBtn").disabled = true;
    fetch("/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardImage: cardImageDataUrl, captionText: $("captionInput").value || "" }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.reason || "오류");
        $("headlineKo").value = res.j.headline_ko || "";
        $("captionKo").value = res.j.caption_ko || "";
        $("headlineEnHint").textContent = res.j.headline_en ? ("원문: " + res.j.headline_en) : "";
        $("editCard").hidden = false; $("resultCard").hidden = false;
        status("번역 완료 · 스타일을 고르고 이미지를 생성하세요.", "ok");
        $("editCard").scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function (e) { status("실패: " + e.message, "err"); })
      .then(function () { $("analyzeBtn").disabled = false; });
  });

  // ================= ② 이미지 생성 =================
  $("renderBtn").addEventListener("click", function () {
    var headline = ($("headlineKo").value || "").trim();
    if (!headline) { status("헤드라인(한국어)을 입력하세요.", "err"); return; }
    var font = selectedFont();
    status("원본 이미지를 불러오는 중…", "busy");
    $("renderBtn").disabled = true;
    ensureFont(font).then(loadOriginalForRender).then(function (img) {
      var ratio = (document.querySelector('input[name="ratio"]:checked') || {}).value || "4:5";
      var color = (document.querySelector('input[name="hcolor"]:checked') || {}).value || "#ffffff";
      var sizeScale = parseInt($("sizeRange").value, 10) / 100;
      drawCard(img, headline, $("brandInput").value.trim(), ratio, font, color, sizeScale);
      $("resultCard").hidden = false;
      status("이미지 생성 완료 · 다운로드하세요.", "ok");
      $("canvas").scrollIntoView({ behavior: "smooth", block: "center" });
    }).catch(function (e) {
      status("실패: " + e.message + (origMode === "url" ? " (파일 업로드로도 시도해 보세요)" : ""), "err");
    }).then(function () { $("renderBtn").disabled = false; });
  });

  function ensureFont(font) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load(font.weight + ' 100px "' + font.family + '"').then(function () { return document.fonts.ready; }).catch(function () { return null; });
  }

  // ================= Canvas 합성 =================
  function drawCover(ctx, img, W, H) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var ir = iw / ih, cr = W / H, dw, dh;
    if (ir > cr) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  function wrapLines(ctx, text, maxWidth) {
    var out = [];
    text.split("\n").forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean);
      if (!words.length) return;
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = words[i]; } else { line = test; }
      }
      if (line) out.push(line);
    });
    return out;
  }
  function fitHeadline(ctx, text, maxWidth, baseSize, maxLines, font) {
    for (var size = baseSize; size >= 30; size -= 2) {
      ctx.font = font.weight + " " + size + 'px "' + font.family + '", sans-serif';
      var lines = wrapLines(ctx, text, maxWidth);
      if (lines.length <= maxLines) return { size: size, lines: lines };
    }
    ctx.font = font.weight + ' 30px "' + font.family + '", sans-serif';
    return { size: 30, lines: wrapLines(ctx, text, maxWidth) };
  }
  function drawCard(img, headline, brand, ratio, font, color, sizeScale) {
    var canvas = $("canvas");
    var W = 1080, H = ratio === "1:1" ? 1080 : 1350;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    drawCover(ctx, img, W, H);

    var grad = ctx.createLinearGradient(0, H * 0.36, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    var pad = Math.round(W * 0.06);
    var maxWidth = W - pad * 2;
    var base = Math.round(W * 0.078 * (sizeScale || 1));
    var fit = fitHeadline(ctx, headline, maxWidth, base, 4, font);
    var lineH = Math.round(fit.size * 1.24);

    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 1;

    ctx.font = font.weight + " " + fit.size + 'px "' + font.family + '", sans-serif';
    ctx.fillStyle = color || "#ffffff";
    var n = fit.lines.length;
    for (var i = 0; i < n; i++) { ctx.fillText(fit.lines[i], pad, H - pad - (n - 1 - i) * lineH); }

    if (brand) {
      var headlineTop = (H - pad - (n - 1) * lineH) - fit.size;
      var bSize = Math.round(W * 0.03);
      ctx.shadowBlur = 6;
      ctx.font = "700 " + bSize + 'px "' + font.family + '", sans-serif';
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(brand, pad, headlineTop - Math.round(bSize * 0.6));
    }
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  // ================= 다운로드 / 복사 =================
  $("downloadBtn").addEventListener("click", function () {
    try {
      $("canvas").toBlob(function (blob) {
        if (!blob) { status("이미지 저장 실패(캔버스 오염). 원본을 파일 업로드로 시도하세요.", "err"); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "card-news-ko.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }, "image/png");
    } catch (e) { status("이미지 저장 실패: " + e.message, "err"); }
  });
  $("copyCaptionBtn").addEventListener("click", function () {
    var t = $("captionKo").value || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { $("copyCaptionBtn").textContent = "✓ 복사됨"; setTimeout(function () { $("copyCaptionBtn").textContent = "📋 캡션 복사"; }, 1500); });
    } else { $("captionKo").select(); document.execCommand("copy"); }
  });
})();
