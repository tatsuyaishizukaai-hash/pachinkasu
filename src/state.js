/* ===== state.js : 状態・店舗・配置ルール ===== */
let S=null, G=null;
let occ=new Map(), seatMap=new Map(), frontMap=new Map(), islands=[];
let undoStack=[];

const yen=n=>(n<0?'-':'')+'¥'+Math.abs(Math.round(n)).toLocaleString('ja-JP');
const sgn=n=>(n>=0?'+':'-')+'¥'+Math.abs(Math.round(n)).toLocaleString('ja-JP');
const man=n=>{const a=Math.abs(n);return (n<0?'-':'')+(a>=1e8?(a/1e8).toFixed(1)+'億':a>=1e4?Math.round(a/1e4).toLocaleString('ja-JP')+'万':Math.round(a))+'円'};
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rndi=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const key=(x,y)=>y*G.W+x;
const inB=(x,y)=>x>=0&&y>=0&&x<G.W&&y<G.H;
const doorPos=()=>({x:Math.floor(G.W/2),y:G.H-1});
const isEntrance=(x,y)=>{const d=doorPos();return x===d.x&&y===d.y};
const machines=()=>G.objs.filter(o=>o.kind==='m');
const seatOf=m=>({x:m.x+DIRS[m.dir][0],y:m.y+DIRS[m.dir][1]});
const kindOf=m=>MB[m.type].k;
const segOf=m=>kindOf(m)+'-'+m.rate;
const blank=()=>({coin:0,out:0,hits:0,mins:0});
const machR=m=>kindOf(m)==='s'?MB[m.type].rates[m.set-1]/100:NAIL_R[m.nail+2];
const unitYen=m=>RATE[kindOf(m)][m.rate].unit;
const unitName=k=>k==='p'?'発':'枚';
const specOf=md=>md.k==='p'?(PROB_SPEC[md.prob]||'ミドル'):md.spec;
const slotProb=(md,set)=>md.hit[0]*Math.pow(md.hit[1]/md.hit[0],(set-1)/5);
/* 1回の当り（RUSH・AT込み）の平均の大きさ。高レートの円で */
function hitMean(m){const md=MB[m.type];return md.k==='p'?400*NAIL_R[2]*md.prob/P_SPM:500*machR(m)*slotProb(md,m.set)/S_GPM}
function geoN(q){let n=1;while(n<600&&Math.random()<q)n++;return n}
function probShape(prob){const P=PROB_SHAPE[prob]||PROB_SHAPE[319];return Object.assign({E:1+P.e*P.m*((1-P.lt)/(1-P.q)+P.lt/(1-P.ltq))},P)}
/* 当り1回の大きさ（平均を1とした倍率）。パチンコは確率が重いほど、スロットは vol が大きいほど荒れる */
function payMult(md){
  if(md.k==='p'){const P=probShape(md.prob);let k=0;if(Math.random()<P.e)k=geoN(Math.random()<P.lt?P.ltq:P.q);return (1+P.m*k)/P.E}
  if(md.vol===1)return Math.random()<0.65?1.25:0.536;
  const V=VOL_SHAPE[md.vol]||VOL_SHAPE[2],E=(1-V.up)/(1-V.q)+V.up/(1-V.uq);
  return geoN(Math.random()<V.up?V.uq:V.q)/E;
}
const diffUnits=(m,t)=>t?Math.round((t.out-t.coin)/unitYen(m)):0;
const dashi=m=>kindOf(m)==='s'?(m.set-1)/5:NAIL_SCORE[m.nail+2];
const zoneAt=(x,y)=>inB(x,y)&&G.zone[key(x,y)]===1;
const rateLabel=m=>RATE[kindOf(m)][m.rate].label;
function frontOf(d){return d.side==='t'?{x:d.pos,y:0}:d.side==='l'?{x:0,y:d.pos}:{x:G.W-1,y:d.pos}}
function insideOf(d){return d.side==='t'?{x:d.pos,y:-0.75}:d.side==='l'?{x:-0.75,y:d.pos}:{x:G.W-0.25,y:d.pos}}
function rankIdx(){let r=0;RANKS.forEach((x,i)=>{if(S.totalVisitors>=x.need)r=i});return r}
const rankNo=()=>rankIdx()+1;
const popEff=m=>MB[m.type].pop*(1+0.8*Math.max(0,1-(S.day-m.installDay)/10))*conceptPop(m)*(m.installDay>=S.day-3&&buffOn('newPop')?1.2:1)*hypeF(m);
function appealPts(){
  let a=FB[G.floor].appeal+WLB[G.wall].appeal;
  for(const o of G.objs)if(o.kind==='d')a+=DB[o.type].appeal;
  for(const d of G.doors)a+=WB[d.type].appeal;
  return a;
}
const decorRate=()=>Math.min(1,appealPts()/(G.W*G.H*0.3));
const stars=()=>{const n=Math.round(decorRate()*5);return '★'.repeat(n)+'☆'.repeat(5-n)};
const hasDecor=t=>G.objs.some(o=>o.kind==='d'&&o.type===t);
const hasDoor=t=>G.doors.some(d=>d.type===t);
function bindStore(){G=S.st}

/* ---------- 新規ゲーム ---------- */
function makeStore(loc,W,H,maxW,maxH){
  return {loc,W,H,maxW,maxH,floor:'tile',wall:'white',ownedFloors:['tile'],ownedWalls:['white'],objs:[],doors:[],zone:new Array(W*H).fill(0),openDay:S?S.day:1,renoSpend:0};
}
function newMachine(type,x,y,dir,extra={}){
  const k=MB[type].k;
  return Object.assign({kind:'m',type,x,y,dir,rate:'hi',set:k==='s'?2:undefined,nail:k==='p'?0:undefined,installDay:S.day},extra);
}
function addObj(o){
  o.id=S.nid++;
  if(o.kind==='m'){
    const k=MB[o.type].k;
    if(k==='s'&&!o.set)o.set=2;
    if(k==='p'&&o.nail==null)o.nail=0;
    o.rate=o.rate||'hi';o.installDay=o.installDay??S.day;o.today=blank();o.yest=o.yest||null;
  }
  G.objs.push(o);return o;
}
function newGame(name){
  S={v:3,name,day:1,money:2000000,rep:30,trust:50,totalVisitors:0,nid:1,st:null,storage:[],staff:[],cands:[],candsDay:0,rivals:[],regs:{},offers:[],offersDay:0,
     event:{type:'none',target:null,ad:false},eventDays:[],go:null,mod:null,weather:{today:'sun',tomorrow:'sun'},hist:[],news:[],phase:'prep',lastOpen:1,goLog:[]};
  fillDefaults();
  S.st=makeStore('jutaku',20,8,26,10);bindStore();
  const setsP=[0,0,-1,0],setsS=[2,1,3,2];
  for(let i=0;i<4;i++){
    addObj(newMachine('ponpoko',1+i,2,2,{nail:setsP[i],installDay:-30}));
    addObj(newMachine('umineko',1+i,3,0,{nail:setsP[(i+2)%4],installDay:-30}));
  }
  for(let i=0;i<3;i++){
    addObj(newMachine('neon7',6+i,2,2,{set:setsS[i],installDay:-30}));
    addObj(newMachine('bell',6+i,3,0,{set:setsS[i+1],installDay:-30}));
  }
  addObj({kind:'d',type:'counter',x:17,y:6});
  addObj({kind:'d',type:'vending',x:0,y:5});
  addObj({kind:'d',type:'plant',x:19,y:0});
  G.doors.push({id:S.nid++,type:'toilet',side:'t',pos:16});
  hireStaff(makeCandidate('hall',2,3));
  hireStaff(makeCandidate('counter',3,2));
  hireStaff(makeCandidate('clean',2,2));
  initRivals();initRegs();
  S.weather.today=rollWeather(1);S.weather.tomorrow=rollWeather(2);
  refreshCands(true);refreshOffers(true);
  S.go={type:'grand',start:1,len:3,scores:[]};
  const kin=S.rivals.find(r=>r.boss==='kinjo');if(kin)kin.next=true;   /* ゴールデン会館は隣の店 */
  undoStack=[];layoutChanged();
  storyInit(false);makeMissions();
  S.mn=null;maniaDefaults();
}

/* ---------- 保存 ---------- */
const SKIP_KEYS=new Set(['occ','res','flash','no','island','brk','call','busy','inside','anim','tmp','fixing']);
function ser(){return JSON.stringify(S,(k,v)=>SKIP_KEYS.has(k)?undefined:v)}
let openSnap=null;
function save(){try{localStorage.setItem(SAVE_KEY,S.phase==='open'?openSnap:ser())}catch(e){}}
function fillDefaults(){
  const d={loan:0,regu:[],gen:1,goals:{},moved:0,ended:null,yearLog:[],negDays:0,rivalPlans:[],rivalLog:[],incidents:[],selfScout:0};
  for(const k in d)if(S[k]==null)S[k]=JSON.parse(JSON.stringify(d[k]));
  migrateRivals();growthDefaults();ensureHome();maniaDefaults();
  S.v=3;
}
function load(str){
  const o=JSON.parse(str);
  if(!o||(o.v!==2&&o.v!==3)||!o.st||!Array.isArray(o.st.objs))return false;
  S=o;fillDefaults();S.phase='prep';bindStore();
  G.objs.forEach(m=>{if(m.kind==='m')m.today=blank()});
  undoStack=[];layoutChanged();
  if(!S.story)storyInit(true);   /* ストーリーより前のセーブ */
  ensureMissions();
  return true;
}

/* ---------- 配置・島 ---------- */
function rebuildMaps(){
  occ=new Map();seatMap=new Map();frontMap=new Map();
  for(const o of G.objs){occ.set(key(o.x,o.y),o);if(o.kind==='m'){const s=seatOf(o);seatMap.set(key(s.x,s.y),o)}}
  for(const d of G.doors){if(WB[d.type].noFront)continue;const f=frontOf(d);frontMap.set(key(f.x,f.y),d)}
}
function computeIslands(){
  const seen=new Set(),comps=[];
  const at=(x,y)=>{if(!inB(x,y))return null;const o=occ.get(key(x,y));return o&&o.kind==='m'?o:null};
  for(const m of machines()){
    if(seen.has(m.id))continue;
    const comp=[],st=[m];seen.add(m.id);
    while(st.length){const c=st.pop();comp.push(c);for(const[dx,dy]of DIRS){const n=at(c.x+dx,c.y+dy);if(n&&!seen.has(n.id)){seen.add(n.id);st.push(n)}}}
    comp.sort((a,b)=>a.y-b.y||a.x-b.x);comps.push(comp);
  }
  comps.sort((a,b)=>(a[0].y-b[0].y)||(a[0].x-b[0].x));
  let no=1;
  islands=comps.map((c,i)=>{
    const label=i<26?String.fromCharCode(65+i):'Z'+(i-25);
    const kinds=new Set(c.map(kindOf));
    const kind=kinds.size>1?'mix':[...kinds][0];
    c.forEach(m=>{while(no%10===4||no%10===9)no++;m.no=no++;m.island=label});
    return {label,ms:c,kind};
  });
}
function layoutChanged(){rebuildMaps();computeIslands();if(typeof markDirty==='function')markDirty()}
const islandOf=m=>(islands.find(i=>i.ms.includes(m))||{ms:[m],kind:kindOf(m)});
const islandMixed=m=>islandOf(m).kind==='mix';

function floodFrom(p,blocked){
  const seen=new Set([key(p.x,p.y)]),q=[p];
  while(q.length){const c=q.pop();for(const[dx,dy]of DIRS){const nx=c.x+dx,ny=c.y+dy;if(!inB(nx,ny))continue;const k=key(nx,ny);if(seen.has(k)||blocked.has(k))continue;seen.add(k);q.push({x:nx,y:ny})}}
  return seen;
}
const adjReach=(x,y,reach)=>DIRS.some(([dx,dy])=>inB(x+dx,y+dy)&&reach.has(key(x+dx,y+dy)));
function validate(objs,doors){
  const occM=new Map(),seatM=new Map(),frontM=new Map(),slots=new Set();
  for(const d of doors){
    const sk=d.side+d.pos;if(slots.has(sk))return 'その壁にはもう設備が付いています';slots.add(sk);
    if(WB[d.type].noFront)continue;
    const f=frontOf(d);
    if(!inB(f.x,f.y))return 'そこには付けられません';
    if(isEntrance(f.x,f.y))return '入口の前には付けられません';
    const fk=key(f.x,f.y);if(frontM.has(fk))return '扉の前が別の扉と重なります';frontM.set(fk,d);
  }
  for(const o of objs){
    if(!inB(o.x,o.y))return 'お店の外には置けません';
    if(isEntrance(o.x,o.y))return '入口には置けません';
    const k=key(o.x,o.y);
    if(occM.has(k))return 'もう物が置いてあります';
    if(frontM.has(k))return '扉の前には置けません';
    occM.set(k,o);
  }
  for(const o of objs){
    if(o.kind!=='m')continue;const s=seatOf(o);
    if(!inB(s.x,s.y))return '客席がお店の外になります';
    if(isEntrance(s.x,s.y))return '入口を客席にはできません';
    const k=key(s.x,s.y);
    if(occM.has(k))return '客席になる場所に物があります';
    if(seatM.has(k))return '客席が別の台と重なります';
    if(frontM.has(k))return '客席が扉の前になります';
    seatM.set(k,o);
  }
  const reach=floodFrom(doorPos(),new Set(occM.keys()));
  for(const d of doors){if(WB[d.type].noFront)continue;const f=frontOf(d);if(!reach.has(key(f.x,f.y)))return '扉の前まで歩いて行けません'}
  for(const o of objs){
    if(o.kind==='m'){const s=seatOf(o);if(!reach.has(key(s.x,s.y)))return '通路がふさがってしまいます'}
    else if(DB[o.type].func&&!adjReach(o.x,o.y,reach))return '通路がふさがってしまいます';
  }
  return null;
}
/* 壁ぎわのマスから扉の位置を決める */
function doorSlotFor(x,y,pref){
  const c=[];
  if(y===0)c.push({side:'t',pos:x});
  if(x===0)c.push({side:'l',pos:y});
  if(x===G.W-1)c.push({side:'r',pos:y});
  if(!c.length)return null;
  if(pref){const p=c.find(s=>s.side===pref);if(p)return p}
  return c.find(s=>!G.doors.some(d=>d.side===s.side&&d.pos===s.pos))||c[0];
}

/* ---------- 取り消し ---------- */
function snapshotEdit(){return JSON.stringify({st:G,money:S.money,storage:S.storage,event:S.event,nid:S.nid},(k,v)=>(SKIP_KEYS.has(k)||k==='today')?undefined:v)}
function pushUndo(){undoStack.push(snapshotEdit());if(undoStack.length>40)undoStack.shift()}
function undo(){
  const u=undoStack.pop();if(!u){toast('取り消せる操作はありません');return false}
  const o=JSON.parse(u);
  S.st=o.st;S.money=o.money;S.storage=o.storage;S.event=o.event;S.nid=o.nid;bindStore();
  G.objs.forEach(m=>{if(m.kind==='m')m.today=blank()});
  layoutChanged();return true;
}

/* ---------- 倉庫 ---------- */
function toStorage(o){
  if(o.kind==='m')S.storage.push({kind:'m',type:o.type,set:o.set,nail:o.nail,rate:o.rate,installDay:o.installDay});
  else if(o.kind==='d')S.storage.push({kind:'d',type:o.type});
  else S.storage.push({kind:'w',type:o.type});
}
function storageGroups(){
  const g=new Map();
  S.storage.forEach((it,i)=>{const k=it.kind+':'+it.type;if(!g.has(k))g.set(k,{kind:it.kind,type:it.type,idx:[]});g.get(k).idx.push(i)});
  return [...g.values()];
}
function storageName(it){return it.kind==='m'?MB[it.type].name:it.kind==='d'?DB[it.type].name:WB[it.type].name}
function storageValue(it){return Math.round((it.kind==='m'?MB[it.type].price:it.kind==='d'?DB[it.type].price:WB[it.type].price)*0.4/1000)*1000}
