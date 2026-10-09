/* ===== growth.js : 店長のレベルとスキル・店員の育成と相談ごと・常連さんの物語・店のコンセプト ===== */

/* ================= 店長のレベルとスキル ================= */
const expNeed=lv=>60+lv*lv*40;            /* lv から lv+1 に必要な経験値 */
const SKILLS=[
  {id:'kugi',name:'釘読み',col:'#2563eb',lv:['釘を締めても見切られにくい','釘を開けた台でお客さんがもっと喜ぶ','釘への不満がほとんど出ない']},
  {id:'data',name:'データ分析',col:'#0891b2',lv:['朝礼で、今日の来店の見込みがわかる','朝礼で、多い客層とライバルの次のイベント日もわかる','店員の偵察がタダになり、1日2回できる']},
  {id:'aori',name:'煽り上手',col:'#db2777',lv:['イベントの客足 +8%・告知や飾りつけの費用 −20%','イベントの客足 +16%・費用 −40%','イベントの客足 +24%・費用 −60%']},
  {id:'kosho',name:'交渉上手',col:'#ca8a04',lv:['台と設備が5%安く買える・売るときは10%高く','10%安く・20%高く','15%安く・30%高く']},
  {id:'jinbo',name:'人望',col:'#16a34a',lv:['店員の給料 −5%・引き抜かれにくい・研修費 −20%','給料 −10%・研修費 −40%','給料 −15%・研修費 −60%・やる気が下がりにくい']},
  {id:'omote',name:'おもてなし',col:'#f97316',lv:['お客さんの満足度が少し上がる・呼び出しの対応が早い','満足度がもっと上がる','満足度が大きく上がる']},
  {id:'bouhan',name:'防犯の目',col:'#475569',lv:['ゴト師を見つけやすい（1.5倍）・被害 −20%','見つけやすさ2倍・被害 −40%','見つけやすさ2.5倍・被害 −60%']},
  {id:'zaimu',name:'資金繰り',col:'#7c3aed',lv:['借りられる上限 +25%・利息 −20%','上限 +50%・利息 −40%','上限 +75%・利息 −60%']},
];
const SKB=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
const sk=id=>(S.mgr&&S.mgr.sk[id])||0;
function initMgr(){S.mgr={lv:1,exp:0,sp:0,sk:{},newLv:[],total:0}}
function gainExp(n){
  if(!S.mgr)initMgr();
  const M=S.mgr;n=Math.max(0,Math.round(n));M.exp+=n;M.total+=n;
  while(M.exp>=expNeed(M.lv)&&M.lv<60){M.exp-=expNeed(M.lv);M.lv++;M.sp++;M.newLv.push(M.lv);news(`店長レベルが${M.lv}に上がった！ スキルポイント+1`,'good')}
  return n;
}
function learnSkill(id){
  const M=S.mgr,r=sk(id);
  if(!SKB[id]||r>=3)return 'これ以上は覚えられません';
  if(M.sp<1)return 'スキルポイントが足りません';
  M.sp--;M.sk[id]=r+1;return null;
}
/* レベルアップの知らせ（会話や日報のあとに出す） */
function levelUpStep(){
  return done=>{
    const M=S.mgr;if(!M||!M.newLv.length){done();return}
    const lv=Math.max(...M.newLv);M.newLv=[];
    telop(`店長レベル ${lv}！`,'スキルポイントで店長スキルを覚えよう（経営 → 店長）','good');sfx('fanfare');inputBlock(2000);setTimeout(done,1900);
  };
}
/* 1日の経験値 */
function dayExp(R){
  let n=8+Math.floor(R.visitors/25);
  if(R.ev&&R.ev.cls==='good')n+=15;
  if(R.go&&R.go.final&&R.go.final.cls==='good')n+=40;
  if(R.missions)n+=R.missions.n*10+(R.missions.n===3?15:0);
  if(R.story&&R.story.month&&R.story.month.pass)n+=R.story.month.perfect?100:50;
  if(R.rivalClosures&&R.rivalClosures.length)n+=120*R.rivalClosures.length;
  if(R.award)n+=80*R.award.wins.length;
  if(R.story)n+=300*R.story.steps.filter(s=>s.telop&&/クリア/.test(s.telop[0])).length;
  R.exp=gainExp(n);
}

/* スキルの効果 */
const skPrice=()=>(1-0.05*sk('kosho'))*(S.regFx&&S.regFx.sato?0.95:1);
const skSell=()=>1+0.1*sk('kosho');
const skAd=()=>1-0.2*sk('aori');
const skEv=()=>0.08*sk('aori');
const skWage=()=>1-0.05*sk('jinbo');
const skTrain=()=>1-0.2*sk('jinbo');
const skSat=()=>0.025*sk('omote');
const skGoto=()=>1+0.5*sk('bouhan');
const skGotoLoss=()=>1-0.2*sk('bouhan');
const skLoan=()=>1+0.25*sk('zaimu');
const skRate=()=>1-0.2*sk('zaimu');

/* ================= 店員の性格・やる気・役職 ================= */
const PERS={
  majime:{name:'真面目',desc:'遅刻もサボりもしない。育ち方はふつう',grow:1,late:0.1,fight:0.4,poach:1,spd:0,srv:0},
  genki:{name:'元気',desc:'接客が上手で、いい提案をくれる。たまに寝坊する',grow:1,late:0.8,fight:0.8,poach:1,spd:0,srv:0.5},
  nonbiri:{name:'のんびり',desc:'動きはゆっくり。でも、ケンカはしない',grow:0.9,late:1,fight:0,poach:0.6,spd:-0.5,srv:0.3},
  yashin:{name:'野心家',desc:'育つのが早い。でも引き抜かれやすく、お給料にうるさい',grow:1.5,late:0.4,fight:1.2,poach:2,spd:0.3,srv:0},
  ochoshi:{name:'お調子者',desc:'ムードメーカー。ときどき遅刻する',grow:1.1,late:2.5,fight:0.8,poach:1,spd:0,srv:0.3},
  shokunin:{name:'職人気質',desc:'修理も掃除も早い。人づきあいは苦手',grow:1,late:0.3,fight:1.5,poach:0.8,spd:0.5,srv:-0.3},
};
const PERS_KEYS=Object.keys(PERS);
const TITLES={shunin:{name:'主任',need:5,wage:2000,max:2,team:0.05},fuku:{name:'副店長',need:8,wage:4000,max:1,team:0.08}};
const STAFF_MAX_LV=10;
const staffName=s=>(s.title?TITLES[s.title].name+' ':'')+s.name;
function fixStaff(s){
  if(!s.pers)s.pers=PERS_KEYS[hashN(s.id*7+3)%PERS_KEYS.length];
  if(s.exp==null)s.exp=0;if(s.mor==null)s.mor=70;if(s.title==null)s.title='';
}
const moraleF=s=>0.85+0.3*clamp(s.mor,0,100)/100;
/* 主任・副店長がいると、店員みんなの動きが少し良くなる */
function teamF(){let f=1;for(const s of S.staff)if(s.title)f+=TITLES[s.title].team;return f}
function staffSpeed(s){const P=PERS[s.pers]||PERS.majime;return (0.7+(s.spd+P.spd)*0.08)*moraleF(s)*teamF()*(s.fightDay===S.day?0.8:1)}
const staffSrv=s=>clamp(s.srv+(PERS[s.pers]||PERS.majime).srv,0.5,6);
const canTitle=(s,t)=>{const T=TITLES[t];if(s.lv<T.need)return false;if(t==='fuku'&&s.title!=='shunin')return false;return S.staff.filter(x=>x.title===t).length<T.max};
function promote(s,t){if(!canTitle(s,t))return false;if(s.title)s.wage-=TITLES[s.title].wage;s.title=t;s.wage+=TITLES[t].wage;s.mor=clamp(s.mor+15,0,100);return true}
/* 閉店のあと：仕事の量で経験値、やる気の動き */
function staffEndDay(R){
  R.staffUps=[];
  for(const a of staffA){
    const s=a.s;if(!S.staff.includes(s))continue;fixStaff(s);
    const P=PERS[s.pers]||PERS.majime;
    s.exp+=(5+(a.done||0)*0.6)*P.grow;
    while(s.lv<STAFF_MAX_LV&&s.exp>=40*s.lv){s.exp-=40*s.lv;s.lv++;if((s.lv%2===0||s.srv>=5)&&s.spd<5)s.spd++;else if(s.srv<5)s.srv++;s.wage+=300;R.staffUps.push(staffName(s)+` がLv${s.lv}に`)}
    const keep=sk('jinbo')>=3?0.5:1;
    s.mor=clamp(s.mor+(62-s.mor)*0.06+(R.missions&&R.missions.n===3?3:0)+(R.ev&&R.ev.cls==='good'?2:0)-(R.ev&&R.ev.cls==='bad'?3*keep:0),0,100);
  }
}

/* ---------- 店員の相談ごと（朝） ----------
   late 遅刻・fight ケンカ・raise 昇給の相談・idea 提案・quit 辞めたい */
const IDEAS=[
  {k:'pop',text:'新台のPOPを手作りしたいんです！ 材料費だけください',cost:20000,buff:{k:'newPop',days:7},effect:'7日間、新台の人気が上がる'},
  {k:'aroma',text:'トイレに芳香剤と花を置きませんか？ きっと喜ばれます',cost:10000,buff:{k:'toilet',days:14},effect:'14日間、トイレの不満が出にくい'},
  {k:'tea',text:'休憩ベンチに無料のお茶を置きませんか？',cost:15000,buff:{k:'tea',days:14},effect:'14日間、休憩したお客さんがもっと喜ぶ'},
  {k:'greet',text:'朝の開店のとき、みんなで並んでお出迎えしませんか？',cost:0,buff:{k:'greet',days:10},effect:'10日間、朝のお客さんの満足度が上がる'},
];
const buffOn=k=>(S.buffs||[]).some(b=>b.k===k&&S.day<=b.until);
function addBuff(k,days){S.buffs=(S.buffs||[]).filter(b=>S.day<=b.until&&b.k!==k);S.buffs.push({k,until:S.day+days-1})}
function staffDayStart(R){
  S.staff.forEach(fixStaff);
  for(const s of S.staff)s.lateToday=false;
  if(S.day<4||goActive()||S.incidents.some(i=>i.kind!=='poach'&&i.day===S.day))return;
  const pick1=list=>list.length?pick(list):null;
  const low=s=>(70-s.mor)/70;
  /* 辞めたい */
  const q=S.staff.find(s=>s.mor<18&&Math.random()<0.5);
  if(q){S.incidents.push({id:S.nid++,kind:'quit',staff:q.id,day:S.day});return}
  /* 遅刻（ホール係・清掃係） */
  for(const s of S.staff){if(s.role==='counter')continue;const P=PERS[s.pers];if(Math.random()<0.012*P.late*(1+Math.max(0,low(s)))*(s.lateWarn&&S.day<s.lateWarn?0.3:1)){S.incidents.push({id:S.nid++,kind:'late',staff:s.id,day:S.day});s.lateToday=true;return}}
  /* ケンカ */
  if(S.staff.length>=4&&Math.random()<0.006*avgOf(S.staff.map(s=>PERS[s.pers].fight))*S.staff.length/4){
    const c=S.staff.filter(s=>PERS[s.pers].fight>0);if(c.length>=2){const a=pick(c),b=pick(c.filter(x=>x!==a));S.incidents.push({id:S.nid++,kind:'fight',a:a.id,b:b.id,day:S.day});return}
  }
  /* 昇給の相談 */
  const r=pick1(S.staff.filter(s=>s.lv>=4&&s.mor<75&&s.wage<ROLES[s.role].base+(s.spd+s.srv)*700+s.lv*900&&(!s.raiseDay||S.day-s.raiseDay>40)));
  if(r&&Math.random()<0.03*(r.pers==='yashin'?2:1)){S.incidents.push({id:S.nid++,kind:'raise',staff:r.id,day:S.day});return}
  /* 提案 */
  const g=pick1(S.staff.filter(s=>s.pers==='genki'||s.pers==='yashin'||s.mor>=80));
  if(g&&Math.random()<0.025){const idea=pick(IDEAS.filter(x=>!buffOn(x.buff.k)));if(idea)S.incidents.push({id:S.nid++,kind:'idea',staff:g.id,idea:idea.k,day:S.day})}
}
function staffIncidentTalk(inc){
  const done=()=>{S.incidents=S.incidents.filter(x=>x.id!==inc.id);save();refreshAll()};
  const get=id=>S.staff.find(x=>x.id===id);
  const first=s=>s.name.split(' ')[1]||s.name;
  const sp=s=>speaker('staff:'+s.id);
  if(inc.kind==='late'){
    const s=get(inc.staff);if(!s){done();return null}
    s.lateToday=true;
    return [
      {sp:sp(s),ex:'sad',text:`店長、すみません！ ${pick(['寝坊しました…','電車が止まってて…','目覚ましが鳴らなくて…'])} 今日はお昼すぎから入ります！`},
      {who:'me',text:`（${first(s)}は今日、13時まで来られないか…どうする？）`,choices:[
        {label:'しっかり叱る',sub:'やる気が下がる・しばらく遅刻しにくい',run:()=>{s.mor=clamp(s.mor-8,0,100);s.lateWarn=S.day+30;done();return [{sp:sp(s),ex:'sad',text:'はい…。二度としません'}]}},
        {label:'次は気をつけて、と言う',sub:'やる気が少し上がる',run:()=>{s.mor=clamp(s.mor+4,0,100);done();return [{sp:sp(s),ex:'happy',text:'ありがとうございます！ 午後から全力でがんばります！'}]}}]},
    ];
  }
  if(inc.kind==='fight'){
    const a=get(inc.a),b=get(inc.b);if(!a||!b){done();return null}
    return [
      {who:'narr',text:`開店前のバックヤード。${first(a)}と${first(b)}が言い合いをしている…`},
      {sp:sp(a),ex:'angry',text:pick(['だから、呼び出しのランプはこっちが先って言ってるでしょ！','掃除のやり方、いちいち口出ししないでよ！','昨日のシフト、勝手に替えたでしょ！'])},
      {sp:sp(b),ex:'angry',text:pick(['そっちこそ、いつも勝手なんだよ！','はぁ？ こっちだって忙しいんだけど！','ちゃんと聞いてないほうが悪いでしょ！'])},
      {who:'me',text:'（どうしよう…）',choices:[
        {label:'2人の話をじっくり聞く',sub:'2人ともやる気が少し上がる',run:()=>{a.mor=clamp(a.mor+3,0,100);b.mor=clamp(b.mor+3,0,100);done();return [{sp:sp(a),ex:'sad',text:'…言いすぎました。ごめん'},{sp:sp(b),ex:'happy',text:'こっちこそ。今日もよろしく'}]}},
        {label:`${first(a)}を注意する`,sub:`${first(a)}のやる気が下がり、${first(b)}は上がる`,run:()=>{a.mor=clamp(a.mor-10,0,100);b.mor=clamp(b.mor+5,0,100);done();return [{sp:sp(a),ex:'sad',text:'…わかりました'}]}},
        {label:'放っておく',sub:'今日は2人とも動きが鈍い',run:()=>{a.fightDay=S.day;b.fightDay=S.day;a.mor=clamp(a.mor-5,0,100);b.mor=clamp(b.mor-5,0,100);done();return [{who:'narr',text:'2人は口をきかないまま、開店の準備を始めた…'}]}}]},
    ];
  }
  if(inc.kind==='raise'){
    const s=get(inc.staff);if(!s){done();return null}
    const up=Math.round(s.wage*0.15/100)*100;
    return [
      {sp:sp(s),ex:'n',text:`店長、ちょっとお話が…。Lv${s.lv}になって、仕事も増えてきました。そろそろお給料を上げてもらえませんか？`},
      {who:'me',text:`（${first(s)}の給料は今 ${yen(s.wage)}／日…）`,choices:[
        {label:'お給料を上げる',sub:`+${yen(up)}／日・やる気が大きく上がる`,run:()=>{s.wage+=up;s.raiseDay=S.day;s.mor=clamp(s.mor+18,0,100);done();return [{sp:sp(s),ex:'happy',text:'ありがとうございます！ もっとがんばります！'}]}},
        {label:'今は上げられない',sub:'やる気が下がる',run:()=>{s.raiseDay=S.day;s.mor=clamp(s.mor-15,0,100);done();return [{sp:sp(s),ex:'sad',text:'…そうですか。わかりました'}]}}]},
    ];
  }
  if(inc.kind==='idea'){
    const s=get(inc.staff),I=IDEAS.find(x=>x.k===inc.idea);if(!s||!I){done();return null}
    return [
      {sp:sp(s),ex:'happy',text:`店長、提案があります！ ${I.text}`},
      {who:'me',text:`（${I.effect}${I.cost?`。費用は${yen(I.cost)}`:''}）`,choices:[
        {label:'やってみよう',sub:I.cost?`${yen(I.cost)}・${I.effect}`:I.effect,dis:S.money<I.cost,run:()=>{S.money-=I.cost;addBuff(I.buff.k,I.buff.days);s.mor=clamp(s.mor+10,0,100);gainExp(10);done();return [{sp:sp(s),ex:'happy',text:'やった！ さっそく準備します！'}]}},
        {label:'今回は見送る',sub:'やる気が少し下がる',run:()=>{s.mor=clamp(s.mor-4,0,100);done();return [{sp:sp(s),ex:'sad',text:'そうですか…また考えてみます'}]}}]},
    ];
  }
  if(inc.kind==='quit'){
    const s=get(inc.staff);if(!s){done();return null}
    return [
      {sp:sp(s),ex:'sad',text:'店長…。すみません、今月いっぱいで辞めさせてください'},
      {who:'me',text:`（${first(s)}のやる気がすっかりなくなっている…）`,choices:[
        {label:'引き止める',sub:'お給料+10%・やる気が戻る',run:()=>{s.wage=Math.round(s.wage*1.1/100)*100;s.mor=55;done();return [{sp:sp(s),ex:'n',text:'…そこまで言ってくれるなら。もう少しだけ、がんばってみます'}]}},
        {label:'気持ちよく送り出す',sub:'店員が1人減る',run:()=>{S.staff=S.staff.filter(x=>x!==s);news(`${s.name}が店を辞めた`,'bad');done();return [{sp:sp(s),ex:'happy',text:'今まで、ありがとうございました'}]}}]},
    ];
  }
  return null;
}

/* ================= 常連さんの物語 =================
   常連さんごとに3〜5話。来店した日の閉店後に、仲よくなるほど次の話が始まる */
const EPI={
 taka:[
  {need:st=>st.loy>=40,title:'イベントの約束',lines:()=>[{who:'reg:taka',ex:'smug',text:'この店、イベントの約束はちゃんと守るよな。最近ちょっと信用してるんだ'},{who:'me',text:'ありがとうございます。お客さんとの約束ですから'}]},
  {need:st=>st.loy>=55&&S.trust>=55,title:'配信を始めたい',lines:()=>[{who:'reg:taka',ex:'n',text:'実はさ、パチスロの配信を始めようと思ってて。この店で撮影させてもらえないかな？'},
    {who:'me',text:'（店の宣伝になるけど、出さない日も映ってしまう…）',choices:[
      {label:'ぜひどうぞ',sub:'イベントの信用の動きが大きくなる',run:()=>{S.regFx.taka=1;return [{who:'reg:taka',ex:'happy',text:'マジで！？ ありがとう店長！ 最初の動画、気合い入れて撮るわ！'}]}},
      {label:'今はやめておく',sub:'何も起きない',run:()=>[{who:'reg:taka',ex:'n',text:'そっか。ま、気が変わったら言ってよ'}]}]}]},
  {need:st=>st.loy>=70&&S.regFx.taka,title:'動画がバズった',lines:()=>{S.trust=clamp(S.trust+5,0,100);S.rep=clamp(S.rep+3,0,100);return [{who:'reg:taka',ex:'happy',text:'見てくれよ店長！ この店の動画、再生10万回いったぜ！'},{who:'reg:taka',ex:'smug',text:'コメント欄、「この店行ってみたい」ばっかり。オレのおかげだな？'},{who:'narr',text:'信用+5・評判+3'}]}},
  {need:st=>st.loy>=85&&S.regFx.taka,title:'公開収録',lines:()=>{S.regFx.takaTube=1;return [{who:'reg:taka',ex:'happy',text:'今度、この店で公開収録やらせてくれない？ 取材料はいらないからさ'},{who:'narr',text:'次の「人気配信者の来店取材」がタダになった（ランクも関係なく選べる）'}]}},
  {need:st=>st.loy>=95,title:'ありがとな',lines:()=>[{who:'reg:taka',ex:'n',text:'オレさ、前はイベントのガセばっかりの店で負け続けてたんだ'},{who:'reg:taka',ex:'happy',text:'この店がなかったら、今のオレはなかった。…ありがとな、店長'},{who:'me',ex:'happy',text:'こちらこそ。これからも、約束は守ります'}]},
 ],
 gen:[
  {need:st=>st.loy>=40,title:'いい釘だ',lines:()=>[{who:'reg:gen',ex:'smug',text:'…いい釘だ。あんた、釘のことがわかってるな'}]},
  {need:st=>st.loy>=60,title:'ゲンの昔話',lines:()=>[{who:'reg:gen',ex:'n',text:'昔な、俺も店をやってたんだ。小さなホールだったがな'},{who:'reg:gen',ex:'sad',text:'釘ひとつで客が来て、釘ひとつで客が消える。…それがわからなくて、潰しちまった'},{who:'me',text:'（ゲンさんにも、そんな過去が…）'}]},
  {need:st=>st.loy>=75,title:'釘の見方',lines:()=>{const r=sk('kugi');let t;if(r<3){S.mgr.sk.kugi=r+1;t=`店長スキル「釘読み」が${r+1}になった！`}else{gainExp(150);t='店長の経験値+150'}return [{who:'reg:gen',ex:'smug',text:'釘の見方、少しだけ教えてやる。命釘とヘソ、それと風車の周りだ'},{who:'narr',text:t}]}},
  {need:st=>st.loy>=90,title:'釘師ゲン',lines:()=>{S.regFx.gen=1;return [{who:'reg:gen',ex:'n',text:'もう打つのはやめる。これからは、あんたの店の釘を見てやるよ'},{who:'narr',text:'パチンコのお客さんが、釘を開けた台でもっと喜ぶようになった'}]}},
 ],
 tome:[
  {need:st=>st.loy>=40,title:'年金の日の楽しみ',lines:()=>{S.rep=clamp(S.rep+1,0,100);return [{who:'reg:tome',ex:'happy',text:'年金の日はね、ここに来るのが楽しみなのよ。これ、みなさんで食べてね'},{who:'narr',text:'トメさんからお菓子をもらった（評判+1）'}]}},
  {need:st=>st.loy>=55&&S.staff.length<14,title:'孫の就職',lines:()=>[{who:'reg:tome',ex:'n',text:'あのね、孫が仕事を探してるのよ。ここで働かせてもらえないかしら'},
    {who:'me',text:'（トメさんのお孫さんか…）',choices:[
      {label:'ぜひ来てもらう',sub:'真面目な清掃係が入る',run:()=>{const c=makeCandidate('clean',3,4);c.name='森 ひなた';c.pers='majime';c.special='tome';hireStaff(c);S.regFx.tomeKid=c.id;return [{who:'reg:tome',ex:'happy',text:'まあ、ありがとう！ ひなたにも言っておくわね。よろしくお願いします'}]}},
      {label:'今は人が足りている',sub:'何も起きない',run:()=>[{who:'reg:tome',ex:'n',text:'そうよね、無理を言ってごめんなさいね'}]}]}]},
  {need:st=>st.loy>=70&&S.regFx.tomeKid&&S.staff.some(s=>s.id===S.regFx.tomeKid),title:'孫のはたらきぶり',lines:()=>{const s=S.staff.find(x=>x.id===S.regFx.tomeKid);if(s)s.mor=clamp(s.mor+20,0,100);return [{who:'reg:tome',ex:'happy',text:'ひなたがね、毎日楽しそうに仕事の話をするのよ。店長さんのおかげね'},{who:'narr',text:'森ひなたのやる気が上がった'}]}},
  {need:st=>st.loy>=80,title:'お友だち',lines:()=>{S.regFx.tome=1;return [{who:'reg:tome',ex:'happy',text:'今日はね、お友だちを連れてきたの。みんな、ここのベンチが気に入ったって'},{who:'narr',text:'年配のお客さんが少し増えるようになった'}]}},
  {need:st=>st.loy>=95,title:'米寿のお祝い',lines:()=>[{who:'reg:tome',ex:'n',text:'わたし、来月で88歳なのよ'},
    {who:'me',text:'（お祝いしたいな…）',choices:[
      {label:'店でお祝いする',sub:'5万円・評判+5',dis:S.money<50000,run:()=>{S.money-=50000;S.rep=clamp(S.rep+5,0,100);news('トメさんの米寿をお店でお祝いした','good');return [{who:'reg:tome',ex:'happy',text:'まあ…！ こんなにしてもらって…。長生きはするものねえ'}]}},
      {label:'おめでとうと伝える',sub:'何も起きない',run:()=>[{who:'reg:tome',ex:'happy',text:'ありがとう。これからも元気に通うわね'}]}]}]},
 ],
 sato:[
  {need:st=>st.loy>=40,title:'仕事帰りの1時間',lines:()=>[{who:'reg:sato',ex:'n',text:'仕事帰りのこの1時間が、唯一の楽しみなんですよ'}]},
  {need:st=>st.loy>=55,title:'上司に怒られて',lines:()=>[{who:'reg:sato',ex:'sad',text:'今日、上司にこっぴどく怒られちゃって…'},
    {who:'me',text:'（元気がないな…）',choices:[
      {label:'話を聞いて励ます',sub:'佐藤さんとの仲が深まる',run:()=>{S.regs.sato.loy=clamp(S.regs.sato.loy+8,0,100);return [{who:'reg:sato',ex:'happy',text:'…ありがとうございます。なんだか元気が出ました'}]}},
      {label:'缶コーヒーを差し入れる',sub:'150円・仲が深まる',run:()=>{S.money-=150;S.regs.sato.loy=clamp(S.regs.sato.loy+6,0,100);return [{who:'reg:sato',ex:'happy',text:'えっ、いいんですか！ …沁みますね'}]}}]}]},
  {need:st=>st.loy>=70,title:'独立の決意',lines:()=>[{who:'reg:sato',ex:'smug',text:'店長、決めました。会社を辞めて、遊技機の販売会社を始めます！'},{who:'me',ex:'shock',text:'えっ、本当ですか！？'}]},
  {need:st=>st.loy>=85,title:'取引先',lines:()=>{S.regFx.sato=1;return [{who:'reg:sato',ex:'happy',text:'独立しました！ 店長には、新台をいちばん安く卸しますよ'},{who:'narr',text:'台と設備がいつも5%安く買えるようになった'}]}},
 ],
 tetsu:[
  {need:st=>st.loy>=40,title:'一服しながら',lines:()=>[{who:'reg:tetsu',ex:'n',text:'一服しながら打てる店は、もう少なくなっちまったなぁ'}]},
  {need:st=>st.loy>=60,title:'医者の話',lines:()=>[{who:'reg:tetsu',ex:'sad',text:'医者にな、たばこをやめろって言われちまってよ…'},
    {who:'me',text:'（鉄さん…）',choices:[
      {label:'禁煙を応援する',sub:'鉄さんが禁煙席で打つようになる',run:()=>{S.regFx.tetsuQuit=1;return [{who:'reg:tetsu',ex:'n',text:'…そうだな。孫の顔も見たいしな。やってみるか'}]}},
      {label:'喫煙席は守ると約束する',sub:'鉄さんとの仲が深まる',run:()=>{S.regs.tetsu.loy=clamp(S.regs.tetsu.loy+8,0,100);return [{who:'reg:tetsu',ex:'happy',text:'へへ、ありがとよ。ほどほどにするさ'}]}}]}]},
  {need:st=>st.loy>=75,title:'鉄さんの仲間',lines:()=>{S.regFx.tetsu=1;return [{who:'reg:tetsu',ex:'happy',text:S.regFx.tetsuQuit?'禁煙2か月だ！ 昔の仲間に自慢したら、みんなこの店に来るってよ':'昔の仲間を連れてきたぞ。ここなら気兼ねなく打てるってな'},{who:'narr',text:'20円スロットのお客さんが少し増えるようになった'}]}},
 ],
 midori:[
  {need:st=>st.loy>=40,title:'きれいなお店',lines:()=>[{who:'reg:midori',ex:'happy',text:hasDoor('toilet')?'この店、トイレがきれいで好きなの。女の人でも安心して来られるわ':'きれいなお店って、それだけで来たくなるのよね'}]},
  {need:st=>st.loy>=55&&S.staff.length<14,title:'パートを探していて',lines:()=>[{who:'reg:midori',ex:'n',text:'子どもが大きくなったから、パートを探してるの。ここで働けないかしら？'},
    {who:'me',text:'（ミドリさんなら接客もばっちりだ）',choices:[
      {label:'カウンター係で来てもらう',sub:'接客の上手なカウンター係が入る',run:()=>{const c=makeCandidate('counter',2,5);c.name='藤井 ミドリ';c.pers='genki';c.special='midori';hireStaff(c);return [{who:'reg:midori',ex:'happy',text:'うれしい！ がんばるわね。よろしくお願いします、店長'}]}},
      {label:'今は募集していない',sub:'何も起きない',run:()=>[{who:'reg:midori',ex:'n',text:'そう、残念。またお客として来るわね'}]}]}]},
  {need:st=>st.loy>=70,title:'ママ友',lines:()=>{S.regFx.midori=1;return [{who:'reg:midori',ex:'happy',text:'ママ友に話したら、みんな来たいって。平日のお昼、にぎやかになるわよ'},{who:'narr',text:'平日のお客さんが少し増えるようになった'}]}},
  {need:st=>st.loy>=90,title:'町いちばんの居心地',lines:()=>[{who:'reg:midori',ex:'happy',text:'ここはね、町でいちばん居心地のいいお店よ。これからも通うわね'}]},
 ],
 yuki:[
  {need:st=>st.loy>=40,title:'5円スロ',lines:()=>[{who:'reg:yuki',ex:'happy',text:'5円スロ、学生にはほんとありがたいっす！'}]},
  {need:st=>st.loy>=55,title:'就活の悩み',lines:()=>[{who:'reg:yuki',ex:'n',text:'就活中なんすけど…パチンコ業界って、正直どうっすか？'},
    {who:'me',text:'（どう答えよう）',choices:[
      {label:'正直に話す',sub:'大変なことも、楽しいことも',run:()=>[{who:'reg:yuki',ex:'n',text:'…なるほど。大変だけど、お客さんの笑顔が見られる仕事なんすね'}]},
      {label:'熱く語る',sub:'この仕事の面白さを',run:()=>{S.regs.yuki.loy=clamp(S.regs.yuki.loy+6,0,100);return [{who:'reg:yuki',ex:'happy',text:'店長、めっちゃ目がキラキラしてる…！ なんか、いいっすね'}]}}]}]},
  {need:st=>st.loy>=70&&S.staff.length<14,title:'バイトさせてください',lines:()=>[{who:'reg:yuki',ex:'happy',text:'店長みたいになりたいっす！ ここでバイトさせてください！'},
    {who:'me',text:'（ユウキくんか…）',choices:[
      {label:'ホール係で採用する',sub:'元気なホール係が入る',run:()=>{const c=makeCandidate('hall',4,3);c.name='青木 ユウキ';c.pers='genki';c.special='yuki';hireStaff(c);S.regFx.yukiStaff=c.id;return [{who:'reg:yuki',ex:'happy',text:'よっしゃー！ よろしくお願いします、店長！'}]}},
      {label:'まずは学業を優先して',sub:'何も起きない',run:()=>[{who:'reg:yuki',ex:'sad',text:'…っすよね。卒業したら、また来ます！'}]}]}]},
  {need:st=>st.loy>=85&&S.regFx.yukiStaff&&S.staff.some(s=>s.id===S.regFx.yukiStaff),title:'卒業',lines:()=>{const s=S.staff.find(x=>x.id===S.regFx.yukiStaff);if(s){s.lv=Math.min(STAFF_MAX_LV,s.lv+2);s.spd=Math.min(5,s.spd+1);s.mor=95}return [{who:'reg:yuki',ex:'happy',text:'店長！ 無事に卒業しました！ 正社員として、これからもここで働かせてください！'},{who:'narr',text:'青木ユウキのレベルが2上がった'}]}},
 ],
 kaneda:[
  {need:st=>st.loy>=40,title:'悪くない店だ',lines:()=>[{who:'reg:kaneda',ex:'smug',text:'ふむ、悪くない店だ。もう少し内装に金をかけたまえ'}]},
  {need:st=>st.loy>=55&&decorRate()>=0.5,title:'接待に使う',lines:()=>{S.regFx.kaneda=1;return [{who:'reg:kaneda',ex:'happy',text:'内装、良くなったじゃないか。気に入った。うちの会社の接待に使わせてもらうよ'},{who:'narr',text:'お金持ちのお客さんがときどき来るようになった'}]}},
  {need:st=>st.loy>=75,title:'出資の話',lines:()=>[{who:'reg:kaneda',ex:'smug',text:'君、もっと大きな店をやる気はないかね？ 1000万、出資してもいい'},
    {who:'me',text:'（ありがたい話だけど…）',choices:[
      {label:'出資を受ける',sub:'1000万円もらえる・毎月の利益の5%を配当として払う',run:()=>{S.money+=10000000;S.regFx.kanedaInv=1;news('金田社長から1000万円の出資を受けた','big');return [{who:'reg:kaneda',ex:'happy',text:'いい返事だ。期待しているよ、店長'}]}},
      {label:'自分の力でやります',sub:'何も起きない',run:()=>{S.regs.kaneda.loy=clamp(S.regs.kaneda.loy+5,0,100);return [{who:'reg:kaneda',ex:'smug',text:'ほう、骨のある男……いや、店長だ。ますます気に入った'}]}}]}]},
  {need:st=>st.loy>=92,title:'見込んだとおり',lines:()=>[{who:'reg:kaneda',ex:'happy',text:'君は、私が見込んだとおりの店長だったよ。この町の誇りだ'}]},
 ],
};
/* 閉店後、来てくれた常連さんの話を1つだけ進める */
function regEpisodes(R){
  if(!S.regFx)S.regFx={};
  if(S.lastEpDay&&S.day-S.lastEpDay<2)return;
  const cand=REG_DEFS.filter(d=>{const st=S.regs[d.id],eps=EPI[d.id]||[];if(!st.visited||st.st==='gone')return false;const i=st.ep||0;return i<eps.length&&(!st.epDay||S.day-st.epDay>=4)&&eps[i].need(st)});
  if(!cand.length)return;
  const d=pick(cand),st=S.regs[d.id],ep=EPI[d.id][st.ep||0];
  st.ep=(st.ep||0)+1;st.epDay=S.day;S.lastEpDay=S.day;
  st.epLog=(st.epLog||[]).concat([{t:ep.title,day:S.day}]);
  gainExp(25);
  const lines=[{who:'narr',text:`閉店後、${d.name}が話しかけてきた。――「${ep.title}」`},...ep.lines()];
  (R.talks=R.talks||[]).push(lines);
}

/* ================= 店のコンセプト ================= */
const isAma=m=>MB[m.type].k==='p'&&MB[m.type].prob<=99.9;
const isAtype=m=>MB[m.type].k==='s'&&MB[m.type].vol===1;
const isOneYen=m=>MB[m.type].k==='p'&&m.rate==='lo';
const isHeavy=m=>{const md=MB[m.type];return md.k==='p'?md.prob>=349:md.vol>=2};
const CONCEPTS={
  ama:{name:'甘デジ天国',col:'#f97316',need:0.3,test:isAma,cond:'甘デジ（1/99.9）のパチンコが全体の30%以上',desc:'甘デジが人気になり、年配や低レートのお客さんが増える。一撃狙いのお客さんは少し減る',
    pop:1.35,seg:{'p-lo':1.25,'p-hi':1.05},elder:1.2,hunter:0.85,ev:0},
  juggler:{name:'ジャグラー専門',col:'#16a34a',need:0.3,test:isAtype,cond:'Aタイプ（ボーナスが軽い）のスロットが全体の30%以上',desc:'Aタイプが人気になり、スロットのお客さんが増える。データを見て打つお客さんも喜ぶ',
    pop:1.35,seg:{'s-hi':1.2,'s-lo':1.2},elder:1,hunter:1.1,ev:0},
  oneyen:{name:'1円パチの憩いの場',col:'#0ea5e9',need:0.3,test:isOneYen,cond:'1円パチンコが全体の30%以上',desc:'1円パチのお客さんと年配のお客さんが増え、ベンチやきれいな店内がもっと喜ばれる',
    pop:1.2,seg:{'p-lo':1.4},elder:1.3,hunter:0.8,ev:0},
  shoubu:{name:'勝負師の店',col:'#dc2626',need:0.4,test:isHeavy,cond:'一撃の大きい台（1/349以上のパチンコ・AT機）が全体の40%以上',desc:'設定・釘狙いのお客さんが増え、イベントの客足も伸びる。年配のお客さんは少し減る',
    pop:1.25,seg:{'p-hi':1.1,'s-hi':1.15},elder:0.85,hunter:1.3,ev:0.15},
};
function conceptRatio(id){const C=CONCEPTS[id],ms=machines();return ms.length?ms.filter(C.test).length/ms.length:0}
const conceptOn=()=>{const c=S.concept&&S.concept.id;return c&&CONCEPTS[c]&&conceptRatio(c)>=CONCEPTS[c].need?c:null};
const conceptPop=m=>{const c=conceptOn();return c&&CONCEPTS[c].test(m)?CONCEPTS[c].pop:1};
const conceptSeg=seg=>{const c=conceptOn();return c?(CONCEPTS[c].seg[seg]||1):1};
const conceptElder=()=>{const c=conceptOn();return c?CONCEPTS[c].elder:1};
const conceptHunter=()=>{const c=conceptOn();return c?CONCEPTS[c].hunter:1};
const conceptEv=()=>{const c=conceptOn();return c?CONCEPTS[c].ev:0};
const CONCEPT_COST=500000,CONCEPT_WAIT=30;
function setConcept(id){
  const cur=S.concept||{id:null,since:-99,n:0};
  if(!id){if(!cur.id)return 'コンセプトは決まっていません';S.concept=Object.assign({},cur,{id:null});return null}
  if(!CONCEPTS[id])return 'そのコンセプトはありません';
  if(cur.id===id)return 'いまのコンセプトです';
  if(cur.n>0&&S.day-cur.since<CONCEPT_WAIT)return `コンセプトを変えられるのは${dateStr(cur.since+CONCEPT_WAIT)}からです`;
  const cost=cur.n>0?CONCEPT_COST:0;
  if(S.money<cost)return 'お金が足りません';
  S.money-=cost;S.concept={id,since:S.day,n:cur.n+1};
  if(id)news(`お店のコンセプトを「${CONCEPTS[id].name}」にした`,'big');
  return null;
}
/* イベントの費用（煽り上手で安くなる） */
function eventCost(ev){
  let c=0;
  if(ev.type==='renewal')c=150000;
  else if(ev.type==='anniv')c=ANNIV_COST;
  else if(ev.type==='season')c=SEASON_COST;
  else if(ev.type==='media')c=ev.target==='tube'&&S.regFx&&S.regFx.takaTube?0:MEDIA_COST[ev.target==='tube'?'tube':'mag'];
  else if(ev.type!=='none'&&ev.ad)c=50000;
  return Math.round(c*skAd()/1000)*1000;
}
/* 常連さんの物語で増えたお客さん */
function regVisitF(info){
  const f=S.regFx||{};let m=1;
  if(f.tome)m+=0.02;if(f.tetsu)m+=0.02;if(f.kaneda)m+=0.01;if(f.midori&&!info.weekend)m+=0.03;
  return m;
}
/* 店員・常連・店長のデータを古いセーブにも用意する */
function growthDefaults(){
  if(!S.mgr)initMgr();
  if(!S.mgr.newLv)S.mgr.newLv=[];
  if(!S.regFx)S.regFx={};
  if(!S.buffs)S.buffs=[];
  if(!S.concept)S.concept={id:null,since:-99,n:0};
  S.staff.forEach(fixStaff);
}
