/* ===== features.js : つぶやき・ゴト師・規制・目標とエンディング ===== */
const MEDIA_COST={mag:120000,tube:350000};

/* ---------- つぶやき ---------- */
let twQueue=[],twLast=0;
function tweetReset(){twQueue=[]}
function tweet(c,kind,prob,prio,vars){
  if(!prefs.tweets||!c||Math.random()>prob)return;
  const list=TW[kind];if(!list)return;
  let text=pick(list);if(vars)for(const k in vars)text=text.replace('{'+k+'}',vars[k]);
  if(!c.handle)c.handle=c.reg?REG_BY[c.reg].name:pick(HANDLES);
  twQueue.push({c,name:c.handle,text,col:c.look.shirt,prio:(prio||0)+(c.reg?2:0),t:performance.now()});
  if(twQueue.length>8){twQueue.sort((a,b)=>b.prio-a.prio||b.t-a.t);twQueue.length=6}
}
function tweetTick(now){
  if(!twQueue.length||now-twLast<1300)return;
  twQueue.sort((a,b)=>b.prio-a.prio||b.t-a.t);
  const tw=twQueue.shift();twLast=now;
  if(now-tw.t>9000)return;
  /* つぶやきは客の頭の上の吹き出しだけに出す（帰った客・見えない客の分は出さない） */
  if(tw.c&&custs.includes(tw.c)&&!tw.c.hidden)tw.c.bubble={text:tw.text,until:now+2600};else twLast=0;
}

/* ---------- ゴト師 ---------- */
function camerasCovering(x,y){
  let n=0;
  for(const d of G.doors)if(d.type==='camera'){const f=frontOf(d);if(Math.max(Math.abs(f.x-x),Math.abs(f.y-y))<=5)n++}
  return n;
}
function spawnGoto(){
  const segs=[...new Set(machines().map(segOf))].filter(s=>s.endsWith('hi'));
  if(!segs.length)return;
  const c=spawnCust(pick(segs),{hunter:false,smoker:false,elder:false,look:{shirt:'#1f2937',hair:'#0b0b0b',skin:'#e9c7a5',shades:1}});
  c.goto=true;c.loot=0;c.maxT=rnd(90,160);c.budget=1e9;c.goal=1e9;D.visitors--;
}
function gotoStep(c,dt){
  const m=c.m;
  c.t+=dt;m.today.mins+=dt;
  const loss=1000*dt;S.money-=loss;D.goto+=loss;c.loot+=loss;m.today.out+=loss;
  if(Math.random()<0.2*dt){m.flash=1.2;floatAt(m.x,m.y,'?','#64748b')}
  const s=seatOf(m),p=(0.004+0.035*camerasCovering(s.x,s.y))*dt;
  if(Math.random()<p){catchGoto(c,'camera');return}
  if(c.t>c.maxT||clock>=LAST)quit(c);
}
function catchGoto(c,by){
  if(c.caught)return;
  c.caught=true;D.gotoCaught++;
  const m=c.m;if(m){m.occ=null;m.res=null;m.flash=0}c.m=null;
  c.emote={ch:'!',t:30};c.speed=0.55;
  floatAt(c.x,c.y,'ゴト発見！','#ff2d55');sfx('bad');
  news(`ゴト師を${by==='camera'?'防犯カメラで':'店員が'}発見！（被害${man(c.loot)}で済みました）`,'good');
  S.trust=clamp(S.trust+1,0,100);
  const w=custs.filter(x=>!x.goto&&x.st==='play');if(w.length)tweet(pick(w),'goto',1,3);
  goExit(c);
}

/* ---------- 規制 ---------- */
function regulatedIds(){const s=new Set();for(const r of S.regu)if(!r.done)REGS[r.i].ids.forEach(id=>s.add(id));return s}
function modelOnSale(id){
  const m=MB[id];
  if((m.gen||1)>S.gen)return false;
  for(const r of S.regu)if(REGS[r.i].ids.includes(id))return false;
  return true;
}
function dayStartFeatures(R){
  R.morning=[];
  REGS.forEach((rg,i)=>{
    if(S.day>=rg.day&&!S.regu.some(r=>r.i===i)){
      S.regu.push({i,until:S.day+rg.grace,done:false});S.gen=Math.max(S.gen,i+2);
      const n=machines().filter(m=>rg.ids.includes(m.type)).length;
      news(`規制発表「${rg.name}」：${rg.ids.map(id=>MB[id].name).join('・')}は${dateStr(S.day+rg.grace)}までに撤去（店に${n}台）`,'big');
      R.morning.push({kind:'reg',title:'規制発表！',sub:`${rg.name}（${n}台が撤去対象）`});
    }
  });
  for(const r of S.regu){
    if(!r.done&&S.day>r.until){
      const ids=REGS[r.i].ids,gone=G.objs.filter(o=>o.kind==='m'&&ids.includes(o.type));
      G.objs=G.objs.filter(o=>!gone.includes(o));S.storage=S.storage.filter(it=>!(it.kind==='m'&&ids.includes(it.type)));
      r.done=true;layoutChanged();
      if(gone.length){news(`規制で${gone.length}台を撤去しました`,'bad');R.morning.push({kind:'regdone',title:'規制で撤去',sub:`${gone.length}台がなくなりました`})}
    }
  }
}
const regPending=()=>S.regu.filter(r=>!r.done).map(r=>({rg:REGS[r.i],until:r.until,n:machines().filter(m=>REGS[r.i].ids.includes(m.type)).length}));

/* ---------- 目標とエンディング ---------- */
const GOALS=[
 {id:'m20',name:'台を20台にする',chk:()=>machines().length>=20,reward:300000},
 {id:'st5',name:'店員を5人にする',chk:()=>S.staff.length>=5,reward:200000},
 {id:'v150',name:'1日に150人来店',chk:R=>R.visitors>=150,reward:400000},
 {id:'ev',name:'イベントで「激アツ」',chk:R=>R.ev&&R.ev.judge==='激アツ',reward:300000},
 {id:'cam',name:'ゴト師を捕まえる',chk:R=>R.gotoCaught>0,reward:200000},
 {id:'go',name:'オープン期間で「大成功」',chk:R=>R.go&&R.go.final&&R.go.final.judge==='大成功',reward:600000},
 {id:'reg',name:'常連さんを3人つくる',chk:()=>Object.values(S.regs).filter(r=>r.loy>=70&&r.st!=='gone').length>=3,reward:500000},
 {id:'move',name:'新しい店に移転する',chk:()=>S.moved>0,reward:500000},
 {id:'riv',name:'ライバル店を1つ閉店させる',chk:()=>S.rivals.some(r=>!r.open),reward:1000000},
 {id:'m60',name:'台を60台にする',chk:()=>machines().length>=60,reward:1500000},
 {id:'eki',name:'駅前に出店する',chk:()=>G.loc==='ekimae',reward:2000000},
 {id:'sh50',name:'町のシェア50%',chk:R=>R.share>=0.5,reward:3000000},
 {id:'r4',name:'ランク4「県内の有名店」',chk:()=>rankNo()>=4,reward:3000000},
 {id:'m120',name:'台を120台にする',chk:()=>machines().length>=120,reward:5000000},
];
function dayEndFeatures(R){
  R.goals=[];
  for(const g of GOALS){if(!S.goals[g.id]&&g.chk(R)){S.goals[g.id]=S.day;S.money+=g.reward;R.goals.push(g);news(`目標達成「${g.name}」ボーナス${man(g.reward)}`,'good')}}
  const d=dateOf(S.day);
  if(d.getMonth()===11&&d.getDate()===31)R.award=holdAwards();   /* 町のホールアワード（年末） */
  storyEndDay(R);
}
function score(){return Math.round(S.totalVisitors/10+Math.max(0,S.money-S.loan)/100000+S.rep*20+machines().length*10)}

/* ---------- 機種データベース（名前・出玉率・確率の変更をこの端末に保存） ---------- */
const MDB_KEY='pachinkasu-mdb1';
const MDB_DEF=Object.fromEntries(MODELS.map(m=>[m.id,{name:m.name,rates:m.rates?m.rates.slice():null,prob:m.prob??null}]));
let mdbEdits={};
const clampRate=v=>Math.round(clamp(v,SLOT_MIN,SLOT_MAX)*10)/10;
function mdbClean(o){
  const out={};if(!o||typeof o!=='object')return out;
  for(const[id,e]of Object.entries(o)){
    const md=MB[id],d=MDB_DEF[id];if(!md||!d||!e||typeof e!=='object')continue;const r={};
    if(typeof e.name==='string'&&e.name.trim()&&e.name.trim()!==d.name)r.name=e.name.trim().slice(0,30);
    if(md.k==='s'&&Array.isArray(e.rates)&&e.rates.length===6&&e.rates.every(v=>isFinite(+v))){const rt=e.rates.map(v=>clampRate(+v));if(rt.join()!==d.rates.join())r.rates=rt}
    if(md.k==='p'&&PROBS.includes(+e.prob)&&+e.prob!==d.prob)r.prob=+e.prob;
    if(Object.keys(r).length)out[id]=r;
  }
  return out;
}
function mdbApply(){for(const md of MODELS){const d=MDB_DEF[md.id],e=mdbEdits[md.id]||{};md.name=e.name||d.name;if(md.k==='s')md.rates=(e.rates||d.rates).slice();else md.prob=e.prob||d.prob}}
function mdbLoad(){try{const o=JSON.parse(localStorage.getItem(MDB_KEY)||'null');mdbEdits=mdbClean(o&&o.m)}catch(e){mdbEdits={}}mdbApply()}
function mdbSave(){try{localStorage.setItem(MDB_KEY,JSON.stringify({v:1,m:mdbEdits}))}catch(e){}}
function mdbSet(o){mdbEdits=mdbClean(o);mdbSave();mdbApply()}
