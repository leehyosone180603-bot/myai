/* ============================================================
 * 도깨비 사주 — 상세(유료) 콘텐츠 생성기 (종합판 · 18장)
 * 5만원 사주상담 20개 목차를 커버.
 * 계산값(십성·신살·용신·대운·세운·납음)을 직설 말투 서사로 조립.
 * ============================================================ */
(function (root) {
  "use strict";

  var D = root.SajuDetail, DK = root.SajuDokkaebi;
  var OHENG = ["목", "화", "토", "금", "수"];
  var OHENG_LONG = ["목(木·나무)", "화(火·불)", "토(土·흙)", "금(金·쇠)", "수(水·물)"];
  var OHENG_MONTH = ["2~3월(초봄)", "5~6월(초여름)", "환절기(3·6·9·12월)", "8~9월(초가을)", "11~12월(초겨울)"];
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
  function daeunAges(list) { return list.slice(0, 2).map(function (a) { return a.age + "세부터의 " + a.gan + " 대운"; }).join(", "); }
  function starCount(res, group) {
    var n = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day" && starGroup(D.tenGodStem(res.dayMaster, p.stem)) === group) n++;
      if (starGroup(D.tenGodBranch(res.dayMaster, p.branch)) === group) n++;
    });
    return n;
  }

  // 조직 vs 사업 판정
  function orgVsBiz(res, bs) {
    var org = starCount(res, "관성") * 2 + starCount(res, "인성") * 1.5 + (!bs.strong ? 2 : 0);
    var biz = starCount(res, "재성") * 2 + starCount(res, "식상") * 2 + starCount(res, "비겁") * 1.2 + (bs.strong ? 2 : 0);
    if (biz >= org + 2) return "너는 ‘사업·자유업형’이다. 남 밑보다 네 판을 벌였을 때 크게 되는 기질이라, 실력을 쌓아 독립·창업·프리랜서로 가는 길이 맞다. 조직에 있어도 성과·재량이 큰 자리라야 숨통이 트인다.";
    if (org >= biz + 2) return "너는 ‘조직생활형’이다. 좋은 회사·조직 안에서 전문성과 자리로 크는 기질이라, 안정된 조직에서 승부하는 게 유리하다. 섣부른 창업보다 몸값을 올려 받는 쪽이 실속 있다.";
    return "너는 ‘혼합형’이다. 조직에서 실력·인맥·자본을 쌓은 뒤 때가 되면 독립하는 2단계 전략이 가장 잘 맞는다. 준비 없이 나오면 고생하니 시기를 잘 봐라.";
  }
  // 재물 그릇 수치화
  function moneyBowl(res, bs) {
    var jae = starCount(res, "재성"), sik = starCount(res, "식상");
    var y = D.yongsin(res), jaeYong = [y.primary, y.second].indexOf(jaeseong(res.dayMaster)) >= 0;
    var score = Math.max(30, Math.min(97, Math.round(42 + jae * 11 + sik * 5 + (bs.strong ? 7 : 0) + (jaeYong ? 6 : 0))));
    var grade = score >= 82 ? "대(大)그릇 — 큰 부를 담고 굴릴 그릇" : score >= 68 ? "중상(中上) — 넉넉히 굴리는 그릇" :
      score >= 54 ? "중(中) — 알뜰히 채워가는 그릇" : "실속형 — 돈보다 명예·실력으로 크는 그릇";
    return { score: score, grade: grade };
  }
  // 투자 성향
  function investStyle(res) {
    var pyeon = 0, jeong = 0;
    ["year", "month", "day", "hour"].forEach(function (k) {
      var p = res.pillars[k]; if (!p) return;
      if (k !== "day") { var s = D.tenGodStem(res.dayMaster, p.stem); if (s === "편재") pyeon++; if (s === "정재") jeong++; }
      var b = D.tenGodBranch(res.dayMaster, p.branch); if (b === "편재") pyeon++; if (b === "정재") jeong++;
    });
    if (pyeon > jeong) return "‘편재’가 강해 주식·코인·사업 같은 유동적 투자에 감각이 있다. 크게 벌 수 있지만 한 방을 노리다 크게 잃기도 하니, 분산·손절 원칙을 반드시 지켜라.";
    if (jeong > pyeon) return "‘정재’가 강해 부동산·저축·연금 같은 안정 자산이 맞다. 한 방보다 착실히 모아 지키는 쪽에서 네 재물이 단단히 커진다.";
    return "편재·정재가 고루 있어 유동 자산(주식 등)과 안정 자산(부동산·저축)을 반반 섞는 균형 투자가 네게 맞다.";
  }
  // 올해 연애 기상도
  function loveWeather(res, thisYear, gender) {
    var dm = res.dayMaster, mateGroup = (gender === "m" ? "재성" : "관성");
    var yr = D.yearReading(dm, thisYear);
    var hit = (starGroup(yr.sipStem) === mateGroup || starGroup(yr.sipBranch) === mateGroup);
    var dohwa = D.sinsal12(res.pillars.year.branch, D.yearGanzhi(thisYear).branch) === "년살";
    if (hit && dohwa) return "☀️ 활짝 맑음 — 배우자성과 도화가 함께 들어 인연운이 활짝 열리는 해다. 적극적으로 나서면 좋은 사람을 만난다.";
    if (hit) return "🌤️ 맑음 — 배우자성이 들어 인연이 무르익기 좋은 해다. 소개·만남에 마음을 열어라.";
    if (dohwa) return "⛅ 구름 조금 — 도화가 들어 인기·만남은 많으나 진짜를 가려야 한다. 스치는 인연에 흔들리지 마라.";
    return "🌥️ 흐림 — 배우자성이 약해 큰 인연보다 나를 다지는 해다. 조급해 말고 다음 배우자성의 해를 노려라.";
  }
  function goodLoveMonths(res, thisYear, gender) {
    var mateGroup = (gender === "m" ? "재성" : "관성");
    var rows = D.monthlyLuck(res, thisYear), out = [];
    rows.forEach(function (r) {
      if (starGroup(r.sipStem) === mateGroup || starGroup(r.sipBranch) === mateGroup || r.sinsal === "년살" || r.sinsal === "반안살") out.push(r.greg + "월");
    });
    return out;
  }

  function build(res, ctx) {
    var dm = res.dayMaster, y = ctx.yongsin, bs = D.bodyStrength(res);
    var shin = D.computeShinsal(res);
    var np = D.napeum(res.pillars.day.stem, res.pillars.day.branch);
    var thisYear = ctx.thisYear, birthY = ctx.birthYear, gender = ctx.gender, love = ctx.love;
    var to = thisYear + 20;
    var giOheng = bs.strong ? [inseong(dm), bija(dm)] : [gwanseong(dm), jaeseong(dm)];
    var yongOheng = [y.primary, y.second];
    var mateOheng = (gender === "m") ? jaeseong(dm) : gwanseong(dm);
    var mateStar = (gender === "m") ? "재성(財)" : "관성(官)";
    var mateWord = (gender === "m") ? "여자" : "남자";
    var childStar = (gender === "m") ? gwanseong(dm) : siksang(dm);
    var S = [];

    /* 1. 魂 나란 사람 */
    var dkm = DK.DAYMASTER[dm], big = topGroup(res);
    S.push({
      hanja: "魂", title: "나란 사람", subtitle: "구조와 성격",
      seal: np.han, sealCap: "네 일주의 납음 — " + np.ko,
      blocks: [
        { text: dkm.portrait },
        { sub: "내 속에 흐르는 기운", text: ohengText(res) },
        { sub: bs.strong ? "너는 기운이 센 사람이다 (신강)" : "너는 기운이 여린 사람이다 (신약)", text: bs.strong ? "네 일간이 뿌리가 튼튼해 남한테 안 휘둘리고 제 뜻대로 밀어붙인다. 대신 고집이 세 스스로를 가두기 쉬우니, 기운을 눌러 주고 흘려보내는 운(재물·명예·표현)에서 크게 풀린다." : "네 일간이 혼자 서기엔 여려서 사람·환경을 잘 탄다. 결정이 무르고 눈치를 보기 쉬우니, 너를 돕고 북돋는 운(비겁·인성)에서 자신감이 살아난다." },
        { sub: "감정 표현과 스트레스", text: "네 팔자엔 " + big.name + "이 두드러진다. " + big.desc + " " + stressLine(big.name, bs.strong) },
        { text: "네 일주는 " + np.ko + "(" + np.han + ")다. " + napeumLine(np.ko) }
      ]
    });

    /* 2. 冤 액운의 정체 */
    var badShin = shin.filter(function (s) { return !s.good; });
    var giY = yList(dm, thisYear, to, giOheng, birthY);
    S.push({
      hanja: "冤", title: "액운의 정체", subtitle: "네게 붙은 놈",
      blocks: [
        { text: "네게 붙은 놈부터 말하마. 네 사주엔 " + (badShin.length ? "‘" + badShin.map(function (s) { return s.key + "(" + s.han + ")"; }).join("·") + "’" : "특정 살(殺)") + "의 기운이 서려 있다. 잘 나가다 한 번씩 발목 잡는 액운의 뿌리다. " + (badShin.length ? badShin[0].desc : "") },
        { sub: "이 놈이 힘 쓰는 해", text: "네 기운을 무너뜨리는 " + OHENG_LONG[giOheng[0]] + " 기운이 세지는 해에 사고·구설·손재가 몰린다. 특히 " + (giY.length ? fmtY(giY, 4) : "특정 해") + " — 큰 계약·투자·이별은 이 무렵을 피해라." },
        { sub: "세 갈래로 나타난다", text: "① 돈: 다 된 일이 막판에 새거나 보증·투자로 뜯긴다. ② 인연: 네 " + (bs.strong ? "고집" : "불안") + "이 튀어나와 사람을 밀어낸다. ③ 몸: " + organLine(res).part.split("(")[0] + "이(가) 먼저 지친다." },
        { sub: "떼어낼 게 아니라 다스려라", text: "굿으로 뗄 게 아니다. 네 안의 못다 푼 마음이라 떼면 또 붙는다. " + OHENG_LONG[yongOheng[0]] + "(용신) 기운으로 다스리면 오히려 남들 없는 뚝심과 촉이 된다." }
      ],
      tale: true
    });

    /* 3. 欲 기회와 허상 */
    var chanceY = yList(dm, thisYear, to, [jaeseong(dm), siksang(dm)], birthY);
    S.push({
      hanja: "欲", title: "기회와 허상", subtitle: "진짜 기회 고르기",
      blocks: [
        { text: "네 앞엔 진짜 기회와 허상이 섞여 온다. " + (bs.strong ? "너는 뭐든 밀어붙이려다 반짝이는 허상을 진짜로 착각해 크게 데는 일이 있다." : "너는 진짜 기회를 눈앞에 두고도 자신 없어 놓치기 쉽다.") },
        { sub: "네게 진짜인 기회", text: "재능(식상)·재물(재성)이 열리는 " + OHENG_LONG[jaeseong(dm)] + "·" + OHENG_LONG[siksang(dm)] + " 기운의 해가 진짜다. " + (chanceY.length ? fmtY(chanceY, 4) : "가까운 몇 해") + " — 이 해에 온 제안은 잡아라." },
        { sub: "허상은 이렇게 온다", text: OHENG_LONG[giOheng[0]] + " 기운만 요란한 해엔 ‘지금 아니면 안 된다’며 몰아붙이는 이야기가 온다. 진짜 기회는 급하게 굴지 않는다. 급할수록 한 박자 늦춰라." }
      ]
    });

    /* 4. 情 니 인연과 결혼 */
    var mateY = yList(dm, thisYear, to, [mateOheng], birthY);
    var marryAges = daeunByOheng(res, [mateOheng]);
    var dohwa = shin.some(function (s) { return s.key === "도화살"; });
    var db = res.pillars.day.branch;
    var lateMarry = starCount(res, gender === "m" ? "재성" : "관성") === 0;
    S.push({
      hanja: "情", title: "니 인연과 결혼", subtitle: "연애·배우자·결혼",
      blocks: [
        { text: "네 배우자 자리(일지)엔 " + D.JI_KO[db] + "(" + D.JI[db] + ")가 앉아 있다. " + branchMateLine(db) },
        { sub: "네 연애 스타일과 이상형", text: "너는 " + loveStyle(dm, bs.strong) + " 네 " + mateWord + "는 " + mateTypeLine(mateOheng) + " " + (dohwa ? "도화살이 있어 이성이 늘 따르나, 스치는 인연도 많으니 진짜를 가려라." : "여럿보다 한 사람과 깊게 가는 인연이 맞다.") },
        { sub: "인연이 들어오는 시기 (연도별)", text: mateStar + "이 드는 해가 인연이 무르익는 때다. " + (mateY.length ? mateY.slice(0, 5).map(function (x) { return x.age + "세(" + x.year + "년)"; }).join(", ") : "가까운 몇 해") + ". 이 해에 만나거나 깊어지는 사람은 그냥 스칠 인연이 아니다." },
        { sub: "결혼운 · 적령기", text: "결혼운이 강해지는 건 " + (marryAges.length ? marryAges.slice(0, 2).map(function (a) { return a.age + "세부터의 " + a.gan + " 대운"; }).join(", ") + " 무렵" : "배우자성 대운이 들 때") + "이다. " + (lateMarry ? "배우자성이 뚜렷이 드러나지 않아, 서두른 결혼보다 인연이 무르익는 만혼(늦은 결혼)이 오히려 복이 된다." : "이 시기에 만난 인연과 맺으면 결혼 후 운이 함께 오른다.") },
        { sub: thisYear + "년 연애 기상도", text: loveWeather(res, thisYear, gender) },
        { sub: "올해 연애·결혼하기 좋은 달", text: (function () { var mm = goodLoveMonths(res, thisYear, gender); return mm.length ? "올해는 " + mm.slice(0, 6).join(", ") + " 무렵에 배우자성·인연 기운이 살아난다. 이 달에 만남·고백·상견례를 잡으면 흐름을 탄다." : "올해는 특정 달보다, 네 마음이 편해지는 때가 곧 좋은 때다. 조급함을 내려놓는 순간 인연이 든다."; })() },
        { sub: "연애할 때 주의할 점", text: (gender === "m" ? "재는 티를 내지 마라. 여자는 계산하는 남자를 싫어한다." : "튕기지 말고 마음을 솔직히 보여라. 남자는 속 모르는 여자 앞에서 물러선다.") + " 처음 세 번은 밥 먹고 낮에 만나며 사람을 봐라. 밤·술로 시작한 인연은 오래 못 간다." },
        { love: true }
      ]
    });

    /* 5. 劫 놓친 인연 */
    var chungB = (db + 6) % 12;
    var hasChung = ["year", "month", "hour"].some(function (k) { return res.pillars[k] && res.pillars[k].branch === chungB; });
    S.push({
      hanja: "劫", title: "놓친 인연", subtitle: "반복하는 실수",
      blocks: [
        { text: "네가 번번이 놓치는 인연엔 패턴이 있다. " + (bs.strong ? "좋은 사람이 와도 ‘내 방식’만 고집하다 밀어낸다." : "붙잡아야 할 순간에 ‘내가 뭐라고’ 하며 머뭇거리다 놓친다.") },
        { sub: hasChung ? "인연을 흔드는 충(沖)이 있다" : "작은 서운함이 쌓여 끝난다", text: hasChung ? "일지를 치는 충이 있어, 큰 사건보다 자주 부딪히는 관계가 된다. 애틋한데 붙어 있으면 티격태격이 반복된다. 알면 ‘또 이러네’ 하고 흘려보낸다." : "큰 사건이 아니라 작은 서운함이 쌓여 끝난다. 표현을 아끼는 사이 상대는 사랑받지 못한다 느낀다." },
        { sub: "두 번 다시 놓치지 않으려면", text: "어긋나는 순간 네 " + (bs.strong ? "고집" : "불안") + "이 먼저 튀어나온다. 그 한 박자를 늦추고 ‘이 말이 관계를 살릴 말인가’ 한 번만 생각하면, 놓칠 인연도 붙잡는다." }
      ]
    });

    /* 6. 合 궁합 */
    S.push({
      hanja: "合", title: "궁합", subtitle: "잘 맞는 사람",
      blocks: [
        { text: "너와 잘 맞는 사람은 네 부족을 채워주는 사람이다. 오행으로 보면 " + OHENG_LONG[yongOheng[0]] + " 기운을 지닌 사람 — " + mateTypeLine(yongOheng[0]) },
        { sub: "잘 맞는 띠", text: "네 일지 " + D.JI_KO[db] + "와(과) " + hapTti(db) + " 띠는 육합·삼합으로 어울려 편안하고, " + chungTti(db) + " 띠는 충이라 처음엔 부딪혀도 서로를 자극해 크게 키운다." },
        { sub: "오래가는 관계 비결", text: "너는 " + (bs.strong ? "네 뜻대로 끌고 가려는 기운이 세다. 상대에게 결정권을 나눠줄 때 관계가 길어진다." : "상대에게 기대는 마음이 크다. 스스로 중심을 세울 때 관계가 편안해진다.") + " 두 사람의 생년월일로 보는 자세한 궁합은 무료 궁합에서 확인해라.", link: "/gunghap/" }
      ]
    });

    /* 7. 緣 귀인과 조심할 사람 */
    var gwiin = shin.filter(function (s) { return s.good; });
    var gwiY = yList(dm, thisYear, to, [inseong(dm)], birthY);
    S.push({
      hanja: "緣", title: "귀인과 조심할 사람", subtitle: "인간관계·귀인운",
      blocks: [
        { text: "네 인생엔 반드시 널 끌어주는 귀인이 있다. " + (gwiin.length ? "네 사주엔 ‘" + gwiin.map(function (s) { return s.key; }).join("·") + "’이 박혀 위기마다 도와주는 사람이 나타난다." : "특히 윗사람·스승의 덕을 크게 보는 팔자다.") },
        { sub: "귀인은 이런 사람 · 오는 해", text: "네 귀인은 " + OHENG_LONG[inseong(dm)] + " 기운의 사람이다. 대개 나이 많거나 배움이 깊거나 티 안 내고 챙겨준다. 인성 기운이 드는 " + (gwiY.length ? fmtY(gwiY, 4) : "가까운 몇 해") + "에 사람 덕으로 일이 풀린다." },
        { sub: "조심해야 할 사람", text: "반대로 " + OHENG_LONG[bija(dm)] + " 기운(비겁)을 앞세워 접근하는 사람은 네 돈·기운을 나눠 가지려 든다. ‘좋은 게 좋은 거’ 하며 보증·동업을 부추기는 사람, 급하게 결정을 재촉하는 사람 — 이들이 네 겁재다. 달콤할수록 한 발 물러서라." }
      ]
    });

    /* 8. 家 가족과 핏줄 */
    S.push({
      hanja: "家", title: "가족과 핏줄", subtitle: "부모·형제·자녀",
      blocks: [
        { text: "핏줄 이야기다. 네 사주에서 부모 자리(인성·재성)를 보면, " + (starCount(res, "인성") >= 1 ? "어머니·윗사람의 정과 덕이 두터워 그 그늘에서 안정을 얻는다." : "부모 덕보다 스스로 일어서는 힘이 강한 팔자라, 일찍 독립해 제 앞가림을 하는 편이다.") },
        { sub: "형제·동료 인연", text: (starCount(res, "비겁") >= 2 ? "비겁이 강해 형제·친구·동료가 많고 의리로 얽히나, 그만큼 돈·경쟁으로 부딪히기도 한다. 도움도 크고 손해도 크다." : "비겁이 약해 형제·동료보다 혼자 서는 게 편하다. 넓은 인맥보다 깊은 몇 사람이 네겐 낫다.") },
        { sub: "자녀운", text: "네 자녀 자리(" + (gender === "m" ? "관성" : "식상") + ")를 보면 " + (starCount(res, gender === "m" ? "관성" : "식상") >= 1 ? "자녀 인연이 있어, 늦게라도 자식 덕을 보고 자녀가 네 노년의 기둥이 된다." : "자녀에게 정을 쏟되 기대는 내려놓는 게 서로 편하다. 자녀와는 친구처럼 지내는 게 복이 된다.") }
      ]
    });

    /* 9. 財 니 돈의 크기 */
    var jaeCnt = starCount(res, "재성");
    var jaeAges = daeunByOheng(res, [jaeseong(dm)]);
    var jaeY = yList(dm, thisYear, to, [jaeseong(dm)], birthY);
    var leakY = yList(dm, thisYear, to, [bija(dm)], birthY);
    S.push({
      hanja: "財", title: "니 돈의 크기", subtitle: "재물운",
      blocks: [
        { text: "네 돈 그릇은 " + (jaeCnt >= 3 ? "여러 개라 크게 벌고 크게 쓰는 큰 그릇" : jaeCnt >= 1 ? "적당히 있어 한 우물을 단단히 파는 그릇" : "돈보다 명예·실력으로 크는 그릇") + "이다. " + (bs.strong ? "기운이 세니 배짱 있게 굴려 큰돈을 만진다." : "무리한 투기보다 꾸준함과 저축이 네 돈을 지킨다. 빚·보증은 특히 조심해라.") },
        { sub: "돈 버는 방식·재테크 성향", text: (starCount(res, "식상") >= 1 ? "네 재능·손재주·말솜씨로 버는 사람이라 몸값을 올려 받는 쪽이 맞다. 재테크도 네가 아는 분야에 집중해라." : "성실함과 관리로 모으는 사람이라, 한 방보다 차곡차곡·분산이 네 방식이다.") },
        { sub: "평생 재물 그릇 크기", text: (function () { var mb = moneyBowl(res, bs); return "네 재물 그릇을 수치로 보면 " + mb.score + "점 / 100 — " + mb.grade + "이다. 그릇은 크다고 절로 차는 게 아니라, 제 그릇에 맞게 굴려야 넘치지 않고 채워진다."; })() },
        { sub: "투자 성향 — 주식형이냐 부동산형이냐", text: investStyle(res) },
        { sub: "돈이 열리는 시기", text: "재성 대운이 드는 " + (jaeAges.length ? daeunAges(jaeAges) + " 무렵" : "중년 이후") + "이 돈이 크게 열리는 때다. 세운으로는 " + (jaeY.length ? fmtY(jaeY, 3) : "가까운 재성의 해") + "에 돈 이야기가 온다." },
        { sub: "돈이 새는 시기", text: "비겁이 드는 " + (leakY.length ? fmtY(leakY, 3) : "특정 해") + "엔 친구·동업·보증으로 돈이 샌다. 이 해엔 큰돈을 남과 엮지 마라." }
      ]
    });

    /* 10. 商 사업과 창업 */
    var bizGood = starCount(res, "재성") >= 1 && starCount(res, "식상") >= 1;
    var bizY = yList(dm, thisYear, to, [jaeseong(dm)], birthY);
    S.push({
      hanja: "商", title: "사업과 창업", subtitle: "창업 적성·시기",
      blocks: [
        { text: "사업 이야기다. 네 창업 기질은 " + (bs.strong && bizGood ? "강한 편이다. 기운이 세고 재능이 돈으로 이어지는 구조라, 네 판을 벌였을 때 크게 된다." : bs.strong ? "밀어붙이는 힘은 있으나 돈줄(재성)이 약해, 준비 없이 벌이면 고생한다. 실력을 쌓고 판을 벌여라." : "혼자 벌이기보다 좋은 조직·동업 구조에서 실력을 쌓는 게 낫다. 무리한 확장은 독이다.") },
        { sub: "창업하기 좋은 시기", text: "재성이 드는 " + (bizY.length ? fmtY(bizY, 3) : "재성의 해·대운") + " 무렵이 돈이 열리는 창업 타이밍이다. 이 시기를 잡아 시작하면 판이 산다. 반대로 기신의 해에 벌이면 자금이 막힌다." },
        { sub: "동업운", text: (starCount(res, "비겁") >= 2 ? "비겁이 강해 동업은 각별히 조심해라. 처음엔 의리로 뭉쳐도 돈 앞에서 갈라지기 쉽다. 지분·역할·회수 조건을 처음부터 문서로 못 박아라." : "동업 자체는 무난하나, 네가 주도권을 쥐는 구조가 맞다. 사람 좋아 끌려가면 손해 본다.") }
      ]
    });

    /* 11. 業 니 일의 길 */
    S.push({
      hanja: "業", title: "니 일의 길", subtitle: "적성·능력치",
      radar: D.abilityScores(res),
      blocks: [
        { text: "네가 힘을 쓰는 길은 " + jobMap(big.name).path + "다. 억지로 남 따라 틀지 말고 네 그릇대로 가야 크게 된다." },
        { sub: "네 능력의 생김새", text: abilityText(D.abilityScores(res)) },
        { sub: "조직 vs 사업, 어느 쪽?", text: orgVsBiz(res, bs) },
        { sub: "어울리는 일 · 피할 일", text: "잘 맞는 건 " + jobMap(big.name).list + " 쪽이다. 반대로 " + jobMap(big.name).avoid + "은 네 기운과 어긋나 애써도 안 풀리니 피해라." }
      ]
    });

    /* 12. 職 직장·취업·승진 */
    var gwanY = yList(dm, thisYear, to, [gwanseong(dm)], birthY);
    S.push({
      hanja: "職", title: "직장·취업·승진", subtitle: "조직운",
      blocks: [
        { text: "직장 이야기다. " + (bs.strong ? "너는 기운이 세서 남 밑이 답답하다. 조직에 있어도 권한을 쥐는 자리라야 오래간다." : "너는 좋은 조직·윗사람 밑에서 실력을 쌓을 때 크게 큰다. 자격·전문성으로 자리를 굳혀라.") },
        { sub: "취업·이직·승진의 때", text: "자리·명예를 뜻하는 관성이 드는 " + (gwanY.length ? fmtY(gwanY, 4) : "가까운 관성의 해") + "에 취업·승진·발탁의 기운이 온다. 이직도 이 해에 움직이면 자리가 오른다. 반대로 기신의 해엔 자리를 옮기지 마라." },
        { sub: "직장 내 인간관계", text: (starCount(res, "관성") >= 2 ? "관성이 강해 규율·상하관계에 민감하다. 윗사람과 부딪히기 쉬우니, 옳아도 한 박자 참는 게 네 승진을 지킨다." : starCount(res, "비겁") >= 2 ? "비겁이 강해 동료와 경쟁·비교가 잦다. 공을 나누는 여유가 네 편을 만든다." : "무난히 섞이는 편이다. 다만 속을 잘 안 보여 오해 살 수 있으니 표현을 조금 더 해라.") }
      ]
    });

    /* 13. 學 공부와 시험 */
    var munchang = shin.some(function (s) { return s.key === "문창귀인"; });
    var examY = yList(dm, thisYear, to, [inseong(dm)], birthY);
    S.push({
      hanja: "學", title: "공부와 시험", subtitle: "학업·시험·자격",
      blocks: [
        { text: "공부 이야기다. " + (munchang ? "네겐 문창귀인이 있어 총명하고 시험·문서·자격에 강한 기운을 타고났다. 머리로 승부하는 길이 맞다." : starCount(res, "인성") >= 1 ? "인성이 있어 배움을 오래 붙들고 파는 힘이 있다. 자격·전문 공부로 자리를 굳혀라." : "책상 공부보다 몸으로 익히고 부딪혀 배우는 쪽이 네겐 빠르다. 실전형이다.") },
        { sub: "시험·자격운이 오는 해", text: "인성(문서·시험) 기운이 드는 " + (examY.length ? fmtY(examY, 4) : "가까운 인성의 해") + "에 합격·자격·문서 운이 열린다. 큰 시험은 이 해에 맞춰라." },
        { sub: "자기계발 방향", text: "네 용신 " + y.names.join("·") + " 기운을 살리는 분야 — " + studyField(yongOheng[0]) + " 쪽으로 실력을 쌓으면 남보다 빨리 는다." }
      ]
    });

    /* 14. 移 이사와 터 */
    var yeokma = shin.some(function (s) { return s.key === "역마살"; });
    var moveY = yList(dm, thisYear, to, yongOheng, birthY);
    S.push({
      hanja: "移", title: "이사와 터", subtitle: "이사·부동산·주거",
      blocks: [
        { text: "터와 이사 이야기다. " + (yeokma ? "네겐 역마살이 있어 한곳에 오래 못 붙어 있고, 옮기고 움직일 때 오히려 운이 풀린다. 이동·해외·출장이 잦은 팔자다." : "너는 한 터에 뿌리내려 진득하게 쌓을 때 운이 붙는 편이다. 잦은 이사보다 자리 잡는 게 낫다.") },
        { sub: "이사·집 마련 좋은 시기", text: "용신 기운이 드는 " + (moveY.length ? fmtY(moveY, 3) : "용신의 해") + " 무렵이 이사·집 마련에 좋다. 방향은 네 용신 방위인 " + y.info.dir + "이 길하다." },
        { sub: "부동산·재산 증식운", text: (starCount(res, "인성") >= 1 || starCount(res, "재성") >= 1 ? "문서(인성)와 재물(재성) 기운이 있어, 부동산·문서로 재산을 불리는 데 인연이 있다. 계약은 재성·인성이 드는 해에 하면 탈이 적다." : "부동산 큰 욕심보다 실거주 위주가 안전하다. 무리한 대출·투기는 기신의 해에 특히 조심해라.") }
      ]
    });

    /* 15. 體 니 몸의 약점 */
    var org = organLine(res);
    var healthY = yList(dm, thisYear, to, giOheng, birthY);
    S.push({
      hanja: "體", title: "니 몸의 약점", subtitle: "건강운",
      blocks: [
        { text: "네 몸에서 먼저 탈 나는 자리는 " + org.part + "다. " + org.why },
        { sub: "계절·나이로 조심할 때", text: org.season + " 몸이 처지기 쉽다. 또 " + OHENG_LONG[giOheng[0]] + " 기운이 센 " + (healthY.length ? fmtY(healthY, 3) : "특정 해") + " 무렵엔 몸이 신호를 보내니, 그 해엔 검진 한 번 받고 쉬어가라." },
        { sub: "생활습관·개운 건강법", text: "네 용신 " + y.names.join("·") + " 기운을 몸에도 써라. " + org.care }
      ]
    });

    /* 16. 運 인생의 흐름과 황금기 */
    var goldAges = daeunByOheng(res, yongOheng);
    var badAges = daeunByOheng(res, giOheng);
    S.push({
      hanja: "運", title: "인생의 흐름과 황금기", subtitle: "평생운·대운",
      blocks: [
        { text: "네 인생의 큰 흐름, 대운을 짚어주마. 대운은 10년씩 갈아입는 옷이라, 같은 사주도 옷 따라 확 다르게 산다. 네 대운은 " + (res.daeun ? (res.daeun.forward ? "순행" : "역행") + "하고 " + res.daeun.num + "세부터 시작된다." : "아래와 같다.") },
        { sub: "네 대운 흐름 한눈에", daeun: true },
        { sub: "상승기 · 인생의 황금기", text: "용신(" + y.names.join("·") + ") 기운이 대운으로 드는 때가 절정이다. " + (goldAges.length ? daeunAges(goldAges) + " — 이 무렵" : "중년 이후 용신운이 들 때") + "이 네 인생의 황금기다. 이때 크게 펼치고 큰 결정을 내려라. 준비하느냐 마느냐가 인생을 가른다." },
        { sub: "하락기 · 몸 낮출 때", text: "기신 기운이 센 " + (badAges.length ? daeunAges(badAges) + " 무렵" : "특정 대운") + "엔 확장보다 관리다. 새로 벌이기보다 있는 걸 지키고 사람을 다지며 다음 상승기를 준비해라." }
      ]
    });

    /* 17. 歲 올해와 앞날 (세운) */
    var thisG = D.yearReading(dm, thisYear);
    var grp = starGroup(thisG.sipStem);
    var isGood = yongOheng.indexOf(GAN_OHENG[thisG.stem]) >= 0;
    S.push({
      hanja: "歲", title: "올해와 앞날의 운", subtitle: "세운(1년)",
      blocks: [
        { text: "올해 " + thisYear + "년은 " + thisG.ganKo + "(" + thisG.ganHan + ") 해다. 네 일간엔 " + thisG.sipStem + "의 기운이라, " + yearThemeLine(grp) + " 십이운성으로는 ‘" + thisG.stage + "’ 자리다." },
        { sub: "올해 핵심 키워드", text: "올해 너의 키워드는 ‘" + yearKeyword(grp) + "’이다. " + (isGood ? "용신 기운과 맞아 전반적으로 힘이 실리는 해다. 벌여도 좋다." : "기운이 눌리는 해라 크게 벌이기보다 다지고 준비하는 해로 삼아라.") },
        { sub: "좋은 달 · 주의할 달", text: "올해는 " + OHENG_MONTH[yongOheng[0]] + "에 기운이 살아나 일이 풀린다. 반대로 " + OHENG_MONTH[giOheng[0]] + "엔 몸도 일도 무거우니 큰일을 이때로 잡지 마라." },
        { sub: "연도별 운세 — 올해부터 6년 세운", text: "해마다 나에게 오는 기운(십성)과 강약(십이운성), 그 해의 사건 코드(십이신살)를 짚었다. 십성만 알면 표가 읽힌다 — 재성=돈, 관성=명예·자리, 인성=문서·귀인·공부, 식상=표현·재능, 비겁=경쟁·동료. 아래 표를 보고 큰 결정을 좋은 해에 맞춰라.", saeun: true }
      ]
    });

    /* 17-b. 月 올해 달별 운세 (월운) */
    S.push({
      hanja: "月", title: "올해 달별 운세", subtitle: "월운(月運) · " + thisYear + "년",
      blocks: [
        { text: thisYear + "년 열두 달, 매달 너에게 어떤 기운이 오는지 달마다 짚어주마. 달마다 뜨는 십성(그 달 기운의 성격)·십이운성(기운의 강약)·십이신살(그 달의 사건 코드, 장성살·역마살 같은 것)을 함께 봤다." },
        { sub: "십성 한 줄 사전", text: "재성=돈·현실, 관성=명예·자리·책임, 인성=문서·귀인·공부, 식상=표현·재능·먹을복, 비겁=경쟁·동료·독립. 이 다섯만 기억하면 아래 달별 풀이가 술술 읽힌다." },
        { sub: "달별 운세 한눈에", text: "※ 양력 대략 기준(절기로 나뉘어 실제 시작일은 매달 4~8일경).", monthly: true }
      ]
    });

    /* 18. 命 운명의 갈림길 (맞춤) */
    S.push({
      hanja: "命", title: "운명의 갈림길", subtitle: "개운법·맞춤 상담",
      blocks: [
        { text: "네 사주의 갈림길은 하나다. 네 넘치는 " + OHENG_LONG[bs.strong ? el(dm) : giOheng[0]] + " 기운을 어떻게 다스리느냐. 잘 쓰면 무기가 되고, 못 다스리면 널 무너뜨린다." },
        { sub: "너를 살리는 개운법", text: "네 용신은 " + y.names.join("·") + ". ▪ 방향 " + y.info.dir + " ▪ 색 " + y.info.color + " ▪ 숫자 " + y.info.num + ". 큰 결정·이사·개업은 이 방향, 옷·소품엔 이 색, 중요한 날엔 이 숫자를 가까이해라. 부족한 " + OHENG_LONG[yongOheng[0]] + " 기운을 생활에 채우는 게 최고의 개운이다." },
        { sub: "지금 네 고민에 한마디", text: loveAdvice(love, bs.strong, gender) },
        { text: "명심해라. 사주는 정해진 운명이 아니라 타고난 판이다. 그 판을 알고 쓰면 도깨비도 못 말리는 사람이 된다. 사람은 자기가 제일 무서워하는 쪽에 제일 원하는 게 숨어 있다. 네 " + OHENG_LONG[giOheng[0]] + " 기운, 그 안에 네 복이 있다. 이만 물러가마." }
      ]
    });

    // 이름이 있으면 섹션 제목 개인화 ("○○○님의 연애와 결혼")
    if (ctx.name) {
      var NP = ctx.name + "님";
      var map = {
        "魂": NP + "은 이런 사람", "冤": NP + "에게 붙은 액운", "欲": NP + "의 기회와 허상",
        "情": NP + "의 연애와 결혼", "劫": NP + "이 놓친 인연", "合": NP + "의 궁합",
        "緣": NP + "의 귀인과 조심할 사람", "家": NP + "의 가족운", "財": NP + "의 재물운",
        "商": NP + "의 사업운", "業": NP + "의 직업과 적성", "職": NP + "의 직장운",
        "學": NP + "의 학업운", "移": NP + "의 이사·부동산운", "體": NP + "의 건강운",
        "運": NP + "의 인생 흐름과 황금기", "歲": NP + "의 올해 운세", "月": NP + "의 달별 운세", "命": NP + "의 운명 갈림길"
      };
      S.forEach(function (s) { if (map[s.hanja]) s.title = map[s.hanja]; });
    }

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
      비겁: "자립심·경쟁심이 강해 제 힘으로 밀고 나간다.",
      식상: "재능·표현이 강해 하고 싶은 걸 펼쳐야 산다.",
      재성: "현실 감각·활동이 강해 실속을 챙기고 판을 벌인다.",
      관성: "책임감·명예욕이 강해 자리와 인정 속에서 자기를 세운다.",
      인성: "생각이 깊어 안으로 채우고 정리한 뒤 움직인다."
    };
    return { name: max, desc: desc[max] };
  }
  function stressLine(group, strong) {
    var m = {
      비겁: "스트레스는 부딪히며 풀고, 운동·경쟁으로 태운다. 대신 욱하는 걸 조심해라.",
      식상: "말·표현·창작으로 풀어야 산다. 담아두면 병이 되니 꺼내라.",
      재성: "몸을 움직이고 일·활동으로 잊는 편이다. 대신 일중독을 조심해라.",
      관성: "책임감에 혼자 삭이다 곪는다. 완벽 안 해도 된다고 스스로에게 말해줘라.",
      인성: "혼자 생각하며 정리해야 풀린다. 다만 곱씹다 우울해지지 않게 사람을 만나라."
    };
    return "감정은 " + (strong ? "겉으로 세게 나오고" : "안으로 삭이고") + ", " + m[group];
  }
  function napeumLine(ko) {
    var m = { "천하수": "하늘의 은하수 같은 물이라 그릇이 크고 사람을 시원하게 품는다.", "대해수": "큰 바다 같은 물이라 포용력이 넓다.", "간하수": "골짜기 시냇물이라 맑고 영리하다.", "노중화": "화롯불 같은 불이라 은근하고 오래간다.", "벽력화": "벼락 같은 불이라 폭발적이고 강렬하다.", "백랍금": "제련 전 여린 쇠라 다듬을수록 빛난다.", "대림목": "큰 숲의 나무라 듬직하고 그늘이 있다." };
    return m[ko] || "그 기운이 네 삶의 밑바탕에 흐른다.";
  }
  function branchMateLine(b) {
    var s = ["차분하고 속 깊은", "성실하고 참을성 있는", "활동적이고 진취적인", "예민하고 섬세한", "듬직하고 포용력 있는", "밝고 정 많은", "화끈하고 솔직한", "온화하고 헌신적인", "결단력 있고 의리 있는", "예리하고 깔끔한", "믿음직하고 신중한", "총명하고 감성적인"];
    return "곁에 두면 " + s[b] + " 사람과 짝이 될 자리다.";
  }
  function mateTypeLine(o) { return ["곧고 진취적이며 주관이 뚜렷한 사람", "밝고 열정적이며 표현이 시원한 사람", "듬직하고 안정감 있는 믿음직한 사람", "결단력 있고 원칙이 분명한 사람", "지혜롭고 유연하며 속 깊은 사람"][o] + "일 때 잘 맞는다."; }
  function loveStyle(dm, strong) {
    return (strong ? "한번 마음먹으면 직진하는 스타일이다. 재고 따지기보다 내 사람이다 싶으면 밀어붙인다." : "쉽게 마음을 안 열지만 한번 열면 깊게 가는 스타일이다. 상처받기 싫어 재다 타이밍을 놓치기도 한다.");
  }
  function hapTti(b) { var yuk = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]; var ttiKo = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"]; return ttiKo[yuk[b]]; }
  function chungTti(b) { var ttiKo = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"]; return ttiKo[(b + 6) % 12]; }
  function abilityText(scores) {
    var top = scores.slice().sort(function (a, b) { return b.v - a.v; })[0];
    var low = scores.slice().sort(function (a, b) { return a.v - b.v; })[0];
    return "가장 센 건 ‘" + top.label + "’(" + top.v + "), 가장 약한 건 ‘" + low.label + "’(" + low.v + ")이다. " + top.label + "이(가) 네 무기니 앞세우고, " + low.label + "은(는) 그게 강한 사람을 곁에 둬 메워라.";
  }
  function jobMap(group) {
    return {
      비겁: { path: "네 힘으로 승부하는 독립·전문의 길", list: "전문직(의사·변호사·회계), 운동·기술직, 1인 사업, 프리랜서", avoid: "위계 강한 대규모 조직의 말단" },
      식상: { path: "재능·표현으로 먹고사는 창작의 길", list: "창작·디자인·방송·콘텐츠, 교육·강의, 요식·손기술, 기획", avoid: "틀에 갇힌 단순 반복·규율직" },
      재성: { path: "돈과 현실을 굴리는 사업의 길", list: "사업·자영업, 영업·세일즈, 금융·투자, 무역·유통", avoid: "돈과 무관한 순수 연구·행정직" },
      관성: { path: "조직·명예로 인정받는 관(官)의 길", list: "공직·행정, 대기업·관리직, 군·경·법, 조직 리더", avoid: "규율 없는 자유업·불안정한 1인 사업" },
      인성: { path: "배움·자격으로 크는 학(學)의 길", list: "연구·학계, 교육·교사, 전문 자격사, 상담·의료·종교", avoid: "빠른 회전의 영업·투기성 사업" }
    }[group];
  }
  function studyField(o) { return ["기획·창작·언어·환경 분야", "예술·방송·미용·요식 분야", "부동산·행정·중개·교육 분야", "법·금융·기계·의료 분야", "IT·연구·유통·심리 분야"][o]; }
  function yearThemeLine(g) {
    return { 비겁: "내 힘과 경쟁·동료가 두드러지는 해다.", 식상: "재능·표현·활동이 살아나는 해다.", 재성: "돈·현실·활동 반경이 넓어지는 해다.", 관성: "책임·자리·명예가 커지는 해다.", 인성: "배움·문서·귀인의 도움이 있는 해다." }[g];
  }
  function yearKeyword(g) { return { 비겁: "자립과 경쟁", 식상: "표현과 도전", 재성: "재물과 확장", 관성: "책임과 승진", 인성: "배움과 안정" }[g]; }
  function nextYearsLine(dm, ty, yong) {
    var a = D.yearReading(dm, ty + 1), b = D.yearReading(dm, ty + 2);
    var ga = yong.indexOf(GAN_OHENG[a.stem]) >= 0, gb = yong.indexOf(GAN_OHENG[b.stem]) >= 0;
    return a.ganKo + "·" + b.ganKo + " 해다. " + (ga || gb ? "용신 기운이 들어 흐름이 살아나니 이때를 노려 벌여라." : "다지고 준비하는 흐름이니 서두르지 말고 힘을 아껴라.");
  }
  function loveAdvice(love, strong, gender) {
    if (love === "solo") return "지금 솔로라면 — 조급함이 인연을 밀어낸다. 앞서 짚은 인연의 해에 낮에 만나는 사람을 눈여겨봐라. " + (strong ? "네 기준을 조금만 낮추면 좋은 인연이 이미 곁에 있다." : "먼저 다가갈 용기 한 번이 판을 바꾼다.");
    if (love === "dating") return "지금 연애 중이라면 — 상대에게 " + (strong ? "결정권을 나눠주는 게" : "네 마음을 분명히 표현하는 게") + " 오래가는 비결이다. 결혼운이 강해지는 해가 앞에 있으니 조급해 말고 흐름을 타라.";
    if (love === "married") return "지금 가정을 이뤘다면 — 가정운은 네 " + OHENG_LONG[strong ? 2 : 4].split("(")[0] + " 기운을 지킬 때 안정된다. 밖의 성취만큼 안을 다지는 해로 삼아라.";
    if (love === "divorced") return "다시 시작하는 자리라면 — 지난 인연의 패턴(앞의 ‘놓친 인연’)을 알고 끊는 게 먼저다. 재출발은 서두르지 말고 인연의 해를 기다려라. 지난 상처가 다음 복의 밑거름이 된다.";
    return "지금 네 고민이 무엇이든, 답은 네 사주 안에 이미 있다. 무서워하는 쪽에 원하는 게 숨어 있다.";
  }
  function organLine(res) {
    var o = res.oheng, min = 0, max = 0;
    for (var i = 1; i < 5; i++) { if (o[i] < o[min]) min = i; if (o[i] > o[max]) max = i; }
    var organ = [
      { part: "간·담(피로·눈·근육)", why: "목 기운이 치우쳐 스트레스·피로·눈·근육에 먼저 신호가 온다.", season: "봄(2~4월)", care: "아침 햇빛을 쐬고 신 음식·초록 채소로 간을 풀어줘라." },
      { part: "심장·혈압(가슴·수면)", why: "화 기운이 치우쳐 흥분·불면·심혈관에 신호가 온다.", season: "여름(5~7월)", care: "밤엔 생각을 끄고 쓴 음식·붉은 채소로 심장을 쉬게 해라." },
      { part: "위장·소화(비위)", why: "토 기운이 치우쳐 소화기와 생각 많은 데서 탈이 난다.", season: "환절기", care: "끼니를 규칙적으로, 찬 것보다 따뜻한 음식으로 비위를 지켜라." },
      { part: "폐·대장·피부(호흡기)", why: "금 기운이 치우쳐 호흡기·피부·대장이 약하다.", season: "가을(8~10월)", care: "물과 매운 음식을 적당히, 호흡·유산소로 폐를 틔워라." },
      { part: "신장·방광(허리·비뇨)", why: "수 기운이 치우쳐 신장·허리·비뇨기가 약하다.", season: "겨울(11~1월)", care: "허리·발을 따뜻이, 짠 것 줄이고 검은 음식·물로 신장을 지켜라." }
    ];
    return organ[(o[min] === 0) ? min : max];
  }

  root.DetailContent = { build: build };
})(typeof window !== "undefined" ? window : this);
