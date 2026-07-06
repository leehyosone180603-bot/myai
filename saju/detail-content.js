/* ============================================================
 * 도깨비 사주 — 상세(유료) 콘텐츠 생성기
 * 계산값(십성·신살·용신·대운·세운·납음)을 직설 말투 서사로 조립.
 * 반환: 섹션 배열 [{hanja, seal?, sealImg?, title, subtitle, blocks:[{sub?,text}]}]
 * ============================================================ */
(function (root) {
  "use strict";

  var D = root.SajuDetail, DK = root.SajuDokkaebi;
  var OHENG = ["목", "화", "토", "금", "수"];
  var OHENG_LONG = ["목(木·나무)", "화(火·불)", "토(土·흙)", "금(金·쇠)", "수(水·물)"];
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];

  function el(D0) { return GAN_OHENG[D0]; }
  function bija(dm) { return el(dm); }
  function siksang(dm) { return (el(dm) + 1) % 5; }
  function jaeseong(dm) { return (el(dm) + 2) % 5; }
  function gwanseong(dm) { return (el(dm) + 3) % 5; }
  function inseong(dm) { return (el(dm) + 4) % 5; }

  // 세운 스캔: [from,to] 연도 중 target 오행/십성군에 해당하는 해
  function scanYears(dm, from, to, wantOhengList) {
    var out = [];
    for (var y = from; y <= to; y++) {
      var r = D.yearReading(dm, y);
      var so = GAN_OHENG[r.stem], bo = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4][r.branch];
      if (wantOhengList.indexOf(so) >= 0 || wantOhengList.indexOf(bo) >= 0) out.push({ year: y, gan: r.ganKo });
    }
    return out;
  }

  function ageAt(birthYear, year) { return year - birthYear + 1; } // 세는나이 근사

  // 대운 중 특정 오행운(용신/기신) 구간 찾기
  function daeunByOheng(res, ohengList) {
    if (!res.daeun) return [];
    return res.daeun.list.filter(function (du) {
      return ohengList.indexOf(GAN_OHENG[du.stem]) >= 0;
    }).map(function (du) { return { age: du.startAge, gan: D.GAN_KO[du.stem] + D.JI_KO[du.branch] }; });
  }

  function joinYears(list, n) {
    if (!list.length) return "";
    return list.slice(0, n || 3).map(function (x) { return x.year + "년(" + x.gan + ")"; }).join(", ");
  }

  /* ============ 섹션 생성 ============ */
  function build(res, ctx) {
    var dm = res.dayMaster, y = ctx.yongsin, bs = D.bodyStrength(res);
    var shin = D.computeShinsal(res);
    var np = D.napeum(res.pillars.day.stem, res.pillars.day.branch);
    var thisYear = ctx.thisYear, age = ctx.age, gender = ctx.gender;
    var giOheng = bs.strong ? [inseong(dm), bija(dm)] : [gwanseong(dm), jaeseong(dm)]; // 기신군(대충)
    var yongOheng = [y.primary, y.second];
    var mateOheng = (gender === "m") ? jaeseong(dm) : gwanseong(dm);
    var mateStar = (gender === "m") ? "재성(財)" : "관성(官)";
    var S = [];

    // ── 魂 나란 사람 ──
    var dkm = DK.DAYMASTER[dm];
    S.push({
      hanja: "魂", title: "나란 사람", subtitle: "네 팔자의 뿌리",
      seal: np.han, sealCap: "네 일주의 납음 — " + np.ko,
      blocks: [
        { text: dkm.portrait },
        { sub: "내 속에 흐르는 기운", text: ohengText(res) },
        { text: "네 일주(日柱)는 " + np.ko + "(" + np.han + ")다. " + napeumLine(np.ko) }
      ]
    });

    // ── 冤 액운의 정체 (生靈) ──
    var badShin = shin.filter(function (s) { return !s.good; });
    var giName = badShin.length ? badShin[0].key : (OHENG_LONG[giOheng[0]] + "의 과함");
    var giYears = scanYears(dm, thisYear, thisYear + 15, giOheng);
    S.push({
      hanja: "冤", seal: "生靈", sealImg: "saengryeong",
      title: "액운의 정체", subtitle: "네게 붙은 놈",
      blocks: [
        { text: "네게 붙은 놈의 정체부터 말하마. 네 사주엔 " + (badShin.length ? "‘" + badShin.map(function (s) { return s.key; }).join("·") + "’" : "특정 살(殺)") + "의 기운이 서려 있다. 이게 잘 나가다가도 한 번씩 발목을 잡는 액운의 뿌리다." },
        { sub: "이 놈이 언제 힘을 쓰나", text: "네 기운을 무너뜨리는 건 " + OHENG_LONG[giOheng[0]] + " 기운이다. 이게 세지는 해에 사고·구설·손재가 몰린다. 특히 " + (giYears.length ? joinYears(giYears, 3) : "특정 해") + " — 이 무렵을 조심해라." },
        { sub: "떼어낼 게 아니라 다스려라", text: "이 놈은 떼어내는 게 답이 아니다. " + OHENG_LONG[yongOheng[0]] + "(네 용신)의 기운으로 눌러 다스리면, 오히려 남들 없는 뚝심과 촉이 된다. 도깨비가 그 방법을 뒤에서 일러주마." }
      ],
      tale: true
    });

    // ── 欲 기회와 허상 ──
    S.push({
      hanja: "欲", title: "기회와 허상", subtitle: "진짜 기회 고르는 법",
      blocks: [
        { text: "네 앞엔 진짜 기회와 허상이 섞여 온다. " + (bs.strong ? "너는 기운이 세서 뭐든 밀어붙이려 하는데, 그러다 허상을 진짜로 착각하기 쉽다." : "너는 기운이 여려서 좋은 기회를 눈앞에 두고도 자신 없어 놓치기 쉽다.") },
        { sub: "네게 진짜인 기회", text: "네 재능(식상)과 재물(재성)이 열리는 " + OHENG_LONG[jaeseong(dm)] + "·" + OHENG_LONG[siksang(dm)] + " 기운의 해가 진짜 기회다. 반대로 " + OHENG_LONG[giOheng[0]] + " 기운만 요란한 해는 반짝이는 허상이니 크게 벌이지 마라." }
      ]
    });

    // ── 情 니 인연 ──
    var mateYears = scanYears(dm, thisYear, thisYear + 12, [mateOheng]);
    var dohwa = shin.some(function (s) { return s.key === "도화살"; });
    S.push({
      hanja: "情", title: "니 인연", subtitle: "사랑과 배우자",
      blocks: [
        { text: "네 배우자 자리(일지)엔 " + D.JI_KO[res.pillars.day.branch] + "(" + D.JI[res.pillars.day.branch] + ")가 앉아 있다. " + branchMateLine(res.pillars.day.branch) },
        { sub: "네 짝의 모습", text: (gender === "m" ? "네 여자는 " : "네 남자는 ") + mateTypeLine(mateOheng) + (dohwa ? " 게다가 네겐 도화살이 있어, 인연이 끊이지 않고 이성이 늘 따른다." : "") },
        { sub: "인연이 짙어지는 시기", text: "너에게 " + mateStar + "이 들어오는 " + (mateYears.length ? joinYears(mateYears, 3) : "특정 해") + " 무렵에 인연이 무르익는다. 이 해에 만나는 사람은 그냥 스칠 인연이 아니다." },
        { love: true }
      ]
    });

    // ── 劫 놓친 인연 ──
    S.push({
      hanja: "劫", title: "놓친 인연", subtitle: "반복하는 실수",
      blocks: [
        { text: "네가 반복해서 놓치는 인연의 패턴이 있다. " + (bs.strong ? "너는 기가 세서, 좋은 사람이 와도 네 방식만 고집하다 밀어낸다." : "너는 마음이 여려서, 붙잡아야 할 때 머뭇거리다 놓친다.") + " 이게 네 사주에 새겨진 관계의 약점이다." },
        { sub: "두 번 다시 놓치지 않으려면", text: "인연이 어긋날 땐 대개 네 " + (gender === "m" ? "고집" : "불안") + "이 먼저 튀어나온다. 그 순간 한 박자만 늦춰라. " + OHENG_LONG[yongOheng[0]] + " 기운을 떠올리며 마음을 눅이면, 놓칠 인연도 붙잡는다." }
      ]
    });

    // ── 緣 귀인의 시기 ──
    var gwiin = shin.filter(function (s) { return s.good; });
    var gwiYears = scanYears(dm, thisYear, thisYear + 12, [inseong(dm)]);
    S.push({
      hanja: "緣", title: "귀인의 시기", subtitle: "너를 살릴 사람",
      blocks: [
        { text: "네 인생엔 반드시 널 끌어주는 귀인이 있다. " + (gwiin.length ? "네 사주엔 ‘" + gwiin.map(function (s) { return s.key; }).join("·") + "’이 있어, 위기마다 도와주는 사람이 딱 나타난다." : "특히 윗사람·스승 덕을 보는 팔자다.") },
        { sub: "귀인이 오는 해", text: "너를 돕는 인성(印) 기운이 드는 " + (gwiYears.length ? joinYears(gwiYears, 3) : "특정 해") + " 무렵, 사람 덕에 일이 풀린다. 이때 만난 윗사람은 놓치지 마라." }
      ]
    });

    // ── 財 니 돈의 크기 ──
    var jaeCnt = countStar(res, "재성");
    var jaeAges = daeunByOheng(res, [jaeseong(dm)]);
    S.push({
      hanja: "財", title: "니 돈의 크기", subtitle: "네 돈 그릇",
      blocks: [
        { text: "네 돈 그릇부터 말하마. 네 사주의 재성(財)은 " + (jaeCnt >= 2 ? "여러 개라 크게 굴리는 그릇" : jaeCnt === 1 ? "단단히 한 우물을 파는 그릇" : "재성이 드러나지 않아, 돈보다 명예·실력으로 크는 그릇") + "이다. " + (bs.strong ? "기운이 세니 벌 땐 크게 번다." : "기운이 여리니 무리한 확장보다 꾸준함이 돈을 지킨다.") },
        { sub: "돈이 열리는 시기", text: "재물운(재성 대운)이 드는 " + (jaeAges.length ? jaeAges.map(function (a) { return a.age + "세(" + a.gan + ")"; }).slice(0, 2).join(", ") + " 무렵" : "중년 이후") + "이 네 돈이 크게 열리는 때다. 이때를 놓치면 다음은 한참 뒤다." }
      ]
    });

    // ── 業 니 일의 길 (능력치) ──
    S.push({
      hanja: "業", title: "니 일의 길", subtitle: "타고난 적성",
      radar: D.abilityScores(res),
      blocks: [
        { text: "네가 사회에서 힘을 쓰는 길은 " + jobLine(res, dm) + "다. 억지로 남 따라 방향 틀지 말고, 네 그릇대로 가야 크게 된다." },
        { sub: "네 능력의 생김새", text: abilityText(D.abilityScores(res)) }
      ]
    });

    // ── 體 니 몸의 약점 ──
    var weakOrgan = organLine(res);
    S.push({
      hanja: "體", title: "니 몸의 약점", subtitle: "타고난 건강",
      blocks: [
        { text: "네 몸에서 먼저 탈이 나는 자리는 " + weakOrgan.part + "다. " + weakOrgan.why },
        { sub: "조심할 시기", text: OHENG_LONG[giOheng[0]] + " 기운이 세지는 대운·세운에 몸이 먼저 신호를 보낸다. 이유 없이 몸이 무거워지는 해가 정해져 있으니, 미리 알고 관리하면 피할 수 있다." }
      ]
    });

    // ── 運 니 인생의 황금기 ──
    var goldAges = daeunByOheng(res, yongOheng);
    S.push({
      hanja: "運", title: "니 인생의 황금기", subtitle: "삶이 빛을 보는 때",
      blocks: [
        { text: "고생이 끝나고 삶이 빛을 보는 황금기가 반드시 온다. 네 용신(" + y.names.join("·") + ") 기운이 대운으로 드는 때다." },
        { sub: "네 황금기", text: (goldAges.length ? goldAges.map(function (a) { return a.age + "세부터의 " + a.gan + " 대운"; }).slice(0, 2).join(", ") + " — 이 무렵이 네 인생의 절정이다." : "중년 이후 용신운이 들 때가 절정이다.") + " 이때를 준비하느냐 마느냐가 인생을 가른다." },
        { daeun: true }
      ]
    });

    // ── 命 운명의 갈림길 ──
    S.push({
      hanja: "命", title: "운명의 갈림길", subtitle: "도깨비의 마지막 말",
      blocks: [
        { text: "네 사주의 갈림길은 결국 하나다. 네 넘치는 " + OHENG_LONG[bs.strong ? el(dm) : giOheng[0]] + " 기운을 어떻게 다스리느냐." },
        { sub: "너를 살리는 기운 · 개운법", text: "네 용신은 " + y.names.join("·") + "이다. 이 기운을 곁에 두면 운이 열린다. 방향은 " + y.info.dir + ", 색은 " + y.info.color + ", 숫자는 " + y.info.num + ". 큰 결정을 할 땐 이 방향·이 색을 가까이해라." },
        { text: "명심해라. 사주는 정해진 운명이 아니라 타고난 판이다. 그 판을 알고 쓰면 도깨비도 못 말리는 사람이 된다. 이만 물러가마." }
      ]
    });

    return S;
  }

  /* ---- 문장 헬퍼 ---- */
  function ohengText(res) {
    if (DK && DK.buildReading) {
      var r = DK.buildReading(res);
      var sec = r.sections.filter(function (s) { return s.title.indexOf("기운") >= 0; })[0];
      if (sec) return sec.body;
    }
    return "";
  }
  function napeumLine(ko) {
    var m = {
      "천하수": "하늘의 은하수 같은 물이라, 그릇이 크고 사람을 시원하게 품는다.",
      "대해수": "큰 바다 같은 물이라, 포용력이 넓고 도량이 크다.",
      "노중화": "화롯불 같은 불이라, 은근하고 오래가는 열정이 있다.",
      "벽력화": "벼락 같은 불이라, 폭발적이고 강렬한 힘이 있다."
    };
    return m[ko] || "그 기운이 네 삶의 밑바탕에 흐른다.";
  }
  function branchMateLine(b) {
    var s = ["차분하고 속 깊은", "성실하고 참을성 있는", "활동적이고 진취적인", "예민하고 섬세한", "듬직하고 포용력 있는",
      "밝고 정 많은", "화끈하고 솔직한", "온화하고 헌신적인", "결단력 있고 의리 있는", "예리하고 깔끔한", "믿음직하고 신중한", "총명하고 감성적인"];
    return "곁에 두면 " + s[b] + " 사람과 짝이 될 자리다.";
  }
  function mateTypeLine(oheng) {
    var t = ["곧고 진취적이며 자기 주관이 뚜렷한 사람", "밝고 열정적이며 표현이 시원한 사람", "듬직하고 안정감 있는, 믿음직한 사람", "결단력 있고 원칙 분명한 사람", "지혜롭고 유연하며 속 깊은 사람"];
    return t[oheng] + "일 때 잘 맞는다.";
  }
  function countStar(res, group) {
    var n = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day" && starGroup(D.tenGodStem(res.dayMaster, p.stem)) === group) n++;
      if (starGroup(D.tenGodBranch(res.dayMaster, p.branch)) === group) n++;
    });
    return n;
  }
  function starGroup(sip) {
    if (sip === "비견" || sip === "겁재") return "비겁";
    if (sip === "식신" || sip === "상관") return "식상";
    if (sip === "편재" || sip === "정재") return "재성";
    if (sip === "편관" || sip === "정관") return "관성";
    return "인성";
  }
  function jobLine(res, dm) {
    var g = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day") g[starGroup(D.tenGodStem(dm, p.stem))]++;
      g[starGroup(D.tenGodBranch(dm, p.branch))]++;
    });
    var max = "관성", mv = -1;
    for (var key in g) if (g[key] > mv) { mv = g[key]; max = key; }
    var m = {
      비겁: "네 힘으로 독립·전문직·운동·기술로 승부하는 길",
      식상: "재능과 표현으로 먹고사는 창작·교육·방송·기획의 길",
      재성: "돈과 현실을 굴리는 사업·영업·금융·유통의 길",
      관성: "조직과 명예로 인정받는 관리·공직·大기업의 길",
      인성: "배움과 자격으로 크는 연구·교육·전문·상담의 길"
    };
    return m[max];
  }
  function abilityText(scores) {
    var top = scores.slice().sort(function (a, b) { return b.v - a.v; })[0];
    var low = scores.slice().sort(function (a, b) { return a.v - b.v; })[0];
    return "가장 센 건 ‘" + top.label + "’(" + top.v + ")이고, 가장 약한 건 ‘" + low.label + "’(" + low.v + ")이다. " + top.label + "이 네 무기니 그걸 앞세우고, " + low.label + "은 사람을 곁에 둬서 메워라.";
  }
  function organLine(res) {
    var o = res.oheng, min = 0, max = 0;
    for (var i = 1; i < 5; i++) { if (o[i] < o[min]) min = i; if (o[i] > o[max]) max = i; }
    var organ = [
      { part: "간·담(피로·눈·근육)", why: "목 기운이 약하거나 치우쳐, 스트레스와 피로가 먼저 쌓인다." },
      { part: "심장·혈압(가슴·수면)", why: "화 기운이 치우쳐, 흥분·불면·심혈관에 신호가 온다." },
      { part: "위장·소화(비위)", why: "토 기운이 약하거나 과해, 소화기와 생각 많은 데서 탈이 난다." },
      { part: "폐·대장·피부(호흡기)", why: "금 기운이 치우쳐, 호흡기와 피부·대장이 약하다." },
      { part: "신장·방광(허리·비뇨)", why: "수 기운이 약하거나 과해, 신장·허리·비뇨기가 약하다." }
    ];
    var pick = (o[min] === 0) ? min : max;
    return organ[pick];
  }

  root.DetailContent = { build: build };
})(typeof window !== "undefined" ? window : this);
