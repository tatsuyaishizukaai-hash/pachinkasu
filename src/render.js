/* ===== render.js : カメラと描画 ===== */
const cv=$('#cv'),ctx=cv.getContext('2d');
const cam={s:3,x:0,y:0,fit:true};
let dpr=1,floats=[],dirty=true;
let DPR_CAP=2;
let VIEW={w:0,h:0},INSET={t:44,b:10,l:8,r:8};
function markDirty(){dirty=true}
const worldW=()=>G.W*TS+OX*2, worldH=()=>OY+G.H*TS+BOT;
function resizeCanvas(){
  const w=VIEW.w,h=VIEW.h;if(!w||!h)return;
  const wasFit=cam.fit;
  dpr=Math.min(DPR_CAP,window.devicePixelRatio||1);
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  cv.style.width=w+'px';cv.style.height=h+'px';
  if(wasFit)fitCam();else clampCam();
}
function availRect(){return {x:INSET.l*dpr,y:INSET.t*dpr,w:Math.max(50,cv.width-(INSET.l+INSET.r)*dpr),h:Math.max(50,cv.height-(INSET.t+INSET.b)*dpr)}}
const fitScale=()=>{const a=availRect();return Math.min(a.w/worldW(),a.h/worldH())};
const maxScale=()=>Math.max(fitScale()*3.2,7*dpr);
function fitCam(){cam.fit=true;const a=availRect();cam.s=fitScale();cam.x=worldW()/2-(a.x+a.w/2)/cam.s;cam.y=worldH()/2-(a.y+a.h/2)/cam.s}
function clampCam(){
  const a=availRect(),vw=cv.width/cam.s,vh=cv.height/cam.s,ww=worldW(),wh=worldH();
  const fx=worldW()/2-(a.x+a.w/2)/cam.s,fy=worldH()/2-(a.y+a.h/2)/cam.s;
  cam.x=a.w/cam.s>=ww?fx:clamp(cam.x,-a.x/cam.s-16,ww-vw+(cv.width-a.x-a.w)/cam.s+16);
  cam.y=a.h/cam.s>=wh?fy:clamp(cam.y,-a.y/cam.s-16,wh-vh+(cv.height-a.y-a.h)/cam.s+16);
}
function zoomAt(f,sx,sy){
  const ns=clamp(cam.s*f,fitScale()*0.6,maxScale());
  if(Math.abs(ns-cam.s)<1e-6)return;
  cam.fit=false;
  sx=sx??cv.width/2;sy=sy??cv.height/2;
  const wx=cam.x+sx/cam.s,wy=cam.y+sy/cam.s;
  cam.s=ns;cam.x=wx-sx/ns;cam.y=wy-sy/ns;clampCam();
}
function localToWorld(lx,ly){return {x:cam.x+lx*dpr/cam.s,y:cam.y+ly*dpr/cam.s}}
function hitTest(wx,wy){
  const tx=Math.floor((wx-OX)/TS),ty=Math.floor((wy-OY)/TS);
  if(wy>=OY-18&&wy<OY&&tx>=0&&tx<G.W)return {wall:'t',pos:tx};
  if(wx>=0&&wx<OX&&ty>=0&&ty<G.H)return {wall:'l',pos:ty};
  if(wx>=OX+G.W*TS&&wx<OX*2+G.W*TS&&ty>=0&&ty<G.H)return {wall:'r',pos:ty};
  if(tx>=0&&ty>=0&&tx<G.W&&ty<G.H)return {x:tx,y:ty};
  return null;
}
function floatAt(x,y,text,col){
  const fx=OX+x*TS+8,fy=OY+y*TS-3;
  if(floats.some(f=>f.t<0.6&&Math.abs(f.x-fx)<14&&Math.abs(f.y-fy)<12))return;
  if(floats.length>=10)return;
  floats.push({x:fx,y:fy,text,col,t:0,life:1.4});if(floats.length>40)floats.shift();
}

/* ---------- 部品 ---------- */
const K='#16121f';
function R(x,y,w,h,c){
  const s=cam.s,x0=Math.round((x-cam.x)*s),y0=Math.round((y-cam.y)*s),x1=Math.round((x+w-cam.x)*s),y1=Math.round((y+h-cam.y)*s);
  if(x1<0||y1<0||x0>cv.width||y0>cv.height)return;
  ctx.fillStyle=c;ctx.fillRect(x0,y0,x1-x0,y1-y0);
}
function OL(x,y,w,h,c){R(x-1,y-1,w+2,h+2,K);R(x,y,w,h,c)}
function txt(t,x,y,size,col,font,stroke){
  ctx.setTransform(cam.s,0,0,cam.s,-cam.x*cam.s,-cam.y*cam.s);
  ctx.font=`${size}px ${font||'"DotGothic16","Dela Gothic One",sans-serif'}`;ctx.textAlign='center';ctx.textBaseline='middle';
  if(stroke){ctx.lineWidth=stroke;ctx.strokeStyle=K;ctx.lineJoin='round';ctx.strokeText(t,x,y)}
  ctx.fillStyle=col;ctx.fillText(t,x,y);
  ctx.setTransform(1,0,0,1,0,0);
}

/* ---------- 店の外・壁・床 ---------- */
function drawBackdrop(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#2d2459';ctx.fillRect(0,0,cv.width,cv.height);
  const s=cam.s,step=10*s,ox=-((cam.x*s)%step),oy=-((cam.y*s)%step);
  ctx.fillStyle='#3a2f73';
  for(let y=oy-step;y<cv.height+step;y+=step)for(let x=ox-step;x<cv.width+step;x+=step)ctx.fillRect(Math.round(x),Math.round(y),2*s,2*s);
}
function drawShell(now){
  const Wl=WLB[G.wall],gw=G.W*TS,gy=OY+G.H*TS;
  R(OX-6,4,gw+16,gy+BOT,'rgba(0,0,0,.35)');
  blit(buildWall(),0,0);
  R(0,OY,OX,G.H*TS,Wl.d);R(OX+gw,OY,OX,G.H*TS,Wl.d);
  R(1,OY,1,G.H*TS,shade(Wl.d,.25));R(OX+gw+OX-2,OY,1,G.H*TS,shade(Wl.d,-.3));
  R(OX-2,OY,2,G.H*TS,'rgba(0,0,0,.25)');R(OX+gw,OY,2,G.H*TS,'rgba(0,0,0,.25)');
  /* 看板（電飾つき） */
  ctx.setTransform(1,0,0,1,0,0);ctx.font='9px "Dela Gothic One","DotGothic16",sans-serif';
  const tw=Math.min(gw-24,ctx.measureText(S.name).width+20),sx=Math.round(OX+gw/2-tw/2);
  R(sx-2,1,tw+4,17,K);R(sx-1,2,tw+2,15,'#7f1d1d');R(sx,3,tw,13,'#ff2d55');R(sx,3,tw,2,'#ff7a93');R(sx,14,tw,2,'#c81e3a');
  const blink=Math.floor(now/400)%2;
  for(let x=sx+1;x<sx+tw-1;x+=3){R(x,2,1,1,(x/3+blink)%2<1?'#ffe14f':'#fff');R(x+1,16,1,1,(x/3+blink)%2<1?'#fff':'#ffe14f')}
  txt(S.name,OX+gw/2,9.6,9,'#fff','"Dela Gothic One","DotGothic16",sans-serif',2);
  /* 床 */
  blit(buildFloor(),OX,OY);
  /* 入口と道路 */
  const d=doorPos(),mx=OX+d.x*TS,my=OY+d.y*TS;
  R(mx+1,my+3,14,12,'#5b4a2e');for(let i=0;i<4;i++)R(mx+2,my+4+i*3,12,1,'#7a6440');txt('WELCOME',mx+8,my+9,2.6,'#facc15');
  R(0,gy,gw+OX*2,BOT,'#4b4f63');
  for(let x=0;x<gw+OX*2;x+=8)R(x,gy+3,4,2,'#5d6278');
  for(let x=4;x<gw+OX*2;x+=12)R(x,gy+8,6,1,'#f4f4f4');
  R(0,gy,gw+OX*2,3,Wl.d);
  R(mx-2,gy-1,TS+4,4,K);R(mx,gy,TS,3,'#9ee7ff');const op=S.phase==='open'&&Math.floor(now/900)%2;R(mx+(op?1:6),gy,op?5:4,3,'#c9f1ff');R(mx+(op?10:6),gy,op?5:4,3,'#c9f1ff');
  if(S.weather.today==='rain'&&S.phase==='open'){
    const t=now/90;
    for(let i=0;i<30;i++){const x=(i*37+Math.floor(t*3)*7)%(gw+OX*2),y=gy+((i*13+Math.floor(t*5))%BOT);R(x,y,1,2,'rgba(190,220,255,.7)')}
  }
}
function drawDoors(now){
  for(const d of G.doors){
    if(d.type==='camera'){
      const blink=Math.floor(now/600)%2;
      if(d.side==='t'){const px=OX+d.pos*TS;R(px+4,OY-11,8,6,K);R(px+5,OY-10,6,4,'#374151');R(px+6,OY-6,4,3,K);R(px+7,OY-5,2,1,'#93c5fd');R(px+10,OY-9,1,1,blink?'#ff2d55':'#7f1d1d')}
      else{const lx=d.side==='l'?0:OX+G.W*TS,py=OY+d.pos*TS;R(lx+1,py+4,OX-2,6,K);R(lx+2,py+5,OX-4,4,'#374151');R(lx+3,py+6,1,1,blink?'#ff2d55':'#7f1d1d')}
      continue;
    }
    const open=S.phase==='open'&&clock-(d.anim||-99)<2.5;
    const isT=d.type==='toilet',col=isT?'#3b82f6':'#64748b';
    if(d.side==='t'){
      const px=OX+d.pos*TS;
      R(px+1,OY-19,14,19,K);R(px+2,OY-18,12,18,'#c9f1ff');
      if(open){R(px+2,OY-18,2,18,'#7cc7e8');R(px+12,OY-18,2,18,'#7cc7e8')}else{R(px+7,OY-18,2,18,'#7cc7e8')}
      R(px+3,OY-24,10,7,K);R(px+4,OY-23,8,5,col);txt(isT?'WC':'煙',px+8,OY-20.4,5,'#fff');
    }else{
      const lx=d.side==='l'?0:OX+G.W*TS,py=OY+d.pos*TS;
      R(lx,py+1,OX,14,K);R(lx+1,py+2,OX-2,12,open?'#7cc7e8':col);
      txt(isT?'W':'煙',lx+OX/2,py+8,5,'#fff');
    }
  }
}
function drawSeats(){
  for(const m of machines()){
    const s=seatOf(m),cx=OX+s.x*TS+8-DIRS[m.dir][0]*3,cy=OY+s.y*TS+9-DIRS[m.dir][1]*3;
    R(cx-3,cy+2,6,1.5,'rgba(0,0,0,.18)');blit(stoolSprite(),cx-3,cy-3);
    if(m.brk){R(cx-4,cy-9,8,6,K);R(cx-3,cy-8,6,4,'#fff');txt('休',cx,cy-6,4,'#ff2d55')}
  }
  for(const t of trash.values()){const px=OX+t.x*TS,py=OY+t.y*TS;R(px+3,py+11,3,2,'#f8fafc');R(px+10,py+12,2,3,'#ef4444');R(px+6,py+13,2,1,'#a3a3a3')}
}

/* ---------- 台 ---------- */
function drawMachine(m,now){
  const md=MB[m.type],px=OX+m.x*TS,py=OY+m.y*TS,fl=m.flash>0,blinkOn=fl&&Math.floor(now/90)%2===0,playing=S.phase==='open'&&!!m.occ;
  R(px+1,py+14,14,2,'rgba(0,0,0,.2)');
  blit(machineSprite(m,blinkOn),px,py-6);
  if(m.dir===0){
    if(md.k==='p'){
      /* 液晶：数字が回る。当たりは777 */
      const x0=px+5.5,y0=py+2;
      if(fl){R(x0,y0,5.5,4,blinkOn?'#fff36b':'#ffffff');for(let i=0;i<3;i++){R(x0+0.5+i*1.75,y0+0.5,1.25,0.5,'#e11d48');R(x0+1.25+i*1.75,y0+1,0.5,0.5,'#e11d48');R(x0+0.75+i*1.75,y0+1.5,0.5,2,'#e11d48')}}
      else{
        const t=playing?Math.floor(now/110+m.id):Math.floor(now/900+m.id),cols=['#38bdf8','#f472b6','#facc15','#4ade80','#a78bfa','#fb923c'];
        for(let i=0;i<3;i++)R(x0+0.5+i*1.75,y0+0.75,1.25,2.5,cols[(t+i*2+(i===1&&playing?Math.floor(now/170):0))%6]);
        if(playing&&Math.floor(now/600+m.id)%5===0)R(x0,y0+3.25,5.5,0.75,'#ff2d55');
      }
    }else{
      /* 上の液晶とリール */
      const lx=px+3.5,ly=py-2;
      if(fl){R(lx,ly,9,4,blinkOn?'#facc15':'#fff36b');txt('BIG',px+8,py,3.2,'#e11d48')}
      else if(playing){const k=Math.floor(now/160+m.id)%9;R(lx+k,ly+0.5,1.5,3,'#38bdf8');R(lx+(k+4)%9,ly+1,1,2,'#f472b6');R(lx,ly+3.5,9,0.5,'#4f46e5')}
      else if(Math.floor(now/700+m.id)%4===0)R(lx+1+(m.id%7),ly+1,0.5,0.5,'#fff');
      if(playing&&!fl){
        const ph=((now/1400)+m.id*0.37)%1;
        for(let i=0;i<3;i++){if(ph>0.42+i*0.16)continue;const rx=px+4+i*3,off=((now/45)+i*7)%4.5;
          R(rx,py+3.5,2.5,4.5,'#eef2f7');for(let j=0;j<3;j++){const yy=py+3.5+((off+j*1.5)%4.5);R(rx+0.5,yy,1.5,0.5,j===1?'#e11d48':'#94a3b8')}}
      }
    }
  }
  if(m.call&&Math.floor(now/200)%2===0){R(px+5,py-10,6,4,K);R(px+6,py-9,4,2,'#ff2d55')}
  if(m.broken){R(px+3,py+1,10,7,'rgba(51,65,85,.85)');const k=Math.floor(now/180)%3;R(px+5+k,py-6-k,2,2,'rgba(200,200,210,.8)');R(px+9-k,py-8+k,2,2,'rgba(160,160,170,.7)');if(Math.floor(now/300)%2)R(px+7,py+3,2,2,'#facc15')}
  if(m.today&&m.today.done&&S.phase==='open'){R(px,py-1,16,9,K);R(px+1,py,14,7,Math.floor(now/400)%2?'#ffcf3a':'#ff2d55');txt('完',px+8,py+3.6,6,K)}
  if(fl){const t=Math.floor(now/80);for(let i=0;i<5;i++){const a=(t+i*5)%12;R(px+1+((a*5+i*4)%14),py-8-(a%4),1,1,i%2?'#fff36b':'#fff')}}
}

/* ---------- 設備 ---------- */
function drawDecor(o,now){
  const px=OX+o.x*TS,py=OY+o.y*TS,n=DECOR_ANIM[o.type]||1;
  const f=n>1?Math.floor(now/(o.type==='neon'?220:o.type==='cat'?450:260)+o.id)%n:0;
  if(o.type!=='chandelier')R(px+1.5,py+12.5,13,2.5,'rgba(0,0,0,.16)');
  blit(decorSprite(o.type,f),px,py-5);
}

/* ---------- 人 ---------- */
/* 人：足もと (px,py) に、向き・ポーズ・コマを指定して貼る。戻り値は頭の位置の目安 */
function drawPerson(px,py,L,facing,pose,frame){
  R(px-3,py-1,6,1.5,'rgba(0,0,0,.2)');
  blit(personSprite(L,facing,pose,frame),px-4,py-14);
  return pose==='sit'?py-1:py-2;
}
function faceOf(a){
  if(!a.path||!a.path.length)return a.lastFace||'down';
  const dx=a.path[0].x-a.x,dy=a.path[0].y-a.y;
  a.lastFace=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
  return a.lastFace;
}
function drawCust(c,now){
  if(c.hidden)return;
  let px=OX+c.x*TS+8,py=OY+c.y*TS+15;
  const seated=(c.st==='play'||c.st==='call')&&c.m;let face;
  if(seated){const d=DIRS[c.m.dir];px-=d[0]*4;py-=d[1]*(c.m.dir===2?2:4);face=['up','right','down','left'][c.m.dir]}
  else face=faceOf(c);
  if(c.st==='roomQ'){px+=((c.id%3)-1)*3;py+=(c.id%2)}
  px=Math.round(px);py=Math.round(py);
  const walk=!seated&&c.path.length>0,ph=Math.floor(now/140+c.ph)%2;
  const em=c.emote&&c.emote.ch;
  const pose=seated?(em==='！'&&c.m&&c.m.flash>0?'cheer':'sit'):walk?'walk':(em==='♪'?'cheer':em==='…'?'slump':'stand');
  if(!c.L)c.L=fullLook(c.look,c.id,c.elder);
  const by=drawPerson(px,py,c.L,face,pose,walk?ph:0);
  if(c.st==='smoking'||(seated&&c.smoker&&c.zone&&Math.floor(now/700+c.ph)%3===0)){const k=Math.floor(now/150)%4;R(px+4,by-6-k,1,1,'rgba(240,240,240,.9)');R(px+5,by-8-k,1,1,'rgba(240,240,240,.6)');R(px+3,by-5,1.5,0.5,'#f8fafc')}
  if(c.reg){R(px-2,by-16,5,5,K);R(px-1,by-15,3,3,'#facc15')}
  if(c.bubble&&now<c.bubble.until&&!c.emote&&cam.s/dpr>=1.4){
    const t=c.bubble.text.length>11?c.bubble.text.slice(0,10)+'…':c.bubble.text,w=t.length*5+6,yy=(c.reg?by-24:by-19);
    R(px-w/2-1,yy-1,w+2,9,K);R(px-w/2,yy,w,7,'#fff');R(px-1,yy+7,2,2,K);txt(t,px,yy+3.7,5,'#16121f');
  }
  if(c.emote){
    const ch=c.emote.ch,col=ch==='！'||ch==='!'?'#ff2d55':ch==='♪'?'#16a34a':ch==='×'?'#ef4444':'#4a4f6a';
    const yy=c.reg?by-24:by-19;
    R(px-5,yy-1,11,9,K);R(px-4,yy,9,7,'#fff');R(px-1,yy+7,2,2,K);
    txt(ch,px+0.5,yy+3.6,6,col);
  }
}
const STAFF_HAIR=['#1b1b1b','#3b2a1a','#6b4a2b','#1b1b1b','#7a2a1a'];
function staffLook(a){
  if(!a.L){const h=hashN((a.s&&a.s.id)||7);a.L={skin:SKINS[h%4],hair:STAFF_HAIR[(h>>2)%STAFF_HAIR.length],hs:['short','bob','pony','spiky','short','long'][(h>>4)%6],role:a.role,pants:'#1f2937',shirt:'#f8fafc',glasses:(h>>6)%5===0?1:0}}
  return a.L;
}
function drawStaff(a,now){
  const px=Math.round(OX+a.x*TS+8),py=Math.round(OY+a.y*TS+15);
  const walk=a.path.length>0,face=faceOf(a);
  const by=drawPerson(px,py,staffLook(a),face,walk?'walk':'stand',walk?Math.floor(now/140+a.ph)%2:0);
  if(a.role==='clean'){R(px+3,by-9,1,10,'#a16207');R(px+2,by,4,1.5,'#facc15')}
  if(a.st==='work'){R(px-4,by-19,9,7,K);R(px-3,by-18,7,5,'#fff');txt(a.role==='hall'?'…':'✓',px+0.5,by-15.4,5,'#2563eb')}
}

/* ---------- 重ね表示 ---------- */
function drawOverlay(now,tool){
  if(S.phase==='prep'&&(S.event.type!=='none'&&S.event.type!=='renewal')){
    const c=Math.floor(now/400)%2?'#ff2d55':'#ff9fb5';
    for(const m of eventTargets()){const px=OX+m.x*TS,py=OY+m.y*TS;R(px,py+15,16,1,c);R(px-1,py-4,1,20,c);R(px+16,py-4,1,20,c)}
  }
  if(tool==='zone'){
    const cleaners=G.objs.filter(o=>o.kind==='d'&&o.type==='cleaner');
    for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
      const px=OX+x*TS,py=OY+y*TS;
      if(zoneAt(x,y)){txt('煙',px+8,py+8,7,'rgba(255,255,255,.85)')}
      else{let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(zoneAt(x+dx,y+dy)){near=true;break}
        if(near&&!cleaners.some(c=>Math.max(Math.abs(c.x-x),Math.abs(c.y-y))<=2))R(px+1,py+1,TS-2,TS-2,'rgba(255,170,60,.25)')}
    }
  }
  if(S.phase==='prep'&&((tool==='build'&&buildItem&&buildItem.type==='camera')||(panelSel&&panelSel.type==='camera'))){
    for(const d of G.doors)if(d.type==='camera'){const f=frontOf(d);R(OX+Math.max(0,f.x-5)*TS,OY+Math.max(0,f.y-5)*TS,(Math.min(G.W-1,f.x+5)-Math.max(0,f.x-5)+1)*TS,(Math.min(G.H-1,f.y+5)-Math.max(0,f.y-5)+1)*TS,'rgba(59,130,246,.16)')}
  }
  const mode=prefs.overlay;
  if(mode!=='off'){
    for(const m of machines()){
      const px=OX+m.x*TS,py=OY+m.y*TS,k=kindOf(m);
      if(mode==='set'){
        if(k==='s'){R(px+10,py-12,7,7,K);R(px+10.75,py-11.25,5.5,5.5,SET_COL[m.set]);txt(String(m.set),px+13.5,py-8.4,5,'#fff')}
        else{R(px+8,py-12,9,7,K);R(px+8.75,py-11.25,7.5,5.5,NAIL_COL[m.nail+2]);txt(NAIL_SHORT[m.nail+2],px+12.5,py-8.4,4,'#fff')}
      }else if(mode==='no'){R(px+3,py-12,10,7,K);R(px+3.75,py-11.25,8.5,5.5,'#fff');txt(String(m.no),px+8,py-8.4,5,K)}
      else if(mode==='rate'){const lo=m.rate==='lo';R(px+3,py-12,10,7,K);R(px+3.75,py-11.25,8.5,5.5,lo?'#22c55e':'#ff2d55');txt(rateLabel(m),px+8,py-8.4,4,'#fff')}
    }
    const rg=regulatedIds();
    if(rg.size&&S.phase==='prep'&&Math.floor(now/500)%2)for(const m of machines())if(rg.has(m.type)){const px=OX+m.x*TS,py=OY+m.y*TS;R(px+1,py+4,14,7,K);R(px+2,py+5,12,5,'#ff2d55');txt('撤去',px+8,py+7.6,4,'#fff')}
    if(mode==='set')for(const isl of islands){
      const m=isl.ms[0],px=OX+m.x*TS,py=OY+m.y*TS,w=isl.label.length>1?10:7;
      R(px-2,py-12,w,7,K);R(px-1.25,py-11.25,w-1.5,5.5,isl.kind==='mix'?'#f97316':isl.kind==='p'?'#2563eb':'#db2777');txt(isl.label,px-2+w/2,py-8.4,5,'#fff');
    }
  }
}
function drawSelection(now,sel,group){
  if(!sel||Math.floor(now/250)%2)return;
  for(const o of group){
    if(o.side){const f=frontOf(o);const px=OX+f.x*TS,py=OY+f.y*TS;R(px,py,16,1,'#facc15');R(px,py+15,16,1,'#facc15');R(px,py,1,16,'#facc15');R(px+15,py,1,16,'#facc15');continue}
    const px=OX+o.x*TS,py=OY+o.y*TS;
    R(px-1,py-5,18,2,'#facc15');R(px-1,py+15,18,2,'#facc15');R(px-1,py-5,2,22,'#facc15');R(px+15,py-5,2,22,'#facc15');
  }
}
function drawQueuePreview(now){
  if(S.phase!=='prep'||!(goActive()||(S.event.type!=='none')))return;
  const n=Math.min(goActive()?14:8,Math.round(G.W*0.7)),d=doorPos(),gy=OY+G.H*TS+BOT-2;
  for(let i=0;i<n;i++){
    const px=OX+d.x*TS+8-(i+1)*9-6;if(px<4)break;
    drawPerson(px,gy,fullLook({shirt:SHIRTS[i%SHIRTS.length],hair:HAIRS[i%HAIRS.length],skin:SKINS[i%4],cap:i%3===0?'#1c1c24':null},i*7+3,i%5===4),'up','stand',0);
  }
}

/* ---------- 1フレーム ---------- */
function render(now){
  if(!cv.width)return;
  ctx.imageSmoothingEnabled=false;
  drawBackdrop();
  ctx.setTransform(1,0,0,1,0,0);
  drawShell(now);drawSeasonDeco(now);drawDoors(now);drawSeats();
  const list=[];
  for(const o of G.objs)list.push({y:o.y+0.5,o});
  if(S.phase==='open'){for(const c of custs)if(!c.hidden)list.push({y:c.y+0.6,c});for(const a of staffA)list.push({y:a.y+0.61,a})}
  list.sort((a,b)=>a.y-b.y);
  for(const it of list){if(it.o){it.o.kind==='m'?drawMachine(it.o,now):drawDecor(it.o,now)}else if(it.c)drawCust(it.c,now);else drawStaff(it.a,now)}
  drawQueuePreview(now);
  drawOverlay(now,tool);
  const sel=moveSel||panelSel;
  if(sel)drawSelection(now,sel,(tool==='move'&&moveIsland&&sel.kind==='m')?islandOf(sel).ms:[sel]);
  for(const f of floats){
    const k=f.t/f.life;ctx.globalAlpha=k>0.7?(1-k)/0.3:1;
    txt(f.text,f.x,f.y-k*10,5,f.col,null,1.6);
  }
  ctx.globalAlpha=1;
}
