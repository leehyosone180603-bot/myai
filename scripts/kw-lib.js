"use strict";
/* 카테고리별 포스트 생성 헬퍼. kw-data.js 에서 사용합니다. */

function P() {
  return Array.prototype.slice.call(arguments).map(function (t) { return "      <p>" + t + "</p>"; }).join("\n") + "\n";
}
function UL(items) {
  return "      <ul>\n" + items.map(function (i) { return "        <li>" + i + "</li>"; }).join("\n") + "\n      </ul>\n";
}
function OL(items) {
  return "      <ol>\n" + items.map(function (i) { return "        <li>" + i + "</li>"; }).join("\n") + "\n      </ol>\n";
}
// {t, d} 목록 → 굵은 제목 + 설명
function TD(items) {
  return "      <ul>\n" + items.map(function (i) {
    return "        <li><strong>" + i.t + "</strong> — " + i.d + "</li>";
  }).join("\n") + "\n      </ul>\n";
}
// {t, d} 단계 → 번호 목록
function STEPS(items) {
  return "      <ol>\n" + items.map(function (i) {
    return "        <li><strong>" + i.t + "</strong> — " + i.d + "</li>";
  }).join("\n") + "\n      </ol>\n";
}
function CALLOUT(html) {
  return '      <div class="callout">' + html + "</div>\n";
}
function TABLE(headers, rows) {
  var head = "        <thead>\n          <tr>" + headers.map(function (h, i) {
    return i === 0 ? "<th>" + h + "</th>" : "<td>" + h + "</td>";
  }).join("") + "</tr>\n        </thead>\n";
  var body = "        <tbody>\n" + rows.map(function (r) {
    return "          <tr>" + r.map(function (c, i) {
      return i === 0 ? "<th>" + c + "</th>" : "<td>" + c + "</td>";
    }).join("") + "</tr>";
  }).join("\n") + "\n        </tbody>\n";
  return '      <table class="calc-table">\n' + head + body + "      </table>\n";
}

// ---- 카테고리 팩토리 ----

function benefit(o) {
  var sec = [
    { id: "what", h2: o.subject + " 개요 — 어떤 것인가요?", html: P.apply(null, [].concat(o.what)) },
    { id: "effects", h2: o.subject + " 주요 효능·효과", html: (o.effectsIntro ? P(o.effectsIntro) : "") + TD(o.benefits) },
    { id: "how", h2: "섭취·사용 방법과 권장량", html: P.apply(null, [].concat(o.intake)) + (o.intakeCallout ? CALLOUT(o.intakeCallout) : "") },
    { id: "caution", h2: "주의사항·부작용", html: P.apply(null, [].concat(o.caution)) }
  ];
  if (o.pick) sec.push({ id: "pick", h2: "고르는 요령", html: P.apply(null, [].concat(o.pick)) });
  return base(o, "benefit", sec);
}

function trait(o) {
  var sec = [
    { id: "about", h2: o.subject + " 개요", html: P.apply(null, [].concat(o.what)) },
    { id: "traits", h2: o.subject + " 대표 특징", html: (o.traitsIntro ? P(o.traitsIntro) : "") + TD(o.traits) },
    { id: "sw", h2: "강점과 약점", html: "      <h3>강점</h3>\n" + UL(o.strength) + "      <h3>약점·주의할 점</h3>\n" + UL(o.weakness) },
    { id: "tip", h2: (o.tipTitle || "관계·활용 팁"), html: P.apply(null, [].concat(o.tip)) }
  ];
  return base(o, "trait", sec);
}

function ranking(o) {
  var sec = [
    { id: "about", h2: o.subject + " 순위란?", html: P.apply(null, [].concat(o.what)) },
    { id: "criteria", h2: "순위는 어떻게 매겨지나요?", html: P.apply(null, [].concat(o.criteria)) },
    { id: "check", h2: "최신 순위 확인하는 법", html: P.apply(null, [].concat(o.howcheck)) + (o.sources ? UL(o.sources) : "") + CALLOUT("⚠️ 순위는 경기·집계에 따라 <strong>실시간으로 바뀝니다.</strong> 정확한 최신 순위는 위 공식·포털 출처에서 확인하세요.") }
  ];
  if (o.context) sec.push({ id: "context", h2: "알아두면 좋은 포인트", html: P.apply(null, [].concat(o.context)) });
  return base(o, "ranking", sec);
}

function schedule(o) {
  var sec = [
    { id: "about", h2: o.subject + " 일정, 무엇을 확인하나요?", html: P.apply(null, [].concat(o.what)) },
    { id: "check", h2: "최신 일정 확인하는 법", html: P.apply(null, [].concat(o.howcheck)) + (o.sources ? UL(o.sources) : "") + CALLOUT("⚠️ 경기·공연 일정은 <strong>변경될 수 있습니다.</strong> 예매·관람 전 공식 채널에서 최종 일정을 한 번 더 확인하세요.") }
  ];
  if (o.watch) sec.push({ id: "watch", h2: "중계·관람·예매 정보", html: P.apply(null, [].concat(o.watch)) });
  if (o.context) sec.push({ id: "context", h2: "알아두면 좋은 포인트", html: P.apply(null, [].concat(o.context)) });
  return base(o, "schedule", sec);
}

function procedure(o) {
  var sec = [
    { id: "about", h2: o.subject + " 개요", html: P.apply(null, [].concat(o.overview)) },
    { id: "steps", h2: o.subject + " 진행 절차 (단계별)", html: STEPS(o.steps) },
    { id: "docs", h2: "필요 서류·비용·기간", html: (o.docs ? UL(o.docs) : "") + P.apply(null, [].concat(o.costtime)) },
    { id: "caution", h2: "주의사항", html: P.apply(null, [].concat(o.caution)) }
  ];
  return base(o, "procedure", sec);
}

function order(o) {
  var listHtml = o.rows ? TABLE(o.headers || ["순서", "항목", "설명"], o.rows) : STEPS(o.items);
  var sec = [
    { id: "about", h2: o.subject + " 순서 한눈에", html: P.apply(null, [].concat(o.intro)) },
    { id: "list", h2: o.subject + " 순서 정리", html: (o.listIntro ? P(o.listIntro) : "") + listHtml }
  ];
  if (o.mnemonic) sec.push({ id: "tip", h2: "쉽게 외우는 법", html: P.apply(null, [].concat(o.mnemonic)) });
  if (o.note) sec.push({ id: "note", h2: "참고사항", html: P.apply(null, [].concat(o.note)) });
  return base(o, "order", sec);
}

function recipe(o) {
  var sec = [
    { id: "about", h2: o.dish + ", 이렇게 하면 실패 없어요", html: P.apply(null, [].concat(o.intro)) },
    { id: "ingredients", h2: "재료 준비", html: (o.ingredientsIntro ? P(o.ingredientsIntro) : "") + UL(o.ingredients) },
    { id: "steps", h2: "만드는 법 (단계별)", html: STEPS(o.steps) },
    { id: "tips", h2: "맛있게 만드는 핵심 팁", html: UL(o.tips) + (o.mistake ? CALLOUT("💡 <strong>이것만은 주의!</strong> " + o.mistake) : "") }
  ];
  return base(o, "recipe", sec);
}

function compare(o) {
  var sec = [
    { id: "about", h2: o.subject + ", 왜 비교가 중요할까?", html: P.apply(null, [].concat(o.intro)) },
    { id: "factors", h2: "비교할 때 꼭 봐야 할 항목", html: TD(o.factors) }
  ];
  if (o.rows) sec.push({ id: "table", h2: "한눈에 비교", html: TABLE(o.headers, o.rows) });
  sec.push({ id: "how", h2: "최신 정보 비교하는 법", html: P.apply(null, [].concat(o.sites)) + CALLOUT("⚠️ 금리·가격·보험료는 <strong>수시로 바뀌고 개인 조건에 따라 달라집니다.</strong> 실제 가입·구매 전 공식 사이트에서 최종 조건을 확인하세요.") });
  sec.push({ id: "pick", h2: "선택 요령", html: P.apply(null, [].concat(o.pick)) });
  return base(o, "compare", sec);
}

function proscons(o) {
  var sec = [
    { id: "about", h2: o.subject + " 개요", html: P.apply(null, [].concat(o.intro)) },
    { id: "pros", h2: "장점", html: TD(o.pros) },
    { id: "cons", h2: "단점", html: TD(o.cons) },
    { id: "who", h2: "추천 대상과 결론", html: P.apply(null, [].concat(o.who)) }
  ];
  return base(o, "proscons", sec);
}

function howto(o) {
  var sec = [
    { id: "about", h2: o.subject + " — 핵심부터 정리", html: P.apply(null, [].concat(o.intro)) },
    { id: "steps", h2: (o.stepsTitle || (o.subject + " 방법 (단계별)")), html: STEPS(o.steps) },
    { id: "tips", h2: "알아두면 좋은 팁", html: UL(o.tips) + (o.caution ? CALLOUT("⚠️ " + o.caution) : "") }
  ];
  if (o.extra) o.extra.forEach(function (s, i) { sec.push({ id: s.id || ("x" + i), h2: s.h2, html: s.html }); });
  return base(o, "howto", sec);
}

function generic(o) {
  var sec = o.sections.map(function (s, i) {
    return { id: s.id || ("s" + (i + 1)), h2: s.h2, html: s.html };
  });
  return base(o, "generic", sec);
}

// 공통 마무리: 필수 필드 검증 + 반환
function base(o, category, sections) {
  if (!o.slug || !o.kw || !o.title || !o.desc || !o.lead || !o.faq) {
    throw new Error("필수 필드 누락: " + (o.slug || o.kw || "?"));
  }
  return {
    slug: o.slug,
    kw: o.kw,
    category: category,
    title: o.title,
    h1: o.h1 || o.title,
    desc: o.desc,
    excerpt: o.excerpt || o.desc.slice(0, 55),
    tags: o.tags || [o.kw],
    lead: o.lead,
    sections: sections,
    faq: o.faq,
    related: o.related
  };
}

module.exports = { P: P, UL: UL, OL: OL, TD: TD, STEPS: STEPS, CALLOUT: CALLOUT, TABLE: TABLE, benefit: benefit, trait: trait, ranking: ranking, schedule: schedule, procedure: procedure, order: order, recipe: recipe, howto: howto, compare: compare, proscons: proscons, generic: generic };
