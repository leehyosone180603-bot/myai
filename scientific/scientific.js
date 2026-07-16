(function () {
  "use strict";

  // ---- 수식 평가 엔진 (토크나이저 + 후위표기 변환 + 계산) ----
  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    ln: Math.log, log: function (x) { return Math.log(x) / Math.LN10; },
    sqrt: Math.sqrt, exp: Math.exp, abs: Math.abs
  };
  var TRIG = { sin: 1, cos: 1, tan: 1 };
  var INVTRIG = { asin: 1, acos: 1, atan: 1 };
  var CONST = { pi: Math.PI, e: Math.E };
  var OPS = {
    "+": { prec: 2, assoc: "L" }, "-": { prec: 2, assoc: "L" },
    "*": { prec: 3, assoc: "L" }, "/": { prec: 3, assoc: "L" },
    "%": { prec: 3, assoc: "L" }, "^": { prec: 4, assoc: "R" }
  };

  var deg = false; // 각도 모드 (false=라디안)

  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function tokenize(s) {
    var tokens = [];
    var i = 0;
    s = s.replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/×/g, "*").replace(/÷/g, "/");
    while (i < s.length) {
      var c = s[i];
      if (c === " ") { i++; continue; }
      if ((c >= "0" && c <= "9") || c === ".") {
        var num = "";
        while (i < s.length && ((s[i] >= "0" && s[i] <= "9") || s[i] === ".")) { num += s[i++]; }
        tokens.push({ t: "num", v: parseFloat(num) });
        continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        var name = "";
        while (i < s.length && /[a-zA-Z]/.test(s[i])) { name += s[i++]; }
        name = name.toLowerCase();
        if (FUNCS[name]) tokens.push({ t: "func", v: name });
        else if (CONST[name] !== undefined) tokens.push({ t: "num", v: CONST[name] });
        else throw new Error("알 수 없는 이름: " + name);
        continue;
      }
      if (c === "!") { tokens.push({ t: "fact" }); i++; continue; }
      if (OPS[c]) { tokens.push({ t: "op", v: c }); i++; continue; }
      if (c === "(") { tokens.push({ t: "lp" }); i++; continue; }
      if (c === ")") { tokens.push({ t: "rp" }); i++; continue; }
      throw new Error("잘못된 문자: " + c);
    }
    return tokens;
  }

  // 단항 마이너스 처리를 위해 토큰을 순회하며 unary 표시
  function toRPN(tokens) {
    var out = [], stack = [];
    var prev = null;
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (tk.t === "num") { out.push(tk); prev = tk; }
      else if (tk.t === "func") { stack.push(tk); prev = tk; }
      else if (tk.t === "fact") { out.push(tk); prev = tk; }
      else if (tk.t === "op") {
        // 단항 마이너스/플러스
        if ((tk.v === "-" || tk.v === "+") && (prev === null || prev.t === "op" || prev.t === "lp")) {
          if (tk.v === "-") stack.push({ t: "op", v: "u-" });
          prev = tk; continue;
        }
        var o1 = OPS[tk.v];
        while (stack.length) {
          var top = stack[stack.length - 1];
          if (top.t === "op" && top.v === "u-") { out.push(stack.pop()); continue; }
          if (top.t === "op" && OPS[top.v] &&
            ((o1.assoc === "L" && o1.prec <= OPS[top.v].prec) || (o1.assoc === "R" && o1.prec < OPS[top.v].prec))) {
            out.push(stack.pop());
          } else break;
        }
        stack.push(tk); prev = tk;
      }
      else if (tk.t === "lp") { stack.push(tk); prev = tk; }
      else if (tk.t === "rp") {
        while (stack.length && stack[stack.length - 1].t !== "lp") out.push(stack.pop());
        if (!stack.length) throw new Error("괄호 오류");
        stack.pop();
        if (stack.length && stack[stack.length - 1].t === "func") out.push(stack.pop());
        prev = tk;
      }
    }
    while (stack.length) {
      var s = stack.pop();
      if (s.t === "lp") throw new Error("괄호 오류");
      out.push(s);
    }
    return out;
  }

  function evalRPN(rpn) {
    var st = [];
    for (var i = 0; i < rpn.length; i++) {
      var tk = rpn[i];
      if (tk.t === "num") st.push(tk.v);
      else if (tk.t === "fact") { st.push(factorial(st.pop())); }
      else if (tk.t === "func") {
        var a = st.pop();
        if (TRIG[tk.v] && deg) a = a * Math.PI / 180;
        var r = FUNCS[tk.v](a);
        if (INVTRIG[tk.v] && deg) r = r * 180 / Math.PI;
        st.push(r);
      }
      else if (tk.t === "op") {
        if (tk.v === "u-") { st.push(-st.pop()); continue; }
        var b = st.pop(), x = st.pop();
        switch (tk.v) {
          case "+": st.push(x + b); break;
          case "-": st.push(x - b); break;
          case "*": st.push(x * b); break;
          case "/": st.push(x / b); break;
          case "%": st.push(x % b); break;
          case "^": st.push(Math.pow(x, b)); break;
        }
      }
    }
    if (st.length !== 1) throw new Error("수식 오류");
    return st[0];
  }

  function evaluate(expr) {
    return evalRPN(toRPN(tokenize(expr)));
  }

  // ---- UI ----
  var exprEl = document.getElementById("expr");
  var resultEl = document.getElementById("result");
  var keys = document.getElementById("keys");
  var degBtn = document.getElementById("degBtn");
  var expr = "";

  function render() {
    exprEl.textContent = expr || "0";
  }
  function preview() {
    if (!expr) { resultEl.textContent = ""; return; }
    try {
      var v = evaluate(expr);
      resultEl.textContent = (isFinite(v)) ? "= " + format(v) : "";
    } catch (e) { resultEl.textContent = ""; }
  }
  function format(v) {
    if (!isFinite(v)) return "오류";
    var r = Math.round(v * 1e10) / 1e10;
    return String(r);
  }

  function insert(str) { expr += str; render(); preview(); }

  keys.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var v = btn.getAttribute("data-v");
    var act = btn.getAttribute("data-act");
    if (act === "clear") { expr = ""; render(); resultEl.textContent = ""; return; }
    if (act === "back") { expr = expr.slice(0, -1); render(); preview(); return; }
    if (act === "equal") {
      try {
        var val = evaluate(expr);
        resultEl.textContent = "= " + format(val);
        expr = format(val);
        render();
      } catch (err) { resultEl.textContent = "오류: 수식을 확인하세요"; }
      return;
    }
    if (v !== null) insert(v);
  });

  degBtn.addEventListener("click", function () {
    deg = !deg;
    degBtn.textContent = deg ? "DEG" : "RAD";
    degBtn.classList.toggle("active", deg);
    preview();
  });

  // 키보드 입력 지원
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); document.querySelector('[data-act="equal"]').click(); }
    else if (e.key === "Backspace") { expr = expr.slice(0, -1); render(); preview(); }
    else if (e.key === "Escape") { expr = ""; render(); resultEl.textContent = ""; }
    else if ("0123456789.+-*/^%()".indexOf(e.key) !== -1) { insert(e.key); }
  });

  render();
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
})();
