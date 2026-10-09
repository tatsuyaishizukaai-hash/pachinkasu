/* ===== mania.js : ホール運営のしくみ =====
   ① 据え置きと設定変更 … お客さんは「この店は高設定を据え置くか」「設定を変えた台は上げているか」を覚えて台を選ぶ
   ② スロットの天井とハイエナ … AT機はハマり（当たらないゲーム数）が天井に届くと必ず当たる。ハマり台を狙う客が来る
   ③ 交換率 … 等価にするか、少し下げてお店の取り分（交換差益）をつくるか
   ④ 新台カレンダー … 販社に予約して、人気台は抽選。発売後しばらくは中古が出回らない。中古の相場は毎週動く
   ⑤ 抽選入場 … イベントの朝の並びを抽選にする
   ⑥ 立ち入り検査 … あおる告知や大きな釘の変更が続くと、警察の検査が入る
   ⑦ 会員カードと貯玉 … 会員が増えると客足が安定し、勝った玉を預けてまた来てくれる */

/* ---------- 交換率 ----------
   ex：お店が払う割合（1,000円分の玉を交換したときの金額÷1,000）
   hunt：設定狙いの客の来やすさ  att：お客さん全体の来やすさ  stay：ふつうの客が長く遊ぶ割合 */
const EXCH={
  p:{'25':{n:'等価',yen:1000,ex:1,hunt:1,att:1,stay:1},
     '28':{n:'28玉',yen:893,ex:25/28,hunt:0.75,att:0.95,stay:1.12},
     '33':{n:'33玉',yen:758,ex:25/33,hunt:0.5,att:0.88,stay:1.25}},
  s:{'50':{n:'等価',yen:1000,ex:1,hunt:1.15,att:1.03,stay:0.95},
     '56':{n:'5.6枚',yen:893,ex:5/5.6,hunt:1,att:1,stay:1},
     '60':{n:'6枚',yen:833,ex:5/6,hunt:0.8,att:0.95,stay:1.08},
     '70':{n:'7枚',yen:714,ex:5/7,hunt:0.5,att:0.88,stay:1.2}}};
const EX_DEF={p:'25',s:'56'};
const EX_CD=14;   /* 交換率を変えたあと、次に変えられるまでの日数 */
const exKey=k=>(S.mn&&S.mn.ex&&EXCH[k][S.mn.ex[k]])?S.mn.ex[k]:EX_DEF[k];
const exOf=k=>EXCH[k][exKey(k)];
const exRate=k=>exOf(k).ex;
const exBase=k=>EXCH[k][EX_DEF[k]].ex;
/* 最初の交換率とくらべた、お客さんの手取りの割合 */
const exRel=k=>exRate(k)/exBase(k);
/* 当りのたびに払うときの割合。交換率を下げた分の取り分は、お客さんが持ち帰る玉（勝ち分）にだけかかるので、
   当りのときは最初の交換率で払い、帰るときに勝ち分×差の分だけお店に残す（quit を見る） */
const exHit=k=>Math.max(exRate(k),exBase(k));
const exLabel=()=>`パチンコ${exOf('p').n}・スロット${exOf('s').n}`;
/* 交換率でお客さん全体の来やすさが変わる（台の数の割合で混ぜる） */
function exAttract(){const ms=machines();if(!ms.length)return 1;const p=ms.filter(m=>kindOf(m)==='p').length/ms.length;return (p*exOf('p').att+(1-p)*exOf('s').att)*(S.mn&&S.mn.exUp>=S.day?1.08:1)}
const exLeft=k=>Math.max(0,EX_CD-(S.day-((S.mn.exDay&&S.mn.exDay[k])??-99)));
function setExch(k,v){
  const M=S.mn,o=exOf(k),n=EXCH[k][v];
  if(!n||exKey(k)===v||exLeft(k)>0||S.phase!=='prep')return false;
  M.ex[k]=v;M.exDay[k]=S.day;
  const nm=k==='p'?'パチンコ':'スロット';
  if(n.ex<o.ex){S.trust=clamp(S.trust-6,0,100);S.rep=clamp(S.rep-3,0,100);news(`${nm}の交換率を「${n.n}」に下げた。お客さんから不満の声…（信用-6・評判-3）`,'bad')}
  else{M.exUp=S.day+10;news(`${nm}の交換率を「${n.n}」に上げた！「交換が良くなった」と評判に（10日間 客足アップ）`,'good')}
  return true;
}

/* ---------- スロットの天井 ---------- */
/* AT機の天井（ゲーム数）：設定1の平均ハマりの約2.4倍（実機と同じくらい。1/380の台で約1150G）。
   Aタイプ（vol1）とパチンコにはない */
const tenjoOf=m=>{const md=MB[m.type];return md&&md.k==='s'&&md.vol>=2?Math.round(md.hit[0]*1.25*2.4/50)*50:0};
/* 天井があるぶん、ふだんの当たりを少しだけ重くして、出玉率（機械割）は変わらないようにする。
   q0＝もとの1ゲームの当たりやすさ、a＝天井までに平均で何回当たるか → k＝1−e^(−k·a) を解く */
const TJ_K=new Map();
function tenjoK(m){
  const md=MB[m.type],key=m.type+':'+m.set;let k=TJ_K.get(key);
  if(k==null){const a=tenjoOf(m)*0.8/slotProb(md,m.set);k=0.9;for(let i=0;i<30;i++)k=1-Math.exp(-k*a);TJ_K.set(key,k)}
  return k;
}
const hamaOf=m=>Math.round(m.hama||0);
/* 次の開店でハマりが0にもどるか（設定を変えた・打ち直し・全台リセット） */
const willReset=m=>!!(tenjoOf(m)&&(m.rq||(m.ys!=null&&m.set!==m.ys)||(S.mn&&S.mn.reset==='all')));
/* ハイエナの来やすさ：データ公開機があると多く、ハマりを見せないと少ない */
const hyenaF=()=>(D&&D.kiosk?1.4:1)*(S.mn.data==='hide'?0.35:1)*(S.day<3?0.3:1);

/* ---------- お客さんの読み（店のクセ） ---------- */
const mnSue=()=>S.mn?S.mn.sue:0.5;     /* 高設定（設定4以上・やや開け以上）がそのまま残る割合 */
const mnUp=()=>S.mn?S.mn.up:0.3;       /* 設定を変えた台が「上げ」だった割合 */
/* 設定狙いの客がスロットを選ぶときの、昨日のデータと設定変更の重み */
function huntRead(m){
  let w=0;
  if(m.yest&&m.yest.out>m.yest.coin)w+=(D.kiosk?40:15)*(0.4+1.2*mnSue())*(S.mn.data==='hide'?0.6:1);
  if(m.chgSeen)w+=34*mnUp();
  return w;
}
const sueWord=v=>v>=0.65?'よく据え置く店':v>=0.4?'ときどき据え置く店':'毎日設定を変える店';
const upWord=v=>v>=0.55?'変えた台は上げている':v>=0.3?'変えた台は半々':'変えた台は下げている';

/* ---------- 新台カレンダー・中古台の相場 ---------- */
const REL_GAP=7,REL_DEAD=3,REL_DRAW=2,USED_WAIT=10,HYPE_DAYS=21;
const relLocked=id=>!!(S&&S.mn&&S.mn.unrel&&S.mn.unrel.includes(id));
const usedFrom=id=>{const d=S.mn&&S.mn.relDay&&S.mn.relDay[id];return d!=null&&S.day<d+USED_WAIT?d+USED_WAIT:0};
const hypeOn=id=>!!(S.mn&&S.mn.hype&&S.mn.hype[id]>=S.day);
const hypeF=m=>hypeOn(m.type)?1.25:1;
const relPrice=id=>Math.round(MB[id].price*skPrice()/1000)*1000;
const relHot=id=>MB[id].pop>=85;
const canReserve=id=>rankNo()>=MB[id].rank-1;
/* 中古の相場（定価に対する倍率）：毎週少し動く。発売したての話題の台は高く、規制の台は安い */
function pxF(id){
  const M=S&&S.mn;if(!M)return 1;
  let f=(M.px&&M.px[id])||1;
  const d=M.relDay&&M.relDay[id];if(d!=null){const a=S.day-d;if(a<45)f*=1+0.45*(1-a/45)}
  if(regulatedIds().has(id))f*=0.35;
  return f;
}
function pxTrend(id){const M=S.mn,a=(M.px&&M.px[id])||1,b=(M.pxPrev&&M.pxPrev[id])||a;return a>b*1.025?'up':a<b/1.025?'down':''}
/* 抽選の当たりやすさ（人気台だけ。ランクと販社との付き合いで上がる） */
const relRate=id=>relHot(id)?clamp(0.3+0.07*rankNo()+S.mn.rel/250,0.25,0.95):1;
function relSchedule(){
  const M=S.mn;
  let pend=M.cal.filter(e=>e.st!=='done');
  while(pend.length<3){
    const used=new Set(M.cal.map(e=>e.id));
    const pool=M.unrel.filter(id=>MB[id]&&!used.has(id)&&(MB[id].gen||1)<=S.gen);
    if(!pool.length)break;
    const last=M.cal.length?M.cal[M.cal.length-1].day:S.day;
    const day=Math.max(last+REL_GAP,S.day+6);
    const w=pool.map(id=>MB[id].pop*(MB[id].rank<=rankNo()+1?1:0.15));
    let r=Math.random()*w.reduce((a,b)=>a+b,0),id=pool[pool.length-1];
    for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0){id=pool[i];break}}
    const e={id,day,req:0,got:null,st:'open'};M.cal.push(e);pend.push(e);
  }
  const done=M.cal.filter(e=>e.st==='done');
  if(done.length>6){const keep=new Set(done.slice(-6));M.cal=M.cal.filter(e=>e.st!=='done'||keep.has(e))}
}
const relOpen=e=>e.st==='open'&&S.day<=e.day-REL_DEAD;
function relReserve(e,n){if(!relOpen(e)||!canReserve(e.id))return false;e.req=clamp(n|0,0,12);return true}
function relDraw(e){
  const md=MB[e.id],M=S.mn;
  e.st='drawn';
  if(!e.req){e.got=0;return null}
  const rate=relRate(e.id);let got=0;
  for(let i=0;i<e.req;i++)if(Math.random()<rate)got++;
  if(relHot(e.id)&&!got&&M.rel>=50)got=1;   /* 付き合いが長いと、最低1台は回してくれる */
  e.got=got;e.rate=rate;M.rel=clamp(M.rel+1,0,100);
  if(relHot(e.id)&&got>=4&&got===e.req)(S.stat||(S.stat={})).lotAll=1;
  news(`新台「${md.name}」の抽選：${e.req}台中${got}台が当選（${dateStr(e.day)}に入荷）`,got?'good':'bad');
  return {kind:'lot',good:got>0,title:'新台の抽選結果',sub:`「${shortName(md.name)}」${e.req}台中 ${got}台が当選${got&&got===e.req?'（全部当たり！）':''}`};
}
function relDeliver(e,R){
  const md=MB[e.id],M=S.mn;
  e.st='done';M.unrel=M.unrel.filter(x=>x!==e.id);M.relDay[e.id]=S.day;M.hype[e.id]=S.day+HYPE_DAYS;
  news(`新台「${md.name}」が発売！ ${HYPE_DAYS}日間は「話題の新台」で人気が上がります（中古は${dateStr(S.day+USED_WAIT)}から）`,'big');
  let n=e.got||0;const price=relPrice(e.id);
  if(n>0){
    const can=Math.min(n,Math.floor(Math.max(0,S.money)/price));
    if(can<n){M.rel=clamp(M.rel-8*(n-can),0,100);news(`お金が足りず、新台を${n-can}台キャンセルした…（販社との付き合いが下がった）`,'bad')}
    n=can;
    for(let i=0;i<n;i++)S.storage.push({kind:'m',type:e.id,rate:'hi',fresh:1});
    e.n=n;e.paid=n*price;S.money-=e.paid;M.rel=clamp(M.rel+2*n,0,100);
    if(n)R.morning.push({kind:'newm',good:true,title:`新台が${n}台届きました！`,sub:`「${shortName(md.name)}」は倉庫にあります。置いて「新台入替」をすると効果的（${man(e.paid)}）`});
  }
  /* 大手チェーンも同じ日に新台入替をしてくることがある */
  for(const r of openRivals())if(r.type==='chain'&&!r.ev&&Math.random()<0.6){r.evKind='newm';r.newmDay=S.day+rndi(10,15)}
}
/* 新台入替イベントで、話題の新台を入れた日 */
const newHyped=()=>machines().some(m=>m.installDay>=S.day-1&&hypeOn(m.type));

/* ---------- 会員カード・貯玉 ---------- */
const CARD_COST=300000;
const memRatio=()=>S.mn.card?Math.min(0.6,S.mn.mem/1200):0;
/* 会員と貯玉で、お客さんが来やすくなる割合 */
const memF=()=>S.mn&&S.mn.card?1+0.12*(1-Math.exp(-S.mn.mem/600))+Math.min(0.05,S.mn.cho/2000000):1;
function startCard(){
  const M=S.mn;
  if(M.card||S.phase!=='prep'||S.money<CARD_COST)return false;
  if(!G.objs.some(o=>o.kind==='d'&&o.type==='counter'))return false;
  S.money-=CARD_COST;M.card=true;M.cardDay=S.day;
  news('会員カードを始めた！ 会員が増えるほどお客さんが来やすくなり、勝った玉を預ける「貯玉」もできます','good');
  return true;
}

/* ---------- 立ち入り検査 ---------- */
const HEAT_SRC={ad:'イベントをはっきり告知した',nail:'釘を大きく動かした',line:'朝の並びでトラブル'};
function heatAdd(v,src){
  const M=S.mn;M.heat=clamp(M.heat+v,0,100);
  M.hl.push({d:S.day,src,v});M.hl=M.hl.filter(x=>x.d>S.day-14);
}
const heatWord=h=>h>=70?['高い','bad']:h>=40?['やや高い','mid']:h>=20?['低い','ok']:['ほぼなし','ok'];
const adBanned=()=>!!(S.mn&&S.mn.adBan>=S.day);
const stopToday=()=>!!(S.mn&&S.mn.stop===S.day);

/* ---------- データの初期化（古いセーブにも足す） ---------- */
function maniaDefaults(){
  if(!S.st)return;   /* 新しいゲームの途中（お店ができてから呼びなおす） */
  const M=S.mn||(S.mn={});
  const d={ex:{},exDay:{},exUp:0,reset:'chg',data:'open',sue:0.5,up:0.3,heat:0,hl:[],adBan:0,stop:0,insp:[],card:false,mem:0,cho:0,lot:false,rel:30,px:{},pxPrev:{},pxDay:S.day,cal:[],hype:{},relDay:{},seen:{}};
  for(const k in d)if(M[k]==null)M[k]=JSON.parse(JSON.stringify(d[k]));
  if(!M.unrel){
    /* 発売前の機種：人気機種のうち、まだ店にない台（ランク1の台は前から出回っている） */
    const own=new Set();
    for(const st of [S.st,...(S.branches||[]).map(b=>b.st)])for(const o of st.objs)if(o.kind==='m')own.add(o.type);
    for(const it of S.storage||[])if(it.kind==='m')own.add(it.type);
    M.unrel=MACHINE_DB.filter(md=>md.rank>=2&&!own.has(md.id)).map(md=>md.id);
  }
  for(const md of MODELS)if(M.px[md.id]==null)M.px[md.id]=Math.round(rnd(0.9,1.1)*100)/100;
  relSchedule();
}

/* ---------- 開店のとき ----------
   ・昨日から設定を変えた台を調べて、お客さんの「読み」を更新
   ・天井のハマりは、設定を変えた台（と全台リセットの日はすべての台）だけ0にもどる
   ・ハイエナの朝の並び、抽選入場、立ち入り検査の抽選 */
function maniaOpen(){
  const M=S.mn,ev=S.event;
  Object.assign(D,{exchX:0,tenjo:0,hyena:0,hyMiss:0,hyNet:0,hyQ:[],hyT:20,cho:0,choIn:0,choOut:0,lot:false,lineBad:false,tk:0,insp:false,inspAt:0,stopped:stopToday(),resetN:0,resetCost:0,heat0:M.heat,memNew:0});
  let n=0,keep=0,cn=0,up=0,big=0;
  for(const m of machines()){
    const k=kindOf(m),tj=tenjoOf(m);
    if(k==='s'){
      const was=m.ys;m.chg=was!=null&&m.set!==was;
      if(was!=null&&was>=4){n++;if(!m.chg)keep++}
      if(m.chg||m.rq){cn++;if(m.set>=4)up++}
      m.ys=m.set;
    }else{
      const was=m.yn;m.chg=was!=null&&m.nail!==was;
      if(was!=null&&was>=1){n++;if(!m.chg)keep++}
      if(was!=null&&Math.abs(m.nail-was)>=2)big++;
      m.yn=m.nail;
    }
    m.rst=false;m.chgSeen=false;
    if(tj){
      const all=M.reset==='all';
      if(m.chg||m.rq||all){if((m.hama||0)>0)m.rst=true;m.hama=0;if(all)D.resetN++}
      m.chgSeen=(m.chg||m.rq)&&!all;   /* 天井がリセットされると、お客さんに「設定を変えた」とバレる */
    }
    m.rq=false;
  }
  if(n)M.sue=Math.round((M.sue*0.85+0.15*keep/n)*1000)/1000;
  if(cn)M.up=Math.round((M.up*0.85+0.15*up/cn)*1000)/1000;
  if(D.resetN){D.resetCost=D.resetN*300;S.money-=D.resetCost;D.ad+=D.resetCost}
  if(big)heatAdd(Math.min(12,big*2),'nail');
  if(ev.ad&&ev.type!=='none')heatAdd(14,'ad');
  if(D.stopped){
    lambdaBase=0;queueLeft=0;regQueue=[];D.gotoAt=null;
    for(const def of REG_DEFS)S.regs[def.id].planned=false;
    const rest=1-D.shares.me;for(const k in D.shares)if(k!=='me')D.shares[k]/=rest||1;D.shares.me=0;
    clock=CLOSE;
    return;
  }
  /* ハイエナの朝の並び（前の日のハマりが残っている台） */
  const f=hyenaF();
  for(const m of machines()){const tj=tenjoOf(m);if(tj&&(m.hama||0)>=tj*0.5&&Math.random()<0.75*f)D.hyQ.push({t:OPEN+rnd(0,12),m})}
  D.hyQ.sort((a,b)=>a.t-b.t);
  /* 抽選入場と並びのトラブル */
  if(queueLeft>=10){
    if(M.lot){D.lot=true;S.money-=10000;D.ad+=10000}
    else if(queueLeft>=30&&Math.random()<0.3){D.lineBad=true;heatAdd(6,'line')}
  }
  /* 立ち入り検査（リスクが高いほど入りやすい） */
  if(S.day>=8&&Math.random()<Math.max(0,M.heat-20)/100*0.2)D.inspAt=rnd(OPEN+90,LAST-150);
}
/* 朝の行列のお客さん（抽選入場なら番号札・トラブルなら不満） */
function maniaQueueCust(c){
  if(D.lot){c.ticket=++D.tk;addWhy(c,'lotFair',0.05)}
  else if(D.lineBad)addWhy(c,'lineBad',-0.06);
}

/* ---------- 営業中（毎ステップ） ---------- */
function maniaTick(dt){
  if(D.stopped)return;
  while(D.hyQ.length&&D.hyQ[0].t<=clock){const q=D.hyQ.shift();spawnHyena(q.m)}
  D.hyT-=dt;
  if(D.hyT<=0){
    D.hyT=15;
    if(clock<LAST-90){const f=hyenaF();
      for(const m of machines()){const tj=tenjoOf(m);if(!tj||m.res||m.broken||m.today.done)continue;
        if((m.hama||0)>=tj*0.55&&Math.random()<0.28*f)spawnHyena(m)}}
  }
  if(D.inspAt&&clock>=D.inspAt){D.inspAt=0;spawnInspectors()}
}
const HYENA_LOOK=()=>({shirt:pick(['#3f3f46','#27272a','#44403c']),hair:pick(HAIRS),skin:pick(SKINS),out:'hoodie',pants:'#111827',mask:Math.random()<0.5?1:0,glasses:0});
function spawnHyena(m){
  if(clock>=LAST-60||!machines().includes(m))return;
  const c=spawnCust(segOf(m),{hyena:1,hunter:false,elder:false,look:HYENA_LOOK()});
  c.target=m;c.budget=60000*c.sc;c.maxT=320;
}
/* ハイエナが座る台：狙った台が空いていればそこ、だめならいちばんハマっている台 */
function hyenaPick(c){
  const ok=m=>machines().includes(m)&&!m.res&&!m.broken&&!m.today.done&&segOf(m)===c.seg;
  if(c.target&&ok(c.target)&&(c.target.hama||0)>=tenjoOf(c.target)*0.45)return c.target;
  let best=null,bv=0.45;
  for(const m of machines()){const tj=tenjoOf(m);if(!tj||!ok(m))continue;const v=(m.hama||0)/tj;if(v>=bv){bv=v;best=m}}
  return best;
}
/* 立ち入り検査の2人組 */
function spawnInspectors(){
  const d=doorPos(),cs=G.objs.filter(o=>o.kind==='d'&&o.type==='counter'),ms=machines();
  for(let i=0;i<2;i++){
    const wps=[];
    if(cs.length&&i===0)wps.push({x:cs[0].x,y:cs[0].y});
    for(let j=0;j<3&&ms.length;j++){const m=pick(ms);wps.push({x:m.x,y:m.y})}
    const c={id:++cid,insp:true,seg:'',k:'p',sc:1,look:{shirt:'#1e293b',hair:i?'#1b1b1b':'#3b2a1a',skin:pick(SKINS),out:'suit',hs:'short',glasses:1,pants:'#1f2937'},
      x:d.x+(i?0.35:-0.35),y:G.H+0.8,path:[{x:d.x,y:d.y}],st:'insp',wps,wait:i*2,speed:0.26,ph:Math.random()*10,emote:null,why:{},sat:0,plan:[],inv:0,won:0,hidden:false,born:clock};
    custs.push(c);
    if(i===0)c.bubble={text:'立ち入り検査です',until:performance.now()+4500};
  }
  D.insp=true;D.seenC.insp=1;
  news('警察の立ち入り検査が入った！','bad');toast('立ち入り検査が入りました');sfx('bad');
}
function inspStep(c,dt){
  if(c.wait>0){c.wait-=dt;return}
  if(c.path.length){if(moveAlong(c,dt)){c.wait=rnd(4,9);c.emote={ch:'…',t:4}}return}
  const t=c.wps.shift();
  if(!t){goExit(c);return}
  const p=bfsTo(c,adjGoal(t.x,t.y));
  if(p&&p.length)c.path=p;
}

/* ---------- 閉店のとき ---------- */
function maniaClose(R,avgSat){
  const M=S.mn,out={tenjo:D.tenjo,hyena:D.hyena,hyMiss:D.hyMiss,hyNet:Math.round(D.hyNet),lot:D.lot?D.tk:0,lineBad:D.lineBad,resetN:D.resetN,stopped:D.stopped};
  /* 会員 */
  if(M.card&&!D.stopped){
    const nw=Math.round(D.visitors*0.12*clamp(0.6+avgSat,0.2,1.4)),churn=Math.floor(M.mem*0.004);
    M.mem=Math.max(0,M.mem+nw-churn);out.memNew=nw;out.mem=M.mem;out.choIn=Math.round(D.choIn);out.choOut=Math.round(D.choOut);out.cho=Math.round(M.cho);
  }
  if(D.lineBad){S.rep=clamp(S.rep-1.5,0,100);news('朝の並びで割り込み・場所取りのトラブル。近所から苦情が来た…（抽選入場にすると防げます）','bad')}
  /* 立ち入り検査の結果 */
  if(D.insp){
    const h=M.heat;let res;
    const goNext=S.go&&S.day+1<S.go.start+S.go.len;
    if(h>=70&&!goNext){res='stop';M.stop=S.day+1;S.rep=clamp(S.rep-6,0,100);S.trust=clamp(S.trust-4,0,100);news(`立ち入り検査で行政処分…明日（${dateStr(S.day+1)}）は営業停止です`,'bad')}
    else if(h>=70){res='fine';S.money-=500000;S.rep=clamp(S.rep-6,0,100);S.trust=clamp(S.trust-4,0,100);news('立ち入り検査で行政処分…罰金50万円','bad')}
    else if(h>=40){res='shido';M.adBan=S.day+14;S.rep=clamp(S.rep-2,0,100);news(`立ち入り検査で指導を受けた。${dateStr(S.day+14)}までイベントの告知ができません`,'bad')}
    else{res='ok';S.rep=clamp(S.rep+1,0,100);S.trust=clamp(S.trust+1,0,100);news('立ち入り検査は「問題なし」。きちんとした店だと評判に','good')}
    M.heat=Math.max(0,h-40);M.insp.push({day:S.day,res});if(M.insp.length>12)M.insp.shift();
    out.insp={res,heat:Math.round(h)};
  }
  M.heat=Math.max(0,Math.round((M.heat-2.5)*10)/10);
  const t=S.stat||(S.stat={});t.tenjo=(t.tenjo||0)+D.tenjo;t.hyena=(t.hyena||0)+D.hyena;if(out.insp&&out.insp.res==='ok')t.inspOk=(t.inspOk||0)+1;
  R.mn=out;R.rep1=S.rep;R.trust1=S.trust;R.money=S.money;R.exLabel=exLabel();R.choCash=Math.round(D.cho);
}

/* ---------- 次の日の朝 ---------- */
function maniaDayStart(R){
  const M=S.mn;R.morning=R.morning||[];
  /* 中古の相場（7日ごと） */
  if(S.day-M.pxDay>=7){
    for(const md of MODELS){const a=M.px[md.id]||1;M.pxPrev[md.id]=a;M.px[md.id]=Math.round(clamp(a*rnd(0.95,1.05)+(1-a)*0.2,0.85,1.18)*100)/100}
    M.pxDay=S.day;
  }
  /* 新台カレンダー：抽選（発売の2日前）と入荷（発売日） */
  for(const e of M.cal){
    if(e.st==='open'&&S.day>=e.day-REL_DRAW){const r=relDraw(e);if(r)R.morning.push(r)}
    if(e.st==='drawn'&&S.day>=e.day)relDeliver(e,R);
  }
  relSchedule();
  for(const id in M.hype)if(M.hype[id]<S.day)delete M.hype[id];
  const ins=R.mn&&R.mn.insp;
  if(ins)R.morning.unshift({kind:'insp',good:ins.res==='ok',title:'立ち入り検査の結果',sub:{ok:'問題なし（評判+1・信用+1）',shido:`指導（${dateStr(M.adBan)}までイベントの告知ができません）`,stop:'行政処分：今日は営業停止です',fine:'行政処分：罰金50万円'}[ins.res],talk:inspTalk(ins.res)});
  else if(stopToday())R.morning.push({kind:'stop',good:false,title:'今日は営業停止',sub:'立ち入り検査の処分で、今日はお店を開けられません'});
  /* はじめて：販社の担当があいさつに来る */
  if(!M.seen.dist&&S.day>=3&&M.cal.length){
    M.seen.dist=1;const e=M.cal.find(x=>x.st==='open');
    if(e)R.morning.push({kind:'dist',good:true,title:'新台カレンダー',sub:'販社の担当さんがあいさつに来た',talk:distIntroTalk(e)});
  }
}

/* ---------- 販社の担当 ---------- */
const DIST={name:'三河 誠',sub:'ミカワ商事・営業（販社）',col:'#38bdf8',face:{skin:'#f3d3b5',hair:'#3b2a1a',hs:'crew',out:'suit',col:'#1e3a8a',tie:'#0ea5e9',acc:['roundglasses']}};
function distIntroTalk(e){
  const md=MB[e.id];
  return [
    {who:'dist',ex:'happy',text:`はじめまして！ 台の販社「ミカワ商事」の三河です。これから新台のご案内をさせていただきます！`},
    {who:'dist',ex:'n',text:`次の新台は「${md.name}」。${dateLong(e.day)}発売です。発売の${REL_DEAD}日前までにご予約ください。`},
    {who:'dist',ex:'n',text:`人気の台は全国のお店から注文が殺到するので「抽選」になります。お店のランクが高いほど、うちとのお付き合いが長いほど当たりやすいですよ。`},
    {who:'dist',ex:'smug',text:`発売してしばらくは中古が出回りません。いち早く入れたお店にお客さんが集まるってわけです。`},
    {who:'me',ex:'n',text:`（建設 →「新台」で、カレンダーと予約ができるみたいだ）`},
  ];
}
function inspTalk(res){
  if(res==='stop')return [{who:'owner',ex:'angry',text:'営業停止ですって！？ 告知であおったり、釘をいじりすぎたりするからよ。'},{who:'owner',ex:'n',text:'1日お店を閉めるだけで、家賃もお給料も出ていくのよ。しばらくはおとなしくしなさい。'}];
  if(res==='fine')return [{who:'owner',ex:'angry',text:'罰金50万円…。オープン期間中だったから営業停止はまぬがれたけど、次はないわよ。'}];
  if(res==='shido')return [{who:'owner',ex:'n',text:'警察から指導が入ったそうね。しばらくイベントの告知はできないわ。'},{who:'owner',ex:'n',text:'「経営 → ホール運営」で、立ち入りのリスクが見られるわ。気をつけてちょうだい。'}];
  return [{who:'owner',ex:'happy',text:'立ち入り検査、問題なしだったそうね。まっとうな商売がいちばんよ。'}];
}
