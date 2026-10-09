/* ===== sim.js : 営業シミュレーション ===== */
const SHIRTS=['#ef4444','#3b82f6','#22c55e','#facc15','#a855f7','#f8fafc','#f97316','#14b8a6','#334155','#ec4899'];
const HAIRS=['#1b1b1b','#3b2a1a','#6b4a2b','#c8a165','#7a2a1a','#1b1b1b'];
const SKINS=['#f6d1b0','#eabf98','#d9a77f','#f3dcc6'];
let custs=[],staffA=[],D=null,clock=OPEN,cid=0,spawnAcc=0,queueLeft=0,queueAcc=0,regQueue=[],hunterFrac=0.1,lambdaBase=0;
let trash=new Map(),counters=[],rooms=new Map(),todayTargets=new Set(),todayInfo=null;

/* ---------- イベント ---------- */
function eventTargets(ev=S.event){
  const ms=machines();
  switch(ev.type){
    case 'island':return ms.filter(m=>m.island===ev.target);
    case 'tail':return ms.filter(m=>m.no%10===Number(ev.target));
    case 'model':return ms.filter(m=>m.type===ev.target);
    case 'newm':return ms.filter(m=>m.installDay>=S.day-1);
    case 'renewal':case 'media':case 'season':case 'anniv':return ms;
  }
  return [];
}
function eventLabel(ev=S.event){
  switch(ev.type){
    case 'island':return `${ev.target}島 全台系`;
    case 'tail':return `末尾${ev.target}の日`;
    case 'model':return `${MB[ev.target]?shortName(MB[ev.target].name):''}の日`;
    case 'newm':return '新台入替';
    case 'renewal':return 'リニューアルオープン';
    case 'season':{const se=seasonInfo(S.day);return se?se.name:'季節イベント'}
    case 'anniv':{const an=annivInfo();return an?an.label:'周年祭'}
    case 'media':return ev.target==='tube'?'人気配信者の来店取材':'パチンコ雑誌の取材';
  }
  return '通常営業';
}
const recentEvents=()=>S.eventDays.filter(d=>d>=S.day-3&&d<S.day).length;
const newCount=()=>machines().filter(m=>m.installDay>=S.day-1).length;
const canRenewal=()=>!goActive()&&G.renoSpend>=1000000&&S.day-S.lastOpen>=21;
function eventMultToday(){
  if(goActive())return GO_MULT[S.go.type][goDayIdx()]||2;
  const ev=S.event;
  if(ev.type==='renewal')return GO_MULT.renewal[0];
  if(ev.type==='anniv')return GO_MULT.anniv[0];
  if(ev.type==='none')return 1;
  let m=1+(0.4+S.trust/100)*Math.pow(0.7,recentEvents());
  if(ev.type==='newm')m=1+0.5*Math.pow(0.8,recentEvents())+Math.min(0.4,newCount()*0.04);
  if(ev.type==='media')m=1+(ev.target==='tube'?1.1:0.6)*Math.pow(0.75,recentEvents())+S.trust/400;
  if(ev.type==='season')m=1+0.6*Math.pow(0.75,recentEvents())+S.trust/300;
  if(ev.ad)m+=0.35;
  m+=skEv()+conceptEv()+(S.regFx&&S.regFx.taka&&ev.type!=='newm'?0.05:0);
  if(dateOf(S.day).getDate()%10===7)m+=0.15;
  return m;
}
const avgOf=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
function judgeOf(avg,len=0){const a=avg+len;return a>=0.8?['激アツ','good']:a>=0.6?['まずまず','mid']:a>=0.4?['微妙','mid']:['ガセ','bad']}
function goJudge(score){return score>=0.7?['大成功','good']:score>=0.55?['成功','good']:score>=0.4?['いまいち','mid']:['大失敗','bad']}

/* ---------- 客足 ---------- */
function playerAttract(evMult){
  const ms=machines(),n=ms.length;
  const avgPop=avgOf(ms.map(popEff));
  const lineup=0.8+0.4*Math.min(1,avgPop/80);
  const decorF=0.9+0.2*decorRate();
  const regF=1+0.02*Object.values(S.regs).filter(r=>r.loy>=70&&r.st!=='gone').length;
  let a=(10+S.rep)*capF(n)*lineup*decorF*regF*evMult*(conceptOn()?1.04:1);
  if(S.mod&&S.day<=S.mod.until)a*=S.mod.mult;
  return a;
}
function segFactor(){const p=new Set(machines().map(segOf));return SEGS.reduce((a,s)=>a+(p.has(s)?SEG_SHARE[s]:0),0)}
function forecast(){
  const evm=eventMultToday(),aP=playerAttract(evm);
  const rs=openRivals().map(r=>({r,a:rivalAttract(r)}));
  const tot=aP+rs.reduce((a,x)=>a+x.a,0);
  const shares={me:aP/tot};rs.forEach(x=>shares[x.r.id]=x.a/tot);
  const info=dayInfo(S.day);
  const expected=LOCS[G.loc].town*info.mult*WEATHER[S.weather.today].mult*shares.me*(0.5+0.5*segFactor())*regVisitF(info);
  return {expected,shares,info,evm};
}
function pickSeg(info){
  const present=new Set(machines().map(segOf));
  const w=SEGS.map(s=>present.has(s)?SEG_SHARE[s]*(s.endsWith('lo')?info.elder*LOCS[G.loc].elder:info.hi)*conceptSeg(s):0);
  let r=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<4;i++){r-=w[i];if(r<=0)return SEGS[i]}
  return SEGS.find(s=>present.has(s));
}

/* ---------- 開店 ---------- */
function openStore(){
  if(S.phase!=='prep')return false;
  if(!machines().length){toast('台が1台もありません');sfx('bad');return false}
  const ev=S.event;
  if(goActive())ev.type='none';
  else if(ev.type==='renewal'&&!canRenewal())ev.type='none';
  else if(ev.type==='season'&&!seasonInfo(S.day))ev.type='none';
  else if(ev.type==='anniv'&&!(annivInfo()&&!annivInfo().held))ev.type='none';
  else if(ev.type!=='none'&&ev.type!=='renewal'&&eventTargets().length===0)ev.type='none';
  if(ev.type==='media'||ev.type==='season'||ev.type==='anniv')ev.ad=false;
  const cost=eventCost(ev);
  if(ev.type==='media'&&ev.target==='tube'&&S.regFx&&S.regFx.takaTube)S.regFx.takaTube=0;
  if(cost&&S.money<cost){toast('イベントのお金が足りません');sfx('bad');return false}
  openSnap=ser();
  if(ev.type==='renewal'){S.go={type:'renewal',start:S.day,len:2,scores:[]};S.lastOpen=S.day;G.renoSpend=0;ev.type='none'}
  if(ev.type==='anniv'){const an=annivInfo();S.go={type:'anniv',label:an.label,n:an.n,start:S.day,len:2,scores:[]};G.annivDone=(G.annivDone||[]).concat([an.n]);ev.type='none'}
  S.money-=cost;
  const fc=forecast();todayInfo=fc.info;
  const isGo=goActive(),isEv=ev.type!=='none';
  D={coin:0,out:0,drink:0,visitors:0,full:0,satSum:0,satN:0,hunters:0,seg:{},reasons:{},calls:[],ad:cost,shares:fc.shares,expected:fc.expected,
     isGo,goType:isGo?S.go.type:null,goIdx:goDayIdx(),evType:ev.type,evTarget:ev.target,evLabel:isGo?goLabel(S.go):eventLabel(),bigWins:[],regsVisited:[],rivalClosed:null,nearSmoke:new Set(),smokeSpots:new Map(),
     goto:0,gotoCaught:0,gotoEsc:0,gotoAt:null,broken:0,kiosk:hasDecor('kiosk'),exch:0,completes:[],hourly:[],lastHr:-1,elders:0,smokers:0};
  todayTargets=new Set(isEv?eventTargets():[]);
  hunterFrac=(isGo?0.4:ev.type==='media'?0.5:ev.type==='season'?0.4:isEv?0.35:0.1)*(D.kiosk?1.4:1);
  if(S.day>=10&&Math.random()<0.08+(isGo||isEv?0.12:0)+(rankNo()>=3?0.04:0))D.gotoAt=rnd(660,1140);
  const burst=Math.round(fc.expected*(isGo||isEv?0.25:0.05));
  queueLeft=Math.min(isGo?80:50,burst);queueAcc=0;spawnAcc=0;
  lambdaBase=Math.max(0,fc.expected-queueLeft)/765/0.986;
  custs=[];trash=new Map();clock=OPEN;
  machines().forEach(m=>{m.today=blank();m.occ=null;m.res=null;m.call=false;m.brk=false;m.broken=false;m.fixing=false});
  tweetReset();
  computeSmokeMaps();
  counters=G.objs.filter(o=>o.kind==='d'&&o.type==='counter').map(o=>({o,staff:null,help:0,busyUntil:0}));
  rooms=new Map();G.doors.forEach(d=>rooms.set(d.id,{inside:0}));
  regQueue=[];
  for(const def of REG_DEFS){const st=S.regs[def.id];st.planned=false;st.visited=false;st.unmet=false;st.daySat=0;st.top=null;
    if(regWantsVisit(def,st,fc.info)){st.planned=true;regQueue.push({t:regArrival(def),def})}}
  regQueue.sort((a,b)=>a.t-b.t);
  initStaffAgents();
  if(isEv||isGo)S.eventDays.push(S.day);
  S.phase='open';
  return true;
}
function computeSmokeMaps(){
  const cleaners=G.objs.filter(o=>o.kind==='d'&&o.type==='cleaner');
  for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
    if(zoneAt(x,y))continue;
    let near=false;
    for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(zoneAt(x+dx,y+dy)){near=true;break}
    if(near&&!cleaners.some(c=>Math.max(Math.abs(c.x-x),Math.abs(c.y-y))<=2))D.nearSmoke.add(key(x,y));
  }
  for(const o of G.objs)if(o.kind==='d'&&o.type==='booth')for(const[dx,dy]of DIRS){const x=o.x+dx,y=o.y+dy;if(inB(x,y)&&!occ.has(key(x,y)))D.smokeSpots.set(key(x,y),{t:'booth'})}
  for(const d of G.doors)if(d.type==='smokeroom'){const f=frontOf(d);D.smokeSpots.set(key(f.x,f.y),{t:'room',d})}
  for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){const k=key(x,y);if(zoneAt(x,y)&&!occ.has(k)&&!seatMap.has(k)&&!frontMap.has(k)&&!D.smokeSpots.has(k))D.smokeSpots.set(k,{t:'zone'})}
}

/* ---------- 経路 ---------- */
function bfsTo(a,goal){
  const W=G.W,H=G.H,sx=clamp(Math.round(a.x),0,W-1),sy=clamp(Math.round(a.y),0,H-1);
  const prev=new Int32Array(W*H).fill(-2),s=sy*W+sx,q=[s];prev[s]=-1;let h=0;
  while(h<q.length){
    const cur=q[h++],cx=cur%W,cy=(cur/W)|0;
    if(goal(cx,cy)){const path=[];let k=cur;while(k!==s){path.push({x:k%W,y:(k/W)|0});k=prev[k]}return path.reverse()}
    for(const[dx,dy]of DIRS){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const nk=ny*W+nx;if(prev[nk]!==-2||occ.has(nk))continue;prev[nk]=cur;q.push(nk)}
  }
  return null;
}
function moveAlong(a,dt){
  let dist=a.speed*dt;
  while(a.path.length&&dist>0){const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,l=Math.hypot(dx,dy);
    if(l<=dist){a.x=p.x;a.y=p.y;dist-=l;a.path.shift()}else{a.x+=dx/l*dist;a.y+=dy/l*dist;dist=0}}
  return a.path.length===0;
}
const adjGoal=(x0,y0)=>(x,y)=>Math.abs(x-x0)+Math.abs(y-y0)===1;

/* ---------- 客 ---------- */
function addWhy(c,k,d){c.sat+=d;c.why[k]=(c.why[k]||0)+d}
function spawnCust(seg,opt={}){
  const [k,rate]=seg.split('-'),coin=RATE[k][rate].coin,sc=coin/400,lo=rate==='lo';
  const elder=opt.elder??(Math.random()<(lo?0.55:0.12)*conceptElder()*(S.regFx&&S.regFx.tome?1.15:1));
  const hunter=opt.hunter??(Math.random()<hunterFrac*(lo?0.4:1)*conceptHunter());
  if(opt.rich==null&&!lo&&S.regFx&&S.regFx.kaneda&&Math.random()<0.03)opt.rich=1;
  const smoker=opt.smoker??(Math.random()<(lo?0.2:0.36));
  const d=doorPos();
  const look=opt.look?Object.assign({},opt.look):{shirt:pick(SHIRTS),hair:elder?pick(['#e5e5e5','#bdbdbd','#9ca3af']):pick(HAIRS),skin:pick(SKINS),cap:hunter?'#1c1c24':null};
  const c={id:++cid,seg,k,rate,coin,sc,elder,hunter,smoker,reg:opt.reg||null,look,
    x:d.x,y:G.H+0.8,path:[{x:d.x,y:d.y}],st:'enter',m:null,speed:elder?0.2:0.3,
    budget:(hunter?rnd(30000,80000):rnd(8000,40000))*sc*(opt.rich?2.5:1),goal:(hunter?rnd(40000,120000):rnd(10000,50000))*sc,
    maxT:hunter?rnd(240,700):lo?rnd(120,360):rnd(60,240),inv:0,won:0,t:0,sat:0,why:{},plan:[],cur:null,wait:0,emote:null,ph:Math.random()*10,
    nextSmoke:smoker?rnd(40,80):1e9,full:false,hidden:false,born:clock};
  custs.push(c);D.visitors++;D.seg[seg]=(D.seg[seg]||0)+1;if(hunter)D.hunters++;if(elder)D.elders++;if(smoker)D.smokers++;
  return c;
}
function chooseMachine(c){
  const cand=machines().filter(m=>!m.res&&!m.broken&&!m.today.done&&segOf(m)===c.seg);
  if(!cand.length)return null;
  const ws=cand.map(m=>{
    const s=seatOf(m),z=zoneAt(s.x,s.y);let w;
    if(c.hunter){
      if(c.k==='s')w=5+(todayTargets.has(m)?40+60*S.trust/100:0)+(m.yest&&m.yest.out>m.yest.coin?(D.kiosk?40:15):0)+popEff(m)*0.1;
      else w=4+Math.pow(m.nail+3,2)*6+(todayTargets.has(m)?30:0)+popEff(m)*0.1;
      w=w*w;
    }else{
      w=popEff(m)*(todayTargets.has(m)?1.3:1)*rnd(0.6,1.4);
      if(c.k==='p')w*=1+0.15*m.nail;
    }
    if(c.smoker)w*=z?1.8:0.75;else w*=z?0.12:(D.nearSmoke.has(key(s.x,s.y))?0.7:1);
    if(islandMixed(m))w*=0.75;
    if(trash.has(key(s.x,s.y)))w*=0.7;
    return Math.max(0.01,w);
  });
  let r=Math.random()*ws.reduce((a,b)=>a+b,0);
  for(let i=0;i<cand.length;i++){r-=ws[i];if(r<=0)return cand[i]}
  return cand[cand.length-1];
}
function seek(c){
  if(clock>=LAST){goExit(c);return}
  if(!machines().some(m=>segOf(m)===c.seg)){addWhy(c,'noSeg',-0.2);c.emote={ch:'？',t:25};goExit(c);return}
  const m=chooseMachine(c);
  if(!m){c.full=true;c.emote={ch:'？',t:25};D.full++;if(c.reg)S.regs[c.reg].unmet=true;tweet(c,'full',0.15,1);goExit(c);return}
  const s=seatOf(m),path=bfsTo(c,(x,y)=>x===s.x&&y===s.y);
  if(!path){goExit(c);return}
  m.res=c.id;c.m=m;c.path=path;c.st='toSeat';
}
function onSit(c){
  const m=c.m,s=seatOf(m),z=zoneAt(s.x,s.y),k=key(s.x,s.y);
  c.zone=z;
  if(c.smoker){if(z)addWhy(c,'smokeOk',0.08)}
  else if(z)addWhy(c,'smokeIn',c.elder?-0.38:-0.3);
  else if(D.nearSmoke.has(k))addWhy(c,'smokeDrift',-0.1);
  if(islandMixed(m))addWhy(c,'mix',-0.1);
  if(trash.has(k)){addWhy(c,'dirty',-0.05);trash.delete(k)}
  if(c.k==='p'){
    const kr=sk('kugi');
    if(m.nail<=-1){const base=m.nail===-2?0.5:0.75;addWhy(c,'nailBad',(m.nail===-2?-0.18:-0.08)*(1-0.25*kr));c.maxT*=base+(1-base)*0.25*kr}
    else if(m.nail>=1)addWhy(c,'nailGood',(m.nail===2?0.12:0.06)*(1+0.25*kr+(S.regFx&&S.regFx.gen?0.3:0)));
  }
  if(conceptOn()&&CONCEPTS[conceptOn()].test(m))addWhy(c,'concept',0.04);
  m.occ=c.id;c.st='play';
  if(c.goto)return;
  if(todayTargets.has(m)&&c.hunter)tweet(c,'target',0.5,2);
  else if(c.why.smokeIn)tweet(c,'smokeIn',0.5,2);
  else if(c.why.nailGood&&m.nail===2)tweet(c,'nailGood',0.35,1);
  else if(c.why.nailBad)tweet(c,'nailBad',0.35,1);
  else if(c.why.mix)tweet(c,'mix',0.25,1);
  else if(c.why.smokeDrift)tweet(c,'smokeDrift',0.3,1);
  else if(c.why.smokeOk)tweet(c,'smokeOk',0.2,1);
  else if(m.installDay>=S.day-1&&m.installDay>0)tweet(c,'newm',0.3,1);
  else if(c.hunter&&D.kiosk&&m.yest&&m.yest.out>m.yest.coin)tweet(c,'data',0.3,1);
}
function callStaff(c,type){c.st='call';c.callAt=clock;c.callType=type;c.m.call=true;c.assigned=false;D.calls.push(c);c.emote={ch:'!',t:6}}
function play(c,dt){
  const m=c.m,md=MB[m.type],cin=c.coin*dt;
  if(c.goto){gotoStep(c,dt);return}
  c.inv+=cin;c.t+=dt;S.money+=cin;D.coin+=cin;m.today.coin+=cin;m.today.mins+=dt;m.today.g=(m.today.g||0)+dt*(md.k==='s'?S_GPM:P_SPM*machR(m)/NAIL_R[2]);
  const hit=hitMean(m)*c.sc,p=c.coin*machR(m)/hit;
  if(Math.random()<1-Math.exp(-p*dt)){
    let pay=Math.max(100,Math.round(hit*payMult(md)/100)*100);
    /* コンプリート：1台の差玉が上限に届いたら、そこで払い出しを止めて今日は終了 */
    const cap=COMPLETE[md.k]*unitYen(m),diff=m.today.out-m.today.coin,done=diff+pay>=cap;
    if(done)pay=Math.max(0,Math.round(cap-diff));
    const ex=md.k==='s'?SLOT_EXCH:1;
    c.won+=pay;S.money-=pay*ex;D.out+=pay;D.exch+=pay*(1-ex);m.today.out+=pay;m.today.hits++;
    m.flash=1.6;c.emote={ch:'！',t:10};floatAt(m.x,m.y,'大当り','#ff2d55');sfx('hit');tweet(c,'hit',0.12,1);
    if(done){completeMachine(m,c);return}
    if(Math.random()<0.1){callStaff(c,'box');return}
  }
  if(Math.random()<dt/450){callStaff(c,'jam');return}
  if(Math.random()<dt/1800*(1+Math.min(2,Math.max(0,S.day-m.installDay)/90))){
    m.broken=true;m.flash=0;D.broken++;addWhy(c,'broken',-0.15);tweet(c,'broken',0.6,2);floatAt(m.x,m.y,'故障','#64748b');sfx('bad');quit(c);return;
  }
  const net=c.won-c.inv;
  if(c.smoker&&!c.zone&&c.t>=c.nextSmoke){startSmoke(c,true);return}
  if(net<-c.budget||c.t>c.maxT||clock>=LAST||(net>c.goal&&Math.random()<0.03*dt))quit(c);
}
function completeMachine(m,c){
  const md=MB[m.type];
  m.today.done=true;m.flash=4;
  D.completes.push({no:m.no,id:m.type,k:md.k});
  floatAt(m.x,m.y,'コンプリート！','#ffcf3a');sfx('fanfare');
  news(`${m.no}番台「${shortName(md.name)}」がコンプリート！差玉+${COMPLETE[md.k].toLocaleString('ja-JP')}${unitName(md.k)}で今日は打ち止め`,'good');
  tweet(c,'complete',1,3);
  quit(c);
}
function startSmoke(c,mid){
  if(!D.smokeSpots.size){
    addWhy(c,'noSmoke',mid?-0.2:-0.1);tweet(c,'noSmoke',0.3,1);
    if(mid){c.maxT*=0.6;c.nextSmoke=1e9}else nextPlan(c);
    return;
  }
  const path=bfsTo(c,(x,y)=>D.smokeSpots.has(key(x,y)));
  if(!path){addWhy(c,'noSmoke',-0.15);if(mid){c.nextSmoke=1e9}else nextPlan(c);return}
  if(mid){c.m.brk=true;c.m.occ=null}
  c.after=mid?'return':'plan';c.path=path;c.st='toSmoke';
}
function arriveSmoke(c){
  const spot=D.smokeSpots.get(key(Math.round(c.x),Math.round(c.y)));
  if(spot&&spot.t==='room'){c.door=spot.d;c.roomDur=5;tryEnter(c);return}
  c.st='smoking';c.wait=5;c.emote={ch:'~',t:5};
}
function afterRoomOrSmoke(c){
  if(c.after==='return'){
    c.nextSmoke=c.t+rnd(50,90);
    const s=seatOf(c.m),p=bfsTo(c,(x,y)=>x===s.x&&y===s.y);
    if(p){c.path=p;c.st='return'}else{c.m.brk=false;c.m.res=null;c.m=null;goExit(c)}
  }else nextPlan(c);
}
function goRoom(c,door,dur,after){
  const f=frontOf(door),p=bfsTo(c,(x,y)=>x===f.x&&y===f.y);
  if(!p)return false;
  c.path=p;c.st='toRoom';c.door=door;c.roomDur=dur;c.after=after;return true;
}
function tryEnter(c){
  const r=rooms.get(c.door.id);
  if(r&&r.inside<WB[c.door.type].cap){r.inside++;c.path=[insideOf(c.door)];c.st='intoRoom';c.door.anim=clock}
  else{c.st='roomQ';c.qStart=clock}
}
function quit(c){
  const m=c.m;if(m){m.occ=null;m.res=null;m.call=false;m.brk=false;
    const s=seatOf(m);if(Math.random()<0.22*WEATHER[S.weather.today].dirt&&!trash.has(key(s.x,s.y)))trash.set(key(s.x,s.y),{x:s.x,y:s.y});}
  if(c.goto){m&&(m.occ=null,m.res=null);c.m=null;if(!c.caught){D.gotoEsc+=c.loot;news(`ゴト師に${man(c.loot)}抜かれた…（防犯カメラで防げます）`,'bad')}goExit(c);return}
  const net=c.won-c.inv;c.net=net;
  c.sat+=0.08;
  if(net>=30000*c.sc)tweet(c,'bigwin',0.45,2,{v:man(net)});else if(net<-15000*c.sc)tweet(c,'lose',0.25,1,{v:man(-net)});
  if(net>0)addWhy(c,'win',0.4+Math.min(0.2,net/(150000*c.sc)));else addWhy(c,'lose',-Math.min(0.35,-net/(80000*c.sc)));
  if(net>=50000*c.sc&&m)D.bigWins.push({no:m.no,k:kindOf(m),lv:kindOf(m)==='s'?m.set:m.nail,net,seg:c.seg});
  c.emote={ch:net>0?'♪':'…',t:18};c.m=null;
  const plan=[];
  if(clock<LAST){
    if(Math.random()<0.25)plan.push('toilet');
    if(c.smoker&&!c.zone&&Math.random()<0.5)plan.push('smoke');
    if(Math.random()<0.35)plan.push('drink');
    if(net<-20000*c.sc&&Math.random()<0.4)plan.push('rest');
  }
  if(net>0)plan.push('counter');
  c.plan=plan;nextPlan(c);
}
function nearestDoorOfType(c,type){
  const ds=G.doors.filter(d=>d.type===type);if(!ds.length)return null;
  return ds.map(d=>({d,f:frontOf(d)})).sort((a,b)=>(Math.abs(a.f.x-c.x)+Math.abs(a.f.y-c.y))-(Math.abs(b.f.x-c.x)+Math.abs(b.f.y-c.y)))[0].d;
}
function nextPlan(c){
  while(c.plan.length){
    const a=c.plan.shift();
    if(clock>=LAST&&a!=='counter')continue;
    if(a==='toilet'){const d=nearestDoorOfType(c,'toilet');if(d&&goRoom(c,d,8,'plan'))return;addWhy(c,'noToilet',-0.2);tweet(c,'noToilet',0.3,1);continue}
    if(a==='smoke'){startSmoke(c,false);if(c.st==='toSmoke')return;continue}
    if(a==='counter'){
      const open=counters.filter(k=>k.staff);
      if(!open.length){addWhy(c,'noCounter',-0.5);c.emote={ch:'×',t:15};continue}
      const set=new Set(open.map(k=>key(k.o.x,k.o.y)));
      const p=bfsTo(c,(x,y)=>DIRS.some(([dx,dy])=>inB(x+dx,y+dy)&&set.has(key(x+dx,y+dy))));
      if(!p){addWhy(c,'noCounter',-0.5);continue}
      c.path=p;c.cur={a};c.st='walk';return;
    }
    const t=a==='drink'?'vending':'bench';
    const targets=G.objs.filter(o=>o.kind==='d'&&o.type===t);
    if(!targets.length)continue;
    const set=new Set(targets.map(o=>key(o.x,o.y)));
    const p=bfsTo(c,(x,y)=>DIRS.some(([dx,dy])=>inB(x+dx,y+dy)&&set.has(key(x+dx,y+dy))));
    if(!p)continue;
    c.path=p;c.cur={a};c.st='walk';return;
  }
  goExit(c);
}
function arriveAmenity(c){
  const a=c.cur.a;
  if(a==='counter'){
    const cx=Math.round(c.x),cy=Math.round(c.y);
    const k=counters.find(k=>k.staff&&Math.abs(k.o.x-cx)+Math.abs(k.o.y-cy)===1)||counters.find(k=>k.staff);
    if(!k){addWhy(c,'noCounter',-0.5);nextPlan(c);return}
    const dur=Math.max(1.2,(4-staffSrv(k.staff.s)*0.5)*(k.help?0.75:1));k.staff.done++;
    const start=Math.max(clock,k.busyUntil);k.busyUntil=start+dur;
    if(start-clock>6)addWhy(c,'counterWait',-0.1);
    c.wait=k.busyUntil-clock;c.st='wait';return;
  }
  c.wait=a==='drink'?3:12;c.st='wait';
}
function applyAmenity(c){
  const a=c.cur&&c.cur.a;
  if(a==='drink'){S.money+=150;D.drink+=150;c.sat+=0.03;floatAt(c.x,c.y,'+¥150','#16a34a')}
  else if(a==='rest'){addWhy(c,'rest',buffOn('tea')?0.12:0.06);c.emote={ch:'♨',t:8}}
  c.cur=null;
}
function goExit(c){
  const p=bfsTo(c,(x,y)=>isEntrance(x,y));
  if(p)c.path=p;else{const d=doorPos();c.x=d.x;c.y=d.y;c.path=[]}
  c.st='exit';
}
function finish(c){
  const i=custs.indexOf(c);if(i>=0)custs.splice(i,1);
  if(c.m){c.m.occ=null;c.m.res=null;c.m.call=false;c.m.brk=false}
  if(c.full||c.goto)return;
  const dirt=trash.size/Math.max(10,machines().length);
  if(dirt>0.2)addWhy(c,'dirty',-Math.min(0.15,dirt*0.2));
  const dr=decorRate();
  if(dr>0.5){addWhy(c,'decorGood',(dr-0.5)*0.4);tweet(c,'decor',0.05,0)}else if(dr<0.2)addWhy(c,'decorBad',(dr-0.2)*0.5);
  if(skSat())c.sat+=skSat();
  if(buffOn('greet')&&c.born<720)addWhy(c,'greet',0.04);
  D.satSum+=c.sat;D.satN++;
  for(const[k,v]of Object.entries(c.why)){const r=D.reasons[k]||(D.reasons[k]={n:0,sum:0});r.n++;r.sum+=v}
  if(c.reg){
    const st=S.regs[c.reg];st.visited=true;st.daySat=c.sat;
    let top=null,tv=0;for(const[k,v]of Object.entries(c.why))if(Math.abs(v)>tv){tv=Math.abs(v);top=k}
    st.top=top;
  }
}
function stepCust(c,dt){
  if(c.emote){c.emote.t-=dt;if(c.emote.t<=0)c.emote=null}
  switch(c.st){
    case 'enter':if(moveAlong(c,dt))seek(c);break;
    case 'toSeat':if(moveAlong(c,dt))onSit(c);break;
    case 'play':play(c,dt);break;
    case 'call':
      if(clock-c.callAt>14&&!c.twW){c.twW=1;tweet(c,'wait',0.5,2)}
      if(clock-c.callAt>45){addWhy(c,'waitStaff',-0.25);c.served=true;quit(c)}
      else if(clock>=LAST){quit(c)}
      break;
    case 'toSmoke':if(moveAlong(c,dt))arriveSmoke(c);break;
    case 'smoking':c.wait-=dt;if(c.wait<=0)afterRoomOrSmoke(c);break;
    case 'return':if(moveAlong(c,dt)){c.m.brk=false;c.m.occ=c.id;c.st='play'}break;
    case 'toRoom':if(moveAlong(c,dt))tryEnter(c);break;
    case 'roomQ':{
      const r=rooms.get(c.door.id);
      if(r&&r.inside<WB[c.door.type].cap){r.inside++;c.path=[insideOf(c.door)];c.st='intoRoom';c.door.anim=clock}
      else if(clock-c.qStart>6&&!c.qPen){c.qPen=true;addWhy(c,'toiletWait',buffOn('toilet')?-0.05:-0.12)}
      break;}
    case 'intoRoom':if(moveAlong(c,dt)){c.hidden=true;c.st='inRoom';c.wait=c.roomDur}break;
    case 'inRoom':c.wait-=dt;if(c.wait<=0){c.hidden=false;const r=rooms.get(c.door.id);if(r)r.inside--;c.door.anim=clock;c.path=[frontOf(c.door)];c.st='outRoom'}break;
    case 'outRoom':if(moveAlong(c,dt))afterRoomOrSmoke(c);break;
    case 'walk':if(moveAlong(c,dt))arriveAmenity(c);break;
    case 'wait':c.wait-=dt;if(c.wait<=0){applyAmenity(c);nextPlan(c)}break;
    case 'exit':if(moveAlong(c,dt)){c.path=[{x:c.x,y:G.H+0.9}];c.st='out'}break;
    case 'out':if(moveAlong(c,dt))finish(c);break;
  }
}

/* ---------- 店員 ---------- */
function freeAdj(o){
  const opts=DIRS.map(([dx,dy])=>({x:o.x+dx,y:o.y+dy})).filter(p=>inB(p.x,p.y)&&!occ.has(key(p.x,p.y))&&!isEntrance(p.x,p.y));
  return opts.find(p=>!seatMap.has(key(p.x,p.y))&&!frontMap.has(key(p.x,p.y)))||opts[0]||null;
}
function initStaffAgents(){
  const d=doorPos();
  staffA=S.staff.map((s,i)=>({s,role:s.role,x:clamp(d.x+((i%5)-2),0,G.W-1),y:Math.max(0,d.y-1-Math.floor(i/5)),path:[],st:'idle',task:null,t:0,idleT:rnd(2,15),speed:staffSpeed(s),ph:Math.random()*10,done:0,absentUntil:s.lateToday&&s.role!=='counter'?780:0,hidden:!!(s.lateToday&&s.role!=='counter')}));
  for(const a of staffA){const k=occ.get(key(a.x,a.y));if(k){a.x=d.x;a.y=d.y}}
  let ci=0;
  for(const a of staffA.filter(a=>a.role==='counter')){
    if(ci<counters.length){const k=counters[ci++];k.staff=a;const h=freeAdj(k.o);if(h){a.x=h.x;a.y=h.y}a.st='station';a.home=h}
    else if(counters.length){counters[(ci++)%counters.length].help++;a.st='station'}
  }
}
function stepStaff(a,dt){
  if(a.absentUntil){if(clock<a.absentUntil)return;a.absentUntil=0;a.hidden=false;const d=doorPos();a.x=d.x;a.y=d.y;a.path=[];a.st='idle'}
  if(a.role==='counter'){if(a.path.length)moveAlong(a,dt);return}
  if(a.st==='go'){if(moveAlong(a,dt)){
    if(a.role==='hall'&&a.fix){if(a.fix.broken){a.st='work';a.t=Math.max(3,7-staffSrv(a.s)*0.6)*(a.s.pers==='shokunin'?0.7:1)}else{a.fix.fixing=false;a.fix=null;a.st='idle'}}
    else if(a.role==='hall'){if(a.task&&a.task.st==='call'){a.st='work';a.t=Math.max(1,3-staffSrv(a.s)*0.35)*(1-0.1*sk('omote'))}else{a.st='idle';a.task=null}}
    else{if(a.task&&trash.has(a.task)){a.st='work';a.t=1.5}else{a.st='idle';a.task=null}}
  }return}
  if(a.st==='work'){a.t-=dt;if(a.t<=0){
    a.done++;
    if(a.role==='hall'&&a.fix){a.fix.broken=false;a.fix.fixing=false;floatAt(a.fix.x,a.fix.y,'修理OK','#16a34a');a.fix=null}
    else if(a.role==='hall'&&a.task&&a.task.st==='call'){
      const c=a.task,w=clock-c.callAt;
      if(w<8)addWhy(c,'quickStaff',0.04);else if(w<20)addWhy(c,'slowStaff',-0.04);else if(w<35)addWhy(c,'waitStaff',-0.1);else addWhy(c,'waitStaff',-0.18);
      c.st='play';c.m.call=false;c.emote=null;
    }else if(a.role==='clean'&&a.task)trash.delete(a.task);
    a.st='idle';a.task=null;
  }return}
  // idle
  if(a.role==='hall'){
    const pend=D.calls.filter(c=>c.st==='call'&&!c.assigned);
    if(pend.length){
      pend.sort((p,q)=>(Math.abs(p.x-a.x)+Math.abs(p.y-a.y))-(Math.abs(q.x-a.x)+Math.abs(q.y-a.y)));
      const c=pend[0],s=seatOf(c.m),p=bfsTo(a,(x,y)=>Math.abs(x-s.x)+Math.abs(y-s.y)<=1);
      if(p){c.assigned=true;a.task=c;a.path=p;a.st='go';return}
    }
    const br=machines().find(m=>m.broken&&!m.fixing);
    if(br){const p=bfsTo(a,(x,y)=>Math.abs(x-br.x)+Math.abs(y-br.y)===1);if(p){br.fixing=true;a.fix=br;a.path=p;a.st='go';return}}
    const g=custs.find(c=>c.goto&&c.st==='play'&&!c.caught&&Math.abs(c.x-a.x)+Math.abs(c.y-a.y)<=3);
    if(g&&Math.random()<0.05*dt*(1+staffSrv(a.s)*0.2)*skGoto())catchGoto(g,'staff');
  }else if(a.role==='clean'&&trash.size){
    const taken=new Set(staffA.filter(b=>b.role==='clean'&&b.task).map(b=>b.task));
    const p=bfsTo(a,(x,y)=>{const k=key(x,y);return trash.has(k)&&!taken.has(k)});
    if(p){const end=p.length?p[p.length-1]:{x:Math.round(a.x),y:Math.round(a.y)};a.task=key(end.x,end.y);a.path=p;a.st='go';return}
  }
  if(a.path.length){moveAlong(a,dt);return}
  a.idleT-=dt;
  if(a.idleT<=0){
    a.idleT=rnd(12,35);
    const ms=machines();if(!ms.length)return;
    const s=seatOf(pick(ms)),p=bfsTo(a,(x,y)=>Math.abs(x-s.x)+Math.abs(y-s.y)===1&&!seatMap.has(key(x,y)));
    if(p)a.path=p;
  }
}

/* ---------- 1フレームの更新 ---------- */
function update(dt){
  clock+=dt;
  /* 1時間ごとの稼働（毎時30分に数える） */
  const hr=Math.floor((clock-30)/60);
  if(hr!==D.lastHr&&clock>=OPEN+30&&clock<LAST){D.lastHr=hr;const pl=custs.filter(c=>c.m&&(c.st==='play'||c.st==='call')&&!c.goto);D.hourly.push({h:hr,p:pl.filter(c=>c.k==='p').length,s:pl.filter(c=>c.k==='s').length})}
  if(clock<LAST-20){
    if(queueLeft>0){queueAcc+=dt;while(queueAcc>=0.5&&queueLeft>0){queueAcc-=0.5;queueLeft--;const c=spawnCust(pickSeg(todayInfo),{hunter:Math.random()<0.75});tweet(c,'queue',0.06,1)}}
    while(regQueue.length&&regQueue[0].t<=clock){
      const {def}=regQueue.shift();
      spawnCust(def.seg,{reg:def.id,hunter:!!def.hunter,smoker:!!def.smoker,elder:!!def.elder,look:def.look,rich:def.rich});
      D.regsVisited.push(def.id);
    }
    if(D.gotoAt&&clock>=D.gotoAt){D.gotoAt=null;spawnGoto()}
    const h=clock/60,shape=h<11?1.4:h<13?0.8:h<17?0.9:h<20?1.35:0.7;
    spawnAcc+=lambdaBase*shape*dt;
    while(spawnAcc>=1){spawnAcc-=1;const c=spawnCust(pickSeg(todayInfo));if(S.weather.today==='rain')tweet(c,'rain',0.05,0);else tweet(c,'enter',0.02,0)}
  }
  for(const c of custs.slice())stepCust(c,dt);
  for(const a of staffA)stepStaff(a,dt);
  if(D.calls.length>40)D.calls=D.calls.filter(c=>c.st==='call');
  if(clock>=CLOSE&&custs.length===0)closeDay();
  else if(clock>=CLOSE+40){custs.slice().forEach(finish);closeDay()}
}

/* ---------- 閉店・日報 ---------- */
function closeDay(){
  if(S.phase!=='open')return;
  const ms=machines(),rent=rentOf(),wages=wagesTotal(),power=2500*ms.length;
  const brokenLeft=ms.filter(m=>m.broken).length,repairs=brokenLeft*15000,interest=Math.round(S.loan*LOAN_RATE*skRate()),goLab=goLabel(S.go);
  ms.forEach(m=>{m.broken=false;m.fixing=false});
  const gross=D.coin-D.out+D.exch,net=gross+D.drink-rent-wages-power-D.ad-repairs-interest;
  S.money-=rent+wages+power+repairs+interest;
  const rep0=S.rep,trust0=S.trust,avgSat=D.satN?D.satSum/D.satN:0;
  const payR=D.coin?D.out/D.coin:0.93,feel=clamp((payR-0.955)*30*(D.kiosk?1.5:1),-3.5,3.5);
  S.rep=clamp(S.rep+clamp(avgSat*10,-5,5)*(D.isGo?1.5:1)+feel+(30-S.rep)*0.02,0,100);
  let evr=null,gor=null,goodEvent=false;
  if(D.isGo){
    const dash=avgOf(ms.map(dashi)),satN=clamp((avgSat+0.3)/0.7,0,1),score=0.6*dash+0.4*satN;
    S.go.scores.push(score);
    gor={type:D.goType,idx:D.goIdx,len:S.go.len,score,dash,satN,mark:score>=0.7?'◎':score>=0.55?'○':score>=0.4?'△':'×'};
    if(S.go.scores.length>=S.go.len){
      const fin=avgOf(S.go.scores),[j,cls]=goJudge(fin),h=D.goType==='renewal'?0.5:D.goType==='anniv'?0.8:1;
      const eff={'大成功':[20,12,1.25,21],'成功':[8,5,1,0],'いまいち':[-15,-8,0.85,14],'大失敗':[-35,-18,0.65,45]}[j];
      S.trust=clamp(S.trust+eff[0]*h,0,100);S.rep=clamp(S.rep+eff[1]*h,0,100);
      if(eff[3])S.mod={mult:D.goType==='grand'?eff[2]:1+(eff[2]-1)*(D.goType==='anniv'?0.8:0.6),until:S.day+eff[3],label:j==='大成功'?`${goLab}大成功の評判`:`${goLab}での悪い評判`};
      gor.final={score:fin,judge:j,cls,trust:eff[0]*h,rep:eff[1]*h,mod:eff[3]?S.mod:null};
      S.goLog.push({day:S.day,type:D.goType,judge:j});
      goodEvent=cls==='good';
      S.go=null;
    }
  }else if(D.evType!=='none'){
    const tg=eventTargets({type:D.evType,target:S.event.target}),avg=avgOf(tg.map(dashi));
    const media=D.evType==='media',tube=media&&D.evTarget==='tube',season=D.evType==='season';
    const [j,cls]=judgeOf(avg,D.evType==='newm'?0.15:media?0.12:season?0.1:0);
    const mul=tube?1.6:media?1.2:season?1.3:1;
    if(season)news(cls==='good'?`${D.evLabel}は大盛況！「この店は出す」と評判に`:cls==='bad'?`${D.evLabel}なのに出ないと、お客さんががっかりしている…`:`${D.evLabel}はまずまずの入りだった`,cls==='good'?'good':cls==='bad'?'bad':'');
    const dT=Math.round({激アツ:10,まずまず:4,微妙:-4,ガセ:-12}[j]*mul);
    S.trust=clamp(S.trust+dT,0,100);if(j==='激アツ')S.rep+=2*mul;if(j==='ガセ')S.rep-=3*mul;
    if(media)news(tube?(cls==='good'?'配信動画が大バズリ！「神ホール」と紹介された':cls==='bad'?'配信で「ぼったくり店」と紹介されてしまった…':'配信で「ふつうの店」と紹介された'):(cls==='good'?'雑誌に「出る店」として載った！':cls==='bad'?'雑誌で「出さない店」と書かれた…':'雑誌に小さく載った'),cls==='good'?'good':cls==='bad'?'bad':'');
    evr={label:D.evLabel,n:tg.length,avg,judge:j,cls,dT,media:media||season};goodEvent=cls==='good';
  }
  // 常連
  const regVoices=[];
  for(const def of REG_DEFS){
    const st=S.regs[def.id];if(!st.planned)continue;
    if(st.visited){
      st.loy=clamp(st.loy+clamp(st.daySat*30,-15,12)+1,0,100);st.visits++;st.met=true;
      const lines=REG_LINES[st.top]||REG_LINES[st.daySat>=0?'win':'lose'];
      st.say=pick(lines);regVoices.push({name:def.name,say:st.say,good:st.daySat>=0});
      if(def.id==='taka'&&(D.isGo||D.evType!=='none')){
        const good=(gor&&gor.score>=0.55)||(evr&&evr.cls==='good'),bad=(gor&&gor.score<0.4)||(evr&&evr.cls==='bad');
        if(good){S.trust=clamp(S.trust+3,0,100);news('タカシがSNSで「この店は激アツ」と拡散！','good')}
        else if(bad){S.trust=clamp(S.trust-3,0,100);news('タカシがSNSで「ガセ店」と書き込んだ…','bad')}
      }
    }else if(st.unmet){st.loy=clamp(st.loy-5,0,100);st.say='座れなかったよ…';regVoices.push({name:def.name,say:st.say,good:false})}
    if(st.st!=='gone'&&st.loy<8){st.st='gone';news(`${def.name}が来なくなった…`,'bad')}
    else if(st.loy>=70&&!st.star){st.star=true;news(`${def.name}が常連になった！`,'good')}
    else if(st.loy<60)st.star=false;
  }
  rivalsEndDay(D.shares,goodEvent);
  const R0={};regEpisodes(R0);
  S.rep=clamp(Math.round(S.rep*10)/10,0,100);S.trust=clamp(Math.round(S.trust),0,100);
  const rk0=rankIdx();S.totalVisitors+=D.visitors;const rk1=rankIdx();
  ms.forEach(m=>{m.yest=m.today;m.today=blank()});
  const util=ms.length?ms.reduce((a,m)=>a+m.yest.mins,0)/(ms.length*(LAST-OPEN)):0;
  const byGive=[...ms].sort((a,b)=>(b.yest.out-b.yest.coin)-(a.yest.out-a.yest.coin));
  const voices=Object.entries(D.reasons).filter(([k,r])=>WHY[k]&&k!=='win'&&k!=='lose').map(([k,r])=>({k,n:r.n,score:Math.abs(r.sum),good:!!WHY[k].good})).sort((a,b)=>b.score-a.score).slice(0,5);
  const rivalNews=openRivals().filter(r=>r.ev||r.evKind==='newm'||r.evKind==='go').map(r=>r.name+(r.ev?'':`（${RIV_EV_LABEL[r.evKind]}）`));
  const R={day:S.day,date:dateLong(S.day),visitors:D.visitors,full:D.full,hunters:D.hunters,seg:D.seg,coin:D.coin,out:D.out,gross,drink:D.drink,rent,wages,power,ad:D.ad,net,
    rep0,rep1:S.rep,trust0,trust1:S.trust,ev:evr,go:gor,best:byGive[0],worst:byGive[byGive.length-1],voices,regVoices,share:D.shares.me,rivalNews,rivalClosed:D.rivalClosed,rivalHit:D.rivalHit,
    rankUp:rk1>rk0?RANKS[rk1].n:null,rankNo:rk1+1,money:S.money,avgSat,payR,feel,repairs,interest,brokenN:D.broken,goto:D.goto,gotoCaught:D.gotoCaught,gotoEsc:D.gotoEsc,exch:D.exch,completes:D.completes,util,brokenLeft};
  S.hist.push({day:S.day,net:Math.round(net),gross:Math.round(gross),visitors:D.visitors,rep:S.rep,share:D.shares.me,util:Math.round(util*1000)/1000,full:D.full});if(S.hist.length>90)S.hist.shift();
  S.lastDay={day:S.day,seg:D.seg,visitors:D.visitors,hunters:D.hunters,elders:D.elders,smokers:D.smokers,hourly:D.hourly,completes:D.completes};
  chainEndDay(R);
  S.negDays=S.money<0?(S.negDays||0)+1:0;
  judgeMissions(R);monAcc(R);yrAcc(R);staffEndDay(R);
  dayEndFeatures(R);
  // 翌日へ
  S.day++;S.event={type:'none',target:null,ad:false};S.phase='prep';
  S.weather.today=S.weather.tomorrow;S.weather.tomorrow=rollWeather(S.day+1);
  if(S.mod&&S.day>S.mod.until)S.mod=null;
  refreshCands(false);refreshOffers(false);
  R.rivalClosures=D.rivalClosures;R.rivalTalks=D.rivalTalks;
  dayStartFeatures(R);
  rivalsDayStart(R);
  storyDayStart(R);
  staffDayStart(R);
  if(R0.talks)(R.talks=R.talks||[]).push(...R0.talks);
  dayExp(R);
  makeMissions();
  {const an=annivInfo();if(an&&!an.held&&S.day-(G.openDay||1)===an.n){news(`今日で開店${an.n}日！ ${an.label}ができます（イベント →「${an.label}」・7日間だけ）`,'big');R.morning.push({kind:'anniv',good:true,title:`開店${an.n===100?'100日':an.n/365+'周年'}！`,sub:`${an.label}ができます（イベントから・7日間だけ）`})}}
  R.tomorrow={info:dayInfo(S.day),weather:S.weather.today,rivals:openRivals().filter(r=>r.evKind).map(r=>({name:r.name,label:RIV_EV_LABEL[r.evKind],boss:r.boss,say:rivalSay(r).text})),plans:visiblePlans().filter(p=>p.open-S.day<=7).map(p=>({shop:p.shop,open:p.open})),go:goActive()};
  custs=[];staffA=[];undoStack=[];openSnap=null;
  save();
  if(R.story&&R.story.newMonth&&!S.story.fired)storySnapshot();
  onDayClosed(R);
  return R;
}
