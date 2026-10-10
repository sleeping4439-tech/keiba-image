const LOCATIONS = {東京:{lat:35.662,lon:139.485},京都:{lat:34.907,lon:135.725}};
const JRA_PAGES = ['index.html','index2.html','index3.html','index4.html'];
const BASE = 'https://www.jra.go.jp/keiba/baba/';
const HEADERS = {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'https://sleeping4439-tech.github.io','cache-control':'public, max-age=600'};
function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function textOnly(s){return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function freshJraUrl(url){const u=new URL(url);u.searchParams.set('_fresh',String(Date.now()));return u.toString();}
async function jraDiagnostic(){
 return Promise.all(JRA_PAGES.map(async path=>{
  const url=BASE+path;
  try{
   const response=await fetch(freshJraUrl(url));
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const title=textOnly((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
   const course=(title.match(/馬場情報[（(]([^）)]+?)競馬場[）)]/)||[])[1]||null;
   return {url,status:response.status,title,course};
  }catch(error){return {url,error:String(error)}}
 }));
}
async function weather(name){
 const p=LOCATIONS[name];
 const url='https://api.open-meteo.com/v1/forecast?latitude='+p.lat+'&longitude='+p.lon+'&current=wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=ms&timezone=Asia%2FTokyo';
 const res=await fetch(url);
 if(!res.ok)throw Error('Weather API '+res.status);
 const data=await res.json(),c=data.current;
 if(!c||!Number.isFinite(c.wind_speed_10m)||!Number.isFinite(c.wind_direction_10m))throw Error('Weather data invalid');
 return {speed:c.wind_speed_10m,direction:c.wind_direction_10m,weatherCode:c.weather_code,observedAt:c.time,source:'Open-Meteo',sourceUrl:'https://open-meteo.com/'};
}

function extractCondition(html,title,url){
 const course=(title.match(/馬場情報[（(]([^）)]+?)競馬場[）)]/)||[])[1];
 if(!['東京','京都'].includes(course))return null;
 const body=textOnly(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' '));
 const meeting=body.match(/第\d+回\s*(?:東京|京都)競馬\s*第\d+日(?:前日)?\s*[（(]\s*(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
 const heading=body.match(/馬場状態\s*[（(]\s*(\d{1,2})月\s*(\d{1,2})日/);
 if(!meeting||!heading)return null;
 const afterHeading=body.slice(body.indexOf(heading[0])+heading[0].length,body.indexOf(heading[0])+heading[0].length+220);
 if(!/現在/.test(afterHeading.slice(0,60)))return null;
 const weatherMatch=afterHeading.match(/天候\s*[：:]\s*(晴|曇|雨|雪|小雨|小雪)(?=\s|$)/);
 const meetingNumberMatch=meeting[0].match(/第(\d+)回/);
 const meetingDayMatch=meeting[0].match(/競馬\s*第(\d+)日/);
 // 「芝丈・使用コース・芝の様子」見出しの後にある「使用コース Aコース（…）」を読む。
 // 先頭の見出しと項目名が重複するため、後ろ側の項目から抽出する。
 const railSection=body.slice(body.indexOf('芝丈・使用コース・芝の様子'));
 const railMatch=railSection.match(/使用コース\s*([A-D])\s*コース(?=\s|[（(]|$)/);
 const turf=afterHeading.match(/(?:^|\s)芝\s*(良|稍重|重|不良)(?:\s|$)/);
 if(!turf)return null;
 const year=Number(meeting[1]),month=Number(heading[1]),day=Number(heading[2]);
 const meetingDate=new Date(Date.UTC(year,Number(meeting[2])-1,Number(meeting[3])));
 const observedDate=new Date(Date.UTC(year,month-1,day));
 if(observedDate.getUTCFullYear()!==year||observedDate.getUTCMonth()!==month-1||observedDate.getUTCDate()!==day)return null;
 if(observedDate.getTime()>meetingDate.getTime()||meetingDate.getTime()-observedDate.getTime()>14*86400000)return null;
 const observedAt=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 const m=turf;
 // The turf_line table is distinct from the dirt_line and the cushion reference scale.
 const turfRow=(html.match(/<tr\b[^>]*\bid=["']turf_line["'][^>]*>([\s\S]*?)<\/tr>/i)||[])[1]||'';
 const goal=(turfRow.match(/<td\b[^>]*class=["'][^"']*\bgm\b[^"']*["'][^>]*>\s*(\d{1,2}(?:\.\d+)?)\s*<\/td>/i)||[])[1];
 const corner=(turfRow.match(/<td\b[^>]*class=["'][^"']*\bc4\b[^"']*["'][^>]*>\s*(\d{1,2}(?:\.\d+)?)\s*<\/td>/i)||[])[1];
 const moistureFinish=goal!==undefined?Number(goal):null;
 const moistureCorner=corner!==undefined?Number(corner):null;
 const validMoisture=moistureFinish!==null&&moistureCorner!==null&&moistureFinish>=0&&moistureFinish<=100&&moistureCorner>=0&&moistureCorner<=100;
 return {course,condition:m[1],observedAt,sourceUrl:url,cushion:null,meetingNumber:meetingNumberMatch?Number(meetingNumberMatch[1]):null,meetingDay:meetingDayMatch?Number(meetingDayMatch[1]):null,weather:weatherMatch?weatherMatch[1]:null,rail:railMatch?railMatch[1]:null,railDay:null,
  moistureFinish:validMoisture?moistureFinish:null,moistureCorner:validMoisture?moistureCorner:null,
  moistureMeasuredAt:null,
  note:validMoisture?'芝含水率はJRA芝専用表から取得。測定時刻は未確認':'馬場状態のみ取得。含水率・クッション値の測定時刻は未確認'};
}

// 2026年秋開催のJRA公式「馬場概要」に基づく芝コース使用計画。
// 同じコースを開催をまたいで使用する場合は日数を継続して数える。
// 当日公表の使用コースと計画が一致する場合に限り使用日数を表示する。
const RAIL_SCHEDULE_2026={
 東京:{4:[['A',9],['B',2]],5:[['B',4],['C',5]]},
 京都:{4:[['A',9],['B',2]],5:[['B',4],['C',4]]}
};
function officialRailDay(course,year,meetingNumber,meetingDay,rail){
 if(year!==2026||!RAIL_SCHEDULE_2026[course]||!Number.isInteger(meetingNumber)||!Number.isInteger(meetingDay)||!rail)return null;
 const meetings=RAIL_SCHEDULE_2026[course];
 let previousRail=null,consecutive=0;
 for(const number of [4,5]){
  const segments=meetings[number];
  let day=0;
  for(const [segmentRail,length] of segments){
   if(previousRail!==segmentRail)consecutive=0;
   for(let i=0;i<length;i++){
    day++;
    consecutive++;
    if(number===meetingNumber&&day===meetingDay)return rail===segmentRail?consecutive:null;
   }
   previousRail=segmentRail;
  }
 }
 return null;
}
function measuredDate(raw,year){
 const m=raw.match(/(\d{1,2})月(\d{1,2})日(?:[（(][^）)]*[）)])?\s*(\d{1,2})時(\d{1,2})分/);
 if(!m)return null;
 const [month,day,hour,minute]=m.slice(1).map(Number);
 if(hour>23||minute>59)return null;
 const d=new Date(Date.UTC(year,month-1,day));
 if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return null;
 return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00+09:00';
}
function extractSourceMeasurements(html,course,year,type,conditionDate){
 const id=course==='東京'?'rcA':course==='京都'?'rcB':null;
 if(!id)return null;
 const region=(html.match(new RegExp('<div\\b[^>]*\\bid=["\\x27]'+id+'["\\x27][^>]*>([\\s\\S]*?)(?=<div\\b[^>]*\\bid=["\\x27]rc[A-Z]["\\x27]|$)','i'))||[])[1]||'';
 const units=[...region.matchAll(/<div\s+class=["']unit["']\s*>([\s\S]*?)(?=<div\s+class=["']unit["']|$)/gi)];
 const entries=[];
 for(const unit of units){
  const raw=(unit[1].match(/<div\s+class=["']time["']\s*>([^<]+)<\/div>/i)||[])[1]||'';
  const time=measuredDate(raw,year);
  if(!time||time.slice(0,10)>conditionDate)continue;
  if(type==='cushion'){
   const v=(unit[1].match(/<div\s+class=["']cushion["']\s*>(\d{1,2}(?:\.\d+)?)<\/div>/i)||[])[1];
   if(v===undefined)continue;
   const cushion=Number(v);
   if(cushion>=0&&cushion<=30)entries.push({time,cushion});
  }else{
   const turf=(unit[1].match(/<div\s+class=["']turf["']\s*>([\s\S]*?)<\/div>/i)||[])[1]||'';
   const g=(turf.match(/<span\s+class=["']mg["'][^>]*>(\d{1,2}(?:\.\d+)?)<\/span>/i)||[])[1];
   const c=(turf.match(/<span\s+class=["']m4c["'][^>]*>(\d{1,2}(?:\.\d+)?)<\/span>/i)||[])[1];
   if(g===undefined||c===undefined)continue;
   const finish=Number(g),corner=Number(c);
   if(finish<=100&&corner<=100)entries.push({time,finish,corner});
  }
 }
 entries.sort((a,b)=>b.time.localeCompare(a.time));
 return entries[0]||null;
}
async function jraVerified(){
 const pages=await jraDiagnostic();
 const [cushionResult,moistResult]=await Promise.allSettled(['_data_cushion.html','_data_moist.html'].map(async file=>{
  const res=await fetch(freshJraUrl(BASE+file));
  if(!res.ok)throw Error(file+' HTTP '+res.status);
  return new TextDecoder('shift_jis').decode(await res.arrayBuffer());
 }));
 const cushionHTML=cushionResult.status==='fulfilled'?cushionResult.value:null;
 const moistHTML=moistResult.status==='fulfilled'?moistResult.value:null;
 const tracks={};
 for(const page of pages){
  if(!['東京','京都'].includes(page.course)||page.status!==200)continue;
  try{
   const response=await fetch(freshJraUrl(page.url));
   if(!response.ok)continue;
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const x=extractCondition(html,page.title,page.url);
   if(!x)continue;
   const year=Number(x.observedAt.slice(0,4));
   const meetingDate=(textOnly(html).match(/第\d+回\s*(?:東京|京都)競馬\s*第\d+日\s*[（(]\s*20\d{2}年\s*(\d{1,2})月\s*(\d{1,2})日/)||[]);
   const measurementLimit=meetingDate.length?year+'-'+String(Number(meetingDate[1])).padStart(2,'0')+'-'+String(Number(meetingDate[2])).padStart(2,'0'):x.observedAt;
   const c=cushionHTML?extractSourceMeasurements(cushionHTML,x.course,year,'cushion',measurementLimit):null;
   const m=moistHTML?extractSourceMeasurements(moistHTML,x.course,year,'moist',measurementLimit):null;
   x.railDay=officialRailDay(x.course,year,x.meetingNumber,x.meetingDay,x.rail);
   x.cushion=c?.cushion??null;
   x.cushionMeasuredAt=c?.time??null;
   if(m){
    x.moistureFinish=m.finish;
    x.moistureCorner=m.corner;
    x.moistureMeasuredAt=m.time;
   }else{
    // Do not label a value as measured without its measurement time.
    x.moistureFinish=null;
    x.moistureCorner=null;
    x.moistureMeasuredAt=null;
   }
   x.conditionObservedAt=x.observedAt;
   // The UI date refers to the latest fully verified turf measurements, not the condition bulletin.
   const cushionDay=x.cushionMeasuredAt?.slice(0,10);
   const moistureDay=x.moistureMeasuredAt?.slice(0,10);
   if(cushionDay&&moistureDay&&cushionDay===moistureDay&&cushionDay>x.observedAt&&cushionDay<=measurementLimit)x.observedAt=cushionDay;
   x.note='表示日は芝クッション値・含水率の共通測定日。馬場状態の発表日はconditionObservedAt。';
   if(!tracks[x.course]||tracks[x.course].observedAt<x.observedAt)tracks[x.course]=x;
  }catch{}
 }
 return tracks;
}

export default {async fetch(request){
 const url=new URL(request.url);
 const path=url.pathname;
 if(path==='/health')return new Response(JSON.stringify({ok:true,version:19,build:'turf-measurement-date-fix-20261010',racesFix:'http-diagnostics'}),{headers:{...HEADERS,'cache-control':'no-store, max-age=0'}});
 if(path==='/diagnostics')return respond({checkedAt:new Date().toISOString(),jra:await jraDiagnostic()});

 if(path==='/freshness-diagnostics'){
  const targets=['index.html','index2.html','_data_cushion.html','_data_moist.html'];
  const origins=['https://www.jra.go.jp/keiba/baba/','https://jra.jp/keiba/baba/'];
  const results=await Promise.all(origins.flatMap(origin=>targets.map(async file=>{
   const sourceUrl=origin+file;
   try{
    const res=await fetch(freshJraUrl(sourceUrl),{headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
    const html=new TextDecoder('shift_jis').decode(await res.arrayBuffer());
    const body=textOnly(html);
    const dates=[...body.matchAll(/(?:10月(?:9|10)日|2026年10月10日)[^。]{0,60}/g)].slice(0,8).map(m=>m[0]);
    const measured=[...html.matchAll(/(?:10月(?:9|10)日|10\/10|10\/9)[^<]{0,70}/g)].slice(0,12).map(m=>m[0]);
    return {sourceUrl,status:res.status,finalUrl:res.url,bytes:html.length,etag:res.headers.get('etag'),lastModified:res.headers.get('last-modified'),dates,measured};
   }catch(error){return {sourceUrl,error:String(error)}}
  })));
  return new Response(JSON.stringify({checkedAt:new Date().toISOString(),results}),{headers:{...HEADERS,'cache-control':'no-store'}});
 }
 if(path==='/parse-diagnostics'){
  const results=[];
  const sourcePages=await jraDiagnostic();
  for(const p of sourcePages){
   if(!['東京','京都'].includes(p.course)||p.status!==200){results.push({url:p.url,status:p.status??null,course:p.course??null,error:p.error??'ページを解析対象として認識できませんでした'});continue;}
   try{
    const res=await fetch(freshJraUrl(p.url));
    if(!res.ok){results.push({course:p.course,url:p.url,status:res.status,error:'本文の取得に失敗'});continue;}
    const html=new TextDecoder('shift_jis').decode(await res.arrayBuffer());
    const body=textOnly(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' '));
    const at=body.indexOf('馬場状態');
    const mt=body.search(/第\d+回/);
    results.push({course:p.course,title:p.title,meetingExcerpt:mt<0?null:body.slice(mt,mt+130),conditionExcerpt:at<0?null:body.slice(at,at+220),parsed:extractCondition(html,p.title,p.url)});
   }catch(error){results.push({course:p.course,error:String(error)})}
  }
  return respond({checkedAt:new Date().toISOString(),results});
 }

 if(path==='/measurement-diagnostics'){
  const results=[];
  for(const p of await jraDiagnostic()){
   if(!['東京','京都'].includes(p.course)||p.status!==200)continue;
   try{
    const response=await fetch(p.url);
    const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
    const body=textOnly(html);
    const markers=['芝のクッション値','クッション値','含水率','ゴール前と4コーナーの含水率'];
    const excerpts={};
    for(const marker of markers){
     const positions=[];
     let offset=0;
     while(positions.length<3){
      const i=body.indexOf(marker,offset);
      if(i<0)break;
      positions.push(body.slice(Math.max(0,i-70),i+400));
      offset=i+marker.length;
     }
     excerpts[marker]=positions;
    }
    const selects=[...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].slice(0,8).map(m=>({html:m[0].slice(0,1800),text:textOnly(m[0]).slice(0,500)}));
    const scriptSources=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].slice(0,25).map(m=>m[1]);
    const moistureTables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].filter(m=>/ゴール前|4コーナー/.test(textOnly(m[0]))).slice(0,3).map(m=>({text:textOnly(m[0]).slice(0,700),html:m[0].slice(0,2200)}));
    results.push({course:p.course,url:p.url,excerpts,selects,scriptSources,moistureTables});
   }catch(error){results.push({course:p.course,error:String(error)})}
  }
  return respond({checkedAt:new Date().toISOString(),results,note:'Diagnostic excerpts only; no measurements inferred from reference scales'});
 }
 if(path==='/script-diagnostics'){
  const urls=[BASE+'_js/baba2025.js',BASE+'_js/common.js'];
  const results=await Promise.all(urls.map(async url=>{
   try{
    const res=await fetch(url);
    const raw=await res.arrayBuffer();
    const js=new TextDecoder('utf-8').decode(raw);
    const terms=['cushion_list','moist_list','ajax','fetch(','json','cushion','moist','csv'];
    const excerpts={};
    for(const term of terms){
     const positions=[];let offset=0;
     while(positions.length<5){
      const at=js.toLowerCase().indexOf(term.toLowerCase(),offset);
      if(at<0)break;
      positions.push(js.slice(Math.max(0,at-240),Math.min(js.length,at+420)));
      offset=at+term.length;
     }
     excerpts[term]=positions;
    }
    const paths=[...new Set([...js.matchAll(/["']([^"' ]{1,200}\.(?:json|csv|xml|php|js)(?:\?[^"']*)?)["']/gi)].map(m=>m[1]))].slice(0,60);
    return {url,status:res.status,length:js.length,excerpts,paths};
   }catch(error){return {url,error:String(error)}}
  }));
  return respond({checkedAt:new Date().toISOString(),results});
 }
 if(path==='/source-data-diagnostics'){
  const filenames=['_data_cushion.html','_data_moist.html'];
  const results=await Promise.all(filenames.map(async filename=>{
   const url=BASE+filename;
   try{
    const res=await fetch(url);
    const html=new TextDecoder('shift_jis').decode(await res.arrayBuffer());
    const sections=[];
    for(const course of ['東京','京都']){
     const candidates=[...html.matchAll(new RegExp('<(?:div|section|li)\\b[^>]*\\bid=["\\x27]([^"\\x27]+)["\\x27][^>]*>[\\s\\S]{0,1800}','gi'))].filter(m=>m[0].includes(course)).slice(0,3);
     sections.push({course,samples:candidates.map(m=>({id:m[1],html:m[0].slice(0,1400)}))});
    }
    return {url,status:res.status,length:html.length,head:html.slice(0,3500),sections};
   }catch(error){return {url,error:String(error)}}
  }));
  return respond({checkedAt:new Date().toISOString(),results});
 }
 if(path==='/races'){
 try {
  const date=new URL(request.url).searchParams.get('date');
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date||''))return respond({error:'invalid_date'},400);
  const [year,month,day]=date.split('-');
  const sourceUrl='https://www.jra.go.jp/keiba/calendar'+year+'/'+year+'/'+month+'/'+month+day+'.html';
  try{
   const response=await fetch(sourceUrl);
   if(!response.ok)return respond({date,sourceUrl,races:[],available:false,diagnostics:{stage:'fetch',httpStatus:response.status,finalUrl:response.url}},200);
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const stripped=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
   const tables=[...stripped.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
   const races=[];
   const diagnostics=[];
   for(const t of tables){
    const trs=[...t[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    const parsed=trs.map(tr=>[...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>textOnly(m[1])));
    const valid=parsed.filter(c=>/^\s*(?:[1-9]|1[0-2])\s*(?:レース|R)\s*$/.test(c[0]||'')&&c.length>=3);
    if(!valid.length)continue;
    const before=stripped.slice(Math.max(0,t.index-3000),t.index);
    const match=[...before.matchAll(/(?:東京|京都)競馬場|\d+回(?:東京|京都)\d+日/g)].pop()?.[0]||'';
    diagnostics.push({heading:match,rows:valid.length});
    const track=match.includes('東京')?'東京':match.includes('京都')?'京都':null;
    for(const c of valid){
     const number=Number(c[0].match(/\d+/)[0]);
     const description=c.slice(1,-1).join(' ').replace(/\s+/g,' ').trim();
     const time=c.at(-1).match(/\d{1,2}時\d{2}分|\d{1,2}:\d{2}/)?.[0]||'';
     const distance=description.match(/([1-9],?\d{3})\s*[（(]\s*(芝|ダ)/);
     races.push({track,number,name:description,time,surface:distance?.[2]==='芝'?'芝':distance?.[2]==='ダ'?'ダート':'',distance:distance?Number(distance[1].replace(',','')):null});
    }
   }
   // The official calendar orders Tokyo before Kyoto on the target weekend.
   if(races.length&&!races.some(x=>x.track==='東京')&&!races.some(x=>x.track==='京都')){
    let group=-1,prev=12;
    for(const race of races){if(race.number<=prev){group++}race.track=group===0?'東京':group===1?'京都':null;prev=race.number}
   }
   return respond({date,sourceUrl,source:'JRA競馬番組（予定）',races,available:races.length>0,notice:'正式な出馬表ではありません。変更の可能性があります。',diagnostics:{tables:tables.length,candidates:diagnostics}});
  }catch(error){return respond({date,sourceUrl,races:[],available:false,diagnostics:{stage:'fetch-or-parse',error:String(error)}})}
 } catch(error){return respond({ok:false,endpoint:'races',error:String(error),hint:'Worker race handler error'},200)}
 }
 if(path==='/weekly'){
  const freshHeaders={'content-type':'application/json; charset=utf-8','access-control-allow-origin':'https://sleeping4439-tech.github.io','cache-control':'no-store, max-age=0'};
  const results=new Map();
  await Promise.all(JRA_PAGES.map(async file=>{
   const url=BASE+file+'?refresh='+Date.now();
   let track;
   try{
    const response=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)return;
    const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
    const title=textOnly((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
    track=(title.match(/馬場情報[（(]([^）)]+?)競馬場[）)]/)||[])[1];
    if(!['東京','京都'].includes(track))return;
    const section=html.match(/週間情報[\s\S]{0,2000}?(<table\b[\s\S]*?<\/table>)/i);
    const table=section?.[1]||'';
    const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>textOnly(c[1].replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi,'$1'))));
    const body=textOnly(html);
    const notesStart=body.indexOf('週間情報'),notesEnd=body.indexOf('芝丈・使用コース・芝の様子',notesStart);
    const notesText=notesStart>=0?body.slice(notesStart,notesEnd>notesStart?notesEnd:notesStart+1500):'';
    const updates=[...notesText.matchAll(/(\d{1,2}月\d{1,2}日)\s*(芝コース|ダートコース)\s*([^。]{5,180}。)/g)].slice(0,12).map(m=>({date:m[1],course:m[2],text:m[3]}));
    results.set(track,{sourceUrl:BASE+file,heading:(body.match(/第\d+回\s*[^ ]*?競馬\s*第\d+日[（(][^)）]+[)）]/)||[])[0]||null,rows,updates,available:rows.length>0});
   }catch(error){if(track)results.set(track,{sourceUrl:url,available:false,error:'取得に失敗しました'})}
  }));
  return new Response(JSON.stringify({source:'JRA',updatedAt:new Date().toISOString(),tracks:Object.fromEntries(results)}),{headers:freshHeaders});
 }
 if(path==='/weather'){
  const result={updatedAt:new Date().toISOString(),tracks:{}};
  await Promise.all(Object.keys(LOCATIONS).map(async name=>{
   try{result.tracks[name]=await weather(name)}catch(error){result.tracks[name]={error:String(error)}}
  }));
  return respond(result);
 }
 if(path==='/'||path==='/latest'){
 const tracks=await jraVerified();
 const complete=['東京','京都'].every(name=>{const x=tracks[name];return x&&['良','稍重','重','不良'].includes(x.condition)&&Number.isFinite(x.cushion)&&Number.isFinite(x.moistureFinish)&&Number.isFinite(x.moistureCorner)&&typeof x.cushionMeasuredAt==='string'&&typeof x.moistureMeasuredAt==='string'});
 const status=complete?'complete':Object.keys(tracks).length?'partial':'unavailable';
 return new Response(JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),tracks,status,reason:complete?'東京・京都の芝馬場状態・クッション値・含水率・測定時刻を取得':status==='partial'?'一部データ未取得':'公式データを取得できませんでした'}),{headers:{...HEADERS,'cache-control':'no-store, max-age=0'}});
}
 return respond({ok:false,error:'not_found'},404);
}};
