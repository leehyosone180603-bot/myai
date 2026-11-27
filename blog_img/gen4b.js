const {page,sqbg,foot,writeSet}=require("./genlib.js");

// 23. 과세기준일 6/1
writeSet("2026-11-27_과세기준일",{
 thumb: sqbg("2026 재산세 · 과세기준일","잔금 5월말? 6월초?<br><span class=\"y\">하루 차이로 1년치</span>","재산세·종부세는<br><span style=\"color:#FFD400\">6월 1일</span> 소유자 기준"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 과세기준일</span>'+
  '<h1><span class="hl">6월 1일</span>이 전부예요</h1>'+
  '<div class="sub">재산세는 1년을 쪼개지 않고, 6월 1일 그날 소유자가 그 해 전액을 내요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>6월 1일 기준</h3><ul><li>6월 1일 소유 → <b>6월 2일에 팔아도</b> 그 해 재산세는 내 몫</li><li>6월 2일에 샀다면 → 그 해는 <span class="ok">한 푼도 안 냄</span></li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>잔금·등기일</th><th>재산세 부담</th></tr>'+
  '<tr><td>5월 31일 이전</td><td>매수인(산 사람)</td></tr>'+
  '<tr><td>6월 1일</td><td>매수인(산 사람)</td></tr>'+
  '<tr class="hlrow"><td>6월 2일 이후</td><td>매도인(판 사람)</td></tr></table><p style="margin-top:10px;font-size:26px;color:#5A6472">소유권 이전 기준일 = 보통 잔금일·등기일 중 빠른 날</p></div>'+
  '</div>'+
  foot("출처 : 지방세법(과세기준일) · 종합부동산세법<br>정확한 내용은 위택스 또는 관할 지자체로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 매매 타이밍</span>'+
  '<h1>파는 사람·사는 사람 <span class="hl">반대</span>예요</h1>'+
  '<div class="sub">5월 말~6월 초 거래는 이 하루를 두고 협의하기도 해요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>입장이 정반대</h3><ul><li><b>파는 사람</b> : 6월 1일 ‘전’에 넘기면 그 해 재산세 안 냄 → 유리</li><li><b>사는 사람</b> : 6월 2일 ‘이후’ 잔금이면 그 해 재산세 안 냄 → 유리</li></ul></div>'+
  '<div class="card gray"><h3>종부세도 6월 1일 기준</h3><p>종합부동산세도 과세기준일이 6월 1일이에요. 6월 1일에 고가·다주택을 소유하면 <b>12월 종부세</b> 대상이 될 수 있어, 큰 거래일수록 타이밍이 중요해요.</p></div>'+
  '<div class="card warn"><h3>실전 팁</h3><p>5월 말~6월 초는 등기 지연이 생길 수 있어요. <b>소유권 이전 시점</b>을 계약서에 명확히 하고, 재산세 부담을 누가 질지 특약으로 정리하면 분쟁을 줄여요.</p></div>'+
  '</div>'+
  foot("출처 : 지방세법 · 종합부동산세법<br>정확한 내용은 위택스 또는 관할 지자체로 확인하세요.")
 )
});

// 24. 재산세·건보료 연계
writeSet("2026-11-27_재산세건보",{
 thumb: sqbg("2026 · 공시가격 연결","공시가 하나 오르면<br><span class=\"y\">줄줄이?</span>","재산세·종부세·건보료까지<br><span style=\"color:#FFD400\">공시가격</span>이 공통 기준"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 공시가격 연결</span>'+
  '<h1>출발점은 <span class="hl">공시가격</span> 하나</h1>'+
  '<div class="sub">공시가격은 재산세·종부세·지역 건보료의 공통 기준이에요.</div>'+
  '<div class="cards">'+
  '<div class="card"><div class="steprow"><span class="num">1</span><div class="body"><h3>공시가격 → 재산세</h3><p>공시가 × 공정시장가액비율 = 과세표준. 공시가가 오르면 과세표준이 커져 재산세가 오를 수 있어요(과표상한 5%로 완화돼도 누진이라 세액↑).</p></div></div></div>'+
  '<div class="card"><div class="steprow"><span class="num">2</span><div class="body"><h3>공시가격 → 종합부동산세</h3><p>공시가격 합계가 <b>1주택 12억·일반 9억</b>을 넘으면 종부세 대상. 공시가가 오르면 새로 대상이 되거나 세액이 늘 수 있어요(합산 기준).</p></div></div></div>'+
  '<div class="card"><div class="steprow"><span class="num">3</span><div class="body"><h3>공시가격 → 건보료·피부양자</h3><p>지역가입자 재산보험료는 재산세 과세표준 기준이라 공시가가 오르면 건보료도 올라요. 피부양자 자격(과세표준 <b>5.4억·9억</b>)도 영향받아 탈락할 수 있어요.</p></div></div></div>'+
  '</div>'+
  foot("출처 : 지방세법 · 종합부동산세법 · 국민건강보험법<br>정확한 금액은 위택스·홈택스·국민건강보험공단으로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 시차·실제 상황</span>'+
  '<h1>11월에 겹쳐 와서 <span class="hl">헷갈려요</span></h1>'+
  '<div class="sub">반영 시점이 달라 ‘재산세가 또 나왔나’ 오해하기 쉬워요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>항목</th><th>반영 시점</th></tr>'+
  '<tr><td>재산세(과세표준)</td><td>7·9월에 바로</td></tr>'+
  '<tr><td>종합부동산세</td><td>12월 1~15일</td></tr>'+
  '<tr class="hlrow"><td>지역 건강보험료</td><td>그해 11월 정기결정</td></tr></table></div>'+
  '<div class="card warn"><h3>11월 통지의 정체</h3><p>11월에 받는 세금 고지서는 <b>종부세(12/15 납부)</b>, 같은 시기 건보료 통지는 재산세 과세표준이 11월 정기결정에 반영된 결과예요. <b>재산세는 이미 7·9월에 냈어요.</b></p></div>'+
  '<div class="card gray"><h3>2026년 11월 실제</h3><p>지역가입자 288만 세대 보험료가 평균 <b>4%</b> 올라 세대당 평균 <b>9만5,860원</b>(납부 12월 10일)이 됐어요. 2025 소득 + 2026 재산이 반영된 결과예요.</p></div>'+
  '</div>'+
  foot("출처 : 국민건강보험공단 2026.11 발표 · 국세청 안내<br>정확한 금액은 위택스·홈택스·국민건강보험공단으로 확인하세요.")
 )
});

// 25. 1주택 특례 확인
writeSet("2026-11-27_1주택특례",{
 thumb: sqbg("2026 재산세 · 1주택 특례","1주택인데 특례<br><span class=\"y\">받고 있나?</span>","공정 43~45% · 특례세율<br><span style=\"color:#FFD400\">고지서</span>로 확인하는 법"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 1세대 1주택 특례</span>'+
  '<h1>두 가지를 <span class="hl">우대</span>받아요</h1>'+
  '<div class="sub">1세대가 1주택만 보유하면 공정가액비율과 세율을 우대받아요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>특례 두 가지</h3><ul><li>공정시장가액비율 : 일반 60% 대신 <b>43~45%</b> (3억↓43·3~6억44·6억↑45)</li><li>특례세율 : 공시가 9억 이하면 구간별 <b>0.05%p 낮은 세율(0.05~0.35%)</b></li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>고지서에서 확인</th></tr>'+
  '<tr><td>① 공정시장가액비율이 <b>43~45%</b>인지 (60%면 누락 의심)</td></tr>'+
  '<tr><td>② 세율이 <b>특례세율</b>로 적용됐는지</td></tr>'+
  '<tr class="hlrow"><td>③ 과세표준 = 공시가격 × 43~45%인지</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 지방세법(1세대 1주택 특례)<br>정확한 세액은 위택스 또는 관할 지자체로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 누락·정정</span>'+
  '<h1>‘1세대’ 판단이 <span class="hl">핵심</span></h1>'+
  '<div class="sub">1주택이 아니라 ‘1세대 1주택’이 요건이에요.</div>'+
  '<div class="cards">'+
  '<div class="card warn"><h3>특례가 빠지기 쉬운 경우</h3><ul><li>세대 분리가 안 돼 다주택으로 잡힘(같은 세대원이 다른 집 보유)</li><li>공동명의·상속으로 소유관계 변경</li><li>전입·주소 변경 미반영</li><li>오피스텔·분양권 등으로 주택 수 증가</li></ul></div>'+
  '<div class="card"><h3>누락됐다면</h3><p>지자체(시·군·구 세무부서)에 정정 요청하면 다음 고지부터 반영돼요. 이미 낸 과다분은 <b>경정청구</b>로 환급받을 수 있어요(법정 기한 내).</p></div>'+
  '<div class="card gray"><h3>같은 세대 주의</h3><p>주민등록상 함께 있는 가족이 다른 주택을 가지면 특례가 안 돼요. <b>분가·전입 여부</b>를 꼭 확인하세요.</p></div>'+
  '</div>'+
  foot("출처 : 지방세법 · 행정안전부 안내<br>정확한 세액은 위택스 또는 관할 지자체로 확인하세요.")
 )
});

// 26. 공시가격
writeSet("2026-11-27_공시가격",{
 thumb: sqbg("2026 · 공시가격","공시가격이 시세랑<br><span class=\"y\">왜 다르지?</span>","세금 기준 가격 · 알리미로<br><span style=\"color:#FFD400\">내 집</span> 공시가 확인"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 공시가격</span>'+
  '<h1>세금을 매기는 <span class="hl">기준 가격</span></h1>'+
  '<div class="sub">정부가 매년 산정·공시하며, 보통 시세보다 낮아요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>재산세의 출발점</h3><p>재산세 과세표준 = 공시가격 × 공정시장가액비율. 그래서 공시가격이 재산세·종부세·건보료의 공통 출발점이에요.</p></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>집 유형</th><th>확인할 가격(기관)</th></tr>'+
  '<tr><td>아파트·연립·다세대</td><td>공동주택 공시가격(국토부)</td></tr>'+
  '<tr><td>단독·다가구</td><td>개별단독주택 공시가격(시·군·구)</td></tr>'+
  '<tr><td>토지</td><td>개별공시지가(시·군·구)</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 부동산 가격공시에 관한 법률 · 공시가격 알리미<br>realtyprice.kr에서 내 집 공시가격을 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 확인·이의</span>'+
  '<h1><span class="hl">알리미</span>에서 확인하세요</h1>'+
  '<div class="sub">부동산 공시가격 알리미(realtyprice.kr)에서 조회해요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>확인 방법</h3><ul><li>① 사이트에서 ‘공동주택 공시가격’ 선택</li><li>② 주소 입력해 내 세대 공시가격 조회</li><li>③ 열람 기간이면 ‘의견 제출’로 이의 신청</li></ul></div>'+
  '<div class="card warn"><h3>과하면 이의를 낼 수 있어요</h3><p>내 집 공시가격이 시세·유사 주택보다 과도하게 높으면 <b>열람 기간</b>에 의견(이의)을 낼 수 있어요. 받아들여지면 재산세·종부세·건보료가 함께 낮아질 수 있어요.</p></div>'+
  '<div class="card gray"><h3>열람 기간은 짧아요</h3><p>보통 몇 주예요. 상반기 공시 시즌에 한 번 확인하는 습관을 들이면 과다 산정을 바로잡을 기회를 놓치지 않아요.</p></div>'+
  '</div>'+
  foot("출처 : 부동산 공시가격 알리미(realtyprice.kr)<br>열람·의견청취 일정은 국토교통부 공시 일정으로 확인하세요.")
 )
});

// 27. 재산세 7·9월
writeSet("2026-11-27_재산세시기",{
 thumb: sqbg("2026 재산세 · 납부시기","7월에 냈는데<br><span class=\"y\">9월에 또?</span>","중복 아니에요 · 재산 종류별<br><span style=\"color:#FFD400\">시기</span>가 달라요"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 재산세 시기</span>'+
  '<h1>재산 종류별 <span class="hl">부과 시기</span></h1>'+
  '<div class="sub">중복이 아니라 재산 종류에 따라 내는 시기가 달라요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>시기</th><th>부과 대상</th></tr>'+
  '<tr class="hlrow"><td>7월(16~31일)</td><td>주택분 1/2 + 건축물 + 선박·항공기</td></tr>'+
  '<tr><td>9월(16~30일)</td><td>주택분 나머지 1/2 + 토지</td></tr></table></div>'+
  '<div class="card formula"><h3>주택분을 왜 반반?</h3><p>한 번에 내면 부담이 커서 7·9월로 분산해요. 다만 주택분 연세액이 <b>20만원 이하</b>면 나누지 않고 7월에 한 번에 부과돼요. ‘9월에 안 왔다’면 세액이 적어 7월 일괄인 경우가 많아요.</p></div>'+
  '</div>'+
  foot("출처 : 지방세법(재산세 납기)<br>정확한 세액·납기는 위택스 또는 관할 지자체로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 기한·주의</span>'+
  '<h1>기준일은 똑같이 <span class="hl">6월 1일</span></h1>'+
  '<div class="sub">분납 시기가 다를 뿐 ‘누가 내느냐’는 6월 1일로 정해져요.</div>'+
  '<div class="cards">'+
  '<div class="card warn"><h3>납부기한 넘기면 가산금</h3><p>7월분 <b>7월 31일</b>, 9월분 <b>9월 30일</b>까지. 넘기면 가산금(3%)이 붙고, 일정 금액 이상이면 중가산금이 추가될 수 있어요.</p></div>'+
  '<div class="card"><h3>고지서를 자꾸 놓친다면</h3><p>위택스 <b>전자송달·자동납부</b>를 신청하면 편하고, 소액이지만 세액공제도 있어요. 분실해도 위택스·인터넷지로에서 조회해 바로 낼 수 있어요.</p></div>'+
  '<div class="card gray"><h3>11월 통지와 헷갈리지 마세요</h3><p>재산세는 7·9월이에요. 11월 하순 세금 고지서는 <b>종부세(12/15)</b>, 같은 시기 건보료는 재산세 과세표준이 11월 정기결정에 반영된 결과예요.</p></div>'+
  '</div>'+
  foot("출처 : 지방세법 · 위택스 안내<br>정확한 세액·납기는 위택스 또는 관할 지자체로 확인하세요.")
 )
});

// 28. 조회·납부
writeSet("2026-11-27_조회납부",{
 thumb: sqbg("2026 재산세 · 조회·납부","고지서 잃어버려도<br><span class=\"y\">집에서 납부</span>","위택스 · 인터넷지로<br><span style=\"color:#FFD400\">카드 수수료 0원</span>"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 조회·납부</span>'+
  '<h1>고지서 없어도 <span class="hl">온라인</span>으로</h1>'+
  '<div class="sub">종이 고지서를 못 찾아도 집에서 쉽게 조회·납부돼요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>1. 위택스(Wetax) — 지방세 대표</h3><ul><li>로그인(공동인증서·간편인증)</li><li>‘납부하기’·‘지방세’에서 재산세 조회</li><li>계좌이체·카드납부 선택(모바일 ‘스마트위택스’)</li></ul></div>'+
  '<div class="card"><h3>2. 인터넷지로</h3><p>고지서의 <b>전자납부번호</b>로 조회해 납부해요. 위택스 로그인이 번거로우면 번호만으로 간편하게 낼 수 있어요.</p></div>'+
  '<div class="card gray"><h3>3. 그 외</h3><p>ARS 전화, 은행 CD/ATM·창구·가상계좌, 카드사 앱(지방세 납부)에서도 돼요.</p></div>'+
  '</div>'+
  foot("출처 : 위택스(wetax.go.kr) · 인터넷지로<br>정확한 세액은 위택스에서 조회하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 꿀팁</span>'+
  '<h1>카드납부 <span class="hl">수수료 없어요</span></h1>'+
  '<div class="sub">지방세는 카드 수수료가 납세자에게 붙지 않아요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>카드납부가 이득</h3><p>무이자 할부로 부담을 나누고, 포인트·캐시백 이벤트를 챙기면 오히려 이득이에요. <b>7·9월 납부철</b>엔 카드사 프로모션이 몰리니 비교해보세요.</p></div>'+
  '<div class="card"><h3>전자송달·자동납부 추천</h3><p>종이 고지서 대신 전자송달로 받거나 자동납부를 걸면 분실 걱정이 줄고 <b>소액 세액공제</b>도 받아요.</p></div>'+
  '<div class="card gray"><h3>가족 세금도 대납 가능</h3><p>본인 명의가 아니어도 <b>전자납부번호</b>만 있으면 가족의 재산세를 대신 낼 수 있어요. 기한(7/31·9/30)은 꼭 지키세요.</p></div>'+
  '</div>'+
  foot("출처 : 위택스 · 인터넷지로 안내<br>정확한 세액은 위택스에서 조회하세요.")
 )
});
console.log("gen4b done");
