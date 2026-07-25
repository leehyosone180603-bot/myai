/*
 * 인스타그램 콘텐츠 다운로더
 * ---------------------------------------------------------------------------
 * 정적 사이트(백엔드 없음)에서 동작하므로, 브라우저에서 공개 CORS 프록시를
 * 거쳐 인스타그램 공개 게시물의 임베드/OG 정보를 읽어와 이미지·본문 텍스트를
 * 추출한다. 로그인이 필요한 비공개 계정·스토리는 지원하지 않는다.
 */
(function () {
  "use strict";

  // 여러 공개 CORS 프록시. 앞에서부터 시도하고 실패하면 다음으로 넘어간다.
  var PROXIES = [
    function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); },
    function (u) { return "https://corsproxy.io/?url=" + encodeURIComponent(u); },
    function (u) { return "https://thingproxy.freeboard.io/fetch/" + u; }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var urlInput, fetchBtn, errorMsg, statusMsg, resultCard, mediaGrid,
      captionBox, captionText, copyBtn, downloadTxtBtn, downloadAllBtn;

  var currentShortcode = "";

  document.addEventListener("DOMContentLoaded", function () {
    urlInput = $("urlInput");
    fetchBtn = $("fetchBtn");
    errorMsg = $("errorMsg");
    statusMsg = $("statusMsg");
    resultCard = $("resultCard");
    mediaGrid = $("mediaGrid");
    captionBox = $("captionBox");
    captionText = $("captionText");
    copyBtn = $("copyBtn");
    downloadTxtBtn = $("downloadTxtBtn");
    downloadAllBtn = $("downloadAllBtn");

    fetchBtn.addEventListener("click", handleFetch);
    urlInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleFetch();
    });
    copyBtn.addEventListener("click", copyCaption);
    downloadTxtBtn.addEventListener("click", downloadCaptionTxt);

    var y = $("year");
    if (y) y.textContent = new Date().getFullYear();
  });

  // --- URL에서 shortcode 추출 -------------------------------------------------
  function parseShortcode(url) {
    var m = url.match(/(?:\/p\/|\/reel\/|\/reels\/|\/tv\/)([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }

  // --- 프록시를 통한 텍스트 fetch ---------------------------------------------
  function fetchText(targetUrl) {
    var i = 0;
    function tryNext() {
      if (i >= PROXIES.length) {
        return Promise.reject(new Error("all-proxy-failed"));
      }
      var proxyUrl = PROXIES[i++](targetUrl);
      return fetch(proxyUrl, { headers: { "Accept": "text/html,*/*" } })
        .then(function (res) {
          if (!res.ok) throw new Error("http-" + res.status);
          return res.text();
        })
        .then(function (text) {
          if (!text || text.length < 30) throw new Error("empty");
          return text;
        })
        .catch(function () { return tryNext(); });
    }
    return tryNext();
  }

  // --- 프록시를 통한 이미지/영상 blob fetch -----------------------------------
  function fetchBlob(targetUrl) {
    var i = 0;
    function tryNext() {
      if (i >= PROXIES.length) {
        return Promise.reject(new Error("all-proxy-failed"));
      }
      var proxyUrl = PROXIES[i++](targetUrl);
      return fetch(proxyUrl)
        .then(function (res) {
          if (!res.ok) throw new Error("http-" + res.status);
          return res.blob();
        })
        .then(function (blob) {
          if (!blob || blob.size < 100) throw new Error("empty");
          return blob;
        })
        .catch(function () { return tryNext(); });
    }
    return tryNext();
  }

  // --- 유틸: HTML 엔티티/JSON 이스케이프 해제 ---------------------------------
  function decodeEntities(str) {
    if (!str) return "";
    var el = document.createElement("textarea");
    el.innerHTML = str;
    return el.value;
  }

  function unescapeJsonUrl(u) {
    return u.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  }

  // --- 게시물 파싱: 이미지 URL / 영상 URL / 본문 텍스트 -----------------------
  function extractMedia(html) {
    var images = [];
    var videos = [];
    var seen = {};

    function pushImg(u) {
      if (!u) return;
      u = unescapeJsonUrl(u);
      if (seen[u]) return;
      seen[u] = true;
      images.push(u);
    }
    function pushVid(u) {
      if (!u) return;
      u = unescapeJsonUrl(u);
      if (u.indexOf("http") !== 0) return;
      videos.push(u);
    }

    // 1) JSON 내 display_url (게시물 이미지, 캐러셀 포함) — 가장 신뢰도 높음
    var reDisplay = /"display_url":"(https:[^"\\]*(?:\\.[^"\\]*)*)"/g, dm;
    while ((dm = reDisplay.exec(html)) !== null) pushImg(dm[1]);

    // 2) JSON 내 video_url (릴스·동영상)
    var reVideo = /"video_url":"(https:[^"\\]*(?:\\.[^"\\]*)*)"/g, vm;
    while ((vm = reVideo.exec(html)) !== null) pushVid(vm[1]);

    // 3) og:image (대표 이미지 폴백)
    var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImg) pushImg(decodeEntities(ogImg[1]));
    var ogVid = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i);
    if (ogVid) pushVid(decodeEntities(ogVid[1]));

    // 4) 임베드 페이지의 실제 <img> (EmbeddedMediaImage)
    try {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var embImgs = doc.querySelectorAll("img.EmbeddedMediaImage, img[class*='Media']");
      Array.prototype.forEach.call(embImgs, function (im) {
        if (im.src && im.src.indexOf("http") === 0) pushImg(im.src);
      });
    } catch (e) { /* ignore */ }

    return { images: images, videos: videos };
  }

  function extractCaption(html) {
    // 1) 임베드 captioned 페이지의 .Caption 블록
    try {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var cap = doc.querySelector(".Caption");
      if (cap) {
        var clone = cap.cloneNode(true);
        // 사용자명 링크, 시간, 댓글 영역 제거
        clone.querySelectorAll(
          ".CaptionUsername, .CaptionComments, a[href*='/'], time"
        ).forEach(function (n) {
          // 사용자명 링크(첫 링크)만 지우고 해시태그 링크는 텍스트로 남긴다
          if (n.classList && (n.classList.contains("CaptionUsername") ||
              n.classList.contains("CaptionComments"))) {
            n.remove();
          }
        });
        // 남은 링크(해시태그/멘션)는 텍스트로 치환
        clone.querySelectorAll("a").forEach(function (a) {
          a.replaceWith(document.createTextNode(a.textContent));
        });
        var txt = (clone.textContent || "").trim();
        if (txt) return txt;
      }
    } catch (e) { /* ignore */ }

    // 2) JSON edge_media_to_caption / caption text
    var jm = html.match(/"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:\\.|[^"\\])*)"/);
    if (!jm) jm = html.match(/"caption":\{[^}]*"text":"((?:\\.|[^"\\])*)"/);
    if (jm) {
      try { return JSON.parse('"' + jm[1] + '"'); } catch (e) { /* ignore */ }
    }

    // 3) og:description 의 따옴표 안 본문
    var ogd = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    if (ogd) {
      var desc = decodeEntities(ogd[1]);
      var m = desc.match(/^.*?:\s*["“]([\s\S]*)["”]\s*$/);
      if (m) return m[1].trim();
      return desc.trim();
    }
    return "";
  }

  // --- 메인 동작 --------------------------------------------------------------
  function handleFetch() {
    var raw = (urlInput.value || "").trim();
    setError("");
    setStatus("");
    hideResult();

    if (!raw) { setError("인스타그램 게시물 링크를 입력해 주세요."); return; }

    var shortcode = parseShortcode(raw);
    if (!shortcode) {
      setError("올바른 게시물 링크가 아닙니다. 예) https://www.instagram.com/p/XXXXXXXXXXX/");
      return;
    }
    currentShortcode = shortcode;

    setBusy(true);
    setStatus("인스타그램에서 콘텐츠를 불러오는 중…");

    var embedUrl = "https://www.instagram.com/p/" + shortcode + "/embed/captioned/";
    var pageUrl = "https://www.instagram.com/p/" + shortcode + "/";

    // 임베드 페이지 우선(본문·이미지), 이어서 원본 페이지로 캐러셀·영상 보강
    fetchText(embedUrl)
      .catch(function () { return ""; })
      .then(function (embedHtml) {
        return fetchText(pageUrl)
          .catch(function () { return ""; })
          .then(function (pageHtml) {
            return { embedHtml: embedHtml, pageHtml: pageHtml };
          });
      })
      .then(function (r) {
        var combined = (r.embedHtml || "") + "\n" + (r.pageHtml || "");
        if (!combined.trim()) throw new Error("no-data");

        var media = extractMedia(combined);
        // 본문은 임베드 → 원본 순으로 시도
        var caption = extractCaption(r.embedHtml || "") ||
                      extractCaption(r.pageHtml || "") || "";

        if (media.images.length === 0 && media.videos.length === 0 && !caption) {
          throw new Error("no-media");
        }
        renderResult(media, caption);
        setStatus("");
      })
      .catch(function (err) {
        var msg;
        if (err && err.message === "no-media") {
          msg = "이미지나 본문을 찾지 못했습니다. 비공개 게시물이거나 인스타그램 구조가 바뀌었을 수 있습니다.";
        } else {
          msg = "콘텐츠를 불러오지 못했습니다. 공개 게시물인지 확인 후 잠시 뒤 다시 시도해 주세요. " +
                "(프록시 서버가 일시적으로 막혔을 수 있습니다.)";
        }
        setError(msg);
      })
      .then(function () { setBusy(false); });
  }

  // --- 결과 렌더링 ------------------------------------------------------------
  function renderResult(media, caption) {
    mediaGrid.innerHTML = "";
    var items = [];
    media.images.forEach(function (u) { items.push({ url: u, type: "image" }); });
    media.videos.forEach(function (u) { items.push({ url: u, type: "video" }); });

    items.forEach(function (item, idx) {
      var cell = document.createElement("div");
      cell.className = "media-cell";

      var preview;
      if (item.type === "video") {
        preview = document.createElement("video");
        preview.src = item.url;
        preview.controls = true;
        preview.playsInline = true;
      } else {
        preview = document.createElement("img");
        preview.src = item.url;
        preview.alt = "인스타그램 이미지 " + (idx + 1);
        preview.loading = "lazy";
        preview.referrerPolicy = "no-referrer";
      }
      cell.appendChild(preview);

      var btn = document.createElement("button");
      btn.className = "btn-ghost media-dl";
      btn.textContent = (item.type === "video" ? "⬇ 영상 저장" : "⬇ 이미지 저장");
      btn.addEventListener("click", function () {
        downloadMedia(item, idx, btn);
      });
      cell.appendChild(btn);

      mediaGrid.appendChild(cell);
    });

    // 미디어 개수 안내 및 "모두 저장"
    if (items.length > 1) {
      downloadAllBtn.hidden = false;
      downloadAllBtn.onclick = function () { downloadAll(items); };
    } else {
      downloadAllBtn.hidden = true;
    }
    mediaGrid.parentElement.hidden = items.length === 0;

    // 본문 텍스트
    if (caption) {
      captionText.value = caption;
      captionBox.hidden = false;
    } else {
      captionBox.hidden = true;
    }

    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // --- 다운로드 처리 ----------------------------------------------------------
  function extForMedia(item) {
    if (item.type === "video") return ".mp4";
    if (/\.png(\?|$)/i.test(item.url)) return ".png";
    if (/\.webp(\?|$)/i.test(item.url)) return ".webp";
    return ".jpg";
  }

  function saveBlob(blob, filename) {
    var a = document.createElement("a");
    var objUrl = URL.createObjectURL(blob);
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(objUrl); }, 4000);
  }

  function downloadMedia(item, idx, btn) {
    var original = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "저장 중…"; }
    var name = "instagram_" + currentShortcode + "_" + (idx + 1) + extForMedia(item);
    return fetchBlob(item.url)
      .then(function (blob) {
        saveBlob(blob, name);
        if (btn) btn.textContent = "✓ 저장됨";
      })
      .catch(function () {
        // 프록시 blob 실패 시 새 탭으로 원본 열기(사용자가 직접 저장)
        window.open(item.url, "_blank", "noopener");
        if (btn) btn.textContent = "새 탭에서 열림";
      })
      .then(function () {
        if (btn) setTimeout(function () {
          btn.disabled = false; btn.textContent = original;
        }, 2500);
      });
  }

  function downloadAll(items) {
    downloadAllBtn.disabled = true;
    var original = downloadAllBtn.textContent;
    var i = 0;
    function next() {
      if (i >= items.length) {
        downloadAllBtn.textContent = "✓ 모두 저장됨";
        setTimeout(function () {
          downloadAllBtn.disabled = false;
          downloadAllBtn.textContent = original;
        }, 2500);
        return;
      }
      downloadAllBtn.textContent = "저장 중… (" + (i + 1) + "/" + items.length + ")";
      var item = items[i];
      downloadMedia(item, i, null).then(function () {
        i++;
        setTimeout(next, 600);
      });
    }
    next();
  }

  // --- 본문 텍스트 복사 / txt 저장 --------------------------------------------
  function copyCaption() {
    var text = captionText.value;
    if (!text) return;
    var done = function () {
      copyBtn.textContent = "✓ 복사됨";
      setTimeout(function () { copyBtn.textContent = "📋 본문 복사"; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        captionText.select(); document.execCommand("copy"); done();
      });
    } else {
      captionText.select(); document.execCommand("copy"); done();
    }
  }

  function downloadCaptionTxt() {
    var text = captionText.value;
    if (!text) return;
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveBlob(blob, "instagram_" + currentShortcode + "_caption.txt");
  }

  // --- UI 상태 헬퍼 -----------------------------------------------------------
  function setError(msg) { errorMsg.textContent = msg || ""; }
  function setStatus(msg) { statusMsg.textContent = msg || ""; }
  function hideResult() { resultCard.hidden = true; }
  function setBusy(b) {
    fetchBtn.disabled = b;
    fetchBtn.textContent = b ? "불러오는 중…" : "콘텐츠 가져오기";
  }
})();
