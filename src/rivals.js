/* ===== rivals.js : ライバル店（タイプ・店長・新しい店の出店・偵察・引き抜き） ===== */
const capF=n=>Math.pow((n+10)/30,0.6);
const openRivals=()=>S.rivals.filter(r=>r.open);
const bossOf=r=>BOSS_BY[r.boss]||BOSSES[0];
const typeOf=r=>RIVAL_TYPES[r.type]||RIVAL_TYPES.honest;
const patLabel=p=>p.t==='tail'?`${p.v}のつく日`:`毎週${WD[p.v]}曜`;
const SCOUT_COST=3000;
const RIV_EV_LABEL={ev:'イベント',newm:'新台入替',pension:'年金デー',go:'オープン期間'};
function weighted(a,w){let r=Math.random()*w.reduce((x,y)=>x+y,0);for(let i=0;i<a.length;i++){r-=w[i];if(r<=0)return a[i]}return a[a.length-1]}

function newRival(o){
  const B=BOSS_BY[o.boss];
  return {id:S.nid++,name:o.shop||B.shop,col:B.col,type:B.type,boss:B.id,rep:o.rep,base:o.rep,size:o.size,health:o.health??rnd(60,90),pat:B.pat,
    open:true,openDay:S.day,goUntil:0,ev:false,evKind:null,closedDay:0,next:!!o.next,revenge:!!o.revenge,newmDay:S.day+rndi(5,12),scout:null,boosted:false};
}
function initRivals(){S.rivals=START_RIVALS.map(s=>newRival(s));S.rivalPlans=[];S.rivalLog=[];S.incidents=[]}
/* 古いセーブのライバル店に、タイプと店長を割りあてる */
function migrateRivals(){
  if(!Array.isArray(S.rivals))S.rivals=[];
  for(const r of S.rivals){
    if(r.boss&&BOSS_BY[r.boss])continue;
    const B=BOSSES.find(b=>b.shop===r.name&&!S.rivals.some(x=>x.boss===b.id))||BOSSES.find(b=>!S.rivals.some(x=>x.boss===b.id))||BOSSES[0];
    Object.assign(r,{boss:B.id,type:B.type,col:r.col||B.col,pat:r.pat||B.pat,newmDay:S.day+rndi(3,12),next:false,revenge:false,scout:null,boosted:false,evKind:r.ev?'ev':null,openDay:r.openDay||1});
    if(!r.open&&!S.rivalLog.some(l=>l.boss===B.id))S.rivalLog.push({boss:B.id,shop:r.name,type:B.type,open:1,day:r.closedDay||S.day});
  }
}

/* ---------- 毎日のイベント予定 ---------- */
function planRivals(){
  const d=dateOf(S.day),info=dayInfo(S.day);
  for(const r of openRivals()){
    const T=typeOf(r);
    const pat=(r.pat.t==='tail'&&d.getDate()%10===r.pat.v)||(r.pat.t==='wd'&&d.getDay()===r.pat.v);
    r.ev=pat||Math.random()<T.evP;r.evKind=r.ev?'ev':null;
    if(r.type==='chain'&&S.day>=r.newmDay){r.newmDay=S.day+rndi(10,15);if(!r.ev)r.evKind='newm'}
    if(!r.evKind&&r.type==='oldie'&&info.tags.includes('年金支給日'))r.evKind='pension';
    if(S.day<=r.goUntil){r.ev=false;r.evKind='go'}
  }
}
function nextPatDay(r){
  for(let d=S.day+1;d<S.day+40;d++){const x=dateOf(d);if((r.pat.t==='tail'&&x.getDate()%10===r.pat.v)||(r.pat.t==='wd'&&x.getDay()===r.pat.v))return d}
  return null;
}

/* ---------- 客の取り合い ---------- */
const rivalBase=r=>(10+r.base)*capF(r.size);
function mySegRatio(seg){const ms=machines();return ms.length?ms.filter(m=>segOf(m)===seg).length/ms.length:0}
/* 相手の弱い客層の台をあなたの店が多く置いているほど、相手の客を奪いやすい */
function weakPen(r){const w=bossOf(r).weak;return clamp(1-0.12*(mySegRatio(w)/SEG_SHARE[w]-1),0.85,1.05)}
function rivalAttract(r,info){
  const T=typeOf(r);info=info||dayInfo(S.day);
  let a=(10+r.rep)*capF(r.size);
  if(r.ev)a*=T.evMult;else if(r.evKind==='newm')a*=1.35;else a*=T.plain;
  if(r.evKind==='pension')a*=1.35;
  if(S.day<=r.goUntil)a*=T.goMult;
  if(r.next)a*=1.2;
  return a*weakPen(r);
}
function rivalPayout(r){
  const T=typeOf(r);let p=T.pay+(r.health-50)/600;
  if(r.ev)p+=r.type==='hype'?0.03:0.06;
  if(S.day<=r.goUntil)p+=0.07;
  return clamp(p,0.8,1.05);
}
const rivalState=r=>!r.open?'閉店':r.health>60?'好調':r.health>30?'ふつう':r.health>12?'苦しい':'危ない';
function rivalSay(r){
  const B=bossOf(r);
  if(!r.open)return {ex:'sad',text:B.close[1]};
  if(S.day<=r.goUntil)return {ex:'happy',text:B.go};
  if(r.health<30)return {ex:'sad',text:B.worried[(S.day+r.id)%B.worried.length]};
  return {ex:B.ex,text:B.taunt[(S.day+r.id)%B.taunt.length]};
}

/* ---------- 1日の終わり：経営の体力と評判 ---------- */
function rivalsEndDay(shares,goodEvent){
  D.rivalTalks=D.rivalTalks||[];D.rivalClosures=D.rivalClosures||[];D.rivalHit=[];
  const op=openRivals();
  const totalRef=op.reduce((a,r)=>a+rivalBase(r),0)+36;
  for(const r of op){
    const T=typeOf(r),B=bossOf(r);
    const ref=rivalBase(r)/totalRef,sh=shares[r.id]||0;
    const hit=r.ev&&goodEvent?3:0;   /* 相手のイベント日に「激アツ」をぶつけた */
    let dh=((sh-ref)*22+rnd(-1.2,1.2))*T.tough+(r.health<60?0.25:0)-hit;
    if(r.next&&shares.me>sh)dh-=0.3;
    if(S.day<=r.goUntil)dh=Math.max(dh,0.5);
    r.health=clamp(r.health+dh,-5,100);
    r.rep=clamp(r.rep+(r.base-r.rep)*0.03+rnd(-0.8,0.8)-Math.max(0,(S.rep-r.rep)/60)*T.repSens,5,95);
    if(r.type==='hype'){
      if(S.trust>=60)r.rep=clamp(r.rep-0.12,5,95);
      if(r.ev&&Math.random()<0.4){r.rep=clamp(r.rep-1.2,5,95);if(Math.random()<0.35)news(`${r.name}のイベントが「ガセだった」とSNSで話題に`)}
    }
    if(hit){D.rivalHit.push(r.name);news(`${r.name}のイベント日に激アツをぶつけた！ お客さんがこっちに流れた`,'good')}
    if(r.health<=0&&S.day>20){
      if(r.type==='chain'&&!r.boosted){
        r.boosted=true;r.health=40;r.rep=clamp(r.rep+4,5,95);r.size+=10;
        news(`${r.name}に本部のテコ入れ。台を10台増やして巻き返しを狙っている`,'big');
        D.rivalTalks.push([{who:'boss:'+B.id,ex:'angry',text:`本部からテコ入れが入った。${r.name}は、ここからが本番だ`},{who:'me',text:'（さすが大手…一筋縄ではいかないか）'}]);
        continue;
      }
      closeRival(r);
    }
  }
}
function closeRival(r){
  r.open=false;r.closedDay=S.day;r.ev=false;r.evKind=null;
  S.rivalLog.push({boss:r.boss,shop:r.name,type:r.type,open:r.openDay||1,day:S.day});
  news(`${r.name}が閉店しました。居抜き物件として売りに出ています`,'big');
  S.offers.unshift(inukiFromRival(r));
  D.rivalClosed=r.name;D.rivalClosures.push({boss:r.boss,shop:r.name});
  for(const d of REG_DEFS){const st=S.regs[d.id];if(st.away&&st.away.rival===r.id){st.away=null;st.loy=clamp(st.loy+5,0,100);news(`${d.name}が戻ってきた`,'good')}}
}

/* ---------- 新しい店の出店 ---------- */
const rivalTarget=()=>rankNo()>=4&&machines().length>=60?4:3;
/* 新しい店の台数：あなたの店の大きさに合わせる（小さすぎず、大きすぎず） */
const rivalSizeFor=(B,rk)=>Math.round(RIVAL_TYPES[B.type].sizeF*Math.max(26+6*rk,machines().length*0.9)*(B.big||1)*rnd(0.88,1.1)/2)*2;
const rivalSizeCap=r=>typeOf(r).sizeF*Math.max(50,machines().length)*(bossOf(r).big||1)*1.15;
function scheduleRival(opt){
  opt=opt||{};
  const rk=rankNo(),busy=new Set([...openRivals().map(r=>r.boss),...S.rivalPlans.map(p=>p.boss)]),beaten=new Set(S.rivalLog.map(l=>l.boss));
  let B=opt.boss?BOSS_BY[opt.boss]:null,revenge=false;
  if(!B){
    let pool=BOSSES.filter(b=>!busy.has(b.id)&&!beaten.has(b.id)&&b.minRank<=rk);
    if(!pool.length){pool=BOSSES.filter(b=>!busy.has(b.id)&&b.minRank<=rk);revenge=true}
    if(!pool.length)return null;
    B=weighted(pool,pool.map(b=>1+(b.type==='chain'?rk*0.4:0)+(b.minRank>=3?1.5:0)));
  }else revenge=beaten.has(B.id);
  const lc=S.rivals.filter(r=>!r.open).sort((a,b)=>b.closedDay-a.closedDay)[0];
  const next=opt.next??(rk>=3&&!S.rivals.some(r=>r.open&&r.next)&&!S.rivalPlans.some(p=>p.next)&&Math.random()<0.35);
  const site=next?'あなたの店の隣':(lc&&S.day-lc.closedDay<40&&!S.rivalPlans.some(p=>p.site===lc.name+'の跡地'))?lc.name+'の跡地':pick(RIVAL_SITES);
  const ann=S.day+(opt.annIn??rndi(4,8)),open=ann+(opt.openIn??rndi(9,14));
  const p={id:S.nid++,boss:B.id,shop:revenge?B.shop+' 新館':B.shop,ann,open,rumor:ann-3,next,site,revenge};
  S.rivalPlans.push(p);return p;
}
function maybePlanRival(){
  if(S.day<6)return;
  const lc=Math.max(0,...S.rivals.filter(r=>!r.open).map(r=>r.closedDay));
  if(lc&&S.day-lc<3)return;
  while(openRivals().length+S.rivalPlans.length<rivalTarget()){if(!scheduleRival())return}
}
function openPlannedRival(p){
  const B=BOSS_BY[p.boss],T=RIVAL_TYPES[B.type],rk=rankNo();
  const size=rivalSizeFor(B,rk);
  const rep=clamp(B.rep+2*(rk-1)+(p.revenge?5:0),20,85);
  const r=newRival({boss:B.id,shop:p.shop,rep,size,next:p.next,revenge:p.revenge,health:rnd(80,95)});
  r.goUntil=S.day+T.goDays-1;
  S.rivals.push(r);
  const closed=S.rivals.filter(x=>!x.open).sort((a,b)=>a.closedDay-b.closedDay);
  if(closed.length>6){const old=new Set(closed.slice(0,closed.length-6));S.rivals=S.rivals.filter(x=>!old.has(x))}
  return r;
}
const visiblePlans=()=>S.rivalPlans.filter(p=>S.day>=p.ann).sort((a,b)=>a.open-b.open);
const rumorPlans=()=>S.rivalPlans.filter(p=>S.day>=p.rumor&&S.day<p.ann);

/* ---------- 朝の出来事（出店・オープン・引き抜き） ---------- */
function rivalsDayStart(R){
  R.talks=R.talks||[];
  const closeM=(R.rivalClosures||[]).map(c=>{
    const B=BOSS_BY[c.boss];
    return {kind:'rivalClose',good:true,title:'ライバル閉店！',sub:`${c.shop}が閉店しました`,talk:[{who:'narr',text:`${c.shop}の看板が下ろされた。店長の${B.name}が、最後のあいさつに来た…`},{who:'boss:'+B.id,ex:'sad',text:B.close[0]},{who:'boss:'+B.id,ex:B.type==='hype'?'happy':'n',text:B.close[1]},{who:'me',text:pick(ME_REPLY.close)}]};
  });
  R.morning.unshift(...closeM);
  for(const t of R.rivalTalks||[])R.talks.push(t);
  for(const p of [...S.rivalPlans]){
    const B=BOSS_BY[p.boss],T=RIVAL_TYPES[B.type];
    if(S.day===p.rumor)news(`${p.site}で工事が始まった。新しいパチンコ店ができるらしい`);
    if(S.day===p.ann){
      news(`【新店告知】${p.shop}（${T.name}）が${dateStr(p.open)}にグランドオープン。場所は${p.site}`,'big');
      const lines=[{who:'narr',text:`${p.site}に「${p.shop}」がオープンするらしい。店長は${B.title}の${B.name}…`}];
      if(p.revenge)lines.push({who:'boss:'+B.id,ex:'angry',text:'…久しぶりだな。あの時の借りを、返しに来た'});
      B.intro.forEach((t,i)=>lines.push({who:'boss:'+B.id,ex:i?B.ex:'n',text:t}));
      if(p.next)lines.push({who:'boss:'+B.id,ex:'smug',text:'場所は君の店の真隣だ。お客さんは、比べてから選ぶ。楽しみだね'});
      lines.push({who:'me',text:pick(p.next?ME_REPLY.next:ME_REPLY.intro)});
      R.morning.push({kind:'rivalAnn',title:'新店オープン告知！',sub:`${p.shop}（${T.name}）${dateStr(p.open)}${p.next?'・あなたの店の隣！':''}`,talk:lines});
    }
    if(S.day>=p.open){
      const r=openPlannedRival(p);S.rivalPlans=S.rivalPlans.filter(x=>x!==p);
      news(`${r.name}がグランドオープン！ ${T.goDays}日間はお客さんを大きく取られそう`,'big');
      R.morning.push({kind:'rivalOpen',title:'ライバル店オープン！',sub:`${r.name}（${T.goDays}日間のオープン期間）`,talk:[{who:'boss:'+B.id,ex:'happy',text:B.go}]});
    }
  }
  planRivals();
  maybePlanRival();
  rivalActions(R);
}
function rivalActions(R){
  /* 常連さんが戻ってくる */
  for(const d of REG_DEFS){
    const st=S.regs[d.id];
    if(st.away&&S.day>st.away.until){news(`${d.name}が${st.away.name}から戻ってきた`,'good');st.away=null}
  }
  if(S.day<8||goActive())return;
  const op=openRivals();
  /* 店員の引き抜き */
  if(!S.incidents.length&&S.staff.length>=3){
    for(const r of op){
      if(r.health<35||Math.random()>=typeOf(r).poach)continue;
      const tgt=[...S.staff].sort((a,b)=>(b.lv*2+b.spd+b.srv)-(a.lv*2+a.spd+a.srv))[0];
      if(tgt){S.incidents.push({id:S.nid++,kind:'poach',rival:r.id,staff:tgt.id,day:S.day});break}
    }
  }
  /* 常連さんの引き抜き（相手がイベント・新台・オープンの日） */
  for(const r of op){
    if(!(r.ev||r.evKind==='newm'||r.evKind==='go')||Math.random()>0.06)continue;
    const cand=REG_DEFS.filter(d=>{const st=S.regs[d.id];return st.met&&st.st!=='gone'&&!st.away&&st.loy<60});
    if(!cand.length)break;
    const d=pick(cand),st=S.regs[d.id];
    st.away={rival:r.id,name:r.name,until:S.day+rndi(5,9)};st.loy=clamp(st.loy-8,0,100);
    news(`${d.name}が${r.name}に通い始めたらしい…`,'bad');
    R.morning.push({kind:'regAway',title:'常連さんが浮気…',sub:`${d.name}が${r.name}へ`,talk:[{who:'reg:'+d.id,ex:'n',text:`${r.name}、${RIV_EV_LABEL[r.evKind]||'イベント'}だっていうから、しばらくあっちで打ってみるよ`},{who:'me',text:'（また戻ってきてもらえるように、店を磨かないと…）'}]});
    break;
  }
  /* 店長のひとこと・大手の増台 */
  for(const r of op){
    const B=bossOf(r),T=typeOf(r);
    if(Math.random()<0.04){const s=rivalSay(r);news(`${B.name}（${r.name}）「${s.text}」`)}
    if(r.type==='chain'&&S.day>30&&r.health>75&&r.size+10<=rivalSizeCap(r)&&Math.random()<0.008){const n=rndi(1,2)*10;r.size+=n;news(`${r.name}が${n}台増台。勢いがある`,'bad')}
  }
}

/* ---------- 偵察 ---------- */
function scoutSnapshot(r,lv){
  const fc=forecast(),noise=lv>=2?0.01:0.03;
  return {day:S.day,until:S.day+7,lv,pay:clamp(rivalPayout(r)+rnd(-noise,noise),0.75,1.08),vis:Math.round(LOCS[G.loc].town*fc.info.mult*(fc.shares[r.id]||0)),
    nextEv:nextPatDay(r),newm:r.type==='chain'?r.newmDay:null,health:Math.round(r.health)};
}
const scoutOn=r=>r.scout&&S.day<=r.scout.until;
function scoutByStaff(r){
  if(S.money<SCOUT_COST)return {err:'お金が足りません'};
  if(r.scout&&r.scout.day===S.day)return {err:'今日はもうこの店を偵察しました'};
  const s=pick(S.staff);if(!s)return {err:'偵察に行ける店員がいません'};
  S.money-=SCOUT_COST;
  const lv=scoutOn(r)?Math.max(1,r.scout.lv):1;
  r.scout=scoutSnapshot(r,lv);
  const sc=r.scout,pct=Math.round(sc.pay*100);
  return {lines:[
    {who:'staff:'+s.id,ex:'happy',text:`${r.name}、見てきました！ 還元率はだいたい${pct}%くらいだと思います`},
    {who:'staff:'+s.id,ex:sc.vis>120?'shock':'n',text:`お客さんは1日${sc.vis}人くらい。${sc.nextEv?`次のイベントは${dateStr(sc.nextEv)}みたいです`:'イベントの予定はわかりませんでした'}${sc.newm?`。新台入替は${dateStr(sc.newm)}ごろ`:''}`},
    {who:'staff:'+s.id,ex:r.health<30?'smug':'n',text:r.health<30?'店員さんたち、元気がなかったです。経営、苦しいのかも':r.health>70?'すごく活気がありました。手ごわいです…':'まあまあの入りでした'},
  ]};
}
function scoutBySelf(r){
  if(S.selfScout===S.day)return {err:'自分で打ちに行けるのは1日1回です'};
  S.selfScout=S.day;
  r.scout=scoutSnapshot(r,2);
  const B=bossOf(r),sc=r.scout;
  const res=Math.round(((sc.pay-1)*40000+rnd(-30000,30000))/1000)*1000;
  S.money+=res;
  return {res,lines:[
    {who:'narr',text:`${r.name}で実際に打ってみた。収支は${sgn(res)}。`},
    {who:'boss:'+B.id,ex:B.ex,text:pick(B.scout)},
    {who:'me',text:`（還元率は${Math.round(sc.pay*100)}%前後…。弱点は「${WEAK_TXT[B.weak]}」ことか）`},
    {who:'me',text:`（うちで${SEG_NAME[B.weak]}を増やせば、この店のお客さんを奪いやすいはずだ）`},
  ]};
}

/* ---------- 引き抜きの相談 ---------- */
function poachOdds(s){return clamp(0.35+0.08*(s.lv-1)+(S.trust>=60?0.1:0),0.2,0.9)}
const raiseCost=s=>Math.round(s.wage*0.3/100)*100;
function resolvePoach(inc,choice){
  S.incidents=S.incidents.filter(x=>x.id!==inc.id);
  const s=S.staff.find(x=>x.id===inc.staff),r=S.rivals.find(x=>x.id===inc.rival);
  if(!s)return null;
  let stay=false;
  if(choice==='raise'){s.wage+=raiseCost(s);stay=true}
  else if(choice==='talk')stay=Math.random()<poachOdds(s);
  if(!stay){
    S.staff=S.staff.filter(x=>x!==s);
    if(r){r.rep=clamp(r.rep+2,5,95);r.health=clamp(r.health+4,-5,100)}
    news(`${s.name}が${r?r.name:'ライバル店'}に移った`,'bad');
  }else if(choice==='talk')news(`${s.name}が「やっぱりこの店でがんばります」と残ってくれた`,'good');
  return {stay,s};
}
