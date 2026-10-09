/* ===== story.js : 章立てのストーリー・オーナーのノルマ・借金 =====
   第1章 借金まみれの雇われ店長 → 第2章 町の人気店へ → 第3章 駅前の決戦 → 第4章 チェーン社長 → 最終章 全国ホールアワード
   毎月1日にオーナーがノルマ（粗利・稼働率・評判）を決め、月末に査定する。
   合格 ＝ 粗利ノルマを達成し、さらに稼働率か評判のどちらかを達成。3つとも達成で「完全達成」。
   雇われ店長のあいだは、3か月続けて不合格だとクビ（ゲームオーバー）。お店を買い取ったあとは、クビはなし。
   オープン期間（グランド・リニューアル）の日は、ノルマに数えない。 */
const MONTH_KEY='pachinko-hanjoki-month';
const OWNER={name:'大黒 千代',col:'#c084fc',face:{skin:'#f1d2b6',hair:'#e7e5e4',hs:'bun',out:'kimono',col:'#5b21b6',acc:['kanzashi'],age:2,f:1}};
const MC={name:'マイク岡田',sub:'全国ホールアワード 司会',col:'#facc15',face:{skin:'#f0c8a0',hair:'#1f2937',hs:'slick',out:'suit',col:'#111827',tie:'#dc2626',acc:['mustache']}};
const DEBT0=3000000,BUYOUT=10000000;
/* 章ごとの稼働率・評判の目安と、粗利ノルマの伸び */
const CH_UTIL=[0,0.40,0.44,0.48,0.50,0.52],CH_REP=[0,40,48,55,60,62],CH_GROW=[0,1.05,1.06,1.06,1.05,1.04];
const AWARD_DAYS=60,AWARD_PASS=80;
/* 章のボスは、その章になるまで町に出てこない */
const BOSS_CH={gonda:2,hoshino:3,kurosaki:4};

const CHAPTERS=[null,
 {title:'借金まみれの雇われ店長',boss:'kinjo',beat:30,objs:['quota3','debt','boss'],
  desc:'借金300万円をオーナーに肩代わりしてもらい、潰れかけのホールの雇われ店長になった。ノルマを守り、借金を返し、隣のゴールデン会館に勝とう。',
  reward:{money:1000000,items:[{kind:'d',type:'daruma'}],text:'必勝だるま・100万円'}},
 {title:'町の人気店へ',boss:'gonda',beat:40,objs:['top30','rank3','boss'],
  desc:'次の目標は町いちばんの店。だが大手のダイヤモンドグループが、資本力にものを言わせて町に乗り込んでくる。',
  reward:{money:3000000,items:[{kind:'d',type:'trophy'}],floor:'royal',text:'優勝トロフィー・床「ロイヤルじゅうたん」・300万円'}},
 {title:'駅前の決戦',boss:'hoshino',beat:40,objs:['buy','eki','ekiTop20','boss'],
  desc:'オーナーから店を買い取り、雇われ店長からオーナーへ。そして駅前へ。駅前を取った店が、この辺り一帯を取る。',
  reward:{money:10000000,items:[{kind:'d',type:'goldcat'}],text:'黄金の招き猫・1000万円'}},
 {title:'チェーン社長',boss:'kurosaki',beat:40,objs:['stores3','chainBlack','rank5','boss'],
  desc:'1軒の店主から、チェーンの社長へ。県内のホールを買い集める「業界の帝王」黒崎が立ちはだかる。',
  reward:{money:30000000,items:[],text:'3000万円'}},
 {title:'全国ホールアワード',boss:null,objs:['award'],
  desc:`全国ホールアワードにノミネート。${AWARD_DAYS}日間の審査で、稼働・評判・信用・シェアが見られる。目指すは大賞。`},
];
const CH_NAME=n=>n>=5?'最終章':`第${n}章`;
const story=()=>S.story;
const eqMachines=()=>machines().reduce((a,m)=>a+(m.rate==='lo'?0.25:1),0);
/* 店の大きさの目安（立地の人の多さ × 台数）。粗利ノルマはこれに比例させる */
const storeScale=()=>LOCS[G.loc].town*capF(eqMachines());
const storeCount=()=>1+((S.branches||[]).length);
const storeAt=loc=>G.loc===loc||(S.branches||[]).some(b=>b.st&&b.st.loc===loc);
const ownerSub=()=>S.story&&S.story.bought?'会長（前のオーナー）':'オーナー';

/* ---------- はじめる ---------- */
function storyInit(migrated){
  S.story={v:1,ch:1,chStart:S.day,chPass:0,debt:DEBT0,strikes:0,passes:0,perfects:0,bought:false,bossWin:false,
    cnt:{top:0,ekiTop:0,beat:0},log:[],cleared:[],seen:{prologue:false},quota:null,award:null,awardWon:false,fired:false,chainBlack:false,migrated:!!migrated};
  S.story.quota=makeQuota(null);
}
function monthRange(day){
  const d=dateOf(day),y=d.getFullYear(),m=d.getMonth(),first=day-(d.getDate()-1),len=new Date(y,m+1,0).getDate();
  return {y,m:m+1,first,last:first+len-1};
}
/* ノルマを決める。prev は先月のノルマ（なければ店の大きさから決める） */
function makeQuota(prev){
  const st=S.story,ch=Math.min(5,st.ch),mr=monthRange(S.day),sNow=storeScale(),n=Math.max(1,machines().length);
  const first=!prev;
  let dt;
  if(first)dt=500*sNow*0.9;
  else{
    const prevPer=prev.dt/prev.s0,perf=prev.n?(prev.g/prev.n)/(prev.sSum/prev.n):prevPer;
    let p=Math.max(perf,prevPer*0.9)*CH_GROW[ch];
    p=Math.min(p,prevPer*1.15);
    dt=p*sNow;
  }
  dt=Math.max(30000,Math.round(dt/1000)*1000);
  const util=Math.round((first?0.36:CH_UTIL[ch])*Math.min(1,Math.pow(30/n,0.25))*100)/100;
  const rep=first&&ch===1?35:CH_REP[ch];
  return {y:mr.y,m:mr.m,from:S.day,to:mr.last,dt,util,rep,s0:sNow,g:0,uSum:0,sSum:0,n:0,go:0,first};
}
/* オープン期間のうち、今月の残りに入る日数 */
function goDaysAhead(q){
  if(!S.go)return 0;
  let n=0;for(let d=Math.max(S.day,S.go.start);d<S.go.start+S.go.len;d++)if(d<=q.to)n++;
  return n;
}
/* 今月のノルマの状況 */
function quotaInfo(){
  const st=S.story;if(!st||!st.quota)return null;
  const q=st.quota,days=q.to-q.from+1,left=Math.max(0,q.to-S.day+1);
  const goKnown=q.go+goDaysAhead(q),count=Math.max(0,days-goKnown);
  const target=q.dt*count,pace=q.n?q.g/(q.dt*q.n):null,util=q.n?q.uSum/q.n:null;
  const proj=q.n?q.g+q.g/q.n*Math.max(0,count-q.n):null;
  return {q,days,left,count,target,pace,util,proj,okG:pace!=null&&pace>=1,okU:util!=null&&util>=q.util,okR:S.rep>=q.rep};
}

/* ---------- 章の目標 ---------- */
function bossRival(ch){const c=CHAPTERS[ch||S.story.ch];return c&&c.boss?S.rivals.find(r=>r.open&&r.boss===c.boss):null}
function objProg(id){
  const st=S.story,ch=CHAPTERS[st.ch],c=st.cnt;
  let o;
  switch(id){
    case 'quota3':o={label:'オーナーのノルマに3回合格する',cur:Math.min(3,st.chPass),max:3};break;
    case 'debt':o={label:`借金${man(DEBT0)}を返す`,cur:DEBT0-st.debt,max:DEBT0,done:st.debt<=0,txt:st.debt>0?`残り${man(st.debt)}（経営 → ストーリーで返せます）`:'完済！'};break;
    case 'top30':o={label:'町のシェア1位の日を30日つくる',cur:Math.min(30,c.top),max:30,txt:'日報の「町のシェア」がライバル店すべてより多い日'};break;
    case 'rank3':o={label:'ランク3「地域一番店」になる',cur:Math.min(3,rankNo()),max:3,txt:`来店者の合計 ${S.totalVisitors.toLocaleString('ja-JP')}／${RANKS[2].need.toLocaleString('ja-JP')}人`};break;
    case 'buy':o={label:`お店をオーナーから買い取る（${man(BUYOUT)}）`,cur:st.bought?1:0,max:1,txt:st.bought?'買い取り済み。あなたがオーナーです':'下の「お店を買い取る」から'};break;
    case 'eki':o={label:'駅前に店を構える',cur:storeAt('ekimae')?1:0,max:1,txt:storeAt('ekimae')?'駅前に出店済み':'経営 → 物件 から駅前に移転（ランク3から）'};break;
    case 'ekiTop20':o={label:'駅前の店でシェア1位の日を20日つくる',cur:Math.min(20,c.ekiTop),max:20};break;
    case 'stores3':o={label:'お店を3軒にする',cur:Math.min(3,storeCount()),max:3};break;
    case 'chainBlack':o={label:'3軒そろって黒字の月をつくる',cur:st.chainBlack?1:0,max:1};break;
    case 'rank5':o={label:'ランク5「伝説のホール」になる',cur:Math.min(5,rankNo()),max:5,txt:`来店者の合計 ${S.totalVisitors.toLocaleString('ja-JP')}／${RANKS[4].need.toLocaleString('ja-JP')}人`};break;
    case 'boss':{
      const B=BOSS_BY[ch.boss],r=bossRival(),p=S.rivalPlans.find(x=>x.boss===ch.boss),shop=r?r.name:p?p.shop:B.shop;
      o={label:`${shop}（${B.name}）に勝つ`,cur:st.bossWin?ch.beat:Math.min(ch.beat,c.beat),max:ch.beat,done:!!st.bossWin,boss:B,
        txt:st.bossWin?'勝利！':r?`閉店させるか、町のシェアで上回る日を${ch.beat}日つくる`:p?(S.day>=p.ann?`${dateStr(p.open)}にオープン予定`:'近いうちに出店してくるらしい'):'まだ町に来ていない'};break;}
    case 'award':{
      const a=st.award;
      o={label:'全国ホールアワード大賞を受賞する',cur:st.awardWon?AWARD_DAYS:a?Math.min(AWARD_DAYS,a.n):0,max:AWARD_DAYS,done:!!st.awardWon,
        txt:st.awardWon?'大賞受賞！':a?`審査 ${a.n}/${AWARD_DAYS}日目・いまの点数 ${awardScore()}点（大賞は${AWARD_PASS}点以上）`:''};break;}
    default:o={label:id,cur:0,max:1};
  }
  if(o.done==null)o.done=o.cur>=o.max;
  return o;
}
const chapterObjs=()=>(CHAPTERS[S.story.ch].objs||[]).map(objProg);
const chapterDone=()=>chapterObjs().every(o=>o.done);

/* ---------- 全国ホールアワードの採点 ---------- */
function awardParts(){
  const a=S.story.award;if(!a||!a.n)return null;
  const beaten=S.rivalLog.length;
  return [
    {k:'稼働率',v:a.u/a.n,pt:25*clamp((a.u/a.n)/0.55,0,1),fmt:x=>Math.round(x*100)+'%'},
    {k:'評判',v:a.rep/a.n,pt:20*clamp((a.rep/a.n)/75,0,1),fmt:x=>Math.round(x)},
    {k:'信用',v:a.trust/a.n,pt:15*clamp((a.trust/a.n)/80,0,1),fmt:x=>Math.round(x)},
    {k:'町のシェア',v:a.sh/a.n,pt:20*clamp((a.sh/a.n)/0.45,0,1),fmt:x=>Math.round(x*100)+'%'},
    {k:'店舗数',v:storeCount(),pt:10*clamp(storeCount()/3,0,1),fmt:x=>x+'軒'},
    {k:'倒したライバル',v:beaten,pt:10*clamp(beaten/6,0,1),fmt:x=>x+'軒'},
  ];
}
function awardScore(){const p=awardParts();return p?Math.round(p.reduce((s,x)=>s+x.pt,0)):0}

/* ---------- 1日の終わり（閉店のあと、日付が変わる前） ---------- */
function storyEndDay(R){
  const st=S.story;if(!st||st.fired)return;
  const out=R.story={steps:[]};
  const q=st.quota;
  if(q&&S.day>=q.from&&S.day<=q.to){
    if(D.isGo)q.go++;
    else{q.g+=R.gross;q.uSum+=R.util;q.sSum+=storeScale();q.n++}
  }
  /* シェア1位・ボスとの勝負 */
  const sh=D.shares||{},me=sh.me||0,top=Object.keys(sh).every(k=>k==='me'||sh[k]<me);
  if(st.ch===2&&top)st.cnt.top++;
  if(st.ch===3&&top&&G.loc==='ekimae')st.cnt.ekiTop++;
  const chd=CHAPTERS[st.ch],br=bossRival();
  if(chd&&chd.boss&&br&&!st.bossWin&&!D.isGo&&me>(sh[br.id]||0)){
    st.cnt.beat++;
    if(st.cnt.beat>=chd.beat){st.bossWin=true;out.steps.push({talk:bossConcedeTalk(chd.boss,br)});news(`${br.name}の${BOSS_BY[chd.boss].name}が負けを認めた！`,'good')}
    else if(st.cnt.beat===Math.ceil(chd.beat/2)&&!st.seen['half'+st.ch]){st.seen['half'+st.ch]=1;out.steps.push({talk:bossHalfTalk(chd.boss)})}
  }
  /* 全国ホールアワードの審査 */
  if(st.ch===5&&st.award&&!st.awardWon){
    const a=st.award;a.n++;a.u+=R.util;a.rep+=S.rep;a.trust+=S.trust;a.sh+=R.share;
    if(a.n>=AWARD_DAYS){
      const score=awardScore(),win=score>=AWARD_PASS;
      out.steps.push({talk:awardTalk(score,win)});
      st.awardLog=(st.awardLog||[]).concat([{day:S.day,score,win}]);
      if(win){st.awardWon=true;S.ended={type:'story',day:S.day};out.ending=true;out.steps.push({talk:endingTalk()})}
      else{st.award=newAward();news(`全国ホールアワードは${score}点で${score>=65?'準大賞':'優秀賞'}。次の審査が始まった`,'')}
    }
  }
  /* 月末の査定 */
  if(q&&S.day>=q.to){
    const res=evaluateMonth();out.month=res;
    out.steps.push({talk:monthTalk(res)});
    if(res.fired){out.fired=true;return}
  }
  /* 章のクリア */
  if(st.ch<5&&chapterDone()){
    const done=st.ch,C=CHAPTERS[done];
    st.cleared.push({ch:done,day:S.day});
    out.steps.push({telop:[`${CH_NAME(done)} クリア！`,C.title,'good']});
    out.steps.push({talk:clearTalk(done)});
    grantReward(C.reward);
    news(`${CH_NAME(done)}「${C.title}」クリア！ ごほうび：${C.reward.text}`,'good');
    st.ch++;st.chStart=S.day+1;st.cnt={top:0,ekiTop:0,beat:0};st.bossWin=false;st.chStarted=false;
  }
}
/* 日付が変わったあと（朝） */
function storyDayStart(R){
  const st=S.story;if(!st||st.fired)return;
  const out=R.story||(R.story={steps:[]});
  if(!st.chStarted&&st.seen.prologue){out.steps.push(...chapterStartSteps());}
  if(st.quota&&S.day>st.quota.to){
    st.quota=makeQuota(st.quota);out.newMonth=true;
    out.steps.push({talk:quotaTalk(false)});
  }
}
/* 章のはじまり：ボスを呼び、タイトルと会話を出す */
function chapterStartSteps(){
  const st=S.story,ch=st.ch,C=CHAPTERS[ch];
  st.chStarted=true;
  if(ch===5&&!st.award)st.award=newAward();
  if(C.boss){
    const B=BOSS_BY[C.boss],open=S.rivals.some(r=>r.open&&r.boss===C.boss),planned=S.rivalPlans.some(p=>p.boss===C.boss);
    if(!open&&!planned)scheduleRival({boss:B.id,annIn:ch===1?1:rndi(2,4),openIn:rndi(9,12),next:ch===1});
  }
  return [{card:[CH_NAME(ch),C.title,C.desc]},{talk:chapterIntroTalk(ch)}];
}
const newAward=()=>({from:S.day,n:0,u:0,rep:0,trust:0,sh:0});

/* ---------- 月末の査定 ---------- */
function evaluateMonth(){
  const st=S.story,q=st.quota,target=q.dt*q.n,uAvg=q.n?q.uSum/q.n:0;
  const res={y:q.y,m:q.m,g:Math.round(q.g),target:Math.round(target),dt:q.dt,n:q.n,go:q.go,util:uAvg,utilT:q.util,rep:S.rep,repT:q.rep,
    okG:q.n===0||q.g>=target,okU:q.n===0||uAvg>=q.util,okR:S.rep>=q.rep,owner:!st.bought,ch:st.ch,bonus:0,strikes:0};
  res.pass=res.okG&&(res.okU||res.okR);res.perfect=res.okG&&res.okU&&res.okR;
  if(res.pass){
    st.strikes=0;st.passes++;if(st.ch===1)st.chPass++;if(res.perfect)st.perfects++;
    res.bonus=Math.round(((res.perfect?300000:100000)*Math.min(4,st.ch)+(res.perfect?Math.max(0,q.g-target)*0.2:0))/10000)*10000;
    S.money+=res.bonus;
  }else if(!st.bought){
    st.strikes++;if(st.strikes>=3){st.fired=true;res.fired=true}
  }
  res.strikes=st.strikes;
  st.log.push({y:q.y,m:q.m,pass:res.pass,perfect:res.perfect,okG:res.okG,okU:res.okU,okR:res.okR,g:res.g,target:res.target});
  if(st.log.length>48)st.log.shift();
  news(`${q.m}月の査定：${res.perfect?'完全達成':res.pass?'合格':'不合格'}${res.bonus?`（ボーナス${man(res.bonus)}）`:''}`,res.pass?'good':'bad');
  return res;
}
function grantReward(rw){
  if(!rw)return;
  S.money+=rw.money||0;
  for(const it of rw.items||[])S.storage.push(Object.assign({},it,{gift:1}));
  if(rw.floor&&!G.ownedFloors.includes(rw.floor))G.ownedFloors.push(rw.floor);
}

/* ---------- 借金・買い取り ---------- */
function repayDebt(n){
  const st=S.story;n=Math.min(n,st.debt,Math.max(0,S.money));
  if(n<=0)return 0;
  st.debt-=n;S.money-=n;
  if(st.debt<=0)news('オーナーへの借金を完済した！','good');
  return n;
}
function buyStore(){
  const st=S.story;
  if(st.bought||st.ch<3)return 'まだ買い取れません';
  if(S.money<BUYOUT)return 'お金が足りません';
  S.money-=BUYOUT;st.bought=true;st.strikes=0;
  news(`お店をオーナーから${man(BUYOUT)}で買い取った。今日からあなたがオーナーです`,'big');
  return null;
}

/* ---------- 月はじめの保存（クビ・倒産のときにやり直せるように） ---------- */
function storySnapshot(){try{localStorage.setItem(MONTH_KEY,ser())}catch(e){}}
function monthSnap(){try{return localStorage.getItem(MONTH_KEY)}catch(e){return null}}
function monthSnapInfo(){
  const s=monthSnap();if(!s)return null;
  try{const o=JSON.parse(s);if(!o||!o.st||o.name!==S.name)return null;return {day:o.day,money:o.money}}catch(e){return null}
}

/* ================= セリフ ================= */
const OW=(ex,text)=>({who:'owner',ex,text});
const ME=(text,ex)=>({who:'me',ex,text});
const NR=text=>({who:'narr',text});
const BS=(id,ex,text)=>({who:'boss:'+id,ex,text});

function prologueTalk(){
  const st=S.story,lines=[];
  if(st.migrated)lines.push(NR('ストーリーが始まります。これは、あなたがこの店の店長になった日のお話――'));
  lines.push(
    NR('パチンコに人生を賭けて、そして負けた。'),
    NR('借金は300万円。家賃は3か月たまり、財布には千円札が1枚だけ。'),
    NR('最後の千円を握りしめて、いつものホールの前に立った夜――'),
    OW('smug','あんた、毎日うちで打ってた子だね。その顔、覚えてるよ'),
    ME('……え？ あ、はい。（誰だろう、このおばあさん……）'),
    OW('n','あたしはこの店のオーナー、大黒千代。この店はね、もうすぐ潰れる'),
    OW('sad','前の店長が売上を持って夜逃げしてね。台はボロボロ、お客は隣のゴールデン会館に取られっぱなしさ'),
    OW('smug','そこで相談だ。あんたの借金300万、あたしが肩代わりしてやる。その代わり――'),
    OW('happy','この店の店長をやりな'),
    ME('店長！？ 自分が、ですか！？','shock'),
    OW('n','負け続けた人間は、負けるお客の気持ちがわかる。それに、あんたは台を見る目だけはあった'),
    OW('angry','ただし条件がある。毎月あたしが決める「ノルマ」は必ず守ること。3か月続けてしくじったら、即クビだよ'),
    OW('smug',`新しい看板は「${S.name}」か。……悪くないね`),
    ME('やります。この店、絶対に立て直してみせます'),
    NR('こうして、元パチンカスの雇われ店長としての毎日が始まった。'),
  );
  return lines;
}
function chapterIntroTalk(ch){
  switch(ch){
    case 1:{
      const k=S.rivals.find(r=>r.open&&r.boss==='kinjo');
      return [
        OW('n','最初の目標を言っておくよ。ノルマに3回合格すること。借金300万を返すこと。それと――'),
        BS('kinjo','angry',k?'なんじゃ、大黒の店にまた新しい店長か。どうせすぐ逃げ出すんじゃろう':'ゴールデン会館は、また建て直すわい。若造に負けたままでは終われん'),
        BS('kinjo','smug','この町の客はな、40年わしの店に通っとる。若造に何ができる'),
        OW('smug','……あの頑固じじいの店に勝つことさ'),
        ME('（ゴールデン会館の金城さん……。この人に勝たないと、店は立て直せない）'),
      ];}
    case 2:return [
      OW('n','次の目標だ。町いちばんの店になりな。うちが町でいちばんお客を集める日を、30日つくるんだよ'),
      OW('sad','それと、悪い知らせだ。大手のダイヤモンドグループが、この町に店を出すらしい'),
      OW('angry','大手の資本力は、ゴールデン会館の比じゃないよ。気を引きしめな'),
      ME('（大手チェーンか……。でも、ここで負けるわけにはいかない）'),
    ];
    case 3:return [
      OW('n','……あたしもそろそろ歳だ。この店、あんたに譲ろうと思う'),
      ME('えっ……！？','shock'),
      OW('smug',`タダじゃないよ。${man(BUYOUT)}で買い取りな。あんたが稼いだ金で、この店を自分のものにするんだ`),
      OW('n','それと、駅前に出な。駅前を取った店が、この辺り一帯を取る。それがこの業界の決まりさ'),
      NR('駅前には、IT企業出身の若社長が新しいホールを出すという噂が流れていた――'),
      ME('（自分の店を持って、駅前で一番になる。……やってやる）'),
    ];
    case 4:return [
      OW('happy','駅前の一番店のオーナー、か。あの夜、千円札を握りしめてた子がねえ'),
      OW('n','でも1軒じゃ足りないよ。店を増やしてチェーンにしな。3軒そろって黒字にできたら一人前さ'),
      NR('その頃、県内のホールを次々と買い集めている男がいた。メガパレス会長、黒崎豪――'),
      ME('（県で一番の店……。ここまで来たんだ、最後まで行く）'),
    ];
    default:return [
      NR('店長のもとに、一通の招待状が届いた。'),
      {who:'mc',ex:'happy',text:'全国ホールアワード実行委員会です！ あなたのお店がノミネートされました！'},
      {who:'mc',ex:'n',text:`これから${AWARD_DAYS}日間、お店の稼働率・評判・信用・町のシェアなどを審査します。大賞は${AWARD_PASS}点以上のお店だけ！`},
      OW('smug','全国一の店か。……ここまで来たら、取ってきな'),
      ME('はい。最後まで、お客さんに喜んでもらえる店で勝負します'),
    ];
  }
}
function quotaTalk(first){
  const st=S.story,qi=quotaInfo(),q=qi.q,lines=[];
  const pct=Math.round(q.util*100);
  if(st.bought)lines.push(OW('n',`${q.m}月の目標だよ。もう雇われじゃないから、届かなくてもクビにはしない。でも、あたしは見てるからね`));
  else if(st.strikes===2)lines.push(OW('angry',`${q.m}月のノルマだ。……後がないよ。今月しくじったらクビだからね`));
  else if(st.strikes===1)lines.push(OW('angry',`${q.m}月のノルマだ。先月の未達、忘れちゃいないだろうね`));
  else lines.push(OW('n',`${q.m}月のノルマを言うよ`));
  lines.push(OW('n',`粗利${man(qi.target)}（1日${man(q.dt)}）、稼働率${pct}%、月末の評判${q.rep}以上`));
  if(first){
    lines.push(OW('smug','粗利は必ず達成。そのうえで稼働率か評判のどちらかを達成したら合格だ。3つ全部なら、ボーナスをはずむよ'));
    if(S.go&&S.go.start>=q.from)lines.push(OW('happy','グランドオープンの日は、ノルマに数えないでおいてやる。あたしからの餞別さ'));
  }
  return lines;
}
function monthTalk(res){
  const L=[NR(`${res.m}月の最後の日。${res.owner?'オーナーの査定の時間だ。':'会長が数字を見に来た。'}`)];
  if(!res.owner){
    L.push(res.pass?OW('happy',pick(['いい数字だね。会長として鼻が高いよ','さすがだね。この調子で頼むよ'])):OW('n',pick(['今月はいまいちだったね。ま、オーナーはあんただ。自分で考えな','数字は正直だよ。来月は取り返しな'])));
    return L;
  }
  if(res.fired){
    L.push(OW('angry','3か月続けてノルマ未達。……約束は約束だ'));
    L.push(OW('sad','あんたはクビだよ。……残念だね。あんたなら、やれると思ったんだけど'));
    L.push(ME('（そんな……）','sad'));
    return L;
  }
  if(res.perfect)L.push(OW('happy',pick(['3つとも達成かい。言うことなしだ。ボーナスをはずんでおいたよ','やるじゃないか。この調子なら、あの頑固じじいも青くなるね'])));
  else if(res.pass)L.push(OW('smug',pick(['合格だ。……ま、及第点ってとこだね。来月も頼むよ','合格。でも満足するんじゃないよ。上には上がいるんだ'])));
  else if(res.strikes===1)L.push(OW('angry',`ノルマ未達だ。${!res.okG?'粗利が足りないよ。出しすぎじゃないのかい':'稼働も評判もさっぱりだ。お客が逃げてるよ'}`),OW('n','今回は大目に見る。でも、次はないと思いな'));
  else L.push(OW('angry','また未達かい。……これが最後のチャンスだよ'),OW('angry','来月しくじったら、クビだ。わかってるね'));
  if(res.ch===1&&res.pass){const st=S.story;if(st.chPass<3)L.push(OW('n',`これで${st.chPass}回目の合格だね。あと${3-st.chPass}回だよ`))}
  return L;
}
function clearTalk(ch){
  const L=[];
  switch(ch){
    case 1:L.push(OW('happy','借金は完済、ノルマも守って、ゴールデン会館にも勝った。……正直、ここまでやるとは思わなかったよ'),OW('smug','約束どおり、ごほうびだ。この「必勝だるま」は、あたしが店を始めた日に買ったもんさ。店に飾りな'));break;
    case 2:L.push(OW('happy','町のシェア1位……。この店が町いちばんになる日を、ずっと夢見てたんだよ'),OW('smug','ありがとね。ごほうびに、トロフィーと特注のじゅうたんを用意した。倉庫と床のメニューを見てごらん'));break;
    case 3:L.push(OW('happy','駅前の一番店。もう誰も、あんたをパチンカスなんて呼ばないよ'),OW('smug','これは黄金の招き猫だ。あんたの店にこそふさわしい'));break;
    case 4:L.push(OW('happy','3軒のチェーンに、メガパレスまで。……あんたはもう、立派な社長だ'),OW('smug','最後の大舞台が待ってるよ'));break;
  }
  L.push(NR(`ごほうび：${CHAPTERS[ch].reward.text}`));
  return L;
}
const CONCEDE={
  kinjo:['……ふん。またそっちのほうが客が多かったのう','わしの負けじゃ。じゃが店は畳まんぞ。年寄りの意地じゃ'],
  gonda:['3か月で制圧するはずが……逆に押し返されるとはな','部長会議で報告しておく。「あの店は手ごわい」とな'],
  hoshino:['KPIで完全に負けてます……認めます','データにない「何か」が、あなたの店にはあるんですね'],
  kurosaki:['……この私が、数字で押し負けるとはな','認めよう。お前はこの県で一番の店長だ'],
};
const HALF={
  kinjo:'……最近、うちの常連がそっちに流れとるらしいのう。生意気な',
  gonda:'思ったよりやるじゃないか。だが、勝負はここからだ',
  hoshino:'ダッシュボードの数字が、あなたの店のほうに傾いてきてるんですよね……',
  kurosaki:'ほう。この私の店と互角に渡り合うか',
};
function bossConcedeTalk(id,r){const c=CONCEDE[id]||['……負けたよ','今日のところは引き下がる'];return [NR(`${r.name}の${BOSS_BY[id].name}が訪ねてきた。`),BS(id,'sad',c[0]),BS(id,'n',c[1]),ME('（勝った……！）','happy')]}
function bossHalfTalk(id){return [BS(id,'angry',HALF[id]||'まだ負けたわけじゃない'),ME('（あと半分。このまま押し切る）')]}
function awardTalk(score,win){
  const L=[NR('全国ホールアワード 授賞式――'),{who:'mc',ex:'happy',text:'大変お待たせしました！ 今年の全国ホールアワード、審査結果の発表です！'},{who:'mc',ex:'n',text:`「${S.name}」の点数は……${score}点！`}];
  if(win)L.push({who:'mc',ex:'shock',text:`そして大賞は……「${S.name}」です！！ おめでとうございます！！`});
  else L.push({who:'mc',ex:'n',text:`惜しくも${score>=65?'準大賞':'優秀賞'}！ 大賞まであと${AWARD_PASS-score}点でした！`},OW('n','次の審査で取ればいい。まだ終わりじゃないよ'),NR(`次の審査が始まった（${AWARD_DAYS}日間）。`));
  return L;
}
function endingTalk(){
  const L=[OW('sad','……泣いてなんかないよ。目にゴミが入っただけさ')];
  if(S.rivalLog.some(l=>l.boss==='kinjo')||S.story.cleared.length)L.push(BS('kinjo','happy','ふん、若造が。……ようやったのう'));
  L.push(ME('あの夜、パチンコで全部なくした自分が、こんな場所に立てるなんて'),
    OW('happy','お客の負けを知ってる店長だから、お客に愛される店ができたんだ。胸を張りな'),
    NR('パチンカスの成り上がり店長録 ――完――'));
  return L;
}

/* ---------- 順番に出す（会話・章のタイトル・テロップ） ---------- */
function storyStep(s){
  if(s.talk)return done=>talk(s.talk,done);
  if(s.card)return done=>chapterCard(s.card[0],s.card[1],s.card[2],done);
  if(s.telop)return telopStep(s.telop[0],s.telop[1],s.telop[2]);
  if(s.fn)return done=>{s.fn();done()};
  return null;
}
let chapTimer=0;
function chapterCard(no,title,sub,done){
  const el=$('#chap');$('#cpNo').textContent=no;$('#cpT').textContent=title;$('#cpS').textContent=sub||'';
  el.hidden=false;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');sfx('fanfare');
  const at=performance.now();let fin=false;
  const end=()=>{if(fin)return;fin=true;clearTimeout(chapTimer);el.hidden=true;el.onclick=null;if(done)done()};
  el.onclick=()=>{if(performance.now()-at>600)end()};
  chapTimer=setTimeout(end,5200);
}
/* はじめての章の流れ（プロローグ → 第1章 → ノルマ） */
function runPrologue(done){
  const st=S.story;
  runSeq([
    d=>talk(prologueTalk(),d),
    ...chapterStartSteps().map(storyStep),
    d=>talk(quotaTalk(true),d),
    d=>{st.seen.prologue=true;save();storySnapshot();refreshAll();d()},
    d=>{if(done)done();d()},
  ]);
}
