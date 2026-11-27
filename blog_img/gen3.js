const FS=require("fs");
function page(inner){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="page"><div class="wrap">'+inner+'</div></div></body></html>';}
function sq(tag,ttlHtml,subHtml){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="sq"><div class="scrim"></div><div class="inner"><span class="tag"><span class="dot"></span>'+tag+'</span><div class="bar"></div><div class="ttl">'+ttlHtml+'</div><div class="spacer"></div><div class="subline">'+subHtml+'</div></div><div class="brand">건강흐름</div></div></body></html>';}
function foot(src){return '<div class="foot">'+src+'</div>';}
const A={};

// ===== 12. 분납·납부유예 =====
A["2026-11-27_분납유예"]={
 thumb: sq("2026 종부세 · 분납·납부유예","종부세 한 번에<br><span class=\"y\">부담되면?</span>","분납(250만 초과) ·<br><span style=\"color:#FFD400\">납부유예</span>로 나눠 내기"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 분납</span>'+
   '<h1>세액 <span class="hl">250만원 초과</span>면 나눠 내요</h1>'+
   '<div class="sub">납부기한(12월 15일)까지 신청하면 일부를 미뤄 낼 수 있어요.</div>'+
   '<div class="cards">'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>세액 구간</th><th>나눠 낼 수 있는 금액</th></tr>'+
   '<tr><td>250만~500만원</td><td><b>250만원 초과분</b></td></tr>'+
   '<tr class="hlrow"><td>500만원 초과</td><td><b>세액의 50% 이하</b></td></tr></table></div>'+
   '<div class="card formula"><h3>분납 포인트</h3><ul><li>나머지 세액은 <b>내년 6월 15일</b >까지 납부</li><li>홈택스·세무서에서 신청</li><li>분납에는 <span class="ok">별도 이자 없음</span></li></ul></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법(분납) · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 납부유예</span>'+
   '<h1>고령·장기보유 1주택은 <span class="hl">유예</span></h1>'+
   '<div class="sub">소득은 적은데 집값만 오른 1주택자를 위한 제도예요.</div>'+
   '<div class="cards">'+
   '<div class="card"><h3>납부유예 요건(모두 충족)</h3><ul><li>1세대 1주택자</li><li>만 60세 이상 <b>또는</b> 5년 이상 보유</li><li>직전 과세기간 소득이 기준 이하</li><li>종부세액이 일정액(통상 100만원) 초과</li></ul><p style="margin-top:8px">주택을 <b>양도·상속·증여</b>하는 시점까지 납부를 미뤄요(이자 상당액 가산).</p></div>'+
   '<div class="card warn"><h3>신청 기한 주의</h3><p>납부유예 신청 기한은 <b>납부기한(12월 15일)보다 앞서요.</b> 국세청 안내문을 받으면 기한을 꼭 확인하세요.</p></div>'+
   '<div class="card gray"><h3>한 줄 정리</h3><ul><li><b>분납</b> : 누구나(250만원 초과) 쓰는 단기 분할</li><li><b>납부유예</b> : 고령·장기보유 1주택자만, 집 팔 때까지 연기</li></ul></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법(납부유예) · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
};

// ===== 13. 건보 4월 정산 =====
A["2026-11-27_건보정산"]={
 thumb: sq("2026 건강보험 · 4월 정산","4월 월급에서<br><span class=\"y\">건보료 왜 많지?</span>","요율 인상 아님 · <span style=\"color:#FFD400\">4월 1회 정산</span><br>5월부터 원래대로"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 건강보험 정산</span>'+
   '<h1>왜 <span class="hl">4월</span>에 정산할까</h1>'+
   '<div class="sub">매달 ‘작년 보수월액’으로 임시로 떼고, 4월에 실제 보수로 다시 계산해요.</div>'+
   '<div class="cards">'+
   '<div class="card formula"><h3>정산 구조</h3><ul><li>작년보다 보수가 <b>늘었으면</b> → 4월에 추가납부</li><li>보수가 <b>줄었으면</b> → 환급</li></ul><p style="margin-top:8px">승진·성과급·수당으로 실제 보수가 달라지기 때문이에요.</p></div>'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>2026년 4월 정산</th><th>인원·평균</th></tr>'+
   '<tr><td>추가납부</td><td>약 1,035만명 · 평균 <b>21.9만원</b></td></tr>'+
   '<tr class="hlrow"><td>환급</td><td>약 355만명 · 평균 <b>11.5만원</b></td></tr></table></div>'+
   '</div>'+
   foot("출처 : 국민건강보험공단 2026년 4월 보수월액 정산 결과<br>정확한 금액은 국민건강보험공단(1577-1000) 또는 명세서로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 대비·분할</span>'+
   '<h1>요율 인상이 <span class="hl">아니에요</span></h1>'+
   '<div class="sub">4월 한 번의 일시 정산분이라, 5월부터 원래 보험료로 돌아가요.</div>'+
   '<div class="cards">'+
   '<div class="card warn"><h3>제일 중요한 포인트</h3><p>매달 그만큼 더 내는 게 아니에요. <b>4월만 유독 많이 빠지는</b> 이유가 바로 이 일시 정산 때문이에요.</p></div>'+
   '<div class="card"><h3>부담되면 분할납부</h3><p>추가정산액이 한 달 보험료보다 크면, <b>회사를 통해 신청</b>해 최대 <span class="hl">12회</span>까지 나눠 낼 수 있어요. 이직·승진·성과급이 큰 해엔 정산액도 커질 수 있어요.</p></div>'+
   '<div class="card gray"><h3>직장은 4월, 지역은 11월</h3><p>지역가입자는 4월이 아니라 <b>11월</b>에 작년 소득·올해 재산이 새로 반영돼요.</p></div>'+
   '</div>'+
   foot("출처 : 국민건강보험법 · 공단 보수월액 정산 안내<br>정확한 금액은 국민건강보험공단(1577-1000) 또는 명세서로 확인하세요.")
 )
};

// ===== 14. 2026 요율표 =====
A["2026-11-27_요율표"]={
 thumb: sq("2026 건강보험 · 요율","2026 건보료율<br><span class=\"y\">7.19%</span>","본인 3.595% · 장기요양 <span style=\"color:#FFD400\">13.14%</span><br>2027년 동결 확정"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 요율</span>'+
   '<h1>명세서에 필요한 <span class="hl">숫자</span>만</h1>'+
   '<div class="sub">건강보험료율은 보수월액의 7.19%(근로자 본인 3.595%)예요.</div>'+
   '<div class="cards">'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>구분</th><th>2025</th><th>2026</th></tr>'+
   '<tr><td>건강보험료율</td><td>7.09%</td><td><b>7.19%</b></td></tr>'+
   '<tr><td>본인부담(절반)</td><td>3.545%</td><td><b>3.595%</b></td></tr>'+
   '<tr class="hlrow"><td>장기요양(건보료 대비)</td><td>12.95%</td><td><b>13.14%</b></td></tr></table></div>'+
   '<div class="card formula"><h3>상한·하한(2026, 본인부담)</h3><ul><li>상한 : 월 <b>459만1,740원</b></li><li>하한 : 월 <b>2만160원</b></li><li>‘상한 918만원’은 회사 부담까지 합친 <b>총액</b>이에요</li></ul></div>'+
   '<div class="card gray"><h3>장기요양은 ‘얹어서’</h3><p>인터넷에 ‘12.95%’로 적힌 글은 <b>작년 값</b>이에요. 장기요양은 건보료에 더해서 떼는 구조라 2026년은 <b>13.14%</b>예요.</p></div>'+
   '</div>'+
   foot("출처 : 보건복지부 2026년 건강보험료율·장기요양보험료율 고시<br>정확한 금액은 국민건강보험공단(1577-1000) 또는 모의계산으로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 월급별·동결</span>'+
   '<h1>월급별 <span class="hl">본인부담</span> 예시</h1>'+
   '<div class="sub">건보료 + 장기요양을 합친 본인부담이에요.</div>'+
   '<div class="cards">'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>보수월액</th><th>본인부담(장기요양 포함)</th></tr>'+
   '<tr><td>250만원</td><td>약 <b>10만1,680원</b></td></tr>'+
   '<tr><td>300만원</td><td>약 <b>12만2,020원</b></td></tr>'+
   '<tr class="hlrow"><td>400만원</td><td>약 <b>16만2,690원</b></td></tr></table></div>'+
   '<div class="card formula"><h3>2027년은 동결</h3><p>2027년 건강보험료율은 <span class="hl">7.19%로 동결</span>이 확정됐어요. 당분간 요율 자체의 변동은 크지 않을 전망이에요.</p></div>'+
   '<div class="card gray"><h3>지역가입자라면</h3><p>지역은 소득보험료(7.19%)에 더해 <b>재산 점수(점수당 211.5원)</b>로 재산보험료가 붙어요. 2026년 11월부터 지역 평균이 <b>9만5,860원(+4%)</b>, 납부기한은 <b>12월 10일</b>이에요.</p></div>'+
   '</div>'+
   foot("출처 : 보건복지부 고시 · 국민건강보험공단 2026.11 발표<br>정확한 금액은 국민건강보험공단(1577-1000) 또는 모의계산으로 확인하세요.")
 )
};

for(const dir in A){
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/thumb.html", A[dir].thumb);
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/info1.html", A[dir].info1);
  FS.writeFileSync("/home/user/myai/blog_img/"+dir+"/info2.html", A[dir].info2);
  console.log("wrote", dir);
}
