import {mkdir,readFile,writeFile} from 'node:fs/promises';
const url=process.env.WORKER_URL;
if(!url||!url.startsWith('https://'))throw new Error('WORKER_URL must use HTTPS');
const res=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
if(!res.ok)throw new Error('Worker returned HTTP '+res.status);
const payload=await res.json();
if(payload.schemaVersion!==1||!payload.tracks||typeof payload.tracks!=='object')throw new Error('Unexpected schema');
const tracks={};
for(const name of ['東京','京都']){
 const t=payload.tracks[name];
 if(!t)continue;
 if(typeof t.sourceUrl!=='string'||!/^https:\/\/(www\.)?jra\.go\.jp\//.test(t.sourceUrl))continue;
 if(typeof t.observedAt!=='string'||!/^20\d{2}-\d\d-\d\d/.test(t.observedAt))continue;
 const numeric=['cushion','moistureFinish','moistureCorner'];
 const values=numeric.map(k=>t[k]);
 if(values.some(v=>v!==null&&v!==undefined&&(!Number.isFinite(v)||v<0||v>100)))continue;
 if(values.every(v=>v===null||v===undefined)&&!['良','稍重','重','不良'].includes(t.condition))continue;
 tracks[name]={...t};
}
if(!Object.keys(tracks).length){console.log('No verified observations; keep previous snapshot.');process.exit(0)}
const latestPath='data/latest.json';
let previous={schemaVersion:1,updatedAt:null,tracks:{}};
try{previous=JSON.parse(await readFile(latestPath,'utf8'))}catch{}
const merged={schemaVersion:1,updatedAt:new Date().toISOString(),tracks:{...previous.tracks,...tracks}};
await mkdir('data',{recursive:true});
await writeFile(latestPath,JSON.stringify(merged,null,2)+'\n');
for(const [name,t] of Object.entries(tracks)){
 const date=t.observedAt.slice(0,10);
 const dir='data/history/'+date;
 await mkdir(dir,{recursive:true});
 const path=dir+'/'+(name==='東京'?'tokyo':'kyoto')+'.json';
 // One file per observation day, latest verified reading for that day.
 await writeFile(path,JSON.stringify({track:name,...t,archivedAt:merged.updatedAt},null,2)+'\n');
}
console.log('Archived verified courses:',Object.keys(tracks).join(', '));
