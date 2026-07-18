"use strict";
/* 카드뉴스 현지화 도구 — 프런트 로직
 * 1) 카드 이미지 + 캡션 → 백엔드 /analyze (Claude 비전) → 헤드라인/캡션 한국어
 * 2) 원본 이미지 위에 한국어 헤드라인을 카드뉴스 스타일로 Canvas 합성
 */
(function () {
  var LS_BACKEND = "cardnews_backend_url";

  // ---- DOM ----
  var $ = function (id) { return document.getElementById(id); };
  var backendUrl = $("backendUrl");
  var cardDrop = $("cardDrop"), cardFile = $("cardFile"), cardThumb = $("cardThumb");
  var captionInput = $("captionInput");
  var origUrl = $("origUrl"), origFile = $("origFile"), origDrop = $("origDrop"), origThumb = $("origThumb");
  var origUrlBox = $("origUrlBox"), origFileBox = $("origFileBox");
  var analyzeBtn = $("analyzeBtn"), analyzeStatus = $("analyzeStatus");
  var translateCard = $("translateCard"), headlineKo = $("headlineKo"), headlineEnHint = $("headlineEnHint");
  var brandInput = $("brandInput"), renderBtn = $("renderBtn");
  var resultCard = $("resultCard"), canvas = $("cnCanvas");
  var downloadBtn = $("downloadBtn"), captionKo = $("captionKo"), copyCaptionBtn = $("copyCaptionBtn");

  // ---- 상태 ----
  var cardImageDataUrl = null;   // 카드 이미지 (백엔드 전송용 축소본)
  var origMode = "url";          // "url" | "file"
  var origImageEl = null;        // 로드된 원본 Image (file 모드)

  // ---- 백엔드 URL 저장/복원 ----
  backendUrl.value = localStorage.getItem(LS_BACKEND) || "";
  backendUrl.addEventListener("change", function () {
    localStorage.setItem(LS_BACKEND, backendUrl.value.trim().replace(/\/+$/, ""));
  });
  function backend() {
    var u = (backendUrl.value || localStorage.getItem(LS_BACKEND) || "").trim().replace(/\/+$/, "");
    return u;
  }

  // ---- 상태 메시지 ----
  function status(msg, kind) {
    analyzeStatus.textContent = msg || "";
    analyzeStatus.className = "cn-status" + (msg ? " show " + (kind || "busy") : "");
  }

  // ---- 이미지 유틸 ----
  function fileToImage(file) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error("이미지를 읽을 수 없습니다.")); };
      img.src = URL.createObjectURL(file);
    });
  }
  function urlToImage(src, crossOrigin) {
    return new Promise(function (res, rej) {
      var img = new Image();
      if (crossOrigin) img.crossOrigin = "anonymous";
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error("이미지 로드 실패")); };
      img.src = src;
    });
  }
  // 긴 변 max 이하로 축소한 JPEG dataURL (Claude 전송용)
  function downscaleToDataUrl(img, max) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var scale = Math.min(1, max / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    var c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    c.getContext("2d").drawImage(img, 0, 0, cw, ch);
    return c.toDataURL("image/jpeg", 0.85);
  }

  // ---- 카드 이미지 입력(파일/드롭/붙여넣기) ----
  function setCardImage(file) {
    fileToImage(file).then(function (img) {
      cardImageDataUrl = downscaleToDataUrl(img, 1568);
      cardThumb.src = cardImageDataUrl;
      cardThumb.hidden = false;
      cardDrop.textContent = "✓ 카드 이미지 선택됨 · 다시 클릭해 변경";
    }).catch(function (e) { status(e.message, "err"); });
  }
  cardDrop.addEventListener("click", function () { cardFile.click(); });
  cardFile.addEventListener("change", function () { if (cardFile.files[0]) setCardImage(cardFile.files[0]); });
  wireDrop(cardDrop, function (f) { setCardImage(f); });
  // 클립보드 붙여넣기 → 카드 이미지
  document.addEventListener("paste", function (e) {
    var items = (e.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") === 0) {
        setCardImage(items[i].getAsFile());
        e.preventDefault();
        return;
      }
    }
  });

  // ---- 원본 이미지 입력 모드 전환 ----
  Array.prototype.forEach.call(document.querySelectorAll(".cn-tab[data-omode]"), function (btn) {
    btn.addEventListener("click", function () {
      origMode = btn.getAttribute("data-omode");
      Array.prototype.forEach.call(document.querySelectorAll(".cn-tab[data-omode]"), function (b) {
        b.classList.toggle("on", b === btn);
      });
      origUrlBox.hidden = origMode !== "url";
      origFileBox.hidden = origMode !== "file";
    });
  });
  function setOrigImage(file) {
    fileToImage(file).then(function (img) {
      origImageEl = img;
      origThumb.src = img.src;
      origThumb.hidden = false;
      origDrop.textContent = "✓ 원본 이미지 선택됨";
    }).catch(function (e) { status(e.message, "err"); });
  }
  origDrop.addEventListener("click", function () { origFile.click(); });
  origFile.addEventListener("change", function () { if (origFile.files[0]) setOrigImage(origFile.files[0]); });
  wireDrop(origDrop, function (f) { setOrigImage(f); });

  // 드래그앤드롭 공통
  function wireDrop(el, onFile) {
    ["dragenter", "dragover"].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); el.classList.remove("drag"); });
    });
    el.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    });
  }

  // ---- 원본 이미지 로드 (렌더 시점) ----
  function loadOriginalForRender() {
    if (origMode === "file") {
      if (!origImageEl) return Promise.reject(new Error("원본 이미지 파일을 선택하세요."));
      return Promise.resolve(origImageEl);
    }
    var url = origUrl.value.trim();
    if (!url) return Promise.reject(new Error("원본 이미지 URL을 입력하세요."));
    if (!backend()) return Promise.reject(new Error("백엔드 URL이 필요합니다(⚙️ 설정). URL 이미지는 프록시를 통해 불러옵니다."));
    var proxied = backend() + "/img?url=" + encodeURIComponent(url);
    return urlToImage(proxied, true);
  }

  // ---- ① 분석·번역 ----
  analyzeBtn.addEventListener("click", function () {
    if (!cardImageDataUrl) { status("카드뉴스 이미지를 먼저 선택하세요.", "err"); return; }
    if (!backend()) { status("백엔드 Worker URL을 먼저 설정하세요(⚙️).", "err"); return; }
    status("Claude가 헤드라인을 읽고 번역하는 중…", "busy");
    analyzeBtn.disabled = true;

    fetch(backend() + "/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardImage: cardImageDataUrl, captionText: captionInput.value || "" })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.reason || ("오류 " + res.ok));
        headlineKo.value = res.j.headline_ko || "";
        captionKo.value = res.j.caption_ko || "";
        headlineEnHint.textContent = res.j.headline_en ? ("원문: " + res.j.headline_en) : "";
        translateCard.hidden = false;
        resultCard.hidden = false;
        status("번역 완료 · 아래에서 확인·편집 후 이미지를 생성하세요.", "ok");
        translateCard.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function (e) { status("실패: " + e.message, "err"); })
      .then(function () { analyzeBtn.disabled = false; });
  });

  // ---- ② 이미지 생성 ----
  renderBtn.addEventListener("click", function () {
    var headline = (headlineKo.value || "").trim();
    if (!headline) { status("헤드라인(한국어)을 입력하세요.", "err"); return; }
    status("원본 이미지를 불러오는 중…", "busy");
    renderBtn.disabled = true;

    ensureFont().then(function () {
      return loadOriginalForRender();
    }).then(function (img) {
      var ratio = (document.querySelector('input[name="ratio"]:checked') || {}).value || "4:5";
      drawCard(img, headline, brandInput.value.trim(), ratio);
      resultCard.hidden = false;
      status("이미지 생성 완료 · 다운로드하세요.", "ok");
      canvas.scrollIntoView({ behavior: "smooth", block: "center" });
    }).catch(function (e) {
      status("실패: " + e.message + (origMode === "url" ? " (URL 대신 파일 업로드를 시도해 보세요)" : ""), "err");
    }).then(function () { renderBtn.disabled = false; });
  });

  // ---- 폰트 로딩 보장 (캔버스 렌더 전) ----
  function ensureFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('800 100px Pretendard'),
      document.fonts.load('700 40px Pretendard')
    ]).then(function () { return document.fonts.ready; }).catch(function () { return null; });
  }

  // ---- Canvas 합성 ----
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
      if (!words.length) { return; }
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = words[i]; }
        else { line = test; }
      }
      if (line) out.push(line);
    });
    return out;
  }
  function fitHeadline(ctx, text, maxWidth, baseSize, maxLines) {
    for (var size = baseSize; size >= 30; size -= 2) {
      ctx.font = "800 " + size + "px Pretendard, sans-serif";
      var lines = wrapLines(ctx, text, maxWidth);
      if (lines.length <= maxLines) return { size: size, lines: lines };
    }
    ctx.font = "800 30px Pretendard, sans-serif";
    return { size: 30, lines: wrapLines(ctx, text, maxWidth) };
  }
  function drawCard(img, headline, brand, ratio) {
    var W = 1080, H = ratio === "1:1" ? 1080 : 1350;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    drawCover(ctx, img, W, H);

    // 하단 그라디언트
    var grad = ctx.createLinearGradient(0, H * 0.38, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    var pad = Math.round(W * 0.06);      // ~64
    var maxWidth = W - pad * 2;
    var fit = fitHeadline(ctx, headline, maxWidth, Math.round(W * 0.078), 4); // base ~84
    var lineH = Math.round(fit.size * 1.24);

    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 1;

    // 헤드라인 (아래→위로 쌓기, 마지막 줄 바닥이 H-pad)
    ctx.font = "800 " + fit.size + "px Pretendard, sans-serif";
    ctx.fillStyle = "#ffffff";
    var n = fit.lines.length;
    for (var i = 0; i < n; i++) {
      var bottom = H - pad - (n - 1 - i) * lineH;
      ctx.fillText(fit.lines[i], pad, bottom);
    }

    // 브랜드 라벨 (헤드라인 위)
    if (brand) {
      var headlineTop = (H - pad - (n - 1) * lineH) - fit.size;
      var bSize = Math.round(W * 0.03); // ~32
      ctx.shadowBlur = 6;
      ctx.font = "700 " + bSize + "px Pretendard, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(brand, pad, headlineTop - Math.round(bSize * 0.6));
    }
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  // ---- 다운로드 ----
  downloadBtn.addEventListener("click", function () {
    try {
      canvas.toBlob(function (blob) {
        if (!blob) { status("이미지 저장 실패(캔버스 오염). 원본을 파일 업로드로 시도하세요.", "err"); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "card-news-ko.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }, "image/png");
    } catch (e) {
      status("이미지 저장 실패: " + e.message + " (원본을 파일 업로드로 시도하세요)", "err");
    }
  });

  // ---- 캡션 복사 ----
  copyCaptionBtn.addEventListener("click", function () {
    var t = captionKo.value || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () {
        copyCaptionBtn.textContent = "✓ 복사됨";
        setTimeout(function () { copyCaptionBtn.textContent = "📋 캡션 복사"; }, 1500);
      });
    } else {
      captionKo.select(); document.execCommand("copy");
    }
  });
})();
