import {mkdir,readFile,writeFile} from 'node:fs/promises';
const endpoint=process.env.WORKER_URL;
if(!endpoint)throw Error('WORKER_URL missing');
const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});
if(!response.ok)throw Error('HTTP '+response.status);
const data=await response.json();
if(data.schemaVersion!==1||!data.tracks||typeof data.tracks!=='object')throw Error('invalid schema');
const verified={};
for(const name of ['東京','京都']){
 const x=data.tracks[name];
 if(!x||!/^https:\/\/www\.jra\.go\.jp\//.test(x.sourceUrl||'')||!/^20\d\d-\d\d-\d\d/.test(x.observedAt||''))continue;
 if(!['良','稍重','重','不良'].includes(x.condition))continue;
 if(!['cushion','moistureFinish','moistureCorner'].every(k=>x[k]==null||(typeof x[k]==='number'&&Number.isFinite(x[k])&&x[k]>=0&&x[k]<=100)))continue;
 verified[name]=x;
}
if(!Object.keys(verified).length){console.log('No verified data');process.exit(0)}
let prev={schemaVersion:1,tracks:{}};
try{prev=JSON.parse(await readFile('data/latest.json','utf8'))}catch{}
for(const [name,x] of Object.entries(verified)){
 if(prev.tracks[name]?.observedAt&&Date.parse(prev.tracks[name].observedAt)>Date.parse(x.observedAt)){delete verified[name];continue}
 const dir='data/history/'+x.observedAt.slice(0,10);await mkdir(dir,{recursive:true});
 await writeFile(dir+'/'+(name==='東京'?'tokyo':'kyoto')+'.json',JSON.stringify(x,null,2)+'\n');
}
if(Object.keys(verified).length)await writeFile('data/latest.json',JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),tracks:{...prev.tracks,...verified}},null,2)+'\n');
