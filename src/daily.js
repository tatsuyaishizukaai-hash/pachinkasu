/* ===== daily.js : 朝礼の目標・月末決算・町のホールアワード・季節のイベント・周年祭 ===== */

/* ---------- 朝礼の目標（毎朝3つ） ----------
   grp … num：数字の目標 / svc：接客・店内の目標 / x：そのほか
   live … 営業中の途中経過（'ok' 達成 / 'ng' 失敗 / null まだ）。fin … 閉店のときの判定 */
const NO_COMPLAINT=keys=>({live:()=>keys.some(k=>D.reasons[k])?'ng':null,fin:()=>!keys.some(k=>D.reasons[k])});
function recentHist(n){return S.hist.slice(-n)}
const recentUtil=()=>{const h=recentHist(7).filter(x=>x.util!=null);return h.length?avgOf(h.map(x=>x.util)):0.4};
const recentFull=()=>{const h=recentHist(7).filter(x=>x.full!=null);return h.length?avgOf(h.map(x=>x.full)):0};
const newMs=()=>machines().filter(m=>m.installDay>0&&m.installDay>=S.day-3);
const MISSIONS={
  vis:{grp:'num',make(){const e=forecast().expected;return {t:Math.max(20,Math.round(e*rnd(1.0,1.1)/5)*5)}},
    label:m=>`来店${m.t}人以上`,short:m=>`来店${m.t}`,live:m=>D.visitors>=m.t?'ok':null,prog:m=>`${D.visitors}/${m.t}`,fin:(m,R)=>R.visitors>=m.t},
  util:{grp:'num',make(){const u=recentUtil();return {t:clamp(Math.round((u+rnd(0.02,0.07))*100)/100,0.15,0.85)}},
    label:m=>`稼働率${Math.round(m.t*100)}%以上`,short:m=>`稼働${Math.round(m.t*100)}%`,fin:(m,R)=>R.util>=m.t},
  gross:{grp:'num',can:()=>!goActive()&&S.day>3,make(){const q=S.story&&S.story.quota,base=q?q.dt:150000;return {t:Math.max(30000,Math.round(base*rnd(1.0,1.15)/10000)*10000)}},
    label:m=>`粗利${man(m.t)}以上`,short:m=>`粗利${man(m.t)}`,prog:m=>man(D.coin-D.out+D.exch),fin:(m,R)=>R.gross>=m.t},
  drink:{grp:'num',can:()=>hasDecor('vending'),make:()=>({t:pick([3000,4500,6000])}),
    label:m=>`自販機の売上${yen(m.t)}以上`,short:m=>`自販機${m.t/1000}千円`,live:m=>D.drink>=m.t?'ok':null,prog:m=>yen(D.drink),fin:(m,R)=>R.drink>=m.t},
  full:{grp:'svc',can:()=>recentFull()>=1,make:()=>({t:Math.max(0,Math.floor(recentFull()*0.35))}),
    label:m=>m.t?`満席で帰るお客さんを${m.t}人以下に`:'満席で帰るお客さんをゼロに',short:m=>m.t?`満席${m.t}人まで`:'満席0',live:m=>D.full>m.t?'ng':null,prog:m=>`${D.full}人`,fin:(m,R)=>R.full<=m.t},
  wait:Object.assign({grp:'svc',label:()=>'呼び出しで待たせない',sub:'「店員がなかなか来ない」の声を0件に',short:()=>'待たせない'},NO_COMPLAINT(['waitStaff'])),
  clean:Object.assign({grp:'svc',label:()=>'床をきれいに保つ',sub:'「床にゴミ」の声を0件に',short:()=>'床きれい'},NO_COMPLAINT(['dirty'])),
  counter:Object.assign({grp:'svc',can:()=>hasDecor('counter'),label:()=>'景品交換で待たせない',sub:'「交換できない」「カウンターが混んでた」の声を0件に',short:()=>'交換待ち0'},NO_COMPLAINT(['noCounter','counterWait'])),
  toilet:Object.assign({grp:'svc',can:()=>hasDoor('toilet'),label:()=>'トイレで待たせない',sub:'「トイレが混んでた」「トイレがない」の声を0件に',short:()=>'トイレ待ち0'},NO_COMPLAINT(['toiletWait','noToilet'])),
  smoke:Object.assign({grp:'svc',label:()=>'たばこの不満をゼロに',sub:'煙・吸う場所についての声を0件に',short:()=>'たばこ0'},NO_COMPLAINT(['smokeIn','smokeDrift','noSmoke'])),
  sat:{grp:'svc',label:()=>'お客さんの満足度をプラスに',sub:'帰ったお客さんの満足度の平均',short:()=>'満足度+',prog:()=>D.satN?(D.satSum/D.satN>0.05?'いい感じ':'足りない'):'',fin:(m,R)=>R.avgSat>0.05},
  newm:{grp:'x',can:()=>newMs().length>0,make:()=>({t:0.8,ids:newMs().map(m=>m.id)}),
    label:()=>'新台の稼働率80%以上',sub:'入れたばかりの台を、しっかり打ってもらう',short:()=>'新台80%',
    fin:m=>{const ms=machines().filter(x=>m.ids.includes(x.id)&&x.yest);return ms.length>0&&avgOf(ms.map(x=>x.yest.mins/(LAST-OPEN)))>=m.t}},
  pay:{grp:'x',can:()=>S.day>5,label:()=>'出玉率を94〜100%におさめる',sub:'出しすぎず、渋すぎず',short:()=>'出玉94-100%',fin:(m,R)=>R.payR>=0.94&&R.payR<=1.0},
  regs:{grp:'x',can:()=>Object.values(S.regs).some(r=>r.met&&r.st!=='gone'),label:()=>'来てくれた常連さん全員に満足してもらう',sub:'常連さんが1人も来なかったら失敗',short:()=>'常連満足',
    fin:()=>D.regsVisited.length>0&&D.regsVisited.every(id=>S.regs[id].daySat>=0)},
  fix:{grp:'x',can:()=>machines().some(m=>S.day-m.installDay>40),label:()=>'故障した台を閉店までに全部直す',sub:'ホール係が多いと早く直せます',short:()=>'故障0',fin:(m,R)=>R.brokenLeft===0},
};
const missionReward=()=>10000*(1+rankNo());
function makeMissions(){
  const can=Object.entries(MISSIONS).filter(([k,d])=>!d.can||d.can());
  const by=g=>can.filter(([k,d])=>d.grp===g);
  const out=[],used=new Set();
  const take=list=>{const l=list.filter(([k])=>!used.has(k));if(!l.length)return;const [k,d]=pick(l);used.add(k);out.push(Object.assign({k,st:null},d.make?d.make():{}))};
  take(by('num'));take(by('svc'));take(Math.random()<0.5?by('x'):can);
  while(out.length<3&&used.size<can.length)take(can);
  S.missions={day:S.day,list:out,rerolled:false,res:null};
}
function ensureMissions(){if(!S.missions||S.missions.day!==S.day)makeMissions()}
function rerollMission(i){
  const ms=S.missions;if(!ms||ms.rerolled||S.phase!=='prep')return false;
  const used=new Set(ms.list.map(m=>m.k));
  const can=Object.entries(MISSIONS).filter(([k,d])=>!used.has(k)&&(!d.can||d.can()));
  if(!can.length)return false;
  const [k,d]=pick(can);ms.list[i]=Object.assign({k,st:null},d.make?d.make():{});ms.rerolled=true;return true;
}
const mDef=m=>MISSIONS[m.k];
const mLabel=m=>mDef(m).label(m);
const mShort=m=>mDef(m).short(m);
function mLive(m){
  if(S.phase!=='open'||!D)return null;
  const d=mDef(m);return d.live?d.live(m):null;
}
/* 閉店のときに判定してごほうびを出す */
function judgeMissions(R){
  const ms=S.missions;if(!ms||ms.day!==S.day){R.missions=null;return}
  let n=0;const each=missionReward();
  for(const m of ms.list){let ok=false;try{ok=!!mDef(m).fin(m,R)}catch(e){ok=false}m.st=ok?'ok':'ng';if(ok)n++}
  let money=n*each,bonus=0;
  if(n===3){bonus=Math.round(each*1.5);S.trust=clamp(S.trust+1,0,100);S.missStreak=(S.missStreak||0)+1;
    if(S.missStreak%7===0)news(`朝礼の目標を${S.missStreak}日連続で全部達成！`,'good')}
  else S.missStreak=0;
  S.money+=money+bonus;
  ms.res={n,money,bonus};
  R.missions={list:ms.list.map(m=>({label:mLabel(m),ok:m.st==='ok'})),n,money,bonus,streak:S.missStreak||0};
  if(S.mon)S.mon.mis+=n,S.mon.misT+=3;
}
/* 朝礼で話す人（いちばんベテランの店員）とひとこと */
function choreiSpeaker(){
  const s=[...S.staff].sort((a,b)=>b.lv-a.lv||a.hired-b.hired)[0];
  return s?'staff:'+s.id:'owner';
}
function choreiLine(){
  const info=dayInfo(S.day),riv=openRivals().filter(r=>r.evKind),an=annivInfo(),se=seasonInfo(S.day);
  if(goActive())return ['happy',`${goLabel(S.go)}の${goDayIdx()+1}日目です！ ミスのないように、気合い入れていきましょう！`];
  if(an&&!an.held)return ['happy',`今日で開店${S.day-G.openDay}日目です！ ${an.label}、やりましょうよ！`];
  if(se)return ['happy',`${se.name.replace(/(大感謝祭|特別営業|初打ち)$/,'')}です！ 町じゅうのお客さんが打ちに来ますよ！`];
  if(S.event.type!=='none')return ['happy',`今日は「${eventLabel()}」！ お客さんとの約束、守りましょう！`];
  if(riv.length)return ['sad',`今日は${riv[0].name}が${RIV_EV_LABEL[riv[0].evKind]}です…。負けられませんね`];
  if(S.weather.today==='rain')return ['n','雨なのでお客さんは多めかもです。床が汚れやすいので、掃除は任せてください！'];
  if(info.tags.includes('年金支給日'))return ['happy','今日は年金の日！ 1円パチのお客さんが朝から来ますよ'];
  if(info.tags.includes('給料日'))return ['happy','今日は給料日！ 夕方から会社帰りのお客さんが増えそうです'];
  return ['happy',pick(['おはようございます！ 今日もよろしくお願いします！','今日も1日、がんばりましょう！','いい天気ですね。お客さん、たくさん来るといいな'])];
}

/* ---------- 月末決算（月ごとの集計） ---------- */
function newMon(day){const d=dateOf(day);return {y:d.getFullYear(),m:d.getMonth()+1,days:0,coin:0,out:0,exch:0,drink:0,rent:0,wages:0,power:0,ad:0,repairs:0,interest:0,goto:0,net:0,visitors:0,full:0,uSum:0,best:null,worst:null,red:0,ev:0,hot:0,gase:0,mis:0,misT:0,mach:{},netDays:[],shares:{}}}
function monAcc(R){
  const d=dateOf(R.day);
  if(!S.mon||S.mon.y!==d.getFullYear()||S.mon.m!==d.getMonth()+1)S.mon=newMon(R.day);
  const M=S.mon;
  M.days++;for(const k of ['coin','out','exch','drink','rent','wages','power','ad','repairs','interest','goto','net','visitors','full'])M[k]+=R[k]||0;
  M.uSum+=R.util;
  if(!M.best||R.net>M.best.net)M.best={day:R.day,net:Math.round(R.net)};
  if(!M.worst||R.net<M.worst.net)M.worst={day:R.day,net:Math.round(R.net)};
  if(R.net<0)M.red++;
  M.netDays.push(Math.round(R.net));
  if(R.ev){M.ev++;if(R.ev.judge==='激アツ')M.hot++;if(R.ev.judge==='ガセ')M.gase++}
  for(const m of machines()){if(!m.yest)continue;const e=M.mach[m.id]||(M.mach[m.id]={no:m.no,type:m.type,store:0,mins:0,days:0});e.no=m.no;e.type=m.type;e.store+=m.yest.coin-m.yest.out;e.mins+=m.yest.mins;e.days++}
  const sh=D.shares||{};M.shares.me=(M.shares.me||0)+(sh.me||0);
  for(const r of openRivals()){const k=String(r.id);M.shares[k]=(M.shares[k]||0)+(sh[r.id]||0)}
}
/* 月の決算書を作る（査定と同じタイミング） */
function monthPL(){
  const M=S.mon;if(!M||!M.days)return null;
  const gross=M.coin-M.out+M.exch;
  const mach=Object.values(M.mach);
  const byType={};for(const e of mach){const t=byType[e.type]||(byType[e.type]={type:e.type,store:0,mins:0,days:0,n:0});t.store+=e.store;t.mins+=e.mins;t.days+=e.days;t.n++}
  const types=Object.values(byType).map(t=>Object.assign(t,{util:t.days?t.mins/(t.days*(LAST-OPEN)):0}));
  const earner=types.slice().sort((a,b)=>b.store-a.store)[0]||null;
  const popular=types.slice().sort((a,b)=>b.util-a.util)[0]||null;
  const giver=mach.slice().sort((a,b)=>a.store-b.store)[0]||null;
  const rivals=Object.entries(M.shares).filter(([k])=>k!=='me').map(([k,v])=>{const r=S.rivals.find(x=>String(x.id)===k);return r?{name:r.name,col:r.col,boss:r.boss,share:v/M.days}:null}).filter(Boolean).sort((a,b)=>b.share-a.share);
  const prev=S.monPrev||null;
  const div=S.regFx&&S.regFx.kanedaInv&&M.net>0?Math.round(M.net*0.05/1000)*1000:0;
  if(div){S.money-=div;M.net-=div}
  const pl={y:M.y,m:M.m,days:M.days,coin:M.coin,out:M.out,exch:M.exch,drink:M.drink,gross,rent:M.rent,wages:M.wages,power:M.power,ad:M.ad,repairs:M.repairs,interest:M.interest,goto:M.goto,net:M.net,
    visitors:M.visitors,full:M.full,util:M.uSum/M.days,best:M.best,worst:M.worst,red:M.red,ev:M.ev,hot:M.hot,gase:M.gase,mis:M.mis,misT:M.misT,netDays:M.netDays.slice(),
    share:(M.shares.me||0)/M.days,rivals,earner:earner&&{name:MB[earner.type].name,store:earner.store,n:earner.n},popular:popular&&{name:MB[popular.type].name,util:popular.util,n:popular.n},
    giver:giver&&giver.store<0?{no:giver.no,name:MB[giver.type].name,cust:-giver.store}:null,prevNet:prev?prev.net:null,prevVis:prev?prev.visitors:null,div};
  S.monPrev={net:pl.net,visitors:pl.visitors};
  return pl;
}

/* ---------- 町のホールアワード（毎年12月31日） ----------
   総合（町のシェア）・稼働王（1台あたりのお客さんの数）・還元王（出玉率）・接客王（評判）の4部門 */
const AWARD_CATS=[
  {k:'share',name:'総合大賞',desc:'町のシェアがいちばん大きい店',prize:3000000,fmt:v=>Math.round(v*100)+'%'},
  {k:'vpm',name:'稼働王',desc:'1台あたりのお客さんがいちばん多い店',prize:1000000,fmt:v=>v.toFixed(1)+'人/台'},
  {k:'pay',name:'還元王',desc:'出玉率がいちばん高い店',prize:1000000,fmt:v=>Math.round(v*1000)/10+'%'},
  {k:'rep',name:'接客王',desc:'評判がいちばん高い店',prize:1000000,fmt:v=>Math.round(v)},
];
function yrAcc(R){
  const y=dateOf(R.day).getFullYear();
  if(!S.yr||S.yr.y!==y)S.yr={y,me:{n:0,share:0,vpm:0,pay:0,rep:0},riv:{}};
  const Y=S.yr,me=Y.me,n=Math.max(1,machines().length),info=dayInfo(R.day);
  me.n++;me.share+=R.share;me.vpm+=R.visitors/n;me.pay+=R.payR;me.rep+=S.rep;
  for(const r of openRivals()){
    const e=Y.riv[r.id]||(Y.riv[r.id]={name:r.name,boss:r.boss,col:r.col,n:0,share:0,vpm:0,pay:0,rep:0});
    const sh=(D.shares&&D.shares[r.id])||0,vis=LOCS[G.loc].town*info.mult*sh;
    e.name=r.name;e.n++;e.share+=sh;e.vpm+=vis/Math.max(10,r.size);e.pay+=rivalPayout(r);e.rep+=r.rep;
  }
}
function holdAwards(){
  const Y=S.yr;if(!Y||!Y.me.n)return null;
  const avg=e=>({share:e.share/e.n,vpm:e.vpm/e.n,pay:e.pay/e.n,rep:e.rep/e.n});
  const rows=[{name:S.name,me:true,...avg(Y.me)}];
  for(const e of Object.values(Y.riv))if(e.n>=30)rows.push({name:e.name,boss:e.boss,col:e.col,...avg(e)});
  const cats=AWARD_CATS.map(c=>{const sorted=rows.slice().sort((a,b)=>b[c.k]-a[c.k]);return {k:c.k,name:c.name,desc:c.desc,prize:c.prize,fmt:c.fmt,win:sorted[0],place:sorted.findIndex(r=>r.me)+1,me:sorted.find(r=>r.me),list:sorted.slice(0,4)}});
  let prize=0;const wins=[];
  for(const c of cats)if(c.win.me){prize+=c.prize;wins.push(c.name)}
  S.money+=prize;
  if(wins.length){S.rep=clamp(S.rep+2*wins.length,0,100);S.trust=clamp(S.trust+2*wins.length,0,100)}
  const res={y:Y.y,cats,prize,wins,n:rows.length};
  S.awards=(S.awards||[]).concat([{y:Y.y,wins,places:cats.map(c=>c.place)}]);
  news(`${Y.y}年 町のホールアワード：${wins.length?wins.join('・')+'を受賞！':'受賞ならず'}`,wins.length?'good':'');
  return res;
}
function awardTownTalk(res){
  const L=[{who:'mc',ex:'happy',text:`${res.y}年も残りわずか！ 町のホールアワードの発表です！`}];
  for(const c of res.cats){
    L.push({who:'mc',ex:'n',text:`${c.name}は……「${c.win.name}」！（${c.fmt(c.win[c.k])}）`});
    if(c.win.me)L.push({who:'me',ex:'happy',text:pick(['やった……！','ありがとうございます！','お客さんのおかげです！'])});
    else if(c.win.boss&&BOSS_BY[c.win.boss])L.push({who:'boss:'+c.win.boss,ex:'smug',text:pick(BOSS_BY[c.win.boss].taunt)});
  }
  if(res.wins.length)L.push({who:'owner',ex:'happy',text:res.wins.length>=3?'ほとんど総なめじゃないか……！ 大したもんだよ':'よくやったね。来年はもっと取りな'});
  else L.push({who:'owner',ex:'n',text:'今年は取れなかったね。来年こそ、うちの名前を呼ばせな'});
  return L;
}

/* ---------- 季節のイベント（GW・お盆・年末・正月） ---------- */
function seasonInfo(day){
  const d=dateOf(day),m=d.getMonth()+1,dd=d.getDate();
  if((m===4&&dd>=29)||(m===5&&dd<=6))return {key:'gw',name:'GW大感謝祭'};
  if(m===8&&dd>=13&&dd<=16)return {key:'bon',name:'お盆特別営業'};
  if(m===12&&dd>=29)return {key:'nenmatsu',name:'年末大感謝祭'};
  if(m===1&&dd<=3)return {key:'shinshun',name:'新春初打ち'};
  return null;
}
const SEASON_COST=100000;

/* ---------- 周年祭（開店100日・1周年・2周年…） ---------- */
function annivInfo(){
  const days=S.day-(G.openDay||1),done=G.annivDone||[];
  const marks=[100];for(let k=1;k<=5;k++)marks.push(365*k);
  for(const n of marks){
    if(days>=n&&days<=n+6){
      const label=n===100?'開店100日記念祭':`${n/365}周年祭`;
      return {n,label,held:done.includes(n)||(S.go&&S.go.type==='anniv'&&S.go.n===n),left:n+6-days};
    }
  }
  return null;
}
const ANNIV_COST=300000;
const GO_NAMES={grand:'グランドオープン',renewal:'リニューアルオープン',anniv:'周年祭'};
const goLabel=g=>g&&(g.label||GO_NAMES[g.type])||'';

/* ---------- お店の飾り（季節・オープン期間） ---------- */
function decoKind(){
  const d=dateOf(S.day),m=d.getMonth()+1,dd=d.getDate();
  return {
    kadomatsu:(m===12&&dd>=28)||(m===1&&dd<=7),
    koinobori:(m===4&&dd>=22)||(m===5&&dd<=6),
    chochin:m===8&&dd>=8&&dd<=20,
    xmas:m===12&&dd>=18&&dd<=25,
    hanawa:goActive()||(S.go&&S.day===S.go.start),
    kohaku:!!(S.go&&S.go.type==='anniv'&&goActive()),
  };
}
function drawSeasonDeco(now){
  const k=decoKind(),gw=G.W*TS,gy=OY+G.H*TS,d=doorPos(),mx=OX+d.x*TS;
  /* 紅白幕（周年祭） */
  if(k.kohaku){for(let x=OX;x<OX+gw;x+=4)R(x,OY-6,4,5,((x-OX)/4)%2<1?'#ef4444':'#fff');R(OX,OY-7,gw,1,'#7f1d1d');for(let x=OX+8;x<OX+gw;x+=24){R(x,OY-8,3,3,'#facc15')}}
  /* 提灯（夏） */
  if(k.chochin){R(OX,OY-9,gw,0.6,'#3f3f46');for(let x=OX+6;x<OX+gw-4;x+=20){const sw=Math.sin(now/700+x)*0.6;R(x-2+sw,OY-9,5,7,K);R(x-1+sw,OY-8,3,5,'#ef4444');R(x-1+sw,OY-7,3,1,'#fca5a5');R(x-1+sw,OY-5,3,1,'#fff7ed')}}
  /* こいのぼり（GW）：右上の壁 */
  if(k.koinobori){
    const px=OX+gw-34,t=now/260;
    R(px,1,1,20,'#78350f');R(px-1,0,3,2,'#facc15');
    [['#ef4444',3],['#2563eb',8],['#111827',13]].forEach(([c,y],i)=>{
      const w=12-i*1.5;for(let j=0;j<w;j++){const yy=y+Math.sin(t+j*0.6+i)*0.8;R(px+1+j,yy,1,3.5,c)}
      R(px+2,y+0.5,2,2,'#fff');R(px+2.5,y+1,1,1,K);R(px+1+w-2,y+Math.sin(t+w*0.6+i)*0.8,2,3.5,shade(c,.25));
    });
  }
  /* 門松（正月）：入口の両わき */
  if(k.kadomatsu)for(const sx of [mx-10,mx+TS+3]){
    R(sx-1,gy-11,9,12,K);R(sx,gy-4,7,5,'#a16207');R(sx,gy-4,7,1,'#d97706');
    R(sx+1,gy-10,1.6,7,'#16a34a');R(sx+3,gy-12,1.6,9,'#22c55e');R(sx+5,gy-9,1.6,6,'#15803d');
    R(sx+1,gy-10,1.6,0.6,'#bbf7d0');R(sx+3,gy-12,1.6,0.6,'#bbf7d0');R(sx+5,gy-9,1.6,0.6,'#bbf7d0');
    R(sx-0.5,gy-6,2,2,'#dc2626');R(sx+6,gy-7,2,2,'#dc2626');
  }
  /* クリスマスツリー */
  if(k.xmas){const sx=mx+TS+4;R(sx+3,gy-2,2,3,'#78350f');for(let i=0;i<4;i++)R(sx+3-i,gy-12+i*2.5,2+i*2,3,'#15803d');const b=Math.floor(now/400)%2;R(sx+3.5,gy-14,1,1.5,'#facc15');R(sx+1,gy-7,1,1,b?'#ef4444':'#fde047');R(sx+5,gy-5,1,1,b?'#38bdf8':'#ef4444');R(sx+3,gy-9,1,1,b?'#fde047':'#38bdf8')}
  /* 花輪（オープン期間）：入口の両わきの道に */
  if(k.hanawa&&!k.kadomatsu)for(const [sx,c] of [[mx-15,'#f472b6'],[mx+TS+4,'#facc15']]){
    R(sx+4.5,gy-4,1,BOT+3,'#78350f');R(sx+1,gy+BOT-2,9,1,'#78350f');
    R(sx-0.5,gy-16,12,12,K);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;R(sx+5.5+Math.cos(a)*4-1.2,gy-10+Math.sin(a)*4-1.2,2.4,2.4,i%2?c:'#fff')}
    R(sx+3,gy-12,5,5,'#fff');R(sx+3.8,gy-11.2,3.4,3.4,'#ef4444');txt('祝',sx+5.5,gy-9.6,3,'#fff');
    R(sx+2,gy-4,7,6,'#fff');R(sx+2.5,gy-3.5,6,5,'#fef9c3');txt(S.go&&S.go.type==='anniv'?'祭':'開店',sx+5.5,gy-1,2.2,'#b91c1c');
  }
}
