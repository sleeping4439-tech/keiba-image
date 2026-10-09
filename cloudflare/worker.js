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
export default {async fetch(request){
 const path=new URL(request.url).pathname;
 if(path==='/health')return respond({ok:true,version:5});
 if(path==='/diagnostics')return respond({checkedAt:new Date().toISOString(),jra:await jraDiagnostic()});
 if(path==='/weather'){
  const result={updatedAt:new Date().toISOString(),tracks:{}};
  await Promise.all(Object.keys(LOCATIONS).map(async name=>{
   try{result.tracks[name]=await weather(name)}catch(error){result.tracks[name]={error:String(error)}}
  }));
  return respond(result);
 }
 if(path==='/'||path==='/latest')return respond({schemaVersion:1,updatedAt:null,tracks:{},status:'unavailable',reason:'JRA実測値は検証完了まで未公開'});
 return respond({ok:false,error:'not_found'},404);
}};
