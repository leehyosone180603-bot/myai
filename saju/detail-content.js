/* ============================================================
 * 도깨비 사주 — 상세(유료) 콘텐츠 생성기 (확장판)
 * 계산값(십성·신살·용신·대운·세운·납음)을 직설 말투 서사로 조립.
 * 각 섹션을 여러 소제목 + 연도/나이별 세운으로 자세히.
 * 반환: [{hanja, seal?, sealCap?, title, subtitle, blocks:[{sub?,text}], tale?, radar?}]
 * ============================================================ */
(function (root) {
  "use strict";

  var D = root.SajuDetail, DK = root.SajuDokkaebi;
  var OHENG = ["목", "화", "토", "금", "수"];
  var OHENG_LONG = ["목(木·나무)", "화(火·불)", "토(土·흙)", "금(金·쇠)", "수(水·물)"];
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BR_OHENG = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

  function el(dm) { return GAN_OHENG[dm]; }
  function bija(dm) { return el(dm); }
  function siksang(dm) { return (el(dm) + 1) % 5; }
  function jaeseong(dm) { return (el(dm) + 2) % 5; }
  function gwanseong(dm) { return (el(dm) + 3) % 5; }
  function inseong(dm) { return (el(dm) + 4) % 5; }

  function starGroup(sip) {
    if (sip === "비견" || sip === "겁재") return "비겁";
    if (sip === "식신" || sip === "상관") return "식상";
    if (sip === "편재" || sip === "정재") return "재성";
    if (sip === "편관" || sip === "정관") return "관성";
    return "인성";
  }

  // 연도별 세운 스캔 (원하는 오행이 천간/지지에 드는 해)
  function yList(dm, from, to, wantOheng, birthYear) {
    var out = [];
    for (var y = from; y <= to; y++) {
      var r = D.yearReading(dm, y);
      if (wantOheng.indexOf(GAN_OHENG[r.stem]) >= 0 || wantOheng.indexOf(BR_OHENG[r.branch]) >= 0)
        out.push({ year: y, age: y - birthYear + 1, gan: r.ganKo, sip: r.sipStem });
    }
    return out;
  }
  function fmtY(list, n) {
    if (!list.length) return "";
    return list.slice(0, n || 4).map(function (x) { return x.age + "세(" + x.year + "년 " + x.gan + ")"; }).join(", ");
  }
  function daeunByOheng(res, ohengList) {
    if (!res.daeun) return [];
    return res.daeun.list.filter(function (du) { return ohengList.indexOf(GAN_OHENG[du.stem]) >= 0; })
      .map(function (du) { return { age: du.startAge, gan: D.GAN_KO[du.stem] + D.JI_KO[du.branch] }; });
  }
  function starCount(res, group) {
    var n = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day" && starGroup(D.tenGodStem(res.dayMaster, p.stem)) === group) n++;
      if (starGroup(D.tenGodBranch(res.dayMaster, p.branch)) === group) n++;
    });
    return n;
  }

  /* ============ 섹션 생성 ============ */
  function build(res, ctx) {
    var dm = res.dayMaster, y = ctx.yongsin, bs = D.bodyStrength(res);
    var shin = D.computeShinsal(res);
    var np = D.napeum(res.pillars.day.stem, res.pillars.day.branch);
    var thisYear = ctx.thisYear, birthY = ctx.birthYear, age = ctx.age, gender = ctx.gender;
    var to = thisYear + 18;
    var giOheng = bs.strong ? [inseong(dm), bija(dm)] : [gwanseong(dm), jaeseong(dm)];
    var yongOheng = [y.primary, y.second];
    var mateOheng = (gender === "m") ? jaeseong(dm) : gwanseong(dm);
    var mateStar = (gender === "m") ? "재성(財)" : "관성(官)";
    var mateWord = (gender === "m") ? "여자" : "남자";
    var S = [];

    /* ── 魂 나란 사람 ── */
    var dkm = DK.DAYMASTER[dm];
    var bigGroup = topGroup(res);
    S.push({
      hanja: "魂", title: "나란 사람", subtitle: "네 팔자의 뿌리",
      seal: np.han, sealCap: "네 일주의 납음 — " + np.ko,
      blocks: [
        { text: dkm.portrait },
        { sub: "내 속에 흐르는 기운", text: ohengText(res) },
        {
          sub: bs.strong ? "너는 기운이 센 사람이다 (신강)" : "너는 기운이 여린 사람이다 (신약)",
          text: bs.strong
            ? "네 일간이 뿌리가 튼튼하고 돕는 기운이 많다. 그래서 남한테 안 휘둘리고 제 뜻대로 밀어붙이는 힘이 세다. 대신 고집이 세고 남 말을 안 들어 스스로를 가두기 쉬우니, 네 기운을 눌러 주고 흘려보내는 운(재물·명예·표현)에서 오히려 크게 풀린다."
            : "네 일간이 혼자 서기엔 기운이 좀 여리다. 그래서 주변 사람·환경을 잘 타고, 혼자보다 함께일 때 힘을 낸다. 대신 결정이 무르고 남 눈치를 보기 쉬우니, 너를 돕고 북돋는 운(비겁·인성)에서 자신감이 살아나고 일이 풀린다."
        },
        {
          sub: "네 팔자에서 도드라진 것",
          text: "네 사주엔 " + bigGroup.name + "의 기운이 제일 두드러진다. " + bigGroup.desc + " 이게 네 인생을 끌고 가는 축이다. 이 밑그림 위에서 아래 이야기가 다 나온다."
        },
        { text: "그리고 네 일주는 " + np.ko + "(" + np.han + ")다. " + napeumLine(np.ko) }
      ]
    });

    /* ── 冤 액운의 정체 (生靈) ── */
    var badShin = shin.filter(function (s) { return !s.good; });
    var giY = yList(dm, thisYear, to, giOheng, birthY);
    S.push({
      hanja: "冤", title: "액운의 정체", subtitle: "네게 붙은 놈",
      blocks: [
        { text: "네게 붙은 놈의 정체부터 말하마. 네 사주엔 " + (badShin.length ? "‘" + badShin.map(function (s) { return s.key + "(" + s.han + ")"; }).join("·") + "’" : "특정 살(殺)") + "의 기운이 서려 있다. 이게 잘 나가다가도 한 번씩 발목을 잡는 액운의 뿌리다. " + (badShin.length ? badShin[0].desc : "") },
        { sub: "이 놈이 언제 힘을 쓰나", text: "네 기운을 무너뜨리는 건 " + OHENG_LONG[giOheng[0]] + " 기운이다. 이게 세지는 해에 사고·구설·손재·건강 탈이 몰린다. 특히 " + (giY.length ? fmtY(giY, 4) : "특정 해") + " — 이 무렵은 큰 계약·투자·이별 같은 큰일을 벌이지 말고 몸을 낮춰라." },
        { sub: "이 놈은 세 갈래로 나타난다", text: "① 돈에서는, 다 된 일이 막판에 새거나 보증·투자로 뜯긴다. ② 인연에서는, 잘 가다가 네 " + (bs.strong ? "고집" : "불안") + "이 튀어나와 사람을 밀어낸다. ③ 몸에서는, 이유 없이 " + organLine(res).part.split("(")[0] + "이(가) 먼저 지친다. 셋 다 뿌리는 같은 기운이다." },
        { sub: "떼어낼 게 아니라 다스려라", text: "이 놈은 굿을 하고 떼어내는 게 답이 아니다. 네 안의 못다 푼 마음이라 떼면 또 붙는다. " + OHENG_LONG[yongOheng[0]] + "(네 용신) 기운으로 눌러 다스리면, 오히려 남들 없는 뚝심과 촉이 된다. 그 구체적인 방법은 맨 마지막 ‘운명의 갈림길’에서 일러주마." }
      ],
      tale: true
    });

    /* ── 欲 기회와 허상 ── */
    var chanceY = yList(dm, thisYear, to, [jaeseong(dm), siksang(dm)], birthY);
    S.push({
      hanja: "欲", title: "기회와 허상", subtitle: "진짜 기회 고르는 법",
      blocks: [
        { text: "네 앞엔 진짜 기회와 허상이 늘 섞여 온다. " + (bs.strong ? "너는 기운이 세서 뭐든 밀어붙이려 하는데, 그러다 반짝이는 허상을 진짜로 착각해 크게 벌였다 데는 일이 있다." : "너는 기운이 여려서, 눈앞의 진짜 기회를 두고도 자신이 없어 ‘내가 되겠어?’ 하며 놓치는 일이 많다.") },
        { sub: "네게 진짜인 기회", text: "네 재능(식상)과 재물(재성)이 열리는 " + OHENG_LONG[jaeseong(dm)] + "·" + OHENG_LONG[siksang(dm)] + " 기운의 해가 진짜다. 앞으로 보면 " + (chanceY.length ? fmtY(chanceY, 4) : "가까운 몇 해") + " — 이 해에 온 제안은 겁내지 말고 잡아라." },
        { sub: "허상은 이렇게 온다", text: OHENG_LONG[giOheng[0]] + " 기운만 요란한 해엔, 급하게 ‘지금 아니면 안 된다’고 몰아붙이는 이야기가 들어온다. 이게 허상이다. 진짜 기회는 급하게 굴지 않는다. 급할수록 한 박자 늦추고 사람을 알아본 뒤 움직여라." }
      ]
    });

    /* ── 情 니 인연 (연도별) ── */
    var mateY = yList(dm, thisYear, to, [mateOheng], birthY);
    var dohwa = shin.some(function (s) { return s.key === "도화살"; });
    var dayBranch = res.pillars.day.branch;
    S.push({
      hanja: "情", title: "니 인연", subtitle: "사랑과 배우자",
      blocks: [
        { text: "네 배우자 자리(일지)엔 " + D.JI_KO[dayBranch] + "(" + D.JI[dayBranch] + ")가 앉아 있다. " + branchMateLine(dayBranch) },
        { sub: "네 짝의 모습", text: "네 " + mateWord + "는 " + mateTypeLine(mateOheng) + " " + (dohwa ? "게다가 네겐 도화살이 있어 이성이 늘 따르고 인연이 끊이지 않는다. 대신 그만큼 스치는 인연도 많으니, 진짜와 허상을 가릴 줄 알아야 한다." : "요란하게 여럿보다, 한 사람과 깊게 가는 인연이 네겐 맞다.") },
        { sub: "인연이 짙어지는 시기 (연도별)", text: "너에게 " + mateStar + "이 들어오는 해가 인연이 무르익는 때다. 앞으로 보면 — " + (mateY.length ? mateY.slice(0, 5).map(function (x) { return x.age + "세(" + x.year + "년)"; }).join(", ") : "가까운 몇 해") + ". 이 해에 만나거나 깊어지는 사람은 그냥 스칠 인연이 아니다." },
        { sub: "이 시기에 어떻게 해야 하나", text: "이 시기엔 " + (gender === "m" ? "네가 먼저 다가가되 재는 티를 내지 마라. 여자는 계산하는 남자를 제일 싫어한다." : "튕기기보다 마음을 솔직히 보여라. 남자는 속을 모르는 여자 앞에서 물러선다.") + " 처음 세 번은 밥 먹고 낮에 만나며 사람을 봐라. 밤·술자리로 시작한 인연은 오래 못 간다." },
        { sub: "놓치면 안 되는 신호", text: "이 사람이다 싶으면 몸이 먼저 편해진다. 말 안 해도 자리가 편하고, 헤어지고 나서 마음이 놓이면 그 사람이 맞다. 반대로 만날 때마다 불안하고 확인받고 싶으면, 그건 인연이 아니라 네 " + (bs.strong ? "욕심" : "외로움") + "이다." },
        { love: true }
      ]
    });

    /* ── 劫 놓친 인연 ── */
    var chungBranch = (dayBranch + 6) % 12;
    var hasChung = ["year", "month", "hour"].some(function (k) { return res.pillars[k] && res.pillars[k].branch === chungBranch; });
    S.push({
      hanja: "劫", title: "놓친 인연", subtitle: "반복하는 실수",
      blocks: [
        { text: "네가 번번이 놓치는 인연엔 정해진 패턴이 있다. " + (bs.strong ? "너는 기가 세서, 좋은 사람이 와도 ‘내 방식’만 고집하다 밀어낸다. 상대가 맞춰주길 바라다 지쳐 떠나보낸다." : "너는 마음이 여려서, 붙잡아야 할 순간에 ‘내가 뭐라고’ 하며 머뭇거리다 놓친다. 재고 재다 타이밍을 흘린다.") },
        { sub: hasChung ? "네 사주엔 인연을 흔드는 충(沖)이 있다" : "작은 서운함이 쌓여 끝난다", text: hasChung ? "일지를 치는 충이 있어, 큰 사건 하나로 끝나기보다 자주 만나고 자주 부딪히는 관계가 된다. 서로 애틋한데 붙어 있으면 티격태격하는 인연이 반복된다. 이걸 알면 ‘또 이러네’ 하고 흘려보낼 수 있다." : "네 인연은 큰 사건이 아니라 작은 서운함이 쌓여 끝난다. 네가 표현을 아끼는 사이, 상대는 ‘사랑받지 못한다’고 느낀다. 마음을 말로 꺼내는 연습이 네겐 약이다." },
        { sub: "두 번 다시 놓치지 않으려면", text: "인연이 어긋나는 순간, 네 " + (bs.strong ? "고집" : "불안") + "이 먼저 튀어나온다. 그 한 박자를 늦춰라. " + OHENG_LONG[yongOheng[0]] + " 기운을 떠올리며 숨을 고르고, ‘지금 이 말이 관계를 살릴 말인가’ 한 번만 생각하면, 놓칠 인연도 붙잡는다." }
      ]
    });

    /* ── 緣 귀인의 시기 (연도별) ── */
    var gwiin = shin.filter(function (s) { return s.good; });
    var gwiY = yList(dm, thisYear, to, [inseong(dm)], birthY);
    S.push({
      hanja: "緣", title: "귀인의 시기", subtitle: "너를 살릴 사람",
      blocks: [
        { text: "네 인생엔 반드시 널 끌어주는 귀인이 있다. " + (gwiin.length ? "네 사주엔 ‘" + gwiin.map(function (s) { return s.key; }).join("·") + "’이 박혀 있어, 위기마다 도와주는 사람이 딱 나타난다. 혼자 다 하려 들지 마라." : "특히 윗사람·스승·손윗 인연의 덕을 크게 보는 팔자다.") },
        { sub: "귀인은 이런 사람이다", text: "네 귀인은 " + OHENG_LONG[inseong(dm)] + " 기운을 지닌 사람이다. 대개 너보다 나이 많거나, 배움이 깊거나, 조용히 너를 챙겨주는 사람이다. 요란하게 잘해주는 사람 말고, 티 안 내고 결정적일 때 손 내미는 사람 — 그가 진짜다." },
        { sub: "귀인이 오는 해 (연도별)", text: "너를 돕는 인성(印) 기운이 드는 해에 사람 덕으로 일이 풀린다. 앞으로 보면 — " + (gwiY.length ? fmtY(gwiY, 5) : "가까운 몇 해") + ". 이 해에 만난 윗사람·스승·거래처는 놓치지 말고 오래 붙잡아라." },
        { sub: "귀인을 놓치는 이유", text: "귀인은 대개 잔소리처럼 온다. 네가 " + (bs.strong ? "고집 부리며 ‘내가 안다’ 할 때" : "주눅 들어 ‘폐 끼치기 싫다’ 할 때") + " 귀인이 등을 돌린다. 도와준다 할 때 넙죽 받고, 은혜는 반드시 갚아라. 그래야 귀인이 또 온다." }
      ]
    });

    /* ── 財 니 돈의 크기 ── */
    var jaeCnt = starCount(res, "재성");
    var jaeAges = daeunByOheng(res, [jaeseong(dm)]);
    var jaeY = yList(dm, thisYear, to, [jaeseong(dm)], birthY);
    var leakY = yList(dm, thisYear, to, [bija(dm)], birthY);
    S.push({
      hanja: "財", title: "니 돈의 크기", subtitle: "네 돈 그릇",
      blocks: [
        { text: "네 돈 그릇부터 말하마. 네 사주의 재성(財)은 " + (jaeCnt >= 3 ? "여러 개라 크게 벌고 크게 쓰는 큰 그릇" : jaeCnt >= 1 ? "적당히 있어 한 우물을 단단히 파는 그릇" : "드러나지 않아, 돈 자체보다 명예·실력으로 크는 그릇") + "이다. " + (bs.strong ? "기운이 세니 벌 땐 크게 벌고, 배짱 있게 굴려서 큰돈을 만질 수 있다." : "기운이 여리니 무리한 확장·투기보다 꾸준함과 저축이 네 돈을 지킨다. 남의 돈(빚·보증)은 특히 조심해라.") },
        { sub: "돈이 들어오는 방식", text: (starCount(res, "식상") >= 1 ? "너는 네 재능·손재주·말솜씨로 돈을 버는 사람이다(식상생재). 몸값을 올려 받는 쪽이 맞다." : "너는 성실함과 관리로 돈을 모으는 사람이다. 한 방보다 차곡차곡이 네 방식이다.") },
        { sub: "돈이 크게 열리는 시기", text: "재물운(재성)이 대운으로 드는 " + (jaeAges.length ? jaeAges.slice(0, 2).map(function (a) { return a.age + "세부터의 " + a.gan + " 대운"; }).join(", ") + " 무렵" : "중년 이후") + "이 네 돈이 크게 열리는 때다. 세운으로는 " + (jaeY.length ? fmtY(jaeY, 3) : "가까운 재성의 해") + "에 돈 이야기가 들어온다." },
        { sub: "돈이 새는 시기", text: "반대로 비겁(比劫)이 드는 " + (leakY.length ? fmtY(leakY, 3) : "특정 해") + "엔 돈이 샌다. 친구·동업·보증으로 나가기 쉬우니, 이 해엔 큰돈을 남과 엮지 마라. ‘좋은 게 좋은 거’ 하다 뜯긴다." },
        { sub: "돈 버는 습관", text: "네 용신은 " + y.names.join("·") + "이라, 돈 관련 큰 결정은 " + y.info.dir + " 방향에서, " + y.info.color + " 계열을 곁에 두고 하면 판단이 맑아진다. 지갑·통장 숫자에 " + y.info.num + "을 넣어두면 재물 습관이 붙는다." }
      ]
    });

    /* ── 業 니 일의 길 (능력치) ── */
    S.push({
      hanja: "業", title: "니 일의 길", subtitle: "타고난 적성",
      radar: D.abilityScores(res),
      blocks: [
        { text: "네가 사회에서 힘을 쓰는 길은 " + jobLine(res, dm) + "다. 억지로 남 따라 방향 틀지 말고 네 그릇대로 가야 크게 된다." },
        { sub: "네 능력의 생김새", text: abilityText(D.abilityScores(res)) },
        { sub: bs.strong ? "너는 ‘내 판’을 벌여야 산다" : "너는 ‘좋은 조직’에서 큰다", text: bs.strong ? "기운이 세서 남 밑에 오래 있으면 답답해한다. 독립·전문직·사업·기술처럼 네가 주도권을 쥐는 자리에서 빛난다. 대신 동업은 신중히, 판단은 사람을 붙여 검증해라." : "기운이 여려서 혼자 다 짊어지면 지친다. 좋은 조직·시스템·윗사람 밑에서 실력을 쌓을 때 오히려 크게 큰다. 자격·전문성으로 자리를 굳혀라." },
        { sub: "어울리는 일", text: "구체적으로는 " + jobList(res, dm) + " 쪽이 네 기운과 맞는다. 방향이 맞으면 같은 노력으로 두 배 간다." }
      ]
    });

    /* ── 體 니 몸의 약점 ── */
    var org = organLine(res);
    var healthY = yList(dm, thisYear, to, giOheng, birthY);
    S.push({
      hanja: "體", title: "니 몸의 약점", subtitle: "타고난 건강",
      blocks: [
        { text: "네 몸에서 먼저 탈이 나는 자리는 " + org.part + "다. " + org.why },
        { sub: "계절로는 이때 조심해라", text: org.season + " 이 무렵 몸이 처지고 잔병이 오기 쉬우니, 이때만이라도 무리 말고 몸을 챙겨라." },
        { sub: "조심할 나이·해", text: OHENG_LONG[giOheng[0]] + " 기운이 세지는 " + (healthY.length ? fmtY(healthY, 3) : "특정 해") + " 무렵, 몸이 먼저 신호를 보낸다. 이유 없이 몸이 무거워지는 해가 정해져 있으니, 미리 알고 그 해엔 검진 한 번 받고 쉬어가라." },
        { sub: "개운 건강법", text: "네 용신 " + y.names.join("·") + " 기운을 몸에도 써라. " + org.care }
      ]
    });

    /* ── 運 니 인생의 황금기 (대운 상세) ── */
    var goldAges = daeunByOheng(res, yongOheng);
    S.push({
      hanja: "運", title: "니 인생의 황금기", subtitle: "삶이 빛을 보는 때",
      blocks: [
        { text: "이제 네 인생의 큰 흐름, 대운을 짚어주마. 대운은 10년씩 갈아입는 옷이라, 이 옷에 따라 같은 사주도 확 다르게 산다. 네 대운은 " + (res.daeun ? (res.daeun.forward ? "순행(順行)" : "역행(逆行)") + "하고 " + res.daeun.num + "세부터 시작된다." : "아래와 같다.") },
        { sub: "네 대운 흐름 한눈에", daeun: true },
        { sub: "네 황금기", text: "고생이 끝나고 삶이 빛을 보는 황금기는, 네 용신(" + y.names.join("·") + ") 기운이 대운으로 드는 때다. " + (goldAges.length ? goldAges.slice(0, 2).map(function (a) { return a.age + "세부터의 " + a.gan + " 대운"; }).join(", ") + " — 이 무렵이 네 인생의 절정이다." : "중년 이후 용신운이 들 때가 절정이다.") + " 이때는 벌이던 걸 크게 펼치고, 큰 결정을 내려도 좋다. 이 시기를 준비하느냐 마느냐가 인생을 가른다." },
        { sub: "몸을 낮출 시기", text: "반대로 기신 기운이 센 대운엔 확장보다 관리다. " + (daeunByOheng(res, giOheng).length ? daeunByOheng(res, giOheng).slice(0, 2).map(function (a) { return a.age + "세부터의 " + a.gan + " 대운"; }).join(", ") + " 무렵" : "특정 대운") + "엔 새로 벌이기보다, 있는 걸 지키고 사람을 다지며 다음 상승기를 준비해라." }
      ]
    });

    /* ── 命 운명의 갈림길 ── */
    S.push({
      hanja: "命", title: "운명의 갈림길", subtitle: "도깨비의 마지막 말",
      blocks: [
        { text: "네 사주의 갈림길은 결국 하나다. 네 넘치는 " + OHENG_LONG[bs.strong ? el(dm) : giOheng[0]] + " 기운을 어떻게 다스리느냐. 잘 쓰면 그게 네 무기가 되고, 못 다스리면 그게 널 무너뜨린다." },
        { sub: "너를 살리는 기운 · 개운법", text: "네 용신은 " + y.names.join("·") + "이다. 이 기운을 곁에 두면 운이 열린다. ▪ 방향은 " + y.info.dir + " ▪ 색은 " + y.info.color + " ▪ 숫자는 " + y.info.num + ". 큰 결정·이사·개업은 이 방향, 옷·소품엔 이 색, 중요한 날엔 이 숫자를 가까이해라." },
        { sub: "곁에 둘 사람", text: "너를 살리는 사람은 " + OHENG_LONG[yongOheng[0]] + " 기운을 지닌 사람이다. " + mateTypeLineShort(yongOheng[0]) + " 이런 사람을 곁에 두면 네 부족한 기운이 채워진다." },
        { text: "명심해라. 사주는 정해진 운명이 아니라 타고난 판이다. 그 판을 알고 쓰면 도깨비도 못 말리는 사람이 된다. 나는 늘 말했지 — 사람은 자기가 제일 무서워하는 쪽에, 자기가 제일 원하는 게 숨어 있다. 네 놈의 " + OHENG_LONG[giOheng[0]] + " 기운, 그 안에 네 복이 있다. 이만 물러가마." }
      ]
    });

    return S;
  }

  /* ---- 헬퍼 ---- */
  function ohengText(res) {
    if (DK && DK.buildReading) {
      var r = DK.buildReading(res);
      var sec = r.sections.filter(function (s) { return s.title.indexOf("기운") >= 0; })[0];
      if (sec) return sec.body;
    }
    return "";
  }
  function topGroup(res) {
    var g = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day") g[starGroup(D.tenGodStem(res.dayMaster, p.stem))]++;
      g[starGroup(D.tenGodBranch(res.dayMaster, p.branch))]++;
    });
    var max = "관성", mv = -1; for (var k in g) if (g[k] > mv) { mv = g[k]; max = k; }
    var desc = {
      비겁: "자립심과 경쟁심이 강해, 남한테 기대기보다 제 힘으로 밀고 나가는 사람이다.",
      식상: "재능과 표현欲이 강해, 하고 싶은 걸 펼치고 드러내야 사는 사람이다.",
      재성: "현실 감각과 돈·활동欲이 강해, 실속을 챙기고 판을 벌이는 사람이다.",
      관성: "책임감과 명예欲이 강해, 자리와 인정 속에서 자기를 세우는 사람이다.",
      인성: "배움과 생각이 깊어, 안으로 채우고 정리한 뒤 움직이는 사람이다."
    };
    return { name: max, desc: desc[max] };
  }
  function napeumLine(ko) {
    var m = {
      "천하수": "하늘의 은하수 같은 물이라, 그릇이 크고 사람을 시원하게 품는다.",
      "대해수": "큰 바다 같은 물이라, 포용력이 넓고 도량이 크다.",
      "간하수": "골짜기 시냇물이라, 맑고 영리하며 쉼 없이 흐른다.",
      "노중화": "화롯불 같은 불이라, 은근하고 오래가는 열정이 있다.",
      "벽력화": "벼락 같은 불이라, 폭발적이고 강렬한 힘이 있다.",
      "백랍금": "제련 전의 여린 쇠라, 다듬을수록 빛나는 잠재력이 있다.",
      "대림목": "큰 숲의 나무라, 듬직하고 사람을 품는 그늘이 있다."
    };
    return m[ko] || "그 기운이 네 삶의 밑바탕에 은은히 흐른다.";
  }
  function branchMateLine(b) {
    var s = ["차분하고 속 깊은", "성실하고 참을성 있는", "활동적이고 진취적인", "예민하고 섬세한", "듬직하고 포용력 있는",
      "밝고 정 많은", "화끈하고 솔직한", "온화하고 헌신적인", "결단력 있고 의리 있는", "예리하고 깔끔한", "믿음직하고 신중한", "총명하고 감성적인"];
    return "곁에 두면 " + s[b] + " 사람과 짝이 될 자리다.";
  }
  function mateTypeLine(oheng) {
    var t = ["곧고 진취적이며 자기 주관이 뚜렷한 사람", "밝고 열정적이며 표현이 시원한 사람", "듬직하고 안정감 있는 믿음직한 사람", "결단력 있고 원칙이 분명한 사람", "지혜롭고 유연하며 속 깊은 사람"];
    return t[oheng] + "일 때 잘 맞는다.";
  }
  function mateTypeLineShort(oheng) {
    var t = ["곧고 진취적인 사람,", "밝고 따뜻한 사람,", "듬직하고 안정된 사람,", "원칙 있고 냉철한 사람,", "지혜롭고 유연한 사람,"];
    return t[oheng];
  }
  function jobLine(res, dm) {
    return jobMap(topGroup(res).name).path;
  }
  function jobList(res, dm) {
    return jobMap(topGroup(res).name).list;
  }
  function jobMap(group) {
    return {
      비겁: { path: "네 힘으로 승부하는 독립·전문의 길", list: "전문직(의사·변호사·회계), 운동·기술직, 1인 사업, 프리랜서" },
      식상: { path: "재능과 표현으로 먹고사는 창작의 길", list: "창작·디자인·방송·콘텐츠, 교육·강의, 요식·손기술, 기획" },
      재성: { path: "돈과 현실을 굴리는 사업의 길", list: "사업·자영업, 영업·세일즈, 금융·투자, 무역·유통" },
      관성: { path: "조직과 명예로 인정받는 관(官)의 길", list: "공직·행정, 대기업·관리직, 군·경·법, 조직 리더" },
      인성: { path: "배움과 자격으로 크는 학(學)의 길", list: "연구·학계, 교육·교사, 전문 자격사, 상담·의료·종교" }
    }[group];
  }
  function abilityText(scores) {
    var top = scores.slice().sort(function (a, b) { return b.v - a.v; })[0];
    var low = scores.slice().sort(function (a, b) { return a.v - b.v; })[0];
    return "가장 센 건 ‘" + top.label + "’(" + top.v + ")이고, 가장 약한 건 ‘" + low.label + "’(" + low.v + ")이다. " + top.label + "이(가) 네 무기니 그걸 앞세우고, " + low.label + "은(는) 그게 강한 사람을 곁에 둬서 메워라. 약점을 억지로 채우려 애쓰다 무기까지 무뎌지는 법이다.";
  }
  function organLine(res) {
    var o = res.oheng, min = 0, max = 0;
    for (var i = 1; i < 5; i++) { if (o[i] < o[min]) min = i; if (o[i] > o[max]) max = i; }
    var organ = [
      { part: "간·담(피로·눈·근육)", why: "목 기운이 치우쳐, 스트레스와 피로·눈·근육에 먼저 신호가 온다.", season: "봄(2~4월)", care: "새벽보다 아침 햇빛을 쐬고, 신 음식과 초록 채소로 간을 풀어줘라." },
      { part: "심장·혈압(가슴·수면)", why: "화 기운이 치우쳐, 흥분·불면·심혈관에 신호가 온다.", season: "여름(5~7월)", care: "밤에 생각을 끄고 심장을 쉬게 해라. 쓴 음식과 붉은 채소가 약이다." },
      { part: "위장·소화(비위)", why: "토 기운이 약하거나 과해, 소화기와 생각 많은 데서 탈이 난다.", season: "환절기", care: "끼니를 규칙적으로, 찬 것보다 따뜻한 음식으로 비위를 지켜라." },
      { part: "폐·대장·피부(호흡기)", why: "금 기운이 치우쳐, 호흡기·피부·대장이 약하다.", season: "가을(8~10월)", care: "가을 건조에 물과 매운 음식을 적당히, 호흡·유산소로 폐를 틔워라." },
      { part: "신장·방광(허리·비뇨)", why: "수 기운이 약하거나 과해, 신장·허리·비뇨기가 약하다.", season: "겨울(11~1월)", care: "허리와 발을 따뜻이, 짠 것 줄이고 검은 음식·물로 신장을 지켜라." }
    ];
    var pick = (o[min] === 0) ? min : max;
    return organ[pick];
  }

  root.DetailContent = { build: build };
})(typeof window !== "undefined" ? window : this);
