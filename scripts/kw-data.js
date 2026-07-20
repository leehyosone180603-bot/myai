"use strict";
/*
 * 블로그 포스트 생성 데이터.
 * 현재는 품질 '나이·출생연도' 클러스터만 생성/발행 대상입니다.
 * (예전 153개 키워드 글은 대기열에서 제외됨. 되살리려면 아래 require 주석을 해제하세요.)
 */
module.exports = [].concat(
  require("./data/age-cluster.js")
  // --- 보관(발행 중단) ---
  // require("./data/benefit.js"),
  // require("./data/trait.js"),
  // require("./data/ranking.js"),
  // require("./data/schedule.js"),
  // require("./data/procedure.js"),
  // require("./data/order.js"),
  // require("./data/recipe.js"),
  // require("./data/howto.js"),
  // require("./data/compare.js"),
  // require("./data/proscons.js"),
  // require("./data/generic.js")
);
