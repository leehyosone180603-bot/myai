const {sqbg}=require("./genlib.js");
const FS=require("fs");
const T={
 "2026-11-27_조정신청":["2026 건강보험 · 조정신청","소득 줄었는데<br><span class=\"y\">건보료 그대로?</span>","<span style=\"color:#FFD400\">조정신청</span>으로 바로 낮추기<br>11월분은 12월 10일까지"],
 "2026-11-27_종부세고지서":["2026 종부세 · 12월 고지","종부세 고지서<br><span class=\"y\">바로 내지 마세요</span>","내기 전 <span style=\"color:#FFD400\">6가지</span> 체크<br>납부기한 12월 15일"],
 "2026-11-27_종부세대상":["2026 종부세 · 대상 기준","우리 집도<br><span class=\"y\">종부세 낼까?</span>","1주택 <span style=\"color:#FFD400\">12억</span>·일반 9억<br>‘공시가격’ 합계 기준"],
 "2026-11-27_보유세차이":["2026 보유세 · 재산세+종부세","재산세 냈는데<br><span class=\"y\">11월에 또?</span>","보유세 = 재산세 + <span style=\"color:#FFD400\">종부세</span><br>주체·시기·대상이 달라요"],
 "2026-11-27_종부세재산세차이":["2026 종부세 · 재산세 비교","종부세가<br><span class=\"y\">재산세랑 뭐가?</span>","국세 vs 지방세<br>왜 <span style=\"color:#FFD400\">따로</span> 낼까"],
 "2026-11-27_종부세세액공제":["2026 종부세 · 세액공제","1주택 종부세<br><span class=\"y\">최대 80% 공제</span>","고령자 + 장기보유<br>합쳐서 <span style=\"color:#FFD400\">최대 80%</span>"],
 "2026-11-27_분납유예":["2026 종부세 · 분납·납부유예","종부세 한 번에<br><span class=\"y\">부담되면?</span>","분납(250만 초과) ·<br><span style=\"color:#FFD400\">납부유예</span>로 나눠 내기"],
 "2026-11-27_건보정산":["2026 건강보험 · 4월 정산","4월 월급에서<br><span class=\"y\">건보료 왜 많지?</span>","요율 인상 아님 · <span style=\"color:#FFD400\">4월 1회 정산</span><br>5월부터 원래대로"],
 "2026-11-27_요율표":["2026 건강보험 · 요율","2026 건보료율<br><span class=\"y\">7.19%</span>","본인 3.595% · 장기요양 <span style=\"color:#FFD400\">13.14%</span><br>2027년 동결 확정"]
};
for(const dir in T){
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/thumb.html", sqbg(T[dir][0],T[dir][1],T[dir][2]));
  console.log("retro thumb",dir);
}
