/* ===== dex.js : 図鑑・称号・伝説の日・難易度と2周目 =====
   図鑑・称号・歴代の記録は「プロフィール」として、セーブとは別にこの端末に残る（新しいゲームを始めても消えない）。 */
const PROFILE_KEY='pachinkasu-profile1';
let PROF=null;
function profNew(){return {v:1,dexM:{},dexC:{},hon:{},rec:{},clears:0,carry:null,eq:null}}
function profLoad(){try{PROF=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch(e){PROF=null}if(!PROF||PROF.v!==1)PROF=profNew();for(const k of ['dexM','dexC','hon','rec'])if(!PROF[k])PROF[k]={}}
function profSave(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(PROF))}catch(e){}}
/* セーブの引っ越しで持ってきたプロフィールを、いまのプロフィールに足す */
function profMerge(o){
  if(!o||typeof o!=='object')return;
  for(const k of ['dexM','dexC','hon'])for(const[id,v]of Object.entries(o[k]||{}))if(!PROF[k][id])PROF[k][id]=v;
  for(const[id,v]of Object.entries(o.rec||{}))if(!PROF.rec[id]||v.v>PROF.rec[id].v)PROF.rec[id]=v;
  PROF.clears=Math.max(PROF.clears||0,o.clears||0);if(!PROF.carry&&o.carry)PROF.carry=o.carry;
  profSave();
}

/* ---------- 難易度 ---------- */
const DIFF={
  ama:{name:'甘デジ',desc:'ノルマがゆるく、ライバルも弱め。はじめての人に',q:0.8,util:-0.04,rep:-5,fire:4,money:3000000,riv:-6},
  mid:{name:'ミドル',desc:'ふつうの難しさ',q:1,util:0,rep:0,fire:3,money:2000000,riv:0},
  max:{name:'MAX',desc:'ノルマがきびしく、ライバルも強い。2回続けて不合格でクビ',q:1.2,util:0.04,rep:5,fire:2,money:1500000,riv:6},
};
const diffOf=()=>DIFF[S&&S.diff]||DIFF.mid;

/* ---------- 客図鑑 ---------- */
const DEX_C=[
  {k:'normal',name:'ふつうのお客さん',desc:'ちょっと寄っていく、いちばん多いお客さん。人気の台に座る',look:{shirt:'#3b82f6',hair:'#1b1b1b',skin:'#f6d1b0'}},
  {k:'hunter',name:'設定狙いのお客さん',desc:'イベントやデータを見て、出る台を探す。黒い帽子が目印',look:{shirt:'#334155',hair:'#1b1b1b',skin:'#eabf98',cap:'#1c1c24'}},
  {k:'elder',name:'年配のお客さん',desc:'1円パチや年金の日によく来る。たばこの煙と待たされるのが苦手',look:{shirt:'#a16207',hair:'#e5e5e5',skin:'#f6d1b0'},elder:1},
  {k:'smoker',name:'たばこを吸うお客さん',desc:'喫煙OKの席が大好き。禁煙席だと途中で吸いに行く',look:{shirt:'#b91c1c',hair:'#3b2a1a',skin:'#d9a77f'}},
  {k:'lo',name:'低レートのお客さん',desc:'1円パチ・5円スロをのんびり楽しむ',look:{shirt:'#22c55e',hair:'#6b4a2b',skin:'#f3dcc6'}},
  {k:'rich',name:'お金持ちのお客さん',desc:'軍資金がたっぷり。豪華な内装が好き',look:{shirt:'#facc15',hair:'#1b1b1b',skin:'#eabf98',glasses:1}},
  {k:'queue',name:'朝イチの行列',desc:'イベントやオープンの日に、開店前から並ぶお客さん',look:{shirt:'#ec4899',hair:'#c8a165',skin:'#f6d1b0'}},
  {k:'bigwin',name:'大勝ちしたお客さん',desc:'10万円以上勝って帰ったお客さん。お店の宣伝をしてくれる',look:{shirt:'#f97316',hair:'#1b1b1b',skin:'#f6d1b0'}},
  {k:'goto',name:'ゴト師',desc:'不正な道具で玉を抜く。サングラスが目印。捕まえると図鑑に載る',look:{shirt:'#1f2937',hair:'#0b0b0b',skin:'#e9c7a5',shades:1}},
  ...REG_DEFS.map(d=>({k:'reg:'+d.id,name:d.name,desc:`常連さん。好き：${d.likes}／苦手：${d.hates}`,look:d.look,elder:d.elder,reg:1})),
];
function dexSeeC(k){if(!PROF)return;const e=PROF.dexC[k];if(e)e.n++;else PROF.dexC[k]={n:1,day:S.day,cyc:S.cycle||1}}

/* ---------- 称号（だいたい100こ） ----------
   c = {R, S}。毎日閉店のあとに調べる */
const st_=()=>S.stat||{};
const HON=[
 /* 営業 */
 ['first','開店！','はじめてお店を開けた','営業',c=>true],
 ['v100','にぎわう店','1日に100人が来店','営業',c=>c.R.visitors>=100],
 ['v200','大盛況','1日に200人が来店','営業',c=>c.R.visitors>=200],
 ['v400','行列のできる店','1日に400人が来店','営業',c=>c.R.visitors>=400],
 ['v700','パチンコの殿堂','1日に700人が来店','営業',c=>c.R.visitors>=700],
 ['tv1k','町で評判','来店者の合計1,000人','営業',c=>S.totalVisitors>=1000],
 ['tv10k','みんなの店','来店者の合計10,000人','営業',c=>S.totalVisitors>=10000],
 ['tv50k','国民的ホール','来店者の合計50,000人','営業',c=>S.totalVisitors>=50000],
 ['tv150k','伝説の集客','来店者の合計150,000人','営業',c=>S.totalVisitors>=150000],
 ['d30','1か月営業','30日営業した','営業',c=>S.day>=30],
 ['d100','100日営業','100日営業した','営業',c=>S.day>=100],
 ['d365','1年営業','1年営業した','営業',c=>S.day>=365],
 ['d730','2年営業','2年営業した','営業',c=>S.day>=730],
 ['pk7','7日連続黒字','7日続けて利益がプラス','営業',c=>(st_().pStreak||0)>=7],
 ['pk30','30日連続黒字','30日続けて利益がプラス','営業',c=>(st_().pStreak||0)>=30],
 ['u70','満席御礼','稼働率70%以上の日','営業',c=>c.R.util>=0.7],
 ['u90','空き台なし','稼働率90%以上の日','営業',c=>c.R.util>=0.9],
 ['tiny','小さな名店','台20台以下で1日100人','営業',c=>machines().length<=20&&c.R.visitors>=100],
 /* お金 */
 ['m10m','1000万円の店','資金1000万円','お金',c=>S.money>=1e7],
 ['m100m','億り人','資金1億円','お金',c=>S.money>=1e8],
 ['m1b','10億の男','資金10億円','お金',c=>S.money>=1e9],
 ['p100k','10万円の日','1日の利益10万円','お金',c=>c.R.net>=1e5],
 ['p1m','100万円の日','1日の利益100万円','お金',c=>c.R.net>=1e6],
 ['p5m','500万円の日','1日の利益500万円','お金',c=>c.R.net+(c.R.branchNet||0)>=5e6],
 ['noloan','無借金経営','借入0で資金5000万円','お金',c=>S.loan<=0&&S.money>=5e7],
 ['debt0','借金完済','オーナーへの借金を返した','お金',c=>S.story&&S.story.debt<=0],
 ['minus','どん底','資金がマイナスになった','お金',c=>S.money<0,1],
 /* イベント */
 ['hot1','激アツ店長','イベントで「激アツ」','イベント',c=>(st_().hot||0)>=1],
 ['hot10','激アツの常連','「激アツ」10回','イベント',c=>(st_().hot||0)>=10],
 ['hot50','信用の店','「激アツ」50回','イベント',c=>(st_().hot||0)>=50],
 ['gase1','ガセ店長','イベントが「ガセ」判定','イベント',c=>(st_().gase||0)>=1,1],
 ['gase10','オオカミ店長','「ガセ」10回','イベント',c=>(st_().gase||0)>=10,1],
 ['tr100','信用100','信用が100になった','イベント',c=>S.trust>=100],
 ['mag','雑誌に載った店','雑誌の取材で「激アツ」','イベント',c=>c.R.ev&&c.R.ev.media&&c.R.ev.cls==='good'&&D.evTarget==='mag'],
 ['tube','神ホール認定','配信者の取材で「激アツ」','イベント',c=>c.R.ev&&c.R.ev.media&&c.R.ev.cls==='good'&&D.evTarget==='tube'],
 ['go','伝説のグランドオープン','グランドオープンで「大成功」','イベント',c=>c.R.go&&c.R.go.final&&c.R.go.final.judge==='大成功'&&c.R.go.type==='grand'],
 ['reno','生まれ変わった店','リニューアルで「大成功」','イベント',c=>c.R.go&&c.R.go.final&&c.R.go.final.judge==='大成功'&&c.R.go.type==='renewal'],
 ['newm','新台の店','新台入替で「激アツ」','イベント',c=>c.R.ev&&c.R.ev.cls==='good'&&D.evType==='newm'],
 ['tail','末尾の魔術師','末尾の日で「激アツ」','イベント',c=>c.R.ev&&c.R.ev.cls==='good'&&D.evType==='tail'],
 ['isl','島の守り神','島の全台系で「激アツ」','イベント',c=>c.R.ev&&c.R.ev.cls==='good'&&D.evType==='island'],
 /* 台 */
 ['mc20','20台の店','台を20台にした','台',c=>machines().length>=20],
 ['mc50','50台の店','台を50台にした','台',c=>machines().length>=50],
 ['mc100','100台の大型店','台を100台にした','台',c=>machines().length>=100],
 ['mc150','メガホール','台を150台にした','台',c=>machines().length>=150],
 ['comp1','コンプリート','1台がコンプリートした','台',c=>(st_().comp||0)>=1],
 ['comp10','打ち止め続出','コンプリート累計10台','台',c=>(st_().comp||0)>=10],
 ['set6','全台設定6','スロット5台以上を全部設定6で営業','台',c=>{const s=machines().filter(m=>kindOf(m)==='s');return s.length>=5&&s.every(m=>m.set===6)}],
 ['set1','鬼の設定','スロット5台以上を全部設定1で営業','台',c=>{const s=machines().filter(m=>kindOf(m)==='s');return s.length>=5&&s.every(m=>m.set===1)},1],
 ['nail2','全台開け','パチンコ5台以上を全部「開け」で営業','台',c=>{const p=machines().filter(m=>kindOf(m)==='p');return p.length>=5&&p.every(m=>m.nail===2)}],
 ['nailm2','鬼の釘師','パチンコ5台以上を全部「締め」で営業','台',c=>{const p=machines().filter(m=>kindOf(m)==='p');return p.length>=5&&p.every(m=>m.nail===-2)},1],
 ['manP','万発の台','パチンコ1台で差玉+30,000発','台',c=>(c.R.maxSaP||0)>=30000],
 ['manS','万枚の台','スロット1台で差枚+10,000枚','台',c=>(c.R.maxSaS||0)>=10000],
 ['dexm50','機種マニア','機種図鑑を半分うめた','台',c=>dexMCount()>=Math.ceil(MODELS.length/2)],
 ['dexm100','機種図鑑コンプリート','機種図鑑をぜんぶうめた','台',c=>dexMCount()>=MODELS.length],
 /* お客さん */
 ['reg3','顔なじみ','常連さんが3人','お客さん',c=>Object.values(S.regs).filter(r=>r.loy>=70&&r.st!=='gone').length>=3],
 ['reg8','みんな常連','8人全員が常連さん','お客さん',c=>Object.values(S.regs).filter(r=>r.loy>=70&&r.st!=='gone').length>=8],
 ['ep1','物語のはじまり','常連さんの物語を1話','お客さん',c=>epCount()>=1],
 ['ep10','人情ホール','常連さんの物語を10話','お客さん',c=>epCount()>=10],
 ['epall','町の語り部','常連さんの物語をすべて','お客さん',c=>epCount()>=Object.values(EPI).reduce((a,x)=>a+x.length,0)],
 ['big','大勝ちの店','お客さんが10万円以上勝った','お客さん',c=>(c.R.maxWin||0)>=100000],
 ['smile','笑顔の店','お客さんの満足度がとても高い日','お客さん',c=>c.R.avgSat>=0.3&&c.R.visitors>=30],
 ['dexc','客図鑑コンプリート','客図鑑をぜんぶうめた','お客さん',c=>DEX_C.every(x=>PROF.dexC[x.k])],
 ['goto1','ゴト師を捕まえた','ゴト師を捕まえた','お客さん',c=>(st_().goto||0)>=1],
 ['goto10','防犯の鬼','ゴト師を10人捕まえた','お客さん',c=>(st_().goto||0)>=10],
 /* 店員 */
 ['st10','10人の仲間','店員が10人','店員',c=>allStaffN()>=10],
 ['st30','大所帯','店員が30人','店員',c=>allStaffN()>=30],
 ['shunin','主任誕生','店員を主任にした','店員',c=>S.staff.some(s=>s.title==='shunin'||s.title==='fuku')],
 ['fuku','副店長誕生','店員を副店長にした','店員',c=>S.staff.some(s=>s.title==='fuku')],
 ['slv10','最強の店員','店員がLv10になった','店員',c=>S.staff.some(s=>s.lv>=10)],
 ['idea','アイデアマン','店員の提案を採用した','店員',c=>(st_().ideas||0)>=1],
 /* 店長 */
 ['lv5','一人前の店長','店長Lv5','店長',c=>S.mgr&&S.mgr.lv>=5],
 ['lv10','ベテラン店長','店長Lv10','店長',c=>S.mgr&&S.mgr.lv>=10],
 ['lv20','名物店長','店長Lv20','店長',c=>S.mgr&&S.mgr.lv>=20],
 ['lv30','伝説の店長','店長Lv30','店長',c=>S.mgr&&S.mgr.lv>=30],
 ['sk3','達人','スキルを1つ極めた','店長',c=>S.mgr&&Object.values(S.mgr.sk).some(r=>r>=3)],
 ['skall','完全無欠','すべてのスキルを極めた','店長',c=>S.mgr&&SKILLS.every(k=>(S.mgr.sk[k.id]||0)>=3)],
 /* ライバル */
 ['riv1','ライバル撃破','ライバル店を1軒閉店させた','ライバル',c=>S.rivalLog.length>=1],
 ['riv3','町の覇者','ライバル店を3軒閉店させた','ライバル',c=>S.rivalLog.length>=3],
 ['riv6','連戦連勝','ライバル店を6軒閉店させた','ライバル',c=>S.rivalLog.length>=6],
 ['riv12','ホール戦争の勝者','ライバル店を12軒閉店させた','ライバル',c=>S.rivalLog.length>=12],
 ['scout','偵察のプロ','偵察を10回した','ライバル',c=>(st_().scout||0)>=10],
 ['b_kinjo','頑固じじいに勝った','金城 源三に勝った','ライバル',c=>bossBeaten('kinjo')],
 ['b_gonda','大手に勝った','権田 剛に勝った','ライバル',c=>bossBeaten('gonda')],
 ['b_hoshino','DXに勝った','星野 銀河に勝った','ライバル',c=>bossBeaten('hoshino')],
 ['b_kurosaki','帝王を超えた','黒崎 豪に勝った','ライバル',c=>bossBeaten('kurosaki')],
 /* ストーリー */
 ['ch1','借金まみれ脱出','第1章をクリア','ストーリー',c=>chCleared(1)],
 ['ch2','町の人気店','第2章をクリア','ストーリー',c=>chCleared(2)],
 ['ch3','駅前の覇者','第3章をクリア','ストーリー',c=>chCleared(3)],
 ['ch4','チェーン社長','第4章をクリア','ストーリー',c=>chCleared(4)],
 ['end','日本一の店長','全国ホールアワード大賞','ストーリー',c=>S.story&&S.story.awardWon],
 ['pf1','完全達成','ノルマを完全達成','ストーリー',c=>S.story&&S.story.perfects>=1],
 ['pf6','優等生','ノルマを6回完全達成','ストーリー',c=>S.story&&S.story.perfects>=6],
 ['bought','一国一城の主','お店を買い取った','ストーリー',c=>S.story&&S.story.bought],
 ['fired','クビ','オーナーにクビにされた','ストーリー',c=>S.story&&S.story.fired,1],
 /* 季節・お祭り・アワード */
 ['season','季節の祭り男','季節のイベントで「激アツ」','季節',c=>(st_().seasonHot||[]).length>=1],
 ['season4','年中行事','4つの季節のイベントすべてで「激アツ」','季節',c=>(st_().seasonHot||[]).length>=4],
 ['anniv','記念日の店','周年祭で「大成功」','季節',c=>c.R.go&&c.R.go.final&&c.R.go.final.judge==='大成功'&&c.R.go.type==='anniv'],
 ['aw1','町のホールアワード','町のホールアワードで受賞','季節',c=>(S.awards||[]).some(a=>a.wins.length)],
 ['aw4','総なめ','町のホールアワードで4部門すべて','季節',c=>(S.awards||[]).some(a=>a.wins.length>=4)],
 /* チェーン・朝礼 */
 ['br2','2号店オープン','お店を2軒にした','チェーン',c=>storeCount()>=2],
 ['br5','5店舗のチェーン','お店を5軒にした','チェーン',c=>storeCount()>=5],
 ['mis1','朝礼の成果','朝礼の目標を3つとも達成','朝礼',c=>c.R.missions&&c.R.missions.n===3],
 ['mis7','皆勤賞','朝礼の目標を7日連続で全部達成','朝礼',c=>(S.missStreak||0)>=7],
 ['mis30','鉄の結束','朝礼の目標を30日連続で全部達成','朝礼',c=>(S.missStreak||0)>=30],
 /* 周回・おもしろ */
 ['ng','2周目','2周目を始めた','周回',c=>(S.cycle||1)>=2],
 ['maxclear','MAXクリア','難易度MAXでエンディング','周回',c=>S.diff==='max'&&S.story&&S.story.awardWon],
 ['amaclear','甘デジクリア','難易度甘デジでエンディング','周回',c=>S.diff==='ama'&&S.story&&S.story.awardWon],
 ['rep0','最低の店','評判が0になった','おもしろ',c=>S.rep<=0,1],
 ['smokeall','煙の楽園','店内を全部喫煙OKにした','おもしろ',c=>G.zone.every(z=>z===1),1],
 ['nosmoke','クリーンホール','たばこの不満がゼロで100人来店','おもしろ',c=>c.R.visitors>=100&&!['smokeIn','smokeDrift','noSmoke'].some(k=>D.reasons[k])],
];
const HON_BY=Object.fromEntries(HON.map(h=>[h[0],h]));
const honName=id=>HON_BY[id]?HON_BY[id][1]:'';
function dexMCount(){return MODELS.filter(m=>PROF.dexM[m.id]).length}
function epCount(){return Object.values(S.regs).reduce((a,r)=>a+(r.ep||0),0)}
function allStaffN(){return S.staff.length+(S.branches||[]).reduce((a,b)=>a+b.staff.length,0)}
function bossBeaten(id){return S.rivalLog.some(l=>l.boss===id)||(S.story&&S.story.cleared.some(c=>CHAPTERS[c.ch].boss===id))}
const chCleared=n=>!!(S.story&&S.story.cleared.some(c=>c.ch===n));

/* ---------- 毎日の記録 ---------- */
function statDay(R){
  const t=S.stat||(S.stat={});
  t.pStreak=R.net>0?(t.pStreak||0)+1:0;
  if(R.ev){if(R.ev.judge==='激アツ')t.hot=(t.hot||0)+1;if(R.ev.judge==='ガセ')t.gase=(t.gase||0)+1;
    if(D.evType==='season'&&R.ev.cls==='good'){const se=seasonInfo(S.day);if(se){t.seasonHot=t.seasonHot||[];if(!t.seasonHot.includes(se.key))t.seasonHot.push(se.key)}}}
  t.comp=(t.comp||0)+(R.completes?R.completes.length:0);
  t.goto=(t.goto||0)+(R.gotoCaught||0);
}
/* 機種図鑑・客図鑑・伝説の日を更新 */
const REC_DEF=[
  {k:'vis',name:'1日の最多来店',fmt:v=>v.toLocaleString('ja-JP')+'人'},
  {k:'net',name:'1日の最高利益',fmt:v=>sgn(v)},
  {k:'gross',name:'1日の最高粗利',fmt:v=>yen(v)},
  {k:'win',name:'お客さんの最高の勝ち',fmt:v=>yen(v)},
  {k:'saP',name:'パチンコ1台の最高差玉',fmt:v=>'+'+v.toLocaleString('ja-JP')+'発'},
  {k:'saS',name:'スロット1台の最高差枚',fmt:v=>'+'+v.toLocaleString('ja-JP')+'枚'},
  {k:'comp',name:'1日のコンプリート台数',fmt:v=>v+'台'},
  {k:'util',name:'1日の最高稼働率',fmt:v=>Math.round(v*100)+'%'},
  {k:'rep',name:'最高の評判',fmt:v=>Math.round(v)},
  {k:'share',name:'最高の町のシェア',fmt:v=>Math.round(v*100)+'%'},
];
function dexDay(R){
  if(!PROF)profLoad();
  let saP=0,saS=0;
  for(const m of machines()){
    const t=m.yest;if(!t)continue;
    const md=MB[m.type],e=PROF.dexM[m.type]||(PROF.dexM[m.type]={days:0,best:null,util:0,hits:0,comp:0,profit:0,day:S.day,cyc:S.cycle||1});
    e.days++;e.hits+=t.hits;e.profit+=Math.round(t.coin-t.out);if(t.done)e.comp++;
    const d=diffUnits(m,t),u=t.mins/(LAST-OPEN);
    if(!e.best||d>e.best.d)e.best={d,day:S.day,no:m.no,store:storeLabel(G)};
    if(u>e.util)e.util=Math.round(u*1000)/1000;
    if(md.k==='p')saP=Math.max(saP,d);else saS=Math.max(saS,d);
  }
  R.maxSaP=saP;R.maxSaS=saS;R.maxWin=D.maxWin||0;
  for(const[k,n]of Object.entries(D.seenC||{}))if(n>0){const e=PROF.dexC[k];if(e)e.n+=n;else PROF.dexC[k]={n,day:S.day,cyc:S.cycle||1}}
  if((D.maxWin||0)>=100000)dexSeeC('bigwin');
  /* 伝説の日（このゲームと、これまでのぜんぶ） */
  const vals={vis:R.visitors,net:Math.round(R.net),gross:Math.round(R.gross),win:Math.round(D.maxWin||0),saP,saS,comp:R.completes?R.completes.length:0,util:R.util,rep:S.rep,share:R.share};
  S.rec=S.rec||{};R.newRec=[];
  for(const d of REC_DEF){
    const v=vals[d.k];if(v==null||v<=0)continue;
    const cur=S.rec[d.k];if(!cur||v>cur.v){if(cur&&cur.v>0)R.newRec.push(d.name);S.rec[d.k]={v,day:S.day,store:storeLabel(G)}}
    const all=PROF.rec[d.k];if(!all||v>all.v)PROF.rec[d.k]={v,day:S.day,store:storeLabel(G),cyc:S.cycle||1,name:S.name};
  }
}
/* 称号を調べる */
function honDay(R){
  if(!PROF)profLoad();
  const c={R,S},got=[];
  for(const h of HON){if(PROF.hon[h[0]])continue;let ok=false;try{ok=!!h[4](c)}catch(e){ok=false}if(ok){PROF.hon[h[0]]={day:S.day,cyc:S.cycle||1,store:S.name};got.push(h[0])}}
  R.newHon=got;
  if(got.length)for(const id of got)news(`称号「${honName(id)}」を手に入れた！`,'good');
  profSave();
}
/* 称号ゲットの知らせ */
function honStep(R){
  return done=>{
    const g=R&&R.newHon;if(!g||!g.length){done();return}
    telop(g.length===1?`称号「${honName(g[0])}」`:`称号を${g.length}つ手に入れた！`,g.length===1?HON_BY[g[0]][2]:g.map(honName).slice(0,3).join('・')+(g.length>3?'…':''),'good');sfx('fanfare');inputBlock(2000);setTimeout(done,1900);
  };
}
/* 何もしなくてもその場でとれる称号（はじめてのゲームなど） */
function honNow(id){if(!PROF)profLoad();if(PROF.hon[id])return false;PROF.hon[id]={day:S?S.day:1,cyc:S&&S.cycle||1,store:S?S.name:''};profSave();return true}

/* ---------- 2周目 ---------- */
function makeCarry(){
  const items=S.storage.filter(it=>it.kind==='d'&&DB[it.type]&&DB[it.type].reward).map(it=>({kind:'d',type:it.type}));
  for(const o of G.objs)if(o.kind==='d'&&DB[o.type]&&DB[o.type].reward)items.push({kind:'d',type:o.type});
  return {mgr:{lv:S.mgr.lv,exp:S.mgr.exp,sp:S.mgr.sp,sk:Object.assign({},S.mgr.sk)},items,cycle:S.cycle||1,diff:S.diff||'mid',day:S.day};
}
function saveCarry(){if(!PROF)profLoad();PROF.carry=makeCarry();PROF.clears=(PROF.clears||0)+1;profSave()}
/* 新しいゲームに、難易度と引き継ぎを反映する */
function applyNewGameOpts(o){
  o=o||{};
  S.diff=DIFF[o.diff]?o.diff:'mid';S.cycle=1;
  S.money=diffOf().money;
  for(const r of S.rivals){r.rep=clamp(r.rep+diffOf().riv,5,95);r.base=clamp(r.base+diffOf().riv,5,95)}
  if(o.carry&&PROF&&PROF.carry){
    const C=PROF.carry;S.cycle=(C.cycle||1)+1;
    S.mgr={lv:C.mgr.lv,exp:C.mgr.exp,sp:C.mgr.sp,sk:Object.assign({},C.mgr.sk),newLv:[],total:0};
    for(const it of C.items||[])S.storage.push(Object.assign({},it,{gift:1}));
    S.money+=Math.min(5000000,1000000*(S.cycle-1));
  }
  if(S.story)S.story.quota=makeQuota(null);
}
