import {mkdir,readFile,writeFile} from 'node:fs/promises';
const endpoint=process.env.WORKER_URL;
if(!endpoint||!/^https:\/\//.test(endpoint))throw Error('HTTPS WORKER_URL required');
const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});
if(!response.ok)throw Error('Worker HTTP '+response.status);
const data=await response.json();
if(data.schemaVersion!==1||!data.tracks||typeof data.tracks!=='object')throw Error('Unexpected Worker schema');
const verified={};
const todayJST=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for(const name of ['東京','京都']){
 const x=data.tracks[name];
 if(!x||x.course!==name||!/^https:\/\/www\.jra\.go\.jp\/keiba\/baba\//.test(x.sourceUrl||''))continue;
 if(!/^20\d\d-\d\d-\d\d$/.test(x.observedAt||'')||x.observedAt>todayJST)continue;
 const d=new Date(x.observedAt+'T00:00:00Z');
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==x.observedAt)continue;
 if(!['良','稍重','重','不良'].includes(x.condition))continue;
 if(!['cushion','moistureFinish','moistureCorner'].every(k=>x[k]==null||(typeof x[k]==='number'&&Number.isFinite(x[k])&&x[k]>=0&&x[k]<=100)))continue;
 verified[name]=x;
}
if(!Object.keys(verified).length){console.log('No verified observations.');process.exit(0)}
let prev={schemaVersion:1,tracks:{}};
try{prev=JSON.parse(await readFile('data/latest.json','utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
const updates={};
for(const [name,x] of Object.entries(verified)){
 const old=prev.tracks?.[name];
 if(old?.observedAt&&old.observedAt>x.observedAt)continue;
 if(old?.observedAt===x.observedAt&&JSON.stringify(old)===JSON.stringify(x))continue;
 updates[name]=x;
}
if(!Object.keys(updates).length){console.log('No new verified observations.');process.exit(0)}
await mkdir('data',{recursive:true});
const updatedAt=new Date().toISOString();
for(const [name,x] of Object.entries(updates)){
 const dir='data/history/'+x.observedAt;
 await mkdir(dir,{recursive:true});
 await writeFile(dir+'/'+(name==='東京'?'tokyo':'kyoto')+'.json',JSON.stringify({track:name,...x,archivedAt:updatedAt},null,2)+'\n');
}
await writeFile('data/latest.json',JSON.stringify({schemaVersion:1,updatedAt,tracks:{...prev.tracks,...updates}},null,2)+'\n');
console.log('Archived:',Object.keys(updates).join(', '));
