import {parseJraResult} from './parse-jra-laps.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

const manifest=process.argv[2];
if(!manifest){console.error('Usage: node scripts/build-laps.mjs path/to/manifest.json');process.exit(2)}
const data=JSON.parse(await readFile(manifest,'utf8'));
if(!/^20\d{2}-\d{2}-\d{2}$/.test(data.date)||!Array.isArray(data.pages))throw Error('Invalid manifest');
const races=[],failed=[];
for(const [i,page] of data.pages.entries()){
 try{
  if(typeof page.file!=='string'||!page.file.startsWith('./'))throw Error('Local HTML path required');
  const html=await readFile(resolve(dirname(manifest),page.file),'utf8');
  const x=parseJraResult(html,page.sourceUrl||'');
  if(!x||x.date!==data.date)throw Error('Invalid or non-turf result');
  if(races.some(r=>r.track===x.track&&r.race===x.race))throw Error('Duplicate race');
  races.push(x);
 }catch(e){failed.push({index:i,error:String(e.message||e)})}
}
if(failed.length){console.error(JSON.stringify({failed},null,2));process.exit(1)}
if(!races.length)throw Error('No valid turf races; refusing empty publication');
races.sort((a,b)=>a.track.localeCompare(b.track,'ja')||a.race-b.race);
const out=resolve('data/laps/'+data.date+'.json');
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify({date:data.date,updatedAt:new Date().toISOString(),source:'JRA公式レース結果',races},null,2)+'\n');
console.log('Saved '+out+' ('+races.length+' turf races)');
