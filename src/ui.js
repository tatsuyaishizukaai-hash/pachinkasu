/* ===== ui.js : 画面・操作 ===== */
let prefs={sfx:true,bgm:true,overlay:'set',speed:1,paused:false,guideSeen:false,rot:'auto',tweets:true};
let tool='view',buildItem=null,buildDir=0,moveSel=null,moveIsland=false,panelSel=null,removeMode='sell',zoneBrush=1,zoneIsland=false;
let sheetKind=null,sheetData=null;
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(e){}}
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(p)Object.assign(prefs,p)}catch(e){}prefs.paused=false}

/* ---------- トースト・テロップ・紙吹雪 ---------- */
let toastTimer=0;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900)}
function toastAt(msg,x,y){toast(msg);if(x!=null)floatAt(x,y,'×','#ef4444')}
let telTimer=0;
function telop(main,sub,kind){
  const el=$('#telop');$('#telMain').textContent=main;$('#telSub').textContent=sub||'';
  el.className='tel-'+(kind||'good');el.hidden=false;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');
  clearTimeout(telTimer);telTimer=setTimeout(()=>{el.hidden=true},1900);
  if(kind!=='bad')confetti();
}
const fx=$('#fx'),fxc=fx.getContext('2d');let parts=[],fxOn=false;
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  fx.width=VIEW.w;fx.height=VIEW.h;fx.style.width=VIEW.w+'px';fx.style.height=VIEW.h+'px';
  const cols=['#ff2d55','#facc15','#3b82f6','#22c55e','#a855f7','#fff'];
  for(let i=0;i<60;i++)parts.push({x:Math.random()*fx.width,y:-Math.random()*fx.height*0.4,vx:rnd(-1,1),vy:rnd(2.5,5.5),r:rnd(0,6),vr:rnd(-0.2,0.2),c:pick(cols),w:rnd(6,10),h:rnd(3,6)});
  if(!fxOn){fxOn=true;fx.hidden=false;requestAnimationFrame(fxLoop)}
}
function fxLoop(){
  try{fxc.clearRect(0,0,fx.width,fx.height);
    for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.r+=p.vr;fxc.save();fxc.translate(p.x,p.y);fxc.rotate(p.r);fxc.fillStyle=p.c;fxc.fillRect(-p.w/2,-p.h/2,p.w,p.h);fxc.restore()}
    parts=parts.filter(p=>p.y<fx.height+20);
  }catch(e){parts=[]}
  if(parts.length)requestAnimationFrame(fxLoop);else{fxOn=false;fx.hidden=true}
}

/* ---------- HUD・ステータス ---------- */
function setT(id,t){const e=$(id);if(e.textContent!==t)e.textContent=t;return e}
function refreshHud(){
  setT('#hName',S.name);
  setT('#hDate',dateStr(S.day));
  setT('#hWeather',WEATHER[S.weather.today].name).dataset.w=S.weather.today;
  setT('#hMoney',yen(S.money)).classList.toggle('neg',S.money<0);
  setT('#hRep',String(Math.round(S.rep)));setT('#hTrust',String(Math.round(S.trust)));setT('#hDecor',stars());
  if(S.phase==='open'&&D){const t=D.coin-D.out+D.drink-D.goto;const e=setT('#hToday','今日 '+sgn(t));e.className='today '+(t>=0?'pos':'neg')}
  else{const e=setT('#hToday',S.loan?'借入 '+man(S.loan):'');e.className='today sub'}
}
function hint(){
  if(!G.objs.some(o=>o.kind==='d'&&o.type==='counter'))return '景品カウンターがありません。建設 → 設備 から置こう';
  if(!staffOf('counter').length)return 'カウンター係がいないと景品交換ができません（経営 → 店員）';
  if(goActive()&&goDayIdx()===0&&S.day===1)return 'まず「設定」で台を出す準備をして「開店」！オープン期間は判定が厳しめ';
  if(!hasDoor('toilet'))return 'トイレがないと不満が出ます（建設 → 設備 → 壁に付ける）';
  if(S.day<=4&&!G.zone.some(z=>z))return 'たばこを吸う客のために「喫煙OKゾーン」や喫煙所を作ろう';
  return '';
}
function pills(){
  const info=dayInfo(S.day),p=[];
  if(goActive())p.push(`<span class="pill go">${S.go.type==='grand'?'グランドオープン':'リニューアル'} ${goDayIdx()+1}/${S.go.len}日目</span>`);
  else if(S.phase==='open'&&D&&D.evType!=='none')p.push(`<span class="pill ev">${esc(D.evLabel)}</span>`);
  else if(S.event.type!=='none')p.push(`<span class="pill ev">${esc(eventLabel())}</span>`);
  for(const r of regPending())if(r.n)p.push(`<span class="pill reg">規制 あと${r.until-S.day+1}日で${r.n}台撤去</span>`);
  info.tags.forEach(t=>p.push(`<span class="pill cal">${t}</span>`));
  const re=openRivals().filter(r=>r.ev||S.day<=r.goUntil);
  if(re.length)p.push(`<span class="pill riv">${re.map(r=>esc(r.name)).join('・')}がイベント</span>`);
  return p.join('');
}
function renderStatus(){
  const ov={set:'設定',no:'番号',rate:'レート',off:'なし'}[prefs.overlay];
  let msg='',h='';
  if(S.phase==='prep'){h=hint();msg=`<span class="tm prep">準備中</span>${pills()}`}
  else if(S.phase==='open'){
    const playing=custs.filter(c=>c.st==='play'||c.st==='call').length;
    msg=`<span class="tm">${hhmm(clock)}</span><span class="stt">${clock>=LAST?'閉店準備中':`来店${D.visitors}・稼働${playing}/${machines().length}`}</span>${pills()}`;
  }
  const el=$('#statusMsg');if(el._h!==msg){el.innerHTML=msg;el._h=msg}
  const he=$('#hint');if(he._h!==h){he.textContent=h;he.hidden=!h;he._h=h}
  const bo=$('#bOverlay'),bt=`<span class="ibs">表示</span>${ov}`;if(bo._h!==bt){bo.innerHTML=bt;bo._h=bt}
}
const hhmm=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
/* 道具バーが高くなっても、お知らせがかぶらないようにする */
function fitToast(){requestAnimationFrame(()=>{const h=$('#dock').offsetHeight||48;$('#root').style.setProperty('--dockh',h+'px')})}
function renderDock(){
  const d=$('#dock'),sp=$('#speed'),open=S.phase==='open';
  $('#root').classList.toggle('prep',!open);
  sp.hidden=!open;d.hidden=open;
  if(open){
    const v=prefs.speed,pz=prefs.paused,html=`<button class="ib ${pz?'on':''}" data-dock="pause" type="button">${pz?'▶':'❚❚'}</button>`+
      [1,2,4].map(x=>`<button class="ib ${!pz&&v===x?'on':''}" data-dock="speed" data-v="${x}" type="button">×${x}</button>`).join('')+
      `<button class="ib" data-dock="hall" type="button">データ</button>`;
    if(sp._h!==html){sp.innerHTML=html;sp._h=html}
    d.innerHTML='';return;
  }
  if(tool!=='view'){d.innerHTML=`<div class="toolbar chipc">${toolText()}</div>`;fitToast();return}
  d.innerHTML=`<button class="btn" data-dock="build" type="button">建設</button>
<button class="btn" data-dock="move" type="button">動かす</button>
<button class="btn" data-dock="remove" type="button">片付け</button>
<button class="btn" data-dock="undo" type="button" ${undoStack.length?'':'disabled'}>取り消す</button>
<button class="btn" data-dock="list" type="button">設定</button>
<button class="btn ${S.event.type!=='none'||goActive()?'hot':''}" data-dock="event" type="button">イベント</button>
<button class="btn" data-dock="manage" type="button">経営</button>
<button class="btn primary" data-dock="open" type="button">開店!</button>`;
  fitToast();
}
/* ---------- 画面の向き ---------- */
let ROT=0;
function readSafe(){const cs=getComputedStyle($('#probe'));return {t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0}}
function applyLayout(){
  const vw=window.innerWidth,vh=window.innerHeight,portrait=vh>vw,root=$('#root'),sa=readSafe();
  ROT=prefs.rot==='off'||!portrait?0:prefs.rot==='flip'?-90:90;
  let w=vw,h=vh,ins;
  if(ROT){w=vh;h=vw;root.style.transform=ROT===90?'rotate(90deg) translateY(-100%)':'rotate(-90deg) translateX(-100%)';
    ins=ROT===90?{l:sa.t,r:sa.b,t:0,b:0}:{l:sa.b,r:sa.t,t:0,b:0}}
  else{root.style.transform='none';ins={l:sa.l,r:sa.r,t:sa.t,b:sa.b}}
  root.style.width=w+'px';root.style.height=h+'px';
  const st=document.documentElement.style;st.setProperty('--sl',ins.l+'px');st.setProperty('--sr',ins.r+'px');st.setProperty('--st',ins.t+'px');st.setProperty('--sb',ins.b+'px');
  const land=w>=h;document.documentElement.classList.toggle('L',land);document.documentElement.classList.toggle('P',!land);document.documentElement.classList.toggle('rot',!!ROT);
  VIEW={w,h};
  const prep=S&&S.phase!=='open';
  INSET=land?{t:44+ins.t,b:(prep?56:10)+ins.b,l:8+ins.l,r:8+ins.r}:{t:150+ins.t,b:(prep?108:56)+ins.b,l:6,r:6};
  resizeCanvas();
}
function toLocal(cx,cy){if(ROT===90)return {x:cy,y:window.innerWidth-cx};if(ROT===-90)return {x:window.innerHeight-cy,y:cx};return {x:cx,y:cy}}
function toLocalD(dx,dy){if(ROT===90)return {x:dy,y:-dx};if(ROT===-90)return {x:-dy,y:dx};return {x:dx,y:dy}}
/* 回転中はシートを指でスクロール */
(function(){
  const b=$('#sheetBody');let st=null,vel=0,raf=0;
  b.addEventListener('pointerdown',e=>{if(!ROT)return;cancelAnimationFrame(raf);st={x:e.clientX,y:e.clientY,moved:false,t:performance.now()};vel=0});
  b.addEventListener('pointermove',e=>{if(!ROT||!st)return;const d=toLocalD(e.clientX-st.x,e.clientY-st.y);
    if(!st.moved&&Math.abs(d.y)>6)st.moved=true;
    if(st.moved){b.scrollTop-=d.y;const now=performance.now();vel=d.y/Math.max(1,now-st.t);st.t=now;st.x=e.clientX;st.y=e.clientY}});
  const end=()=>{if(!st)return;const moved=st.moved;st=null;if(moved){b._drag=performance.now();let v=vel*16;const step=()=>{if(Math.abs(v)<0.5)return;b.scrollTop-=v;v*=0.93;raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}};
  b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
  b.addEventListener('click',e=>{if(b._drag&&performance.now()-b._drag<80){e.stopPropagation();e.preventDefault()}},true);
})();
/* ---------- つぶやき欄 ---------- */
function pushFeed(tw){
  const f=$('#feed'),el=document.createElement('div');el.className='tw';
  el.innerHTML=`<i style="background:${tw.col}"></i><span><b>${esc(tw.name)}</b>${esc(tw.text)}</span>`;
  f.appendChild(el);
  while(f.children.length>4)f.removeChild(f.firstChild);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),600)},7000);
}
function toolText(){
  const undoB=`<button class="btn sm" data-dock="undo" type="button" ${undoStack.length?'':'disabled'}>取り消す</button>`;
  const end=`<button class="btn sm primary" data-dock="endtool" type="button">終わる</button>`;
  if(tool==='build'){
    const it=buildItem,nm=itemName(it),price=it.store?'倉庫から（無料）':yen(itemPrice(it));
    const left=it.store?S.storage.filter(s=>s.kind===it.kind&&s.type===it.type).length:null;
    const how=it.kind==='w'?'壁か、壁ぎわのマスをタップ':'置きたいマスをタップ（続けて置けます）';
    return `<div class="tt">配置：<b>${esc(nm)}</b> ${price}${left!=null?` ・ 残り${left}`:''}<br><span class="sub">${how}</span></div>
<div class="row">${it.kind==='m'?dirButtons(buildDir):''}${undoB}${end}</div>`;
  }
  if(tool==='move'){
    const isM=moveSel&&moveSel.kind==='m';
    const t=moveSel?(moveSel.side?'新しい壁の場所をタップ':'移動先のマスをタップ'):'動かしたい台・設備・扉をタップ';
    return `<div class="tt"><b>動かす</b> ${t}${isM?`<br><span class="sub">${moveIsland?`${moveSel.island}島をまとめて動かします`:'この台だけ動かします'}</span>`:''}</div>
<div class="row">${isM?`<button class="btn sm ${moveIsland?'':'hot'}" data-dock="mone" type="button">この台だけ</button><button class="btn sm ${moveIsland?'hot':''}" data-dock="misl" type="button">島ごと</button><button class="btn sm" data-dock="mrot" type="button">↻ 回す</button>`:''}${undoB}${end}</div>`;
  }
  if(tool==='remove')return `<div class="tt"><b>片付け</b> タップした物を${removeMode==='sell'?'売ります（買値の半額）':'倉庫にしまいます'}</div>
<div class="row"><button class="btn sm ${removeMode==='sell'?'hot':''}" data-dock="rsell" type="button">売る</button><button class="btn sm ${removeMode==='store'?'hot':''}" data-dock="rstore" type="button">倉庫へ</button>${undoB}${end}</div>`;
  if(tool==='zone')return `<div class="tt"><b>たばこゾーン</b> ${zoneIsland?'台をタップすると島ごと塗ります':'マスをタップして塗ります'}<br><span class="sub">オレンジのマスは煙が流れてくる席です</span></div>
<div class="row"><button class="btn sm ${zoneBrush?'hot':''}" data-dock="zsmoke" type="button">喫煙OK</button><button class="btn sm ${zoneBrush?'':'hot'}" data-dock="zno" type="button">禁煙</button><button class="btn sm ${zoneIsland?'hot':''}" data-dock="zisl" type="button">島ごと</button>${end}</div>`;
  return '';
}
function refreshAll(){refreshHud();renderStatus();renderDock();if(sheetKind&&sheetKind!=='report'&&sheetKind!=='over')renderSheet()}

/* ---------- 建設の操作 ---------- */
const itemName=it=>it.kind==='m'?MB[it.type].name:it.kind==='d'?DB[it.type].name:WB[it.type].name;
const itemPrice=it=>it.kind==='m'?MB[it.type].price:it.kind==='d'?DB[it.type].price:WB[it.type].price;
function startBuild(kind,type,store){buildItem={kind,type,store:!!store};buildDir=0;tool='build';moveSel=null;closeSheet();renderDock();toast(kind==='w'?'壁か、壁ぎわのマスをタップ':'置きたいマスをタップ')}
function tryPlace(hit){
  const it=buildItem,price=it.store?0:itemPrice(it);
  let sIdx=-1;
  if(it.store){sIdx=S.storage.findIndex(s=>s.kind===it.kind&&s.type===it.type);if(sIdx<0){tool='view';renderDock();return}}
  if(S.money<price){toast('お金が足りません');sfx('bad');return}
  if(it.kind==='w'){
    const slot=hit.wall?{side:hit.wall,pos:hit.pos}:doorSlotFor(hit.x,hit.y);
    if(!slot){toastAt('壁か、壁ぎわのマスをタップしてください',hit.x,hit.y);sfx('bad');return}
    const d={type:it.type,side:slot.side,pos:slot.pos},why=validate(G.objs,[...G.doors,d]);
    if(why){toast(why);sfx('bad');return}
    pushUndo();S.money-=price;G.renoSpend+=price;d.id=S.nid++;G.doors.push(d);
    if(sIdx>=0)S.storage.splice(sIdx,1);
    const f=frontOf(d);floatAt(f.x,f.y,price?'-'+yen(price):'設置','#ffcf3a');
  }else{
    if(hit.wall){toast('床のマスをタップしてください');sfx('bad');return}
    let o;
    if(it.kind==='m'){
      const src=sIdx>=0?S.storage[sIdx]:{};
      o=newMachine(it.type,hit.x,hit.y,buildDir,{rate:src.rate||'hi',set:src.set,nail:src.nail,installDay:src.installDay??S.day});
      if(MB[it.type].k==='s'&&!o.set)o.set=1;
    }else o={kind:'d',type:it.type,x:hit.x,y:hit.y};
    const why=validate([...G.objs,o],G.doors);
    if(why){toastAt(why,hit.x,hit.y);sfx('bad');return}
    pushUndo();S.money-=price;G.renoSpend+=price;
    if(sIdx>=0)S.storage.splice(sIdx,1);
    addObj(o);floatAt(hit.x,hit.y,price?'-'+yen(price):'設置','#ffcf3a');
  }
  layoutChanged();sfx('place');save();
  if(it.store&&!S.storage.some(s=>s.kind===it.kind&&s.type===it.type)){tool='view';buildItem=null;toast('倉庫の分を置き終わりました')}
  refreshAll();
}
const sellPrice=o=>Math.round(itemPrice(o.side?{kind:'w',type:o.type}:o)*0.5/1000)*1000;
function removeThing(o,mode){
  pushUndo();
  if(o.side){G.doors=G.doors.filter(d=>d!==o);if(mode==='store')toStorage({kind:'w',type:o.type});else S.money+=sellPrice(o)}
  else{G.objs=G.objs.filter(x=>x!==o);if(mode==='store')toStorage(o);else S.money+=sellPrice(o)}
  if(moveSel===o)moveSel=null;
  const p=o.side?frontOf(o):o;
  floatAt(p.x,p.y,mode==='store'?'倉庫へ':'+'+yen(sellPrice(o)),'#22c55e');
  layoutChanged();sfx('cash');save();refreshAll();
}
const dirButtons=cur=>`<span class="dirset"><span class="dl">向き</span>${DIR_ORDER.map(d=>`<button class="btn sm dbtn ${cur===d?'hot':''}" data-dock="dir" data-v="${d}" type="button" aria-label="${DIR_NAME[d]}向き">${DIR_TRI[d]}</button>`).join('')}</span>`;
function setDirM(m,nd){
  if(m.dir===nd)return true;
  const why=validate(G.objs.map(o=>o===m?{...o,dir:nd}:o),G.doors);
  if(why){toast(`${DIR_NAME[nd]}向きにできません：${why}`);sfx('bad');return false}
  pushUndo();m.dir=nd;layoutChanged();save();sfx('place');return true;
}
/* 島（台のかたまり）を90度回す。cw=true で右回り。置けない時は少しずらして探す */
function rotateGroup(group,cw){
  const gset=new Set(group),xs=group.map(o=>o.x),ys=group.map(o=>o.y);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const base=group.map(o=>{const dx=o.x-cx,dy=o.y-cy;return {x:cw?cx-dy:cx+dy,y:cw?cy+dx:cy-dx,dir:(o.dir+(cw?1:3))%4}});
  const rest=G.objs.filter(o=>!gset.has(o));
  const offs=[[0,0],[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[-2,0],[0,2],[0,-2]];
  let why=null;
  for(const[ox,oy]of offs){
    const moved=base.map((b,i)=>({...group[i],x:Math.floor(b.x)+ox,y:Math.floor(b.y)+oy,dir:b.dir}));
    const w=validate(rest.concat(moved),G.doors);
    if(!w){pushUndo();group.forEach((o,i)=>{o.x=moved[i].x;o.y=moved[i].y;o.dir=moved[i].dir});layoutChanged();save();sfx('place');return true}
    why=why||w;
  }
  toast(`回せる場所がありません：${why}`);sfx('bad');return false;
}
function rotateM(m){
  for(let k=1;k<=3;k++){
    const nd=(m.dir+k)%4,cand=G.objs.map(o=>o===m?{...o,dir:nd}:o);
    if(!validate(cand,G.doors)){pushUndo();m.dir=nd;layoutChanged();save();sfx('place');return true}
  }
  toast('向きを変えられるすき間がありません');sfx('bad');return false;
}
function moveTap(hit){
  const door=hit.wall?G.doors.find(d=>d.side===hit.wall&&d.pos===hit.pos):frontMap.get(key(hit.x,hit.y));
  let o=hit.wall?null:occ.get(key(hit.x,hit.y));
  if(!moveSel){
    if(!o&&!hit.wall)o=seatMap.get(key(hit.x,hit.y));
    const t=o||door;if(t){moveSel=t;sfx('tap');renderDock()}return;
  }
  if(moveSel.side){
    if(door===moveSel){moveSel=null;renderDock();return}
    if(o){moveSel=o;renderDock();return}
    const slot=hit.wall?{side:hit.wall,pos:hit.pos}:doorSlotFor(hit.x,hit.y);
    if(!slot){toast('壁か、壁ぎわのマスをタップしてください');sfx('bad');return}
    const cand=G.doors.map(d=>d===moveSel?{...d,side:slot.side,pos:slot.pos}:d),why=validate(G.objs,cand);
    if(why){toast(why);sfx('bad');return}
    pushUndo();moveSel.side=slot.side;moveSel.pos=slot.pos;layoutChanged();sfx('place');save();refreshAll();return;
  }
  if(hit.wall){if(door){moveSel=door;renderDock()}return}
  const group=moveIsland&&moveSel.kind==='m'?islandOf(moveSel).ms:[moveSel],gset=new Set(group);
  if(o===moveSel){moveSel=null;renderDock();return}
  if(o&&!gset.has(o)){moveSel=o;sfx('tap');renderDock();return}
  const dx=hit.x-moveSel.x,dy=hit.y-moveSel.y;
  const cand=G.objs.map(ob=>gset.has(ob)?{...ob,x:ob.x+dx,y:ob.y+dy}:ob),why=validate(cand,G.doors);
  if(why){toastAt(why,hit.x,hit.y);sfx('bad');return}
  pushUndo();group.forEach(ob=>{ob.x+=dx;ob.y+=dy});layoutChanged();sfx('place');save();refreshAll();
}
function zoneTap(hit){
  if(hit.wall)return;
  const tiles=[];
  if(zoneIsland){
    const o=occ.get(key(hit.x,hit.y))||seatMap.get(key(hit.x,hit.y));
    if(o&&o.kind==='m'){for(const m of islandOf(o).ms){tiles.push({x:m.x,y:m.y});tiles.push(seatOf(m))}}
    else{toast('台をタップしてください');return}
  }else tiles.push({x:hit.x,y:hit.y});
  pushUndo();tiles.forEach(t=>{if(inB(t.x,t.y))G.zone[key(t.x,t.y)]=zoneBrush});
  sfx('tap');save();
}
function swapModel(m,id){
  const nm=MB[id],trade=Math.round(MB[m.type].price*0.3/1000)*1000,cost=nm.price-trade;
  if(S.money<cost){toast('お金が足りません');sfx('bad');return}
  pushUndo();S.money-=cost;G.renoSpend+=cost;
  const k=nm.k;m.type=id;m.installDay=S.day;m.yest=null;
  if(k==='s'){if(!m.set)m.set=2;m.nail=undefined}else{if(m.nail==null)m.nail=0;m.set=undefined}
  layoutChanged();floatAt(m.x,m.y,'新台！','#ff2d55');sfx('good');save();refreshAll();
}
function buyFloor(id){
  const f=FB[id];pushUndo();
  if(!G.ownedFloors.includes(id)){if(S.money<f.price){undoStack.pop();toast('お金が足りません');sfx('bad');return}S.money-=f.price;G.renoSpend+=f.price;G.ownedFloors.push(id)}
  G.floor=id;sfx('place');save();refreshAll();
}
function buyWall(id){
  const w=WLB[id];pushUndo();
  if(!G.ownedWalls.includes(id)){if(S.money<w.price){undoStack.pop();toast('お金が足りません');sfx('bad');return}S.money-=w.price;G.renoSpend+=w.price;G.ownedWalls.push(id)}
  G.wall=id;sfx('place');save();refreshAll();
}

/* ---------- シート共通 ---------- */
let sheetAt=0;
function openSheet(kind,data){sheetAt=performance.now();sheetKind=kind;sheetData=data;renderSheet();$('#sheet').hidden=false;$('#scrim').hidden=false;$('#sheetBody').scrollTop=0;$('#sheet').classList.toggle('tall',kind==='report'||kind==='guide'||kind==='manage'||kind==='list'||kind==='hall'||kind==='mdb')}
function closeSheet(){
  const was=sheetKind,wasData=sheetData;
  $('#sheet').hidden=true;$('#scrim').hidden=true;sheetKind=null;sheetData=null;panelSel=null;
  if(was==='report')afterReport();
  if(was==='transfer'&&wasData==='title')showTitle();
}
function renderSheet(){
  const b=$('#sheetBody'),top=b.scrollTop;let r;
  switch(sheetKind){
    case 'machine':r=machineSheet(sheetData);break;
    case 'decor':r=decorSheet(sheetData);break;
    case 'door':r=doorSheet(sheetData);break;
    case 'shop':r=shopSheet(sheetData);break;
    case 'list':r=listSheet(sheetData);break;
    case 'event':r=eventSheet();break;
    case 'manage':r=manageSheet(manageTabFromData());break;
    case 'report':r=reportSheet(sheetData);break;
    case 'guide':r=guideSheet(sheetData);break;
    case 'menu':r=menuSheet(sheetData);break;
    case 'move':r=moveSheet(sheetData);break;
    case 'over':r=overSheet();break;
    case 'end':r=endSheet(sheetData);break;
    case 'transfer':r=transferSheet();break;
    case 'hall':r=hallSheet(sheetData);break;
    case 'mdb':r=mdbSheet(sheetData);break;
    default:return;
  }
  if(!r||!sheetKind)return;
  $('#sheetTitle').textContent=r[0];b.innerHTML=r[1];b.scrollTop=top;
}
const tabs=(list,cur,act)=>`<div class="tabs">${list.map(([k,l])=>`<button class="chip ${cur===k?'cur':''}" data-act="${act}" data-v="${k}" type="button">${l}</button>`).join('')}</div>`;
const lvBtns=(m,act,extra='',dis=false,small=false)=>{
  if(kindOf(m)==='s')return `<div class="setrow${small?' small':''}">${[1,2,3,4,5,6].map(v=>`<button class="sbtn c${v} ${m.set===v?'cur':''}" data-act="${act}" data-v="${v}" ${extra} ${dis?'disabled':''} type="button">${v}</button>`).join('')}</div>`;
  return `<div class="setrow${small?' small':''}">${[-2,-1,0,1,2].map(v=>`<button class="sbtn n${v+2} wide ${m.nail===v?'cur':''}" data-act="${act}" data-v="${v}" ${extra} ${dis?'disabled':''} type="button">${small?NAIL_SHORT[v+2]:NAIL_NAME[v+2]}</button>`).join('')}</div>`;
};
const starTxt=n=>'★'.repeat(n)+'☆'.repeat(5-n);

/* ---------- 台・設備・扉 ---------- */
function machineSheet(d){
  const m=d.m;if(!G.objs.includes(m)){closeSheet();return null}
  const md=MB[m.type],k=md.k,prep=S.phase==='prep',age=S.day-m.installDay,s=seatOf(m),z=zoneAt(s.x,s.y);
  let h=`<div class="mp-head"><div class="mp-no">${m.no}<small>番台</small></div><div class="mp-t"><div class="mp-name">${esc(md.name)}</div><div class="tags"><span class="tag k${k}">${KIND_NAME[k]}</span><span class="tag">${specOf(md)}</span><span class="tag">${m.island}島${islandMixed(m)?'（混在）':''}</span><span class="tag ${z?'smk':''}">${z?'喫煙OK席':'禁煙席'}</span>${m.installDay>0&&age<10?`<span class="tag new">新台${age+1}日目</span>`:''}${regulatedIds().has(m.type)?`<span class="tag dark">規制で撤去予定</span>`:''}${m.broken?'<span class="tag dark">故障中</span>':''}</div></div></div>`;
  if(d.swap){
    const trade=Math.round(md.price*0.3/1000)*1000;
    h+=`<div class="lbl">入れ替える機種（いまの台は${yen(trade)}で下取り）</div>`;
    h+=MODELS.filter(x=>(x.gen||1)<=S.gen).sort(byRankPrice).map(x=>{const lock=rankNo()<x.rank||!modelOnSale(x.id);return `<div class="item ${lock?'locked':''}"><span class="sw" style="background:${x.c}"></span><div class="it"><div class="nm">${esc(x.name)}</div><div class="ds">${KIND_NAME[x.k]}／${specLine(x)}・人気${x.pop}</div></div>${!modelOnSale(x.id)?'<span class="sub">販売終了</span>':lock?`<span class="sub">ランク${x.rank}</span>`:x.id===m.type?'<span class="sub">いまの機種</span>':`<button class="btn sm" data-act="swap-to" data-id="${x.id}" type="button">${yen(x.price-trade)}</button>`}</div>`}).join('');
    h+=`<button class="btn" data-act="m-swap-back" type="button">もどる</button>`;
    return [`${m.no}番台を入れ替え`,h];
  }
  h+=`<div class="lbl">レート</div><div class="chips">${['hi','lo'].map(r=>`<button class="chip ${m.rate===r?'cur':''}" data-act="m-rate" data-v="${r}" ${prep?'':'disabled'} type="button">${RATE[k][r].label}${k==='p'?'パチンコ':'スロット'}</button>`).join('')}</div>`;
  h+=`<div class="lbl">${k==='s'?'設定':'釘'}${prep?'':'（営業中は変えられません）'}</div>${lvBtns(m,'m-lv','',!prep)}<div class="sub">${k==='s'?`<b>設定${m.set}：出玉率${md.rates[m.set-1].toFixed(1)}%</b>（初当り約1/${Math.round(slotProb(md,m.set))}）${(md.none||[]).includes(m.set)?'※実機にない設定':''}<br>${SLOT_HINT[m.set]}`:`<b>初当り1/${md.prob}（${specOf(md)}）</b>・平均約${Math.round(400*NAIL_R[2]*md.prob/P_SPM/4).toLocaleString('ja-JP')}発/初当り<br>${NAIL_HINT[m.nail+2]}`}</div>`;
  const t=S.phase==='open'?m.today:m.yest,lab=S.phase==='open'?'今日':'昨日';
  if(t)h+=`<div class="box stats"><span>${lab}の稼働 <b>${Math.round(t.mins)}分</b></span><span>大当り <b>${t.hits}回</b></span><span>店の収支 <b class="${t.coin-t.out>=0?'pos':'neg'}">${sgn(t.coin-t.out)}</b></span></div>`;
  else h+=`<div class="sub">まだデータがありません</div>`;
  if(S.phase==='open'){
    const c=custs.find(x=>x.m===m&&(x.st==='play'||x.st==='call'));
    h+=c?`<div class="box">遊技中：${c.reg?esc(REG_BY[c.reg].name):c.hunter?'設定狙いの客':'一般客'} ・ <span class="${c.won-c.inv>=0?'pos':'neg'}">${sgn(c.won-c.inv)}</span>${c.st==='call'?' ・ <b class="neg">呼び出し中</b>':''}</div>`:m.brk?`<div class="sub">休憩中（たばこ）</div>`:`<div class="sub">いまは空き台です</div>`;
  }
  if(prep){
    const isl=islandOf(m);
    h+=`<div class="lbl">台の向き（お客さんが座る側）</div><div class="chips">${DIR_ORDER.map(d=>`<button class="chip ${m.dir===d?'cur':''}" data-act="m-dir" data-v="${d}" type="button">${DIR_TRI[d]} ${DIR_NAME[d]}</button>`).join('')}</div>`;
    if(isl.ms.length>1)h+=`<div class="chips"><button class="chip" data-act="isl-rot" data-v="ccw" type="button">↺ ${m.island}島ごと左に回す</button><button class="chip" data-act="isl-rot" data-v="cw" type="button">↻ ${m.island}島ごと右に回す</button></div>`;
  }
  if(prep)h+=`<div class="actions"><button class="btn sm" data-act="o-move" type="button">動かす</button><button class="btn sm" data-act="m-swap" type="button">機種を入れ替え</button><button class="btn sm" data-act="o-store" type="button">倉庫へしまう</button><button class="btn sm danger wide2" data-act="o-sell" type="button">売る ${yen(sellPrice(m))}</button></div>`;
  return [`${m.no}番台`,h];
}
function decorSheet(o){
  if(!G.objs.includes(o)){closeSheet();return null}
  const dd=DB[o.type];
  let h=`<div class="item"><span class="sw" style="background:${SWATCH[o.type]}"></span><div class="it"><div class="nm">${esc(dd.name)}</div><div class="ds">${esc(dd.info)}</div></div></div>`;
  if(o.type==='counter'){const ok=counterStaffFor(o);h+=`<div class="box">${ok?'カウンター係がいます':'<b class="neg">カウンター係がいません</b>（経営 → 店員で雇えます）'}</div>`}
  if(S.phase==='prep')h+=`<div class="actions"><button class="btn sm" data-act="o-move" type="button">動かす</button><button class="btn sm" data-act="o-store" type="button">倉庫へしまう</button><button class="btn sm danger wide2" data-act="o-sell" type="button">売る ${yen(sellPrice(o))}</button></div>`;
  return [dd.name,h];
}
function counterStaffFor(o){const cs=G.objs.filter(x=>x.kind==='d'&&x.type==='counter');return cs.indexOf(o)<staffOf('counter').length}
function doorSheet(d){
  if(!G.doors.includes(d)){closeSheet();return null}
  const w=WB[d.type];
  let h=`<div class="item"><span class="sw" style="background:${SWATCH[d.type]}"></span><div class="it"><div class="nm">${esc(w.name)}</div><div class="ds">${esc(w.info)}</div></div></div>`;
  if(S.phase==='open'){const r=rooms.get(d.id);h+=`<div class="box">いま中にいる人：${r?r.inside:0}／${w.cap}人</div>`}
  if(S.phase==='prep')h+=`<div class="actions"><button class="btn sm" data-act="o-move" type="button">動かす</button><button class="btn sm" data-act="o-store" type="button">倉庫へしまう</button><button class="btn sm danger wide2" data-act="o-sell" type="button">売る ${yen(sellPrice(d))}</button></div>`;
  return [w.name,h];
}

/* ---------- 建設メニュー ---------- */
function shopSheet(tab){
  tab=tab||'m';const rk=rankNo();
  let h=tabs([['m','台'],['d','設備'],['f','床と壁'],['s',`倉庫${S.storage.length?`(${S.storage.length})`:''}`],['x','広げる']],tab,'shop-tab');
  h+=`<div class="sub">資金 ${yen(S.money)} ・ ランク${rk}「${RANKS[rk-1].n}」・ 内装 ${stars()}</div>`;
  const row=(sw,nm,ds,right,lock)=>`<div class="item ${lock?'locked':''}"><span class="sw" style="background:${sw}"></span><div class="it"><div class="nm">${nm}</div><div class="ds">${ds}</div></div>${right}</div>`;
  if(tab==='m'){
    for(const k of ['p','s']){
      h+=`<div class="lbl">${KIND_NAME[k]}</div>`;
      h+=MODELS.filter(x=>x.k===k&&(x.gen||1)<=S.gen).sort(byRankPrice).map(x=>{const off=!modelOnSale(x.id);return row(x.c,esc(x.name)+(x.gen?' <span class="tag new">新基準</span>':''),`${specLine(x)}・人気${x.pop}<br>${SPEC_INFO[specOf(x)]}`,off?'<span class="sub">販売終了</span>':rk<x.rank?`<span class="sub">ランク${x.rank}</span>`:`<button class="btn sm" data-act="buy" data-k="m" data-id="${x.id}" type="button">${yen(x.price)}</button>`,rk<x.rank||off)}).join('');
    }
  }else if(tab==='d'){
    h+=`<button class="btn" data-act="zone-tool" type="button">たばこゾーンを塗る</button>`;
    h+=`<div class="lbl">壁に付ける（マスを使わない）</div>`+WALLITEMS.map(x=>row(SWATCH[x.id],esc(x.name),esc(x.info),rk<x.rank?`<span class="sub">ランク${x.rank}</span>`:`<button class="btn sm" data-act="buy" data-k="w" data-id="${x.id}" type="button">${yen(x.price)}</button>`,rk<x.rank)).join('');
    h+=`<div class="lbl">床に置く</div>`+DECOR.map(x=>row(SWATCH[x.id],esc(x.name),esc(x.info),rk<x.rank?`<span class="sub">ランク${x.rank}</span>`:`<button class="btn sm" data-act="buy" data-k="d" data-id="${x.id}" type="button">${yen(x.price)}</button>`,rk<x.rank)).join('');
  }else if(tab==='f'){
    h+=`<div class="lbl">床（いちど買えば無料で切り替え）</div>`+FLOORS.map(x=>{const own=G.ownedFloors.includes(x.id),cur=G.floor===x.id;return row(`linear-gradient(135deg,${x.a} 50%,${x.b} 50%)`,x.name,`内装＋${x.appeal}`,cur?'<span class="sub">使用中</span>':`<button class="btn sm" data-act="floor" data-id="${x.id}" type="button">${own?'使う':yen(x.price)}</button>`)}).join('');
    h+=`<div class="lbl">壁</div>`+WALLS.map(x=>{const own=G.ownedWalls.includes(x.id),cur=G.wall===x.id;return row(`linear-gradient(90deg,${x.c} 50%,${x.d} 50%)`,x.name,`内装＋${x.appeal}`,cur?'<span class="sub">使用中</span>':`<button class="btn sm" data-act="wall" data-id="${x.id}" type="button">${own?'使う':yen(x.price)}</button>`)}).join('');
  }else if(tab==='s'){
    const gs=storageGroups();
    if(!gs.length)h+=`<div class="empty">倉庫は空です。片付けで「倉庫へ」を選ぶと、ここにしまえます。移転すると前の店の台と設備がここに入ります。</div>`;
    h+=gs.map(g=>{const it=S.storage[g.idx[0]],gift=g.idx.some(i=>S.storage[i].gift);return row(it.kind==='m'?MB[it.type].c:SWATCH[it.type],`${esc(storageName(it))} ×${g.idx.length}`,`${it.kind==='m'?KIND_NAME[MB[it.type].k]+'の台':it.kind==='w'?'壁に付ける設備':'床に置く設備'}${gift?'・新築プレゼント':''}`,`<div class="col"><button class="btn sm" data-act="store-place" data-k="${it.kind}" data-id="${it.type}" type="button">置く</button><button class="btn sm ghost" data-act="store-sell" data-k="${it.kind}" data-id="${it.type}" type="button">売る ${yen(storageValue(it))}</button></div>`)}).join('');
  }else{
    const pt=LOCS[G.loc].priceTile*1.2;
    h+=`<div class="box">いまの広さ：<b>${G.W}×${G.H}マス</b>（最大${G.maxW}×${G.maxH}）・家賃 ${yen(rentOf())}／日</div>`;
    const cw=(G.W+2)*G.H-G.W*G.H,ch=G.W*(G.H+2)-G.W*G.H;
    h+=row('#a855f7','横に2マス広げる',`${G.W+2}×${G.H}マスに。家賃が増えます`,G.W+2>G.maxW?'<span class="sub">上限</span>':`<button class="btn sm" data-act="expand" data-v="w" type="button">${yen(cw*pt)}</button>`);
    h+=row('#a855f7','奥に2マス広げる',`${G.W}×${G.H+2}マスに。家賃が増えます`,G.H+2>G.maxH?'<span class="sub">上限</span>':`<button class="btn sm" data-act="expand" data-v="h" type="button">${yen(ch*pt)}</button>`);
    h+=`<div class="sub">もっと大きな店は「経営 → 物件」から。今の台や設備は倉庫に入れて持っていけます。</div>`;
  }
  return ['建設',h];
}

/* ---------- 設定一覧 ---------- */
function scopeMachines(sc){
  const ms=machines();
  if(sc==='all')return ms;if(sc==='p'||sc==='s')return ms.filter(m=>kindOf(m)===sc);
  if(sc==='ev')return eventTargets();
  return (islands.find(i=>i.label===sc)||{ms:[]}).ms;
}
function listSheet(scope){
  scope=scope||'all';const prep=S.phase==='prep',ms=machines();
  const tg=new Set(S.event.type!=='none'?eventTargets():[]);
  const sl=ms.filter(m=>kindOf(m)==='s'),pc=ms.filter(m=>kindOf(m)==='p');
  let h='';
  h+=`<div class="box stats"><span>スロット平均設定 <b>${sl.length?avgOf(sl.map(m=>m.set)).toFixed(1):'-'}</b></span><span>パチンコ平均釘 <b>${pc.length?(avgOf(pc.map(m=>m.nail))>=0?'+':'')+avgOf(pc.map(m=>m.nail)).toFixed(1):'-'}</b></span><span>出し具合 <b>${Math.round(avgOf(ms.map(dashi))*100)}%</b></span></div>`;
  h+=`<button class="btn sm" data-act="open-hall" type="button">ホールデータを見る（${prep?'昨日':'今日'}の出玉ランキング・稼働率）</button>`;
  if(prep){
    const sc=[['all','全台'],['p','パチンコ'],['s','スロット'],...(S.event.type!=='none'&&S.event.type!=='renewal'?[['ev','イベント対象']]:[]),...islands.map(i=>[i.label,i.label+'島'])];
    h+=`<div class="lbl">まとめて変える範囲</div>`+tabs(sc,scope,'ls-scope');
    const sm=scopeMachines(scope),hasS=sm.some(m=>kindOf(m)==='s'),hasP=sm.some(m=>kindOf(m)==='p');
    if(hasS)h+=`<div class="bulk"><span class="lbl">スロット設定</span><div class="setrow small">${[1,2,3,4,5,6].map(v=>`<button class="sbtn c${v}" data-act="ls-bulk-s" data-v="${v}" type="button">${v}</button>`).join('')}</div></div>`;
    if(hasP)h+=`<div class="bulk"><span class="lbl">パチンコ釘</span><div class="setrow small">${[-2,-1,0,1,2].map(v=>`<button class="sbtn n${v+2} wide" data-act="ls-bulk-p" data-v="${v}" type="button">${NAIL_SHORT[v+2]}</button>`).join('')}</div></div>`;
    h+=`<div class="chips"><button class="chip" data-act="ls-rate" data-v="hi" type="button">高レートにする</button><button class="chip" data-act="ls-rate" data-v="lo" type="button">低レートにする</button><button class="chip" data-act="ls-rand" type="button">低めにばらばら</button></div>`;
  }
  for(const isl of islands){
    h+=`<div class="isl-h">${isl.label}島 <span class="sub">${isl.kind==='mix'?'パチンコとスロットが混在':KIND_NAME[isl.kind]}・${isl.ms.length}台</span></div>`;
    for(const m of isl.ms){
      const t=S.phase==='open'?m.today:m.yest,lab=S.phase==='open'?'今日':'昨日';
      const rs=t?`<span class="rs ${t.coin-t.out>=0?'pos':'neg'}">${lab} 店${sgn(t.coin-t.out)}</span>`:`<span class="rs sub">データなし</span>`;
      h+=`<div class="lrow ${tg.has(m)?'tgt':''}"><div class="l1"><span class="no">${m.no}</span><span class="rt ${m.rate}">${rateLabel(m)}</span><span class="nm">${esc(MB[m.type].name)}</span>${rs}</div>${prep?lvBtns(m,'ls-lv',`data-id="${m.id}"`,false,true):`<div class="sub">${kindOf(m)==='s'?`設定 <span class="badge c${m.set}">${m.set}</span>`:`釘 <span class="badge n${m.nail+2}">${NAIL_NAME[m.nail+2]}</span>`} ・ 大当り${t?t.hits:0}回 ・ 稼働${t?Math.round(t.mins):0}分</div>`}</div>`;
    }
  }
  return [prep?'設定一覧':'台データ（営業中は見るだけ）',h];
}

/* ---------- イベント ---------- */
function eventSheet(){
  let h='';
  if(goActive()){
    const g=S.go,ms=machines(),dash=avgOf(ms.map(dashi));
    h+=`<div class="burstcard"><div class="bc-main">${g.type==='grand'?'グランドオープン':'リニューアルオープン'}</div><div class="bc-sub">${goDayIdx()+1}日目 ／ 全${g.len}日</div></div>`;
    h+=`<div class="box"><b>オープン期間は、入りきらないほどお客さんが来ます。</b>全台の「出し具合」とお客さんの満足度で毎日採点され、期間の平均で評価が決まります。<br>評価が悪いと信用がガタ落ちし、しばらく客付きが悪くなります。</div>`;
    h+=`<div class="meter"><div class="mt-l">いまの出し具合</div><div class="mt-bar"><i style="width:${Math.round(dash*100)}%"></i><span class="mk" style="left:60%"></span></div><div class="mt-v">${Math.round(dash*100)}%</div></div><div class="sub">目安：出し具合60%以上＋満足度で「成功」、70%を超えると「大成功」が狙えます。</div>`;
    if(g.scores.length)h+=`<div class="sub">これまでの点数：${g.scores.map(s=>Math.round(s*100)).join('・')}</div>`;
    h+=`<button class="btn" data-act="go-list" type="button">設定一覧を開く</button><button class="btn primary" data-act="close" type="button">わかった</button>`;
    return ['オープン期間',h];
  }
  const ev=S.event,ms=machines();
  const types=[['none','通常営業'],['island','島の全台系'],['tail','末尾の日'],['model','機種イベント'],['media','取材'],['newm','新台入替'],['renewal','リニューアル']];
  h+=`<div class="lbl">イベントの種類</div><div class="chips">${types.map(([k,l])=>{const dis=(k==='newm'&&newCount()<3)||(k==='renewal'&&!canRenewal());return `<button class="chip ${ev.type===k?'cur':''}" data-act="ev-type" data-t="${k}" ${dis?'disabled':''} type="button">${l}</button>`}).join('')}</div>`;
  if(newCount()<3)h+=`<div class="sub">新台入替：昨日か今日に3台以上入れると選べます（今${newCount()}台）</div>`;
  if(!canRenewal())h+=`<div class="sub">リニューアル：前のオープンから21日以上たち、改装に100万円以上使うと選べます（今${man(G.renoSpend)}・${S.day-S.lastOpen}日）</div>`;
  if(ev.type==='island')h+=`<div class="lbl">どの島？</div><div class="chips">${islands.map(i=>`<button class="chip ${ev.target===i.label?'cur':''}" data-act="ev-target" data-v="${i.label}" type="button">${i.label}島（${i.ms.length}台）</button>`).join('')}</div>`;
  if(ev.type==='tail'){const cnt=d=>ms.filter(m=>m.no%10===d).length;h+=`<div class="lbl">台番号の最後の数字（4と9はありません）</div><div class="chips">${[0,1,2,3,5,6,7,8].map(d=>`<button class="chip ${String(ev.target)===String(d)?'cur':''}" data-act="ev-target" data-v="${d}" ${cnt(d)?'':'disabled'} type="button">末尾${d}（${cnt(d)}台）</button>`).join('')}</div>`}
  if(ev.type==='model'){const ids=[...new Set(ms.map(m=>m.type))];h+=`<div class="lbl">どの機種？</div><div class="chips">${ids.map(id=>`<button class="chip ${ev.target===id?'cur':''}" data-act="ev-target" data-v="${id}" type="button">${esc(shortName(MB[id].name))}（${ms.filter(m=>m.type===id).length}台）</button>`).join('')}</div>`}
  if(ev.type==='media'){
    h+=`<div class="lbl">どこに取材してもらう？</div><div class="chips">${[['mag',`パチンコ雑誌（${man(MEDIA_COST.mag)}）`,1],['tube',`人気配信者（${man(MEDIA_COST.tube)}）`,3]].map(([k,l,r])=>`<button class="chip ${ev.target===k?'cur':''}" data-act="ev-target" data-v="${k}" ${rankNo()<r?'disabled':''} type="button">${l}${rankNo()<r?`（ランク${r}）`:''}</button>`).join('')}</div>`;
    const avg=avgOf(ms.map(dashi)),[j,cls]=judgeOf(avg,0.12);
    h+=`<div class="box col"><div>取材では<b>お店全体の出し具合</b>が見られます。いま <b>${Math.round(avg*100)}%</b></div><div>このままだと… <span class="verdict ${cls}">${j}</span></div><div>客足の見込み <b>×${eventMultToday().toFixed(2)}</b>・設定狙いの客が多く来ます</div><div class="sub">${ev.target==='tube'?'配信は影響が大きく、良くも悪くも評判が大きく動きます':'雑誌はほどほどの影響です'}</div></div>
<div class="actions"><button class="btn sm" data-act="ev-fill-all" data-v="hi" type="button">全台を高めに</button><button class="btn sm" data-act="go-list" type="button">設定一覧を開く</button></div>`;
  }else if(ev.type==='renewal'){
    h+=`<div class="box"><b>リニューアルオープン（2日間・告知費15万円）</b><br>グランドオープンほどではありませんが、たくさんのお客さんが来ます。判定は厳しめ。全台の出し具合とお客さんの満足度で採点されます。</div>`;
  }else if(ev.type!=='none'){
    h+=`<button class="chip wide ${ev.ad?'cur':''}" data-act="ev-ad" type="button">${ev.ad?'✓ ':''}チラシとSNSで告知する（${yen(50000)}）</button>`;
    const tgs=eventTargets();
    if(tgs.length){
      const avg=avgOf(tgs.map(dashi)),[j,cls]=judgeOf(avg,ev.type==='newm'?0.15:0);
      h+=`<div class="box col"><div>対象 <b>${tgs.length}台</b> ・ 出し具合 <b>${Math.round(avg*100)}%</b></div>
<div>このままだと… <span class="verdict ${cls}">${j}</span></div>
<div class="sub">${cls==='good'?'約束どおり。信用が上がります':cls==='mid'&&j==='まずまず'?'少し信用が上がります':'信用が下がります。対象台の設定や釘を上げましょう'}</div>
<div>客足の見込み <b>×${eventMultToday().toFixed(2)}</b>（通常営業との比較）</div>
${recentEvents()?'<div class="sub neg">最近イベントが続いているので効果が下がっています</div>':''}
${openRivals().some(r=>r.ev)?'<div class="sub neg">今日はライバル店もイベント。お客さんを取り合います</div>':''}</div>
<div class="actions"><button class="btn sm" data-act="ev-fill" data-v="hi" type="button">対象を高めに<br><span class="sub">設定5・やや開け</span></button><button class="btn sm" data-act="ev-fill" data-v="max" type="button">対象を最大に<br><span class="sub">設定6・開け</span></button></div>`;
    }else h+=`<div class="sub">対象を選んでください</div>`;
  }
  h+=`<div class="sub">イベントはお客さんへの約束です。スロットは設定、パチンコは釘で出し具合が決まります。守れないと「ガセ」と言われて信用が下がります。</div>`;
  h+=`<button class="btn primary" data-act="close" type="button">決定</button>`;
  return [`${dateLong(S.day)}のイベント`,h];
}

/* ---------- 経営 ---------- */
function manageSheet(tab){
  tab=tab||'staff';
  let h=tabs([['staff','店員'],['rival','ライバル'],['reg','常連'],['prop','物件'],['bank','銀行'],['goal','目標'],['log','記録']],tab,'mg-tab');
  if(tab==='staff'){
    const need=needStaff();
    h+=`<div class="box stats">${Object.entries(ROLES).map(([r,v])=>{const n=staffOf(r).length,ok=n>=need[r];return `<span>${v.name} <b class="${ok?'pos':'neg'}">${n}</b>／目安${need[r]}</span>`}).join('')}<span>給料 <b>${yen(wagesTotal())}</b>／日</span></div>`;
    h+=`<div class="lbl">いまの店員</div>`;
    h+=S.staff.length?S.staff.map(s=>`<div class="item"><span class="sw" style="background:${ROLES[s.role].col}"></span><div class="it"><div class="nm">${esc(s.name)} <span class="sub">Lv${s.lv}</span></div><div class="ds">${ROLES[s.role].name}・速さ${starTxt(s.spd)}・接客${starTxt(s.srv)}<br>給料 ${yen(s.wage)}／日</div></div><div class="col">${s.lv<5?`<button class="btn sm" data-act="st-train" data-id="${s.id}" type="button">研修 ${yen(trainCost(s))}</button>`:''}<button class="btn sm ghost" data-act="st-fire" data-id="${s.id}" type="button">やめてもらう</button></div></div>`).join(''):'<div class="empty">店員がいません</div>';
    h+=`<div class="lbl">応募してきた人（毎日入れかわります）</div>`;
    h+=S.cands.map(c=>`<div class="item"><span class="sw" style="background:${ROLES[c.role].col}"></span><div class="it"><div class="nm">${esc(c.name)}</div><div class="ds">${ROLES[c.role].name}・速さ${starTxt(c.spd)}・接客${starTxt(c.srv)}<br>給料 ${yen(c.wage)}／日</div></div><button class="btn sm" data-act="st-hire" data-id="${c.id}" type="button">雇う</button></div>`).join('')||'<div class="empty">今日の応募はもういません</div>';
    h+=`<div class="sub">${Object.values(ROLES).map(r=>`${r.name}：${r.desc}`).join('<br>')}</div>`;
  }else if(tab==='rival'){
    const fc=forecast();
    h+=`<div class="box">今日の見込みシェア：<b>${Math.round(fc.shares.me*100)}%</b>（あなたの店）</div>`;
    h+=S.rivals.map(r=>{
      const sh=fc.shares[r.id]||0,state=!r.open?'閉店':r.health>60?'好調':r.health>30?'ふつう':r.health>12?'苦しい':'危ない';
      return `<div class="rv ${r.open?'':'closed'}"><div class="rv-h"><span class="sw" style="background:${r.col}"></span><b>${esc(r.name)}</b><span class="tag ${r.health<=30&&r.open?'smk':''}">${state}</span></div>
${r.open?`<div class="ds">台数${r.size}台・評判${Math.round(r.rep)}・${patLabel(r.pat)}がイベント${S.day<=r.goUntil?'・<b class="neg">オープン中</b>':''}${r.ev?'・<b class="neg">今日イベント</b>':''}</div>
<div class="bar2"><i style="width:${Math.round(sh*100)}%;background:${r.col}"></i></div><div class="sub">今日の見込みシェア ${Math.round(sh*100)}%</div>`:`<div class="ds">${dateStr(r.closedDay)}に閉店</div>`}</div>`}).join('');
    h+=`<div class="sub">あなたの店が評判を上げてお客さんを集めるほど、ライバル店の経営は苦しくなります。閉店した店は居抜き物件として買えることがあります。</div>`;
  }else if(tab==='reg'){
    h+=REG_DEFS.map(def=>{const st=S.regs[def.id],hearts=Math.round(st.loy/20);return `<div class="item ${st.st==='gone'?'locked':''}"><span class="sw face" style="background:${def.look.shirt}"></span><div class="it"><div class="nm">${esc(def.name)} ${st.loy>=70?'<span class="tag new">常連</span>':''}</div><div class="ds">${'♥'.repeat(hearts)}${'♡'.repeat(5-hearts)} ・ ${regStatus(st)}・来店${st.visits}回<br>${st.met?`好き：${esc(def.likes)}／苦手：${esc(def.hates)}`:'まだ好みがわかりません'}${st.say?`<br>「${esc(st.say)}」`:''}</div></div></div>`}).join('');
    h+=`<div class="sub">常連になった人が多いほど、お店の評判が少しずつ上がります。離れた人も、評判が高くなるとまた来てくれることがあります。</div>`;
  }else if(tab==='prop'){
    const sale=Math.round(storeValue()*0.6/10000)*10000;
    h+=`<div class="box"><b>いまの店</b>：${LOCS[G.loc].name}・${G.W}×${G.H}マス（最大${G.maxW}×${G.maxH}）<br>家賃 ${yen(rentOf())}／日・売ると ${yen(sale)}</div>`;
    h+=`<div class="sub">移転すると、いまの店は売却。台と設備はすべて倉庫に入り、新しい店で置き直せます。新しい店はグランドオープンから始まります。</div>`;
    h+=`<div class="lbl">居抜き物件（前の店のレイアウトつき）</div>`;
    h+=S.offers.length?S.offers.map(o=>{const L=LOCS[o.loc],lock=rankNo()<L.rank,mc=o.lay.objs.filter(x=>x.kind==='m').length;return `<div class="item ${lock?'locked':''}"><span class="sw" style="background:${o.from?'#ff2d55':'#a855f7'}"></span><div class="it"><div class="nm">${L.name} ${o.W}×${o.H}マス${o.from?` <span class="tag new">元${esc(o.from)}</span>`:''}</div><div class="ds">台${mc}台つき・家賃${yen(o.W*o.H*L.rentTile)}／日<br>${esc(L.desc)}</div></div>${lock?`<span class="sub">ランク${L.rank}</span>`:`<button class="btn sm" data-act="pr-inuki" data-id="${o.id}" type="button">${man(o.price)}</button>`}</div>`}).join(''):'<div class="empty">いま出ている物件はありません</div>';
    h+=`<div class="lbl">更地に新築（設備プレゼントつき）</div><div class="sub">プレゼント：トイレ×2・景品カウンター・自販機×2・ベンチ・観葉植物×2（倉庫に入ります）</div>`;
    const nb=(sheetData&&typeof sheetData==='object'&&sheetData.nb)||{loc:'jutaku',size:0};
    h+=`<div class="chips">${Object.entries(LOCS).map(([k,L])=>`<button class="chip ${nb.loc===k?'cur':''}" data-act="nb-loc" data-v="${k}" ${rankNo()<L.rank?'disabled':''} type="button">${L.name}${rankNo()<L.rank?`(ランク${L.rank})`:''}</button>`).join('')}</div>`;
    h+=`<div class="chips">${BUILD_SIZES.map((z,i)=>`<button class="chip ${nb.size===i?'cur':''}" data-act="nb-size" data-v="${i}" ${rankNo()<z.rank?'disabled':''} type="button">${z.W}×${z.H}${rankNo()<z.rank?`(ランク${z.rank})`:''}</button>`).join('')}</div>`;
    const z=BUILD_SIZES[nb.size],L=LOCS[nb.loc],p=newBuildPrice(nb.loc,z.W,z.H);
    h+=`<div class="box">${L.name}・${z.W}×${z.H}マス：<b>${man(p)}</b>（1マス${yen(L.priceTile)}＋工事費50万円）<br>家賃 ${yen(z.W*z.H*L.rentTile)}／日<br><span class="sub">${esc(L.desc)}</span></div>`;
    h+=`<button class="btn" data-act="pr-new" type="button">この内容で新築して移転</button>`;
  }else if(tab==='bank'){
    const lim=loanLimit(),room=Math.max(0,lim-S.loan),int=Math.round(S.loan*LOAN_RATE);
    h+=`<div class="kpis"><div><b>${man(S.loan)}</b><span>借入残高</span></div><div><b>${man(room)}</b><span>あと借りられる</span></div><div><b>${yen(int)}</b><span>毎日の利息</span></div></div>`;
    h+=`<div class="box">利息は残高の0.08%を毎日払います（ひと月でおよそ2.4%）。借りられる上限はランクとお店の価値で上がります。</div>`;
    h+=`<div class="lbl">借りる</div><div class="chips">${[500000,1000000,3000000,10000000].map(n=>`<button class="chip" data-act="bk-borrow" data-v="${n}" ${room<n?'disabled':''} type="button">${man(n)}</button>`).join('')}</div>`;
    h+=`<div class="lbl">返す</div><div class="chips">${[500000,1000000,3000000].map(n=>`<button class="chip" data-act="bk-repay" data-v="${n}" ${S.loan<=0||S.money<Math.min(n,S.loan)?'disabled':''} type="button">${man(n)}</button>`).join('')}<button class="chip" data-act="bk-repay" data-v="all" ${S.loan<=0||S.money<S.loan?'disabled':''} type="button">全額</button></div>`;
  }else if(tab==='goal'){
    const left=Math.max(0,END_DAY-S.day+1),done=GOALS.filter(g=>S.goals[g.id]).length;
    h+=`<div class="burstcard gold"><div class="bc-main">伝説のホールを目指せ</div><div class="bc-sub">${S.ended?(S.ended.type==='clear'?'達成！伝説のホールになりました':'期限が過ぎました（このまま続けられます）'):`2029年3月31日までにランク5「伝説のホール」へ（あと${left}日）`}</div></div>`;
    h+=`<div class="sub">目標 ${done}/${GOALS.length} 達成・スコア ${score().toLocaleString('ja-JP')}</div>`;
    h+=GOALS.map(g=>`<div class="goal ${S.goals[g.id]?'done':''}"><span class="ck">${S.goals[g.id]?'✓':''}</span><span>${esc(g.name)}</span><span class="rw">${S.goals[g.id]?dateStr(S.goals[g.id]):'ボーナス'+man(g.reward)}</span></div>`).join('');
    if(S.yearLog.length)h+=`<div class="lbl">年間ランキング</div>`+S.yearLog.map(y=>`<div class="news"><span>${y.year-1}年度</span>${y.place}位</div>`).join('');
  }else{
    const last=S.hist.slice(-14),mx=Math.max(1,...last.map(x=>Math.abs(x.net)));
    h+=`<div class="box"><div class="dot">ランク${rankNo()}「${esc(RANKS[rankIdx()].n)}」</div><div class="sub">来店者の合計 ${S.totalVisitors.toLocaleString('ja-JP')}人${RANKS[rankIdx()+1]?` ・ 次のランクまで${(RANKS[rankIdx()+1].need-S.totalVisitors).toLocaleString('ja-JP')}人`:''}</div></div>`;
    if(S.mod&&S.day<=S.mod.until)h+=`<div class="box">${esc(S.mod.label)}：客足×${S.mod.mult.toFixed(2)}（${dateStr(S.mod.until)}まで）</div>`;
    if(last.length){
      h+=`<div class="lbl">最近の利益</div><div class="chart">${last.map(x=>`<div class="cb"><i class="${x.net>=0?'p':'n'}" style="height:${Math.max(2,Math.round(Math.abs(x.net)/mx*100))}%"></i><span>${dateOf(x.day).getDate()}</span></div>`).join('')}</div>`;
      h+=`<table class="mt">${last.slice().reverse().slice(0,7).map(x=>`<tr><td>${dateStr(x.day)}</td><td>${x.visitors}人</td><td>${Math.round((x.share||0)*100)}%</td><td class="${x.net>=0?'pos':'neg'}">${sgn(x.net)}</td></tr>`).join('')}</table>`;
    }
    if(S.news.length)h+=`<div class="lbl">ニュース</div>`+S.news.slice(0,10).map(n=>`<div class="news ${n.kind}"><span>${dateStr(n.day)}</span>${esc(n.text)}</div>`).join('');
  }
  return ['経営',h];
}
function moveSheet(spec){
  const L=LOCS[spec.loc],sale=Math.round(storeValue()*0.6/10000)*10000;
  const h=`<div class="burstcard"><div class="bc-main">移転しますか？</div><div class="bc-sub">${L.name}・${spec.W}×${spec.H}マス</div></div>
<table class="mt"><tr><td>新しい店</td><td class="neg">-${yen(spec.price)}</td></tr><tr><td>いまの店を売却</td><td class="pos">+${yen(sale)}</td></tr><tr><td><b>差し引き</b></td><td class="${sale-spec.price>=0?'pos':'neg'}"><b>${sgn(sale-spec.price)}</b></td></tr></table>
<div class="box">いまの台${machines().length}台と設備は、すべて倉庫に入ります。新しい店で無料で置き直せます。<br>新しい店は<b>今日からグランドオープン（3日間）</b>。評判は少し下がります。</div>
${S.money+sale-spec.price<0?'<div class="box neg">お金が足りません</div>':''}
<div class="actions"><button class="btn sm" data-act="mg-back" type="button">やめる</button><button class="btn sm primary" data-act="do-move" ${S.money+sale-spec.price<0?'disabled':''} type="button">移転する</button></div>`;
  return ['移転',h];
}

/* ---------- 日報 ---------- */
function reportSheet(R){
  let h='';
  if(R.go){
    const g=R.go;
    h+=`<div class="stampbox"><div class="stamp ${g.score>=0.55?'good':g.score>=0.4?'mid':'bad'}">${g.mark}</div><div><div class="lbl">${g.type==='grand'?'グランドオープン':'リニューアル'} ${g.idx+1}日目の採点</div><div class="big">${Math.round(g.score*100)}点</div><div class="sub">出し具合${Math.round(g.dash*100)}%・満足度${Math.round(g.satN*100)}%</div></div></div>`;
    if(g.final){const f=g.final;h+=`<div class="stampbox final"><div class="stamp big ${f.cls}">${f.judge}</div><div><div class="lbl">オープン期間の結果</div><div class="big">${Math.round(f.score*100)}点</div><div class="sub">信用${f.trust>=0?'+':''}${f.trust}・評判${f.rep>=0?'+':''}${f.rep}${f.mod?`<br>${esc(f.mod.label)}：${dateStr(f.mod.until)}まで客足×${f.mod.mult.toFixed(2)}`:''}</div></div></div>`}
  }
  if(R.ev){h+=`<div class="stampbox"><div class="stamp ${R.ev.cls}">${R.ev.judge}</div><div><div class="lbl">${esc(R.ev.label)}</div><div class="sub">対象${R.ev.n}台・出し具合${Math.round(R.ev.avg*100)}%</div><div>信用 ${R.trust0} → ${R.trust1}</div></div></div>`}
  h+=`<div class="kpis"><div><b>${R.visitors}</b><span>来店</span></div><div><b class="${R.full?'neg':''}">${R.full}</b><span>満席で帰った</span></div><div><b>${Math.round(R.share*100)}%</b><span>町のシェア</span></div></div>`;
  h+=`<div class="segs">${SEGS.filter(s=>R.seg[s]).map(s=>`<span>${SEG_NAME[s]} ${R.seg[s]}人</span>`).join('')}</div>`;
  h+=`<table class="mt money"><tr><td>貸し玉・メダルの売上</td><td>${yen(R.coin)}</td></tr><tr><td>払い出し（客の勝ち分）</td><td class="neg">-${yen(R.out)}</td></tr>${R.exch?`<tr><td>スロットの交換差益（5.6枚交換）</td><td>${yen(R.exch)}</td></tr>`:''}<tr><td>自販機</td><td>${yen(R.drink)}</td></tr><tr><td>家賃</td><td class="neg">-${yen(R.rent)}</td></tr><tr><td>店員の給料</td><td class="neg">-${yen(R.wages)}</td></tr><tr><td>電気代</td><td class="neg">-${yen(R.power)}</td></tr>${R.ad?`<tr><td>告知・取材費</td><td class="neg">-${yen(R.ad)}</td></tr>`:''}${R.repairs?`<tr><td>夜間の修理費（${R.repairs/15000}台）</td><td class="neg">-${yen(R.repairs)}</td></tr>`:''}${R.interest?`<tr><td>借入の利息</td><td class="neg">-${yen(R.interest)}</td></tr>`:''}${R.goto?`<tr><td>ゴト被害</td><td class="neg">-${yen(R.goto)}</td></tr>`:''}<tr class="total"><td>今日の利益</td><td class="${R.net>=0?'pos':'neg'}">${sgn(R.net)}</td></tr></table>`;
  const dr=R.rep1-R.rep0,fl=R.feel>=1?['よく出る店','pos']:R.feel<=-1?['出ない店','neg']:['ふつう',''];
  h+=`<div class="box">出玉率 <b>${Math.round(R.payR*100)}%</b>　お客さんの体感：<b class="${fl[1]}">${fl[0]}</b></div>`;
  h+=`<div class="box">評判 <b>${Math.round(R.rep0)} → ${Math.round(R.rep1)}</b> <span class="${dr>=0?'pos':'neg'}">(${dr>=0?'+':''}${dr.toFixed(1)})</span>　信用 <b>${R.trust1}</b>　資金 <b class="${R.money<0?'neg':''}">${yen(R.money)}</b></div>`;
  if(R.money<0)h+=`<div class="box neg">資金がマイナスです。7日続くと倒産します。台や設備を売るか、設定を見直しましょう。</div>`;
  if(R.best&&R.best.yest){const g=m=>m.yest.out-m.yest.coin,lv=m=>kindOf(m)==='s'?`設定${m.set}`:`釘${NAIL_SHORT[m.nail+2]}`;h+=`<div class="box stats"><span>いちばん出た台：<b>${R.best.no}番</b>（${lv(R.best)}・客${sgn(g(R.best))}）</span><span>いちばん吸った台：<b>${R.worst.no}番</b>（${lv(R.worst)}・客${sgn(g(R.worst))}）</span></div>`}
  if(R.regVoices.length)h+=`<div class="lbl">常連さんの声</div>`+R.regVoices.map(v=>`<div class="voice ${v.good?'':'bad'}"><b>${esc(v.name)}</b>「${esc(v.say)}」</div>`).join('');
  if(R.voices.length)h+=`<div class="lbl">お客さんの声</div>`+R.voices.map(v=>`<div class="voice ${v.good?'':'bad'}">${esc(WHY[v.k].t)}<span class="cnt">${v.n}人</span></div>`).join('');
  if(R.rivalNews.length)h+=`<div class="sub">今日は${R.rivalNews.map(esc).join('・')}もイベントでした</div>`;
  if(R.brokenN)h+=`<div class="sub">今日は${R.brokenN}台が故障しました。ホール係が多いと早く直せます</div>`;
  if(R.completes&&R.completes.length)h+=`<div class="box neg">コンプリート ${R.completes.length}台：${R.completes.map(c=>`${c.no}番（${esc(shortName(MB[c.id].name))}）`).join('・')}<br><span class="sub">差玉の上限（パチンコ${COMPLETE.p.toLocaleString('ja-JP')}発・スロット${COMPLETE.s.toLocaleString('ja-JP')}枚）まで出て、その日は打ち止めになりました</span></div>`;
  if(R.gotoCaught)h+=`<div class="box">ゴト師を${R.gotoCaught}人捕まえました！</div>`;
  if(R.gotoEsc)h+=`<div class="box neg">ゴト師に逃げられ、${yen(R.gotoEsc)}の被害。防犯カメラを付けると見つけやすくなります</div>`;
  if(R.goals&&R.goals.length)h+=R.goals.map(g=>`<div class="rankup">目標達成「${esc(g.name)}」<br><span>ボーナス ${man(g.reward)}</span></div>`).join('');
  if(R.year)h+=`<div class="box col"><div class="lbl">${R.year.year-1}年度 年間ランキング</div>${R.year.rows.map((r,i)=>`<div>${i+1}位 ${r.me?'<b>':''}${esc(r.name)}${r.me?'</b>':''}（シェア${Math.round(r.share*100)}%）</div>`).join('')}${R.year.bonus?`<div class="pos">賞金 ${man(R.year.bonus)}</div>`:''}</div>`;
  if(R.morning&&R.morning.length)h+=R.morning.map(m=>`<div class="box neg">${esc(m.title)}：${esc(m.sub)}</div>`).join('');
  if(R.rankUp)h+=`<div class="rankup">ランクアップ！ ランク${R.rankNo}「${esc(R.rankUp)}」<br><span>新しい台・設備・物件が解放されました</span></div>`;
  const t=R.tomorrow;
  h+=`<div class="box tmr"><b>明日 ${dateLong(R.day+1)}</b>　${WEATHER[t.weather].name}${t.info.tags.length?'・'+t.info.tags.join('・'):''}${t.go?'・オープン期間':''}${t.rivals.length?`<br><span class="neg">${t.rivals.map(esc).join('・')}がイベント予定</span>`:''}</div>`;
  h+=`<div class="actions"><button class="btn sm wide2" data-act="open-hall" type="button">ホールデータ（出玉ランキング・稼働率）</button></div>`;
  h+=`<button class="btn primary" data-act="close" type="button">明日の準備へ</button>`;
  return [`${R.date}の日報`,h];
}
function onDayClosed(R){
  closeSheet();tool='view';moveSel=null;releaseWake();
  sfx('close');playBgm('prep');refreshAll();openSheet('report',R);
  setTimeout(()=>{
    if(R.go&&R.go.final){R.go.final.cls==='bad'?(sfx('gagan'),telop(R.go.final.judge,'オープン期間の評価','bad')):(sfx('fanfare'),telop(R.go.final.judge,'オープン期間の評価','good'))}
    else if(R.ev){R.ev.cls==='bad'?sfx('gagan'):sfx('stamp')}
    else if(R.go)sfx('stamp');
    if(R.rankUp){setTimeout(()=>{sfx('fanfare');telop('ランクアップ！',R.rankUp,'good')},R.go&&R.go.final?2000:300)}
    if(R.rivalClosed){setTimeout(()=>telop('ライバル閉店！',R.rivalClosed+'が閉店しました','good'),R.rankUp?4200:2200)}
  },350);
  applyLayout();
  pendingEnding=R.ending||null;pendingMorning=R.morning||[];
}
let pendingEnding=null,pendingMorning=[];
function endSheet(type){
  const clear=type==='clear';
  return [clear?'エンディング':'3年が過ぎました',`<div class="burstcard ${clear?'gold':''}"><div class="bc-main">${clear?'伝説のホール誕生！':'営業3年の結果'}</div><div class="bc-sub">${esc(S.name)}・${dateLong(S.day-1)}</div></div>
<div class="kpis"><div><b>${S.totalVisitors.toLocaleString('ja-JP')}</b><span>来店者の合計</span></div><div><b>${machines().length}</b><span>台数</span></div><div><b>${score().toLocaleString('ja-JP')}</b><span>スコア</span></div></div>
<div class="box">${clear?`開業から${S.day-1}日で、町いちばんどころか伝説のホールになりました。おめでとうございます！`:`ランク${rankNo()}「${esc(RANKS[rankIdx()].n)}」まで来ました。`}<br>目標は${GOALS.filter(g=>S.goals[g.id]).length}/${GOALS.length}達成。このまま営業を続けることもできます。</div>
<button class="btn primary" data-act="close" type="button">このまま営業を続ける</button>`];
}
function afterReport(){
  if((S.negDays||0)>=7){openSheet('over');return}
  if(pendingEnding){const t=pendingEnding;pendingEnding=null;openSheet('end',t);sfx('fanfare');telop(t==='clear'?'伝説達成！':'3年経過','','good');return}
  if(pendingMorning.length){const m=pendingMorning.shift();setTimeout(()=>{telop(m.title,m.sub,'bad');sfx('gagan')},200)}
  if(goActive()&&goDayIdx()===0)setTimeout(()=>telop(S.go.type==='grand'?'グランドオープン準備':'リニューアル準備','今日からオープン期間！','good'),200);
}
function overSheet(){
  return ['倒産…',`<div class="burstcard bad"><div class="bc-main">倒産</div><div class="bc-sub">資金のマイナスが7日続きました</div></div><div class="box">${esc(S.name)}は${S.day-1}日間営業しました。来店者の合計は${S.totalVisitors.toLocaleString('ja-JP')}人でした。</div><button class="btn primary" data-act="restart" type="button">新しいお店で最初から</button>`];
}

/* ---------- 遊び方 ---------- */
const GUIDE={
  start:['はじめに',`<p>あなたはパチンコ屋の店長です。台の<b>釘と設定</b>、<b>イベント</b>、<b>店づくり</b>でお客さんを集め、ライバル店に勝って大きな店にしていきましょう。</p>
<h3>1日の流れ</h3><ol><li><b>準備中</b>：釘・設定・配置・イベントを決めます。台をいじれるのは閉店中だけです。</li><li><b>営業中</b>：10:00〜22:45。速さは×1〜×4、「停止」で一時停止できます。</li><li><b>日報</b>：売上・評判・イベントの結果・お客さんの声が出ます。</li></ol>
<h3>画面の操作</h3><ul><li>店内は指でドラッグして移動、2本指か右下の＋−で拡大縮小できます。</li><li>台や設備をタップすると詳しい情報が見られます。</li><li>右上の「表示」で、台の上に出す情報（設定・番号・レート）を切り替えられます。</li></ul>
<h3>最初の3日間はグランドオープン</h3><p>入りきらないほどお客さんが来ますが、評価がとても厳しい期間です。ここで出さないと信用がガタ落ちします。</p>`],
  lv:['釘と設定',`<p><b>スロットは設定1〜6</b>、<b>パチンコは釘（締め〜開け）</b>で出し具合を決めます。</p>
<table class="gt"><tr><th>スロット</th><th>店の取り分</th><th>パチンコ</th><th>店の取り分</th></tr>
<tr><td><span class="badge c1">1</span></td><td>＋12%</td><td><span class="badge n0">締め</span></td><td>＋14%</td></tr>
<tr><td><span class="badge c2">2</span></td><td>＋8%</td><td><span class="badge n1">やや締め</span></td><td>＋10%</td></tr>
<tr><td><span class="badge c3">3</span></td><td>＋5%</td><td><span class="badge n2">標準</span></td><td>＋6%</td></tr>
<tr><td><span class="badge c4">4</span></td><td>＋1%</td><td><span class="badge n3">やや開け</span></td><td>＋1%</td></tr>
<tr><td><span class="badge c5">5</span></td><td>−4%</td><td><span class="badge n4">開け</span></td><td>−5%</td></tr>
<tr><td><span class="badge c6">6</span></td><td>−10%</td><td></td><td></td></tr></table>
<ul><li><b>釘はお客さんに見えます。</b>締めた台はすぐ見切られ、開けた台にはパチプロが集まります。</li><li><b>設定は見えません。</b>スロット客はイベントや前日の出方で台を選びます。</li><li><b>レート</b>：4円/1円パチ、20円/5円スロ。低レートは売上が1/4ですが、年配や学生のお客さんが来てくれます。</li><li>同じ島にパチンコとスロットを混ぜると、音がうるさいと不満が出ます。</li></ul>`],
  ev:['イベント',`<ul><li><b>島の全台系</b>：その島の全台を出すという約束。</li><li><b>末尾の日</b>：台番号の最後の数字が同じ台を出す約束。台番号は4と9を飛ばして自動で振られます。</li><li><b>機種イベント</b>：その機種の全台を出す約束。</li><li><b>新台入替</b>：新しい台を3台以上入れると打てます。</li><li><b>リニューアルオープン</b>：改装に100万円以上使い、前のオープンから21日たつと打てます。</li></ul>
<h3>判定</h3><p>対象台の出し具合が80%以上で「激アツ」、40%未満で「ガセ」。信用が上下します。信用が高いほど、イベントの日に朝から行列ができます。</p>
<h3>オープン期間の判定</h3><p>グランドオープン（3日）とリニューアル（2日）は、全台の出し具合と満足度で毎日採点されます。期間の平均が悪いと、信用と評判が大きく下がり、しばらく客付きが悪くなります。</p>
<h3>客足の波</h3><p>土日・祝日・ゴールデンウィーク・お盆・年末年始は客が多く、年金支給日（偶数月15日）は1円パチの年配客、給料日（25日）は高レートの客が増えます。雨の日は少し増えますが、床が汚れやすくなります。</p>`],
  shop:['店づくり',`<ul><li><b>島</b>：くっついて並んだ台のかたまり。自動でA島・B島…と名前がつきます。</li><li>台は上下左右どの向きにも置けます。置くときは下の矢印で向きを選び、置いたあとも台をタップ→「台の向き」で変えられます。「島ごと回す」で島をまるごと縦や横に回せます。通路がふさがる置き方はできません。</li><li><b>トイレと喫煙室は壁に付きます</b>。マスを使わず、お客さんは扉から出入りします。</li><li><b>たばこゾーン</b>：床を「喫煙OK」に塗れます。たばこを吸う客は喫煙OK席を喜び、吸わない客は嫌がります。喫煙OKの隣の禁煙席は「煙が流れてくる」と不満になります。空気清浄機で防げます。</li><li>禁煙席のたばこ客は、途中で喫煙所（ブース・喫煙室・喫煙OKの通路）へ吸いに行きます。どこにもないと不満です。</li><li>内装の★が多いほど満足度と客足が上がります。</li><li>「片付け」で売るか倉庫にしまえます。倉庫の物は無料で置き直せます。</li></ul>`],
  people:['店員と常連',`<ul><li><b>ホール係</b>：呼び出しランプに対応します。台12台につき1人が目安。足りないとお客さんが待たされて不満になります。</li><li><b>カウンター係</b>：景品カウンター1つに1人必要。いないと勝ったお客さんが交換できません。</li><li><b>清掃係</b>：床のゴミを片付けます。汚い店は満足度が下がります。</li><li>店員は「速さ」と「接客」が高いほど優秀です。研修でレベルを上げられます。</li></ul>
<h3>名物常連客</h3><p>頭に★がついているのは名前つきの常連さんです。好きなことと苦手なことがあり、満足するほど通ってくれます。不満が続くと来なくなります。</p>`],
  biz:['物件とライバル',`<ul><li>町には<b>ライバル店</b>があり、お客さんを取り合っています。評判・台数・イベントでシェアが決まります。</li><li>ライバル店がイベントの日は、お客さんを取られやすくなります。</li><li>シェアを奪われ続けたライバル店は閉店し、<b>居抜き物件</b>として売りに出ることがあります。</li><li><b>物件</b>：今の店を広げるほか、居抜き物件や、更地に新築（マス数で値段が決まる）で移転できます。新築には設備のプレゼントがつきます。</li><li>移転すると今の店は売却され、台と設備は倉庫に入ります。新しい店はグランドオープンから。</li><li>毎日の経費は家賃・店員の給料・電気代です。資金のマイナスが7日続くと倒産します。</li><li><b>銀行</b>（経営 → 銀行）でお金を借りられます。利息は毎日かかります。</li></ul>`],
  kishu:['機種と出玉',`<h3>パチンコ</h3><p>機種ごとに<b>初当り確率</b>（1/99.9・1/199・1/319・1/349・1/399・1/599）が決まっています。確率が重いほど当たるまで時間がかかりますが、1回の当りが大きく、RUSHの連チャンで一撃数万発になることもあります。<b>釘</b>は回りやすさ（＝お店の出し具合）を決めます。</p>
<h3>スロット</h3><p>機種ごとに設定1〜6の<b>出玉率（機械割）</b>が決まっています（最大114.9%）。ジャグラーのようなAタイプは波がおだやか、AT機は一撃が荒い台です。スロットは<b>5.6枚交換</b>なので、出玉率が100%でもお店に1割ほど交換差益が残ります。</p>
<h3>コンプリート</h3><p>1台の1日の差玉が<b>パチンコ${COMPLETE.p.toLocaleString('ja-JP')}発・スロット${COMPLETE.s.toLocaleString('ja-JP')}枚</b>に届くと、その台はその日は打ち止めになります（台に「完」が出ます）。</p>
<h3>ホールデータ</h3><p>営業中の「データ」、設定一覧、日報から見られます。<b>出玉ランキング</b>・<b>台番号別の稼働率</b>・<b>機種別の稼働率</b>・<b>客層と時間ごとの稼働</b>で、どんなお客さんがどの台を打っているかがわかります。稼働の低い機種は入れ替え候補です。</p>
<h3>機種データベース</h3><p>メニューの「機種データベース」で、機種の名前・出玉率・初当り確率を変えられます。変えた内容はこの端末に保存されます。</p>`],
  more:['規制・取材・トラブル',`<h3>規制</h3><p>ときどき国の規制が発表され、対象の機種は期限までに撤去されます（期限を過ぎると自動で撤去・下取りなし）。代わりに「新基準」の新しい機種が買えるようになります。</p>
<h3>取材イベント</h3><p>雑誌や人気配信者に取材してもらうと、たくさんのお客さんが来ます。お店全体の出し具合が見られ、良ければ大きく信用が上がり、悪ければ大きく下がります。</p>
<h3>データ公開機</h3><p>台の成績を公開すると設定狙いの客が増え、出し方の評判が大きく動きます。</p>
<h3>台の故障</h3><p>古い台ほど故障しやすく、ホール係が直します。閉店までに直らなかった台は夜間に修理費がかかります。</p>
<h3>ゴト師</h3><p>不正な道具で玉を抜く客です。サングラスが目印。壁に付ける防犯カメラと、近くを見回るホール係が見つけます。</p>
<h3>目標とエンディング</h3><p>経営 → 目標 で、達成するとボーナスがもらえる目標が見られます。2029年3月31日までにランク5「伝説のホール」になればエンディング。毎年3月31日には年間ランキングも発表されます。</p>`],
};
function guideSheet(tab){
  tab=tab||'start';
  return ['遊び方',tabs(Object.entries(GUIDE).map(([k,v])=>[k,v[0]]),tab,'g-tab')+`<div class="guide">${GUIDE[tab][1]}</div><button class="btn primary" data-act="close" type="button">わかった</button>`];
}
const specLine=x=>x.k==='p'?`1/${x.prob}・${specOf(x)}`:`${x.spec}・出玉率${x.rates[0].toFixed(1)}〜${x.rates[5].toFixed(1)}%`;
const pctS=v=>Math.round(clamp(v,0,1)*100)+'%';
const hbar=(v,cls='')=>`<span class="hb ${cls}"><i style="width:${Math.round(clamp(v,0,1)*100)}%"></i></span>`;
const fmtD=(d,k)=>`${d>=0?'+':''}${d.toLocaleString('ja-JP')}${unitName(k)}`;

/* ---------- ホールデータ（出玉ランキング・台番号別／機種別の稼働率・客層） ---------- */
function hallSrc(){
  const open=S.phase==='open';
  return {open,get:m=>open?m.today:m.yest,span:open?Math.max(1,Math.min(clock,LAST)-OPEN):LAST-OPEN,
    label:open?'今日（営業中・いまの時点）':S.lastDay?`昨日（${dateStr(S.lastDay.day)}）`:'昨日',
    day:open?{seg:D.seg,visitors:D.visitors,hunters:D.hunters,elders:D.elders,smokers:D.smokers,hourly:D.hourly}:S.lastDay};
}
function hallModels(src,ms){
  const g=new Map();
  for(const m of ms){const t=src.get(m),k=m.type+'|'+m.rate;let e=g.get(k);if(!e){e={md:MB[m.type],m,n:0,mins:0,d:0,hits:0,done:0};g.set(k,e)}
    e.n++;e.mins+=t.mins;e.d+=diffUnits(m,t);e.hits+=t.hits;if(t.done)e.done++}
  return [...g.values()].map(e=>Object.assign(e,{util:e.mins/(e.n*src.span)})).sort((a,b)=>b.util-a.util);
}
function hallSheet(tab){
  tab=tab||'rank';
  const src=hallSrc(),ms=machines().filter(m=>src.get(m));
  let h=tabs([['rank','出玉ランキング'],['no','台番号別'],['model','機種別'],['cust','客層と時間']],tab,'hall-tab');
  h+=`<div class="sub">${src.label}のデータ</div>`;
  if(!ms.length){h+=`<div class="box">まだデータがありません。営業するとたまります。</div>`;return ['ホールデータ',h]}
  if(tab==='rank'){
    for(const k of ['s','p']){
      const list=ms.filter(m=>kindOf(m)===k).map(m=>({m,t:src.get(m),d:diffUnits(m,src.get(m))})).sort((a,b)=>b.d-a.d);
      if(!list.length)continue;
      h+=`<div class="isl-h">${KIND_NAME[k]}の差${k==='s'?'枚':'玉'}ランキング</div>`;
      h+=list.map((x,i)=>`<div class="lrow"><div class="l1"><span class="rk ${i<3?'top':''}">${i+1}</span><span class="no">${x.m.no}</span><span class="nm">${esc(MB[x.m.type].name)}</span><span class="dv ${x.d>=0?'pos':'neg'}">${fmtD(x.d,k)}</span></div><div class="sub">${rateLabel(x.m)}・${Math.round(x.t.g||0).toLocaleString('ja-JP')}${k==='s'?'G':'回転'}・大当り${x.t.hits}回・稼働${pctS(x.t.mins/src.span)}${x.t.done?'・<b class="pos">コンプリート</b>':''}</div></div>`).join('');
    }
  }else if(tab==='no'){
    const list=[...ms].sort((a,b)=>a.no-b.no),avg=avgOf(list.map(m=>src.get(m).mins/src.span));
    h+=`<div class="box stats"><span>全体の稼働率 <b>${pctS(avg)}</b></span><span>パチンコ <b>${pctS(avgOf(list.filter(m=>kindOf(m)==='p').map(m=>src.get(m).mins/src.span))||0)}</b></span><span>スロット <b>${pctS(avgOf(list.filter(m=>kindOf(m)==='s').map(m=>src.get(m).mins/src.span))||0)}</b></span></div>`;
    h+=list.map(m=>{const t=src.get(m),u=t.mins/src.span,d=diffUnits(m,t),k=kindOf(m);return `<div class="hrow"><span class="no">${m.no}</span><span class="nm">${esc(shortName(MB[m.type].name))}<small>${rateLabel(m)}・${k==='s'?`設定${m.set}`:`釘${NAIL_SHORT[m.nail+2]}`}</small></span>${hbar(u,u<0.25?'low':u>=0.7?'high':'')}<span class="pc">${pctS(u)}</span><span class="dv ${d>=0?'pos':'neg'}">${fmtD(d,k)}</span></div>`}).join('');
  }else if(tab==='model'){
    const list=hallModels(src,ms);
    h+=`<div class="sub">稼働率の高い順。同じ機種でもレートが違えば別に数えます</div>`;
    h+=list.map(e=>`<div class="lrow"><div class="l1"><span class="nm">${esc(e.md.name)}</span><span class="rs sub">${rateLabel(e.m)}・${e.n}台</span></div><div class="hrow in">${hbar(e.util,e.util<0.25?'low':e.util>=0.7?'high':'')}<span class="pc">${pctS(e.util)}</span><span class="dv ${e.d>=0?'pos':'neg'}">合計${fmtD(e.d,e.md.k)}</span></div><div class="sub">1台平均${fmtD(Math.round(e.d/e.n),e.md.k)}・大当り${e.hits}回${e.done?`・コンプリート${e.done}台`:''}・${specLine(e.md)}</div></div>`).join('');
  }else{
    const dy=src.day;
    if(!dy||!dy.visitors){h+=`<div class="box">お客さんのデータがまだありません。</div>`;return ['ホールデータ',h]}
    const ml=hallModels(src,ms),best=ml[0],worst=ml[ml.length-1];
    const segs=SEGS.filter(s=>dy.seg[s]).sort((a,b)=>dy.seg[b]-dy.seg[a]);
    const hr=dy.hourly||[],nP=ms.filter(m=>kindOf(m)==='p').length,nS=ms.filter(m=>kindOf(m)==='s').length,nAll=nP+nS;
    const peak=hr.length?hr.reduce((a,b)=>(b.p+b.s>a.p+a.s?b:a)):null;
    h+=`<div class="box col"><div class="lbl">${src.open?"今日":"この日"}の傾向</div>`
      +(best?`<div>いちばん人気：<b>${esc(shortName(best.md.name))}</b>（${rateLabel(best.m)}・稼働${pctS(best.util)}）</div>`:'')
      +(worst&&worst!==best?`<div>いちばん空いていた：<b>${esc(shortName(worst.md.name))}</b>（${rateLabel(worst.m)}・稼働${pctS(worst.util)}）${worst.util<0.25?'<span class="neg"> 入れ替え候補</span>':''}</div>`:'')
      +(segs.length?`<div>多かった客層：<b>${SEG_NAME[segs[0]]}</b>（${pctS(dy.seg[segs[0]]/dy.visitors)}）</div>`:'')
      +(peak&&nAll?`<div>いちばん混んだ時間：<b>${peak.h}時台</b>（${peak.p+peak.s}人が遊技）</div>`:'')+`</div>`;
    h+=`<div class="lbl">客層（来店${dy.visitors}人）</div>`+segs.map(s=>`<div class="hrow"><span class="nm">${SEG_NAME[s]}</span>${hbar(dy.seg[s]/dy.visitors)}<span class="pc">${dy.seg[s]}人</span></div>`).join('');
    h+=`<div class="box stats"><span>設定・釘狙い <b>${pctS(dy.hunters/dy.visitors)}</b></span><span>年配の客 <b>${pctS((dy.elders||0)/dy.visitors)}</b></span><span>たばこを吸う客 <b>${pctS((dy.smokers||0)/dy.visitors)}</b></span></div>`;
    if(hr.length){
      h+=`<div class="lbl">時間ごとの稼働（毎時30分の時点）</div>`;
      h+=hr.map(x=>`<div class="hrow"><span class="nm">${x.h}時台</span>${hbar(nAll?(x.p+x.s)/nAll:0)}<span class="pc">${nAll?pctS((x.p+x.s)/nAll):'-'}</span><span class="dv sub">パ${x.p}・ス${x.s}</span></div>`).join('');
    }
  }
  h+=`<div class="actions"><button class="btn sm" data-act="open-list" type="button">${S.phase==='prep'?'設定一覧へ':'台データへ'}</button></div>`;
  return ['ホールデータ',h];
}

/* ---------- 機種データベースの画面 ---------- */
function probInfo(p){
  const P=probShape(p),balls=Math.round(400*NAIL_R[2]*p/P_SPM/4/10)*10,star={99.9:1,199:2,319:3,349:3,399:4,599:5}[p]||3;
  return `<div class="box col"><div><b>1/${p}（${PROB_SPEC[p]}）</b>　一撃 ${'★'.repeat(star)}${'☆'.repeat(5-star)}</div><div class="sub">初当り1回の平均 約${balls.toLocaleString('ja-JP')}発（RUSH込み・標準の釘）／RUSH突入${Math.round(P.e*100)}%・継続${Math.round(P.q*100)}%${P.lt?`・まれに上位RUSH（継続${Math.round(P.ltq*100)}%）`:''}<br>${SPEC_INFO[PROB_SPEC[p]]}</div></div>`;
}
function mdbSheet(d){
  d=d||{tab:'s'};const prep=S.phase==='prep';
  if(d.id){
    const md=MB[d.id],def=MDB_DEF[d.id],dis=prep?'':'disabled',nm=d.name??md.name;
    let h=`<div class="mp-head"><span class="sw big" style="background:${md.c}"></span><div class="mp-t"><div class="mp-name">${esc(md.name)}</div><div class="tags"><span class="tag k${md.k}">${KIND_NAME[md.k]}</span><span class="tag">${specOf(md)}</span>${mdbEdits[md.id]?'<span class="tag new">変更あり</span>':''}</div></div></div>`;
    h+=`<label class="lbl" for="mdbName">名前（30文字まで）</label><input class="field" id="mdbName" maxlength="30" value="${esc(nm)}" ${dis}>`;
    if(nm!==def.name)h+=`<div class="sub">元の名前：${esc(def.name)}</div>`;
    if(md.k==='s'){
      h+=`<div class="lbl">設定ごとの出玉率（機械割％・${SLOT_MIN}〜${SLOT_MAX}）</div><div class="rgrid">${md.rates.map((v,i)=>{const f=(md.none||[]).includes(i+1)?'<em>実機なし</em>':(md.est||[]).includes(i+1)?'<em>推定</em>':'';return `<label class="rcell c${i+1}"><span>設定${i+1}${f}</span><input class="field" id="mdbR${i}" type="number" inputmode="decimal" step="0.1" min="${SLOT_MIN}" max="${SLOT_MAX}" value="${(d.rates?d.rates[i]:v).toFixed(1)}" ${dis}></label>`}).join('')}</div>`;
      h+=`<div class="sub">初当り 1/${md.hit[0]}（設定1）〜1/${md.hit[1]}（設定6）・${VOL_NAME[md.vol]}<br>元の値：${def.rates.map(v=>v.toFixed(1)).join(' / ')}</div>`;
    }else{
      const cur=d.prob??md.prob;
      h+=`<div class="lbl">初当り確率（重いほど1回の当りが大きく、一撃が荒くなる）</div><div class="chips">${PROBS.map(p=>`<button class="chip ${cur===p?'cur':''}" data-act="mdb-prob" data-v="${p}" ${dis} type="button">1/${p}</button>`).join('')}</div>`+probInfo(cur);
      if(cur!==def.prob)h+=`<div class="sub">元の確率：1/${def.prob}</div>`;
    }
    if(md.real)h+=`<div class="sub">実機のデータ：${esc(md.real)}</div>`;
    h+=prep?`<div class="actions"><button class="btn sm" data-act="mdb-back" type="button">もどる</button><button class="btn sm" data-act="mdb-reset1" type="button">最初の値に戻す</button><button class="btn sm primary wide2" data-act="mdb-save" type="button">保存</button></div>`
      :`<div class="box">営業中は見るだけです。閉店後に変えられます。</div><button class="btn sm" data-act="mdb-back" type="button">もどる</button>`;
    return ['機種データベース',h];
  }
  let h=tabs([['s','スロット'],['p','パチンコ']],d.tab,'mdb-tab');
  h+=`<div class="box">機種の<b>名前</b>・<b>出玉率</b>（スロット）・<b>初当り確率</b>（パチンコ）を変えられます。変えた内容はこの端末に保存され、どのお店でも使われます。</div>`;
  h+=MODELS.filter(x=>x.k===d.tab).sort(byRankPrice).map(x=>`<div class="item"><span class="sw" style="background:${x.c}"></span><div class="it"><div class="nm">${esc(x.name)}${mdbEdits[x.id]?' <span class="tag new">変更あり</span>':''}</div><div class="ds">${specLine(x)}・ランク${x.rank}</div></div><button class="btn sm" data-act="mdb-edit" data-id="${x.id}" type="button">${prep?'編集':'見る'}</button></div>`).join('');
  const n=Object.keys(mdbEdits).length;
  h+=`<div class="sub">変更した機種：${n}</div><div class="actions"><button class="btn sm wide2" data-act="mdb-export" type="button" ${n?'':'disabled'}>変更を書き出す（コピー）</button>${d.confirm?`<button class="btn sm" data-act="mdb-resetall-no" type="button">やめる</button><button class="btn sm danger" data-act="mdb-resetall-yes" type="button">本当に全部戻す</button>`:`<button class="btn sm danger" data-act="mdb-resetall" type="button" ${n&&prep?'':'disabled'}>すべて最初に戻す</button>`}</div><textarea class="field" id="mdbOut" rows="3" hidden style="font-family:var(--f-body);font-size:11px;resize:none" readonly></textarea>`;
  return ['機種データベース',h];
}
function showTrErr(msg){let e=$('#trErr');if(!e){e=document.createElement('div');e.id='trErr';e.className='box neg';const btn=$('[data-act="tr-load"]');btn&&btn.after(e)}e.textContent=msg;toast(msg)}
/* セーブの引っ越しのテキストを読む。余計な文字・改行・前後の文が混ざっていても読めるようにする */
function parseTransfer(text){
  let t=String(text).replace(/[​-‍﻿\r\n\t]/g,'').replace(/[“”„‟″]/g,'"').trim();
  if(!t)return {err:'テキストが空です。コピーしたセーブを貼り付けてください'};
  const at=t.search(/PHJ[12]:|PKDB1:/);
  if(at<0&&t[0]!=='{')return {err:'セーブのテキストではないようです（「PHJ2:」で始まる文を貼り付けてください）'};
  if(at>0)t=t.slice(at);
  const cut=t.lastIndexOf('}');if(cut>0)t=t.slice(0,cut+1);
  const broken={err:`テキストが途中で切れているようです（${t.length.toLocaleString('ja-JP')}文字）。最後まで全部コピーして貼り付けてください`};
  try{
    if(t.startsWith('PKDB1:'))return {kind:'mdb',mdb:JSON.parse(t.slice(6))};
    if(t.startsWith('PHJ2:')){const o=JSON.parse(t.slice(5));if(!o||typeof o.save!=='string')return broken;JSON.parse(o.save);return {kind:'save',save:o.save,mdb:o.mdb||null}}
    const body=t.startsWith('PHJ1:')?t.slice(5):t;JSON.parse(body);return {kind:'save',save:body,mdb:null};
  }catch(e){return broken}
}
function transferSheet(){
  const intro=sheetData==='title'?'別の場所（アーティファクト版など）で遊んでいたお店を、ここで続きから遊べます。<br>移す元のメニュー →「セーブの引っ越し」→「セーブをコピー」で写したテキストを、下の欄に貼り付けて「読み込む」を押してください。'
    :'アーティファクト版とホーム画面アプリ版は、セーブが別々に保存されます。進み具合を移すには：<br>① 移す元のメニューで「セーブをコピー」<br>② 移す先のメニュー →「セーブの引っ越し」で下の欄に貼り付けて「読み込む」';
  return ['セーブの引っ越し',`<div class="box">${intro}</div>
${sheetData==='title'?'':'<button class="btn" data-act="tr-copy" type="button">セーブをコピー</button>'}
<label class="lbl" for="trText">ここに貼り付け</label>
<textarea class="field" id="trText" rows="4" style="font-family:var(--f-body);font-size:12px;resize:none"></textarea>
<button class="btn primary" data-act="tr-load" type="button">読み込む（今のセーブは上書きされます）</button>`];
}
function menuSheet(confirm){
  let h=`<div class="actions"><button class="btn sm" data-act="menu-guide" type="button">遊び方</button><button class="btn sm" data-act="menu-bgm" type="button">BGM ${prefs.bgm?'ON':'OFF'}</button><button class="btn sm" data-act="menu-sfx" type="button">効果音 ${prefs.sfx?'ON':'OFF'}</button><button class="btn sm" data-act="menu-manage" type="button">経営の記録</button><button class="btn sm" data-act="menu-tweet" type="button">つぶやき ${prefs.tweets?'ON':'OFF'}</button><button class="btn sm wide2" data-act="menu-mdb" type="button">機種データベース（名前・出玉率・確率）</button><button class="btn sm wide2" data-act="menu-transfer" type="button">セーブの引っ越し（${window.APP_MODE?'コピー・読み込み':'アプリ版へ移す'}）</button></div>`;
  h+=`<div class="lbl">画面の向き（縦持ちのとき）</div><div class="chips">${[['auto','横画面にする'],['flip','横画面（反対向き）'],['off','縦のまま']].map(([k,l])=>`<button class="chip ${prefs.rot===k?'cur':''}" data-act="menu-rot" data-v="${k}" type="button">${l}</button>`).join('')}</div>`;
  h+=`<label class="lbl" for="mName">お店の名前</label><div class="inrow"><input class="field" id="mName" maxlength="10" value="${esc(S.name)}"><button class="btn sm" data-act="menu-rename" type="button">変更</button></div>`;
  h+=confirm?`<div class="box">本当にデータを消して最初からやり直しますか？元には戻せません。</div><div class="actions"><button class="btn sm" data-act="menu-reset-no" type="button">やめる</button><button class="btn sm danger" data-act="restart" type="button">消してやり直す</button></div>`:`<button class="btn danger" data-act="menu-reset" type="button">データを消して最初から</button>`;
  return ['メニュー',h];
}

/* ---------- シートのボタン ---------- */
$('#sheetBody').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;audio();
  const a=b.dataset.act,v=b.dataset.v,id=b.dataset.id;
  const findStaff=x=>S.staff.find(s=>s.id===Number(x));
  switch(a){
    case 'close':closeSheet();refreshAll();break;
    case 'shop-tab':sheetData=v;renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'buy':startBuild(b.dataset.k,id,false);break;
    case 'store-place':startBuild(b.dataset.k,id,true);break;
    case 'store-sell':{const i=S.storage.findIndex(s=>s.kind===b.dataset.k&&s.type===id);if(i>=0){pushUndo();S.money+=storageValue(S.storage[i]);S.storage.splice(i,1);sfx('cash');save();refreshAll()}break}
    case 'zone-tool':closeSheet();tool='zone';renderDock();toast('マスをタップして喫煙OKゾーンを塗ります');break;
    case 'floor':buyFloor(id);break;
    case 'wall':buyWall(id);break;
    case 'expand':{const why=expandStore(v);if(why){toast(why);sfx('bad')}else{resizeCanvas();fitCam();sfx('good');toast('お店が広くなりました！');save()}refreshAll();break}
    case 'm-lv':{const m=sheetData.m;if(kindOf(m)==='s')m.set=Number(v);else m.nail=Number(v);sfx('tap');save();refreshAll();break}
    case 'm-rate':{const m=sheetData.m;m.rate=v;sfx('tap');save();refreshAll();break}
    case 'm-rot':rotateM(sheetData.m);refreshAll();break;
    case 'm-dir':setDirM(sheetData.m,Number(v));refreshAll();break;
    case 'isl-rot':rotateGroup(islandOf(sheetData.m).ms,v==='cw');refreshAll();break;
    case 'o-move':{const t=sheetData.m||sheetData;closeSheet();tool='move';moveIsland=false;moveSel=t;renderDock();toast(t.side?'新しい壁の場所をタップ':'移動先のマスをタップ');break}
    case 'o-store':case 'o-sell':{const t=sheetData.m||sheetData;closeSheet();removeThing(t,a==='o-store'?'store':'sell');break}
    case 'm-swap':sheetData.swap=true;renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'm-swap-back':sheetData.swap=false;renderSheet();break;
    case 'swap-to':swapModel(sheetData.m,id);sheetData.swap=false;renderSheet();break;
    case 'ls-scope':sheetData=v;renderSheet();break;
    case 'ls-bulk-s':case 'ls-bulk-p':case 'ls-rand':case 'ls-rate':{
      const ms=scopeMachines(sheetData||'all');let n=0;
      ms.forEach(m=>{const k=kindOf(m);
        if(a==='ls-bulk-s'&&k==='s'){m.set=Number(v);n++}
        else if(a==='ls-bulk-p'&&k==='p'){m.nail=Number(v);n++}
        else if(a==='ls-rate'){m.rate=v;n++}
        else if(a==='ls-rand'){if(k==='s')m.set=1+Math.floor(Math.random()*3);else m.nail=-Math.floor(Math.random()*2);n++}});
      sfx('tap');save();refreshAll();toast(`${n}台を変えました`);break;
    }
    case 'ls-lv':{const m=G.objs.find(o=>o.id===Number(id));if(m){if(kindOf(m)==='s')m.set=Number(v);else m.nail=Number(v);sfx('tap');save();refreshAll()}break}
    case 'go-list':openSheet('list','all');break;
    case 'ev-type':{const t=b.dataset.t,ev=S.event;ev.type=t;ev.target=null;
      if(t==='island'&&islands[0])ev.target=islands[0].label;
      if(t==='tail'){const d=[7,0,1,2,3,5,6,8].find(d=>machines().some(m=>m.no%10===d));ev.target=d??null}
      if(t==='model'&&machines()[0])ev.target=machines()[0].type;
      if(t==='media')ev.target='mag';
      if(t==='none'||t==='renewal'||t==='media')ev.ad=false;
      sfx('tap');save();refreshAll();break}
    case 'ev-target':S.event.target=S.event.type==='tail'?Number(v):v;sfx('tap');save();refreshAll();break;
    case 'ev-ad':S.event.ad=!S.event.ad;sfx('tap');save();refreshAll();break;
    case 'ev-fill-all':machines().forEach(m=>{if(kindOf(m)==='s')m.set=Math.max(m.set,4);else m.nail=Math.max(m.nail,1)});sfx('good');save();refreshAll();break;
    case 'bk-borrow':{const n=borrow(Number(v));if(n){sfx('cash');toast(`${man(n)}借りました`);save();refreshAll()}break}
    case 'bk-repay':{const n=repay(v==='all'?S.loan:Number(v));if(n){sfx('cash');toast(`${man(n)}返しました`);save();refreshAll()}break}
    case 'menu-tweet':prefs.tweets=!prefs.tweets;savePrefs();renderSheet();break;
    case 'menu-transfer':openSheet('transfer');break;
    case 'menu-mdb':openSheet('mdb',{tab:'s'});break;
    case 'hall-tab':sheetData=v;renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'open-hall':if(sheetKind==='report'){closeSheet();refreshAll();if(sheetKind)break}openSheet('hall','rank');break;
    case 'open-list':openSheet('list','all');break;
    case 'mdb-tab':sheetData={tab:v};renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'mdb-edit':sheetData={tab:sheetData.tab,id};renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'mdb-back':sheetData={tab:sheetData.tab};renderSheet();break;
    case 'mdb-prob':{const nm=$('#mdbName');sheetData=Object.assign({},sheetData,{prob:Number(v),name:nm?nm.value:undefined});sfx('tap');renderSheet();break}
    case 'mdb-save':{
      const d=sheetData,md=MB[d.id],nm=(($('#mdbName')||{}).value||'').trim();
      if(!nm){toast('名前を入れてください');sfx('bad');break}
      const e={name:nm};let bad=-1,clipped=false;
      if(md.k==='s'){e.rates=[];for(let i=0;i<6;i++){const v=parseFloat($('#mdbR'+i).value);if(!isFinite(v)){bad=i;break}const c=clampRate(v);if(c!==Math.round(v*10)/10)clipped=true;e.rates.push(c)}}
      else e.prob=d.prob??md.prob;
      if(bad>=0){toast(`設定${bad+1}の出玉率を数字で入れてください`);sfx('bad');break}
      mdbSet(Object.assign({},mdbEdits,{[d.id]:e}));
      sfx('good');toast(clipped?`保存しました（${SLOT_MIN}〜${SLOT_MAX}%の外の値は直しました）`:'保存しました');
      sheetData={tab:md.k,id:d.id};refreshAll();break}
    case 'mdb-reset1':{const o=Object.assign({},mdbEdits);delete o[sheetData.id];mdbSet(o);sheetData={tab:sheetData.tab,id:sheetData.id};sfx('tap');toast('最初の値に戻しました');refreshAll();break}
    case 'mdb-resetall':sheetData=Object.assign({},sheetData,{confirm:true});renderSheet();break;
    case 'mdb-resetall-no':sheetData={tab:sheetData.tab};renderSheet();break;
    case 'mdb-resetall-yes':mdbSet({});sheetData={tab:sheetData.tab};sfx('tap');toast('すべて最初の値に戻しました');refreshAll();break;
    case 'mdb-export':{
      const code='PKDB1:'+JSON.stringify(mdbEdits),ta=$('#mdbOut');
      const fallback=()=>{ta.hidden=false;ta.value=code;ta.focus();ta.select();toast('欄のテキストを全部選んでコピーしてください')};
      try{navigator.clipboard.writeText(code).then(()=>{toast('コピーしました。「セーブの引っ越し」の欄に貼ると読み込めます');sfx('good')},fallback)}catch(err){fallback()}
      break;}
    case 'tr-copy':{
      const code='PHJ2:'+JSON.stringify({save:S.phase==='open'&&openSnap?openSnap:ser(),mdb:mdbEdits}),ta=$('#trText');
      const fallback=()=>{ta.value=code;ta.focus();ta.select();toast('欄のテキストを全部選んでコピーしてください')};
      try{navigator.clipboard.writeText(code).then(()=>{toast('セーブをコピーしました');sfx('good')},fallback)}catch(err){fallback()}
      break;}
    case 'tr-load':{
      const r=parseTransfer($('#trText').value||'');
      if(r.err){showTrErr(r.err);sfx('bad');break}
      if(r.kind==='mdb'){mdbSet(r.mdb);sfx('good');toast('機種データベースを読み込みました');closeSheet();refreshAll();break}
      const wasOpen=S.phase==='open',back=wasOpen?openSnap:ser();
      let ok=false;try{ok=load(r.save)}catch(err){console.error(err);ok=false}
      if(!ok){try{load(back)}catch(e){}showTrErr('このセーブは読み込めない形式でした');sfx('bad');break}
      if(r.mdb)mdbSet(r.mdb);
      if(wasOpen){releaseWake();tweetReset();openSnap=null;playBgm('prep')}
      save();custs=[];staffA=[];tool='view';sheetData=null;closeSheet();cam.fit=true;applyLayout();refreshAll();sfx('fanfare');telop('引っ越し完了！',S.name,'good');
      break;}
    case 'menu-rot':prefs.rot=v;savePrefs();applyLayout();renderSheet();break;
    case 'ev-fill':eventTargets().forEach(m=>{if(kindOf(m)==='s')m.set=v==='max'?6:5;else m.nail=v==='max'?2:1});sfx('good');save();refreshAll();break;
    case 'mg-tab':sheetData=v;renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'mg-back':openSheet('manage','prop');break;
    case 'st-hire':{const c=S.cands.find(x=>x.id===Number(id));if(c){hireStaff(c);S.cands=S.cands.filter(x=>x!==c);sfx('good');toast(`${c.name}さんを雇いました`);save();refreshAll()}break}
    case 'st-fire':{const s=findStaff(id);if(s){S.staff=S.staff.filter(x=>x!==s);sfx('tap');toast(`${s.name}さんがやめました`);save();refreshAll()}break}
    case 'st-train':{const s=findStaff(id);if(!s)break;const c=trainCost(s);if(S.money<c){toast('お金が足りません');sfx('bad');break}
      S.money-=c;s.lv++;if(s.spd<=s.srv)s.spd=Math.min(5,s.spd+1);else s.srv=Math.min(5,s.srv+1);s.wage+=500;sfx('good');toast(`${s.name}さんがレベルアップ！`);save();refreshAll();break}
    case 'nb-loc':sheetData={tab:'prop',nb:Object.assign({},sheetData&&sheetData.nb||{loc:'jutaku',size:0},{loc:v})};renderSheet();break;
    case 'nb-size':sheetData={tab:'prop',nb:Object.assign({},sheetData&&sheetData.nb||{loc:'jutaku',size:0},{size:Number(v)})};renderSheet();break;
    case 'pr-inuki':{const o=S.offers.find(x=>x.id===Number(id));if(o)openSheet('move',{kind:'inuki',offer:o,loc:o.loc,W:o.W,H:o.H,price:o.price});break}
    case 'pr-new':{const nb=sheetData&&sheetData.nb||{loc:'jutaku',size:0},z=BUILD_SIZES[nb.size];openSheet('move',{kind:'new',loc:nb.loc,W:z.W,H:z.H,price:newBuildPrice(nb.loc,z.W,z.H)});break}
    case 'do-move':{const spec=sheetData;relocate(spec);closeSheet();resizeCanvas();fitCam();save();refreshAll();sfx('fanfare');telop('新店舗へ移転！','今日からグランドオープン','good');setTimeout(()=>openSheet('shop','s'),1800);break}
    case 'g-tab':sheetData=v;renderSheet();$('#sheetBody').scrollTop=0;break;
    case 'menu-guide':openSheet('guide','start');break;
    case 'menu-manage':openSheet('manage','log');break;
    case 'menu-bgm':prefs.bgm=!prefs.bgm;savePrefs();audio();setVolumes();if(prefs.bgm)playBgm(bgm.want||'prep');renderSheet();break;
    case 'menu-sfx':prefs.sfx=!prefs.sfx;savePrefs();audio();setVolumes();renderSheet();if(prefs.sfx)sfx('good');break;
    case 'menu-rename':{const n=($('#mName').value||'').trim().slice(0,10);if(n){S.name=n;save();refreshAll();toast('お店の名前を変えました')}break}
    case 'menu-reset':sheetData=true;renderSheet();break;
    case 'menu-reset-no':sheetData=false;renderSheet();break;
    case 'restart':try{localStorage.removeItem(SAVE_KEY)}catch(e){}closeSheet();custs=[];staffA=[];tool='view';newGame('パーラー満天');resizeCanvas();fitCam();refreshAll();showTitle();break;
  }
});
function manageTabFromData(){return typeof sheetData==='string'?sheetData:(sheetData&&sheetData.tab)||'staff'}

/* ---------- ドック ---------- */
function onDock(e){
  const b=e.target.closest('[data-dock]');if(!b||b.disabled)return;audio();
  switch(b.dataset.dock){
    case 'build':openSheet('shop','m');break;
    case 'move':tool='move';moveSel=null;moveIsland=false;renderDock();break;
    case 'remove':tool='remove';renderDock();break;
    case 'undo':if(undo()){moveSel=null;resizeCanvas();clampCam();save();refreshAll();sfx('tap');toast('ひとつ前に戻しました')}break;
    case 'list':openSheet('list','all');break;
    case 'hall':openSheet('hall','rank');break;
    case 'event':openSheet('event');break;
    case 'manage':openSheet('manage','staff');break;
    case 'open':startDay();break;
    case 'endtool':tool='view';buildItem=null;moveSel=null;renderDock();break;
    case 'dir':buildDir=b.dataset.v!=null?Number(b.dataset.v):(buildDir+1)%4;sfx('tap');renderDock();break;
    case 'mrot':if(moveSel&&moveSel.kind==='m'){if(moveIsland)rotateGroup(islandOf(moveSel).ms,true);else rotateM(moveSel);refreshAll()}break;
    case 'mone':moveIsland=false;renderDock();break;
    case 'misl':moveIsland=true;renderDock();break;
    case 'rsell':removeMode='sell';renderDock();break;
    case 'rstore':removeMode='store';renderDock();break;
    case 'zsmoke':zoneBrush=1;renderDock();break;
    case 'zno':zoneBrush=0;renderDock();break;
    case 'zisl':zoneIsland=!zoneIsland;renderDock();break;
    case 'pause':prefs.paused=!prefs.paused;renderDock();break;
    case 'speed':prefs.speed=Number(b.dataset.v);prefs.paused=false;savePrefs();renderDock();break;
  }
}
$('#dock').addEventListener('click',onDock);$('#speed').addEventListener('click',onDock);
function startDay(){
  const wasGo=goActive(),ev=S.event.type;
  if(!openStore())return;
  tool='view';moveSel=null;closeSheet();requestWake();
  sfx('open');
  if(D.isGo){playBgm('grand');telop(D.goType==='grand'?'グランドオープン！':'リニューアルオープン！',`${D.goIdx+1}日目 ／ 全${S.go.len}日`,'good')}
  else if(D.evType!=='none'){playBgm('event');telop('本日イベント！',D.evLabel,'good')}
  else{playBgm('open');telop('開店！',dateLong(S.day),'good')}
  $('#feed').innerHTML='';
  applyLayout();refreshAll();
}
$('#bOverlay').addEventListener('click',()=>{prefs.overlay={set:'no',no:'rate',rate:'off',off:'set'}[prefs.overlay];savePrefs();renderStatus()});
$('#bMenu').addEventListener('click',()=>{audio();openSheet('menu',false)});
$('#sheetClose').addEventListener('click',()=>{closeSheet();refreshAll()});
$('#scrim').addEventListener('click',()=>{if(performance.now()-sheetAt<450)return;closeSheet();refreshAll()});
$('#zIn').addEventListener('click',()=>zoomAt(1.3));
$('#zOut').addEventListener('click',()=>zoomAt(1/1.3));
$('#zFit').addEventListener('click',()=>fitCam());

/* ---------- マップの指操作 ---------- */
const ptrs=new Map();let gest=null;
const pdist=()=>{const p=[...ptrs.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};
const pmid=()=>{const p=[...ptrs.values()],l=toLocal((p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);return {x:l.x*dpr,y:l.y*dpr}};
cv.addEventListener('pointerdown',e=>{
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
  if(ptrs.size===1)gest={t:'tap'};else if(ptrs.size===2)gest={t:'pinch',d0:pdist()};
});
cv.addEventListener('pointermove',e=>{
  const p=ptrs.get(e.pointerId);if(!p)return;
  const d=toLocalD(e.clientX-p.x,e.clientY-p.y);p.x=e.clientX;p.y=e.clientY;
  if(!gest)return;
  if(gest.t==='tap'&&Math.hypot(p.x-p.sx,p.y-p.sy)>8)gest.t='pan';
  if(gest.t==='pan'&&ptrs.size===1){cam.fit=false;cam.x-=d.x*dpr/cam.s;cam.y-=d.y*dpr/cam.s;clampCam()}
  if(gest.t==='pinch'&&ptrs.size===2){const dd=pdist(),m=pmid();if(gest.d0>0){zoomAt(dd/gest.d0,m.x,m.y)}gest.d0=dd}
});
function endPtr(e){
  const p=ptrs.get(e.pointerId);
  if(p&&gest&&gest.t==='tap'&&ptrs.size===1){audio();const l=toLocal(e.clientX,e.clientY),w=localToWorld(l.x,l.y),hit=hitTest(w.x,w.y);if(hit)onTap(hit,w)}
  ptrs.delete(e.pointerId);if(!ptrs.size)gest=null;else if(gest&&gest.t==='pinch')gest={t:'pan'};
}
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);if(!ptrs.size)gest=null});
cv.addEventListener('wheel',e=>{e.preventDefault();const l=toLocal(e.clientX,e.clientY);zoomAt(e.deltaY<0?1.15:1/1.15,l.x*dpr,l.y*dpr)},{passive:false});
function thingAt(hit){
  if(hit.wall)return G.doors.find(d=>d.side===hit.wall&&d.pos===hit.pos)||null;
  const k=key(hit.x,hit.y);return occ.get(k)||seatMap.get(k)||frontMap.get(k)||null;
}
function openThing(t){
  panelSel=t;
  if(t.side)openSheet('door',t);else if(t.kind==='m')openSheet('machine',{m:t});else openSheet('decor',t);
}
function onTap(hit,w){
  if(S.phase==='open'){
    const wx=(w.x-OX)/TS-0.5,wy=(w.y-OY)/TS-0.4;
    const c=custs.find(c=>c.reg&&!c.hidden&&Math.abs(c.x-wx)<0.6&&Math.abs(c.y-wy)<0.8);
    if(c){const def=REG_BY[c.reg];toast(`${def.name}（${SEG_NAME[c.seg]}派）`);return}
    const t=thingAt(hit);if(t)openThing(t);return;
  }
  if(S.phase!=='prep')return;
  if(tool==='build'){tryPlace(hit);return}
  if(tool==='move'){moveTap(hit);return}
  if(tool==='zone'){zoneTap(hit);return}
  if(tool==='remove'){const t=hit.wall?thingAt(hit):(occ.get(key(hit.x,hit.y))||frontMap.get(key(hit.x,hit.y)));if(t)removeThing(t,removeMode);else toast('そこには何もありません');return}
  const t=thingAt(hit);if(t){sfx('tap');openThing(t)}
}

/* ---------- タイトル ---------- */
function showTitle(){$('#title').hidden=false;$('#tName').value=S.name}
$('#tTransfer').addEventListener('click',()=>{audio();$('#title').hidden=true;openSheet('transfer','title')});
$('#tStart').addEventListener('click',()=>{
  audio();const n=($('#tName').value||'').trim().slice(0,10)||'パーラー満天';
  S.name=n;$('#title').hidden=true;save();refreshAll();sfx('fanfare');playBgm('prep');
  openSheet('guide','start');prefs.guideSeen=true;savePrefs();
});
async function requestWake(){try{if('wakeLock' in navigator)wakeLock=await navigator.wakeLock.request('screen')}catch(e){}}
let wakeLock=null;
function releaseWake(){try{wakeLock&&wakeLock.release();wakeLock=null}catch(e){}}
