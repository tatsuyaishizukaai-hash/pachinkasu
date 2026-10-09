/* ===== market.js : 暦・天気・ライバル・常連・店員候補・物件 ===== */
const WD='日月火水木金土';
const dateOf=day=>new Date(2026,3,day);
const dateStr=day=>{const d=dateOf(day);return `${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})`};
const dateLong=day=>{const d=dateOf(day);return `${d.getMonth()+1}月${d.getDate()}日(${WD[d.getDay()]})`};
function nthMonday(y,m,n){const d=new Date(y,m,1);const off=(8-d.getDay())%7;return 1+off+(n-1)*7}
function isHoliday(d){
  const y=d.getFullYear(),m=d.getMonth()+1,dd=d.getDate();
  if(['1-1','2-11','2-23','3-20','4-29','5-3','5-4','5-5','8-11','9-23','11-3','11-23'].includes(m+'-'+dd))return true;
  return (m===1&&dd===nthMonday(y,0,2))||(m===7&&dd===nthMonday(y,6,3))||(m===9&&dd===nthMonday(y,8,3))||(m===10&&dd===nthMonday(y,9,2));
}
function dayInfo(day){
  const d=dateOf(day),m=d.getMonth()+1,dd=d.getDate(),wd=d.getDay();
  const tags=[];let mult=1,elder=1,hi=1;
  const weekend=wd===0||wd===6,hol=isHoliday(d);
  let special=null;
  if((m===4&&dd>=29)||(m===5&&dd<=6))special='ゴールデンウィーク';
  else if(m===8&&dd>=13&&dd<=16)special='お盆';
  else if((m===12&&dd>=29)||(m===1&&dd<=3))special='年末年始';
  if(special){tags.push(special);mult*=1.45}
  else if(weekend||hol){tags.push(hol&&!weekend?'祝日':'土日');mult*=1.28*LOCS[G.loc].weekend}
  else if(wd===5)mult*=1.08;
  if(m%2===0){const p=new Date(d.getFullYear(),m-1,15);while(p.getDay()===0||p.getDay()===6)p.setDate(p.getDate()-1);if(p.getDate()===dd){tags.push('年金支給日');mult*=1.12;elder=2.2}}
  if(dd===25){tags.push('給料日');mult*=1.12;hi=1.25}
  if(dd%10===7)tags.push('7のつく日');
  return {weekend:weekend||hol||!!special,tags,mult,elder,hi,wd,date:dd};
}
const WEATHER={sun:{name:'晴れ',mult:1,dirt:1},cloud:{name:'くもり',mult:1.03,dirt:1},rain:{name:'雨',mult:1.12,dirt:1.6}};
function rollWeather(day){
  const d=dateOf(day),m=d.getMonth()+1,dd=d.getDate();
  const pr=(m===6||(m===7&&dd<=15))?0.45:m===9?0.26:0.16,r=Math.random();
  return r<pr?'rain':r<pr+0.28?'cloud':'sun';
}
function news(text,kind){S.news.unshift({day:S.day,text,kind:kind||''});if(S.news.length>40)S.news.pop()}
const goActive=()=>!!(S.go&&S.day>=S.go.start&&S.day<S.go.start+S.go.len);
const goDayIdx=()=>S.go?S.day-S.go.start:-1;
const GO_MULT={grand:[3.2,2.7,2.3],renewal:[2.4,2.0],anniv:[2.6,2.2]};

/* ---------- 名物常連 ---------- */
function initRegs(){S.regs={};REG_DEFS.forEach(r=>{S.regs[r.id]={loy:Math.round(rnd(18,34)),st:'new',visits:0,say:null,met:false}})}
function regWantsVisit(def,st,info){
  if(st.st==='gone'){if(S.rep>60&&Math.random()<0.02){st.st='new';st.loy=22;news(`${def.name}がまた来てくれるようになった`);}else return false}
  if(st.away)return false;
  const ev=S.event.type!=='none'||goActive();
  let p=0;
  switch(def.sched){
    case 'event':p=ev?0.9:0.06;break;
    case 'nail':p=machines().some(m=>kindOf(m)==='p'&&m.nail>=1)?0.8:0.2;break;
    case 'pension':p=info.tags.includes('年金支給日')?0.95:info.weekend?0.1:0.3;break;
    case 'evening':p=info.tags.includes('給料日')?0.9:info.weekend?0.15:0.45;break;
    case 'daily':p=0.55;break;
    case 'afternoon':p=info.weekend?0.08:0.45;break;
    case 'weekend':p=info.weekend?0.7:0.1;break;
  }
  if(!machines().some(m=>segOf(m)===def.seg))p*=0.15;
  return Math.random()<p*(0.3+st.loy/100*0.9)*1.3;
}
function regArrival(def){
  switch(def.sched){case 'event':case 'nail':return OPEN;case 'pension':return OPEN+rnd(0,40);case 'evening':return rnd(1080,1170);case 'daily':return rnd(660,960);case 'afternoon':return rnd(780,900);default:return rnd(600,840)}
}
const regStatus=st=>st.st==='gone'?'来なくなった':st.away?`${st.away.name}に浮気中（${dateStr(st.away.until+1)}ごろ戻る）`:st.loy>=70?'常連':st.met?'ときどき来る':'まだ来ていない';

/* ---------- 店員 ---------- */
function makeCandidate(role,spd,srv){
  spd=spd??(1+Math.floor(Math.random()*4));srv=srv??(1+Math.floor(Math.random()*4));
  if(Math.random()<0.12){spd=Math.min(5,spd+1);srv=Math.min(5,srv+1)}
  return {id:S.nid++,name:pick(FAMILY)+' '+pick(GIVEN),role,spd,srv,lv:1,wage:ROLES[role].base+(spd+srv)*700,hired:0,pers:pick(PERS_KEYS),exp:0,mor:70,title:''};
}
function refreshCands(force){
  if(!force&&S.day===S.candsDay)return;
  S.cands=['hall','counter','clean',pick(['hall','clean','hall'])].map(r=>makeCandidate(r));S.candsDay=S.day;
}
function hireStaff(c){c.hired=S.day;S.staff.push(c)}
const staffOf=role=>S.staff.filter(s=>s.role===role);
const wagesTotal=()=>Math.round(S.staff.reduce((a,s)=>a+s.wage,0)*skWage());
const trainCost=s=>Math.round(40000*s.lv*skTrain()/1000)*1000;
function needStaff(){const n=machines().length;return {hall:Math.max(1,Math.ceil(n/12)),counter:G.objs.filter(o=>o.kind==='d'&&o.type==='counter').length,clean:Math.max(1,Math.ceil(n/25))}}

/* ---------- 物件 ---------- */
const storeValue=()=>G.W*G.H*LOCS[G.loc].priceTile;
const rentOf=()=>G.W*G.H*LOCS[G.loc].rentTile;
function genLayout(W,H,n){
  const objs=[],doors=[];let placed=0,row=0;
  const L=Math.min(10,W-2);
  const ok=m=>(m.gen||1)<=(S?S.gen:1)&&(!S||modelOnSale(m.id));
  const pPool=MODELS.filter(m=>m.k==='p'&&m.rank<=3&&ok(m)),sPool=MODELS.filter(m=>m.k==='s'&&m.rank<=3&&ok(m));
  for(let y=2;y+2<=H-2&&placed<n;y+=4,row++){
    const segStart=[];for(let x=1;x<=W-2;x++){if((x-1)%(L+1)===L)continue;segStart.push(x)}
    let segIdx=0,prev=-9,kind=row%2?'s':'p',model=pick(kind==='p'?pPool:sPool).id,rate=Math.random()<0.3?'lo':'hi';
    for(const x of segStart){
      if(x!==prev+1){segIdx++;kind=(row+segIdx)%2?'s':'p';model=pick(kind==='p'?pPool:sPool).id;rate=Math.random()<0.3?'lo':'hi'}
      prev=x;
      for(const [yy,dir] of [[y,2],[y+1,0]]){
        if(placed>=n)break;
        objs.push({kind:'m',type:model,x,y:yy,dir,rate,set:kind==='s'?1+Math.floor(Math.random()*3):undefined,nail:kind==='p'?-Math.floor(Math.random()*2):undefined,installDay:-60});
        placed++;
      }
    }
  }
  objs.push({kind:'d',type:'counter',x:W-2,y:H-1});
  objs.push({kind:'d',type:'vending',x:1,y:H-1});
  doors.push({type:'toilet',side:'t',pos:W-2});
  if(W>=14)doors.push({type:'toilet',side:'t',pos:1});
  return {objs,doors};
}
function inukiFromRival(r){
  const area=r.size*3.6,H=clamp(Math.round(Math.sqrt(area/2.4)),8,16),W=clamp(Math.round(area/H/2)*2,16,38);
  const lay=genLayout(W,H,r.size);
  const loc=r.size>=50?'ekimae':r.size>=40?'kogai':'jutaku';
  return {id:S.nid++,kind:'inuki',loc,W,H,maxW:Math.min(38,W+4),maxH:Math.min(16,H+2),price:Math.round((W*H*LOCS[loc].priceTile*0.55+lay.objs.filter(o=>o.kind==='m').length*50000)/10000)*10000,lay,day:S.day,from:r.name,floor:pick(['red','blue','wood']),wall:pick(['stripe','wood','white'])};
}
function randomInuki(){
  const locs=Object.keys(LOCS);
  const loc=pick(locs),W=pick([22,24,26]),H=pick([9,10,11]);
  const rowsMax=Math.floor((H-2)/4)*2*(W-3);
  const lay=genLayout(W,H,Math.floor(rowsMax*rnd(0.5,0.85)));
  const mc=lay.objs.filter(o=>o.kind==='m').length;
  return {id:S.nid++,kind:'inuki',loc,W,H,maxW:Math.min(38,W+6),maxH:Math.min(16,H+3),price:Math.round((W*H*LOCS[loc].priceTile*0.7+mc*60000)/10000)*10000,lay,day:S.day,from:null,floor:pick(['tile','wood','red','blue']),wall:pick(['white','stripe','wood'])};
}
function refreshOffers(force){
  if(!force&&S.day-S.offersDay<7)return;
  S.offers=S.offers.filter(o=>o.from&&S.day-o.day<45);
  S.offers.push(randomInuki(),randomInuki());
  S.offersDay=S.day;
}
const newBuildPrice=(loc,W,H)=>W*H*LOCS[loc].priceTile+500000;
function relocate(spec){
  /* spec: {kind:'inuki',offer} or {kind:'new',loc,W,H} */
  const sale=Math.round(storeValue()*0.6/10000)*10000;
  const price=spec.kind==='inuki'?spec.offer.price:newBuildPrice(spec.loc,spec.W,spec.H);
  G.objs.forEach(toStorage);G.doors.forEach(d=>toStorage({kind:'w',type:d.type}));
  S.money+=sale-price;
  const loc=spec.kind==='inuki'?spec.offer.loc:spec.loc,W=spec.kind==='inuki'?spec.offer.W:spec.W,H=spec.kind==='inuki'?spec.offer.H:spec.H;
  const maxW=spec.kind==='inuki'?spec.offer.maxW:Math.min(38,W+6),maxH=spec.kind==='inuki'?spec.offer.maxH:Math.min(16,H+3);
  S.st=makeStore(loc,W,H,maxW,maxH);bindStore();
  if(spec.kind==='inuki'){
    const o=spec.offer;
    G.floor=o.floor;G.wall=o.wall;if(!G.ownedFloors.includes(o.floor))G.ownedFloors.push(o.floor);if(!G.ownedWalls.includes(o.wall))G.ownedWalls.push(o.wall);
    o.lay.objs.forEach(x=>addObj(Object.assign({},x)));
    o.lay.doors.forEach(d=>G.doors.push({id:S.nid++,type:d.type,side:d.side,pos:d.pos}));
    S.offers=S.offers.filter(x=>x!==o);
  }else{
    STARTER.forEach(it=>S.storage.push(Object.assign({},it,{gift:1})));
  }
  S.go={type:'grand',start:S.day,len:3,scores:[]};S.lastOpen=S.day;S.moved=(S.moved||0)+1;
  S.rep=Math.round(S.rep*0.85*10)/10;
  S.event={type:'none',target:null,ad:false};
  undoStack=[];layoutChanged();
  news(`${LOCS[loc].name}の新しいお店に移転しました（旧店舗は${man(sale)}で売却）`,'big');
  return {sale,price};
}
function expandStore(dir){
  const addW=dir==='w'?2:0,addH=dir==='h'?2:0;
  const nW=G.W+addW,nH=G.H+addH;
  if(nW>G.maxW||nH>G.maxH)return 'これ以上は広げられません';
  const cost=(nW*nH-G.W*G.H)*LOCS[G.loc].priceTile*1.2;
  if(S.money<cost)return 'お金が足りません';
  pushUndo();S.money-=cost;G.renoSpend+=cost;
  const dx=addW/2,dy=addH,oldW=G.W,oldH=G.H,oz=G.zone;
  G.objs.forEach(o=>{o.x+=dx;o.y+=dy});
  G.doors.forEach(d=>{if(d.side==='t')d.pos+=dx;else d.pos+=dy});
  G.W=nW;G.H=nH;G.zone=new Array(nW*nH).fill(0);
  for(let y=0;y<oldH;y++)for(let x=0;x<oldW;x++)G.zone[(y+dy)*nW+x+dx]=oz[y*oldW+x];
  layoutChanged();
  return null;
}

/* ---------- 銀行 ---------- */
const LOAN_RATE=0.0008;
const loanLimit=()=>Math.round((1500000*rankNo()+storeValue()*0.3)*skLoan()/100000)*100000;
function borrow(n){n=Math.min(n,loanLimit()-S.loan);if(n<=0)return 0;S.loan+=n;S.money+=n;return n}
function repay(n){n=Math.min(n,S.loan,Math.max(0,S.money));if(n<=0)return 0;S.loan-=n;S.money-=n;return n}
