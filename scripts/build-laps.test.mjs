import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('scripts/build-laps.mjs');
const html=String.raw`<html><body><h1>2026年9月6日（日曜）2回札幌6日 7レース</h1><div>芝良</div><div>コース：1,200メートル（芝・右）</div><table><tr><th>着順</th><th>馬名</th><th>タイム</th></tr><tr><td>1</td><td>テスト</td><td>1:09.5</td></tr></table><div>ハロンタイム 12.1 - 10.8 - 11.3 - 11.8 - 11.5 - 12.0 上り 3F 35.3</div></body></html>`;
async function fixture(expected=1){
 const root=await mkdtemp(join(tmpdir(),'yubaba-laps-'));
 await mkdir(join(root,'inputs'));
 await writeFile(join(root,'inputs','race.html'),html);
 const manifest={date:'2026-09-06',expectedTurfRaces:{'札幌':expected},pages:[{file:'./race.html',track:'札幌',race:7}]};
 await writeFile(join(root,'inputs','manifest.json'),JSON.stringify(manifest));
 return {root,manifest:join(root,'inputs','manifest.json')};
}
test('batch importer writes verified date JSON',async()=>{
 const f=await fixture();
 try{
  const run=spawnSync(process.execPath,[script,f.manifest],{cwd:f.root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(await readFile(join(f.root,'data/laps/2026-09-06.json'),'utf8'));
  assert.equal(result.expectedTurfRaces['札幌'],1);
  assert.equal(result.races[0].finish,'1:09.5');
 }finally{await rm(f.root,{recursive:true,force:true})}
});
test('batch importer refuses incomplete turf card',async()=>{
 const f=await fixture(2);
 try{
  const run=spawnSync(process.execPath,[script,f.manifest],{cwd:f.root,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/Incomplete/);
 }finally{await rm(f.root,{recursive:true,force:true})}
});
