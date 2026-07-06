/* ============================================================
 * 도깨비 궁합 — 20개 섹션 분석 엔진 (직설·토속 말투)
 * 두 사람의 사주(resA, resB)로 연애·현실·확장·재미·개운 궁합 분석.
 * SajuDetail(십성·신살·용신·세운) 재사용.
 * ============================================================ */
(function (root) {
  "use strict";
  var D = root.SajuDetail, DK = root.SajuDokkaebi;
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BR_OHENG = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var OHENG = ["목(木)", "화(火)", "토(土)", "금(金)", "수(水)"];
  var TTI = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

  function elem(dm) { return GAN_OHENG[dm]; }
  function relOf(a, b) { // a 기준 b와의 관계
    if (a === b) return "비화";
    if ((a + 1) % 5 === b || (b + 1) % 5 === a) return "상생";
    return "상극";
  }
  var STEM_HAP = { "0-5": "갑기합土", "1-6": "을경합金", "2-7": "병신합水", "3-8": "정임합木", "4-9": "무계합火" };
  function stemHap(a, b) { return STEM_HAP[Math.min(a, b) + "-" + Math.max(a, b)]; }
  var YUK = { "0-1": 1, "2-11": 1, "3-10": 1, "4-9": 1, "5-8": 1, "6-7": 1 };
  var WONJIN = { "0-7": 1, "1-6": 1, "2-9": 1, "3-8": 1, "4-11": 1, "5-10": 1 }; // 자미 축오 인유 묘신 진해 사술
  var SAMHAP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
  function isYuk(a, b) { return !!YUK[Math.min(a, b) + "-" + Math.max(a, b)]; }
  function isChung(a, b) { return Math.abs(a - b) === 6; }
  function isWonjin(a, b) { return !!WONJIN[Math.min(a, b) + "-" + Math.max(a, b)]; }
  function isSamhap(a, b) { for (var i = 0; i < 4; i++) if (SAMHAP[i].indexOf(a) >= 0 && SAMHAP[i].indexOf(b) >= 0) return true; return false; }
  function branchRel(a, b) {
    if (a === b) return "동일"; if (isYuk(a, b)) return "육합"; if (isSamhap(a, b)) return "삼합";
    if (isChung(a, b)) return "충"; if (isWonjin(a, b)) return "원진"; return "무난";
  }
  function starCount(res, group) {
    var n = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day" && sg(D.tenGodStem(res.dayMaster, p.stem)) === group) n++;
      if (sg(D.tenGodBranch(res.dayMaster, p.branch)) === group) n++;
    });
    return n;
  }
  function sg(sip) {
    if (sip === "비견" || sip === "겁재") return "비겁";
    if (sip === "식신" || sip === "상관") return "식상";
    if (sip === "편재" || sip === "정재") return "재성";
    if (sip === "편관" || sip === "정관") return "관성";
    return "인성";
  }
  function lacks(res) { var o = []; for (var i = 0; i < 5; i++) if (res.oheng[i] === 0) o.push(i); return o; }
  function supplies(giver, recv) { return lacks(recv).filter(function (i) { return giver.oheng[i] > 0; }); }
  function zodiac(m, d) {
    var z = [["염소자리", 19], ["물병자리", 18], ["물고기자리", 20], ["양자리", 19], ["황소자리", 20], ["쌍둥이자리", 20],
      ["게자리", 22], ["사자자리", 22], ["처녀자리", 22], ["천칭자리", 22], ["전갈자리", 21], ["사수자리", 21], ["염소자리", 31]];
    return d <= z[m - 1][1] ? z[m - 1][0] : z[m][0];
  }
  function todayGZ() {
    var now = new Date(Date.now() + 9 * 3600000);
    var y = now.getUTCFullYear(), m = now.getUTCMonth() + 1, dd = now.getUTCDate();
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jdn = dd + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var idx = ((jdn + 49) % 60 + 60) % 60;
    return { stem: idx % 10, branch: idx % 12 };
  }

  function yearsBoth(dmA, dmB, from, to, ohengA, ohengB) {
    var out = [];
    for (var y = from; y <= to; y++) {
      var r = D.yearReading(dmA, y), so = GAN_OHENG[r.stem], bo = BR_OHENG[r.branch];
      var hitA = ohengA.indexOf(so) >= 0 || ohengA.indexOf(bo) >= 0;
      var hitB = ohengB.indexOf(so) >= 0 || ohengB.indexOf(bo) >= 0;
      if (hitA && hitB) out.push(y + "년(" + r.ganKo + ")");
    }
    return out;
  }

  var LOVE = ["직진하는 나무형 — 한번 좋으면 곧게 밀어붙인다", "휘감는 덩굴형 — 부드럽게 맞춰가며 오래 간다",
    "타오르는 태양형 — 뜨겁고 표현이 시원하다", "은근한 촛불형 — 겉은 조용해도 속정이 깊다",
    "듬직한 산형 — 무겁지만 한번 품으면 끝까지", "포근한 대지형 — 세심하게 챙기고 정이 많다",
    "강철형 — 의리 있고 직진, 대신 서툰 표현", "보석형 — 예민하고 완벽주의, 자존심이 세다",
    "바다형 — 넓게 품지만 속을 잘 안 보인다", "이슬형 — 섬세하고 감성적, 마음이 자주 흔들린다"];

  function analyze(A, B, ctx) {
    var ra = A.res, rb = B.res, na = A.name, nb = B.name;
    var ea = elem(ra.dayMaster), eb = elem(rb.dayMaster);
    var rel = relOf(ea, eb);
    var dbA = ra.pillars.day.branch, dbB = rb.pillars.day.branch;
    var jrel = branchRel(dbA, dbB);
    var hap = stemHap(ra.dayMaster, rb.dayMaster);
    var bsA = D.bodyStrength(ra), bsB = D.bodyStrength(rb);
    var supAB = supplies(ra, rb), supBA = supplies(rb, ra);
    var yy = ctx.thisYear, to = yy + 12;
    var S = [];
    function push(hj, t, body) { S.push({ hanja: hj, title: t, body: body }); }

    /* 1 연애 스타일 */
    push("緣", "두 사람의 연애 스타일", na + "은 " + LOVE[ra.dayMaster] + ". " + nb + "은 " + LOVE[rb.dayMaster] + ". " +
      (rel === "상생" ? "결이 서로를 살려주니, 연애할 때 한쪽이 다른 쪽을 편하게 이끈다." : rel === "비화" ? "닮은 구석이 많아 말이 잘 통하지만, 비슷해서 부딪히는 지점은 양보가 필요하다." : "성향이 정반대라 강하게 끌리지만, 그만큼 서로 이해가 필요한 사이다."));

    /* 2 끌림의 법칙 */
    push("引", "첫눈에 끌린 이유", hap ? "두 사람 일간이 " + hap + "으로 묶인다. 서로를 끌어당기는 자석 같은 합이라, 처음부터 이유 없이 끌렸을 거다." :
      (isYuk(dbA, dbB) || isSamhap(dbA, dbB)) ? "일지가 합을 이룬다. 곁에 있으면 편안하고 정이 붙는, 끌릴 수밖에 없는 조합이다." :
      rel === "상극" ? "정반대 기운이라 오히려 강하게 끌린다. 없는 걸 가진 상대에게 빠지는 법이다." : "닮은 기운이 편안함으로 다가와 서서히 스며든 끌림이다.");

    /* 3 연애 가치관·라이프스타일 */
    var jaeA = starCount(ra, "재성"), jaeB = starCount(rb, "재성"), gwanA = starCount(ra, "관성"), gwanB = starCount(rb, "관성");
    push("現", "현실 가치관 싱크로율", (Math.abs(jaeA - jaeB) <= 1 && Math.abs(gwanA - gwanB) <= 1 ?
      "돈 쓰는 감각과 미래를 보는 눈이 비슷하다. 현실적인 궁합 싱크로율이 높은 편이다." :
      "한쪽은 실속(재성), 한쪽은 명예·안정(관성)을 더 본다. 소비·결혼관이 달라 대화로 맞춰가야 한다.") +
      " 돈 문제는 미리 솔직하게 터놓는 게 이 커플의 숙제다.");

    /* 4 애정 표현·소통 */
    var sikA = starCount(ra, "식상"), sikB = starCount(rb, "식상"), inA = starCount(ra, "인성"), inB = starCount(rb, "인성");
    push("疏", "애정 표현과 소통 방식", (sikA > inA ? na + "은 표현형(말·행동으로 사랑을 보여줘야 직성이 풀린다). " : na + "은 수용형(말보다 곁에 있어주는 걸로 사랑을 느낀다). ") +
      (sikB > inB ? nb + "은 표현형이다. " : nb + "은 수용형이다. ") +
      ((sikA > inA) === (sikB > inB) ? "표현 방식이 비슷해 오해가 적다." : "한쪽은 표현을, 한쪽은 곁을 원한다. \"왜 말 안 해\" vs \"꼭 말해야 아나\"로 부딪히기 쉬우니 서로의 언어를 배워라."));

    /* 5 갈등과 화해 */
    push("沖", "싸우는 원인과 화해법", jrel === "충" ? "일지가 충이라 리듬이 정반대다. 자주 부딪히지만 미워서가 아니라 달라서다. 싸울 땐 이기려 하지 말고 한 박자 늦춰라." :
      jrel === "원진" ? "일지가 원진이라 이유 없이 서운하고 예민해지는 조합이다. 사소한 데서 감정이 상하니, 말투를 특히 조심하고 먼저 풀어주는 쪽이 이긴다." :
      "큰 충돌 요소는 적다. 다만 " + (bsA.strong && bsB.strong ? "둘 다 고집이 세서 자존심 싸움이 나기 쉽다. 지는 게 이기는 거다." : "작은 서운함이 쌓이는 편이니 그때그때 풀어라."));

    /* 6 속궁합·본능 */
    var yinA = ra.yinYang.yin, yinB = rb.yinYang.yin;
    push("陰", "속궁합·본능의 조화", (isYuk(dbA, dbB) ? "일지가 육합이라 몸과 마음이 착 붙는, 본능적으로 잘 맞는 조합이다. " : isChung(dbA, dbB) ? "일지가 충이라 밀당하듯 뜨겁게 끌리는, 자극적인 조합이다. " : "일지가 무난해 편안하게 익어가는 조합이다. ") +
      (Math.abs(yinA - yinB) >= 3 ? "한쪽은 음, 한쪽은 양 기운이 강해 서로를 채운다. 음양의 끌림이 세다." : "음양이 비슷해 취향과 리듬이 잘 맞는다."));

    /* 7 결혼 타이밍 */
    var mateA = (A.gender === "m") ? (ea + 2) % 5 : (ea + 3) % 5;
    var mateB = (B.gender === "m") ? (eb + 2) % 5 : (eb + 3) % 5;
    var wed = yearsBoth(ra.dayMaster, rb.dayMaster, yy, to, [mateA], [mateB]);
    push("婚", "결혼운이 들어오는 시기", "두 사람 모두 배우자 기운이 겹치는 해가 혼담·결혼에 좋다. " +
      (wed.length ? "앞으로 보면 " + wed.slice(0, 3).join(", ") + " 무렵 — 이때 결정하면 가정이 안정된다." : "가까운 몇 해 안에 각자의 배우자운이 드는 시기를 노려라.") + " 도깨비가 보기엔 서두르기보다 두 사람 흐름이 같이 살아나는 해가 답이다.");

    /* 8 권태기 예측 */
    var crisis = yearsBoth(ra.dayMaster, rb.dayMaster, yy, to, [(ea + 3) % 5], [(eb + 3) % 5]);
    push("倦", "권태기·위기 타이밍", "서로를 누르는 기운이 겹치는 해엔 다툼과 권태가 오기 쉽다. " +
      (jrel === "충" || jrel === "원진" ? "특히 일지 " + jrel + " 조합이라 " : "") +
      (crisis.length ? crisis.slice(0, 2).join(", ") + " 무렵을 조심해라. " : "이런 해를 미리 알고 ") +
      "이때만 서로 말 조심하고 각자 시간을 존중하면, 넘기고 나서 오히려 더 단단해진다.");

    /* 9 상호 보완 */
    push("補", "부족을 채우는 에너지 시너지", (supAB.length || supBA.length ?
      (supAB.length ? na + "이 " + nb + "의 부족한 " + supAB.map(function (i) { return OHENG[i]; }).join("·") + " 기운을 채워준다. " : "") +
      (supBA.length ? nb + "이 " + na + "의 부족한 " + supBA.map(function (i) { return OHENG[i]; }).join("·") + " 기운을 채워준다. " : "") +
      "서로가 서로의 귀인인 셈이라, 함께 있으면 일이 잘 풀린다." :
      "둘 다 오행이 고른 편이라 특별히 기대기보다 대등하게 어울리는 관계다."));

    /* 10 재물 시너지 */
    push("財", "둘이 만나면 돈이 모일까", (jaeA + jaeB >= 3 ? "두 사람 재성이 만나 돈 기운이 커진다. 맞벌이·공동 목표로 크게 불릴 궁합이다. " : jaeA + jaeB === 0 ? "둘 다 재성이 약해 돈보다 실력·명예로 크는 커플이다. 무리한 투자보다 꾸준함이 답이다. " : "한쪽이 재물 기운이 강하다. ") +
      (bsA.strong !== bsB.strong ? "기운이 센 쪽이 경제권을 쥐고, 여린 쪽이 관리하면 균형이 맞는다." : "돈은 한 사람이 몰아 쥐기보다 나눠 관리하는 게 이 커플엔 낫다."));

    /* 11 미래 모습 */
    push("未", "10년·20년 뒤 두 사람", (rel === "상생" ? "세월이 갈수록 서로를 살려주는 상생이라, 나이 들수록 더 편해지고 정이 깊어진다. " : rel === "비화" ? "닮은 두 사람이라 오래 함께 살면 친구처럼 편안해진다. 대신 권태를 경계해라. " : "젊을 땐 뜨겁게 부딪히다, 서로를 인정하는 순간 가장 단단해지는 상극 커플이다. ") +
      "중년 이후 두 사람의 대운이 같이 상승기에 들면 그때가 이 관계의 황금기다.");

    /* 12 친구 궁합 */
    var bijA = starCount(ra, "비겁"), bijB = starCount(rb, "비겁");
    push("友", "친구로서의 궁합", (rel === "비화" || isSamhap(dbA, dbB) ? "결이 비슷하고 지지가 합을 이뤄, 연인이 아니어도 평생 갈 단짝이 될 궁합이다. 취미·비밀을 나누기 좋다." : rel === "상생" ? "서로 북돋아주는 사이라 오래 가는 좋은 친구가 된다." : "친구로는 티격태격하지만, 결정적일 때 서로를 챙기는 의리 있는 사이다."));

    /* 13 직장·비즈니스 */
    push("業", "직장·동업 궁합", (rel === "상생" ? "일에서는 손발이 잘 맞는다. 한쪽이 벌이고 한쪽이 관리하는 구조면 성과가 크다. " : rel === "상극" ? "업무에선 서로 견제가 되어 긴장감 있게 굴러가지만, 역할을 명확히 나눠야 한다. " : "비슷해서 편하나, 동업 시 돈·주도권은 처음부터 문서로 정해라. ") +
      (bijA + bijB >= 4 ? "둘 다 주관이 세니 동업보다 각자 영역을 존중하는 협업이 낫다." : "역할 분담만 분명하면 좋은 파트너가 된다."));

    /* 14 가족·고부 */
    push("家", "가족·부모자식 궁합", (inA + inB >= 3 ? "정(인성)이 두터운 조합이라 가족으로 얽히면 서로 잘 품고 챙긴다. " : "서로 독립적이라 적당한 거리를 두는 게 가족으로선 편하다. ") +
      (jrel === "충" || jrel === "원진" ? "다만 " + jrel + " 기운이 있어 가까이 붙어 살면 마찰이 생기니, 각자의 공간을 존중해라." : "큰 갈등 요소는 적어 무난하게 어울린다."));

    /* 15 오늘의 데이트 */
    var tg = todayGZ(), tgO = GAN_OHENG[tg.stem];
    var course = ["숲·공원 산책 같은 초록이 있는 곳", "활기찬 액티비티·핫플레이스", "맛집 투어·베이킹 같은 아늑한 곳", "미술관·공방 같은 감각적인 곳", "물가·카페 같은 잔잔한 곳"][tgO];
    push("日", "오늘의 케미와 데이트", "오늘은 " + D.GAN_KO[tg.stem] + D.JI_KO[tg.branch] + "일. 오늘 두 사람 기운엔 <b>" + course + "</b>가 잘 맞는다. " +
      (supAB.length || supBA.length ? "서로 채워주는 궁합이라 오늘 같이 있으면 기분이 풀린다." : "가볍게 웃고 오는 데이트가 오늘의 정답이다.") + " 행운의 색은 " + ["초록", "빨강", "노랑", "흰색", "파랑"][tgO] + "이다.");

    /* 16 띠·별자리 매칭 */
    var ttiA = ra.pillars.year.branch, ttiB = rb.pillars.year.branch, ttiRel = branchRel(ttiA, ttiB);
    push("星", "띠·별자리 더블 궁합", "띠로 보면 " + TTI[ttiA] + "띠와 " + TTI[ttiB] + "띠 — " +
      (ttiRel === "육합" || ttiRel === "삼합" ? "합이 되는 좋은 띠 궁합이다. " : ttiRel === "충" ? "충이라 활발하게 부딪히는 띠 궁합이다. " : "무난한 띠 궁합이다. ") +
      "별자리로는 " + zodiac(A.m, A.d) + " × " + zodiac(B.m, B.d) + " 조합. 사주와 함께 재미로 참고해라.");

    /* 17 MBTI 궁합 */
    function mb(res) { var o = res.oheng; return (res.yinYang.yang >= res.yinYang.yin ? "E" : "I") + (o[1] + o[0] >= o[3] + o[4] ? "N" : "S") + (o[3] >= o[1] ? "T" : "F") + (o[2] >= 2 ? "J" : "P"); }
    push("M", "역학으로 보는 MBTI 궁합", "오행으로 풀면 " + na + "은 <b>" + mb(ra) + "</b>, " + nb + "은 <b>" + mb(rb) + "</b> 느낌이다. " +
      (rel === "상극" ? "정반대라 서로 배울 게 많은, 끌리는 조합이다." : "결이 통해 편안한 조합이다.") + " (재미로 보는 역학 MBTI다.)");

    /* 18 밀당 지수 */
    push("引", "주도권·밀당 지수", (bsA.strong && !bsB.strong ? na + "이 은근히 주도권을 쥔다. " + nb + "은 맞춰주는 쪽이라, " + na + "이 너무 밀어붙이지 않는 게 오래 가는 비결이다." :
      !bsA.strong && bsB.strong ? nb + "이 주도권을 쥔다. " + na + "은 끌려가기보다 가끔 튕겨야 관계가 산다." :
      bsA.strong && bsB.strong ? "둘 다 기가 세서 주도권 싸움이 팽팽하다. 지는 척해주는 쪽이 진짜 고수다." :
      "둘 다 부드러워 서로 눈치를 본다. 한쪽이 용기 내 먼저 표현하면 관계가 확 풀린다."));

    /* 19 관계 개운법 */
    var yA = D.yongsin(ra), yB = D.yongsin(rb);
    push("開", "궁합을 살리는 행동 개운법", "점수가 낮아도 걱정 마라. 궁합은 노력으로 바꾼다. " +
      na + "은 " + yA.names.join("·") + " 기운(" + yA.info.color + "·" + yA.info.dir + "), " + nb + "은 " + yB.names.join("·") + " 기운을 곁에 두면 각자 운이 열린다. " +
      (jrel === "충" || jrel === "원진" ? "부딪히는 조합일수록 같은 공간에 서로의 용신 색을 두고, 말보다 행동으로 챙겨라." : "함께 용신 방위로 여행·데이트를 다니면 관계가 더 살아난다."));

    /* 20 커플 아이템 */
    var common = [];
    for (var i = 0; i < 5; i++) if (ra.oheng[i] === 0 && rb.oheng[i] === 0) common.push(i);
    var need = common.length ? common : [yA.primary];
    push("物", "두 사람 커플 아이템", "두 사람에게 공통으로 필요한 건 " + need.map(function (i) { return OHENG[i]; }).join("·") + " 기운이다. " +
      "커플템은 " + need.map(function (i) { return ["초록빛 소품·나무 재질", "붉은 포인트·향초", "황금빛·흙 소재", "은·화이트골드 반지", "블루 계열·향수"][i]; }).join(", ") + " 같은 걸 맞추면 애정운을 북돋운다. 서로에게 이 기운을 선물처럼 채워줘라.");

    /* ── 종합 점수 ── */
    var base = rel === "상생" ? 84 : rel === "비화" ? 74 : 64;
    var jScore = jrel === "육합" ? 12 : jrel === "삼합" ? 9 : jrel === "동일" ? 5 : jrel === "충" ? -6 : jrel === "원진" ? -8 : 3;
    var hapScore = hap ? 8 : 0;
    var supScore = Math.min(10, (supAB.length + supBA.length) * 4);
    var score = Math.max(48, Math.min(99, Math.round(base + jScore + hapScore + supScore)));
    var tier = score >= 92 ? "천생연분 💞" : score >= 84 ? "아주 잘 맞는 궁합 💖" : score >= 74 ? "잘 어울리는 궁합 💗" : score >= 64 ? "노력하면 좋은 궁합 🙂" : "서로 배려가 필요한 궁합 🌱";

    return { score: score, tier: tier, rel: rel, jrel: jrel, sections: S };
  }

  root.GunghapContent = { analyze: analyze };
})(typeof window !== "undefined" ? window : this);
