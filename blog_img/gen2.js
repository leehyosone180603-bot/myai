const FS=require("fs");
function page(inner){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="page"><div class="wrap">'+inner+'</div></div></body></html>';}
function sq(tag,ttlHtml,subHtml){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="sq"><div class="scrim"></div><div class="inner"><span class="tag"><span class="dot"></span>'+tag+'</span><div class="bar"></div><div class="ttl">'+ttlHtml+'</div><div class="spacer"></div><div class="subline">'+subHtml+'</div></div><div class="brand">건강흐름</div></div></body></html>';}
function foot(src){return '<div class="foot">'+src+'</div>';}
const cmp='<div class="card" style="padding:28px 30px"><table>'+
 '<tr><th>구분</th><th>재산세</th><th>종합부동산세</th></tr>'+
 '<tr><td>과세 주체</td><td>지방세(시·군·구)</td><td>국세(국세청)</td></tr>'+
 '<tr><td>납부 시기</td><td>7월·9월</td><td>12월 1~15일</td></tr>'+
 '<tr><td>대상</td><td>대부분 보유자</td><td>공시가 합계가 공제 초과분</td></tr>'+
 '<tr class="hlrow"><td>계산 단위</td><td>집마다 따로</td><td>사람별 공시가격 합산</td></tr>'+
 '</table></div>';
const A={};

// ===== 8. 보유세 차이 =====
A["2026-11-27_보유세차이"]={
 thumb: sq("2026 보유세 · 재산세+종부세","재산세 냈는데<br><span class=\"y\">11월에 또?</span>","보유세 = 재산세 + <span style=\"color:#FFD400\">종부세</span><br>주체·시기·대상이 달라요"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 보유세</span>'+
   '<h1>재산세와 종부세, <span class="hl">완전히 별개</span></h1>'+
   '<div class="sub">갖고 있다는 사실에 매기는 ‘보유세’는 재산세와 종부세를 묶은 말이에요.</div>'+
   '<div class="cards">'+
   '<div class="card formula"><h3>보유세 = 재산세 + 종부세</h3><ul><li><b>재산세</b> : 모든 주택 보유자가 내는 기본 세금</li><li><b>종부세</b> : 공시가격이 기준을 넘는 일부가 추가로 내는 세금</li></ul></div>'+
   cmp+
   '<div class="card gray"><h3>같은 건 과세기준일뿐</h3><p>둘 다 <b>6월 1일</b> 보유자 기준으로 매겨요. 그 외에는 주체·시기·대상·계산 방식이 모두 달라요.</p></div>'+
   '</div>'+
   foot("출처 : 지방세법(재산세) · 종합부동산세법<br>정확한 세액은 홈택스·위택스 또는 관할 기관으로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 공제·이중과세</span>'+
   '<h1>이중과세일까? <span class="hl">아니에요</span></h1>'+
   '<div class="sub">종부세는 이미 낸 재산세를 빼고 계산해요.</div>'+
   '<div class="cards">'+
   '<div class="card"><h3>2026 종부세 공제(공시가격 합계)</h3><ul><li>1세대 1주택 <b>12억원</b></li><li>그 외 <b>9억원</b></li><li>‘시세’가 아니라 <span class="hl">공시가격</span> 합계 기준</li></ul></div>'+
   '<div class="card warn"><h3>중복은 조정돼요</h3><p>종부세를 계산할 때 <b>이미 낸 재산세 상당액을 공제</b>해요. 그래서 공제 이하 1주택자는 대부분 종부세가 아예 안 나와요. 다만 종부세엔 <b>농어촌특별세(세액의 20%)</b>가 더 붙어요.</p></div>'+
   '<div class="card gray"><h3>2026년은 현행 기준</h3><p>개편 얘기가 많지만, 2026년 고지는 <b>현행(1주택 12억·일반 9억, 공정 60%)</b>대로 적용돼요.</p></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
};

// ===== 10. 종부세 vs 재산세 =====
A["2026-11-27_종부세재산세차이"]={
 thumb: sq("2026 종부세 · 재산세 비교","종부세가<br><span class=\"y\">재산세랑 뭐가?</span>","국세 vs 지방세<br>왜 <span style=\"color:#FFD400\">따로</span> 낼까"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 종부세</span>'+
   '<h1>종부세는 <span class="hl">국세청이 추가로</span> 매겨요</h1>'+
   '<div class="sub">재산세를 낸 사람 중에서도 고가·다주택 일부만 더 내는 구조예요.</div>'+
   '<div class="cards">'+
   '<div class="card formula"><h3>종부세란?</h3><p>보유한 부동산의 <b>공시가격 합계</b>가 기준을 넘는 사람에게 <b>국세청</b>이 추가로 매기는 국세예요.</p></div>'+
   cmp+
   '<div class="card gray"><h3>‘합산’이 핵심</h3><p>집이 여러 채면 각각은 기준 이하라도 공시가격을 <b>모두 합치면</b> 종부세 대상이 될 수 있어요(다주택 주의).</p></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 · 지방세법<br>정확한 세액은 홈택스·위택스 또는 관할 기관으로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 공제·구조</span>'+
   '<h1>왜 <span class="hl">둘로 나눠</span> 매길까</h1>'+
   '<div class="sub">역할이 달라서 주체도 시기도 달라요.</div>'+
   '<div class="cards">'+
   '<div class="card"><h3>2026 종부세 공제</h3><ul><li>1세대 1주택 <b>12억원</b> / 그 외 <b>9억원</b></li><li>‘시세’가 아니라 <span class="hl">공시가격</span> 합계 기준</li></ul></div>'+
   '<div class="card warn"><h3>이중과세 아닌가요?</h3><p>종부세 계산 때 <b>이미 낸 재산세 상당액을 공제</b>해 중복을 조정해요. 공제 이하 1주택자는 대부분 종부세가 없어요. 종부세엔 <b>농어촌특별세(20%)</b>가 붙어요.</p></div>'+
   '<div class="card gray"><h3>역할이 달라요</h3><p>재산세는 모든 보유자에게 <b>지자체</b>가 매기는 기본 세금, 종부세는 고가·다주택에 <b>국가</b>가 추가로 매기는 세금이에요.</p></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
};

// ===== 11. 종부세 세액공제 80% =====
A["2026-11-27_종부세세액공제"]={
 thumb: sq("2026 종부세 · 세액공제","1주택 종부세<br><span class=\"y\">최대 80% 공제</span>","고령자 + 장기보유<br>합쳐서 <span style=\"color:#FFD400\">최대 80%</span>"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 세액공제</span>'+
   '<h1>1주택이면 <span class="hl">합쳐 최대 80%</span></h1>'+
   '<div class="sub">고령자 공제와 장기보유 공제를 더해서 받아요(1세대 1주택자).</div>'+
   '<div class="cards">'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>고령자 세액공제(연령)</th><th>공제율</th></tr>'+
   '<tr><td>60세 이상~65세 미만</td><td><b>20%</b></td></tr>'+
   '<tr><td>65~70세</td><td><b>30%</b></td></tr>'+
   '<tr class="hlrow"><td>70세 이상</td><td><b>40%</b></td></tr></table></div>'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>장기보유 세액공제(보유기간)</th><th>공제율</th></tr>'+
   '<tr><td>5년 이상~10년 미만</td><td><b>20%</b></td></tr>'+
   '<tr><td>10~15년</td><td><b>40%</b></td></tr>'+
   '<tr class="hlrow"><td>15년 이상</td><td><b>50%</b></td></tr></table></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 제9조(세액공제)<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 상한·주의</span>'+
   '<h1>합산 상한은 <span class="hl">80%</span></h1>'+
   '<div class="sub">단순 합이 80%를 넘어도 최대 80%까지만 공제돼요.</div>'+
   '<div class="cards">'+
   '<div class="card formula"><h3>예시</h3><p>70세(40%) + 15년 보유(50%) = 단순합 90% → 상한 적용 <span class="ok">80%</span>. 세액이 100만원이면 <b>20만원</b>만 내는 셈이에요.</p></div>'+
   '<div class="card warn"><h3>꼭 알아둘 주의점</h3><ul><li><b>다주택자는 대상이 아니에요</b> (1세대 1주택자만)</li><li>부부 공동명의는 기본으론 못 받고 <b>‘1주택 특례’</b>를 9월에 신청해야 받아요</li><li>연령·보유기간은 <b>과세기준일(6월 1일)</b> 기준</li></ul></div>'+
   '<div class="card gray"><h3>고지서 확인이 핵심</h3><p>대상인데 세액공제가 고지서에 빠지면 그대로 과납해요. 고령·장기보유 1주택자는 공제 반영 여부를 꼭 확인하세요.</p></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
};

for(const dir in A){
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/thumb.html", A[dir].thumb);
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/info1.html", A[dir].info1);
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/info2.html", A[dir].info2);
  console.log("wrote", dir);
}
