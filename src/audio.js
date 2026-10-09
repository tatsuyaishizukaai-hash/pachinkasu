/* ===== audio.js : 効果音とBGM（すべて合成） ===== */
let AC=null,SFXG=null,BGMG=null,COMP=null,lastHit=0;
function audio(){
  try{
    if(!AC){
      const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
      AC=new A();
      COMP=AC.createDynamicsCompressor();COMP.threshold.value=-16;COMP.ratio.value=6;
      const lim=AC.createDynamicsCompressor();lim.threshold.value=-3;lim.ratio.value=20;
      COMP.connect(lim);lim.connect(AC.destination);
      SFXG=AC.createGain();SFXG.gain.value=prefs.sfx?0.5:0;SFXG.connect(COMP);
      BGMG=AC.createGain();BGMG.gain.value=prefs.bgm?0.2:0;BGMG.connect(COMP);
    }
    if(AC.state==='suspended')AC.resume();
  }catch(e){return null}
  return AC;
}
function setVolumes(){if(!AC)return;const t=AC.currentTime;SFXG.gain.setTargetAtTime(prefs.sfx?0.5:0,t,0.05);BGMG.gain.setTargetAtTime(prefs.bgm?0.2:0,t,0.1)}
function tone(f,d,{type='square',v=0.1,at=0,to=null,dest=null}={}){
  const a=AC;if(!a)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(g);g.connect(dest||SFXG);o.start(t);o.stop(t+d+0.03);
}
let noiseBuf=null;
function noise(d,{v=0.1,at=0,hp=1000,dest=null,bp=null}={}){
  const a=AC;if(!a)return;
  if(!noiseBuf){noiseBuf=a.createBuffer(1,a.sampleRate*0.5,a.sampleRate);const ch=noiseBuf.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1}
  const t=a.currentTime+at,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
  s.buffer=noiseBuf;f.type=bp?'bandpass':'highpass';f.frequency.value=bp||hp;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  s.connect(f);f.connect(g);g.connect(dest||SFXG);s.start(t);s.stop(t+d+0.02);
}
function duck(){if(!AC||!prefs.bgm)return;const t=AC.currentTime;BGMG.gain.cancelScheduledValues(t);BGMG.gain.setValueAtTime(0.07,t);BGMG.gain.setTargetAtTime(0.2,t+0.6,0.3)}
const SFX={
  tap:()=>tone(1046,0.05,{v:0.05}),
  blip:()=>tone(1320,0.022,{type:'square',v:0.012}),
  place:()=>{tone(523,0.07,{v:0.09});tone(784,0.1,{v:0.09,at:0.06});noise(0.06,{v:0.05,bp:3000})},
  cash:()=>{tone(1319,0.06,{v:0.07});tone(1760,0.14,{v:0.07,at:0.05})},
  bad:()=>{tone(180,0.22,{type:'sawtooth',v:0.08,to:80});tone(120,0.3,{type:'square',v:0.05,at:0.05,to:60})},
  hit:()=>{const n=performance.now();if(n-lastHit<300)return;lastHit=n;[784,988,1175,1568].forEach((f,i)=>tone(f,0.09,{v:0.045,at:i*0.05}));tone(2093,0.25,{type:'triangle',v:0.045,at:0.2})},
  open:()=>{duck();[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,0.15,{v:0.08,at:i*0.1}));noise(0.4,{v:0.08,at:0.62,hp:5000})},
  close:()=>{duck();[784,659,523,392,523].forEach((f,i)=>tone(f,0.2,{type:'triangle',v:0.09,at:i*0.13}))},
  good:()=>{[659,880,1319,1760].forEach((f,i)=>tone(f,0.13,{type:'triangle',v:0.08,at:i*0.07}));noise(0.3,{v:0.04,at:0.25,hp:7000})},
  stamp:()=>{duck();tone(90,0.18,{type:'sine',v:0.3,to:45});noise(0.12,{v:0.15,bp:900})},
  fanfare:()=>{duck();[[523,0],[523,0.12],[523,0.24],[698,0.36],[880,0.6],[784,0.84],[1047,1.0]].forEach(([f,t])=>{tone(f,0.22,{v:0.08,at:t});tone(f/2,0.22,{type:'triangle',v:0.08,at:t})});noise(0.6,{v:0.06,at:1.0,hp:6000})},
  gagan:()=>{duck();tone(110,0.5,{type:'sawtooth',v:0.12,to:55});tone(82,0.7,{type:'square',v:0.08,at:0.1,to:41});noise(0.4,{v:0.1,bp:400})},
};
function sfx(n){if(!prefs.sfx)return;if(!audio())return;try{SFX[n]&&SFX[n]()}catch(e){}}

/* ---------- BGM（クラブ風：4つ打ちキック＋裏打ちハット＋サイドチェイン） ----------
   1曲 = 8小節のコード進行。前半8小節はグルーヴ、後半8小節でメロディが入る。8小節目の最後でスネアロールと上昇ノイズ */
const NOTE={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
function nf(n){const m=n.match(/^([A-G][#b]?)(\d)$/);if(!m)return 0;return 440*Math.pow(2,(NOTE[m[1]]+(+m[2]+1)*12-69)/12)}
const TRACKS={
  /* 準備中：ファンキーなハウス */
  prep:{bpm:128,C:['Am','F','C','G','Am','F','C','G'],
    bass:'x.xx..x.x.xx..x.',stab:'..x...x...x..x..',pluck:'0.2.1.2.0.2.3.2.',hat:'hhhhhhhhhhhhhhhh',oh:'..o...o...o...o.',clap:'....c.......c...',
    L:'A5 . . C6 . . E6 . D6 . C6 . A5 . . . F5 . . A5 . . C6 . A5 . G5 . F5 . . . E5 . . G5 . . C6 . B5 . G5 . E5 . . . D5 . . G5 . . B5 . D6 . B5 . G5 . A5 .'},
  /* 営業中：明るいエレクトロハウス */
  open:{bpm:138,C:['C','G','Am','F','C','G','Am','F'],
    bass:'.xx..xx..xx..xxx',stab:'..x...x...x...x.',pluck:'0.1.2.0.1.2.3.2.',hat:'hhhhhhhhhhhhhhhh',oh:'..o...o...o...o.',clap:'....c.......c...',
    L:'E5 . G5 . C6 . G5 E5 . G5 . C6 D6 . C6 . D6 . B5 . G5 . B5 D6 . B5 . G5 A5 . B5 . C6 . A5 . E5 . A5 C6 . E6 . D6 C6 . A5 . A5 . C6 . F6 . E6 . D6 . C6 . A5 - - .'},
  /* イベント日：トランス寄りのアッパー */
  event:{bpm:146,C:['Dm','Bb','F','C','Dm','Bb','F','C'],
    bass:'.xxx.xxx.xxx.xxx',stab:'x..x..x...x..x..',pluck:'0123012301230123',hat:'hhhhhhhhhhhhhhhh',oh:'..o...o...o...o.',clap:'....c.......c..c',
    L:'D6 . A5 . F5 . A5 . D6 . E6 . F6 . E6 . D6 . Bb5 . F5 . Bb5 . D6 . F6 . D6 . Bb5 . C6 . A5 . F5 . A5 . C6 . F6 . E6 . C6 . E6 . C6 . G5 . C6 . E6 . G6 . E6 - - .'},
  /* グランドオープン：ハードなEDM */
  grand:{bpm:154,C:['Em','C','G','D','Em','C','G','D'],
    bass:'.xxx.xxx.xxx.xxx',stab:'x.x...x.x.x...x.',pluck:'0123210301232103',hat:'hhhhhhhhhhhhhhhh',oh:'..o...o...o...o.',clap:'....c.......c.cc',saw:true,
    L:'E6 - B5 . E6 . G6 . F#6 . E6 . B5 . G5 . C6 - G5 . C6 . E6 . D6 . C6 . G5 . E5 . D6 - B5 . D6 . G6 . F#6 . D6 . B5 . D6 . F#6 - D6 . A5 . D6 . E6 . F#6 . A6 - - .'},
};
const CHQ={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10]};
function chordSemis(name){const m=name.match(/^([A-G][#b]?)(m|7)?$/);return {root:NOTE[m[1]],iv:CHQ[m[2]||'']}}
const mf=(semi,oct)=>440*Math.pow(2,(semi+(oct+1)*12-69)/12);
for(const t of Object.values(TRACKS)){t.Lt=t.L.trim().split(/\s+/);if(t.Lt.length!==64)console.warn('BGM length',t.Lt.length)}
let bgm={cur:null,step:0,next:0,gain:null,pump:null,timer:null};
/* フィルター付きのこぎり波（ベース・スタブ・リード用） */
function synth(f,d,{v=0.05,at=0,dest,type='sawtooth',cut=1800,q=1,det=0,env=0}){
  const a=AC,t=a.currentTime+at,o=a.createOscillator(),fl=a.createBiquadFilter(),g=a.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(det)o.detune.setValueAtTime(det,t);
  fl.type='lowpass';fl.Q.value=q;fl.frequency.setValueAtTime(cut+env,t);if(env)fl.frequency.exponentialRampToValueAtTime(Math.max(80,cut),t+d*0.8);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(fl);fl.connect(g);g.connect(dest);o.start(t);o.stop(t+d+0.03);
}
function sweep(d,{at=0,dest,v=0.05}){
  const a=AC;if(!noiseBuf)noise(0.01,{v:0.0001});
  const t=a.currentTime+at,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
  s.buffer=noiseBuf;s.loop=true;f.type='bandpass';f.Q.value=2;f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(8000,t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+d*0.95);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.05);
  s.connect(f);f.connect(g);g.connect(dest);s.start(t);s.stop(t+d+0.1);
}
function playBgm(name){
  if(!TRACKS[name])return;
  if(bgm.cur===name&&bgm.gain)return;
  bgm.want=name;
  if(!prefs.bgm||!audio())return;
  const t=AC.currentTime;
  if(bgm.gain){const g=bgm.gain;g.gain.setTargetAtTime(0.0001,t,0.25);setTimeout(()=>{try{g.disconnect()}catch(e){}},1500)}
  const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.setTargetAtTime(1,t+0.05,0.3);g.connect(BGMG);
  const pump=AC.createGain();pump.gain.value=1;pump.connect(g);
  bgm.gain=g;bgm.pump=pump;bgm.cur=name;bgm.step=0;bgm.next=AC.currentTime+0.1;
  if(!bgm.timer)bgm.timer=setInterval(bgmTick,25);
}
function stopBgm(){if(bgm.gain&&AC){bgm.gain.gain.setTargetAtTime(0.0001,AC.currentTime,0.2)}bgm.cur=null;bgm.gain=null;bgm.pump=null}
function bgmTick(){
  if(!AC||!bgm.cur||!bgm.gain||AC.state!=='running')return;
  const tr=TRACKS[bgm.cur],dt=60/tr.bpm/4,out=bgm.gain,mix=bgm.pump,bars=tr.C.length;
  while(bgm.next<AC.currentTime+0.15){
    const st=bgm.step,at=Math.max(0,bgm.next-AC.currentTime),t0=AC.currentTime+at,s16=st%16,barN=Math.floor(st/16),bar=barN%bars,
      sec=Math.floor(barN/bars)%2,lastBar=bar===bars-1,{root,iv}=chordSemis(tr.C[bar]);
    /* キック（4つ打ち）とサイドチェイン。最後の小節の4拍目は抜いてロールを聞かせる */
    if(s16%4===0&&!(lastBar&&s16===12)){
      tone(150,0.16,{type:'sine',v:0.42,at,to:42,dest:out});noise(0.012,{v:0.05,at,hp:2500,dest:out});
      mix.gain.setValueAtTime(0.32,t0);mix.gain.linearRampToValueAtTime(1,t0+dt*2.6);
    }
    if(st%(16*bars)===0)noise(0.9,{v:0.07,at,hp:5000,dest:mix});
    /* ハット・オープンハット・クラップ */
    if(tr.hat[s16]==='h')noise(0.022,{v:s16%2?0.035:0.018,at,hp:9000,dest:mix});
    if(tr.oh[s16]==='o')noise(0.11,{v:0.05,at,hp:7000,dest:mix});
    if(tr.clap[s16]==='c'){noise(0.13,{v:0.11,at,bp:1500,dest:mix});noise(0.05,{v:0.07,at:at+0.012,bp:1200,dest:mix})}
    if(lastBar&&s16>=12){noise(0.07,{v:0.05+(s16-12)*0.025,at,bp:1700,dest:mix});noise(0.05,{v:0.04+(s16-12)*0.02,at:at+dt/2,bp:1700,dest:mix})}
    if(lastBar&&s16===0)sweep(dt*16,{at,dest:mix,v:0.035});
    /* ベース（ルート、ときどきオクターブ上） */
    if(tr.bass[s16]==='x')synth(mf(root,1)*(s16%8===7?2:1),dt*0.85,{v:0.16,at,dest:mix,cut:320,env:900,q:4});
    /* コードのスタブ（2本のずらしたノコギリ波） */
    if(tr.stab[s16]==='x')for(const i of iv){const f=mf(root+i,4);synth(f,dt*1.3,{v:0.016,at,dest:mix,cut:900,env:2600,det:-9});synth(f,dt*1.3,{v:0.016,at,dest:mix,cut:900,env:2600,det:9})}
    /* プラック（コードのアルペジオ）＋こだま */
    const pk=tr.pluck[s16];
    if(pk!=='.'){const n=+pk,f=mf(root+iv[n%iv.length]+(n>=iv.length?12:0),5);tone(f,dt*0.7,{type:'square',v:0.022,at,dest:mix});tone(f,dt*0.6,{type:'square',v:0.009,at:at+dt*3,dest:mix})}
    /* メロディ（後半8小節だけ） */
    if(sec===1){
      const i=(bar*16+s16)%tr.Lt.length,n=tr.Lt[i];
      if(n!=='-'&&n!=='.'){let len=1;while(tr.Lt[(i+len)%tr.Lt.length]==='-'&&len<8)len++;
        const f=nf(n),d=dt*len*0.95;
        synth(f,d,{type:tr.saw?'sawtooth':'square',v:0.045,at,dest:mix,cut:1400,env:3200,q:2});
        if(tr.saw)synth(f*1.003,d,{v:0.03,at,dest:mix,cut:1600,env:2600});
        tone(f,d*0.8,{type:'triangle',v:0.016,at:at+dt*3,dest:mix});}
    }
    bgm.step++;bgm.next+=dt;
  }
}
document.addEventListener('visibilitychange',()=>{try{if(!AC)return;document.hidden?AC.suspend():AC.resume()}catch(e){}});
