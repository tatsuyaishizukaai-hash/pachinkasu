/* ===== talk.js : 顔つきの会話・朝の出来事を順番に出す・相談ごと ===== */
let talkQ=[],talkCur=null,talkDone=null,talkTimer=0,talkShown=0,talkAt=0;
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 話している人の名前・顔・色 */
function speaker(who){
  if(!who||who==='narr')return {name:'',face:null};
  if(who==='me')return {name:'あなた',sub:S.story&&S.story.bought?'オーナー店長':'店長',face:ME_FACE,col:'#ff2d55'};
  if(who==='owner')return {name:OWNER.name,sub:ownerSub(),face:OWNER.face,col:OWNER.col};
  if(who==='mc')return {name:MC.name,sub:MC.sub,face:MC.face,col:MC.col};
  const i=who.indexOf(':'),k=who.slice(0,i),id=who.slice(i+1);
  if(k==='boss'){
    const B=BOSS_BY[id];
    if(B){const r=S.rivals.find(x=>x.boss===id&&x.open)||S.rivals.find(x=>x.boss===id);const p=S.rivalPlans.find(x=>x.boss===id);return {name:B.name,sub:`${r?r.name:p?p.shop:B.shop}・${B.title}`,face:B.face,col:B.col}}
  }
  if(k==='staff'){const s=S.staff.find(x=>String(x.id)===id);if(s)return {name:s.name,sub:ROLES[s.role].name,face:faceFromLook(staffLook({s,role:s.role}),s.id),col:ROLES[s.role].col}}
  if(k==='reg'){const d=REG_BY[id];if(d)return {name:d.name,sub:'常連さん',face:faceFromLook(d.look,id.length*31+7,d.elder),col:d.look.shirt}}
  return {name:'',face:null};
}
/* lines=[{who,ex,text,choices?:[{label,sub,dis,run()}]}]。run は続きのセリフを返してよい */
function talk(lines,done){
  talkQ=lines.filter(Boolean).map(l=>Object.assign({},l));talkDone=done||null;talkAt=performance.now();
  if(!talkQ.length){if(done)done();return}
  $('#talk').hidden=false;nextTalk();
}
function nextTalk(){
  clearInterval(talkTimer);
  const ln=talkQ.shift();
  if(!ln){$('#talk').hidden=true;talkCur=null;const d=talkDone;talkDone=null;if(d)d();return}
  if(!ln.sp)ln.sp=speaker(ln.who);
  talkCur=ln;
  const sp=ln.sp,face=$('#tkFace');
  if(sp.face){face.hidden=false;$('#tkImg').src=portraitURL(sp.face,ln.ex||'n');face.style.setProperty('--fc',sp.col||'#ffd23f')}else face.hidden=true;
  $('#talk').classList.toggle('narr',!sp.face);
  $('#tkName').hidden=!sp.name;
  $('#tkName').innerHTML=sp.name?`<b>${esc(sp.name)}</b>${sp.sub?`<span>${esc(sp.sub)}</span>`:''}`:'';
  $('#tkCh').innerHTML='';$('#tkNext').hidden=true;$('#tkSkip').hidden=!!ln.choices;
  const el=$('#tkText'),txt=ln.text;
  if(reducedMotion()){finishLine();return}
  talkShown=0;el.textContent='';
  talkTimer=setInterval(()=>{
    talkShown++;el.textContent=txt.slice(0,talkShown);
    if(talkShown%3===1&&sp.face)sfx('blip');
    if(talkShown>=txt.length){clearInterval(talkTimer);finishLine()}
  },24);
}
function finishLine(){
  const ln=talkCur;if(!ln)return;
  clearInterval(talkTimer);$('#tkText').textContent=ln.text;talkShown=ln.text.length;
  if(ln.choices)$('#tkCh').innerHTML=ln.choices.map((c,i)=>`<button class="tk-btn ${i===0?'first':''}" data-ch="${i}" ${c.dis?'disabled':''} type="button"><b>${esc(c.label)}</b>${c.sub?`<span>${esc(c.sub)}</span>`:''}</button>`).join('');
  else $('#tkNext').hidden=false;
}
$('#talk').addEventListener('click',e=>{
  if(!talkCur||performance.now()-talkAt<250)return;
  const b=e.target.closest('[data-ch]');
  if(b){
    const c=talkCur.choices[+b.dataset.ch];if(!c||c.dis)return;
    sfx('tap');talkAt=performance.now();
    const more=c.run?c.run():null;
    if(more&&more.length)talkQ.unshift(...more.map(l=>Object.assign({},l)));
    nextTalk();return;
  }
  if(e.target.closest('#tkSkip')){
    if(talkCur.choices)return;
    const i=talkQ.findIndex(l=>l.choices);talkQ=i<0?[]:talkQ.slice(i);nextTalk();return;
  }
  if(talkShown<talkCur.text.length){finishLine();return}
  if(talkCur.choices)return;
  talkAt=performance.now();nextTalk();
});

/* 朝の出来事を1つずつ（テロップ → 会話 → 相談ごと） */
function runSeq(steps){const st=steps.filter(Boolean);const next=()=>{const f=st.shift();if(f)f(next)};next()}
function telopStep(title,sub,kind,snd){return done=>{telop(title,sub,kind);sfx(snd||(kind==='bad'?'gagan':'fanfare'));inputBlock(2000);setTimeout(done,1900)}}
/* テロップのあいだに次の出来事が来るので、そのあいだは画面の操作を止める */
let blockT=0;
function inputBlock(ms){const r=$('#root');r.classList.add('busy');clearTimeout(blockT);blockT=setTimeout(()=>r.classList.remove('busy'),ms)}
const inputBlocked=()=>$('#root').classList.contains('busy');

/* ---------- 相談ごと（いまは引き抜き） ---------- */
function incidentTalk(inc){
  if(inc.kind==='poach'){
    const s=S.staff.find(x=>x.id===inc.staff),r=S.rivals.find(x=>x.id===inc.rival);
    if(!s||!r||!r.open){S.incidents=S.incidents.filter(x=>x.id!==inc.id);return null}
    const B=bossOf(r),sp=speaker('staff:'+s.id),cost=raiseCost(s),odds=poachOdds(s),given=s.name.split(' ')[1]||s.name;
    const res=choice=>()=>{
      const o=resolvePoach(inc,choice);save();refreshAll();if(!o)return [];
      if(o.stay)return [{sp,ex:'happy',text:choice==='raise'?`えっ、給料を${yen(cost)}も…！ ありがとうございます！ ここでがんばります！`:'…店長がそこまで言ってくれるなら。やっぱり、ここでがんばります！'}];
      return [{sp,ex:'sad',text:choice==='let'?`今まで本当にありがとうございました。${r.name}に行っても、店長に教わったことは忘れません`:'すみません…やっぱり、向こうで挑戦してみたいんです'},{who:'boss:'+B.id,ex:'smug',text:`${given}は大事に使わせてもらうよ。礼を言っておこう`}];
    };
    return [
      {sp,ex:'sad',text:`店長…ちょっといいですか。実は${r.name}の${B.name}さんから「うちに来ないか」って誘われてて…`},
      {who:'boss:'+B.id,ex:'smug',text:B.poach.replace('{staff}',given)},
      {sp,ex:'sad',text:'自分、どうしたらいいでしょうか…？'},
      {who:'me',text:`（${ROLES[s.role].name}・Lv${s.lv}の${given}か…。どうする？）`,choices:[
        {label:'昇給して引き止める',sub:`給料 +${yen(cost)}／日・必ず残る`,dis:false,run:res('raise')},
        {label:'説得する',sub:`お金はかからない・残る見込み ${Math.round(odds*100)}%`,run:res('talk')},
        {label:'気持ちよく送り出す',sub:'相手の店が少し強くなる',run:res('let')}]},
    ];
  }
  S.incidents=S.incidents.filter(x=>x.id!==inc.id);return null;
}
function runIncidents(done){
  const inc=S.incidents[0];
  if(!inc||S.phase!=='prep'){if(done)done();return}
  const lines=incidentTalk(inc);
  if(!lines){runIncidents(done);return}
  talk(lines,()=>runIncidents(done));
}
