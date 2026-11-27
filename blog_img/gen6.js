const {page,sqbg,foot,writeSet}=require("./genlib.js");

// 불면증
writeSet("2026-11-27_불면증",{
 thumb: sqbg("알고살자 · 건강정보","잠이 안 오는 밤<br><span class=\"y\">뭐가 문제일까</span>","핵심은 <span style=\"color:#FFD400\">기상 시간 고정</span><br>빛·카페인 관리"),
 info1: page(
  '<span class="eyebrow">건강정보 · 불면증</span>'+
  '<h1>잠은 <span class="hl">기상 시간</span>에서 시작</h1>'+
  '<div class="sub">\'잘 자는 법\'보다 일정한 기상 시간이 먼저예요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>먼저 핵심만</h3><ul><li>잠은 <b>일정한 기상 시간</b>에서 시작</li><li>저녁의 <b>빛·카페인</b>이 생각보다 큰 범인</li><li>잠이 안 오면 억지로 눕지 말고 잠깐 일어났다 오기</li></ul></div>'+
  '<div class="card"><h3>왜 잠이 안 올까</h3><ul><li>불규칙한 생활 리듬(주말 몰아 늦잠)</li><li>자기 직전 스마트폰 빛</li><li>오후의 커피(카페인은 오래 남아요)</li><li>걱정·스트레스, 긴 낮잠·과식·음주</li></ul></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보 · 정보 제공 목적<br>불면이 오래가면 수면 전문 진료를 받으세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강정보 · 숙면 습관</span>'+
  '<h1>약 없이 <span class="hl">수면의 질</span> 높이기</h1>'+
  '<div class="sub">생활을 하나씩 바꾸면 밤잠이 깊어져요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>효과 본 5가지</h3><ul><li>① <b>기상 시간 고정</b>(주말도 1시간 이내 차이)</li><li>② 아침 햇빛 쬐기 — 몸속 시계 맞춤</li><li>③ <b>오후 2시 이후 카페인 끊기</b></li><li>④ 자기 1시간 전 화면 끄고 조명 낮추기</li><li>⑤ 20분 넘게 안 오면 침대에서 나왔다 졸릴 때 눕기</li></ul></div>'+
  '<div class="card warn"><h3>그래도 안 된다면</h3><p>3주 이상 밤마다 잠들기 어렵고 낮 생활에 지장이 크면 혼자 버티지 마세요. 수면제도 <b>전문가 판단 아래 단기간</b>이면 도움이 돼요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강정보<br>불면이 장기간 지속되면 전문가와 상담하세요.")
 )
});

// 숙취
writeSet("2026-11-27_숙취",{
 thumb: sqbg("알고살자 · 건강음식","연말 회식 다음 날<br><span class=\"y\">속이 울렁</span>","북엇국·물·맑은 국물<br><span style=\"color:#FFD400\">해장술·커피</span>는 피하기"),
 info1: page(
  '<span class="eyebrow">건강음식 · 숙취</span>'+
  '<h1>숙취엔 <span class="hl">수분</span>이 먼저</h1>'+
  '<div class="sub">\'즉효 해소법\'은 근거가 약한 편이에요(물·수면이 기본).</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>음식</th><th>핵심</th></tr>'+
  '<tr class="hlrow"><td>물·수분</td><td>가장 기본, 조금씩 자주</td></tr>'+
  '<tr><td>북엇국</td><td>메티오닌·아스파라긴산</td></tr>'+
  '<tr><td>콩나물</td><td>아스파라긴산</td></tr>'+
  '<tr><td>맑은 국물</td><td>자극·나트륨 적게</td></tr></table></div>'+
  '<div class="card gray"><h3>국물은 \'맑은 것\'</h3><p>얼큰하고 짠 해장국은 위 점막을 자극하고 나트륨 때문에 오히려 탈수를 악화시킬 수 있어요. 맑은 국물이 나아요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · BMJ 검토 등 소개<br>증상이 심하면 무리하지 말고 쉬세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 피할 것</span>'+
  '<h1>오히려 <span class="hl">피해야</span> 할 것</h1>'+
  '<div class="sub">가장 확실한 건 물·수면·적당한 음주량이에요.</div>'+
  '<div class="cards">'+
  '<div class="card warn"><h3>피하세요</h3><ul><li><b>해장술</b> — 근거 없고 회복을 늦춤</li><li>자기 전 진통제(아세트아미노펜 간 부담·이부프로펜 위 자극)</li><li>커피·찬 음식 — 분해가 빨라지지 않고 메스꺼움↑</li><li>\'숙취 해소 음료\'도 근거 수준은 낮게 평가</li></ul></div>'+
  '<div class="card formula"><h3>가장 확실한 방법</h3><ul><li>수분 보충 + 충분한 수면</li><li>음주 전 식사로 위 채우기</li><li>가장 현실적인 예방은 <b>음주량 줄이기</b></li></ul></div>'+
  '<div class="card gray"><h3>알아두기</h3><p>땀을 뺀다고 술이 빨리 깨지 않아요. 오히려 탈수가 심해질 수 있어요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>증상이 지속되면 전문의와 상담하세요.")
 )
});

// 혈당
writeSet("2026-11-27_혈당",{
 thumb: sqbg("알고살자 · 건강음식","밥 먹고 쏟아지는<br><span class=\"y\">오후 졸음</span>","혈당 천천히 올리는 음식<br><span style=\"color:#FFD400\">먹는 순서</span>가 반"),
 info1: page(
  '<span class="eyebrow">건강음식 · 혈당</span>'+
  '<h1>핵심은 <span class="hl">천천히</span> 올리기</h1>'+
  '<div class="sub">급하게 오른 혈당이 뚝 떨어지며 졸음·피로가 몰려와요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>먼저 핵심만</h3><ul><li>중요한 건 \'혈당을 <b>얼마나 천천히</b> 올리느냐\'</li><li><b>채소 → 단백질 → 탄수화물</b> 순서로 먹기</li><li>흰쌀·흰빵·단 음료는 혈당을 급하게 올리는 주자</li></ul></div>'+
  '<div class="card"><h3>천천히 올리는 음식</h3><ul><li>잡곡·통곡물(현미·보리·귀리) — 식이섬유가 흡수를 늦춤</li><li>잎채소(양상추·시금치·브로콜리) — 포만감</li><li>콩·두부 — 단백질+식이섬유</li><li>견과류 — 간식으로 한 줌</li></ul></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 정보 제공 목적<br>당뇨 진단·고혈당이면 주치의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 식사 습관</span>'+
  '<h1>음식보다 <span class="hl">먹는 습관</span></h1>'+
  '<div class="sub">종류를 바꾸는 것보다 \'순서\'를 바꾼 게 제일 효과적이었어요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>혈당을 지키는 습관</h3><ul><li>채소 → 단백질 → 밥 순서</li><li>밥은 천천히 꼭꼭 씹어서</li><li>국물에 밥 말아 후루룩 줄이기</li><li><b>식후 10~15분 가벼운 걷기</b> — 근육이 당을 써요</li><li>단 음료는 물·차로 대체</li></ul></div>'+
  '<div class="card warn"><h3>꼭 기억하세요</h3><p>이미 혈당이 높거나 당뇨 진단을 받았다면 <b>식단과 약은 반드시 주치의와 함께</b> 조절해요. 음식은 \'거드는\' 역할이에요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>혈당이 높으면 전문가와 상담하세요.")
 )
});

// 콜레스테롤
writeSet("2026-11-27_콜레스테롤",{
 thumb: sqbg("알고살자 · 건강음식","LDL 빨간 표시<br><span class=\"y\">당황했다면</span>","귀리·콩·등푸른생선<br><span style=\"color:#FFD400\">포화·트랜스지방</span>은 줄이기"),
 info1: page(
  '<span class="eyebrow">건강음식 · 콜레스테롤</span>'+
  '<h1><span class="hl">수용성 섬유·불포화지방</span> 중심</h1>'+
  '<div class="sub">식단만으로 다 해결되진 않지만 LDL 관리에 도움이 돼요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>식품</th><th>핵심</th></tr>'+
  '<tr class="hlrow"><td>귀리·오트밀</td><td>베타글루칸이 LDL 배출 도움</td></tr>'+
  '<tr><td>콩·렌틸콩</td><td>수용성 섬유질, 포만감</td></tr>'+
  '<tr><td>등푸른생선</td><td>오메가-3로 심혈관</td></tr>'+
  '<tr><td>견과·아보카도</td><td>불포화지방·섬유질</td></tr></table></div>'+
  '<div class="card gray"><h3>기름부터 바꿔보세요</h3><p>버터·마가린 대신 <b>올리브유</b> 같은 불포화지방으로. 식물성 스테롤도 콜레스테롤 흡수를 줄이는 것으로 알려져요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 연구·AHA 권고 소개<br>가족력·고수치면 자가 판단 말고 진료를 받으세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 줄일 것·습관</span>'+
  '<h1>오히려 <span class="hl">줄여야</span> 할 음식</h1>'+
  '<div class="sub">기름·탄수화물·단백질 공급원을 조금씩 바꾸는 데서 시작해요.</div>'+
  '<div class="cards">'+
  '<div class="card warn"><h3>줄이기</h3><ul><li><b>포화지방</b> : 삼겹살·베이컨·소시지</li><li><b>트랜스지방</b> : 가공식품의 \'경화유\'</li><li>정제 탄수화물·당류·과음(중성지방↑)</li></ul><p style="margin-top:6px">AHA는 포화지방을 하루 열량의 <b>6% 미만</b>, 트랜스지방은 최대한 피하라고 권고해요.</p></div>'+
  '<div class="card"><h3>생활습관</h3><ul><li>규칙적 유산소 — HDL↑ LDL↓</li><li>금연·적정 체중</li><li>약 복용 중이면 정기 검사로 변화 확인</li></ul></div>'+
  '<div class="card gray"><h3>약은 임의로 끊지 않기</h3><p>식이·운동으로 좋아질 수 있어도 <b>임의 중단은 위험</b>해요. 반드시 의사와 상의하세요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>약 조절은 반드시 의사와 상의하세요.")
 )
});

// 고혈압
writeSet("2026-11-27_고혈압",{
 thumb: sqbg("알고살자 · 건강음식","혈압이 높게 나왔다면<br><span class=\"y\">식탁부터</span>","DASH 식단 · 칼륨 음식<br><span style=\"color:#FFD400\">나트륨</span> 줄이기"),
 info1: page(
  '<span class="eyebrow">건강음식 · 고혈압</span>'+
  '<h1><span class="hl">DASH 식단</span>과 칼륨</h1>'+
  '<div class="sub">채소·과일·통곡물·저지방 유제품을 넉넉히, 붉은 고기·단 음식은 줄여요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>DASH 식단</h3><p>여러 연구에서 이 식사 패턴이 수축기 혈압을 약 <b>5mmHg 안팎</b> 낮추는 것으로 보고돼요(혈압 높을수록 효과 큼). 칼륨은 나트륨 배출을 돕고요.</p></div>'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>분류</th><th>대표 식품</th></tr>'+
  '<tr class="hlrow"><td>칼륨 채소</td><td>시금치·고구마·감자·토마토·브로콜리</td></tr>'+
  '<tr><td>칼륨 과일</td><td>바나나·아보카도·키위·오렌지</td></tr>'+
  '<tr><td>통곡물·콩</td><td>현미·귀리·렌틸콩·검은콩</td></tr>'+
  '<tr><td>좋은 지방</td><td>견과류·올리브유·등푸른생선</td></tr></table></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · WHO·국민건강영양조사 소개<br>신장 질환·일부 혈압약은 칼륨 주의 — 의사와 상의하세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 나트륨·습관</span>'+
  '<h1><span class="hl">나트륨</span> 줄이는 실천법</h1>'+
  '<div class="sub">WHO 권고는 하루 2,000mg(소금 약 5g) 미만이에요.</div>'+
  '<div class="cards">'+
  '<div class="card"><h3>현실적인 저염 실천</h3><ul><li>국물은 <b>건더기 위주</b>로, 다 마시지 않기</li><li>간은 <b>먹기 직전</b> 살짝</li><li>가공식품 <b>나트륨 함량</b> 비교</li><li>소금 대신 식초·레몬·후추·마늘</li></ul></div>'+
  '<div class="card warn"><h3>피하거나 줄이기</h3><p>국물 요리·젓갈·장아찌·짜게 담근 김치·가공육(햄·소시지)·라면·과자. 외식·배달도 나트륨이 높아요.</p></div>'+
  '<div class="card gray"><h3>일상 습관</h3><ul><li>2~3주에 걸쳐 싱겁게 적응</li><li>빠르게 걷기 등 유산소</li><li>집에서 같은 시간 혈압 재기</li><li>술·담배 줄이기</li></ul></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>약 조절은 반드시 의사와 상의하세요.")
 )
});

// 장건강
writeSet("2026-11-27_장건강",{
 thumb: sqbg("알고살자 · 건강음식","속이 더부룩할 때<br><span class=\"y\">장 건강 음식</span>","김치·요구르트·식이섬유<br><span style=\"color:#FFD400\">다양하게</span> 챙기기"),
 info1: page(
  '<span class="eyebrow">건강음식 · 장 건강</span>'+
  '<h1>유산균 한 알보다 <span class="hl">다양하게</span></h1>'+
  '<div class="sub">식이섬유와 발효식품을 골고루 먹는 쪽이 도움이 돼요.</div>'+
  '<div class="cards">'+
  '<div class="card" style="padding:28px 30px"><table><tr><th>식품</th><th>핵심</th></tr>'+
  '<tr class="hlrow"><td>발효식품(김치·요구르트)</td><td>유익균 공급(프로바이오틱스)</td></tr>'+
  '<tr><td>마늘·양파·대파</td><td>유익균의 먹이(프리바이오틱스)</td></tr>'+
  '<tr><td>통곡물·현미</td><td>식이섬유 풍부</td></tr>'+
  '<tr><td>콩류</td><td>섬유질·단백질</td></tr>'+
  '<tr><td>채소·과일</td><td>식이섬유·수분</td></tr></table></div>'+
  '<div class="card gray"><h3>균 + 먹이 함께</h3><p>프로바이오틱스(균)와 프리바이오틱스(먹이)를 함께 챙기면 더 좋아요. 설탕·색소·식초가 많은 발효 제품은 피하는 편이 나아요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식 · 정보 제공 목적<br>증상이 지속되면 전문의와 상담하세요.")
 ),
 info2: page(
  '<span class="eyebrow">건강음식 · 식이섬유·주의</span>'+
  '<h1>하루 식이섬유 <span class="hl">25~30g</span></h1>'+
  '<div class="sub">한 번에 확 늘리면 가스·팽만이 생길 수 있어요.</div>'+
  '<div class="cards">'+
  '<div class="card formula"><h3>식이섬유 늘리기</h3><p>성인 하루 권장량은 약 <b>25~30g</b>으로 자주 인용돼요(자료마다 다름). 한 번에 늘리기보다 <b>물과 함께 조금씩</b> 늘려요.</p></div>'+
  '<div class="card"><h3>음식만큼 중요한 바탕</h3><ul><li>규칙적인 식사·충분한 수분</li><li>수면·스트레스 관리</li><li>꾸준한 활동량</li></ul><p style="margin-top:6px">특정 제품보다 생활 전체가 더 큰 바탕이에요.</p></div>'+
  '<div class="card warn"><h3>알아두기</h3><p>발효식품·식이섬유는 치료제가 아니에요. 불편이 오래가면 소화기 진료로 원인을 확인하세요.</p></div>'+
  '</div>'+
  foot("출처 : 알고살자 건강음식<br>증상이 지속되면 전문의와 상담하세요.")
 )
});
console.log("gen6 done");
