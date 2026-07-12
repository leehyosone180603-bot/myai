/* ============================================================
 * 도깨비에게 물어보기 — 자동 사주 Q&A 엔진
 * 생년월일 + 고민 주제 + 시점(연/월) → 그 시기 사주·월운·신살로
 * '괜찮은지 + 땜/실천법'을 판단해 답변한다.
 * SajuDetail(십성·십이운성·십이신살·용신) 재사용.
 * ============================================================ */
(function (root) {
  "use strict";
  var D = root.SajuDetail;
  var STRONG = { "장생": 1, "관대": 1, "건록": 1, "제왕": 1 };
  var WEAK = { "병": 1, "사": 1, "묘": 1, "절": 1 };

  function sg(sip) {
    if (sip === "비견" || sip === "겁재") return "비겁";
    if (sip === "식신" || sip === "상관") return "식상";
    if (sip === "편재" || sip === "정재") return "재성";
    if (sip === "편관" || sip === "정관") return "관성";
    return "인성";
  }

  // 십이신살 한 줄 뜻(답변 근거 표기용)
  var SINSAL_MEAN = {
    "겁살": "예상 밖 손실", "재살": "시비·관재", "천살": "뜻대로 안 풀림", "지살": "이동·이사",
    "년살": "인기·이성(도화)", "월살": "위축·정체", "망신살": "체면·구설", "장성살": "주도권·리더십",
    "반안살": "귀인·승진·안정", "역마살": "이동·변화", "육해살": "지침·건강", "화개살": "학문·예술·고독"
  };

  var TOPICS = [
    {
      key: "move", label: "이사·이동",
      good: { sip: ["인성"], sinsal: ["지살", "역마살", "반안살"] },
      bad: { sip: [], sinsal: ["월살", "천살", "겁살"] },
      goodMsg: "이동·이사 기운이 열려 있어 자리를 옮기기에 오히려 좋은 때다.",
      okMsg: "이사에 큰 걸림은 없다. 기본 절차만 지키면 무난히 넘어간다.",
      warnMsg: "자리를 흔들면 잔 탈이 생기기 쉬운 때다. 아래 땜을 꼭 챙겨라.",
      daem: "손 없는 날(음력 9·10·19·20·29·30일) 새벽에 밥솥·소금·빗자루를 제일 먼저 들이고, 현관에 팥·굵은소금을 뿌려 묵은 기운을 씻어라. 이사 방위가 꺼림하면 짐 일부를 좋은 방위의 지인 집에 하루 맡겼다 옮기는 '방위 가르기'로 땜한다."
    },
    {
      key: "job", label: "이직·취업",
      good: { sip: ["관성", "인성"], sinsal: ["역마살", "지살", "반안살"] },
      bad: { sip: ["식상"], sinsal: ["겁살", "월살"] },
      goodMsg: "자리·명예의 기운이 도와 새로 들어가거나 옮기기 좋은 때다.",
      okMsg: "직장운은 무난하다. 준비만 다지면 자리 이동에 문제없다.",
      warnMsg: "직장·자리에 마찰이 생기기 쉬운 때다. 감정적 사표는 참고, 준비를 더 다져라.",
      daem: "면접·입사 서류는 되도록 관운 좋은 날로 잡고, 첫 출근엔 단정한 옷과 용신 색을 걸쳐라. 상사·동료와의 마찰은 정공법으로 풀되 뒷말은 삼가라."
    },
    {
      key: "money", label: "투자·재물",
      good: { sip: ["재성", "식상"], sinsal: ["반안살"] },
      bad: { sip: ["비겁"], sinsal: ["겁살", "재살"] },
      goodMsg: "재물 기운이 살아 있어 벌이·투자에 힘이 실리는 때다.",
      okMsg: "돈 흐름은 무난하다. 큰 욕심만 내지 않으면 괜찮다.",
      warnMsg: "돈이 새기 쉬운 때다. 큰 투자·보증은 미루고 지키는 데 집중해라.",
      daem: "목돈은 한 번에 걸지 말고 분산하고, 보증·동업은 반드시 문서로 남겨라. 작은 지출(기부·경조사)을 먼저 내어 큰 손실을 미리 흘려보내면 땜이 된다."
    },
    {
      key: "contract", label: "계약·사업",
      good: { sip: ["재성", "관성", "인성"], sinsal: ["반안살", "지살"] },
      bad: { sip: [], sinsal: ["재살", "천살", "겁살", "월살"] },
      goodMsg: "문서·계약운이 좋아 일을 매듭짓거나 벌이기 좋은 때다.",
      okMsg: "계약·사업에 큰 문제는 없다. 조항만 꼼꼼히 보면 된다.",
      warnMsg: "계약·서류에서 시비·구설이 생기기 쉬운 때다. 서명은 신중히 하라.",
      daem: "계약서 독소조항을 두 번 확인하고, 가능하면 관재·시비를 피하는 길일에 서명해라. 분쟁 소지는 미리 문서로 못 박고, 구두 약속은 남기지 마라."
    },
    {
      key: "love", label: "연애·결혼",
      good: { sip: ["재성", "관성"], sinsal: ["년살", "반안살"] },
      bad: { sip: ["비겁"], sinsal: ["화개살", "월살"] },
      goodMsg: "인연·매력의 기운이 도는 때라 만남·고백·혼담에 좋다.",
      okMsg: "인연운은 무난하다. 진심을 보이면 관계가 자연스레 흐른다.",
      warnMsg: "인연이 흐려지거나 외로워지기 쉬운 때다. 무리한 진도보다 마음을 다지는 시기로 삼아라.",
      daem: "소개·미팅은 이 시기의 매력운을 활용하되 삼각관계·구설은 조심해라. 용신 색 소품을 지니고 먼저 다정하게 표현하면 인연운이 살아난다."
    },
    {
      key: "exam", label: "시험·합격·자격",
      good: { sip: ["인성"], sinsal: ["반안살"] },
      bad: { sip: ["식상"], sinsal: ["겁살"] },
      goodMsg: "문서·학문운(인성)이 좋아 시험·합격·자격에 유리한 때다.",
      okMsg: "시험운은 무난하다. 실수만 잡으면 제 실력이 나온다.",
      warnMsg: "집중이 흐트러지기 쉬운 때다. 방심·실수만 잡으면 된다.",
      daem: "책상은 용신 방위로 두고 아침 일찍 마무리 점검을 해라. 벼락치기보다 아는 것을 다지고, 시험 당일엔 용신 색 소품을 하나 지녀라."
    },
    {
      key: "health", label: "건강·수술",
      good: { sip: ["인성", "비겁"], sinsal: [] },
      bad: { sip: ["관성"], sinsal: ["육해살", "겁살"] },
      goodMsg: "기력이 받쳐주는 때라 큰 무리는 없다.",
      okMsg: "건강은 무난하다. 과로만 피하면 된다.",
      warnMsg: "몸이 지치고 탈나기 쉬운 때다. 과로·과음을 줄이고 미리 챙겨라.",
      daem: "건강검진·휴식·수술 같은 몸 관리를 이 시기에 잡아 미리 땜하라. 무리한 일정과 과음은 줄이고, 잠과 끼니를 규칙적으로 지켜라."
    },
    {
      key: "dispute", label: "소송·다툼·구설",
      good: { sip: [], sinsal: [] },
      bad: { sip: ["관성"], sinsal: ["재살", "망신살", "겁살"] },
      goodMsg: "큰 시비 기운은 약한 때다. 다만 방심은 금물이다.",
      okMsg: "다툼 기운은 무난하다. 말과 서류만 조심하면 된다.",
      warnMsg: "시비·구설·관재가 붙기 쉬운 때다. 다툼은 먼저 양보해 넘겨라.",
      daem: "계약·SNS·말을 특히 조심하고, 감정 싸움은 피해라. 서류·증거는 미리 챙겨두되 작은 양보로 큰 다툼을 막는 게 최선의 땜이다."
    },
    {
      key: "general", label: "이 시기 종합운",
      good: { sip: [], sinsal: [] }, bad: { sip: [], sinsal: [] },
      goodMsg: "", okMsg: "", warnMsg: "",
      daem: "그 달의 기운을 알고 좋은 것은 밀고, 조심할 것은 미리 땜하면 된다."
    }
  ];

  function topicByKey(k) { for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].key === k) return TOPICS[i]; return TOPICS[TOPICS.length - 1]; }

  function rowFor(res, year, greg) {
    if (greg) {
      var arr = D.monthlyLuck(res, year);
      for (var i = 0; i < arr.length; i++) if (arr[i].greg === greg) return arr[i];
    }
    return D.yearLuck(res, year, 1)[0];
  }

  // SINSAL 실천 조언(detail-ui와 동일 취지, 자체 보유)
  var SINSAL_ADVICE = {
    "겁살": "큰 계약·투자는 미루고, 작은 지출을 먼저 내어 액을 흘려보내라.",
    "재살": "서류·계약·운전을 조심하고 다툼은 먼저 양보해 넘겨라.",
    "천살": "큰 결정은 미루고 한 박자 쉬어라. 부모·조상께 안부·성묘로 기운을 풀어라.",
    "지살": "이사·이직·출장을 이 시기에 잡아 그 기운을 쓰면 오히려 길하다.",
    "년살": "대외활동·소개엔 좋으니 활용하되 이성 문제·구설은 조심해라.",
    "월살": "새로 벌이지 말고 정리·마무리에 힘써라. 개업·확장은 피해라.",
    "망신살": "말·SNS·과음을 조심하고 스스로 낮추면 탈이 없다.",
    "장성살": "미루던 발표·승진·큰일을 밀어붙여 그 기운을 써먹어라.",
    "반안살": "귀인·윗사람에게 도움을 청하고 자리 이동·시험을 노려라.",
    "역마살": "차라리 여행·출장을 다녀와 이동 기운을 미리 풀어라.",
    "육해살": "건강검진·휴식으로 미리 몸을 챙겨라.",
    "화개살": "공부·자격·창작·재충전에 몰입하면 복이 된다."
  };

  function analyze(res, year, greg, topicKey, ctx) {
    var t = topicByKey(topicKey);
    var row = rowFor(res, year, greg);
    var grpS = sg(row.sipStem), grpB = sg(row.sipBranch);
    var groups = [grpS]; if (grpB !== grpS) groups.push(grpB);
    var score = 0, plus = [], minus = [];

    t.good.sip.forEach(function (g) { if (groups.indexOf(g) >= 0) { score++; plus.push(g); } });
    t.bad.sip.forEach(function (g) { if (groups.indexOf(g) >= 0) { score--; minus.push(g); } });
    if (t.good.sinsal.indexOf(row.sinsal) >= 0) { score++; plus.push(row.sinsal); }
    if (t.bad.sinsal.indexOf(row.sinsal) >= 0) { score--; minus.push(row.sinsal); }
    if (topicKey === "health" && WEAK[row.stage]) { score--; minus.push(row.stage); }
    if (topicKey === "general") score = 0;

    var verdict = score >= 1 ? "good" : score <= -1 ? "warn" : "ok";
    var badge = verdict === "good" ? "밀고 가도 좋다 ✅" : verdict === "ok" ? "무난하다 — 기본만 챙기면 OK 🟡" : "조심할 때 — 땜을 챙겨라 ⚠️";

    var when = year + "년 " + (greg ? greg + "월" : "한 해");
    var nm = (ctx && ctx.name) ? ctx.name + "님" : "당신";

    // p1 기운 요약
    var p1 = when + "은 " + nm + "께 <b>" + row.sipStem + "</b>(" + grpS + ")·<b>" + row.sinsal + "</b>(" +
      (SINSAL_MEAN[row.sinsal] || "") + ") 기운이고, 십이운성으로는 <b>" + row.stage + "</b> 자리입니다.";

    // p2 판단
    var judge = t.key === "general" ? "" : (verdict === "good" ? t.goodMsg : verdict === "ok" ? t.okMsg : t.warnMsg);
    var why = "";
    if (plus.length) why += " (도움: " + plus.join("·") + ")";
    if (minus.length) why += " (걸림: " + minus.join("·") + ")";
    var p2 = t.key === "general"
      ? "이 시기는 " + (STRONG[row.stage] ? "기운이 살아 있어 무엇을 벌여도 힘이 실립니다." : WEAK[row.stage] ? "기운이 다소 처져, 크게 벌이기보다 다지고 준비하기 좋습니다." : "무난한 흐름입니다.")
      : judge + why;

    // p3 실천·땜
    var yong = D.yongsin(res);
    var sinAdv = SINSAL_ADVICE[row.sinsal] ? " 이 시기 " + row.sinsal + " 기운은 이렇게 다스려라 — " + SINSAL_ADVICE[row.sinsal] : "";
    var gaewoon = " 개운 팁: 중요한 일엔 용신 <b>" + yong.names.join("·") + "</b> 기운(색 " + yong.info.color + "·방위 " + yong.info.dir + ")을 곁에 두면 힘이 붙는다.";
    var p3 = t.daem + sinAdv + gaewoon;

    // p4 이미 정해진 일 안심 문구
    var p4 = "";
    if (verdict !== "good" && t.key !== "general") {
      p4 = "이미 정해진 일이라면 굳이 엎을 필요는 없다. 사주는 정해진 걸 취소하는 게 아니라, 그 기운을 알고 위 방법으로 <b>땜</b>해 보완하는 것이다. 챙길 것만 챙기면 충분히 넘어간다.";
    }

    return {
      verdict: verdict, badge: badge, topic: t.label, when: when,
      row: { sipStem: row.sipStem, sipBranch: row.sipBranch, sinsal: row.sinsal, stage: row.stage, ganKo: row.ganKo, ganHan: row.ganHan },
      blocks: [
        { s: "이 시기 기운", t: p1 },
        { s: t.label + " 판단", t: p2 },
        { s: "실천·땜 방법", t: p3 }
      ].concat(p4 ? [{ s: "이미 정한 일이라면", t: p4 }] : [])
    };
  }

  root.AskContent = { analyze: analyze, TOPICS: TOPICS };
})(typeof window !== "undefined" ? window : this);
