/* ===== data.js : 定数とゲームデータ ===== */
const $=s=>document.querySelector(s);
const TS=16, OX=8, OY=24, BOT=10;
const DIRS=[[0,1],[-1,0],[0,-1],[1,0]];
const SEAT_ARROW=['↓','←','↑','→'];
const DIR_ORDER=[2,3,0,1], DIR_NAME=['下','左','上','右'], DIR_TRI=['▼','◀','▲','▶'];
const OPEN=600, CLOSE=1365, LAST=1350, MIN_PER_SEC=8.5;
const SAVE_KEY='pachinko-hanjoki-v2', PREF_KEY='pachinko-hanjoki-prefs2';

/* 設定（スロット）と釘（パチンコ） */
const NAIL_R=[0.86,0.90,0.94,0.99,1.05];            // index = 釘+2
const NAIL_NAME=['締め','やや締め','標準','やや開け','開け'];
const NAIL_SHORT=['-2','-1','±0','+1','+2'];
const NAIL_SCORE=[0,0.25,0.5,0.8,1];
const SET_COL=['#000','#8b8fa8','#3b82f6','#22c55e','#eab308','#f97316','#ff2d55'];
const NAIL_COL=['#8b8fa8','#3b82f6','#22c55e','#f97316','#ff2d55'];
const SLOT_HINT=['','店がいちばん儲かる。客はほとんど勝てない','店がよく儲かる。客は負けやすい','店がやや儲かる。たまに勝てる','ほぼトントン。客もそこそこ勝てる','客が勝ちやすい。店は少し赤字','客が大勝ちしやすい。店は赤字になりやすい'];
const NAIL_HINT=['ほとんど回らない。客はすぐ見切る。店は大きく儲かる','あまり回らない。店がやや儲かる','ふつうの回り。店が少し儲かる','よく回る。客が勝ちやすい','すごく回る。客は大喜び、店は赤字ぎみ'];

/* 貸玉レート */
const RATE={p:{hi:{label:'4円',coin:400,unit:4},lo:{label:'1円',coin:100,unit:1}},s:{hi:{label:'20円',coin:500,unit:20},lo:{label:'5円',coin:125,unit:5}}};
const SEGS=['p-hi','p-lo','s-hi','s-lo'];
const SEG_SHARE={'p-hi':0.40,'p-lo':0.17,'s-hi':0.33,'s-lo':0.10};
const SEG_NAME={'p-hi':'4円パチンコ','p-lo':'1円パチンコ','s-hi':'20円スロット','s-lo':'5円スロット'};
const KIND_NAME={p:'パチンコ',s:'スロット'};

/* 機種（架空）
   パチンコ：prob＝初当り確率の分母（PROBS から選ぶ）
   スロット：rates＝設定1〜6の機械割(%)、hit＝初当り確率の分母[設定1,設定6]、vol＝一撃の荒さ(1=Aタイプ 2=AT 3=AT荒波) */
const MODELS=[
 {id:'ponpoko',name:'PAぽんぽこ合戦',k:'p',prob:99.9,price:220000,pop:40,c:'#ff9a2e',c2:'#ffe08a',rank:1},
 {id:'umineko',name:'P海ねこパラダイス',k:'p',prob:319,price:320000,pop:55,c:'#2e9bff',c2:'#bfe4ff',rank:1},
 {id:'manekineko',name:'PA招き猫フィーバー',k:'p',prob:99.9,price:380000,pop:64,c:'#f2c230',c2:'#fff3b0',rank:2},
 {id:'dragon',name:'e爆炎ドラゴン伝説',k:'p',prob:599,price:450000,pop:68,c:'#e8392e',c2:'#ffb08a',rank:2},
 {id:'karakuri',name:'e大江戸からくり',k:'p',prob:199,price:520000,pop:74,c:'#b45309',c2:'#fde68a',rank:3},
 {id:'stella',name:'e銀河特急ステラ',k:'p',prob:349,price:640000,pop:82,c:'#14b8a6',c2:'#b8fff4',rank:4},
 {id:'neon7',name:'ネオン7',k:'s',spec:'Aタイプ',rates:[97.0,98.0,99.5,101.1,103.3,105.5],hit:[168,128],vol:1,price:260000,pop:46,c:'#ff4fa3',c2:'#ffd1e8',rank:1},
 {id:'bell',name:'ハッピーベル',k:'s',spec:'Aタイプ',rates:[97.0,98.5,99.8,102.0,104.3,109.0],hit:[165,120],vol:1,price:300000,pop:52,c:'#facc15',c2:'#fff7b0',rank:1},
 {id:'pirate',name:'パイレーツゴールドカリビアン',k:'s',spec:'AT機',rates:[97.5,98.5,100.5,104.0,108.0,112.0],hit:[380,270],vol:2,price:460000,pop:66,c:'#16a34a',c2:'#c8ffe0',rank:2},
 {id:'samurai',name:'サムライ斬',k:'s',spec:'AT機',rates:[97.0,98.5,101.0,106.0,110.5,114.9],hit:[520,300],vol:3,price:520000,pop:72,c:'#7c3aed',c2:'#d9c4ff',rank:3},
 {id:'panda',name:'ジェットパンダ',k:'s',spec:'AT機',rates:[97.6,98.6,100.5,105.0,109.0,113.0],hit:[350,250],vol:2,price:600000,pop:78,c:'#0f172a',c2:'#e2e8f0',rank:4},
 {id:'lumina',name:'魔法少女ミテミナ',k:'s',spec:'AT機',rates:[97.8,98.8,101.0,106.0,110.5,114.9],hit:[330,240],vol:2,price:780000,pop:90,c:'#ff6ad5',c2:'#ffffff',rank:5},
 {id:'dragon2',name:'P爆炎ドラゴン伝説・極',k:'p',prob:399,price:560000,pop:78,c:'#ff5a36',c2:'#ffd0b0',rank:2,gen:2},
 {id:'samurai2',name:'サムライ斬・零',k:'s',spec:'AT機',rates:[97.5,98.5,100.8,105.5,110.0,114.0],hit:[400,280],vol:2,price:620000,pop:82,c:'#9b5cff',c2:'#e6d8ff',rank:3,gen:2},
 {id:'umineko2',name:'P海ねこパラダイス2',k:'p',prob:319,price:430000,pop:72,c:'#38a3ff',c2:'#d6efff',rank:1,gen:3},
 {id:'pirate2',name:'パイレーツゴールドカリビアン2',k:'s',spec:'AT機',rates:[97.6,98.6,100.8,105.5,109.5,113.5],hit:[360,260],vol:2,price:560000,pop:76,c:'#22c55e',c2:'#d9ffe8',rank:2,gen:3},
 ...MACHINE_DB, /* 人気機種をもとにした追加分は machines.js */
];
const byRankPrice=(a,b)=>a.rank-b.rank||a.price-b.price;
const shortName=n=>n.length>13?n.slice(0,12)+'…':n;
/* 規制（日数は開業からの日） */
const REGS=[
 {day:45,name:'一撃性能の規制',ids:['dragon','samurai'],add:['dragon2','samurai2'],grace:28,desc:'一撃が大きすぎる台が規制対象になりました'},
 {day:110,name:'出玉の新基準',ids:['umineko','pirate'],add:['umineko2','pirate2'],grace:28,desc:'旧基準のミドル・AT機が撤去対象になりました'},
];
const MB=Object.fromEntries(MODELS.map(m=>[m.id,m]));
const SPEC_INFO={'甘デジ':'当たりが軽く、こまめに当たる','ライトミドル':'当たりやすさと出玉のバランス型','ミドル':'当たりの重さも出玉もふつう','ハイミドル':'当たりは重めで、当たれば大きい','荒波':'当たりはとても重いが、一撃で万発もある','Aタイプ':'ボーナスがこまめに当たるタイプ','AT機':'当たると一気に出る一撃型'};

/* ---------- 出玉のしくみ ----------
   パチンコ：初当り確率は6種類から選ぶ。重いほど1回の当りが大きく、連チャン（RUSH）も伸びやすい
   スロット：設定ごとの機械割（最大114.9%）。初当りの重さは設定1と設定6の間をなめらかにつなぐ */
const PROBS=[99.9,199,319,349,399,599];
const PROB_SPEC={99.9:'甘デジ',199:'ライトミドル',319:'ミドル',349:'ミドル',399:'ハイミドル',599:'荒波'};
/* e=RUSH突入率 q=RUSH継続率 m=RUSH中1回の大きさ（初当り比） lt=上位RUSH(LT)に入る率 ltq=LTの継続率 */
const PROB_SHAPE={99.9:{e:0.5,q:0.55,m:0.8,lt:0,ltq:0.9},199:{e:0.5,q:0.65,m:1,lt:0,ltq:0.9},319:{e:0.55,q:0.72,m:1,lt:0,ltq:0.9},349:{e:0.55,q:0.75,m:1.2,lt:0.02,ltq:0.88},399:{e:0.5,q:0.75,m:1.4,lt:0.02,ltq:0.9},599:{e:0.5,q:0.78,m:1.6,lt:0.04,ltq:0.9}};
/* スロットAT：q=継続 up=上位ATに入る率 uq=上位ATの継続 */
const VOL_SHAPE={2:{q:0.75,up:0.025,uq:0.9},3:{q:0.78,up:0.045,uq:0.92}};
const VOL_NAME={1:'ボーナス主体（波はおだやか）',2:'AT（一撃あり）',3:'AT（一撃がとても荒い）'};
const P_SPM=6.5;          // パチンコ：標準の釘で1分あたりの回転数
const S_GPM=13.3;         // スロット：1分あたりのゲーム数
const SLOT_EXCH=5/5.6;    // スロットは5.6枚交換（貸しは5枚＝100円）。店に交換差益が残る
const COMPLETE={p:95000,s:19000}; // コンプリート：1台1日の最大差玉（パチンコ発・スロット枚）
const SLOT_MAX=114.9,SLOT_MIN=80;

/* 床に置く設備 */
const DECOR=[
 {id:'counter',name:'景品カウンター',price:200000,appeal:2,func:1,rank:1,info:'勝った客が景品に交換する。カウンター係がいないと交換できない'},
 {id:'vending',name:'自販機',price:120000,appeal:1,func:1,rank:1,info:'ジュースが1本150円で売れる'},
 {id:'bench',name:'休憩ベンチ',price:60000,appeal:2,func:1,rank:1,info:'負けた客がひと休みして機嫌が少し直る'},
 {id:'booth',name:'喫煙ブース',price:350000,appeal:2,func:1,rank:1,info:'1マスの喫煙所。禁煙席のたばこ客が休憩に使う'},
 {id:'plant',name:'観葉植物',price:30000,appeal:3,rank:1,info:'内装＋3'},
 {id:'changer',name:'両替機',price:80000,appeal:3,rank:1,info:'内装＋3'},
 {id:'cleaner',name:'空気清浄機',price:250000,appeal:2,rank:2,info:'周り2マスの「煙が流れてくる」不満を消す'},
 {id:'kiosk',name:'データ公開機',price:500000,appeal:2,rank:2,info:'台の成績を公開する。設定狙いの客が増え、出し方の評判が大きく動く'},
 {id:'neon',name:'ネオン看板',price:150000,appeal:6,rank:2,info:'内装＋6'},
 {id:'cat',name:'招き猫の像',price:500000,appeal:12,rank:3,info:'内装＋12'},
 {id:'chandelier',name:'シャンデリア',price:900000,appeal:18,rank:4,info:'内装＋18'},
 {id:'fountain',name:'噴水',price:1200000,appeal:25,rank:4,info:'内装＋25'},
];
const DB=Object.fromEntries(DECOR.map(d=>[d.id,d]));
/* 壁に付ける設備 */
const WALLITEMS=[
 {id:'toilet',name:'トイレ',price:300000,appeal:2,cap:2,rank:1,info:'壁に自動ドアで付く。マスを使わない。2人まで同時に使える'},
 {id:'smokeroom',name:'喫煙室',price:500000,appeal:3,cap:4,rank:2,info:'壁に付く喫煙室。マスを使わない。4人まで同時に使える'},
 {id:'camera',name:'防犯カメラ',price:180000,appeal:0,cap:0,rank:1,info:'壁に付く。周り5マスのゴト師を見つけやすくなる',noFront:1},
];
const WB=Object.fromEntries(WALLITEMS.map(d=>[d.id,d]));
const SWATCH={kiosk:'#0ea5e9',camera:'#111827',counter:'#d9a066',vending:'#ef4444',bench:'#a16207',booth:'#94d8e8',plant:'#22c55e',changer:'#94a3b8',cleaner:'#e0f2fe',neon:'#ff4fa3',cat:'#ffffff',chandelier:'#facc15',fountain:'#38bdf8',toilet:'#3b82f6',smokeroom:'#64748b'};

const FLOORS=[
 {id:'tile',name:'ラベンダータイル',price:0,appeal:0,a:'#e7e1f5',b:'#dcd4ee'},
 {id:'wood',name:'フローリング',price:200000,appeal:5,a:'#e0a96d',b:'#d69c5e'},
 {id:'red',name:'赤じゅうたん',price:250000,appeal:6,a:'#e2434b',b:'#d63a42'},
 {id:'blue',name:'青じゅうたん',price:250000,appeal:6,a:'#3b6fe0',b:'#3363d1'},
 {id:'check',name:'市松もよう',price:400000,appeal:9,a:'#fafafa',b:'#3a3a46'},
 {id:'marble',name:'大理石',price:900000,appeal:16,a:'#f6f1ea',b:'#ebe3d6'},
];
const WALLS=[
 {id:'white',name:'白かべ',price:0,appeal:0,c:'#ffffff',d:'#c9c3d9'},
 {id:'stripe',name:'紅白ストライプ',price:150000,appeal:4,c:'#ffffff',d:'#e2434b'},
 {id:'wood',name:'木目パネル',price:180000,appeal:4,c:'#b7804a',d:'#7c522b'},
 {id:'neonwall',name:'ネオンウォール',price:600000,appeal:10,c:'#2a1747',d:'#5b2d91'},
 {id:'gold',name:'金ぱく',price:1500000,appeal:20,c:'#e3b341',d:'#9a7416'},
];
const FB=Object.fromEntries(FLOORS.map(f=>[f.id,f])), WLB=Object.fromEntries(WALLS.map(w=>[w.id,w]));

/* 立地と物件 */
const LOCS={
 jutaku:{name:'住宅街',town:430,rentTile:200,priceTile:12000,elder:1.4,weekend:1.0,rank:1,desc:'家賃が安い。年配の客が多く、低レートが人気'},
 kogai:{name:'郊外ロードサイド',town:560,rentTile:260,priceTile:16000,elder:1.0,weekend:1.15,rank:2,desc:'車で来る客が多く、土日に強い'},
 ekimae:{name:'駅前',town:760,rentTile:420,priceTile:30000,elder:0.7,weekend:0.95,rank:3,desc:'人通りが多く、夕方の会社員が多い。家賃は高い'},
};
const BUILD_SIZES=[{W:22,H:9,rank:1},{W:26,H:11,rank:2},{W:32,H:13,rank:3},{W:38,H:16,rank:4}];
const STARTER=[{kind:'w',type:'toilet'},{kind:'w',type:'toilet'},{kind:'d',type:'counter'},{kind:'d',type:'vending'},{kind:'d',type:'vending'},{kind:'d',type:'bench'},{kind:'d',type:'plant'},{kind:'d',type:'plant'}];
const RANKS=[{n:'町のパチンコ屋',need:0},{n:'駅前の人気店',need:500},{n:'地域一番店',need:2000},{n:'県内の有名店',need:6000},{n:'伝説のホール',need:15000}];

/* 店員 */
const ROLES={
 hall:{name:'ホール係',base:8000,col:'#ef4444',desc:'呼び出しランプに対応する。台12台につき1人が目安'},
 counter:{name:'カウンター係',base:7500,col:'#22c55e',desc:'景品カウンターで交換する。カウンター1つに1人'},
 clean:{name:'清掃係',base:6500,col:'#3b82f6',desc:'床のゴミを片付ける。台25台につき1人が目安'},
};
const FAMILY=['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','松本','井上','木村','林','清水','山口','森','池田','阿部','石川','前田','藤田'];
const GIVEN=['陽太','蓮','結衣','葵','大和','美咲','翔','さくら','颯','ひなた','健太','真央','拓海','彩','悠真','優花','湊','凛','樹','楓'];

/* 名物常連客 */
const REG_DEFS=[
 {id:'taka',name:'スロプロのタカシ',seg:'s-hi',hunter:1,smoker:0,elder:0,sched:'event',likes:'イベント日と高設定',hates:'ガセイベント',look:{shirt:'#0f172a',hair:'#1b1b1b',skin:'#f3cfa9',cap:'#ff2d55'}},
 {id:'gen',name:'パチプロのゲン',seg:'p-hi',hunter:1,smoker:1,elder:0,sched:'nail',likes:'開いた釘',hates:'締まった釘',look:{shirt:'#a16207',hair:'#3b2a1a',skin:'#e9b98f',cap:'#1b1b1b'}},
 {id:'tome',name:'年金の日のトメさん',seg:'p-lo',hunter:0,smoker:0,elder:1,sched:'pension',likes:'1円パチとベンチ',hates:'たばこの煙',look:{shirt:'#c084fc',hair:'#e5e5e5',skin:'#f6d1b0'}},
 {id:'sato',name:'会社員の佐藤さん',seg:'p-hi',hunter:0,smoker:0,elder:0,sched:'evening',likes:'給料日の夜',hates:'呼んでも来ない店員',look:{shirt:'#334155',hair:'#1b1b1b',skin:'#f6d1b0'}},
 {id:'tetsu',name:'ヘビースモーカーの鉄さん',seg:'s-hi',hunter:0,smoker:1,elder:1,sched:'daily',likes:'喫煙OKの席',hates:'禁煙席',look:{shirt:'#b91c1c',hair:'#9ca3af',skin:'#d9a77f'}},
 {id:'midori',name:'主婦のミドリさん',seg:'p-lo',hunter:0,smoker:0,elder:0,sched:'afternoon',likes:'きれいな店内',hates:'たばこの煙',look:{shirt:'#fb7185',hair:'#7a2a1a',skin:'#f3dcc6'}},
 {id:'yuki',name:'大学生のユウキ',seg:'s-lo',hunter:0,smoker:0,elder:0,sched:'weekend',likes:'5円スロ',hates:'混んでいて座れない',look:{shirt:'#22c55e',hair:'#c8a165',skin:'#f6d1b0'}},
 {id:'kaneda',name:'社長の金田',seg:'s-hi',hunter:0,smoker:1,elder:0,sched:'weekend',likes:'豪華な内装',hates:'汚れた床',look:{shirt:'#facc15',hair:'#1b1b1b',skin:'#eabf98'},rich:1},
];
const REG_BY=Object.fromEntries(REG_DEFS.map(r=>[r.id,r]));

/* 客の声（理由ごと） */
const WHY={
 win:{good:1,t:'勝てた！また来るよ'},
 lose:{t:'全然出なかった…'},
 nailBad:{t:'釘が締まってて回らない'},
 nailGood:{good:1,t:'釘が開いてて回る回る！'},
 smokeIn:{t:'禁煙席がよかった。煙がつらい'},
 smokeDrift:{t:'隣の喫煙席から煙が流れてくる'},
 smokeOk:{good:1,t:'吸いながら打てて最高'},
 noSmoke:{t:'たばこを吸える場所がない'},
 mix:{t:'パチンコとスロットの音が混ざってうるさい'},
 waitStaff:{t:'呼び出しても店員がなかなか来ない'},
 slowStaff:{t:'店員さんが来るのが少し遅い'},
 quickStaff:{good:1,t:'店員さんがすぐ来てくれた'},
 noCounter:{t:'景品交換ができない！'},
 counterWait:{t:'景品カウンターが混んでた'},
 noToilet:{t:'トイレがない…'},
 toiletWait:{t:'トイレが混んでた'},
 dirty:{t:'床にゴミが落ちてる'},
 decorGood:{good:1,t:'お店がきれいで気分がいい'},
 decorBad:{t:'店内がちょっと殺風景'},
 full:{t:'満席で座れなかった'},
 rest:{good:1,t:'ベンチでひと休みできた'},
 noSeg:{t:'打ちたい台がない'},
 broken:{t:'打っていた台が壊れた'},
};
/* つぶやき */
const HANDLES=['パチ好き太郎','スロ専ミキ','朝イチ勢','回転数マニア','イベ狙いK','7揃え職人','負けたら終わり','年金パチ子','仕事帰りの田中','ドル箱ハンター','ジャグ好き','ハイエナ次郎','甘デジ専','打ち子A','爆裂おじさん','台パン禁止','パチンコ日記','設定6を探す人'];
const TW={
 nailGood:['この台よく回る！','釘いい感じ','回る回る！当たりそう'],
 nailBad:['全然回らん…','釘締めすぎだろ','この回りじゃ勝てない'],
 smokeIn:['煙たい…禁煙席ないの？','たばこの煙がつらい'],
 smokeOk:['一服しながら打てるの最高','喫煙席ありがたい'],
 smokeDrift:['隣から煙が来る…'],
 mix:['スロットの音うるさい','島がごちゃごちゃ'],
 target:['イベント台ゲット！','狙い台に座れた！'],
 hit:['キター！大当り！','当たった！！','うおお来た！','引いた！'],
 bigwin:['{v}勝ち！最高','今日は勝った！{v}','{v}プラスで撤退'],
 complete:['コンプリートした！もう打てない','完走！差玉MAXまで出た','コンプリート達成…この店やばい'],
 lose:['今日はもう帰る…','{v}負け…','財布が空っぽ'],
 wait:['店員まだ？','ランプ押してるのに…','呼んでも来ない'],
 broken:['台が壊れた…','故障かよ'],
 full:['満席…入れない','空き台がない！'],
 noToilet:['トイレどこ？','トイレないの！？'],
 noSmoke:['吸える場所ないじゃん','たばこ吸いたい…'],
 queue:['朝から並んだ！','今日は熱そう'],
 rain:['雨だしパチンコ行こ','雨宿りついでに'],
 decor:['店キレイ','内装いい感じ'],
 goto:['ゴト師が捕まってる！','怪しい人が連れていかれた'],
 data:['データ見て座った','昨日出てた台だ'],
 newm:['新台打てた！','新台おもしろい'],
 enter:['今日は勝つぞ','ちょっと寄ってく','軍資金1万円'],
};
const REG_LINES={
 win:['今日は勝たせてもらったよ','いい台だった！'],
 lose:['今日はさっぱりだ…','もう少し出してくれよ'],
 nailBad:['この釘じゃ打てないな','釘、締めすぎだろ'],
 nailGood:['いい釘だ。また来る','回るねぇ、この店'],
 smokeIn:['煙たくてねぇ…','たばこの煙はかんべんして'],
 smokeDrift:['煙がこっちまで来るのよ'],
 noSmoke:['吸う場所がないのはつらい','一服できないとはな'],
 smokeOk:['吸いながら打てるのが一番'],
 waitStaff:['ランプを押しても誰も来ない'],
 dirty:['床が汚いと気分が下がるな'],
 decorGood:['いい店になったな'],
 full:['座れなかったよ…'],
 noSeg:['打ちたい台がないんだよなぁ'],
 mix:['音が混ざって落ち着かない'],
 noCounter:['交換できないなんて！'],
};
