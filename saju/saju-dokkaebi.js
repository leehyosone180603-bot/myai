/* ============================================================
 * 도깨비 사주 — 무료 버전 콘텐츠 (직설·토속 말투)
 * calcbox.kr  ·  캐릭터: 천 년 묵은 도깨비
 * 사주 계산은 saju.js(Saju) 엔진, 음력은 saju-lunar.js(SajuLunar).
 * ============================================================ */
(function (root) {
  "use strict";

  // 결제/공유 설정 (실서비스 시 값 교체)
  var CONFIG = {
    PAYMENT_URL: "",          // 상세 결제 페이지 URL (비어있으면 '준비중')
    KAKAO_JS_KEY: "",         // 카카오 JavaScript 키 (비어있으면 링크복사 대체)
    PRICE_ORIGINAL: "29,900",
    PRICE_NOW: "9,900"
  };

  var POPUP = {
    title: "잠깐, 들어오기 전에",
    body: "이 사주풀이는 정통 명리학에 <b>도깨비의 토속적 해석</b>을 더한 것이라, 정통 사주학과는 약간의 차이가 있다.<br><br>" +
      "특히 <b>운의 흐름(일운)</b>을 보는 부분은 토속적인 관점이 가미되었음을 미리 일러둔다.<br><br>" +
      "정통 명리학 그대로의 풀이를 원하는 이는 다른 곳을 찾는 게 나을 게다.",
    button: "알겠다, 봐다오"
  };

  var PERSONA = {
    title: "도깨비 사주",
    subtitle: "천 년 묵은 도깨비가 네 팔자를 봐주마",
    greeting: "어디 보자… 네 여덟 글자가 이렇구나.",
    hookLead: "근데 이놈아, 네 안에 걸리는 게 하나 있다."
  };

  // 일간(日干) 10종 — 직설 자기소개(나는 ~다) + 도깨비의 한마디(그림자)
  var DAYMASTER = [
    { // 甲
      portrait: "나는 한번 마음먹으면 뒤도 안 돌아보는 사람이다. 곧게 뻗은 큰 나무처럼 남이 뭐라 해도 내 길을 간다. 사람들은 나를 믿고 기대지만, 정작 나는 굽힐 줄을 몰라 혼자 무거울 때가 많다.",
      shadow: "그 곧은 성질이 언젠가 널 부러뜨릴 뻔한 때가 온다. 꺾이기 전에 휘는 법을 네 팔자 어디에 숨겨놨는지…"
    },
    { // 乙
      portrait: "나는 부드러워 보여도 좀처럼 꺾이지 않는 사람이다. 바람 불면 눕고 비 오면 젖어도, 끝내 내가 원하는 곳까지 감아 올라간다. 겉은 순한데 속은 질기고 살아남는 힘이 있다.",
      shadow: "남한테 맞추다 네가 진짜 원하는 걸 잃어버리는 때가 있다. 네가 언제 널 놓치는지, 그 길목을…"
    },
    { // 丙
      portrait: "나는 밝고 뜨거운 사람이다. 감정이 얼굴에 다 드러나고, 좋고 싫음이 분명해 시원시원하다. 주변을 환하게 밝히지만, 그만큼 확 타올랐다 확 식는다.",
      shadow: "그 불이 엉뚱한 데서 널 태워먹는 해가 있다. 네 열이 언제 독이 되는지, 그걸…"
    },
    { // 丁
      portrait: "나는 겉은 조용해도 속은 뜨거운 사람이다. 한번 빠지면 끝까지 파고들고, 사람한테 주는 정이 깊다. 남을 밝히느라 정작 나를 태워먹을 때가 많다.",
      shadow: "네가 남 챙기다 스스로 꺼져버리는 시기가 온다. 그 불씨를 다시 살리는 법을…"
    },
    { // 戊
      portrait: "나는 웬만해선 흔들리지 않는 사람이다. 큰 산처럼 듬직해서 사람들이 나한테 기대온다. 속마음은 잘 안 꺼내고, 변화는 천천히 받아들인다.",
      shadow: "그 진득함이 기회를 놓치게 만드는 순간이 있다. 네가 먼저 움직여야 할 그 한 번의 때를…"
    },
    { // 己
      portrait: "나는 부드럽고 세심하게 뭐든 품어 기르는 사람이다. 현실 감각이 좋고 참을성이 많아, 묵묵히 내 자리를 지켜 결실을 만든다. 대신 걱정도 많고 남 눈치도 본다.",
      shadow: "쓸데없는 걱정이 네 복을 갉아먹는 해가 있다. 그 걱정을 내려놓아야 할 시기를…"
    },
    { // 庚
      portrait: "나는 결단이 빠르고 의리가 두터운 사람이다. 아니다 싶으면 바로 끊고, 한번 정하면 강하게 밀어붙인다. 불의는 못 참지만, 그만큼 말이 직설적이라 사람을 찌를 때가 있다.",
      shadow: "그 날카로움이 네 사람을 베어내는 때가 온다. 언제 칼을 거둬야 하는지, 그걸…"
    },
    { // 辛
      portrait: "나는 예리하고 깔끔한 걸 좋아하는 사람이다. 감각이 뛰어나고 완성도를 따져서, 내 기준이 분명하다. 자존심이 세고 디테일에 강하지만, 나와 남을 너무 날카롭게 잰다.",
      shadow: "그 완벽주의가 네 속을 갉아먹는 시기가 있다. 흠도 품어야 할 그 순간을…"
    },
    { // 壬
      portrait: "나는 생각이 넓고 유연한 사람이다. 물처럼 흐르며 상황에 잘 맞추고, 사람을 크게 품는다. 대신 속을 잘 안 보이고, 얽매이는 걸 못 견딘다.",
      shadow: "그 자유로움이 하나도 못 끝내게 만드는 때가 있다. 네가 매듭지어야 할 그 일을…"
    },
    { // 癸
      portrait: "나는 총명하고 감수성이 깊은 사람이다. 조용히 스며들어 어디든 적응하고, 상상력이 풍부하다. 대신 마음이 자주 흔들리고 작은 일에도 예민하다.",
      shadow: "그 여린 마음이 네 발목을 잡는 해가 있다. 흔들리는 널 붙잡아 줄 뿌리를…"
    }
  ];

  // 미리보기(흐림) 문단
  var PREVIEW_BLUR =
    "네 놈의 정체는 태어난 계절에 이미 정해졌다. 그것이 네 재물과 인연을 언제 열고 언제 닫는지… " +
    "특히 네가 스물, 서른, 마흔에 겪게 될 그 일은…";

  // 돈 내면 도깨비가 풀어줄 것들 (10)
  var PAID = [
    { title: "내 성공을 가로막고 있는 액운의 정체", sub: "잘 되다가 꼭 한 번씩 무너지는 이유가 있다. 그 반복의 근본 원인을 짚어준다." },
    { title: "나한테 붙은 놈을 다스려 내 삶에 활용하는 방법", sub: "떼어내는 게 답이 아니다. 이 기운을 제대로 쓰면 오히려 무기가 된다." },
    { title: "내가 인생에서 벌게 될 돈의 크기", sub: "네 사주가 가진 돈 그릇의 크기, 억대인지 천만 원대인지 — 그릇에 따라 버는 전략이 달라진다." },
    { title: "내 사업을 시작하면 좋을 시기", sub: "같은 아이템도 시기를 잘못 잡으면 망한다. 네 사주에서 돈이 열리는 타이밍." },
    { title: "내 삶의 진짜 인연이 나타나는 시기", sub: "지금 옆에 있는 사람이 진짜 인연인지, 아직 안 온 건지. 사주가 가리키는 그 시기." },
    { title: "눈앞의 기회가 진짜인지, 허상인지 구분하는 방법", sub: "반짝이는데 잡으면 빈손인 기회가 있다. 네 사주에 맞는 진짜를 골라내는 기준." },
    { title: "내 욕심으로 놓친 인연, 두 번 다시 놓치지 않는 방법", sub: "연애든 사람이든, 네가 반복하는 실수 패턴이 있다. 그걸 끊는 법." },
    { title: "새로운 인연, 귀인이 나타나는 핵심 시기 3번", sub: "네 인생에서 운명이 바뀌는 타이밍이 딱 3번 있다. 놓치면 다음은 한참 뒤다." },
    { title: "내 건강이 위험해지는 시기와 대응법", sub: "이유 없이 몸이 안 좋아지는 해가 정해져 있다. 미리 알면 피할 수 있다." },
    { title: "내 인생의 황금기 — 삶이 빛을 보는 시기", sub: "고생이 끝나는 때가 온다. 이때를 준비하느냐 마느냐가 인생을 가른다." }
  ];

  // 도깨비 얼굴 SVG (인라인)
  var AVATAR_SVG =
    '<svg viewBox="0 0 120 120" width="112" height="112" role="img" aria-label="도깨비">' +
    '<defs><radialGradient id="dkf" cx="50%" cy="40%" r="65%">' +
    '<stop offset="0%" stop-color="#3fb08f"/><stop offset="100%" stop-color="#1f6f5c"/></radialGradient></defs>' +
    '<circle cx="60" cy="62" r="52" fill="#0d0d10"/>' +
    // horns
    '<path d="M30 26 Q22 6 40 12 Q34 20 40 30 Z" fill="#e8c07a"/>' +
    '<path d="M90 26 Q98 6 80 12 Q86 20 80 30 Z" fill="#e8c07a"/>' +
    // face
    '<circle cx="60" cy="64" r="40" fill="url(#dkf)"/>' +
    // brows
    '<path d="M34 52 L52 58" stroke="#0d0d10" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M86 52 L68 58" stroke="#0d0d10" stroke-width="5" stroke-linecap="round"/>' +
    // eyes
    '<circle cx="46" cy="64" r="8" fill="#fff"/><circle cx="46" cy="65" r="4" fill="#0d0d10"/>' +
    '<circle cx="74" cy="64" r="8" fill="#fff"/><circle cx="74" cy="65" r="4" fill="#0d0d10"/>' +
    // nose
    '<ellipse cx="60" cy="76" rx="6" ry="5" fill="#c0392b"/>' +
    // grin + fangs
    '<path d="M42 84 Q60 98 78 84" fill="none" stroke="#0d0d10" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M50 86 L54 94 L58 86 Z" fill="#fff"/><path d="M62 86 L66 94 L70 86 Z" fill="#fff"/>' +
    '</svg>';

  // 결과 조립
  function buildReading(res) {
    var dm = DAYMASTER[res.dayMaster];
    return {
      palja: paljaText(res),
      portrait: dm.portrait,
      hook: dm.shadow,
      preview: PREVIEW_BLUR
    };
  }

  function paljaText(res) {
    var S = root.Saju, order = ["year", "month", "day", "hour"], lab = ["년", "월", "일", "시"], out = [];
    order.forEach(function (k, i) {
      var p = res.pillars[k];
      out.push(lab[i] + " " + (p ? S.GAN[p.stem] + S.JI[p.branch] : "??"));
    });
    return out.join("  ·  ");
  }

  root.SajuDokkaebi = {
    CONFIG: CONFIG, POPUP: POPUP, PERSONA: PERSONA,
    DAYMASTER: DAYMASTER, PAID: PAID, AVATAR_SVG: AVATAR_SVG,
    buildReading: buildReading
  };
})(typeof window !== "undefined" ? window : this);
