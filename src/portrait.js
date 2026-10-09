/* ===== portrait.js : 会話に出す顔（40×40のドット絵の似顔絵） =====
   P={skin,hair,hs(髪型),out(服),col(服の色),tie,acc:[小物],age(0〜2),f(女性)}
   ex：n ふつう / smug 不敵 / happy 笑顔 / angry 怒り / sad 困り / shock 驚き */
const PT=40;
const FACE_HW={6:5,7:7,8:8,9:8,10:9,11:9,12:9,13:9,14:9,15:9,16:9,17:9,18:9,19:9,20:9,21:9,22:9,23:8,24:8,25:7,26:6,27:5,28:4};
function portraitCanvas(P,ex){
  return sprite('pt|'+JSON.stringify(P)+'|'+(ex||'n'),PT,PT,g=>drawPortrait(g,P,ex||'n'));
}
const PT_URL=new Map();
function portraitURL(P,ex){
  const k=JSON.stringify(P)+'|'+(ex||'n');let u=PT_URL.get(k);
  if(!u){u=portraitCanvas(P,ex).toDataURL();if(PT_URL.size>200)PT_URL.clear();PT_URL.set(k,u)}
  return u;
}
/* 髪の形（outlineは黒ふちを付けてから塗る） */
function hairRects(g,rs,hair){
  for(const r of rs)pp(g,r[0]-1,r[1]-1,r[2]+2,r[3]+2,K);
  for(const r of rs)pp(g,r[0],r[1],r[2],r[3],hair);
}
function drawPortrait(g,P,ex){
  const skin=P.skin||'#f6d1b0',hair=P.hair||'#1b1b1b',col=P.col||'#3b82f6',acc=P.acc||[],age=P.age||0;
  const has=a=>acc.includes(a);
  const sk2=shade(skin,-.16),sk3=shade(skin,-.3),hl=shade(hair,.32),hd=shade(hair,-.35);
  /* 1. 後ろ髪 */
  if(P.hs==='long')hairRects(g,[[9,9,22,25]],hd);
  if(P.hs==='bob')hairRects(g,[[9,9,22,16]],hd);
  if(P.hs==='pony')hairRects(g,[[28,9,5,15]],hair);
  /* 2. 首 */
  pp(g,16,26,8,8,K);pp(g,17,26,6,8,skin);pp(g,17,27,6,2,sk2);
  /* 3. 体 */
  const KR={31:[13,26],32:[10,29],33:[7,32]},FR={32:[13,26],33:[10,29]};
  for(let y=31;y<40;y++){const k=KR[y]||[5,34];pp(g,k[0],y,k[1]-k[0]+1,1,K)}
  const fillRow=(y,c,from,to)=>{const f=FR[y]||[6,33];const a=Math.max(f[0],from??0),b=Math.min(f[1],to??99);if(b>=a)pp(g,a,y,b-a+1,1,c)};
  const body=c=>{for(let y=32;y<40;y++){fillRow(y,c);fillRow(y,shade(c,.18),0,8);fillRow(y,shade(c,-.22),31,99)}};
  const vNeck=(c,depth)=>{for(let i=0;i<depth;i++)pp(g,17+Math.floor(i/2),33+i,6-Math.floor(i/2)*2,1,c)};
  const out=P.out||'tee';
  switch(out){
    case 'suit':case 'blazer':{
      body(col);vNeck('#f8fafc',6);
      for(let i=0;i<6;i++){pp(g,16+Math.floor(i/2),33+i,1,1,shade(col,-.45));pp(g,23-Math.floor(i/2),33+i,1,1,shade(col,-.45))}
      pp(g,13,34,3,2,shade(col,.3));
      if(out==='suit'){pp(g,19,33,2,2,shade(P.tie||'#b91c1c',-.25));pp(g,19,35,2,5,P.tie||'#b91c1c');pp(g,19,36,1,3,shade(P.tie||'#b91c1c',.25))}
      else{pp(g,18,33,4,1,'#e2e8f0')}
      pp(g,19,39,2,1,shade(col,-.4));break;}
    case 'vest':{
      body('#f8fafc');for(let y=34;y<40;y++){fillRow(y,col,9,17);fillRow(y,col,22,30)}
      pp(g,19,33,2,2,shade(P.tie||'#16a34a',-.25));pp(g,19,35,2,5,P.tie||'#16a34a');pp(g,14,37,1,1,'#facc15');break;}
    case 'staff':{
      body('#f8fafc');for(let y=34;y<40;y++){fillRow(y,'#1f2937',8,17);fillRow(y,'#1f2937',22,31)}
      pp(g,17,33,6,2,K);pp(g,18,33,1,2,'#e11d48');pp(g,21,33,1,2,'#e11d48');pp(g,19,33,2,2,'#9f1239');pp(g,24,36,3,1,P.tag||'#facc15');break;}
    case 'cardigan':{
      body(col);vNeck('#f1f5f9',5);pp(g,18,33,4,1,'#cbd5e1');
      for(let y=34;y<40;y+=2)pp(g,19,y,2,1,shade(col,.35));
      for(let y=35;y<40;y++){pp(g,17,y,1,1,shade(col,-.3));pp(g,22,y,1,1,shade(col,-.3))}break;}
    case 'aloha':{
      body(col);
      for(let y=33;y<40;y++)for(let x=7;x<33;x++){if((x+y*3)%7===0)pp(g,x,y,1,1,'#fef9c3');else if((x*3+y)%11===0)pp(g,x,y,1,1,'#fde047')}
      vNeck(skin,5);pp(g,15,33,2,3,'#fff1f2');pp(g,23,33,2,3,'#fff1f2');break;}
    case 'apron':{
      body(col);vNeck(skin,3);
      for(let y=33;y<40;y++){fillRow(y,'#f8fafc',8,31)}
      for(let i=0;i<6;i++){pp(g,15+i,33+i,2,1,col);pp(g,24-i,33+i,2,1,col)}
      pp(g,19,38,2,2,col);break;}
    case 'happi':{
      body(col);for(let y=33;y<40;y++){fillRow(y,'#0f172a',17,22)}
      for(let i=0;i<7;i++){pp(g,14+Math.floor(i/2),33+i,2,1,'#f8fafc');pp(g,24-Math.floor(i/2),33+i,2,1,'#f8fafc')}
      pp(g,9,36,2,2,'#f8fafc');pp(g,29,36,2,2,'#f8fafc');break;}
    case 'turtle':{
      body(col);pp(g,15,27,10,7,K);pp(g,16,28,8,6,col);pp(g,16,29,8,1,shade(col,.2));pp(g,16,31,8,1,shade(col,.2));pp(g,16,33,8,1,shade(col,.2));break;}
    case 'polo':{
      body(col);pp(g,16,33,3,2,'#f8fafc');pp(g,21,33,3,2,'#f8fafc');pp(g,19,33,2,4,shade(col,.3));pp(g,19,34,1,1,'#f8fafc');pp(g,19,36,1,1,'#f8fafc');break;}
    case 'jacket':{
      body(col);vNeck('#f1f5f9',4);pp(g,20,35,1,5,'#a8a29e');
      pp(g,14,33,3,3,shade(col,.28));pp(g,23,33,3,3,shade(col,.28));break;}
    case 'hoodie':{
      body(col);pp(g,13,31,14,3,K);pp(g,14,32,12,2,shade(col,-.2));vNeck(shade(col,-.3),2);pp(g,17,35,1,3,'#f8fafc');pp(g,22,35,1,3,'#f8fafc');break;}
    default:{
      body(col);pp(g,17,33,6,1,shade(col,-.3));pp(g,18,34,4,1,shade(col,-.3));
    }
  }
  if(has('chain')){for(let i=0;i<6;i++){pp(g,14+i,33+Math.floor(i/1.5),1,1,i%2?'#a16207':'#facc15');pp(g,25-i,33+Math.floor(i/1.5),1,1,i%2?'#a16207':'#facc15')}pp(g,19,37,2,2,'#facc15')}
  /* 4. 耳 */
  const ear=(x0,r)=>{pp(g,x0,16,2,1,K);pp(g,x0,22,2,1,K);pp(g,r?x0+2:x0-1,17,1,5,K);pp(g,x0,17,2,5,skin);pp(g,r?x0:x0+1,18,1,3,sk2)};
  ear(8,false);ear(30,true);
  /* 5. 顔 */
  for(let y=6;y<=29;y++){const w=y===29?3:(FACE_HW[y]||0)+1;pp(g,20-w,y,w*2,1,K)}
  for(let y=7;y<=28;y++){const w=FACE_HW[y];pp(g,20-w,y,w*2,1,skin)}
  for(let y=12;y<=27;y++){const w=FACE_HW[y];pp(g,20+w-2,y,2,1,sk2)}
  /* 6. 顔のパーツ */
  const brow=P.hs==='bald'||age>=2?'#9ca3af':shade(hair,-.3);
  const eyeL=14,eyeR=23,ey=18;
  const eyes=()=>{
    pp(g,eyeL+1,ey,2,3,K);pp(g,eyeR,ey,2,3,K);
    pp(g,eyeL+2,ey,1,1,'#fff');pp(g,eyeR+1,ey,1,1,'#fff');
    if(P.f){pp(g,eyeL,ey,1,1,K);pp(g,eyeR+2,ey,1,1,K)}
  };
  switch(ex){
    case 'happy':
      pp(g,eyeL,ey+2,1,1,K);pp(g,eyeL+1,ey+1,1,1,K);pp(g,eyeL+2,ey+2,1,1,K);
      pp(g,eyeR,ey+2,1,1,K);pp(g,eyeR+1,ey+1,1,1,K);pp(g,eyeR+2,ey+2,1,1,K);
      pp(g,eyeL,ey-2,3,1,brow);pp(g,eyeR,ey-2,3,1,brow);break;
    case 'smug':
      pp(g,eyeL,ey+1,3,1,K);pp(g,eyeL+1,ey+2,2,1,K);pp(g,eyeR,ey+1,3,1,K);pp(g,eyeR,ey+2,2,1,K);
      pp(g,eyeL,ey-1,3,1,brow);pp(g,eyeR,ey-2,3,1,brow);pp(g,eyeR+3,ey-1,1,1,brow);break;
    case 'angry':
      pp(g,eyeL+1,ey+1,2,2,K);pp(g,eyeR,ey+1,2,2,K);
      pp(g,eyeL-1,ey-2,2,1,brow);pp(g,eyeL+1,ey-1,2,1,brow);pp(g,eyeL+3,ey,1,1,brow);
      pp(g,eyeR+2,ey-2,2,1,brow);pp(g,eyeR,ey-1,2,1,brow);pp(g,eyeR-1,ey,1,1,brow);break;
    case 'sad':
      pp(g,eyeL+1,ey+1,2,2,K);pp(g,eyeR,ey+1,2,2,K);pp(g,eyeL+2,ey+1,1,1,'#fff');pp(g,eyeR+1,ey+1,1,1,'#fff');
      pp(g,eyeL-1,ey-1,2,1,brow);pp(g,eyeL+1,ey-2,2,1,brow);pp(g,eyeR,ey-2,2,1,brow);pp(g,eyeR+2,ey-1,2,1,brow);
      pp(g,29,10,2,1,'#bae6fd');pp(g,28,11,3,3,'#7dd3fc');pp(g,29,12,1,1,'#fff');break;
    case 'shock':
      pp(g,eyeL,ey-1,3,4,K);pp(g,eyeR,ey-1,3,4,K);pp(g,eyeL,ey-1,3,3,'#fff');pp(g,eyeR,ey-1,3,3,'#fff');pp(g,eyeL+1,ey,1,1,K);pp(g,eyeR+1,ey,1,1,K);
      pp(g,eyeL,ey-4,3,1,brow);pp(g,eyeR,ey-4,3,1,brow);break;
    default:
      eyes();pp(g,eyeL,ey-2,3,1,brow);pp(g,eyeR,ey-2,3,1,brow);
  }
  pp(g,20,21,1,2,sk3);pp(g,19,23,2,1,sk2);
  const lip='#9a4a3f';
  switch(ex){
    case 'happy':pp(g,17,24,6,1,K);pp(g,18,25,4,1,K);pp(g,18,24,4,1,'#fff');pp(g,19,25,2,1,'#e26a6a');break;
    case 'smug':pp(g,18,25,4,1,lip);pp(g,22,24,1,1,lip);break;
    case 'angry':pp(g,18,25,4,1,K);pp(g,17,26,1,1,K);pp(g,22,26,1,1,K);break;
    case 'sad':pp(g,18,25,4,1,lip);pp(g,17,26,1,1,lip);pp(g,22,26,1,1,lip);break;
    case 'shock':pp(g,19,24,2,3,K);pp(g,19,25,2,1,'#7f1d1d');break;
    default:pp(g,18,25,4,1,lip);
  }
  if(P.f||ex==='happy'){pp(g,12,22,2,1,'#f9a8b4');pp(g,26,22,2,1,'#f9a8b4')}
  if(age>=1){pp(g,12,19,1,1,sk3);pp(g,27,19,1,1,sk3);pp(g,16,24,1,2,sk2);pp(g,23,24,1,2,sk2)}
  if(age>=2){pp(g,16,12,8,1,sk2);pp(g,17,14,6,1,sk2);pp(g,13,21,1,1,sk3);pp(g,26,21,1,1,sk3)}
  if(has('stubble'))for(let y=24;y<29;y++)for(let x=13;x<27;x++)if((x+y)%2===0&&(y>=26||x<15||x>24)&&!(y===25&&x>16&&x<23))pp(g,x,y,1,1,shade(skin,-.32));
  if(has('mustache')){pp(g,16,23,8,1,brow);pp(g,15,24,4,1,brow);pp(g,21,24,4,1,brow);pp(g,15,23,1,1,K);pp(g,24,23,1,1,K)}
  if(has('beard')){pp(g,17,26,6,3,hair);pp(g,18,29,4,1,hair);pp(g,17,23,6,1,hair);pp(g,16,24,1,2,hair);pp(g,23,24,1,2,hair)}
  /* 7. 前髪 */
  switch(P.hs){
    case 'slick':hairRects(g,[[13,4,14,1],[11,5,18,5],[10,7,2,9],[28,7,2,9],[24,10,3,1]],hair);pp(g,14,6,6,1,hl);pp(g,21,5,4,1,hl);pp(g,16,8,8,1,shade(hair,-.2));break;
    case 'spiky':hairRects(g,[[12,3,2,3],[16,1,2,5],[20,2,2,4],[24,1,2,5],[27,4,2,2],[11,6,18,5],[10,8,2,7],[28,8,2,7],[13,11,2,2],[17,11,2,3],[22,11,2,2],[25,11,2,2]],hair);pp(g,16,2,1,3,hl);pp(g,24,2,1,3,hl);pp(g,13,7,5,1,hl);break;
    case 'crew':hairRects(g,[[12,4,16,1],[11,5,18,4],[10,7,2,7],[28,7,2,7]],hair);pp(g,13,5,7,1,hl);break;
    case 'messy':hairRects(g,[[13,3,3,2],[18,2,3,3],[24,3,3,2],[11,5,18,6],[10,8,2,8],[28,8,2,8],[11,11,4,3],[16,11,3,2],[20,11,4,3],[25,11,3,2]],hair);pp(g,18,3,1,2,hl);pp(g,13,7,4,1,hl);pp(g,22,6,3,1,hl);break;
    case 'long':hairRects(g,[[13,4,14,1],[11,5,18,6],[10,9,3,17],[27,9,3,17],[12,11,7,2],[21,11,7,2]],hair);pp(g,19,6,2,6,shade(hair,-.25));pp(g,13,6,4,1,hl);pp(g,10,14,1,6,hl);break;
    case 'bob':hairRects(g,[[13,4,14,1],[11,5,18,6],[11,11,18,2],[9,9,4,15],[27,9,4,15]],hair);pp(g,13,6,5,1,hl);pp(g,12,13,1,1,hair);pp(g,9,16,1,5,hl);break;
    case 'bun':disc(g,20,4,4,K);disc(g,20,4,3,hair);pp(g,18,2,2,1,hl);hairRects(g,[[11,6,18,5],[10,9,2,6],[28,9,2,6]],hair);pp(g,17,1,3,1,hl);pp(g,13,8,5,1,hl);pp(g,16,5,8,1,shade(hair,-.25));if(has('kanzashi')){pp(g,23,1,5,1,'#b45309')}break;
    case 'bald':hairRects(g,[[10,12,2,4],[28,12,2,4]],hair);pp(g,14,8,5,1,'#fff7ed');pp(g,13,9,2,1,'#fff7ed');break;
    case 'perm':hairRects(g,[[12,2,16,2],[10,4,20,7],[9,7,3,10],[28,7,3,10],[12,11,4,2],[18,11,4,2],[24,11,4,2]],hair);for(let i=0;i<5;i++){pp(g,11+i*4,5,2,1,hl);pp(g,13+i*4,8,1,1,hd)}break;
    case 'pony':hairRects(g,[[13,4,14,1],[11,5,18,6],[10,9,2,7],[28,9,2,6],[12,11,6,2],[20,11,3,1]],hair);pp(g,13,6,5,1,hl);pp(g,28,9,3,2,P.ribbon||'#f472b6');break;
    default:hairRects(g,[[13,4,14,1],[11,5,18,6],[10,8,2,8],[28,8,2,8],[12,11,5,2],[18,11,3,1],[23,11,5,2]],hair);pp(g,14,6,5,1,hl);
  }
  /* 8. 小物 */
  if(has('glasses')||has('roundglasses')){
    const round=has('roundglasses');
    for(const x0 of [12,22]){
      pp(g,x0,17,6,1,K);pp(g,x0,22,6,1,K);pp(g,x0,17,1,6,K);pp(g,x0+5,17,1,6,K);
      if(round){pp(g,x0,17,1,1,skin);pp(g,x0+5,17,1,1,skin);pp(g,x0,22,1,1,skin);pp(g,x0+5,22,1,1,skin)}
      pp(g,x0+1,18,1,1,'#e0f2fe');
    }
    pp(g,18,18,4,1,K);pp(g,10,18,2,1,K);pp(g,28,18,2,1,K);
  }
  if(has('shades')){pp(g,11,17,8,5,K);pp(g,21,17,8,5,K);pp(g,12,18,6,3,'#0f172a');pp(g,22,18,6,3,'#0f172a');pp(g,13,18,2,1,'#64748b');pp(g,23,18,2,1,'#64748b');pp(g,19,18,2,1,K)}
  if(has('earring')){pp(g,8,22,1,2,'#facc15');pp(g,31,22,1,2,'#facc15')}
  if(has('earpiece')){pp(g,29,18,3,4,K);pp(g,30,19,1,2,'#e2e8f0')}
  if(has('hachimaki')){pp(g,9,10,22,4,K);pp(g,10,11,20,2,'#f8fafc');pp(g,18,11,4,2,'#dc2626');pp(g,30,9,3,6,K);pp(g,31,10,2,2,'#f8fafc');pp(g,31,12,1,2,'#f8fafc')}
  if(has('cap')){hairRects(g,[[11,4,18,6]],P.capc||'#1f2937');pp(g,8,9,15,2,K);pp(g,9,9,13,1,shade(P.capc||'#1f2937',-.3))}
  if(has('mask')){pp(g,13,22,14,6,K);pp(g,14,22,12,5,'#f1f5f9');pp(g,14,23,12,1,'#cbd5e1')}
}

/* 客・店員・常連の小さな見た目を、似顔絵用に変える */
const HS_PT={short:'short',spiky:'spiky',long:'long',bob:'bob',pony:'pony',bald:'bald',perm:'perm'};
function faceFromLook(L,seed,elder){
  const F=L.role?Object.assign({},L):fullLook(L,seed||1,elder);
  const acc=[];if(F.glasses)acc.push('glasses');if(F.shades)acc.push('shades');if(F.mask)acc.push('mask');if(F.cap){acc.push('cap')}
  const P={skin:F.skin||'#f6d1b0',hair:F.hair||'#1b1b1b',hs:HS_PT[F.hs]||'short',out:F.role?'staff':(F.out==='suit'?'suit':F.out||'tee'),col:F.out==='suit'?'#334155':F.shirt||'#3b82f6',acc,age:elder?2:0};
  if(F.cap)P.capc=F.cap;if(F.role)P.tag=ROLES[F.role]?ROLES[F.role].col:'#facc15';if(F.out==='suit')P.tie=F.shirt;
  return P;
}
