const {page,sqbg,foot,writeSet}=require("./genlib.js");

// 겨울피부 (winter-dry-skin-itch)
writeSet("2026-11-27_겨울피부",{
 thumb: sqbg("알고살자 · 겨울 건강","겨울 피부 가려움<br><span class=\"y\">벅벅 긁으면 악순환</span>","샤워 후 <span style=\"color:#FFD400\">3분 보습</span><br>미지근한 물 · 습도 40~60%"),
 info1: page(
  '<span class="eyebrow">겨울 건강 · 피부 가려움</span>'+
  '<h1>겨울에 더 <span class="hl">가려운 이유</span></h1>'+
  '<div class="sub">피부 보호막이 얇아지고 수분을 빼앗기면서 작은 자극에도 가려워져요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>왜 겨울에 심할까</h3><ul><li>기온이 낮아 <b>피지 분비가 줄어</b> 보호막이 얇아짐</li><li>난방으로 건조한 공기가 <b>각질층 수분</b>을 빼앗음</li><li>긁으면 보호막이 더 벗겨져 <b>악순환</b></li></ul></div>'+
  '<div class="card warn"><h3>오래가면 다른 원인일 수도</h3><p>가려움이 심하거나 오래가면 접촉성·아토피 피부염, 건선 같은 피부 질환이나 <b>빈혈·당뇨·갑상선 질환</b>이 숨어 있을 수 있어요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보 · 정보 제공 목적<br>증상이 지속되면 피부과 전문의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">겨울 건강 · 관리법</span>'+
  '<h1>핵심은 <span class="hl">샤워 직후 보습</span></h1>'+
  '<div class="sub">덜 뜨겁게 씻고, 바로 보습하고, 습도를 맞추는 세 가지면 한결 편해져요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>관리 핵심</th><th>방법</th></tr>'+
  '<tr class="hlrow"><td>샤워 직후 보습</td><td><b>3분 이내</b> 바르기</td></tr>'+
  '<tr><td>미지근한 물</td><td>10분 이내 짧게</td></tr>'+
  '<tr><td>장벽 강화 보습제</td><td>세라마이드 등</td></tr>'+
  '<tr><td>실내 습도</td><td>40~60% 유지</td></tr></table></div>'+
  '<div class="card gray"><h3>생활 속 습관</h3><ul><li>카페인·알코올 줄이고 물 충분히</li><li>부드러운 <b>면 소재</b> 옷</li><li>가려울 땐 긁지 말고 <b>냉찜질</b></li></ul></div>'+
  '<div class="card warn"><h3>이럴 땐 피부과</h3><p>진물·균열이 생기거나 잠을 설칠 만큼 가려움이 이어지면 보습만으로는 어려워요. 스테로이드 연고 <b>남용은 금물</b>이에요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보<br>증상이 지속되면 피부과 전문의와 상담하세요.")
 )
});

// 겨울관절 (winter-joint-pain-care)
writeSet("2026-11-27_겨울관절",{
 thumb: sqbg("알고살자 · 겨울 건강","겨울 관절 통증<br><span class=\"y\">왜 더 아플까</span>","보온·스트레칭으로 관리<br><span style=\"color:#FFD400\">병원 신호</span>도 체크"),
 info1: page(
  '<span class="eyebrow">겨울 건강 · 관절 통증</span>'+
  '<h1>추우면 관절이 <span class="hl">뻣뻣</span>해져요</h1>'+
  '<div class="sub">근육·인대가 굳고 혈류가 줄어 작은 자극에도 통증이 커지기 쉬워요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>요인</th><th>관절에 미치는 영향</th></tr>'+
  '<tr class="hlrow"><td>기온 저하</td><td>근육·인대 굳고 혈류 줄어 뻣뻣·통증</td></tr>'+
  '<tr><td>활동량 감소</td><td>근력·유연성 떨어져 부담 증가</td></tr>'+
  '<tr><td>기압 변화</td><td>불편감 커진다는 설명(원인 뚜렷하지 않음)</td></tr>'+
  '<tr><td>빙판길 낙상</td><td>무릎·손목 직접 손상</td></tr></table></div>'+
  '<div class="card gray"><h3>손가락도 민감</h3><p>손가락은 가늘고 혈류가 적어 추위에 민감해 겨울에 뻣뻣함을 더 느껴요. 단, 여러 마디가 붓고 아침 강직이 오래가면 진료가 필요해요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보 · 정보 제공 목적<br>증상이 지속되면 정형외과 전문의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">겨울 건강 · 관리·신호</span>'+
  '<h1>기본은 <span class="hl">보온</span>이에요</h1>'+
  '<div class="sub">따뜻하게 감싸고 조금씩 움직이는 습관으로 부담을 덜어요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>집에서 하는 관리</h3><ul><li>무릎·손목·목 <b>따뜻하게</b> 감싸기, 온찜질</li><li>아침에 이불 속에서 <b>가벼운 스트레칭</b></li><li>실내 걷기로 활동량 유지(무리는 금물)</li><li>겨울 과식 주의 — <b>체중 관리</b></li></ul></div>'+
  '<div class="card warn"><h3>이럴 땐 정형외과</h3><ul><li>관절이 붓고 <b>열감</b>·피부색 변화</li><li>밤에 잠을 깰 정도의 통증</li><li>아침 <b>뻣뻣함이 30분~1시간 이상</b></li><li>무릎이 잠겨 펴지지 않거나 꺾이는 느낌</li></ul></div>'+
  '<div class="card gray"><h3>온찜질 vs 냉찜질</h3><p>굳고 뻣뻣하면 <b>온찜질</b>, 붓고 열나며 급성이면 <b>냉찜질</b>이 나아요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보<br>증상이 지속되면 정형외과 전문의와 상담하세요.")
 )
});

// 안구건조 (winter-dry-eye-relief)
writeSet("2026-11-27_안구건조",{
 thumb: sqbg("알고살자 · 겨울 건강","겨울 안구건조증<br><span class=\"y\">뻑뻑·모래알</span>","의식적 깜빡임·온찜질<br><span style=\"color:#FFD400\">인공눈물</span> 바로 쓰기"),
 info1: page(
  '<span class="eyebrow">겨울 건강 · 안구건조증</span>'+
  '<h1>겨울에 눈이 <span class="hl">더 마르는</span> 이유</h1>'+
  '<div class="sub">메마른 공기와 줄어든 깜빡임이 눈물막을 빠르게 말려요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>왜 건조해질까</h3><ul><li>찬 바람·난방으로 <b>눈물막이 빠르게 증발</b></li><li>화면에 집중하면 깜빡임이 <b>분당 15~20회 → 4~5회</b></li><li>콘택트렌즈도 수분을 빼앗는 요인</li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>방법</th><th>핵심</th></tr>'+
  '<tr class="hlrow"><td>습도·온도</td><td>습도 40~60%, 온도 18~22도</td></tr>'+
  '<tr><td>깜빡임</td><td>20~30분마다 의식적으로</td></tr>'+
  '<tr><td>눈 휴식</td><td>1시간에 10분, 먼 곳 보기</td></tr>'+
  '<tr><td>온찜질</td><td>따뜻한 물수건 5~10분</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보 · 정보 제공 목적<br>증상이 지속되면 안과 전문의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">겨울 건강 · 인공눈물·신호</span>'+
  '<h1><span class="hl">인공눈물</span> 바르게 쓰기</h1>'+
  '<div class="sub">횟수만 늘리기보다 원인을 확인하는 게 먼저예요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>인공눈물 사용법</h3><ul><li>1회용은 <b>첫 한 방울을 버리고</b> 사용</li><li>불편하다고 횟수만 계속 늘리지 않기</li><li>혈관수축제 성분은 오래 쓰면 주의</li></ul></div>'+
  '<div class="card gray"><h3>생활 습관</h3><ul><li>물 자주 마셔 몸 전체 수분 채우기</li><li>난방·에어컨 바람이 <b>눈에 직접 닿지 않게</b></li><li>자기 전 스마트폰 오래 보기 주의</li></ul></div>'+
  '<div class="card warn"><h3>이럴 땐 안과</h3><p>충혈·통증·시야 흐림이 가라앉지 않거나 인공눈물을 써도 뻑뻑함이 반복되면 검사를 받으세요. 방치하면 <b>각막 손상</b> 위험이 있어요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보<br>증상이 지속되면 안과 전문의와 상담하세요.")
 )
});

// 수족냉증 (cold-hands-feet-foods)
writeSet("2026-11-27_수족냉증",{
 thumb: sqbg("알고살자 · 건강음식","손발 차가울 때<br><span class=\"y\">몸 덥히는 음식</span>","생강·마늘·단호박 <span style=\"color:#FFD400\">7가지</span><br>카페인·찬 음료는 피하기"),
 info1: page(
  '<span class="eyebrow">건강음식 · 수족냉증</span>'+
  '<h1>몸을 덥히는 <span class="hl">음식</span>부터</h1>'+
  '<div class="sub">손발이 찬 가장 흔한 배경은 말초 혈액순환 저하예요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>식품</th><th>기대하는 점</th></tr>'+
  '<tr class="hlrow"><td>생강·계피</td><td>속을 덥혀 혈류 개선</td></tr>'+
  '<tr><td>마늘</td><td>알리신이 혈관 확장 도움</td></tr>'+
  '<tr><td>부추·고추</td><td>따뜻한 성질로 분류</td></tr>'+
  '<tr><td>등푸른생선</td><td>오메가-3로 혈액 흐름</td></tr>'+
  '<tr><td>단호박</td><td>식후 체온 저하 완화</td></tr></table></div>'+
  '<div class="card warn"><h3>오히려 피하면 좋은 것</h3><p><b>카페인</b>(특히 찬 커피)은 혈관을 수축시켜요. 찬 음료·아이스크림·흡연도 손발을 더 차게 만들 수 있어요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 정보 제공 목적<br>증상이 심하면 전문의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 생활·신호</span>'+
  '<h1>음식만큼 <span class="hl">생활습관</span></h1>'+
  '<div class="sub">따뜻한 음식과 꾸준한 움직임으로 몸을 데우는 습관이 먼저예요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>생활습관</h3><ul><li>꽉 끼지 않는 옷 겹쳐 입고 장갑·양말·모자</li><li>반신욕·족욕은 <b>미지근한 물</b>로 천천히</li><li>유산소+근력 운동(틈틈이 <b>까치발 서기</b>)</li><li>식사 거르지 않기 — 체온 유지</li></ul></div>'+
  '<div class="card warn"><h3>이럴 땐 진료</h3><p>손발 저림이 심하거나 관절통·체중 감소·창백함·숨 가쁨·다리 부종이 함께면 <b>빈혈·혈관·갑상선 질환</b> 신호일 수 있어요.</p></div>'+
  '<div class="card gray"><h3>알아두기</h3><p>서양의학엔 ‘냉증’ 병명이 따로 없어 대개 <b>증상</b>으로 봐요. 음식 하나로 낫기보다 꾸준한 관리가 중요해요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>증상이 지속되면 전문의와 상담하세요.")
 )
});

// 면역음식 (immunity-boosting-foods)
writeSet("2026-11-27_면역음식",{
 thumb: sqbg("알고살자 · 건강음식","면역력에 좋은 음식<br><span class=\"y\">환절기 대비</span>","발효식품·마늘·버섯<br>음식보다 센 건 <span style=\"color:#FFD400\">잠</span>"),
 info1: page(
  '<span class="eyebrow">건강음식 · 면역력</span>'+
  '<h1>면역의 상당 부분은 <span class="hl">장(腸)</span></h1>'+
  '<div class="sub">특정 음식 하나보다 다양하게 골고루가 핵심이에요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>먼저 핵심만</h3><ul><li>면역세포 상당수가 장에 — <b>발효식품</b>이 중요</li><li>한 가지보다 <b>다양하게 골고루</b></li><li>음식보다 센 건 결국 <b>충분한 잠</b></li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>음식</th><th>포인트</th></tr>'+
  '<tr class="hlrow"><td>발효식품</td><td>김치·요거트·된장 — 장내 유익균</td></tr>'+
  '<tr><td>마늘·생강</td><td>감기 기운에 챙기던 식재료</td></tr>'+
  '<tr><td>버섯류</td><td>표고·느타리 — 면역 돕는 성분</td></tr>'+
  '<tr><td>제철 과채(비타민C)</td><td>귤·키위·딸기·파프리카</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 정보 제공 목적<br>증상이 지속되면 전문의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 습관</span>'+
  '<h1>음식만큼, 아니 더 중요한 <span class="hl">습관</span></h1>'+
  '<div class="sub">좋은 걸 아무리 먹어도 밤을 새우면 소용없어요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>면역을 받치는 습관</h3><ul><li><b>충분한 잠</b> — 음식보다 강력</li><li>몸을 따뜻하게, 체온 유지</li><li>생강차 같은 따뜻한 음료로 환절기 대비</li></ul></div>'+
  '<div class="card gray"><h3>우리 식문화의 강점</h3><p>김치·청국장·된장 같은 전통 발효식품이 식탁에 자주 오르는 것만으로도 꽤 든든한 셈이에요.</p></div>'+
  '<div class="card formula"><h3>겨울 실천 팁</h3><p>귤 두어 개씩 챙겨 비타민C를 보충하고, 버섯은 국·볶음으로 쉽게 올려요. 신기한 비법보다 <b>꾸준함</b>이 답이에요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>증상이 지속되면 전문의와 상담하세요.")
 )
});

// 비타민D (winter-vitamin-d-foods)
writeSet("2026-11-27_비타민D",{
 thumb: sqbg("알고살자 · 건강음식","겨울 비타민D<br><span class=\"y\">음식으로 채우기</span>","연어·달걀노른자·<span style=\"color:#FFD400\">말린 버섯</span><br>기름과 함께 흡수 ↑"),
 info1: page(
  '<span class="eyebrow">건강음식 · 비타민D</span>'+
  '<h1>겨울엔 <span class="hl">음식으로</span> 챙겨요</h1>'+
  '<div class="sub">해가 짧고 야외활동이 줄어 몸속 합성량이 떨어져요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>왜 부족해질까</h3><ul><li>비타민D는 피부가 <b>자외선 B</b>를 받아 스스로 생성</li><li>겨울엔 해가 짧아 합성량 저하</li><li><b>유리창 햇볕으론 거의 안 생겨요</b></li></ul></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>식품</th><th>특징</th></tr>'+
  '<tr class="hlrow"><td>기름진 생선(연어·고등어)</td><td>대표 공급원, 한 끼로 든든</td></tr>'+
  '<tr><td>달걀 노른자</td><td>매일 챙기기 좋음(흰자 X)</td></tr>'+
  '<tr><td>버섯(표고·목이)</td><td>햇볕에 <b>말리면 함량↑</b></td></tr>'+
  '<tr><td>우유·강화식품</td><td>꾸준히 마시기 쉬움</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 한국영양학회 기준 소개<br>정확한 상태는 혈액검사(25(OH)D)로 확인하세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 섭취량·흡수</span>'+
  '<h1>하루 <span class="hl">얼마나</span> 먹을까</h1>'+
  '<div class="sub">기준이 조금씩 다르니 과잉만 주의하면 돼요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>구분</th><th>양</th></tr>'+
  '<tr class="hlrow"><td>성인 충분섭취량</td><td>하루 <b>10㎍(400IU)</b> 수준</td></tr>'+
  '<tr><td>권하는 자료</td><td>15㎍(600IU)</td></tr>'+
  '<tr><td>상한섭취량(12세+)</td><td>100㎍(4000IU)</td></tr></table><p style="margin-top:10px;font-size:26px;color:#5A6472">1㎍ = 40IU · 보충제 겹쳐 먹을 때 과잉 주의</p></div>'+
  '<div class="card formula"><h3>흡수를 높이는 습관</h3><ul><li>비타민D는 <b>지용성</b> — 기름과 함께 먹으면 흡수↑ (달걀 부침·올리브유)</li><li>낮에 <b>20~30분 산책</b>으로 합성 보탬(개인차 큼)</li></ul></div>'+
  '<div class="card warn"><h3>알아두기</h3><p>고용량 한 번에 먹는 게 꼭 이득은 아니에요. <b>상한섭취량을 넘지 않게</b> 하고 복용량은 전문가와 상의하세요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 한국영양학회 기준 소개<br>복용량은 전문가와 상의하세요.")
 )
});
console.log("gen5 done");
