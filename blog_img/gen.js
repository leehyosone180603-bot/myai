// 네이버 정리 이미지 생성기: node gen.js  → 각 글 폴더에 thumb/info1/info2.html 생성
const fs=require("path"), P=require("path"), FS=require("fs");
function page(inner){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="page"><div class="wrap">'+inner+'</div></div></body></html>';}
function sq(tag,ttlHtml,subHtml){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../common.css"></head><body><div class="sq"><div class="scrim"></div><div class="inner"><span class="tag"><span class="dot"></span>'+tag+'</span><div class="bar"></div><div class="ttl">'+ttlHtml+'</div><div class="spacer"></div><div class="subline">'+subHtml+'</div></div><div class="brand">건강흐름</div></div></body></html>';}
function foot(src){return '<div class="foot">'+src+'</div>';}

const A={}; // articles

// ===== 조정신청 =====
A["2026-11-27_조정신청"]={
 thumb: sq("2026 건강보험 · 조정신청","소득 줄었는데<br><span class=\"y\">건보료 그대로?</span>","<span style=\"color:#FFD400\">조정신청</span>으로 바로 낮추기<br>11월분은 12월 10일까지"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 건보료 조정신청</span>'+
   '<h1>소득 줄면 <span class="hl">조정신청</span>으로 바로 낮춘다</h1>'+
   '<div class="sub">건보료는 ‘전년도 소득’ 기준이라, 신청해야 올해 소득이 반영돼요.</div>'+
   '<div class="cards">'+
   '<div class="card"><div class="steprow"><span class="num">1</span><div class="body"><h3>왜 필요할까</h3><p>폐업·퇴직·해촉으로 올해 소득이 줄어도, <b>신청하지 않으면</b> 작년 소득 기준으로 계속 부과돼요. 공단이 알아서 깎아주지 않아요.</p></div></div></div>'+
   '<div class="card"><div class="steprow"><span class="num">2</span><div class="body"><h3>신청할 수 있는 경우</h3><ul><li>폐업·휴업·퇴직·해촉으로 사업·근로소득 감소</li><li>2025년부터 이자·배당·연금·기타소득 변동도 대상</li><li>소득이 <b>늘어난</b> 경우도 미리 신청 가능(정산 부담 분산)</li></ul></div></div></div>'+
   '<div class="card"><div class="steprow"><span class="num">3</span><div class="body"><h3>신청 방법</h3><p>국민건강보험공단 홈페이지 · <b>The건강보험 앱</b> · <b>1577-1000</b>. 휴·폐업사실증명이나 퇴직증명 + 신분증 사본이 필요해요.</p></div></div></div>'+
   '</div>'+
   foot("출처 : 국민건강보험법 및 공단 보험료 조정 안내<br>정확한 금액은 국민건강보험공단(1577-1000) 또는 홈페이지 모의계산으로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 기한·정산</span>'+
   '<h1><span class="hl">기한</span>이 가장 중요하다</h1>'+
   '<div class="sub">조정은 ‘신청한 달’부터 반영돼요.</div>'+
   '<div class="cards">'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>구분</th><th>적용 시점</th></tr>'+
   '<tr class="hlrow"><td>11월분</td><td>12월 10일(납부기한) 전 신청 → <b>11월분부터</b></td></tr>'+
   '<tr><td>일반 월</td><td>매월 1일 신청 시 그달부터, 이후 신청은 다음 달부터</td></tr></table></div>'+
   '<div class="card warn"><h3>조정은 ‘정산’이 따라와요</h3><p>예상 소득으로 미리 낮추는 제도라, <b>다음 해 11월</b>에 실제 소득으로 다시 계산해요. 더 벌었으면 추가 부과, 덜 벌었으면 환급 — ‘안 내는’ 게 아니라 ‘나중에 정확히 맞추는’ 구조예요.</p></div>'+
   '<div class="card gray"><h3>2026년 11월 상황</h3><p>지역가입자 288만 세대 보험료가 평균 <span class="hl">+4%</span> 올라, 세대당 평균이 <b>9만5,860원</b>이 됐어요. 소득이 줄었다면 조정신청이 특히 중요한 시기예요.</p></div>'+
   '</div>'+
   foot("출처 : 국민건강보험공단 2026.11.26 발표 · 공단 조정신청 안내<br>정확한 금액은 국민건강보험공단(1577-1000) 또는 홈페이지 모의계산으로 확인하세요.")
 )
};

// ===== 종부세 고지서 =====
A["2026-11-27_종부세고지서"]={
 thumb: sq("2026 종부세 · 12월 고지","종부세 고지서<br><span class=\"y\">바로 내지 마세요</span>","내기 전 <span style=\"color:#FFD400\">6가지</span> 체크<br>납부기한 12월 15일"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 종부세 고지</span>'+
   '<h1>고지서, 내기 전 <span class="hl">6가지</span> 확인</h1>'+
   '<div class="sub">국세청이 약 82만명에게 고지(11월 24일부터 발송), 납부는 12월 15일까지.</div>'+
   '<div class="cards">'+
   '<div class="card formula"><h3>2026 현행 기준</h3><ul><li>공제 : 1세대 1주택 <b>12억</b> / 그 외 <b>9억</b> (공시가격 합계)</li><li>공정시장가액비율 <b>60%</b></li><li>납부기한 <b>12월 1일~15일</b></li></ul></div>'+
   '<div class="card"><h3>내기 전 확인할 6가지</h3><ul>'+
   '<li>6월 1일 이후 판 집이 포함되진 않았는지</li>'+
   '<li>공시가격이 ‘공시가격 알리미’와 맞는지</li>'+
   '<li>1주택인데 공제가 9억으로 잘못 잡혔는지</li>'+
   '<li>고령자·장기보유 세액공제가 빠지진 않았는지</li>'+
   '<li>임대주택 합산배제 신고분이 반영됐는지</li>'+
   '<li>분납·납부유예가 필요한 금액인지</li></ul></div>'+
   '</div>'+
   foot("출처 : 국세청 2026년 귀속 종합부동산세 고지 · 종합부동산세법<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 세액공제·분납</span>'+
   '<h1>세액공제·분납 <span class="hl">꼭 챙기기</span></h1>'+
   '<div class="sub">1세대 1주택자는 공제가 크게 줄 수 있어요.</div>'+
   '<div class="cards">'+
   '<div class="card"><h3>세액공제 — 최대 80%</h3><ul><li>고령자 : 60세↑ <b>20~40%</b></li><li>장기보유 : 5년↑ <b>20~50%</b></li><li>둘을 합쳐 최대 <span class="ok">80%</span> (단순 합이 넘어도 상한 80%)</li></ul></div>'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>제도</th><th>요건·방법</th></tr>'+
   '<tr><td>분납</td><td>세액 <b>250만원 초과</b> 시 12/15 신청, 나머지는 내년 6/15까지</td></tr>'+
   '<tr><td>납부유예</td><td>고령·장기보유 1주택자, 신청기한이 납부기한보다 앞섬(안내문 확인)</td></tr></table></div>'+
   '<div class="card warn"><h3>고지 내용이 다르면</h3><p>사실과 다르거나 신고를 원하면 <b>12월 1~15일</b>에 직접 신고·납부할 수 있고, 이 경우 당초 고지세액은 자동 취소돼요.</p></div>'+
   '</div>'+
   foot("출처 : 국세청 2026 종부세 안내 · 종합부동산세법<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
};

// ===== 종부세 대상 기준 =====
A["2026-11-27_종부세대상"]={
 thumb: sq("2026 종부세 · 대상 기준","우리 집도<br><span class=\"y\">종부세 낼까?</span>","1주택 <span style=\"color:#FFD400\">12억</span>·일반 9억<br>‘공시가격’ 합계 기준"),
 info1: page(
   '<span class="eyebrow">2026년 기준 · 종부세 대상</span>'+
   '<h1>공시가격 합계로 <span class="hl">대상이 갈린다</span></h1>'+
   '<div class="sub">1주택이면 공시가격 12억원까지는 종부세가 없어요.</div>'+
   '<div class="cards">'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>구분</th><th>공제(공시가격 합계)</th></tr>'+
   '<tr class="hlrow"><td>1세대 1주택자</td><td><b>12억원</b>까지 비과세</td></tr>'+
   '<tr><td>그 외(다주택 등)</td><td><b>9억원</b></td></tr></table></div>'+
   '<div class="card formula"><h3>‘시세’가 아니라 ‘공시가격’</h3><p>공시가격은 보통 시세보다 낮아요. 시세 15억 아파트라도 <b>공시가격이 12억 이하</b>면 1주택자는 대상이 아닐 수 있어요.</p></div>'+
   '<div class="card gray"><h3>‘합산’이 핵심</h3><p>집마다 따로 보는 재산세와 달리, 한 사람이 가진 주택 공시가격을 <b>모두 합쳐서</b> 봐요. 각각은 기준 이하여도 합치면 대상이 될 수 있어요(다주택 주의).</p></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 ),
 info2: page(
   '<span class="eyebrow">2026년 기준 · 계산·세액공제</span>'+
   '<h1>이렇게 계산돼요</h1>'+
   '<div class="sub">현행(1주택 12억·일반 9억, 공정 60%) 기준이에요.</div>'+
   '<div class="cards">'+
   '<div class="card formula"><h3>계산 4단계</h3><ul><li>① 공시가격 합계 − 공제(12억/9억)</li><li>② × 공정시장가액비율 60% = 과세표준</li><li>③ × 세율 − 누진공제 = 종부세</li><li>④ 재산세 상당액 공제, 농어촌특별세(20%) 가산</li></ul></div>'+
   '<div class="card" style="padding:28px 30px"><table><tr><th>1주택 공시가격</th><th>결과</th></tr>'+
   '<tr class="hlrow"><td>10억</td><td class="ok">공제 12억 이하 → 종부세 0원</td></tr>'+
   '<tr><td>14억</td><td>공제 빼고 2억분 과세, 세액공제 최대 80%로 크게 감소</td></tr></table></div>'+
   '<div class="card warn"><h3>고령·장기보유면 세액공제</h3><p>1세대 1주택자는 고령자+장기보유를 합쳐 <b>최대 80%</b>까지 받아요. 대상인데 고지서에 빠져 있으면 손해예요.</p></div>'+
   '</div>'+
   foot("출처 : 종합부동산세법 · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
};

for(const dir in A){
  const d="/home/user/myai/blog_img/"+dir;
  FS.writeFileSync(d+"/thumb.html", A[dir].thumb);
  FS.writeFileSync(d+"/info1.html", A[dir].info1);
  FS.writeFileSync(d+"/info2.html", A[dir].info2);
  console.log("wrote", dir);
}
