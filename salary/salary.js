(function () {
  "use strict";

  // 2025년 기준 요율 (매년 변동될 수 있음)
  var PENSION_RATE = 0.045;          // 국민연금 (근로자)
  var PENSION_MIN = 390000;          // 기준소득월액 하한
  var PENSION_MAX = 6170000;         // 기준소득월액 상한
  var HEALTH_RATE = 0.03545;         // 건강보험 (근로자)
  var CARE_RATE = 0.1295;            // 장기요양 (건강보험료 대비)
  var EMPLOY_RATE = 0.009;           // 고용보험 (근로자)

  var salaryInput = document.getElementById("salaryInput");
  var nontaxInput = document.getElementById("nontaxInput");
  var familyInput = document.getElementById("familyInput");
  var calcBtn = document.getElementById("calcBtn");
  var errorMsg = document.getElementById("errorMsg");
  var resultsCard = document.getElementById("resultsCard");

  document.getElementById("year").textContent = new Date().getFullYear();

  function fmt(n) {
    return Math.round(n).toLocaleString("ko-KR");
  }

  function parseWon(raw) {
    if (!raw) return 0;
    var digits = raw.replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  // 입력 중 천 단위 콤마 자동 표시
  function attachComma(el) {
    el.addEventListener("input", function () {
      var v = parseWon(el.value);
      el.value = v ? v.toLocaleString("ko-KR") : "";
    });
  }
  attachComma(salaryInput);
  attachComma(nontaxInput);

  // 근로소득공제 (연)
  function earnedIncomeDeduction(g) {
    if (g <= 5000000) return g * 0.7;
    if (g <= 15000000) return 3500000 + (g - 5000000) * 0.4;
    if (g <= 45000000) return 7500000 + (g - 15000000) * 0.15;
    if (g <= 100000000) return 12000000 + (g - 45000000) * 0.05;
    return 14750000 + (g - 100000000) * 0.02;
  }

  // 종합소득세 산출세액 (2025 과세표준 구간)
  function incomeTaxByBase(base) {
    if (base <= 0) return 0;
    if (base <= 14000000) return base * 0.06;
    if (base <= 50000000) return 840000 + (base - 14000000) * 0.15;
    if (base <= 88000000) return 6240000 + (base - 50000000) * 0.24;
    if (base <= 150000000) return 15360000 + (base - 88000000) * 0.35;
    if (base <= 300000000) return 37060000 + (base - 150000000) * 0.38;
    if (base <= 500000000) return 94060000 + (base - 300000000) * 0.40;
    if (base <= 1000000000) return 174060000 + (base - 500000000) * 0.42;
    return 384060000 + (base - 1000000000) * 0.45;
  }

  // 근로소득세액공제 (한도 적용)
  function earnedTaxCredit(calculatedTax, grossYear) {
    var credit = calculatedTax <= 1300000
      ? calculatedTax * 0.55
      : 715000 + (calculatedTax - 1300000) * 0.30;

    var limit;
    if (grossYear <= 33000000) {
      limit = 740000;
    } else if (grossYear <= 70000000) {
      limit = Math.max(660000, 740000 - (grossYear - 33000000) * 0.008);
    } else {
      limit = Math.max(500000, 660000 - (grossYear - 70000000) * 0.5);
    }
    return Math.min(credit, limit);
  }

  function handleCalc() {
    errorMsg.textContent = "";

    var annual = parseWon(salaryInput.value);
    if (!annual || annual <= 0) {
      resultsCard.hidden = true;
      errorMsg.textContent = "연봉을 입력해 주세요.";
      return;
    }

    var nontaxMonthly = nontaxInput.value === "" ? 200000 : parseWon(nontaxInput.value);
    var family = parseInt(familyInput.value, 10) || 1;

    var grossMonthly = annual / 12;
    var taxableMonthly = Math.max(0, grossMonthly - nontaxMonthly); // 보수월액

    // 4대보험 (월)
    var pensionBase = Math.min(Math.max(taxableMonthly, PENSION_MIN), PENSION_MAX);
    var pension = Math.round(pensionBase * PENSION_RATE / 10) * 10;
    var health = Math.round(taxableMonthly * HEALTH_RATE / 10) * 10;
    var care = Math.round(health * CARE_RATE / 10) * 10;
    var employ = Math.round(taxableMonthly * EMPLOY_RATE / 10) * 10;

    // 소득세 (연 추정 → 월)
    var grossYear = taxableMonthly * 12;
    var eid = earnedIncomeDeduction(grossYear);
    var earnedIncome = grossYear - eid;
    var personalDeduction = 1500000 * family;
    var pensionDeduction = pension * 12; // 국민연금 전액 소득공제
    var taxBase = Math.max(0, earnedIncome - personalDeduction - pensionDeduction);
    var calculatedTax = incomeTaxByBase(taxBase);
    var credit = earnedTaxCredit(calculatedTax, grossYear);
    var decidedTax = Math.max(0, calculatedTax - credit);

    var incomeTax = Math.round(decidedTax / 12 / 10) * 10;
    var localTax = Math.round(incomeTax * 0.1 / 10) * 10;

    var totalDeduct = pension + health + care + employ + incomeTax + localTax;
    var netMonthly = grossMonthly - totalDeduct;
    var netYearly = netMonthly * 12;

    document.getElementById("netMonthly").textContent = fmt(netMonthly);
    document.getElementById("netYearly").textContent = "연 환산 약 " + fmt(netYearly) + "원";

    document.getElementById("rGross").textContent = fmt(grossMonthly) + "원";
    document.getElementById("rPension").textContent = "-" + fmt(pension) + "원";
    document.getElementById("rHealth").textContent = "-" + fmt(health) + "원";
    document.getElementById("rCare").textContent = "-" + fmt(care) + "원";
    document.getElementById("rEmploy").textContent = "-" + fmt(employ) + "원";
    document.getElementById("rIncomeTax").textContent = "-" + fmt(incomeTax) + "원";
    document.getElementById("rLocalTax").textContent = "-" + fmt(localTax) + "원";
    document.getElementById("rTotalDeduct").textContent = "-" + fmt(totalDeduct) + "원";
    document.getElementById("rNet").textContent = fmt(netMonthly) + "원";

    resultsCard.hidden = false;
  }

  calcBtn.addEventListener("click", handleCalc);

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* 무시 */ }
})();
