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
  const F=FB[G.floor],Wl=WLB[G.wall],gw=G.W*TS,gy=OY+G.H*TS;
  // 影
  R(OX-6,4,gw+16,gy+BOT,'rgba(0,0,0,.35)');
  // 上の壁
  R(0,0,gw+OX*2,OY,Wl.c);
  if(G.wall==='stripe'){for(let x=0;x<gw+OX*2;x+=8)R(x,0,4,OY-4,Wl.d)}
  else if(G.wall==='wood'){for(let x=0;x<gw+OX*2;x+=6)R(x,0,1,OY-4,'rgba(0,0,0,.18)')}
  else if(G.wall==='gold'){for(let x=0;x<gw+OX*2;x+=8)R(x,0,3,OY-4,'rgba(255,255,255,.25)')}
  else if(G.wall==='neonwall'){R(0,2,gw+OX*2,1,'#ff4fa3');R(0,OY-7,gw+OX*2,1,'#4ff0c4')}
  else{for(let x=0;x<gw+OX*2;x+=12)R(x,0,1,OY-4,'rgba(0,0,0,.06)')}
  R(0,OY-4,gw+OX*2,4,Wl.d);
  R(0,OY,OX,G.H*TS,Wl.d);R(OX+gw,OY,OX,G.H*TS,Wl.d);
  R(OX-2,OY,2,G.H*TS,'rgba(0,0,0,.25)');R(OX+gw,OY,2,G.H*TS,'rgba(0,0,0,.25)');
  // 看板
  ctx.setTransform(1,0,0,1,0,0);ctx.font='9px "Dela Gothic One","DotGothic16",sans-serif';
  const tw=Math.min(gw-24,ctx.measureText(S.name).width+16),sx=Math.round(OX+gw/2-tw/2);
  R(sx-1,2,tw+2,15,K);R(sx,3,tw,13,'#ff2d55');R(sx,3,tw,2,'#ff7a93');
  const blink=Math.floor(now/500)%2;
  for(let x=sx+2;x<sx+tw-2;x+=4){R(x,4,1,1,blink?'#ffe14f':'#fff');R(x+2,14,1,1,blink?'#fff':'#ffe14f')}
  txt(S.name,OX+gw/2,10,9,'#fff','"Dela Gothic One","DotGothic16",sans-serif',2);
  // 床
  for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
    const px=OX+x*TS,py=OY+y*TS;R(px,py,TS,TS,((x+y)&1)?F.b:F.a);
    if(G.floor==='red'||G.floor==='blue'){R(px+7,py+6,2,1,'rgba(255,220,90,.35)');R(px+6,py+7,4,2,'rgba(255,220,90,.35)');R(px+7,py+9,2,1,'rgba(255,220,90,.35)')}
    else if(G.floor==='wood'){R(px,py+7,TS,1,'rgba(0,0,0,.1)');R(px+((y%2)?4:11),py,1,7,'rgba(0,0,0,.1)')}
    else if(G.floor==='marble'&&(x*7+y*3)%5===0){R(px+2,py+5,6,1,'rgba(120,110,100,.22)');R(px+8,py+6,5,1,'rgba(120,110,100,.22)')}
    else if(G.floor==='tile'){R(px,py,TS,1,'rgba(255,255,255,.35)')}
    if(G.zone[y*G.W+x]===1){
      R(px,py,TS,TS,'rgba(70,45,120,.26)');
      for(let i=0;i<TS;i+=4)R(px+i,py+((i/4)%2?2:0),2,1,'rgba(255,255,255,.18)');
    }
  }
  // 入口と道路
  const d=doorPos(),mx=OX+d.x*TS,my=OY+d.y*TS;
  R(mx+1,my+3,14,12,'#5b4a2e');for(let i=0;i<4;i++)R(mx+2,my+4+i*3,12,1,'#7a6440');
  R(0,gy,gw+OX*2,BOT,'#4b4f63');
  for(let x=4;x<gw+OX*2;x+=12)R(x,gy+8,6,1,'#f4f4f4');
  R(0,gy,gw+OX*2,3,Wl.d);
  R(mx,gy,TS,3,'#4b4f63');R(mx,gy,1,5,'#9ee7ff');R(mx+15,gy,1,5,'#9ee7ff');
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
    R(cx-4,cy-3,8,6,K);R(cx-3,cy-2,6,2,'#ff4d6d');R(cx-3,cy,6,2,'#a31d3a');
    if(m.brk){R(cx-4,cy-9,8,6,K);R(cx-3,cy-8,6,4,'#fff');txt('休',cx,cy-6,4,'#ff2d55')}
  }
  for(const t of trash.values()){const px=OX+t.x*TS,py=OY+t.y*TS;R(px+3,py+11,3,2,'#f8fafc');R(px+10,py+12,2,3,'#ef4444');R(px+6,py+13,2,1,'#a3a3a3')}
}

/* ---------- 台 ---------- */
function drawMachine(m,now){
  const md=MB[m.type],px=OX+m.x*TS,py=OY+m.y*TS,fl=m.flash>0&&Math.floor(now/90)%2===0;
  if(m.dir===0||m.dir===2){
    R(px,py-4,16,20,K);R(px+1,py-3,14,18,md.c);
    R(px+2,py-2,12,2,fl?'#fff':md.c2);
    if(m.dir===0){
      R(px+3,py+1,10,7,K);R(px+4,py+2,8,5,fl?(Math.floor(now/60)%3?'#fff36b':'#fff'):'#1b1f4a');
      if(!fl){R(px+5,py+3,1,1,md.c2);R(px+9,py+5,1,1,md.c2);R(px+7,py+4,1,1,'#ff4fa3')}
      if(md.k==='s'){R(px+3,py+9,10,4,K);R(px+4,py+10,8,2,'#fff');R(px+5,py+10,1,2,'#ff2d55');R(px+7,py+10,1,2,'#ff2d55');R(px+10,py+10,1,2,'#ff2d55')}
      else{R(px+2,py+10,12,3,K);R(px+3,py+10,10,2,'#d4d8e3');R(px+4,py+10,1,1,'#fff');R(px+8,py+10,1,1,'#fff')}
    }else{
      R(px+3,py+1,10,11,'#2b2b3a');for(let i=0;i<4;i++)R(px+4,py+3+i*2,8,1,'#3f3f55');
    }
  }else{
    /* 横向き：客席側に画面と受け皿が見える */
    const r=m.dir===3,scr=fl?(Math.floor(now/60)%3?'#fff36b':'#fff'):'#1b1f4a';
    R(px+2,py-4,12,20,K);R(px+3,py-3,10,18,md.c);
    R(px+3,py-2,10,2,fl?'#fff':md.c2);
    R(r?px+5:px+10,py+1,1,10,md.c2);R(r?px+7:px+8,py+1,1,10,md.c2);
    R(r?px+10:px+3,py,3,10,K);R(r?px+11:px+4,py+1,1,8,scr);
    if(!fl)R(r?px+11:px+4,py+3,1,1,'#ff4fa3');
    R(r?px+13:px,py+8,3,4,K);R(r?px+13:px+1,py+9,2,2,md.k==='s'?'#fff':'#d4d8e3');
    R(px+3,py+13,10,2,'#2b2b3a');
  }
  if(m.call&&Math.floor(now/200)%2===0){R(px+5,py-8,6,4,K);R(px+6,py-7,4,2,'#ff2d55')}
  if(m.broken){R(px+3,py+1,10,7,'#334155');const k=Math.floor(now/180)%3;R(px+5+k,py-6-k,2,2,'rgba(200,200,210,.8)');R(px+9-k,py-8+k,2,2,'rgba(160,160,170,.7)');if(Math.floor(now/300)%2)R(px+7,py+3,2,2,'#facc15')}
  if(m.flash>0){const t=Math.floor(now/80);for(let i=0;i<4;i++){const a=(t+i*5)%12;R(px+1+((a*5+i*4)%14),py-6-(a%4),1,1,i%2?'#fff36b':'#fff')}}
}

/* ---------- 設備 ---------- */
function drawDecor(o,now){
  const px=OX+o.x*TS,py=OY+o.y*TS,t=now/1000;
  switch(o.type){
    case 'counter':
      OL(px+1,py+3,14,12,'#d9a066');R(px+1,py+3,14,3,'#f2c48d');
      OL(px+2,py-1,3,3,'#facc15');OL(px+7,py,3,2,'#ff6ad5');OL(px+11,py-1,3,3,'#4ff0c4');
      R(px+5,py+8,6,3,'#ff2d55');txt('景',px+8,py+9.6,4,'#fff');break;
    case 'vending':
      OL(px+2,py-3,12,17,'#ef4444');R(px+3,py-1,10,6,'#e0f2fe');
      ['#f97316','#3b82f6','#22c55e','#facc15'].forEach((c,i)=>R(px+4+(i%2)*5,py+(i>1?3:0),3,2,c));
      R(px+4,py+8,8,2,K);R(px+11,py+11,1,2,'#fff36b');break;
    case 'bench':
      OL(px+1,py+3,14,3,'#a16207');OL(px+1,py+8,14,3,'#ca8a04');R(px+2,py+11,2,3,K);R(px+12,py+11,2,3,K);break;
    case 'plant':
      OL(px+5,py+9,6,5,'#c2410c');OL(px+3,py+1,10,8,'#16a34a');R(px+5,py-2,6,4,'#22c55e');R(px+4,py-2,1,1,K);R(px+5,py-3,6,1,K);R(px+6,py+2,2,2,'#4ade80');break;
    case 'changer':
      OL(px+4,py,8,14,'#94a3b8');R(px+5,py+2,6,3,'#fff36b');R(px+6,py+8,4,1,K);break;
    case 'booth':{
      OL(px+1,py-3,14,17,'rgba(148,216,232,.55)');R(px+1,py-3,14,2,'#e0f7ff');
      for(let i=0;i<3;i++){const k=(t*0.8+i/3)%1;R(px+4+i*3,py+8-Math.floor(k*10),2,2,'rgba(255,255,255,.75)')}
      txt('煙',px+8,py+11,5,K);break;}
    case 'cleaner':{
      OL(px+4,py+1,8,13,'#f8fafc');const on=Math.floor(t*2)%2;R(px+5,py+3,6,2,on?'#38bdf8':'#7dd3fc');R(px+6,py+8,4,3,'#cbd5e1');break;}
    case 'neon':{
      const on=Math.floor(t*3+o.id)%7!==0;
      R(px+7,py+8,2,6,K);OL(px+1,py-2,14,10,'#14102a');
      R(px+2,py-1,12,1,on?'#ff4fa3':'#5a2340');R(px+2,py+6,12,1,on?'#ff4fa3':'#5a2340');
      R(px+4,py+1,8,1,on?'#4ff0c4':'#24564a');R(px+4,py+4,8,1,on?'#4ff0c4':'#24564a');R(px+7,py+1,2,4,on?'#4ff0c4':'#24564a');break;}
    case 'cat':{
      const up=Math.floor(t*2+o.id)%2===0;
      OL(px+4,py+2,8,11,'#fff');R(px+4,py,2,2,K);R(px+10,py,2,2,K);R(px+4,py+1,2,1,'#fff');R(px+10,py+1,2,1,'#fff');
      R(px+4,py+7,8,1,'#ef4444');R(px+7,py+8,2,2,'#facc15');R(px+6,py+4,1,1,K);R(px+9,py+4,1,1,K);
      OL(px+12,up?py-1:py+1,2,4,'#fff');break;}
    case 'chandelier':{
      R(px+7,py-4,2,5,K);OL(px+2,py+1,12,3,'#facc15');OL(px+4,py+5,8,2,'#eab308');
      const k=Math.floor(t*4+o.id)%4;[2,6,10,13].forEach((xx,i)=>{if(i!==k)R(px+xx,py-1,1,2,'#fff8d0')});
      R(px,py+9,16,6,'rgba(255,230,140,.25)');break;}
    case 'fountain':{
      OL(px,py+6,16,9,'#cbd5e1');R(px+2,py+7,12,6,'#38bdf8');R(px+7,py,2,8,'#e2e8f0');
      const k=Math.floor(t*6)%3;R(px+5-k,py+k,1,2,'#bae6fd');R(px+10+k,py+k,1,2,'#bae6fd');R(px+7,py-3-k%2,2,2,'#bae6fd');break;}
  }
}

/* ---------- 人 ---------- */
function drawPerson(px,py,look,face,walk,ph,seated,extra){
  if(!seated){R(px-3,py-3,6,4,K);R(px-2,py-3+(walk&&ph?1:0),1,3,'#2b2b3a');R(px+1,py-3+(walk&&!ph?1:0),1,3,'#2b2b3a')}
  const by=seated?py-2:py-3;
  R(px-5,by-11,10,7,K);R(px-4,by-6,8,4,K);
  R(px-4,by-5,8,4,look.shirt);
  R(px-3,by-10,6,5,look.skin);
  if(face==='up')R(px-3,by-10,6,4,look.hair);
  else{R(px-3,by-10,6,2,look.hair);R(px-3,by-8,1,1,look.hair);R(px+2,by-8,1,1,look.hair);R(px-2,by-7,1,1,K);R(px+1,by-7,1,1,K)}
  if(look.cap){R(px-4,by-12,8,3,K);R(px-3,by-11,6,1,look.cap);if(face!=='up')R(px-4,by-9,8,1,K)}
  if(look.shades&&face!=='up'){R(px-3,by-8,6,2,K);R(px-2,by-8,1,1,'#64748b')}
  if(extra==='hall'){R(px-1,by-5,2,1,'#facc15')}
  if(extra==='clean'){R(px+4,by-9,1,8,'#a16207');R(px+3,by-1,3,1,'#facc15')}
  return by;
}
function drawCust(c,now){
  if(c.hidden)return;
  let px=OX+c.x*TS+8,py=OY+c.y*TS+15;
  const seated=(c.st==='play'||c.st==='call')&&c.m;let face='down';
  if(seated){const d=DIRS[c.m.dir];px-=d[0]*4;py-=d[1]*(c.m.dir===2?2:4);face=c.m.dir===0?'up':'down'}
  else if(c.path.length&&c.path[0].y<c.y-0.01)face='up';
  if(c.st==='roomQ'){px+=((c.id%3)-1)*3;py+=(c.id%2)}
  px=Math.round(px);py=Math.round(py);
  const walk=!seated&&c.path.length>0,ph=Math.floor(now/140+c.ph)%2;
  const by=drawPerson(px,py,c.look,face,walk,ph,seated);
  if(c.st==='smoking'||(seated&&c.smoker&&c.zone&&Math.floor(now/700+c.ph)%3===0)){const k=Math.floor(now/150)%4;R(px+4,by-6-k,1,1,'rgba(240,240,240,.9)');R(px+5,by-8-k,1,1,'rgba(240,240,240,.6)')}
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
function drawStaff(a,now){
  const px=Math.round(OX+a.x*TS+8),py=Math.round(OY+a.y*TS+15);
  const face=a.path.length&&a.path[0].y<a.y-0.01?'up':'down';
  const look={shirt:ROLES[a.role].col,hair:'#1b1b1b',skin:'#f6d1b0'};
  const by=drawPerson(px,py,look,face,a.path.length>0,Math.floor(now/140+a.ph)%2,false,a.role);
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
        if(k==='s'){R(px+8,py-7,9,9,K);R(px+9,py-6,7,7,SET_COL[m.set]);txt(String(m.set),px+12.5,py-2.4,6,'#fff')}
        else{R(px+5,py-7,12,9,K);R(px+6,py-6,10,7,NAIL_COL[m.nail+2]);txt(NAIL_SHORT[m.nail+2],px+11,py-2.4,5,'#fff')}
      }else if(mode==='no'){R(px,py-7,16,9,K);R(px+1,py-6,14,7,'#fff');txt(String(m.no),px+8,py-2.4,6,K)}
      else if(mode==='rate'){const lo=m.rate==='lo';R(px+1,py-7,14,9,K);R(px+2,py-6,12,7,lo?'#22c55e':'#ff2d55');txt(rateLabel(m),px+8,py-2.4,5,'#fff')}
    }
    const rg=regulatedIds();
    if(rg.size&&S.phase==='prep'&&Math.floor(now/500)%2)for(const m of machines())if(rg.has(m.type)){const px=OX+m.x*TS,py=OY+m.y*TS;R(px,py+6,16,7,K);R(px+1,py+7,14,5,'#ff2d55');txt('撤去',px+8,py+9.6,4,'#fff')}
    if(mode==='set')for(const isl of islands){
      const m=isl.ms[0],px=OX+m.x*TS,py=OY+m.y*TS,w=isl.label.length>1?11:8;
      R(px-2,py-7,w+2,9,K);R(px-1,py-6,w,7,isl.kind==='mix'?'#f97316':isl.kind==='p'?'#2563eb':'#db2777');txt(isl.label,px-1+w/2,py-2.4,6,'#fff');
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
    drawPerson(px,gy,{shirt:SHIRTS[i%SHIRTS.length],hair:HAIRS[i%HAIRS.length],skin:SKINS[i%4],cap:i%3===0?'#1c1c24':null},'down',false,0,false);
  }
}

/* ---------- 1フレーム ---------- */
function render(now){
  if(!cv.width)return;
  drawBackdrop();
  ctx.setTransform(1,0,0,1,0,0);
  drawShell(now);drawDoors(now);drawSeats();
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
