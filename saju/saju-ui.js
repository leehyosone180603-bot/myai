/* ============================================================
 * 도깨비 사주 — UI 컨트롤러
 * 팝업 → 입력(성별·연애·양음력·연월일시) → 도깨비 풀이 퍼널
 * ============================================================ */
(function () {
  "use strict";

  var S = window.Saju, L = window.SajuLunar, DK = window.SajuDokkaebi;
  var $ = function (id) { return document.getElementById(id); };

  var state = { gender: "m", love: "solo", cal: "solar" };

  /* ---- 팝업 ---- */
  function initPopup() {
    $("mTitle").textContent = DK.POPUP.title;
    $("mBody").innerHTML = DK.POPUP.body;
    $("mBtn").textContent = DK.POPUP.button;
    $("mBtn").addEventListener("click", function () { $("introModal").classList.add("hidden"); });
  }

  /* ---- 페르소나 ---- */
  function initPersona() {
    $("avatar").innerHTML = DK.AVATAR_SVG;
    $("pTitle").textContent = DK.PERSONA.title;
    $("pSub").textContent = DK.PERSONA.subtitle;
  }

  /* ---- 셀렉트 채우기 ---- */
  function fillSelects() {
    var selY = $("selY"), selM = $("selM"), selH = $("selH");
    var thisYear = 2026;
    var y = "";
    for (var yy = thisYear; yy >= 1930; yy--) y += '<option value="' + yy + '">' + yy + "년</option>";
    selY.innerHTML = y;
    selY.value = "1996";
    var m = "";
    for (var mm = 1; mm <= 12; mm++) m += '<option value="' + mm + '">' + mm + "월</option>";
    selM.innerHTML = m;
    var h = '<option value="x">시간 모름</option>';
    for (var hh = 0; hh < 24; hh++) {
      var ap = hh < 12 ? "오전" : "오후";
      var h12 = hh % 12 === 0 ? 12 : hh % 12;
      h += '<option value="' + hh + '">' + ap + " " + h12 + "시</option>";
    }
    selH.innerHTML = h;
    var mn = "";
    for (var mi = 0; mi < 60; mi++) mn += '<option value="' + mi + '">' + mi + "분</option>";
    $("selMin").innerHTML = mn;
    onHourChange();
    updateDays();
  }

  function onHourChange() {
    $("selMin").disabled = ($("selH").value === "x");
  }

  function daysInMonth(y, m, lunar) {
    if (lunar) return 30; // 음력은 30까지 열고 유효성은 변환에서 검사
    return new Date(y, m, 0).getDate();
  }
  function updateDays() {
    var selD = $("selD"), y = +$("selY").value, m = +$("selM").value;
    var prev = selD.value;
    var n = daysInMonth(y, m, state.cal === "lunar");
    var d = "";
    for (var dd = 1; dd <= n; dd++) d += '<option value="' + dd + '">' + dd + "일</option>";
    selD.innerHTML = d;
    if (prev && +prev <= n) selD.value = prev;
  }

  /* ---- 세그먼트 ---- */
  function initSegments() {
    document.querySelectorAll(".seg").forEach(function (seg) {
      var name = seg.getAttribute("data-name");
      seg.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          seg.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
          btn.classList.add("on");
          state[name] = btn.getAttribute("data-v");
          if (name === "cal") onCalChange();
        });
      });
    });
  }
  function onCalChange() {
    var lunar = state.cal === "lunar";
    $("leapRow").style.display = lunar ? "inline-flex" : "none";
    $("calHint").textContent = lunar ? "(음력 1900~2050)" : "(양력)";
    if (!lunar) $("isLeap").checked = false;
    updateDays();
  }

  /* ---- 계산 & 렌더 ---- */
  function run() {
    $("err").textContent = "";
    var y = +$("selY").value, m = +$("selM").value, d = +$("selD").value;
    var isLeap = $("isLeap").checked;
    var sy = y, sm = m, sd = d;

    if (state.cal === "lunar") {
      if (y < L.minYear() || y > L.maxYear()) { $("err").textContent = "음력은 " + L.minYear() + "~" + L.maxYear() + "년만 볼 수 있다."; return; }
      var solar = L.lunarToSolar(y, m, d, isLeap);
      if (!solar) { $("err").textContent = "그런 음력 날짜는 없다. 날짜나 윤달을 다시 봐라."; return; }
      sy = solar.y; sm = solar.m; sd = solar.d;
    }

    var hv = $("selH").value;
    var hourKnown = hv !== "x";
    var hh = hourKnown ? +hv : 12;
    var mm = hourKnown ? (+$("selMin").value || 0) : 0;
    var name = ($("nameInput").value || "").trim();

    var res = S.computeSaju(sy, sm, sd, hh, mm, { tzHours: 9, hourKnown: hourKnown, gender: state.gender });
    var reading = DK.buildReading(res);

    $("greeting").textContent = (name ? name + "아, " : "") + DK.PERSONA.greeting;
    $("palja").textContent = reading.palja;

    // 대시보드 (오행·행운지수·운의흐름·MBTI·전생)
    if (window.SajuDash) {
      var dash = window.SajuDash.render(res, new Date().getFullYear(), y);
      $("ohengRadar").innerHTML = dash.ohengRadar;
      $("ohengNote").innerHTML = dash.ohengNote;
      $("luckIndex").innerHTML = dash.luckIndex;
      $("lifeCurve").innerHTML = dash.lifeCurve;
      $("curveNote").innerHTML = dash.curveNote;
      $("sajuMbti").innerHTML = dash.sajuMbti;
      $("pastLife").innerHTML = dash.pastLife;
    }
    var fs = $("freeSections"); fs.innerHTML = "";
    reading.sections.forEach(function (sec, i) {
      var h = document.createElement("h2");
      h.style.cssText = "font-size:1.12rem; margin:" + (i === 0 ? "4px" : "22px") + " 0 8px;";
      h.textContent = sec.title;
      var p = document.createElement("p"); p.className = "speak"; p.textContent = sec.body;
      fs.appendChild(h); fs.appendChild(p);
    });
    $("hookLead").textContent = DK.PERSONA.hookLead;
    $("hook").textContent = reading.hook;
    $("preview").textContent = reading.preview;

    // 유료 10항목
    var ol = $("paidList"); ol.innerHTML = "";
    DK.PAID.forEach(function (it) {
      var li = document.createElement("li"); li.className = "paid-item";
      li.innerHTML = '<span class="num"></span><div><div class="pt">' + it.title +
        '</div><div class="ps blur">' + it.sub + "</div></div>";
      ol.appendChild(li);
    });

    // 가격
    $("priceOrig").textContent = "정가 " + DK.CONFIG.PRICE_ORIGINAL + "원";
    $("priceNow").textContent = DK.CONFIG.PRICE_NOW + "원";

    // 공유 링크
    $("shareUrl").value = buildShareUrl(y, m, d, isLeap, hourKnown, hv, mm, name);

    $("result").classList.remove("hidden");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildShareUrl(y, m, d, isLeap, hourKnown, hv, mm, name) {
    var p = new URLSearchParams();
    p.set("y", y); p.set("m", m); p.set("d", d);
    p.set("g", state.gender); p.set("love", state.love);
    p.set("h", hourKnown ? hv : "x");
    if (hourKnown && mm) p.set("mi", mm);
    if (name) p.set("n", name);
    if (state.cal === "lunar") { p.set("cal", "l"); if (isLeap) p.set("leap", "1"); }
    return location.origin + location.pathname + "?" + p.toString();
  }

  /* ---- 결제 / 카카오 / 복사 ---- */
  function goPay() {
    var q = ($("shareUrl").value.split("?")[1]) || "";
    var detailUrl = DK.CONFIG.PAYMENT_URL + (DK.CONFIG.PAYMENT_URL.indexOf("?") < 0 ? "?" : "&") + q;
    var params = DK.chartParamsFromQuery(q);
    DK.startPayment(params, {
      fallbackUrl: detailUrl, // 결제 미설정 시 바로 상세로
      onToken: function (token) { location.href = detailUrl + "&pay=" + encodeURIComponent(token); }
    });
  }
  function kakaoShare() {
    var url = $("shareUrl").value, text = "도깨비가 봐준 내 사주, 너도 봐라.";
    if (DK.CONFIG.KAKAO_JS_KEY && window.Kakao && window.Kakao.Share) {
      window.Kakao.Share.sendDefault({ objectType: "text", text: text, link: { mobileWebUrl: url, webUrl: url } });
      return;
    }
    if (navigator.share) { navigator.share({ title: "도깨비 사주", text: text, url: url }).catch(function () {}); return; }
    copyText(url); alert("카카오 연동은 준비 중이라 링크를 복사했다. 카카오톡에 붙여넣어 보내라.");
  }
  function copyText(t) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function () {});
    else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); }
  }

  /* ---- 공유 링크 자동 실행 ---- */
  function loadFromUrl() {
    var q = new URLSearchParams(location.search);
    if (!q.get("y")) return;
    function setSeg(name, val) {
      var seg = document.querySelector('.seg[data-name="' + name + '"]');
      if (!seg) return;
      seg.querySelectorAll("button").forEach(function (b) {
        var on = b.getAttribute("data-v") === val; b.classList.toggle("on", on); if (on) state[name] = val;
      });
    }
    if (q.get("cal") === "l") { setSeg("cal", "lunar"); if (q.get("leap") === "1") $("isLeap").checked = true; }
    if (q.get("g")) setSeg("gender", q.get("g"));
    if (q.get("love")) setSeg("love", q.get("love"));
    onCalChange();
    if (q.get("n")) $("nameInput").value = q.get("n");
    $("selY").value = q.get("y"); $("selM").value = q.get("m"); updateDays(); $("selD").value = q.get("d");
    $("selH").value = q.get("h") || "x";
    if (q.get("mi")) $("selMin").value = q.get("mi");
    onHourChange();
    $("introModal").classList.add("hidden"); // 공유로 들어오면 팝업 생략
    run();
  }

  /* ---- init ---- */
  initPopup();
  initPersona();
  initSegments();
  fillSelects();
  $("selY").addEventListener("change", updateDays);
  $("selM").addEventListener("change", updateDays);
  $("selH").addEventListener("change", onHourChange);
  $("goBtn").addEventListener("click", run);
  $("payBtn").addEventListener("click", goPay);
  $("kakaoBtn").addEventListener("click", kakaoShare);
  $("copyBtn").addEventListener("click", function () { copyText($("shareUrl").value); this.textContent = "복사됨"; var b = this; setTimeout(function () { b.textContent = "복사"; }, 1500); });
  loadFromUrl();
})();
