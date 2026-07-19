"use strict";
/* 나이·출생연도 클러스터 고품질 스포크 글 */
module.exports = [].concat(
  require("./age/age-types-korean.js"),
  require("./age/fast-year-birth.js"),
  require("./age/birthyear-to-hakbeon.js"),
  require("./age/pension-start-age.js"),
  require("./age/senior-benefits-age.js"),
  require("./age/milestone-ages.js"),
  require("./age/rrn-age-decode.js"),
  require("./age/age-table-2026.js")
);
