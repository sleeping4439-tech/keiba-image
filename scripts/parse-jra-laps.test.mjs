import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJraResult} from './parse-jra-laps.mjs';
const html = \`<!doctype html><html><body><h1>レース結果2026年9月6日（日曜）2回札幌6日 7レース</h1><div>天候晴 芝良</div><div>コース：1,200メートル（芝・右）</div><table><tr><th>着順</th><th>枠</th><th>馬番</th><th>馬名</th><th>タイム</th></tr><tr><td>1</td><td>6</td><td>12</td><td>ウィングブルー</td><td>1:09.5</td></tr><tr><td>2</td><td>8</td><td>16</td><td>ラヴノー</td><td>1:09.5</td></tr></table><div>タイム ハロンタイム 12.1 - 10.8 - 11.3 - 11.8 - 11.5 - 12.0 上り 4F 46.6 - 3F 35.3</div></body></html>\`;
test('parses actual JRA-style turf result',()=>{
 const x=parseJraResult(html,'https://www.jra.go.jp/JRADB/accessS.html');
 assert.equal(x?.date,'2026-09-06');assert.equal(x?.track,'札幌');assert.equal(x?.race,7);
 assert.equal(x?.distance,1200);assert.equal(x?.finish,'1:09.5');assert.equal(x?.going,'良');
 assert.deepEqual(x?.laps,[12.1,10.8,11.3,11.8,11.5,12]);
});
test('rejects dirt',()=>assert.equal(parseJraResult(html.replace('（芝・右）','（ダート・右）')),null));
test('rejects incomplete splits',()=>assert.equal(parseJraResult(html.replace(' - 12.0 上り',' 上り')),null));
test('rejects missing winning time',()=>assert.equal(parseJraResult(html.replaceAll('1:09.5','')),null));
