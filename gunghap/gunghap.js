/* ============================================================
 * 무료 궁합 계산 — calcbox.kr
 * 두 사람의 사주(일간·일지·오행)로 오행 궁합을 분석.
 * 사주 계산은 ../saju/saju.js(Saju) 엔진 사용.
 * ============================================================ */
(function () {
  "use strict";

  var S = window.Saju, D = window.SajuData, L = window.SajuLunar;
  var $ = function (id) { return document.getElementById(id); };
  var getRadio = function (n, def) { var r = document.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : def; };

  // 오행 생/극 관계
  function genOf(x) { return (x + 1) % 5; }   // x가 생하는 오행 (목→화→토→금→수→목)
  function ctrlOf(x) { return (x + 2) % 5; }  // x가 극하는 오행 (목극토…)

  // 지지 관계
  var YUKHAP = { "0-1": 1, "2-11": 1, "3-10": 1, "4-9": 1, "5-8": 1, "6-7": 1 }; // 子丑 寅亥 卯戌 辰酉 巳申 午未
  var SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];                   // 申子辰 寅午戌 巳酉丑 亥卯未
  function isYukhap(a, b) { var k = Math.min(a, b) + "-" + Math.max(a, b); return !!YUKHAP[k]; }
  function isChung(a, b) { return Math.abs(a - b) === 6; }                        // 충(6칸 대각)
  function isSamhap(a, b) {
    for (var i = 0; i < SAMHAP.length; i++) if (SAMHAP[i].indexOf(a) >= 0 && SAMHAP[i].indexOf(b) >= 0) return true;
    return false;
  }

  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var OHENG_KO = ["목(木)", "화(火)", "토(土)", "금(金)", "수(水)"];

  // 두 사주 결과(res A, res B) → 궁합 분석
  function analyze(a, b) {
    var oa = GAN_OHENG[a.dayMaster], ob = GAN_OHENG[b.dayMaster];

    // 1) 일간 성향 궁합
    var relType, relBase, relComment;
    if (oa === ob) {
      relType = "비화(比和)"; relBase = 72;
      relComment = "일간 오행이 같은 ‘닮은꼴’ 궁합이에요. 말이 잘 통하고 편안하지만, 비슷한 만큼 부딪치는 지점은 서로 한 발씩 양보하면 좋습니다.";
    } else if (genOf(oa) === ob || genOf(ob) === oa) {
      relType = "상생(相生)"; relBase = 86;
      var giver = (genOf(oa) === ob) ? "A" : "B";
      relComment = "서로 북돋아 주는 상생 궁합이에요. " + giver + "님의 기운이 상대의 기운을 살려 주어, 함께 있을수록 편안하고 성장하는 인연입니다.";
    } else {
      relType = "상극(相克)"; relBase = 60;
      relComment = "끌리면서도 팽팽한 긴장이 있는 상극 궁합이에요. 서로의 차이를 ‘틀림’이 아니라 ‘다름’으로 존중하면, 오히려 서로를 크게 키워 주는 관계가 됩니다.";
    }

    // 2) 일지(부부궁) 궁합
    var da = a.pillars.day.branch, db = b.pillars.day.branch;
    var jiType, jiScore, jiComment;
    if (isYukhap(da, db)) {
      jiType = "육합(六合)"; jiScore = 12;
      jiComment = "두 사람의 일지가 육합이에요. 곁에 있으면 서로 편안하고 정이 깊어지는, 궁합에서 가장 좋게 보는 인연입니다.";
    } else if (isSamhap(da, db)) {
      jiType = "삼합(三合)"; jiScore = 9;
      jiComment = "두 사람의 일지가 삼합이에요. 손발이 잘 맞고 함께 일을 도모하기 좋은 든든한 궁합입니다.";
    } else if (da === db) {
      jiType = "동일(同)"; jiScore = 5;
      jiComment = "일지가 같아 서로를 깊이 이해해요. 다만 취향과 습관이 겹쳐 부딪칠 땐 서로의 공간을 존중해 주세요.";
    } else if (isChung(da, db)) {
      jiType = "충(沖)"; jiScore = -10;
      jiComment = "일지가 충이에요. 리듬이 서로 달라 처음엔 티격태격할 수 있지만, 맞춰 가면 서로에게 자극과 활력이 되는 역동적인 궁합입니다.";
    } else {
      jiType = "무난"; jiScore = 3;
      jiComment = "일지는 무난한 관계예요. 큰 충돌 없이 서로 존중하며 편안하게 지낼 수 있습니다.";
    }

    // 3) 오행 보완
    function fills(giver, receiver) {
      var out = [];
      for (var i = 0; i < 5; i++) if (receiver.oheng[i] === 0 && giver.oheng[i] > 0) out.push(i);
      return out;
    }
    var aFills = fills(a, b), bFills = fills(b, a);
    var compScore = Math.min(12, (aFills.length + bFills.length) * 4);
    var compComment;
    if (aFills.length || bFills.length) {
      var parts = [];
      if (aFills.length) parts.push("A님이 상대의 부족한 " + aFills.map(function (i) { return OHENG_KO[i]; }).join("·") + " 기운을 채워 줍니다");
      if (bFills.length) parts.push("B님이 상대의 부족한 " + bFills.map(function (i) { return OHENG_KO[i]; }).join("·") + " 기운을 채워 줍니다");
      compComment = "서로의 부족함을 메워 주는 궁합이에요. " + parts.join("; ") + ".";
    } else {
      compComment = "두 사람 모두 오행이 고른 편이라, 특별히 한쪽에 기대기보다 대등하게 어울리는 관계예요.";
    }

    // 종합 점수
    var score = Math.round(relBase + jiScore + compScore);
    score = Math.max(45, Math.min(98, score));

    var tier;
    if (score >= 90) tier = "천생연분급 궁합 💞";
    else if (score >= 82) tier = "아주 잘 맞는 궁합 💖";
    else if (score >= 73) tier = "잘 어울리는 궁합 💗";
    else if (score >= 63) tier = "무난한 궁합 🙂";
    else tier = "노력이 필요한 궁합 🌱";

    return {
      score: score, tier: tier,
      rel: { type: relType, comment: relComment },
      ji: { type: jiType, comment: jiComment },
      comp: { comment: compComment }
    };
  }

  window.Gunghap = { analyze: analyze };
})();
