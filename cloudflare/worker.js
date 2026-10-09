const LOCATIONS = {東京:{lat:35.662,lon:139.485},京都:{lat:34.907,lon:135.725}};
const JRA_PAGES = ['index.html','index2.html','index3.html','index4.html'];
const BASE = 'https://www.jra.go.jp/keiba/baba/';
const HEADERS = {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'https://sleeping4439-tech.github.io','cache-control':'public, max-age=600'};
function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS});}
function textOnly(s){return s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
async function jraDiagnostic(){
 return Promise.all(JRA_PAGES.map(async path=>{
  const url=BASE+path;
  try{
   const response=await fetch(url);
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
 const turf=afterHeading.match(/(?:^|\s)芝\s*(良|稍重|重|不良)(?:\s|$)/);
 if(!turf)return null;
 const year=Number(meeting[1]),month=Number(heading[1]),day=Number(heading[2]);
 const meetingDate=new Date(Date.UTC(year,Number(meeting[2])-1,Number(meeting[3])));
 const observedDate=new Date(Date.UTC(year,month-1,day));
 if(observedDate.getUTCFullYear()!==year||observedDate.getUTCMonth()!==month-1||observedDate.getUTCDate()!==day)return null;
 if(observedDate.getTime()>meetingDate.getTime()||meetingDate.getTime()-observedDate.getTime()>14*86400000)return null;
 const observedAt=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 const m=turf;
 return {course,condition:m[1],observedAt,sourceUrl:url,cushion:null,moistureFinish:null,moistureCorner:null,
  note:'馬場状態のみ取得。クッション値・含水率の測定時刻は未確認'};
}
async function jraVerified(){
 const pages=await jraDiagnostic();
 const tracks={};
 for(const page of pages){
  if(!page.course||!['東京','京都'].includes(page.course)||page.status!==200)continue;
  try{
   const response=await fetch(page.url);
   if(!response.ok)continue;
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const x=extractCondition(html,page.title,page.url);
   if(x&&(!tracks[x.course]||tracks[x.course].observedAt<x.observedAt))tracks[x.course]=x;
  }catch{}
 }
 return tracks;
}

export default {async fetch(request){
 const path=new URL(request.url).pathname;
 if(path==='/health')return respond({ok:true,version:5});
 if(path==='/diagnostics')return respond({checkedAt:new Date().toISOString(),jra:await jraDiagnostic()});

 if(path==='/parse-diagnostics'){
  const results=[];
  for(const p of await jraDiagnostic()){
   if(!['東京','京都'].includes(p.course)||p.status!==200)continue;
   try{
    const res=await fetch(p.url);
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
    const selects=[...html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/gi)].slice(0,8).map(m=>textOnly(m[0]).slice(0,400));
    results.push({course:p.course,url:p.url,excerpts,selects});
   }catch(error){results.push({course:p.course,error:String(error)})}
  }
  return respond({checkedAt:new Date().toISOString(),results,note:'Diagnostic excerpts only; no measurements inferred from reference scales'});
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
 return respond({schemaVersion:1,updatedAt:new Date().toISOString(),tracks,status:Object.keys(tracks).length?'partial':'unavailable',reason:'馬場状態のみ検証対象。クッション値と含水率は未取得'});
}
 return respond({ok:false,error:'not_found'},404);
}};
