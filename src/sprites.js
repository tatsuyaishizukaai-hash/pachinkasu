/* ===== sprites.js : ドット絵の部品（台・人・設備・床・壁）=====
   1マス16の世界を、絵は2倍（32ドット）の細かさで描く。
   描いた絵は小さなキャンバスに覚えておき、毎フレームは貼るだけにする（重くしないため） */
const SP=2;
const SPR=new Map();
function sprite(key,w,h,draw){
  let c=SPR.get(key);if(c)return c;
  c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;draw(g,w,h);
  if(SPR.size>3000)SPR.clear();
  SPR.set(key,c);return c;
}
function pp(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function shade(hex,a){
  if(!hex||hex[0]!=='#'||hex.length<7)return hex;
  const n=parseInt(hex.slice(1,7),16);let r=n>>16,gg=(n>>8)&255,b=n&255;
  if(a>=0){r+=(255-r)*a;gg+=(255-gg)*a;b+=(255-b)*a}else{r*=1+a;gg*=1+a;b*=1+a}
  return '#'+[r,gg,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function disc(g,cx,cy,r,col){for(let y=-r;y<=r;y++){const w=Math.round(Math.sqrt(Math.max(0,r*r-y*y)));pp(g,cx-w,cy+y,w*2,1,col)}}
function mirror(g,w,fn){g.save();g.translate(w,0);g.scale(-1,1);fn();g.restore()}
/* 箱（黒いふち・角を落とす・光と影） */
function box(g,x,y,w,h,base){
  pp(g,x+1,y,w-2,h,K);pp(g,x,y+1,w,h-2,K);
  pp(g,x+1,y+1,w-2,h-2,base);
  pp(g,x+1,y+1,w-2,1,shade(base,.4));pp(g,x+1,y+2,1,h-4,shade(base,.22));
  pp(g,x+w-2,y+2,1,h-4,shade(base,-.28));pp(g,x+2,y+h-2,w-4,1,shade(base,-.35));
}
/* 世界の座標に貼る（くっきり） */
function blit(c,wx,wy,flip){
  const s=cam.s,x0=Math.round((wx-cam.x)*s),y0=Math.round((wy-cam.y)*s),x1=Math.round((wx+c.width/SP-cam.x)*s),y1=Math.round((wy+c.height/SP-cam.y)*s);
  if(x1<0||y1<0||x0>cv.width||y0>cv.height)return;
  ctx.drawImage(c,x0,y0,x1-x0,y1-y0);
}

/* ================= 台 =================
   パチンコ：銀色の枠・まるいガラス盤面・真ん中の液晶・右下のハンドル・上皿に玉
   スロット：黒い箱・上の液晶・3本のリール（7が並ぶ）・レバーとボタン・メダルの皿・てっぺんの回転灯 */
function seven(g,x,y,c){pp(g,x,y,3,1,c);pp(g,x+2,y+1,1,1,c);pp(g,x+1,y+2,1,2,c)}
function barSym(g,x,y){pp(g,x,y,3,2,'#111827');pp(g,x,y+1,3,1,'#f8fafc');pp(g,x,y+1,3,0,'#111827')}
function cherry(g,x,y){pp(g,x+1,y,1,1,'#16a34a');pp(g,x,y+1,1,2,'#dc2626');pp(g,x+2,y+1,1,2,'#dc2626')}
function pachiFront(g,md,lit){
  const c=md.c,c2=md.c2;
  /* 役物（てっぺんの飾り） */
  pp(g,9,1,14,5,K);pp(g,12,0,8,2,K);pp(g,10,2,12,3,lit?'#fff36b':c2);pp(g,13,1,6,1,shade(c2,.5));
  pp(g,11,2,2,1,'#fff');pp(g,15,3,2,1,lit?'#ff2d55':shade(c,-.1));
  box(g,1,4,30,40,'#d7dce6');                       // 銀色の枠
  pp(g,2,5,28,2,c);pp(g,2,40,28,3,shade(c,-.15));   // 機種の色の帯
  pp(g,3,7,26,3,K);for(let i=0;i<6;i++)pp(g,4+i*4,8,3,1,lit?(i%2?'#ffffff':'#ff4fa3'):shade(c2,.45));
  /* ガラス盤面 */
  disc(g,16,21,12,K);disc(g,16,21,11,c);disc(g,16,21,10,'#eef2f8');disc(g,16,21,9,shade(c2,.6));
  for(const[x,y]of[[9,15],[11,13],[13,12],[19,12],[21,13],[23,15],[8,19],[24,19],[8,24],[24,24],[10,27],[22,27],[13,29],[19,29]])pp(g,x,y,1,1,'#7c8396');
  pp(g,10,15,13,10,K);pp(g,11,16,11,8,'#121634');   // 液晶（中は動きで描く）
  pp(g,9,14,3,3,c);pp(g,21,14,3,3,c);pp(g,10,15,1,1,shade(c,.5));pp(g,22,15,1,1,shade(c,.5));
  pp(g,15,26,3,2,K);pp(g,16,26,1,1,'#facc15');       // ヘソ
  pp(g,12,19,1,1,'#fff');pp(g,20,22,1,1,'#fff');pp(g,14,28,1,1,'#fff');
  pp(g,8,14,1,3,'rgba(255,255,255,.8)');pp(g,9,12,2,1,'rgba(255,255,255,.8)');
  /* 上皿と玉 */
  pp(g,3,33,22,5,K);pp(g,4,34,20,3,'#b8c0cf');pp(g,4,34,20,1,'#eef2f7');
  for(let i=0;i<6;i++){pp(g,5+i*3,35,2,1,'#ffffff');pp(g,5+i*3,36,2,1,'#9aa3b5')}
  /* ハンドル */
  pp(g,24,33,8,8,K);pp(g,25,34,6,6,'#4b5563');pp(g,26,35,4,4,'#f97316');pp(g,27,36,2,2,'#fdba74');pp(g,31,36,1,2,K);
  pp(g,4,39,18,2,'#6b7385');pp(g,6,39,6,1,'#9aa3b5');
}
function slotFront(g,md,lit){
  const c=md.c,c2=md.c2,body='#221d33';
  /* 回転灯 */
  pp(g,11,0,10,1,K);pp(g,10,1,12,4,K);pp(g,11,1,10,3,lit?'#fff36b':c2);pp(g,12,1,3,1,'#fff');pp(g,17,2,3,1,lit?'#ffffff':shade(c2,.4));
  box(g,2,4,28,40,body);
  pp(g,3,5,2,37,c);pp(g,27,5,2,37,c);pp(g,3,5,26,1,shade(c,.3));
  /* 上の液晶 */
  pp(g,6,7,20,10,K);pp(g,7,8,18,8,'#0b1024');pp(g,6,6,20,1,c2);
  /* リール */
  pp(g,6,18,20,11,'#e8b931');pp(g,7,19,18,9,K);
  for(let i=0;i<3;i++){const rx=8+i*6;pp(g,rx,19,5,9,'#f8fafc');pp(g,rx,19,5,1,'#cbd5e1');pp(g,rx,27,5,1,'#cbd5e1')}
  barSym(g,9,20);cherry(g,15,20);barSym(g,21,20);
  seven(g,9,23,'#e11d48');seven(g,15,23,'#e11d48');seven(g,21,23,'#e11d48');
  cherry(g,9,26);barSym(g,15,26);cherry(g,21,26);
  pp(g,7,24,1,1,'#ff2d55');pp(g,24,24,1,1,'#ff2d55');
  /* 操作パネル */
  pp(g,5,30,22,5,'#3a3352');pp(g,5,30,22,1,'#5d5680');
  pp(g,6,26,1,6,'#cbd5e1');pp(g,5,25,3,2,K);pp(g,5,25,2,1,'#ef4444');
  pp(g,9,31,2,2,'#facc15');
  for(let i=0;i<3;i++){pp(g,12+i*4,31,3,3,K);pp(g,13+i*4,32,1,1,lit?'#fff36b':'#e5e7eb')}
  pp(g,25,31,1,3,'#facc15');
  /* メダルの皿 */
  pp(g,5,37,22,5,K);pp(g,6,38,20,3,'#a8b0c0');pp(g,6,38,20,1,'#dfe4ec');
  for(let i=0;i<6;i++)pp(g,7+i*3,39,2,1,'#fbbf24');
}
function pachiBack(g,md,lit){
  const c=md.c;
  pp(g,8,0,16,5,K);pp(g,9,1,14,3,'#cbd5e1');for(let i=0;i<6;i++)pp(g,10+i*2,2,1,1,'#fff');  // 玉のタンク
  box(g,1,4,30,40,'#9aa3b6');
  pp(g,2,5,28,4,c);pp(g,2,5,28,1,shade(c,.35));if(lit)pp(g,4,6,24,2,'#fff36b');
  for(let i=0;i<5;i++){pp(g,5,12+i*4,22,2,'#7e879a');pp(g,5,12+i*4,22,1,'#6b7385')}
  disc(g,16,35,5,K);disc(g,16,35,4,'#eef2f8');
  pp(g,14,32,2,6,'#2563eb');pp(g,16,32,2,1,'#2563eb');pp(g,18,33,1,2,'#2563eb');pp(g,16,35,2,1,'#2563eb');  // P
}
function slotBack(g,md,lit){
  const c=md.c,c2=md.c2;
  pp(g,11,0,10,1,K);pp(g,10,1,12,4,K);pp(g,11,1,10,3,lit?'#fff36b':c2);pp(g,12,1,3,1,'#fff');
  box(g,2,4,28,40,'#2a2540');
  pp(g,3,5,26,4,c);pp(g,3,5,26,1,shade(c,.35));if(lit)pp(g,5,6,22,2,'#fff36b');
  for(let i=0;i<5;i++){pp(g,6,12+i*4,20,2,'#3d3758');pp(g,6,12+i*4,20,1,'#1a1628')}
  pp(g,11,30,10,10,K);pp(g,12,31,8,8,'#facc15');seven(g,14,33,'#e11d48');pp(g,14,33,4,1,'#e11d48');
}
/* 横向き（左に客席がある向き）。右向きは左右反転して作る */
function pachiSide(g,md,lit){
  const c=md.c,c2=md.c2;
  pp(g,10,0,10,5,K);pp(g,11,1,8,3,lit?'#fff36b':c2);
  box(g,9,4,19,40,shade('#d7dce6',-.08));
  pp(g,10,5,4,37,c);pp(g,10,5,4,1,shade(c,.4));
  for(let y=10;y<=31;y++){const w=Math.round(Math.sqrt(Math.max(0,121-(y-21)*(y-21)))/3.2);if(w>0){pp(g,9-w-1,y,w+1,1,K);pp(g,9-w,y,w,1,y<14||y>28?'#cfd8e8':shade(c2,.6))}}
  pp(g,7,15,1,3,'#fff');
  pp(g,5,32,5,4,K);pp(g,6,33,4,2,'#b8c0cf');pp(g,6,33,1,1,'#fff');pp(g,8,33,1,1,'#fff');
  pp(g,2,36,7,5,K);pp(g,3,37,5,3,'#f97316');pp(g,4,38,2,1,'#fdba74');
  for(let i=0;i<4;i++)pp(g,17,12+i*6,8,2,shade('#d7dce6',-.25));
  pp(g,10,7,4,2,lit?'#ffffff':shade(c2,.4));
}
function slotSide(g,md,lit){
  const c=md.c,c2=md.c2;
  pp(g,12,0,8,1,K);pp(g,11,1,10,4,K);pp(g,12,1,8,3,lit?'#fff36b':c2);
  box(g,9,4,19,40,'#2a2540');
  pp(g,10,5,4,37,c);pp(g,10,5,4,1,shade(c,.4));
  pp(g,7,18,4,10,'#e8b931');pp(g,8,19,3,8,'#f8fafc');pp(g,8,22,3,2,'#e11d48');
  pp(g,6,27,4,6,'#3a3352');pp(g,4,24,2,6,'#cbd5e1');pp(g,3,23,3,2,'#ef4444');
  pp(g,5,36,6,4,K);pp(g,6,37,4,2,'#a8b0c0');pp(g,6,37,3,1,'#fbbf24');
  for(let i=0;i<4;i++)pp(g,17,12+i*6,8,2,'#3d3758');
  pp(g,8,8,3,8,K);pp(g,9,9,2,6,'#0b1024');
}
function machineSprite(m,lit){
  const md=MB[m.type],k=md.k,d=m.dir;
  return sprite(`m|${m.type}|${d}|${lit?1:0}`,32,44,(g,w)=>{
    if(d===0)(k==='p'?pachiFront:slotFront)(g,md,lit);
    else if(d===2)(k==='p'?pachiBack:slotBack)(g,md,lit);
    else if(d===1)(k==='p'?pachiSide:slotSide)(g,md,lit);
    else mirror(g,w,()=>(k==='p'?pachiSide:slotSide)(g,md,lit));
  });
}

/* ================= 人 =================
   ちびキャラ（頭が大きめ）。前・後ろ・横の向き、歩き2コマ、座り・ばんざい・がっくり */
const HAIR_STYLES=['short','spiky','long','bob','pony','short','spiky'];
const OUTFITS=['tee','hoodie','jacket','tee','suit','cardigan','jacket'];
const PANTS=['#1f2937','#334155','#3f3a2e','#1e3a8a','#57534e','#111827'];
function hashN(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return Math.abs(n)}
/* 見た目の足りない部分を、番号から決まった形でうめる（古いセーブや常連の定義にも対応） */
function fullLook(look,seed,elder){
  const h=hashN(seed||1),L=Object.assign({},look);
  if(!L.hs)L.hs=elder?(h%3===0?'bald':h%3===1?'perm':'short'):HAIR_STYLES[h%HAIR_STYLES.length];
  if(!L.out)L.out=elder?(h%2?'cardigan':'jacket'):OUTFITS[(h>>3)%OUTFITS.length];
  if(!L.pants)L.pants=PANTS[(h>>5)%PANTS.length];
  if(L.glasses==null)L.glasses=(h>>7)%6===0?1:0;
  if(L.mask==null)L.mask=(h>>9)%9===0?1:0;
  return L;
}
function lookKey(L){return [L.skin,L.hair,L.hs,L.shirt,L.out,L.pants,L.cap||'',L.shades?1:0,L.glasses?1:0,L.mask?1:0,L.role||''].join(',')}
function personSprite(L,facing,pose,frame){
  const key=`p|${lookKey(L)}|${facing}|${pose}|${frame}`;
  return sprite(key,16,28,(g,w)=>{
    if(facing==='right')mirror(g,w,()=>drawPersonPx(g,L,'left',pose,frame));
    else drawPersonPx(g,L,facing,pose,frame);
  });
}
function drawPersonPx(g,L,facing,pose,frame){
  const skin=L.skin||'#f6d1b0',hair=L.hair||'#1b1b1b',shirt=L.shirt||'#3b82f6',pants=L.pants||'#1f2937';
  const sit=pose==='sit',walk=pose==='walk',cheer=pose==='cheer',slump=pose==='slump';
  const by=sit?2:0;   // 座ると少し下がる
  /* 足 */
  if(facing==='left'){
    if(sit){pp(g,3,22,7,4,K);pp(g,3,23,6,2,pants);pp(g,2,25,3,2,K)}
    else{
      const a=walk&&frame?1:0;
      pp(g,5-a*2,22,3,6,K);pp(g,6-a*2,22,1,5,pants);pp(g,8+a*2,22,3,6,K);pp(g,9+a*2,22,1,5,pants);
      pp(g,4-a*2,26,3,2,K);pp(g,7+a*2,26,3,2,K);
    }
  }else if(!sit){
    const a=walk?(frame?1:-1):0;
    pp(g,4,22,4,6-(a>0?1:0),K);pp(g,5,22,2,4-(a>0?1:0),pants);
    pp(g,8,22,4,6-(a<0?1:0),K);pp(g,9,22,2,4-(a<0?1:0),pants);
  }else if(facing==='down'){pp(g,4,23,8,3,K);pp(g,5,23,2,2,pants);pp(g,9,23,2,2,pants)}
  /* 体 */
  const top=13+by;
  if(facing==='left'){
    pp(g,4,top,8,10-by,K);pp(g,5,top+1,6,8-by,outColor(L));pp(g,5,top+1,6,1,shade(outColor(L),.25));
    if(L.out==='suit'||L.role){pp(g,5,top+1,2,4,'#f8fafc');if(L.role)pp(g,5,top+1,1,2,'#e11d48')}
    if(cheer){pp(g,4,top-6,2,7,shade(outColor(L),-.25));pp(g,4,top-7,2,1,skin)}
    else{pp(g,7,top+2,2,5,shade(outColor(L),-.3));pp(g,6,top+6,2,1,skin)}
  }else{
    pp(g,2,top,12,10-by,K);pp(g,3,top+1,10,8-by,outColor(L));
    if(facing==='down')bodyFront(g,L,top,shirt);else bodyBack(g,L,top);
    if(cheer){pp(g,0,top-7,3,9,K);pp(g,13,top-7,3,9,K);pp(g,1,top-6,1,7,outColor(L));pp(g,14,top-6,1,7,outColor(L));pp(g,1,top-7,1,1,skin);pp(g,14,top-7,1,1,skin)}
    else{pp(g,1,top+1,2,7,K);pp(g,13,top+1,2,7,K);pp(g,1,top+6,2,1,skin);pp(g,13,top+6,2,1,skin)}
  }
  /* 頭 */
  const hy=(slump?2:0)+by;
  pp(g,3,1+hy,10,1,K);pp(g,2,2+hy,12,10,K);pp(g,3,12+hy,10,1,K);
  if(facing==='up'){
    pp(g,3,2+hy,10,10,L.hs==='bald'?skin:hair);
    if(L.hs==='bald'){pp(g,3,7+hy,1,3,hair);pp(g,12,7+hy,1,3,hair)}
    if(L.hs==='pony'){pp(g,6,10+hy,4,4,K);pp(g,7,10+hy,2,3,hair)}
    if(L.hs==='long'){pp(g,3,11+hy,10,3,hair)}
    if(L.hs==='perm'){pp(g,1,3+hy,14,7,K);pp(g,2,3+hy,12,6,hair)}
    pp(g,4,3+hy,3,1,shade(hair,.3));
    if(L.cap){pp(g,3,2+hy,10,4,L.cap);pp(g,6,5+hy,4,1,shade(L.cap,-.3))}
  }else if(facing==='left'){
    pp(g,3,3+hy,10,9,skin);
    if(L.hs==='bald'){pp(g,10,6+hy,3,4,hair);pp(g,5,3+hy,3,1,'#fff7ed')}
    else{
      pp(g,3,2+hy,10,3,hair);pp(g,10,5+hy,3,5,hair);pp(g,9,5+hy,1,2,hair);pp(g,4,3+hy,3,1,shade(hair,.3));
      if(L.hs==='long'||L.hs==='bob'){pp(g,9,5+hy,4,L.hs==='long'?9:6,hair)}
      if(L.hs==='perm'){pp(g,2,1+hy,13,5,K);pp(g,3,1+hy,11,4,hair);pp(g,9,4+hy,5,7,hair)}
      if(L.hs==='spiky'){pp(g,4,1+hy,1,1,hair);pp(g,7,0+hy,1,2,hair);pp(g,10,1+hy,1,1,hair)}
      if(L.hs==='pony'){pp(g,13,5+hy,2,5,hair)}
    }
    pp(g,10,7+hy,1,2,shade(skin,-.25));
    pp(g,4,7+hy,1,2,K);pp(g,2,8+hy,1,1,skin);pp(g,4,10+hy,2,1,slump?'#7c4a42':'#b45346');
    if(L.glasses||L.shades)pp(g,3,7+hy,3,1,L.shades?'#111827':K);
    if(L.mask)pp(g,2,9+hy,5,3,'#f1f5f9');
    if(L.cap){pp(g,3,2+hy,10,3,L.cap);pp(g,1,4+hy,4,1,shade(L.cap,-.3))}
  }else{
    pp(g,3,3+hy,10,9,skin);
    hairFront(g,L.hs,hair,skin,hy);
    const ey=7+hy;
    if(slump){pp(g,5,ey+1,2,1,K);pp(g,9,ey+1,2,1,K)}
    else if(cheer){pp(g,4,ey,1,1,K);pp(g,5,ey-1,1,1,K);pp(g,6,ey,1,1,K);pp(g,9,ey,1,1,K);pp(g,10,ey-1,1,1,K);pp(g,11,ey,1,1,K)}
    else{pp(g,5,ey,1,2,K);pp(g,10,ey,1,2,K)}
    pp(g,4,ey+2,1,1,'#f9a8b4');pp(g,11,ey+2,1,1,'#f9a8b4');
    if(cheer){pp(g,7,ey+3,2,2,'#7f1d1d')}else if(slump){pp(g,7,ey+4,2,1,'#7c4a42')}else pp(g,7,ey+3,2,1,'#b45346');
    if(L.glasses&&!L.shades){pp(g,4,ey-1,3,1,K);pp(g,9,ey-1,3,1,K);pp(g,4,ey,1,1,K);pp(g,6,ey,1,1,K);pp(g,9,ey,1,1,K);pp(g,11,ey,1,1,K);pp(g,7,ey,2,1,K)}
    if(L.shades){pp(g,4,ey,8,2,'#111827');pp(g,5,ey,1,1,'#64748b');pp(g,10,ey,1,1,'#64748b')}
    if(L.mask){pp(g,4,ey+2,8,3,'#f1f5f9');pp(g,4,ey+2,8,1,'#cbd5e1')}
    if(L.cap){pp(g,3,1+hy,10,4,L.cap);pp(g,2,5+hy,12,1,shade(L.cap,-.35));pp(g,6,2+hy,4,1,shade(L.cap,.3))}
  }
}
function outColor(L){if(L.role)return '#1f2937';if(L.out==='suit')return '#334155';return L.shirt||'#3b82f6'}
function bodyFront(g,L,top,shirt){
  if(L.role){
    pp(g,3,top+1,10,8,'#f8fafc');pp(g,3,top+1,3,8,'#1f2937');pp(g,10,top+1,3,8,'#1f2937');
    pp(g,6,top+1,4,2,'#e11d48');pp(g,7,top+1,2,1,'#9f1239');pp(g,10,top+3,2,1,ROLES[L.role]?ROLES[L.role].col:'#facc15');
    return;
  }
  switch(L.out){
    case 'suit':pp(g,6,top+1,4,4,'#f8fafc');pp(g,7,top+2,2,4,shirt);pp(g,6,top+5,1,3,'#475569');pp(g,9,top+5,1,3,'#475569');break;
    case 'hoodie':pp(g,4,top+1,8,1,shade(shirt,-.25));pp(g,6,top+2,1,2,'#f8fafc');pp(g,9,top+2,1,2,'#f8fafc');pp(g,5,top+5,6,2,shade(shirt,-.2));break;
    case 'jacket':pp(g,7,top+1,1,8,shade(shirt,-.4));pp(g,4,top+1,2,2,shade(shirt,-.2));pp(g,10,top+1,2,2,shade(shirt,-.2));pp(g,5,top+1,5,1,'#f8fafc');break;
    case 'cardigan':pp(g,6,top+1,4,3,'#f8fafc');pp(g,7,top+4,1,1,'#fff');pp(g,7,top+6,1,1,'#fff');pp(g,3,top+1,10,1,shade(shirt,-.15));break;
    default:pp(g,6,top+1,4,1,shade(shirt,-.3));pp(g,4,top+4,8,1,shade(shirt,.25));
  }
}
function bodyBack(g,L,top){
  if(L.role){pp(g,3,top+1,10,8,'#1f2937');pp(g,3,top+1,10,1,'#374151');return}
  if(L.out==='hoodie'){pp(g,5,top+1,6,3,shade(L.shirt,-.2))}
  else pp(g,4,top+1,8,1,shade(outColor(L),.2));
}
function hairFront(g,hs,hair,skin,hy){
  const y=hy;
  switch(hs){
    case 'bald':pp(g,3,6+y,1,3,hair);pp(g,12,6+y,1,3,hair);pp(g,6,3+y,3,1,'#fff7ed');break;
    case 'perm':pp(g,1,1+y,14,6,K);pp(g,2,1+y,12,5,hair);pp(g,1,4+y,2,5,K);pp(g,13,4+y,2,5,K);pp(g,2,5+y,1,3,hair);pp(g,13,5+y,1,3,hair);pp(g,4,2+y,2,1,shade(hair,.35));pp(g,9,2+y,2,1,shade(hair,.35));break;
    case 'long':pp(g,3,2+y,10,3,hair);pp(g,2,4+y,2,10,hair);pp(g,12,4+y,2,10,hair);pp(g,5,5+y,2,1,hair);pp(g,4,3+y,3,1,shade(hair,.3));break;
    case 'bob':pp(g,3,2+y,10,4,hair);pp(g,2,4+y,2,7,hair);pp(g,12,4+y,2,7,hair);pp(g,4,3+y,3,1,shade(hair,.3));break;
    case 'spiky':pp(g,3,2+y,10,3,hair);pp(g,3,1+y,1,1,hair);pp(g,6,0+y,1,2,hair);pp(g,9,0+y,1,2,hair);pp(g,12,1+y,1,1,hair);pp(g,3,5+y,1,2,hair);pp(g,12,5+y,1,2,hair);pp(g,7,5+y,3,1,hair);break;
    case 'pony':pp(g,3,2+y,10,3,hair);pp(g,3,5+y,1,2,hair);pp(g,12,5+y,1,2,hair);pp(g,4,5+y,4,1,hair);pp(g,13,5+y,2,4,hair);break;
    default:pp(g,3,2+y,10,3,hair);pp(g,3,5+y,1,2,hair);pp(g,12,5+y,1,2,hair);pp(g,5,5+y,3,1,hair);pp(g,4,3+y,3,1,shade(hair,.3));
  }
}

/* ================= 設備 ================= */
function decorSprite(type,frame){
  return sprite(`d|${type}|${frame}`,32,40,(g)=>drawDecorPx(g,type,frame));
}
/* 絵の左上は (px, py-8) */
function drawDecorPx(g,type,f){
  switch(type){
    case 'counter':
      box(g,1,16,30,22,'#c98b4f');pp(g,2,17,28,4,'#f2c48d');pp(g,2,21,28,1,'#8a5a2b');
      pp(g,3,4,26,13,K);pp(g,4,5,24,11,'#fff7e6');pp(g,4,10,24,1,'#d6b98c');           // 景品の棚
      [['#ef4444',5],['#3b82f6',9],['#facc15',13],['#22c55e',17],['#ec4899',21],['#a855f7',25]].forEach(([c,x],i)=>{pp(g,x,6+(i%2),3,4-(i%2),c);pp(g,x,11,3,4,['#f97316','#14b8a6','#eab308'][i%3])});
      pp(g,11,24,10,7,K);pp(g,12,25,8,5,'#ff2d55');pp(g,14,26,4,1,'#fff');pp(g,14,28,4,1,'#fff');pp(g,15,26,1,3,'#fff');
      pp(g,24,23,4,3,'#e5e7eb');break;
    case 'vending':
      box(g,4,2,24,36,'#e11d48');pp(g,6,4,20,16,K);pp(g,7,5,18,14,'#dbeafe');
      for(let r=0;r<3;r++)for(let i=0;i<5;i++){pp(g,8+i*3+(i>2?1:0),6+r*5,2,4,['#f97316','#3b82f6','#22c55e','#facc15','#a855f7','#ef4444'][(r*5+i)%6]);pp(g,8+i*3+(i>2?1:0),10+r*5,2,1,'#64748b')}
      pp(g,6,22,20,3,'#111827');pp(g,20,27,5,6,'#be123c');pp(g,21,28,3,1,'#fde68a');pp(g,7,28,10,6,K);pp(g,8,29,8,4,'#475569');break;
    case 'bench':
      box(g,2,14,28,10,'#a16207');pp(g,3,15,26,3,'#d97706');box(g,2,22,28,8,'#92400e');pp(g,4,30,3,5,K);pp(g,25,30,3,5,K);
      pp(g,6,16,2,1,'#fde68a');pp(g,16,16,2,1,'#fde68a');break;
    case 'plant':
      pp(g,10,26,12,11,K);pp(g,11,27,10,9,'#c2410c');pp(g,11,27,10,2,'#ea580c');
      for(const[x,y,w,h,c]of[[6,8,8,8,'#15803d'],[16,4,10,10,'#16a34a'],[10,14,12,10,'#22c55e'],[4,16,8,7,'#16a34a'],[20,14,8,8,'#15803d']]){pp(g,x-1,y-1,w+2,h+2,K);pp(g,x,y,w,h,c);pp(g,x+1,y+1,2,1,'#4ade80')}
      break;
    case 'changer':
      box(g,8,4,16,32,'#94a3b8');pp(g,10,7,12,7,K);pp(g,11,8,10,5,'#bbf7d0');pp(g,12,9,6,1,'#166534');
      pp(g,11,17,10,3,'#475569');pp(g,12,22,8,2,K);pp(g,14,27,4,5,K);pp(g,15,28,2,3,'#facc15');break;
    case 'booth':
      pp(g,1,2,30,36,K);pp(g,2,3,28,34,'rgba(186,230,253,.55)');pp(g,2,3,28,3,'#e0f2fe');pp(g,4,8,2,26,'rgba(255,255,255,.6)');
      pp(g,12,26,8,8,K);pp(g,13,27,6,6,'#94a3b8');pp(g,14,25,4,2,'#64748b');
      for(let i=0;i<3;i++){const k=(f+i*2)%6;pp(g,9+i*6,22-k*2,3,3,'rgba(255,255,255,.8)')}
      pp(g,10,8,12,7,K);pp(g,11,9,10,5,'#64748b');break;
    case 'cleaner':
      box(g,9,4,14,32,'#f8fafc');pp(g,11,7,10,3,f%2?'#38bdf8':'#7dd3fc');for(let i=0;i<5;i++)pp(g,11,14+i*3,10,1,'#cbd5e1');pp(g,12,32,8,2,'#94a3b8');break;
    case 'neon':{
      pp(g,15,24,2,14,K);pp(g,2,2,28,22,K);pp(g,3,3,26,20,'#14102a');const on=f%4!==0;
      const a=on?'#ff4fa3':'#5a2340',b=on?'#4ff0c4':'#24564a';
      pp(g,4,4,24,1,a);pp(g,4,21,24,1,a);pp(g,4,4,1,18,a);pp(g,27,4,1,18,a);
      seven(g,8,8,b);pp(g,8,8,3,1,b);seven(g,14,8,b);pp(g,14,8,3,1,b);seven(g,20,8,b);pp(g,20,8,3,1,b);
      pp(g,7,15,18,1,a);break;}
    case 'cat':{
      const up=f%2===0;
      box(g,8,6,16,30,'#ffffff');pp(g,8,4,4,4,K);pp(g,20,4,4,4,K);pp(g,9,5,2,2,'#fecdd3');pp(g,21,5,2,2,'#fecdd3');
      pp(g,12,13,2,2,K);pp(g,18,13,2,2,K);pp(g,15,16,2,1,'#f472b6');pp(g,9,21,14,2,'#ef4444');pp(g,14,23,4,4,'#facc15');pp(g,15,24,2,2,'#eab308');
      pp(g,23,up?2:8,5,9,K);pp(g,24,up?3:9,3,7,'#fff');pp(g,4,22,5,8,K);pp(g,5,23,3,6,'#fff');pp(g,10,30,12,4,'#facc15');break;}
    case 'chandelier':{
      pp(g,15,0,2,6,K);box(g,4,6,24,6,'#facc15');box(g,8,12,16,4,'#eab308');
      for(let i=0;i<5;i++){const lit=(i+f)%5!==0;pp(g,5+i*5,3,2,4,K);pp(g,5+i*5,3,2,2,lit?'#fffbeb':'#fde68a')}
      for(let i=0;i<4;i++)pp(g,8+i*5,17,1,3,'#fde68a');
      break;}
    case 'fountain':{
      box(g,0,20,32,16,'#cbd5e1');pp(g,2,22,28,10,'#38bdf8');pp(g,4,23,8,1,'#bae6fd');pp(g,18,26,8,1,'#bae6fd');
      pp(g,14,8,4,14,'#e2e8f0');pp(g,13,8,6,2,K);
      const k=f%3;pp(g,9-k,4+k*2,2,4,'#bae6fd');pp(g,21+k,4+k*2,2,4,'#bae6fd');pp(g,15,1+k,2,4,'#bae6fd');break;}
    case 'daruma':{
      box(g,7,33,18,5,'#1f2937');pp(g,9,34,14,1,'#facc15');                     // 台座
      for(let y=10;y<=36;y++){const w=Math.round(12*Math.sqrt(Math.max(0,1-Math.pow((y-23)/13,2))));if(w>0){pp(g,16-w-1,y,w*2+2,1,K)}}
      for(let y=11;y<=35;y++){const w=Math.round(11*Math.sqrt(Math.max(0,1-Math.pow((y-23)/12,2))));if(w>0){pp(g,16-w,y,w*2,1,'#dc2626');pp(g,16+w-3,y,3,1,'#b91c1c')}}
      pp(g,8,15,2,7,'#f87171');pp(g,9,13,2,2,'#fca5a5');                        // つや
      for(let y=14;y<=24;y++){const w=Math.round(7*Math.sqrt(Math.max(0,1-Math.pow((y-19)/5.5,2))));if(w>0){pp(g,16-w-1,y,w*2+2,1,K);pp(g,16-w,y,w*2,1,'#fff7ed')}}
      pp(g,10,15,5,1,K);pp(g,9,16,2,1,K);pp(g,17,15,5,1,K);pp(g,21,16,2,1,K);   // まゆ
      pp(g,12,18,3,3,K);pp(g,13,18,1,1,'#fff');                                  // 目（片目だけ入れてある）
      pp(g,17,18,3,3,K);pp(g,18,19,1,1,'#fff7ed');
      pp(g,15,21,2,1,'#fca5a5');pp(g,12,22,8,1,K);pp(g,11,23,2,1,K);pp(g,19,23,2,1,K); // ひげ
      pp(g,10,27,12,2,'#facc15');pp(g,12,30,8,2,'#facc15');pp(g,14,27,1,5,'#b45309');pp(g,17,27,1,5,'#b45309');break;}
    case 'trophy':{
      box(g,7,31,18,7,'#78350f');pp(g,11,33,10,2,'#fde68a');pp(g,8,32,16,1,'#92400e');
      pp(g,13,25,6,7,K);pp(g,14,25,4,6,'#eab308');pp(g,10,23,12,3,K);pp(g,11,23,10,2,'#ca8a04');
      for(let y=5;y<=22;y++){const w=Math.round(10-(y-5)*0.35);pp(g,16-w-1,y,w*2+2,1,K);pp(g,16-w,y,w*2,1,'#facc15');pp(g,16+w-3,y,3,1,'#ca8a04');pp(g,16-w,y,2,1,'#fef08a')}
      pp(g,5,5,22,2,K);pp(g,6,5,20,1,'#fde047');
      for(const sx of [2,27]){pp(g,sx,8,3,9,K);pp(g,sx+1,9,1,7,'#eab308')}pp(g,4,8,3,1,K);pp(g,25,8,3,1,K);pp(g,4,16,3,1,K);pp(g,25,16,3,1,K);
      pp(g,15,9,2,6,'#fff7ad');pp(g,13,11,6,2,'#fff7ad');pp(g,14,10,4,4,'#fde047');pp(g,15,11,2,2,'#dc2626'); // 星
      const sp=[[22,7],[9,14],[20,18]][f%3];pp(g,sp[0],sp[1]-1,1,3,'#fff');pp(g,sp[0]-1,sp[1],3,1,'#fff');break;}
    case 'goldcat':{
      const up=f%2===0,au='#facc15',ad='#ca8a04',al='#fef9c3';
      box(g,7,6,18,30,au);pp(g,8,7,3,24,al);pp(g,22,8,2,26,ad);
      pp(g,7,3,5,5,K);pp(g,20,3,5,5,K);pp(g,8,4,3,3,au);pp(g,21,4,3,3,au);pp(g,9,5,1,1,'#f472b6');pp(g,22,5,1,1,'#f472b6');
      pp(g,11,13,3,1,K);pp(g,18,13,3,1,K);pp(g,12,14,1,1,K);pp(g,19,14,1,1,K);pp(g,15,16,2,1,'#b45309');pp(g,14,17,1,1,K);pp(g,17,17,1,1,K);
      pp(g,8,20,16,2,'#dc2626');pp(g,14,21,4,4,K);pp(g,15,22,2,2,'#fde047');
      pp(g,10,26,12,6,'#fff7ad');pp(g,11,27,10,4,au);pp(g,13,28,6,2,'#b45309');           // 小判
      pp(g,24,up?1:7,5,10,K);pp(g,25,up?2:8,3,8,au);pp(g,25,up?2:8,1,8,al);
      pp(g,4,22,5,8,K);pp(g,5,23,3,6,au);pp(g,8,34,16,4,K);pp(g,9,35,14,2,'#7f1d1d');
      if(!up){pp(g,3,4,1,3,'#fff');pp(g,2,5,3,1,'#fff')}else{pp(g,28,30,1,3,'#fff');pp(g,27,31,3,1,'#fff')}break;}
    case 'kiosk':{
      pp(g,14,26,4,12,K);pp(g,15,26,2,11,'#64748b');box(g,1,2,30,24,'#1e293b');pp(g,3,4,26,19,'#0f172a');
      const bars=[6,10,4,13,8,11];bars.forEach((h,i)=>pp(g,5+i*4,21-((h+f*3+i)%14),3,((h+f*3+i)%14),i%2?'#22c55e':'#38bdf8'));
      pp(g,4,5,10,2,'#facc15');pp(g,9,34,14,4,K);pp(g,10,35,12,2,'#475569');break;}
  }
}
const DECOR_ANIM={booth:6,cleaner:2,neon:8,cat:2,chandelier:5,fountain:3,kiosk:5,trophy:3,goldcat:2};
/* 椅子 */
function stoolSprite(){return sprite('stool',12,12,g=>{pp(g,2,1,8,6,K);pp(g,3,2,6,3,'#e11d48');pp(g,3,2,6,1,'#fb7185');pp(g,5,7,2,4,'#94a3b8');pp(g,3,10,6,2,K)})}

/* ================= 床（店ごとに1枚の絵にして覚える） ================= */
let floorLayer=null,floorKey='';
function floorTile(g,type,x,y,X,Y){
  const S=32;
  switch(type){
    case 'wood':{
      for(let i=0;i<3;i++){const c=['#d8a066','#cf955b','#e2ad74'][(X*3+Y*7+i)%3];pp(g,x,y+i*11,S,11,c);pp(g,x,y+i*11,S,1,'#b47b45');
        const j=((Y*3+i)*13+X*5)%S;pp(g,x+j,y+i*11,1,11,'#a86f3d');pp(g,x+((j+9)%S),y+i*11+5,6,1,'rgba(120,70,30,.25)')}
      break;}
    case 'red':case 'blue':{
      const base=type==='red'?'#c81e3a':'#1d4ed8',dk=shade(base,-.25),gold='#f2c14e';
      pp(g,x,y,S,S,base);
      for(let i=0;i<16;i++){pp(g,x+16-i,y+i,1,1,dk);pp(g,x+16+i,y+i,1,1,dk);pp(g,x+i,y+16+i,1,1,dk);pp(g,x+31-i,y+16+i,1,1,dk)}
      pp(g,x+15,y+14,2,4,gold);pp(g,x+13,y+15,6,2,gold);pp(g,x+15,y+15,2,2,'#fff1c1');
      pp(g,x,y,2,2,gold);pp(g,x+30,y+30,2,2,gold);break;}
    case 'royal':{
      const base='#4c1d95',dk='#3b0f73',gold='#d4a72c',lt='#f5d76e';
      pp(g,x,y,S,S,base);
      for(let i=0;i<16;i++){pp(g,x+16-i,y+i,1,1,gold);pp(g,x+15+i,y+i,1,1,gold);pp(g,x+i,y+16+i,1,1,gold);pp(g,x+31-i,y+16+i,1,1,gold)}
      for(let i=2;i<14;i+=3){pp(g,x+16-i+1,y+i,1,1,dk);pp(g,x+15+i-1,y+i,1,1,dk)}
      pp(g,x+15,y+12,2,8,lt);pp(g,x+12,y+15,8,2,lt);pp(g,x+14,y+14,4,4,gold);pp(g,x+15,y+15,2,2,'#fff1c1');
      pp(g,x,y,3,1,gold);pp(g,x,y,1,3,gold);pp(g,x+29,y+31,3,1,gold);pp(g,x+31,y+29,1,3,gold);
      pp(g,x+5,y+5,1,1,lt);pp(g,x+26,y+5,1,1,lt);pp(g,x+5,y+26,1,1,lt);pp(g,x+26,y+26,1,1,lt);break;}
    case 'check':{
      const dark=(X+Y)&1;pp(g,x,y,S,S,dark?'#2d2d3a':'#f5f5f7');pp(g,x+2,y+2,10,1,dark?'#4b4b5c':'#ffffff');pp(g,x+2,y+3,1,6,dark?'#4b4b5c':'#ffffff');break;}
    case 'marble':{
      pp(g,x,y,S,S,((X+Y)&1)?'#efe7dc':'#f7f2ea');pp(g,x,y,S,1,'#e2d6c4');pp(g,x,y,1,S,'#e2d6c4');
      const v=(X*7+Y*13)%5;for(let i=0;i<12;i++)pp(g,x+4+i*2,y+6+v*3+((i*3)%5),2,1,'rgba(150,135,115,.28)');pp(g,x+20,y+3,6,2,'rgba(255,255,255,.7)');break;}
    default:{
      const c=((X+Y)&1)?'#ddd5ef':'#e9e3f7';pp(g,x,y,S,S,c);pp(g,x,y,S,1,'#f7f4fd');pp(g,x,y,1,S,'#f7f4fd');pp(g,x,y+31,S,1,'#cbc1e4');pp(g,x+31,y,1,S,'#cbc1e4');pp(g,x+4,y+4,3,1,'#ffffff');
    }
  }
}
function buildFloor(){
  const key=[G.floor,G.W,G.H,G.zone.join('')].join('|');
  if(floorLayer&&floorKey===key)return floorLayer;
  floorKey=key;
  const c=floorLayer||document.createElement('canvas');c.width=G.W*32;c.height=G.H*32;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  for(let Y=0;Y<G.H;Y++)for(let X=0;X<G.W;X++){
    floorTile(g,G.floor,X*32,Y*32,X,Y);
    if(G.zone[Y*G.W+X]===1){pp(g,X*32,Y*32,32,32,'rgba(76,48,128,.28)');for(let i=0;i<32;i+=6)pp(g,X*32+i,Y*32+((i/6)%2?4:0),3,1,'rgba(255,255,255,.2)');for(let i=0;i<32;i+=6)pp(g,X*32+((i/6)%2?3:0),Y*32+16+(i%4),3,1,'rgba(255,255,255,.14)')}
  }
  /* 天井の照明が床に落ちる光と、壁ぎわの影 */
  for(let Y=1;Y<G.H;Y+=4)for(let X=2;X<G.W;X+=5){
    const gr=g.createRadialGradient(X*32,Y*32,4,X*32,Y*32,60);gr.addColorStop(0,'rgba(255,255,240,.22)');gr.addColorStop(1,'rgba(255,255,240,0)');g.fillStyle=gr;g.fillRect(X*32-60,Y*32-60,120,120);
  }
  const sh=g.createLinearGradient(0,0,0,26);sh.addColorStop(0,'rgba(20,10,40,.28)');sh.addColorStop(1,'rgba(20,10,40,0)');g.fillStyle=sh;g.fillRect(0,0,c.width,26);
  floorLayer=c;return c;
}

/* ================= 壁（上の壁・左右の壁） ================= */
let wallLayer=null,wallKey='';
function buildWall(){
  const W=(G.W*TS+OX*2)*2,H=OY*2,key=[G.wall,G.W].join('|');
  if(wallLayer&&wallKey===key)return wallLayer;
  wallKey=key;
  const c=wallLayer||document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const Wl=WLB[G.wall];
  pp(g,0,0,W,H,Wl.c);
  switch(G.wall){
    case 'stripe':for(let x=0;x<W;x+=16)pp(g,x,0,8,H-14,Wl.d);pp(g,0,H-16,W,2,'#facc15');break;
    case 'wood':for(let x=0;x<W;x+=12){pp(g,x,0,1,H-12,'rgba(0,0,0,.2)');pp(g,x+5,6+(x%18),3,1,'rgba(0,0,0,.12)')}break;
    case 'gold':for(let x=0;x<W;x+=16){pp(g,x,0,6,H-12,'rgba(255,255,255,.22)');pp(g,x+8,8,4,4,'rgba(154,116,22,.35)')}break;
    case 'neonwall':pp(g,0,5,W,2,'#ff4fa3');pp(g,0,H-18,W,2,'#4ff0c4');pp(g,0,4,W,4,'rgba(255,79,163,.25)');pp(g,0,H-19,W,4,'rgba(79,240,196,.2)');break;
    default:for(let x=0;x<W;x+=24)pp(g,x,0,1,H-12,'rgba(0,0,0,.06)');pp(g,0,H-22,W,10,'#ede9f6');pp(g,0,H-22,W,1,'#d4cce6');
  }
  /* ポスター（機種の色）と時計 */
  const posters=Math.max(2,Math.floor(G.W/5));
  for(let i=0;i<posters;i++){
    const x=Math.round((i+0.5)*W/posters)-10;if(Math.abs(x+10-W/2)<70)continue;
    const md=MODELS[(i*5+3)%MODELS.length];
    pp(g,x-1,7,22,28,K);pp(g,x,8,20,26,md.c);pp(g,x+2,10,16,12,md.c2);pp(g,x+2,24,16,3,'#fff');pp(g,x+2,28,10,2,'#fff');
    if(md.k==='s'){seven(g,x+5,13,'#e11d48');seven(g,x+10,13,'#e11d48')}else{disc(g,x+10,16,4,'#fff');disc(g,x+10,16,2,md.c)}
  }
  const cx=W-36;disc(g,cx,18,9,K);disc(g,cx,18,8,'#f8fafc');pp(g,cx,12,1,7,K);pp(g,cx,18,5,1,K);
  pp(g,0,H-12,W,12,Wl.d);pp(g,0,H-12,W,2,shade(Wl.d,.3));pp(g,0,H-3,W,3,shade(Wl.d,-.3));
  wallLayer=c;return c;
}
