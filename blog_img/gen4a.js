const {page,sqbg,foot,writeSet}=require("./genlib.js");

// 16. 본인부담상한제
writeSet("2026-11-27_본인부담상한",{
 thumb: sqbg("2026 건강보험 · 본인부담상한제","병원비 많이 쓴 해<br><span class=\"y\">돌려받으세요</span>","1년 본인부담금이 상한 넘으면<br><span style=\"color:#FFD400\">초과분 환급</span>"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 본인부담상한제</span>'+
  '<h1>상한 넘은 <span class="hl">본인부담금</span>은 돌려줘요</h1>'+
  '<div class="sub">1년(1~12월) 건강보험 본인부담금이 소득분위별 상한을 넘으면 초과분을 환급해요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>핵심 구조</h3><ul><li>기간 : 매년 <b>1월~12월</b> 합산</li><li>상한액 : <b>소득분위별</b>로 다름(낮을수록 상한도 낮아 혜택 큼)</li><li>초과분을 공단이 <span class="ok">환급</span></li></ul></div>'+
  '<div class="card"><h3>두 가지 방식</h3><ul><li><b>사전급여</b> : 같은 병원에서 최고 상한 초과 시 병원이 공단에 직접 청구</li><li><b>사후환급</b> : 여러 병원 합산해 상한 초과분을 <b>다음 해</b> 공단이 계산·환급</li></ul><p style="margin-top:8px">대부분 사후환급으로 이듬해 안내돼요.</p></div>'+
  '</div>'+
  foot("출처 : 국민건강보험법(본인부담상한제) · 공단 안내<br>정확한 상한액·대상은 국민건강보험공단(1577-1000)으로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 제외·확인</span>'+
  '<h1><span class="hl">비급여</span>는 빠져요</h1>'+
  '<div class="sub">건강보험이 적용된 본인부담금만 계산 대상이에요.</div>'+
  '<div class="cards">'+
  '<div class="card warn"><h3>상한제에서 제외</h3><p>비급여, 선별급여, 2·3인실 상급병실료 일부, 임플란트, 미용·성형 등은 <b>빠져요.</b> 실제 쓴 병원비 전부가 환급 기준이 되는 건 아니에요.</p></div>'+
  '<div class="card"><h3>이런 분은 꼭 확인</h3><ul><li>입원·수술로 병원비가 많이 나온 분</li><li>암·만성질환 장기 치료 중인 분</li><li>소득이 낮은데 의료비 지출이 컸던 분</li></ul></div>'+
  '<div class="card gray"><h3>어떻게 확인하나</h3><p>공단 안내문이 오지만 주소 변경 등으로 못 받을 수 있어요. <b>The건강보험 앱</b>이나 <b>1577-1000</b>으로 직접 조회하는 게 안전해요.</p></div>'+
  '</div>'+
  foot("출처 : 국민건강보험공단 본인부담상한제 안내<br>정확한 금액은 국민건강보험공단(1577-1000)으로 확인하세요.")
 )
});

// 17. 4대보험 2026
writeSet("2026-11-27_4대보험",{
 thumb: sqbg("2026 · 4대보험","2026 4대보험<br><span class=\"y\">얼마 오르나?</span>","월급 300만원 기준<br>본인부담 약 <span style=\"color:#FFD400\">29만원</span>"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 4대보험 요율</span>'+
  '<h1>2026 요율, <span class="hl">국민연금</span>이 핵심</h1>'+
  '<div class="sub">국민연금이 9%→9.5%로 올랐고, 이후 매년 0.5%p씩 올라 최종 13% 예정이에요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>구분</th><th>요율</th><th>근로자 본인</th></tr>'+
  '<tr class="hlrow"><td>국민연금</td><td>9.5%</td><td><b>4.75%</b></td></tr>'+
  '<tr><td>건강보험</td><td>7.19%</td><td>3.595%</td></tr>'+
  '<tr><td>장기요양</td><td colspan="2">건보료의 13.14%</td></tr>'+
  '<tr><td>고용(실업급여)</td><td>1.8%</td><td>0.9%</td></tr>'+
  '<tr><td>산재</td><td colspan="2">업종별 · 전액 사업주 부담</td></tr></table></div>'+
  '<div class="card gray"><h3>산재는 월급에서 안 빠져요</h3><p>산재보험은 전액 회사 부담이라, 명세서엔 보통 <b>국민연금·건강·장기요양·고용</b> 4개만 찍혀요.</p></div>'+
  '</div>'+
  foot("출처 : 2026년 국민연금·건강보험·고용보험 요율<br>정확한 금액은 각 공단 또는 4대사회보험 정보연계센터로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 월급 300만원 예시</span>'+
  '<h1>월급 300만원 <span class="hl">본인부담</span></h1>'+
  '<div class="sub">비과세가 없다고 가정한 근로자 본인부담이에요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>항목</th><th>본인부담</th></tr>'+
  '<tr><td>국민연금</td><td><b>142,500원</b></td></tr>'+
  '<tr><td>건강보험</td><td><b>107,850원</b></td></tr>'+
  '<tr><td>장기요양</td><td>약 14,170원</td></tr>'+
  '<tr><td>고용보험</td><td>27,000원</td></tr>'+
  '<tr class="hlrow"><td>합계</td><td class="ok">약 291,520원</td></tr></table></div>'+
  '<div class="card formula"><h3>비과세가 실수령을 바꿔요</h3><p>식대(월 20만원 한도)·자가운전보조금 같은 비과세가 많으면 보수월액이 줄어 보험료도 줄어요. 같은 연봉이라도 <b>비과세 설계</b>로 실수령이 달라져요.</p></div>'+
  '<div class="card gray"><h3>건강보험 4월 정산 참고</h3><p>건강보험은 매년 4월에 작년 보수로 정산해요. 작년에 급여가 올랐다면 4월에 추가될 수 있지만 <b>5월엔 원래대로</b> 돌아가요.</p></div>'+
  '</div>'+
  foot("출처 : 2026년 4대보험 요율 기준 계산 예시<br>정확한 금액은 4대사회보험 정보연계센터 모의계산으로 확인하세요.")
 )
});

// 18. 재산세 인상 이유
writeSet("2026-11-27_재산세인상",{
 thumb: sqbg("2026 재산세 · 인상","공시가 조금 올랐는데<br><span class=\"y\">세금은 왜 더?</span>","누진세율 · 과세표준상한 5%<br><span style=\"color:#FFD400\">구조</span>로 이해하기"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 재산세 구조</span>'+
  '<h1>재산세는 <span class="hl">3단계</span>로 정해져요</h1>'+
  '<div class="sub">공시가격만 오른 것 같아도 세액은 더 오를 수 있어요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>계산 3단계</h3><ul><li>① 공시가격 × 공정시장가액비율 = 과세표준</li><li>② 과세표준 × 세율 − 누진공제 = 본세</li><li>③ 본세 + 지방교육세(본세의 20%)</li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>공정시장가액비율(2026 주택)</th><th>비율</th></tr>'+
  '<tr class="hlrow"><td>1세대 1주택 (3억 이하 / 3~6억 / 6억 초과)</td><td><b>43 / 44 / 45%</b></td></tr>'+
  '<tr><td>일반(다주택 등)</td><td>60%</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 지방세법 · 2026년 공정시장가액비율<br>정확한 세액은 위택스 또는 관할 지자체로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 왜 올랐나</span>'+
  '<h1>상한 눌러도 <span class="hl">누진</span>이라 올라요</h1>'+
  '<div class="sub">과세표준상한제가 있어도 세액 자체는 오를 수 있어요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>과세표준상한제(상한율 5%)</h3><p>공시가가 급등해도 과세표준이 한 해에 확 뛰지 않게 눌러줘요. 다만 ‘천천히 오르게’ 할 뿐 <b>‘안 오르게’</b> 하는 건 아니에요.</p></div>'+
  '<div class="card warn"><h3>핵심 — 세율이 누진</h3><p>재산세는 구간이 올라갈수록 세율이 높아지는 <b>누진</b> 구조라, 공시가가 조금만 올라 상위 구간에 걸치면 체감이 커져요.</p></div>'+
  '<div class="card gray"><h3>1주택 특례 누락 확인</h3><p>세대 분리·공동명의·전입 미반영 등으로 특례가 빠질 수 있어요. 고지서의 공정시장가액비율이 <b>60%</b>면 특례 누락을 의심하세요(1주택은 43~45%).</p></div>'+
  '</div>'+
  foot("출처 : 지방세법(재산세) · 국세청·행정안전부 안내<br>정확한 세액은 위택스 또는 관할 지자체로 확인하세요.")
 )
});

// 19. 공동명의 종부세
writeSet("2026-11-27_공동명의",{
 thumb: sqbg("2026 종부세 · 공동명의","부부 공동명의<br><span class=\"y\">어느 쪽 유리?</span>","각자 9억 vs 1주택 특례<br><span style=\"color:#FFD400\">비교</span>해서 선택"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 공동명의 종부세</span>'+
  '<h1>두 방식 중 <span class="hl">유리한 쪽</span>을 선택</h1>'+
  '<div class="sub">부부 공동명의는 과세 방식을 고를 수 있어요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>방식</th><th>공제</th><th>세액공제</th></tr>'+
  '<tr><td>지분별(기본)</td><td>각자 9억<br>(합 <b>18억</b>)</td><td class="no">못 받음</td></tr>'+
  '<tr class="hlrow"><td>1주택 특례 신청</td><td><b>12억</b></td><td class="ok">최대 80%</td></tr></table></div>'+
  '<div class="card formula"><h3>쉽게 기억하기</h3><ul><li>젊고 보유기간 짧으면 → <b>각자 9억(합 18억)</b></li><li>고령·장기보유면 → <b>1주택 특례(12억+세액공제)</b></li></ul></div>'+
  '</div>'+
  foot("출처 : 종합부동산세법(공동명의 1주택 특례) · 국세청 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 숫자로 감 잡기</span>'+
  '<h1>매년 <span class="hl">9월</span>에 다시 고를 수 있어요</h1>'+
  '<div class="sub">특례는 신청해야 적용되고, 해마다 유리한 쪽을 새로 선택할 수 있어요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>숫자 예시</h3><ul><li>공시가 합계 <b>16억</b> → 각자 9억(합 18억)으로 종부세 <span class="ok">0원</span> 가능</li><li>공시가 <b>20억</b>·70대·15년 보유 → 1주택 특례(12억+세액공제 80%)가 유리할 수 있음</li></ul></div>'+
  '<div class="card warn"><h3>신청 안 하면 기본 과세</h3><p>1주택 특례는 <b>매년 9월에 신청</b>해야 적용돼요. 신청하지 않으면 지분별(기본)로 과세돼요.</p></div>'+
  '<div class="card gray"><h3>공동명의의 장점</h3><p>단독명의보다 공제 합계(18억)가 커서, <b>중저가 구간</b>에서는 공동명의가 종부세에 유리한 경우가 많아요.</p></div>'+
  '</div>'+
  foot("출처 : 종합부동산세법 · 국세청 2026 안내<br>정확한 세액은 홈택스 또는 국세청 국세상담센터(126)로 확인하세요.")
 )
});

// 21. 과세표준(책정 기준)
writeSet("2026-11-27_과세표준",{
 thumb: sqbg("2026 재산세 · 책정기준","옆집이랑 재산세<br><span class=\"y\">왜 다르지?</span>","공시가·공정가액·세율<br><span style=\"color:#FFD400\">3단계</span>로 정해져요"),
 info1: page(
  '<span class="eyebrow">2026년 기준 · 재산세 책정</span>'+
  '<h1>세 가지 축으로 <span class="hl">세금이 갈려요</span></h1>'+
  '<div class="sub">같은 단지라도 옆집과 재산세가 다른 이유예요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>재산세 3단계</h3><ul><li>① 공시가격 × 공정시장가액비율 = 과세표준</li><li>② 과세표준 × 세율 − 누진공제 = 본세</li><li>③ 본세 + 지방교육세(본세의 20%)</li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>공정시장가액비율(2026 주택)</th><th>비율</th></tr>'+
  '<tr class="hlrow"><td>1세대 1주택 (3억↓/3~6억/6억↑)</td><td><b>43 / 44 / 45%</b></td></tr>'+
  '<tr><td>일반(다주택 등)</td><td>60%</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 지방세법 · 부동산 공시가격 알리미<br>정확한 세액은 위택스 또는 관할 지자체로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 기준 · 옆집과 차이</span>'+
  '<h1>세율은 <span class="hl">누진</span>이에요</h1>'+
  '<div class="sub">1세대 1주택은 공시가 9억 이하 구간에서 특례세율을 받아요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>세율 — 누진 + 특례</h3><p>과세표준 구간이 올라갈수록 세율이 높아져요. 1세대 1주택은 9억 이하 구간에서 <b>특례세율(0.05~0.35%)</b>로 일반보다 0.05%p 낮아요. 여기에 지방교육세(20%)가 더해져요.</p></div>'+
  '<div class="card gray"><h3>옆집과 다른 이유 — 정리</h3><ul><li>1주택 특례 여부(공정 43~45% vs 60%)</li><li>공시가격 차이(층·향·전용면적)</li><li>세대 구성·다주택 여부</li></ul></div>'+
  '<div class="card warn"><h3>1주택 특례 누락 확인</h3><p>고지서의 공정시장가액비율이 <b>60%</b>면 특례 누락을 의심하세요. 요건을 갖췄는데 빠졌다면 정정 요청하고, 과다분은 <b>경정청구</b>로 환급받을 수 있어요.</p></div>'+
  '</div>'+
  foot("출처 : 지방세법(재산세) · 행정안전부 안내<br>정확한 세액은 위택스 또는 관할 지자체로 확인하세요.")
 )
});

// 22. 성남 재산세 감면 (2026.11)
writeSet("2026-11-27_성남경감",{
 thumb: sqbg("2026.11 · 성남 재산세","성남 재산세<br><span class=\"y\">반값 감면?</span>","11월 부결 · 재추진 방침<br>아직 <span style=\"color:#FFD400\">미확정</span>"),
 info1: page(
  '<span class="eyebrow">2026년 11월 기준 · 성남 재산세</span>'+
  '<h1>어떤 <span class="hl">감면안</span>이었나</h1>'+
  '<div class="sub">6월 1일 기준 1세대 1주택자를 한시 경감하는 조례안이에요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>시가표준액</th><th>경감</th></tr>'+
  '<tr class="hlrow"><td>9억 이하</td><td>표준세율의 <b>50% 경감</b></td></tr>'+
  '<tr><td>9억 초과~12억 이하</td><td><b>20% 경감</b></td></tr></table></div>'+
  '<div class="card warn"><h3>왜 막혔나</h3><p>2026년 11월 시의회 상임위에서 <b>찬성 3·반대 4로 부결</b>됐어요. 무주택자·세입자와의 형평성, 행정안전부의 ‘재해 등에 해당 안 됨’ 유권해석이 쟁점이었어요. 시는 본회의 재추진 방침이에요.</p></div>'+
  '</div>'+
  foot("출처 : 2026년 11월 성남시의회·언론 보도<br>※ 진행 중·미확정 사안이라 이후 결과는 달라질 수 있어요.")
 ),
 info2: page(
  '<span class="eyebrow">2026년 11월 기준 · 정리</span>'+
  '<h1>내 재산세는 <span class="hl">아직</span> 그대로</h1>'+
  '<div class="sub">확정된 감면이 아니에요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>그래서 줄어드나</h3><p>최종 통과돼야 적용되고, <b>연내 처리가 안 되면 폐기</b>될 수 있어요. 다른 지역은 각 지자체 조례라 성남 건과 무관하게 자동 적용되지 않아요.</p></div>'+
  '<div class="card gray"><h3>감면은 ‘동네마다’ 달라요</h3><p>재산세 감면은 지자체 조례로 정해 지역·연도마다 제각각이에요. 내가 사는 <b>시·군·구 공지</b>를 직접 확인하는 게 가장 정확해요.</p></div>'+
  '<div class="card formula"><h3>지금 할 수 있는 것</h3><p>감면과 별개로, <b>1세대 1주택 특례(공정 43~45%·특례세율)</b>가 고지서에 반영됐는지 확인하는 것만으로 세금을 줄일 수 있어요.</p></div>'+
  '</div>'+
  foot("출처 : 2026년 11월 보도 기준<br>※ 이후 결과는 달라질 수 있어요. 관할 시·군·구 공지를 확인하세요.")
 )
});
console.log("gen4a done");
