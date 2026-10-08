#!/usr/bin/env node
/* パチンカスの成り上がり店長録のビルド
   node src/build-app.js
   - ルートの index.html / sw.js … ホーム画面アプリ（PWA）版
   - dist/artifact.html          … Claudeのアーティファクト版 */
const fs=require('fs'),path=require('path');
const SRC=__dirname,ROOT=path.join(__dirname,'..');
const ORDER=['data.js','state.js','market.js','sim.js','features.js','render.js','audio.js','ui.js','main.js'];
const js=ORDER.map(f=>fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
const tpl=fs.readFileSync(path.join(SRC,'template.html'),'utf8');
if(!tpl.includes('/*__JS__*/'))throw new Error('template.html に /*__JS__*/ がありません');
const page=tpl.replace('/*__JS__*/',()=>js);

/* アーティファクト版：そのまま */
fs.mkdirSync(path.join(ROOT,'dist'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'dist','artifact.html'),page);

/* アプリ版：head と body に分けて、ホーム画面用のタグと Service Worker を足す */
const cut=page.indexOf('<div id="probe">');
if(cut<0)throw new Error('template.html に <div id="probe"> がありません');
const headPart=page.slice(0,cut),bodyPart=page.slice(cut);
const VERSION=new Date().toISOString().replace(/[-:T]/g,'').slice(0,12);
const app=`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="釘と設定、イベントと店づくりで客を呼ぶ、ドット絵のパチンコ屋経営ゲーム">
<meta name="theme-color" content="#2d2459">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="パチンカス">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<style>[hidden]{display:none!important}</style>
<script>window.APP_MODE=true;window.APP_VERSION='${VERSION}';</script>
${headPart.trim()}
</head>
<body>
${bodyPart.trim()}
<script>
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT,'index.html'),app);

const sw=fs.readFileSync(path.join(SRC,'sw-template.js'),'utf8').replace('__VERSION__',VERSION);
fs.writeFileSync(path.join(ROOT,'sw.js'),sw);
console.log('built version',VERSION,'app',Math.round(app.length/1024)+'KB','artifact',Math.round(page.length/1024)+'KB');
