import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJraResult} from './parse-jra-laps.mjs';
const html=`<html><body><h1>2026年10月10日（土曜） 4回東京3日 2レース</h1><p>コース：1,600メートル（芝・左）</p><table><tr><th>着順</th><th>馬名</th><th>タイム</th></tr><tr><td>1</td><td>テスト</td><td>1:34.2</td></tr></table><div>ハロンタイム 12.3 - 11.0 - 11.7 - 12.0 - 12.0 - 12.1 - 11.6 - 11.5 上り 4F 47.2 - 3F 35.2</div></body></html>`;
test('parses 1600m turf lap array and winning time',()=>{
 const x=parseJraResult(html,'https://www.jra.go.jp/example');
 assert.equal(x?.track,'東京');assert.equal(x?.race,2);assert.equal(x?.finish,'1:34.2');
 assert.deepEqual(x?.laps,[12.3,11,11.7,12,12,12.1,11.6,11.5]);
});
test('rejects dirt race',()=>assert.equal(parseJraResult(html.replace('（芝・左）','（ダート・左）')),null));
test('rejects missing splits',()=>assert.equal(parseJraResult(html.replace(' - 11.5 上り',' 上り')),null));
