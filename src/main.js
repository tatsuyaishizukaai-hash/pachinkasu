/* ===== main.js : ループと起動 ===== */
let lastT=performance.now(),hudT=0;const PERF={u:0,r:0,n:0};
let hallT=0;
function loop(now){
  const dtR=Math.min(0.1,Math.max(0,(now-lastT)/1000));lastT=now;
  try{
    const t0=performance.now();
    if(S.phase==='open'&&!prefs.paused&&!document.hidden){
      let g=dtR*MIN_PER_SEC*prefs.speed;
      while(g>0&&S.phase==='open'){const s=Math.min(1.5,g);update(s);g-=s}
      hudT+=dtR;
      if(hudT>0.25&&S.phase==='open'){hudT=0;refreshHud();renderStatus();if(sheetKind==='machine'||sheetKind==='list'||sheetKind==='door')renderSheet();else if(sheetKind==='hall'&&(hallT=(hallT+1)%4)===0)renderSheet()}
    }
    for(const o of G.objs)if(o.flash>0)o.flash-=dtR;
    for(const f of floats)f.t+=dtR;
    if(S.phase==='open')tweetTick(now);
    floats=floats.filter(f=>f.t<f.life);
    const t1=performance.now();
    render(now);
    const t2=performance.now();PERF.u+=t1-t0;PERF.r+=t2-t1;PERF.n++;
  }catch(e){console.error(e)}
  requestAnimationFrame(loop);
}
function boot(data){
  loadPrefs();mdbLoad();profLoad();
  let ok=false,src=data&&data.save;
  if(!src){try{src=localStorage.getItem(SAVE_KEY)}catch(e){src=null}}
  if(src){try{ok=load(src)}catch(e){console.error(e);ok=false}}
  if(!ok){newGame('パーラー満天');showTitle()}
  applyLayout();fitCam();refreshAll();
  if(ok)afterLoad(700);
  let rzT=0;const onRz=()=>{clearTimeout(rzT);rzT=setTimeout(()=>{cam.fit=true;applyLayout()},80)};
  window.addEventListener('resize',onRz);window.addEventListener('orientationchange',onRz);
  requestAnimationFrame(loop);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(markDirty).catch(()=>{});
  const unlock=()=>{audio();if(!bgm.cur)playBgm(bgm.want||'prep');window.removeEventListener('pointerdown',unlock,true)};
  window.addEventListener('pointerdown',unlock,true);
}
try{window.claude?.hot?.snapshot?.(()=>({save:S?(S.phase==='open'?openSnap:ser()):null}))}catch(e){}
window.claude?.hot?.ready?window.claude.hot.ready(boot):boot(window.claude?.hot?.data??{});
window.__dbg={MB,mdb:()=>mdbEdits,playBgm,ac:()=>AC&&AC.state,eventTargets,machines,hireStaff,makeCandidate,needStaff,staffOf,forecast,decorRate,addObj,newMachine,validate,layoutChanged,openRivals,dayInfo,portraitURL,BOSSES,BOSS_BY,scheduleRival,talk,speaker,closeDay,rivalAttract,get G(){return G},get islands(){return islands}};
window.__perf=PERF;
window.__dbg.ev=src=>eval(src);   /* テスト用：ゲームの中の変数を読む */
window.__game={get S(){return S},get custs(){return custs},get D(){return D},get staffA(){return staffA},get cam(){return cam},startDay,closeSheet,openSheet,ff:n=>{for(let i=0;i<n&&S.phase==='open';i++)update(1)}};
