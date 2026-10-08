/* ===== machines.js : 機種データベース（追加分） =====
   2026年10月はじめの人気ランキングをもとに選んだ機種です。
   - パチンコ17機種・スロット16機種
   - 元にしたランキング：P-WORLDの設置台数ランキング、パチビーの全国稼働ランキング

   ★ name はゲームに表示される名前です。いまは実機の名前のままなので、公開する前に変えてください。
   ★ id は変えないでください（セーブデータが台の機種を id で覚えています）。

   k     … p=パチンコ／s=スロット
   spec  … 甘デジ・ライトミドル・ミドル・荒波（パチンコ）／Aタイプ・AT機（スロット）
   price … 買う値段（円）
   pop   … 人気（0〜100）。高いほどお客さんが座りたがる
   hit   … 大当り1回の出玉の目安（円）
   rank  … 買えるようになるお店のランク（1〜5）
   c・c2 … 台の色（本体・ランプ） */
const MACHINE_DB=[
 /* ---------- パチンコ ---------- */
 {id:'x_eva_mirai',  name:'新世紀エヴァンゲリオン〜未来への咆哮〜',     k:'p',spec:'ミドル',      price:680000,pop:88,hit:22000,rank:4,c:'#6d28d9',c2:'#a3e635'},
 {id:'x_ghoul_p',    name:'e東京喰種',                                 k:'p',spec:'荒波',        price:820000,pop:94,hit:34000,rank:5,c:'#1f2937',c2:'#ef4444'},
 {id:'x_sao_p',      name:'eソードアート・オンライン アリシゼーション', k:'p',spec:'荒波',        price:780000,pop:91,hit:32000,rank:5,c:'#1e3a8a',c2:'#fbbf24'},
 {id:'x_umi5sp',     name:'P大海物語5スペシャル',                       k:'p',spec:'ミドル',      price:560000,pop:84,hit:18000,rank:3,c:'#0284c7',c2:'#fde047'},
 {id:'x_umi5',       name:'P大海物語5',                                 k:'p',spec:'ミドル',      price:480000,pop:78,hit:17000,rank:2,c:'#0ea5e9',c2:'#fef08a'},
 {id:'x_umi5ag',     name:'PA大海物語5 With アグネス・ラム',            k:'p',spec:'甘デジ',      price:380000,pop:72,hit:5000, rank:1,c:'#38bdf8',c2:'#fbcfe8'},
 {id:'x_oki6',       name:'Pスーパー海物語IN沖縄6',                     k:'p',spec:'ミドル',      price:460000,pop:74,hit:16000,rank:2,c:'#06b6d4',c2:'#fda4af'},
 {id:'x_eva_hajime', name:'e新世紀エヴァンゲリオン〜はじまりの記憶〜',   k:'p',spec:'ミドル',      price:600000,pop:82,hit:21000,rank:3,c:'#7c3aed',c2:'#f97316'},
 {id:'x_rezero_p',   name:'eRe:ゼロから始める異世界生活 鬼がかり2',     k:'p',spec:'荒波',        price:720000,pop:87,hit:30000,rank:4,c:'#93c5fd',c2:'#f0f9ff'},
 {id:'x_garo12',     name:'e牙狼12 黄金騎士極限',                       k:'p',spec:'荒波',        price:740000,pop:88,hit:36000,rank:4,c:'#a16207',c2:'#fde68a'},
 {id:'x_takt',       name:'e takt op. Destiny',                         k:'p',spec:'ミドル',      price:640000,pop:85,hit:20000,rank:4,c:'#be123c',c2:'#fecdd3'},
 {id:'x_lyco_p',     name:'eリコリス・リコイル',                        k:'p',spec:'ライトミドル',price:560000,pop:83,hit:12000,rank:3,c:'#dc2626',c2:'#bfdbfe'},
 {id:'x_seed',       name:'eF機動戦士ガンダムSEED クライマックス',      k:'p',spec:'ミドル',      price:620000,pop:82,hit:20000,rank:3,c:'#1d4ed8',c2:'#f8fafc'},
 {id:'x_hokuto11',   name:'e北斗の拳11 暴凶星',                         k:'p',spec:'荒波',        price:700000,pop:84,hit:33000,rank:4,c:'#7f1d1d',c2:'#fca5a5'},
 {id:'x_umi3r3',     name:'PA海物語3R3',                                k:'p',spec:'甘デジ',      price:320000,pop:64,hit:4500, rank:1,c:'#0369a1',c2:'#bae6fd'},
 {id:'x_shinumi',    name:'PA新海物語',                                 k:'p',spec:'甘デジ',      price:300000,pop:62,hit:4200, rank:1,c:'#0891b2',c2:'#fef9c3'},
 {id:'x_odabuta2',   name:'Pポチッと一発!おだてブタ2',                  k:'p',spec:'甘デジ',      price:340000,pop:68,hit:5500, rank:2,c:'#f472b6',c2:'#fff1f2'},
 /* ---------- スロット ---------- */
 {id:'x_neoim',      name:'ネオアイムジャグラーEX',                     k:'s',spec:'Aタイプ',     price:360000,pop:80,hit:6000, rank:1,c:'#1f2937',c2:'#fde047'},
 {id:'x_myj5',       name:'マイジャグラーV',                            k:'s',spec:'Aタイプ',     price:420000,pop:82,hit:6500, rank:2,c:'#1e293b',c2:'#f472b6'},
 {id:'x_gogo3',      name:'ゴーゴージャグラー3',                        k:'s',spec:'Aタイプ',     price:380000,pop:74,hit:6200, rank:1,c:'#312e81',c2:'#fde047'},
 {id:'x_funky2',     name:'ファンキージャグラー2',                      k:'s',spec:'Aタイプ',     price:400000,pop:72,hit:6400, rank:2,c:'#581c87',c2:'#22d3ee'},
 {id:'x_hana',       name:'ニューキングハナハナV-30',                   k:'s',spec:'Aタイプ',     price:380000,pop:70,hit:6000, rank:1,c:'#be185d',c2:'#fef08a'},
 {id:'x_okidoki',    name:'沖ドキ!ゴージャス',                          k:'s',spec:'Aタイプ',     price:520000,pop:80,hit:9000, rank:3,c:'#f59e0b',c2:'#ecfccb'},
 {id:'x_ghoul_s',    name:'L東京喰種',                                  k:'s',spec:'AT機',        price:760000,pop:92,hit:34000,rank:5,c:'#0f172a',c2:'#f43f5e'},
 {id:'x_kabaneri',   name:'スマスロ 甲鉄城のカバネリ 海門決戦',         k:'s',spec:'AT機',        price:720000,pop:88,hit:30000,rank:4,c:'#3f3f46',c2:'#4ade80'},
 {id:'x_monkey',     name:'スマスロ モンキーターンV',                   k:'s',spec:'AT機',        price:700000,pop:90,hit:32000,rank:4,c:'#1d4ed8',c2:'#fde047'},
 {id:'x_hokuto_s',   name:'スマスロ北斗の拳',                           k:'s',spec:'AT機',        price:740000,pop:92,hit:36000,rank:5,c:'#450a0a',c2:'#f87171'},
 {id:'x_tensei2',    name:'スマスロ 北斗の拳 転生の章2',                k:'s',spec:'AT機',        price:680000,pop:84,hit:34000,rank:4,c:'#292524',c2:'#fb923c'},
 {id:'x_lyco_s',     name:'スマスロ リコリス・リコイル',                k:'s',spec:'AT機',        price:640000,pop:86,hit:26000,rank:3,c:'#b91c1c',c2:'#e0f2fe'},
 {id:'x_god',        name:'スマスロ ミリオンゴッド-神々の軌跡-',        k:'s',spec:'AT機',        price:700000,pop:82,hit:38000,rank:4,c:'#a16207',c2:'#fef3c7'},
 {id:'x_otome5',     name:'L戦国乙女5 業火を穿つ宿焔の双刃',            k:'s',spec:'AT機',        price:600000,pop:80,hit:26000,rank:3,c:'#9d174d',c2:'#fbcfe8'},
 {id:'x_sao_s',      name:'Lスロット ソードアート・オンラインII',       k:'s',spec:'AT機',        price:760000,pop:93,hit:30000,rank:5,c:'#1e40af',c2:'#e0f2fe'},
 {id:'x_aobuta',     name:'L青春ブタ野郎はバニーガール先輩の夢を見ない', k:'s',spec:'AT機',        price:660000,pop:88,hit:26000,rank:3,c:'#4c1d95',c2:'#f9a8d4'},
];
