/* ===== chain.js : 2号店・チェーン展開 =====
   いま見ているお店（S.st・S.staff・S.go）は、ふつうに営業のようすを動かす。
   ほかのお店（S.branches）は、任命した店長が「方針」にそって切り盛りし、1日の結果をまとめて計算する。
   「このお店を見る」で、見るお店を入れ替えられる（準備中だけ）。 */
const MAX_STORES=5;
const BRANCH_RANK=3;          /* 2号店が出せるランク */
const MGR_LV=5;               /* お店の店長にできる店員のレベル */
const POLICY={
  earn:{name:'稼ぐ',desc:'設定・釘を辛めにして利益を取る。お客さんは少し減る',col:'#2563eb',att:0.85,set:[1,2,2,3],nail:[-1,-1,0,-1]},
  norm:{name:'ふつう',desc:'利益とお客さんのバランスをとる',col:'#16a34a',att:1,set:[2,3,3,4],nail:[0,0,-1,1]},
  give:{name:'還元',desc:'設定・釘を甘くしてお客さんを集める。利益は出にくいが評判が上がる',col:'#db2777',att:1.2,set:[4,4,5,6],nail:[1,1,0,2]},
};
const storeLabel=st=>(st&&st.name)||S.name;
function ensureHome(){
  if(!S.home)S.home={id:1,pol:'norm',mgr:null,open:1,mon:null,last:null};
  if(!S.branches)S.branches=[];
}
const allStores=()=>[{home:true,st:S.st,staff:S.staff,go:S.go,meta:S.home},...S.branches.map(b=>({home:false,st:b.st,staff:b.staff,go:b.go,meta:b,b}))];
const eqOf=st=>st.objs.reduce((a,o)=>a+(o.kind==='m'?(o.rate==='lo'?0.25:1):0),0);
const mOf=st=>st.objs.filter(o=>o.kind==='m');
function branchNeed(st){const n=mOf(st).length;return {hall:Math.max(1,Math.ceil(n/12)),counter:st.objs.filter(o=>o.kind==='d'&&o.type==='counter').length,clean:Math.max(1,Math.ceil(n/25))}}
const nextBranchNo=()=>{const used=new Set(allStores().map(x=>x.meta.no||1));let n=2;while(used.has(n))n++;return n};
const canBranch=()=>rankNo()>=BRANCH_RANK&&storeCount()<MAX_STORES;
/* 店長にできる店員（いま見ているお店から1人連れていく） */
const mgrCands=()=>S.staff.filter(s=>s.lv>=MGR_LV);

/* ---------- 新しいお店を出す ---------- */
const branchMachines=(W,H)=>{const rows=Math.floor((H-2)/4)*2*(W-3);return Math.floor(rows*0.6)};
function branchCost(spec){
  const n=spec.offer?spec.offer.lay.objs.filter(o=>o.kind==='m').length:branchMachines(spec.W,spec.H);
  const land=spec.offer?spec.offer.price:newBuildPrice(spec.loc,spec.W,spec.H)+Math.round(n*220000*skPrice()/10000)*10000;
  const need=spec.offer?{hall:Math.ceil(n/12),counter:1,clean:Math.ceil(n/25)}:{hall:Math.ceil(n/12),counter:1,clean:Math.ceil(n/25)};
  const hires=need.hall+need.counter+need.clean-1;
  return {n,land,hire:hires*30000,total:land+hires*30000};
}
function openBranch(spec,mgrId){
  if(!canBranch())return 'これ以上お店を増やせません';
  const m=S.staff.find(s=>s.id===mgrId);
  if(!m||m.lv<MGR_LV)return `店長にする店員（Lv${MGR_LV}以上）を選んでください`;
  const c=branchCost(spec);
  if(S.money<c.total)return 'お金が足りません';
  S.money-=c.total;
  const saveG=G;
  const loc=spec.offer?spec.offer.loc:spec.loc,W=spec.offer?spec.offer.W:spec.W,H=spec.offer?spec.offer.H:spec.H;
  const st=makeStore(loc,W,H,spec.offer?spec.offer.maxW:Math.min(38,W+6),spec.offer?spec.offer.maxH:Math.min(16,H+3));
  const no=nextBranchNo();st.name=`${S.name} ${no}号店`;st.openDay=S.day;
  G=st;
  const lay=spec.offer?spec.offer.lay:genLayout(W,H,c.n);
  lay.objs.forEach(o=>{const x=Object.assign({},o);x.id=S.nid++;if(x.kind==='m'){x.today=blank();x.installDay=-30}st.objs.push(x)});
  lay.doors.forEach(d=>st.doors.push({id:S.nid++,type:d.type,side:d.side,pos:d.pos}));
  if(spec.offer){st.floor=spec.offer.floor;st.wall=spec.offer.wall;st.ownedFloors=[...new Set(['tile',spec.offer.floor])];st.ownedWalls=[...new Set(['white',spec.offer.wall])];S.offers=S.offers.filter(x=>x!==spec.offer)}
  G=saveG;
  S.staff=S.staff.filter(s=>s!==m);
  const staff=[m],need=branchNeed(st);need[m.role]=Math.max(0,need[m.role]-1);
  for(const r in need)for(let i=0;i<need[r];i++){const s=makeCandidate(r);s.hired=S.day;staff.push(s)}
  m.mor=clamp(m.mor+20,0,100);
  const b={id:S.nid++,no,st,staff,go:{type:'grand',start:S.day,len:3,scores:[]},pol:'norm',mgr:m.id,open:S.day,mon:null,last:null,hist:[]};
  S.branches.push(b);
  news(`${st.name}（${LOCS[loc].name}）を出店！ 店長は${m.name}。今日からグランドオープン`,'big');
  return null;
}
function sellBranch(bid){
  const b=S.branches.find(x=>x.id===bid);if(!b)return 0;
  const val=Math.round((b.st.W*b.st.H*LOCS[b.st.loc].priceTile*0.6+mOf(b.st).length*60000)/10000)*10000;
  S.money+=val;S.branches=S.branches.filter(x=>x!==b);
  const m=b.staff.find(s=>s.id===b.mgr);if(m)S.staff.push(m);
  news(`${b.st.name}を${man(val)}で売却した`,'bad');
  return val;
}
/* 店長を替える（そのお店の店員から選ぶ） */
function setBranchMgr(bid,sid){const b=S.branches.find(x=>x.id===bid);if(!b)return false;const s=b.staff.find(x=>x.id===sid);if(!s||s.lv<3)return false;b.mgr=sid;return true}

/* ---------- 見るお店を入れ替える ---------- */
function switchStore(bid){
  if(S.phase!=='prep')return 'お店を見に行けるのは準備中だけです';
  const b=S.branches.find(x=>x.id===bid);if(!b)return 'そのお店はありません';
  const H=S.home;
  const out={id:H.id,no:H.no||1,st:S.st,staff:S.staff,go:S.go,pol:H.pol,mgr:H.mgr,open:H.open,mon:H.mon,last:H.last,hist:H.hist||[]};
  S.st=b.st;S.staff=b.staff;S.go=b.go;
  S.home={id:b.id,no:b.no,pol:b.pol,mgr:b.mgr,open:b.open,mon:b.mon,last:b.last,hist:b.hist};
  S.branches=S.branches.map(x=>x===b?out:x);
  S.event={type:'none',target:null,ad:false};
  bindStore();G.objs.forEach(m=>{if(m.kind==='m'&&!m.today)m.today=blank()});
  undoStack=[];layoutChanged();refreshCands(true);
  return null;
}

/* ---------- 見ていないお店の1日 ---------- */
function applyPolicy(b){
  const P=POLICY[b.pol]||POLICY.norm;
  mOf(b.st).forEach((m,i)=>{const k=MB[m.type].k;if(k==='s')m.set=P.set[(i+m.id)%4];else m.nail=P.nail[(i+m.id)%4]});
}
function branchDay(b,info){
  const st=b.st,ms=mOf(st),n=ms.length;if(!n)return null;
  applyPolicy(b);
  const P=POLICY[b.pol]||POLICY.norm,mgr=b.staff.find(s=>s.id===b.mgr);
  const eq=eqOf(st),pop=avgOf(ms.map(m=>MB[m.type].pop));
  const appeal=FB[st.floor].appeal+WLB[st.wall].appeal+st.objs.filter(o=>o.kind==='d').reduce((a,o)=>a+DB[o.type].appeal,0)+st.doors.reduce((a,d)=>a+WB[d.type].appeal,0);
  const decor=0.9+0.2*Math.min(1,appeal/(st.W*st.H*0.3));
  const mgrF=mgr?1+0.03*(mgr.lv-1)+0.02*(staffSrv(mgr)-3):0.75;
  const need=branchNeed(st),have={hall:0,counter:0,clean:0};b.staff.forEach(s=>have[s.role]++);
  const staffF=Math.sqrt(clamp(['hall','counter','clean'].reduce((a,r)=>a+Math.min(1,have[r]/Math.max(1,need[r])),0)/3,0.2,1));
  const goOn=b.go&&S.day>=b.go.start&&S.day<b.go.start+b.go.len;
  let A=(10+S.rep)*capF(eq)*(0.8+0.4*Math.min(1,pop/80))*decor*P.att*mgrF*staffF;
  if(goOn)A*=2.4;
  const share=A/(A+260);
  const wx=WEATHER[rollWeather(S.day)].mult;
  let vis=Math.round(LOCS[st.loc].town*info.mult*wx*share*rnd(0.85,1.15));
  vis=Math.min(vis,n*(goOn?7:6));
  /* 出玉率：スロットは機械割、パチンコは釘（交換差益は、お店の交換率で決まる） */
  /* 実際の営業では途中でやめるお客さんやコンプリートがあるので、出玉率は機械割より少し低くなる（いま見ているお店の実績に合わせる） */
  const pr=avgOf(ms.map(m=>machR(m)))*(S.prFactor||0.92)*rnd(0.96,1.04),slotEq=ms.filter(m=>MB[m.type].k==='s').reduce((a,m)=>a+(m.rate==='lo'?0.25:1),0);
  const coin=vis*(S.cpvHi||30000)*(eq/n)*rnd(0.9,1.1),out=coin*pr,sh=eq?slotEq/eq:0,exch=out*(sh*(1-exHit('s'))+(1-sh)*(1-exHit('p')))+out*0.25*(sh*Math.max(0,exBase('s')-exRate('s'))+(1-sh)*Math.max(0,exBase('p')-exRate('p')));
  const gross=coin-out+exch,drink=st.objs.some(o=>o.kind==='d'&&o.type==='vending')?vis*40:0;
  const rent=st.W*st.H*LOCS[st.loc].rentTile,wages=Math.round(b.staff.reduce((a,s)=>a+s.wage,0)*skWage()),power=2500*n;
  const net=Math.round(gross+drink-rent-wages-power);
  S.money+=net;
  /* オープン期間の判定（方針で決まる） */
  let goRes=null;
  if(goOn){b.go.scores.push(b.pol==='give'?0.78:b.pol==='norm'?0.6:0.42);
    if(b.go.scores.length>=b.go.len){const fin=avgOf(b.go.scores),[j]=goJudge(fin);goRes=j;const eff={'大成功':[6,4],'成功':[3,2],'いまいち':[-5,-3],'大失敗':[-10,-6]}[j];S.trust=clamp(S.trust+eff[0],0,100);S.rep=clamp(S.rep+eff[1],0,100);b.go=null;news(`${st.name}のグランドオープンは「${j}」でした`,j.includes('成功')?'good':'bad')}}
  /* 出し方の評判（台数の割合で効く） */
  const tot=machines().length+S.branches.reduce((a,x)=>a+mOf(x.st).length,0);
  S.rep=clamp(S.rep+clamp((pr-0.93)*4,-0.6,0.6)*n/Math.max(1,tot),0,100);
  /* 店員の成長 */
  for(const s of b.staff){fixStaff(s);s.exp+=(s.id===b.mgr?10:6)*(PERS[s.pers]||PERS.majime).grow;while(s.lv<STAFF_MAX_LV&&s.exp>=40*s.lv){s.exp-=40*s.lv;s.lv++;if(s.spd<5&&s.lv%2===0)s.spd++;else if(s.srv<5)s.srv++;s.wage+=300}}
  S.totalVisitors+=vis;
  const res={id:b.id,name:st.name,vis,coin:Math.round(coin),gross:Math.round(gross),net,pr,goRes,goDay:goOn?S.day-(b.go?b.go.start:S.day)+1:0,noMgr:!mgr,short:staffF<0.95};
  b.last=res;
  monAccStore(b,res);
  b.hist=(b.hist||[]).concat([{day:S.day,net,vis}]).slice(-30);
  return res;
}
/* お店ごとの月の集計（「3軒そろって黒字」の判定に使う） */
function monAccStore(meta,res){
  const d=dateOf(S.day),y=d.getFullYear(),m=d.getMonth()+1;
  if(!meta.mon||meta.mon.y!==y||meta.mon.m!==m)meta.mon={y,m,net:0,gross:0,vis:0,days:0};
  meta.mon.net+=res.net;meta.mon.gross+=res.gross;meta.mon.vis+=res.vis;meta.mon.days++;
}
/* 閉店のあと、見ていないお店の1日をまとめて計算 */
function chainEndDay(R){
  ensureHome();
  /* いま見ているお店の分 */
  const home={net:Math.round(R.net),gross:Math.round(R.gross),vis:R.visitors};
  monAccStore(S.home,home);S.home.last={name:storeLabel(G),...home};
  S.home.hist=(S.home.hist||[]).concat([{day:S.day,net:home.net,vis:home.vis}]).slice(-30);
  if(R.visitors>0){const eqr=eqMachines()/Math.max(1,machines().length);const cpv=R.coin/R.visitors/Math.max(0.25,eqr);S.cpvHi=Math.round((S.cpvHi||cpv)*0.85+cpv*0.15)}
  if(R.coin>0&&!D.isGo){const mr=avgOf(machines().map(machR));if(mr>0){const f=clamp(R.out/R.coin/mr,0.8,1.02);S.prFactor=(S.prFactor||0.92)*0.9+f*0.1}}
  if(!S.branches.length){R.branches=null;R.branchGross=0;return}
  const info=dayInfo(S.day);
  R.branches=S.branches.map(b=>branchDay(b,info)).filter(Boolean);
  R.branchGross=R.branches.reduce((a,x)=>a+x.gross,0);
  R.branchNet=R.branches.reduce((a,x)=>a+x.net,0);
}
/* 月末：すべてのお店が黒字か */
function chainAllBlack(){
  if(storeCount()<3)return false;
  const ok=m=>m&&m.net>0;
  return ok(S.home.mon)&&S.branches.every(b=>ok(b.mon));
}
