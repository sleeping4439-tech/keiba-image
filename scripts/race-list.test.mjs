import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../cloudflare/worker.js',import.meta.url),'utf8');
function setup(fetch){
 const ctx=vm.createContext({URL,Date,Response,TextDecoder:class{decode(b){return new TextDecoder().decode(b)}},AbortSignal,fetch});
 vm.runInContext(source.replace('export default','const worker='),ctx);
 return async path=>{ctx.request=new Request('https://worker.test'+path);return (await vm.runInContext('worker.fetch(request)',ctx)).json()};
}
test('calendar captions identify every venue without nearby navigation or date exceptions',async()=>{
 const tracks=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
 const run=setup(async()=>new Response(tracks.map(track=>'<h2>別の東京ナビゲーション</h2><table><caption><div class="inner"><div class="main">4回'+track+'11日</div></div></caption>'+Array.from({length:12},(_,i)=>'<tr><th>'+(i+1)+'<span>レース</span></th><td>2歳未勝利 1,400 （芝）</td><td>10時00分</td></tr>').join('')+'</table>').join('')));
 const data=await run('/races?date=2026-11-01');
 assert.equal(data.races.length,120);
 tracks.forEach(track=>assert.deepEqual(data.races.filter(r=>r.track===track).map(r=>r.number),Array.from({length:12},(_,i)=>i+1)));
});
test('discovers current meeting and race links and POSTs the published code',async()=>{
 const calls=[];
 const run=setup(async(url,options)=>{
  assert.equal(options.method,'POST');
  const code=new URLSearchParams(options.body).get('CNAME');calls.push(code);
  if(code==='pw01dli00/F3')return new Response("doAction('/JRADB/accessD.html','pw01drl00052026041120261101/3F')");
  if(code==='pw01drl00052026041120261101/3F')return new Response("doAction('/JRADB/accessD.html','pw01dde0108202604110120261101/32');doAction('/JRADB/accessD.html','pw01dde0105202604110120261101/54')");
  assert.equal(code,'pw01dde0105202604110120261101/54');
  return new Response('<table><tr><td>1</td><td><a>テストホース</a></td><td>牡3</td></tr><tr><td>2</td><td><a>サンプルホース</a></td><td>牝3</td></tr></table>');
 });
 const data=await run('/entries-by-race?date=2026-11-01&track='+encodeURIComponent('東京')+'&number=1');
 assert.equal(data.available,true);
 assert.equal(data.entries.length,2);
 assert.equal(calls.length,3);
});
