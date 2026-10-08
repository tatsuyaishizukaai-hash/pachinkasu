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

/* ---------- BGM ---------- */
const NOTE={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
function nf(n){const m=n.match(/^([A-G][#b]?)(\d)$/);if(!m)return 0;return 440*Math.pow(2,(NOTE[m[1]]+(+m[2]+1)*12-69)/12)}
function parseLine(s){return s.trim().split(/\s+/)}
const TRACKS={
  prep:{bpm:132,lead:'square',lv:0.055,arp:false,
    L:'G5 - B5 - D6 - B5 G5 A5 - F#5 - D5 - . A5 B5 - G5 - E5 - G5 B5 C6 - B5 - A5 - G5 - G5 B5 D6 - E6 D6 B5 - A5 - D6 - F#5 - A5 - G5 - E5 - C6 - B5 A5 G5 - - - D5 E5 F#5 -',
    C:['G','D','Em','C','G','D','C','D'],stab:'..x...x...x...x.',drum:'k.h.s.h.k.hks.h.'},
  open:{bpm:150,lead:'square',lv:0.055,arp:true,
    L:'C6 - G5 - E5 G5 C6 - B5 - G5 - D5 G5 B5 - A5 - E5 - C5 E5 A5 C6 A5 - F5 - C6 - A5 - C6 - D6 - E6 - G6 - D6 - B5 - G5 - B5 D6 C6 - A5 - F5 - A5 C6 D6 - B5 - G5 - - .',
    C:['C','G','Am','F','C','G','F','G'],stab:'..x...x...x...x.',drum:'k.hhs.hhk.hhs.hk'},
  event:{bpm:164,lead:'square',lv:0.055,arp:true,
    L:'D6 - A5 - F#5 A5 D6 E6 C#6 - A5 - E5 A5 C#6 E6 D6 - B5 - F#5 B5 D6 F#6 G6 - D6 - B5 - G5 - A5 A5 D6 - A5 A5 E6 - F#6 - E6 - C#6 - A5 - B5 - D6 - G6 - F#6 E6 E6 - C#6 - A5 B5 C#6 E6',
    C:['D','A','Bm','G','D','A','G','A'],stab:'x..x..x.x..x..x.',drum:'k.hhs.hkk.hhs.hs'},
  grand:{bpm:172,lead:'square',lv:0.06,arp:true,dbl:true,
    L:'F5 - A5 - C6 - F6 - E6 - C6 - G5 - C6 - D6 - A5 - F5 - A5 D6 D6 - Bb5 - F5 - Bb5 D6 F6 - E6 F6 G6 - F6 - E6 - D6 C6 - G5 - - D6 - F6 - Bb5 - D6 - C6 - E6 - G6 - - -',
    C:['F','C','Dm','Bb','F','C','Bb','C'],stab:'x.x...x.x.x...x.',drum:'kkh.s.hkk.h.s.hs'},
};
const CHQ={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10]};
function chordFreqs(name,oct){const m=name.match(/^([A-G][#b]?)(m|7)?$/);const root=NOTE[m[1]];return CHQ[m[2]||''].map(i=>440*Math.pow(2,(root+i+(oct+1)*12-69)/12))}
function rootFreq(name,oct,add){const m=name.match(/^([A-G][#b]?)/);return 440*Math.pow(2,(NOTE[m[1]]+(add||0)+(oct+1)*12-69)/12)}
for(const t of Object.values(TRACKS)){t.Lt=parseLine(t.L)}
let bgm={cur:null,step:0,next:0,gain:null,timer:null};
function playBgm(name){
  if(!TRACKS[name])return;
  if(bgm.cur===name&&bgm.gain)return;
  bgm.want=name;
  if(!prefs.bgm||!audio())return;
  const t=AC.currentTime;
  if(bgm.gain){const g=bgm.gain;g.gain.setTargetAtTime(0.0001,t,0.25);setTimeout(()=>{try{g.disconnect()}catch(e){}},1500)}
  const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.setTargetAtTime(1,t+0.05,0.3);g.connect(BGMG);
  bgm.gain=g;bgm.cur=name;bgm.step=0;bgm.next=AC.currentTime+0.1;
  if(!bgm.timer)bgm.timer=setInterval(bgmTick,30);
}
function stopBgm(){if(bgm.gain&&AC){bgm.gain.gain.setTargetAtTime(0.0001,AC.currentTime,0.2)}bgm.cur=null;bgm.gain=null}
function bgmTick(){
  if(!AC||!bgm.cur||!bgm.gain||AC.state!=='running')return;
  const tr=TRACKS[bgm.cur],dt=60/tr.bpm/4,dest=bgm.gain,bars=tr.C.length;
  while(bgm.next<AC.currentTime+0.15){
    const st=bgm.step,at=Math.max(0,bgm.next-AC.currentTime),s16=st%16,bar=Math.floor(st/16)%bars,ch=tr.C[bar];
    if(s16%2===0){
      const i=(bar*8+s16/2)%tr.Lt.length,n=tr.Lt[i];
      if(n!=='-'&&n!=='.'){let len=1;while(tr.Lt[(i+len)%tr.Lt.length]==='-'&&len<8)len++;
        const f=nf(n);tone(f,dt*2*len*0.9,{type:tr.lead,v:tr.lv,at,dest});if(tr.dbl)tone(f/2,dt*2*len*0.9,{type:'sawtooth',v:tr.lv*0.35,at,dest})}
      const bp=[0,null,12,null,7,null,12,7][s16/2];
      if(bp!==null)tone(rootFreq(ch,2,bp),dt*1.7,{type:'triangle',v:0.15,at,dest});
    }
    if(tr.stab[s16]==='x')for(const f of chordFreqs(ch,4))tone(f,dt*0.9,{type:'square',v:0.018,at,dest});
    if(tr.arp){const cf=chordFreqs(ch,5);tone(cf[st%cf.length],dt*0.8,{type:'triangle',v:0.022,at,dest})}
    const d=tr.drum[s16];
    if(d==='k')tone(150,0.12,{type:'sine',v:0.3,at,to:45,dest});
    else if(d==='s'){noise(0.1,{v:0.12,at,bp:1800,dest});noise(0.05,{v:0.05,at,hp:6000,dest})}
    else if(d==='h')noise(0.03,{v:0.045,at,hp:7500,dest});
    bgm.step++;bgm.next+=dt;
  }
}
document.addEventListener('visibilitychange',()=>{try{if(!AC)return;document.hidden?AC.suspend():AC.resume()}catch(e){}});
