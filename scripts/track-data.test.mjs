import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
const context=vm.createContext({URL,Date,Response,TextDecoder,AbortSignal});
vm.runInContext(source.replace('export default','const worker='),context);
const run=expression=>vm.runInContext(expression,context);
const names=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
for(const name of names)test(name+' resolves its own measurement slot',()=>{
 context.html=`<div id="rcA" title="京都"><div class="unit"><div class="time">10月12日（月曜）7時00分</div><div class="cushion">10.7</div></div></div><div id="rcC" title="${name}"><div class="unit"><div class="time">10月12日（月曜）7時00分</div><div class="cushion"> 9.6 </div><div class="turf"><span class="mg"> 12.1 </span><span class="m4c">13.2</span></div></div></div>`;
 if(name==='京都')context.html=context.html.replace('title="京都"','title="東京"');
 context.course=name;
 assert.equal(run("extractSourceMeasurements(html,course,2026,'cushion','2026-10-12').cushion"),9.6);
 assert.equal(run("extractSourceMeasurements(html,course,2026,'moist','2026-10-12').finish"),12.1);
});
test('missing course is never guessed from slot letter',()=>{
 context.html='<div id="rcA" title="京都"></div>';
 assert.equal(run("extractSourceMeasurements(html,'東京',2026,'cushion','2026-10-12')"),null);
});
test('condition extraction accepts all ten tracks',()=>{
 for(const name of names){
  context.html=`第1回 ${name}競馬 第1日（2026年10月12日） 馬場状態（10月12日（月曜）7時現在） 天候： 晴 芝 良 ダート 良`;
  context.title=`馬場情報（${name}競馬場）`;
  assert.equal(run("extractCondition(html,title,'https://www.jra.go.jp/keiba/baba/index.html').course"),name);
 }
});
test('all-track endpoint reports discovered active tracks',async()=>{
 // Fixture Responses contain UTF-8; production decodes JRA Shift-JIS bytes.
 context.TextDecoder=class {decode(bytes){return new TextDecoder('utf-8').decode(bytes)}};
 context.fetch=async(url)=>{
  const path=new URL(url).pathname.split('/').pop();
  const titles={'index.html':'新潟','index2.html':'中山','index3.html':'阪神'};
  if(titles[path])return new Response(`<title>馬場情報（${titles[path]}競馬場）</title>第1回 ${titles[path]}競馬 第1日（2026年10月12日） 馬場状態（10月12日（月曜）7時現在） 天候： 晴 芝 良 ダート 良`);
  if(path==='index4.html')return new Response('<title>馬場情報（札幌競馬場）</title>第1回 札幌競馬 第1日（2026年9月6日） 馬場状態（9月6日（日曜）7時現在） 天候： 晴 芝 良 ダート 良');
  const body=Object.values(titles).map((name,i)=>`<div id="rc${String.fromCharCode(65+i)}" title="${name}"><div class="unit"><div class="time">10月12日（月曜）7時00分</div><div class="cushion"> 9.6 </div><div class="turf"><span class="mg">12.1</span><span class="m4c">13.2</span></div></div></div>`).join('');
  return new Response(body);
 };
 context.request=new Request('https://worker.test/latest');
 const response=await run('worker.fetch(request)');
 const data=await response.json();
 assert.deepEqual(data.activeTracks,['新潟','中山','阪神']);
 assert.equal(data.status,'complete');
 assert.equal(data.tracks['新潟'].history[0].condition,'良');
});

test('newest measurement wins across official origins',()=>{
 context.html=['<div id="rcB" title="京都"><div class="unit"><div class="time">10月11日（日曜）7時00分</div><div class="cushion">10.3</div></div></div>','<div id="rcA" title="京都"><div class="unit"><div class="time">10月12日（月曜）7時00分</div><div class="cushion"> 10.7 </div></div></div>'];
 assert.equal(run("extractSourceMeasurements(html,'京都',2026,'cushion','2026-10-12').cushion"),10.7);
});
