// GitHub-to-Cloudflare auto-deploy smoke test: 2026-10-14. No runtime behavior change.
const LOCATIONS = {札幌:{lat:43.076,lon:141.375},函館:{lat:41.824,lon:140.765},福島:{lat:37.772,lon:140.48},新潟:{lat:37.949,lon:139.186},東京:{lat:35.662,lon:139.485},中山:{lat:35.726,lon:139.963},中京:{lat:35.069,lon:136.983},京都:{lat:34.907,lon:135.725},阪神:{lat:34.781,lon:135.364},小倉:{lat:33.843,lon:130.877}};
const ALL_JRA_TRACKS=Object.keys(LOCATIONS);

// Official JRA entry-page links independently verified for October 10-12.
// Never infer an entry page URL from a race number.
const VERIFIED_ENTRY_CODES={'2026-10-17|東京|7':'pw01dde0105202604060720261017/0E','2026-10-17|京都|2':'pw01dde0108202604060220261017/63','2026-10-17|新潟|6':'pw01dde0104202604010620261017/D0','2026-10-18|東京|3':'pw01dde0105202604070320261018/6A','2026-10-18|京都|5':'pw01dde0108202604070520261018/B2','2026-10-18|新潟|7':'pw01dde0104202604020720261018/B5','2026-10-12|京都|11':'pw01dde0108202604051120261012/DC','2026-10-11|京都|11':'pw01dde1008202604041120261011/8B','2026-10-10|京都|11':'pw01dde0108202604031120261010/7C','2026-10-11|東京|11':'pw01dde0105202604041120261011/CE','2026-10-10|東京|11':'pw01dde1005202604031120261010/7D','2026-10-12|東京|11':'pw01dde0105202604051120261012/FE','2026-10-10|京都|4':'pw01dde0108202604030420261010/49','2026-10-10|京都|1':'pw01dde0108202604030120261010/2A','2026-10-12|京都|4':'pw01dde0108202604050420261012/A9','2026-10-12|京都|6':'pw01dde0108202604050620261012/13','2026-10-12|京都|7':'pw01dde0108202604050720261012/C8','2026-10-10|東京|1':'pw01dde1005202604030120261010/2B','2026-10-10|東京|12':'pw01dde0105202604031220261010/53','2026-10-11|東京|12':'pw01dde0105202604041220261011/83','2026-10-12|京都|1':'pw01dde0108202604050120261012/8A','2026-10-12|京都|2':'pw01dde0108202604050220261012/3F','2026-10-12|京都|10':'pw01dde0108202604051020261012/27','2026-10-12|京都|12':'pw01dde0108202604051220261012/91','2026-10-12|東京|5':'pw01dde0105202604050520261012/80','2026-10-12|東京|12':'pw01dde0105202604051220261012/B3','2026-10-11|京都|1':'pw01dde0108202604040120261011/5A','2026-10-11|京都|2':'pw01dde0108202604040220261011/0F','2026-10-11|京都|3':'pw01dde0108202604040320261011/C4','2026-10-11|京都|5':'pw01dde0108202604040520261011/2E','2026-10-11|京都|6':'pw01dde0108202604040620261011/E3','2026-10-11|京都|7':'pw01dde0108202604040720261011/98','2026-10-11|京都|9':'pw01dde0108202604040920261011/02','2026-10-11|京都|12':'pw01dde0108202604041220261011/61','2026-10-10|京都|12':'pw01dde0108202604031220261010/31'};

// Result URLs are opaque: use only JRA-published CNAMEs, never guess their checksums.
const VERIFIED_RESULT_CODES={
 '2022-10-15|東京|2':'pw01sde1005202204040220221015/A4',
 '2022-10-15|東京|3':'pw01sde1005202204040320221015/59',
 '2022-10-15|東京|5':'pw01sde1005202204040520221015/C3',
 '2022-10-16|東京|12':'pw01sde0105202204051220221016/47',
 '2021-10-16|東京|7':'pw01sde1005202104030720211016/70',
 '2024-10-12|京都|9':'pw01sde1008202405030920241012/0A',
 '2024-10-06|京都|11':'pw01sde1008202405021120241006/DB',
 '2023-10-09|京都|11':'pw01sde1008202302031120231009/EB',
 '2023-10-07|東京|11':'pw01sde1005202304011120231007/0F',
 '2023-10-07|京都|7':'pw01sde0108202302010720231007/98',
 '2025-10-18|東京|2':'pw01sde0105202504060220251018/F7',
 '2025-10-18|東京|3':'pw01sde0105202504060320251018/AC',
 '2025-10-18|東京|4':'pw01sde0105202504060420251018/61',
 '2025-10-18|東京|5':'pw01sde0105202504060520251018/16',
 '2025-10-18|東京|6':'pw01sde0105202504060620251018/CB',
 '2025-10-18|東京|7':'pw01sde1005202504060720251018/5F',
 '2025-10-18|東京|8':'pw01sde0105202504060820251018/35',
 '2025-10-18|東京|9':'pw01sde0105202504060920251018/EA',
 '2025-10-18|東京|10':'pw01sde0105202504061020251018/DF',
 '2025-10-18|東京|11':'pw01sde0105202504061120251018/94',
 '2025-10-18|東京|12':'pw01sde0105202504061220251018/49',
 '2025-10-18|京都|2':'pw01sde0108202503060220251018/A4',
 '2025-10-18|京都|3':'pw01sde0108202503060320251018/59',
 '2025-10-18|京都|5':'pw01sde0108202503060520251018/C3',
 '2025-10-18|京都|6':'pw01sde0108202503060620251018/78',
 '2025-10-18|京都|7':'pw01sde0108202503060720251018/2D',
 '2025-10-18|京都|9':'pw01sde1008202503060920251018/76',
 '2025-10-18|京都|10':'pw01sde0108202503061020251018/8C',
 '2025-10-18|京都|11':'pw01sde1008202503061120251018/20',
 '2025-10-18|京都|12':'pw01sde1008202503061220251018/D5',
 '2025-10-18|新潟|1':'pw01sde0104202504010120251018/B9',
 '2025-10-18|新潟|2':'pw01sde0104202504010220251018/6E',
 '2025-10-18|新潟|3':'pw01sde0104202504010320251018/23',
 '2025-10-18|新潟|4':'pw01sde0104202504010420251018/D8',
 '2025-10-18|新潟|5':'pw01sde1004202504010520251018/6C',
 '2025-10-18|新潟|6':'pw01sde0104202504010620251018/42',
 '2025-10-18|新潟|7':'pw01sde0104202504010720251018/F7',
 '2025-10-18|新潟|8':'pw01sde0104202504010820251018/AC',
 '2025-10-18|新潟|9':'pw01sde0104202504010920251018/61',
 '2025-10-18|新潟|10':'pw01sde1004202504011020251018/35',
 '2025-10-18|新潟|11':'pw01sde0104202504011120251018/0B',
 '2025-10-18|新潟|12':'pw01sde0104202504011220251018/C0',
 '2026-10-12|東京|6':'pw01sde1005202604050620261012/D0',
 '2026-10-12|東京|12':'pw01sde0105202604051220261012/6F',
 '2026-10-03|東京|1':'pw01sde1005202604010120261003/DE',
 '2026-10-03|東京|7':'pw01sde1005202604010720261003/1C',
 '2026-06-07|東京|1':'pw01sde1005202603020120260607/DE'
};
const JRA_VENUES={札幌:'01',函館:'02',福島:'03',新潟:'04',東京:'05',中山:'06',中京:'07',京都:'08',阪神:'09',小倉:'10'};
function resultCodeInfo(code){
 const m=code.match(/^pw01sde\d{2}(\d{2})(\d{4})\d{2}\d{2}(\d{2})(\d{8})\/[0-9a-f]{2}$/i);
 return m?{venue:m[1],year:m[2],number:Number(m[3]),date:m[4]}:null;
}
function resultCodesInHtml(html){
 const codes=new Set();
 for(const m of html.matchAll(/pw01sde\d{2}\d{2}\d{4}\d{2}\d{2}\d{2}\d{8}(?:\/|%2F)[0-9a-f]{2}/gi)){
  const code=m[0].replace(/%2F/i,'/');
  if(resultCodeInfo(code))codes.add(code);
 }
 return [...codes];
}
function parseOfficialLap(html,code,track,date){
 const info=resultCodeInfo(code);
 if(!info||info.venue!==JRA_VENUES[track]||info.date!==date.replace(/-/g,''))return null;
 const plain=textOnly(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/&nbsp;|&#160;/gi,' '));
 const course=plain.match(/コース\s*[：:]?\s*([\d,，]+)\s*メートル\s*[（(]\s*(芝|ダート|障害)/)
  ||plain.match(/(?:コース\s*[：:]?\s*)?(芝|ダート|障害)(?:[・･／/]\s*(?:左|右|直線|外|内))*\s*([\d,，]+)\s*メートル/)
  ||plain.match(/(?:コース\s*[：:]?\s*)?(芝|ダート|障害)\s*[\(（][^）)]{0,40}[\)）]\s*([\d,，]+)\s*メートル/);
 const courseSurface=/^\d/.test(course?.[1]||'')?course?.[2]:course?.[1];
 const courseDistance=/^\d/.test(course?.[1]||'')?course?.[1]:course?.[2];
 if(!course)return null;
 const distance=Number(courseDistance.replace(/[,，]/g,''));
 const surface=courseSurface;
 if(surface!=='芝'||distance<1000||distance>4000)return null;
 const at=plain.indexOf('ハロンタイム');
 if(at<0)return null;
 const section=plain.slice(at+6,at+420).split(/上り|コーナー通過順位|払戻金/)[0];
 const match=section.match(/\d{1,2}\.\d(?:\s*[-－ー−]\s*\d{1,2}\.\d)+/)
  ||section.match(/\d{1,2}\.\d(?:\s+\d{1,2}\.\d){4,}/);
 if(!match)return null;
 const laps=(match[0].match(/\d{1,2}\.\d/g)||[]).map(Number);
 if(laps.length!==Math.ceil(distance/200)||laps.some(x=>x<7||x>30))return null;
 const title=(plain.match(/(?:\d{1,2}レース)\s+(.{2,70}?)\s+(?:\d歳|障害|コース)/)||[])[1]||'';
 const winningSeconds=Number(laps.reduce((a,b)=>a+b,0).toFixed(1));
 // JRA's 上り3F is the race sectional, not the winning horse's own final 600m.
 const officialLast3f=plain.slice(at+6,at+540).match(/上り\s*(?:4F\s*[\d.]+\s*[-－ー−]\s*)?3F\s*(\d{2}\.\d)/);
 const last3f=officialLast3f?Number(officialLast3f[1]):Number(laps.slice(-3).reduce((a,b)=>a+b,0).toFixed(1));
 return {number:info.number,name:title.trim(),surface,distance,laps,winningSeconds,last3f,sourceUrl:'https://www.jra.go.jp/JRADB/accessS.html?CNAME='+encodeURIComponent(code)};
}
function parseJraEntries(html){
 const entries=[];
 // Read every table; the JRA desktop entry table is not always the first
 // table whose CSS class contains "race".
 const rows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 const clean=value=>textOnly(value).replace(/&(?:nbsp|#160|#xA0|#12288);/gi,' ').trim();
 for(const row of rows){
  const cells=[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>({html:m[1],text:clean(m[1])}));
  if(cells.length<3)continue;
  // Horse number appears before horse name; do not confuse with other
  // numeric values in the form/history columns.
  let found=null;
  for(let i=0;i<Math.min(cells.length-1,4);i++){
   if(!/^(?:[1-9]|1[0-8])$/.test(cells[i].text))continue;
   for(let j=i+1;j<Math.min(cells.length,i+4);j++){
    const cell=cells[j];
    const anchors=[...cell.html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m=>clean(m[1]));
    const candidates=[...anchors,cell.text];
    for(const candidate of candidates){
     // Odds, race record and owner often follow the horse name directly.
     const match=candidate.match(/^([ァ-ヶー・]{2,24})(?=[0-9０-９(\s]|$)/);
     if(match&&match[1].length>=3){
      found={number:Number(cells[i].text),name:match[1]};
      break;
     }
    }
    if(found)break;
   }
   if(found)break;
  }
  if(found&&!entries.some(e=>e.number===found.number))entries.push(found);
 }
 entries.sort((x,y)=>x.number-y.number);
 // Reject false positives from non-entry tables.
 if(entries.length<2||entries.length>18)return [];
 return entries;
}
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
 if(!ALL_JRA_TRACKS.includes(course))return null;
 const body=textOnly(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' '));
 const meeting=body.match(/第\d+回\s*(?:札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)競馬\s*第\d+日(?:前日)?\s*[（(]\s*(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
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
 return {course,condition:m[1],meetingDate:meetingDate.toISOString().slice(0,10),observedAt,sourceUrl:url,cushion:null,meetingNumber:meetingNumberMatch?Number(meetingNumberMatch[1]):null,meetingDay:meetingDayMatch?Number(meetingDayMatch[1]):null,weather:weatherMatch?weatherMatch[1]:null,rail:railMatch?railMatch[1]:null,railDay:null,
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
function measurementRegion(html,course){
 if(Array.isArray(html))return html.map(source=>measurementRegion(source,course)).join('');
 if(!html||!ALL_JRA_TRACKS.includes(course))return '';
 const sections=[...html.matchAll(/<div\b([^>]*\bid=["']rc[A-Z]["'][^>]*)>([\s\S]*?)(?=<div\b[^>]*\bid=["']rc[A-Z]["']|$)/gi)];
 return sections.find(m=>(m[1].match(/\btitle=["']([^"']+)["']/i)||[])[1]===course)?.[2]||'';
}
function extractSourceMeasurements(html,course,year,type,conditionDate){
 return extractRecentMeasurements(html,course,year,type,conditionDate)[0]||null;
}
function extractRecentMeasurements(html,course,year,type,conditionDate){
 const region=measurementRegion(html,course);
 const units=[...region.matchAll(/<div\s+class=["']unit["']\s*>([\s\S]*?)(?=<div\s+class=["']unit["']|$)/gi)];
 const entries=[];
 for(const unit of units){
  const raw=(unit[1].match(/<div\s+class=["']time["']\s*>([^<]+)<\/div>/i)||[])[1]||'';
  let time=measuredDate(raw,year);
  if(time&&time.slice(0,10)>conditionDate&&conditionDate.slice(5,7)==='01'&&time.slice(5,7)==='12')time=measuredDate(raw,year-1);
  if(!time||time.slice(0,10)>conditionDate)continue;
  if(type==='cushion'){
   const v=(unit[1].match(/<div\s+class=["']cushion["']\s*>\s*(\d{1,2}(?:\.\d+)?)\s*<\/div>/i)||[])[1];
   if(v!==undefined&&Number(v)<=30)entries.push({time,cushion:Number(v)});
  }else{
   const turf=(unit[1].match(/<div\s+class=["']turf["']\s*>([\s\S]*?)<\/div>/i)||[])[1]||'';
   const g=(turf.match(/<span\s+class=["']mg["'][^>]*>\s*(\d{1,2}(?:\.\d+)?)\s*<\/span>/i)||[])[1];
   const c=(turf.match(/<span\s+class=["']m4c["'][^>]*>\s*(\d{1,2}(?:\.\d+)?)\s*<\/span>/i)||[])[1];
   if(g!==undefined&&c!==undefined&&Number(g)<=100&&Number(c)<=100)entries.push({time,finish:Number(g),corner:Number(c)});
  }
 }
 return entries.sort((a,b)=>b.time.localeCompare(a.time));
}
async function jraVerified(){
 const pages=await jraDiagnostic();
 const origins=[BASE,'https://jra.jp/keiba/baba/'];
 const loadMeasurements=async file=>{
  const results=await Promise.allSettled(origins.map(async origin=>{
   const res=await fetch(freshJraUrl(origin+file),{headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw Error(file+' HTTP '+res.status);
   return new TextDecoder('shift_jis').decode(await res.arrayBuffer());
  }));
  return results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 };
 const [cushionHTML,moistHTML]=await Promise.all(['_data_cushion.html','_data_moist.html'].map(loadMeasurements));
 const tracks={};
 const parseErrors=[];
 for(const page of pages){
  if(!ALL_JRA_TRACKS.includes(page.course)||page.status!==200)continue;
  try{
   const response=await fetch(freshJraUrl(page.url));
   if(!response.ok)continue;
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const x=extractCondition(html,page.title,page.url);
   if(!x){parseErrors.push({course:page.course,stage:'extractCondition',title:page.title});continue;}
   const year=Number(x.observedAt.slice(0,4));
   const meetingDate=(textOnly(html).match(/第\d+回\s*(?:札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)競馬\s*第\d+日\s*[（(]\s*20\d{2}年\s*(\d{1,2})月\s*(\d{1,2})日/)||[]);
   const measurementLimit=meetingDate.length?year+'-'+String(Number(meetingDate[1])).padStart(2,'0')+'-'+String(Number(meetingDate[2])).padStart(2,'0'):x.observedAt;
   const c=cushionHTML?extractSourceMeasurements(cushionHTML,x.course,year,'cushion',measurementLimit):null;
   const m=moistHTML?extractSourceMeasurements(moistHTML,x.course,year,'moist',measurementLimit):null;
   // History is optional: never let it break the already verified latest feed.
   x.history=[];
   try{
    // Keep only this race weekend's Friday, Saturday and Sunday, with both official measurements present.
    const meetingUTC=new Date(measurementLimit+'T00:00:00Z');
    const weekday=meetingUTC.getUTCDay();
    const friday=new Date(meetingUTC.getTime()-(weekday===1?3:(weekday+2)%7)*86400000).toISOString().slice(0,10);
    const cushionEntries=extractRecentMeasurements(cushionHTML,x.course,year,'cushion',measurementLimit);
    const moistEntries=extractRecentMeasurements(moistHTML,x.course,year,'moist',measurementLimit);
    const byDate=new Map();
    for(const item of cushionEntries){const day=item.time.slice(0,10);if(day>=friday&&!byDate.has(day))byDate.set(day,{date:day,cushion:item.cushion,cushionMeasuredAt:item.time})}
    for(const item of moistEntries){const day=item.time.slice(0,10);const row=byDate.get(day);if(row&&row.moistureMeasuredAt===undefined){row.moistureFinish=item.finish;row.moistureCorner=item.corner;row.moistureMeasuredAt=item.time}}
    x.history=[...byDate.values()].filter(row=>row.moistureMeasuredAt).sort((a,b)=>a.date.localeCompare(b.date));
   }catch(error){x.history=[];}
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
   for(const row of x.history){if(row.date===x.conditionObservedAt)row.condition=x.condition;}
   // The UI date refers to the latest fully verified turf measurements, not the condition bulletin.
   const cushionDay=x.cushionMeasuredAt?.slice(0,10);
   const moistureDay=x.moistureMeasuredAt?.slice(0,10);
   if(cushionDay&&moistureDay&&cushionDay===moistureDay&&cushionDay>x.observedAt&&cushionDay<=measurementLimit)x.observedAt=cushionDay;
   x.note='表示日は芝クッション値・含水率の共通測定日。馬場状態の発表日はconditionObservedAt。';
   if(!tracks[x.course]||tracks[x.course].observedAt<x.observedAt)tracks[x.course]=x;
  }catch(error){parseErrors.push({course:page.course,stage:'parse',error:String(error)});}
 }
 // JRA retains pages from finished meetings. Only the newest race weekend is active.
 const newestMeeting=Object.values(tracks).map(x=>x.meetingDate).sort().at(-1);
 if(newestMeeting){const threshold=new Date(newestMeeting+'T00:00:00Z').getTime()-3*86400000;for(const [name,x] of Object.entries(tracks)){if(new Date(x.meetingDate+'T00:00:00Z').getTime()<threshold)delete tracks[name];}}
 Object.defineProperty(tracks,'_debug',{value:{pages,parseErrors,cushionLoaded:cushionHTML.length>0,moistLoaded:moistHTML.length>0},enumerable:false});
 return tracks;
}

// auto-deploy-smoke-20261014: trigger Cloudflare Builds without changing runtime behavior
export default {async fetch(request){
 const url=new URL(request.url);
 const path=url.pathname;
 if(path==='/health')return new Response(JSON.stringify({ok:true,version:24,build:'all-jra-tracks-title-measurements-20261012',racesFix:'http-diagnostics'}),{headers:{...HEADERS,'cache-control':'no-store, max-age=0'}});
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
   if(!ALL_JRA_TRACKS.includes(p.course)||p.status!==200){results.push({url:p.url,status:p.status??null,course:p.course??null,error:p.error??'ページを解析対象として認識できませんでした'});continue;}
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
   if(!ALL_JRA_TRACKS.includes(p.course)||p.status!==200)continue;
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
    for(const course of ALL_JRA_TRACKS){
     const candidates=[...html.matchAll(new RegExp('<(?:div|section|li)\\b[^>]*\\bid=["\\x27]([^"\\x27]+)["\\x27][^>]*>[\\s\\S]{0,1800}','gi'))].filter(m=>m[0].includes(course)).slice(0,3);
     sections.push({course,samples:candidates.map(m=>({id:m[1],html:m[0].slice(0,1400)}))});
    }
    return {url,status:res.status,length:html.length,head:html.slice(0,3500),sections};
   }catch(error){return {url,error:String(error)}}
  }));
  return respond({checkedAt:new Date().toISOString(),results});
 }
 // Diagnostic-only lap discovery. No bulk crawl: one official page per request.
 if(path==='/lap-history-diagnostics'){
  const date=url.searchParams.get('date')||'',track=url.searchParams.get('track')||'';
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!JRA_VENUES[track])return respond({error:'invalid_date_or_track'},400);
  const candidates=Object.entries(VERIFIED_RESULT_CODES).filter(([k])=>k.includes('|'+track+'|')&&Number(k.slice(0,4))<Number(date.slice(0,4))).slice(0,5);
  const checks=await Promise.all(candidates.map(async ([key,code])=>{
   try{
    const response=await fetch('https://www.jra.go.jp/JRADB/accessS.html?CNAME='+encodeURIComponent(code),{signal:AbortSignal.timeout(6000)});
    const html=response.ok?new TextDecoder('shift_jis').decode(await response.arrayBuffer()):'';
    const race=html?parseOfficialLap(html,code,track,key.slice(0,10)):null;
    return {key,status:response.status,hasLap:html.includes('ハロンタイム'),hasCourse:html.includes('コース'),parsed:!!race,distance:race?.distance||null};
   }catch(e){return {key,error:String(e).slice(0,150)}}
  }));
  return respond({version:'2026-10-16-parser-v2',date,track,checks},200);
 }
 if(path==='/historical-lap-averages'){
  const date=url.searchParams.get('date')||'',track=url.searchParams.get('track')||'';
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!JRA_VENUES[track])return respond({error:'invalid_date_or_track'},400);
  const base=new Date(date+'T00:00:00Z');
  const dates=[];
  for(let years=1;years<=5;years++){
   const start=new Date(base);
   start.setUTCDate(start.getUTCDate()-364*years);
   dates.push(start.toISOString().slice(0,10));
  }
  const groups=new Map(),coveredYears=new Set(),missing=[];
  await Promise.all(dates.map(async day=>{
   const weekStart=new Date(day+'T00:00:00Z');
   const candidateDays=Array.from({length:29},(_,i)=>{const d=new Date(weekStart);d.setUTCDate(d.getUTCDate()+i-14);return d.toISOString().slice(0,10)});
   const seeds=Object.entries(VERIFIED_RESULT_CODES).filter(([key])=>candidateDays.some(d=>key.startsWith(d+'|'+track+'|'))).map(([key,code])=>({code,day:key.slice(0,10)}));
   if(!seeds.length){missing.push(day);return}
   const races=await Promise.all(seeds.map(async code=>{
    try{
     const response=await fetch('https://www.jra.go.jp/JRADB/accessS.html?CNAME='+encodeURIComponent(code.code),{signal:AbortSignal.timeout(8500)});
     if(!response.ok)return null;
     return parseOfficialLap(new TextDecoder('shift_jis').decode(await response.arrayBuffer()),code.code,track,code.day);
    }catch(e){return null}
   }));
   for(const race of races.filter(Boolean)){
    if(race.surface!=='芝')continue;
    coveredYears.add(day.slice(0,4));
    const key=race.surface+'|'+race.distance;
    const group=groups.get(key)||{surface:race.surface,distance:race.distance,count:0,winningSum:0,last3fSum:0,years:new Set()};
    group.count++;group.winningSum+=race.winningSeconds;group.last3fSum+=race.last3f;group.years.add(day.slice(0,4));groups.set(key,group);
   }
  }));
  const averages=[...groups.values()].map(g=>({surface:g.surface,distance:g.distance,count:g.count,years:[...g.years].sort(),averageWinningSeconds:Number((g.winningSum/g.count).toFixed(2)),averageLast3f:Number((g.last3fSum/g.count).toFixed(2))})).sort((a,b)=>a.surface.localeCompare(b.surface,'ja')||a.distance-b.distance);
  return new Response(JSON.stringify({date,track,comparisonDates:dates,coveredYears:[...coveredYears].sort(),complete:false,missingDates:missing,averages,notice:'公式結果URLを確認できた芝レースのみ集計。全開催レースの収集は未完了のため暫定値です。'}),{headers:{...HEADERS,'cache-control':'public, max-age=900'}});
 }
 if(path==='/laps-by-day'){
  const date=url.searchParams.get('date')||'',track=url.searchParams.get('track')||'';
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!JRA_VENUES[track])return respond({error:'invalid_date_or_track'},400);
  const prefix=date+'|'+track+'|';
  const seeds=Object.entries(VERIFIED_RESULT_CODES).filter(([k])=>k.startsWith(prefix)).map(([,v])=>v);
  if(!seeds.length)return respond({date,track,races:[],available:false,reason:'result_urls_not_discovered',note:'公式結果URLの自動発見は未対応'},200);
  const codes=new Set(seeds),pages=new Map();
  // Fetch a few verified results first, and follow only same-day official result CNAMEs found in their HTML.
  await Promise.all(seeds.slice(0,3).map(async code=>{
   try{
    const response=await fetch('https://www.jra.go.jp/JRADB/accessS.html?CNAME='+encodeURIComponent(code),{signal:AbortSignal.timeout(8500)});
    if(!response.ok)return;
    const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
    pages.set(code,html);
    for(const candidate of resultCodesInHtml(html)){
     const info=resultCodeInfo(candidate);
     if(info&&info.venue===JRA_VENUES[track]&&info.date===date.replace(/-/g,''))codes.add(candidate);
    }
   }catch(e){}
  }));
  const targets=[...codes].slice(0,12);
  const races=(await Promise.all(targets.map(async code=>{
   try{
    let html=pages.get(code);
    if(!html){
     const response=await fetch('https://www.jra.go.jp/JRADB/accessS.html?CNAME='+encodeURIComponent(code),{signal:AbortSignal.timeout(8500)});
     if(!response.ok)return null;
     html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
    }
    return parseOfficialLap(html,code,track,date);
   }catch(e){return null}
  }))).filter(Boolean).sort((a,b)=>a.number-b.number);
  return new Response(JSON.stringify({date,track,races,available:races.length>0,partial:races.length<12,source:'JRA official results',reason:races.length?'':'lap_parse_or_fetch_failed'}),{headers:{...HEADERS,'cache-control':races.length?'public, max-age=900':'no-store'}});
 }
 if(path==='/lap-source-diagnostics'){
  const target=url.searchParams.get('url')||'';
  let u;
  try{u=new URL(target)}catch{return respond({error:'invalid_url'},400)}
  if(u.protocol!=='https:'||u.hostname!=='www.jra.go.jp'||u.pathname!=='/JRADB/accessS.html'||!/^pw01sde[0-9a-zA-Z%/]+$/i.test(u.searchParams.get('CNAME')||''))return respond({error:'unapproved_jra_result_url'},400);
  try{
   const response=await fetch(u.toString(),{redirect:'follow'});
   if(!response.ok)return respond({ok:false,httpStatus:response.status},200);
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
   const at=plain.indexOf('ハロンタイム'),win=plain.indexOf('着順');
   return respond({ok:true,httpStatus:response.status,title:(plain.match(/20\d{2}年[^]{0,100}?\d+レース/)||[])[0]||null,course:(plain.match(/コース[：:]?\s*[\d,，]+\s*メートル\s*[（(][^）)]+/)||[])[0]||null,lapSection:at>=0?plain.slice(at,at+220):null,resultSection:win>=0?plain.slice(win,win+350):null,htmlLength:html.length,pageTitle:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/<[^>]+>/g,' ').trim().slice(0,160)||null,charset:(html.match(/<meta[^>]*charset\s*=\s*["']?([^\s"'>]+)/i)||[])[1]||null,headSample:plain.slice(0,550),keywords:{race:plain.includes('レース'),lap:plain.includes('ハロンタイム'),result:plain.includes('レース結果')},finalUrl:response.url});
  }catch(e){return respond({ok:false,error:String(e)})}
 }
 if(path==='/entries'||path==='/entries-by-race'){
  const byRace=path==='/entries-by-race';
  const date=url.searchParams.get('date')||'';
  const track=url.searchParams.get('track')||'';
  const number=Number(url.searchParams.get('number'));
  const key=date+'|'+track+'|'+number;
  const verified=VERIFIED_ENTRY_CODES[key];
  // Discover race-specific CNAMEs from official JRA entry pages for the
  // same date. Never fabricate the opaque checksum suffix.
  async function discoverOfficialCode(){
   if(verified)return verified;
   if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!ALL_JRA_TRACKS.includes(track)||!Number.isInteger(number)||number<1||number>12)return '';
   const seeds=Object.entries(VERIFIED_ENTRY_CODES).filter(([k])=>k.startsWith(date+'|')).sort(([a],[b])=>Number(b.split('|')[1]===track)-Number(a.split('|')[1]===track)).slice(0,6);
   const expectedDate=date.replace(/-/g,'');
   const expectedVenue={札幌:'01',函館:'02',福島:'03',新潟:'04',東京:'05',中山:'06',中京:'07',京都:'08',阪神:'09',小倉:'10'}[track];
   const expectedRace=String(number).padStart(2,'0');
   for(const [,seed] of seeds){
    try{
     const page=await fetch('https://www.jra.go.jp/JRADB/accessD.html?CNAME='+encodeURIComponent(seed));
     if(!page.ok)continue;
     const body=new TextDecoder('shift_jis').decode(await page.arrayBuffer());
     const matches=[...body.matchAll(/pw01dde[0-9a-zA-Z/]{20,65}/gi)].map(m=>m[0]);
     for(const code of matches){
      // CNAME format: pw01dde + mode(2) + venue(2) + year(4) +
      // meeting(2) + day(2) + race(2) + date(8) + /checksum.
      const parsed=code.match(/^pw01dde\d{2}(\d{2})\d{4}\d{2}\d{2}(\d{2})(\d{8})\/[0-9A-F]{2}$/i);
      if(parsed&&parsed[1]===expectedVenue&&parsed[2]===expectedRace&&parsed[3]===expectedDate)return code;
     }
    }catch(e){}
   }
   return '';
  }
  const resolvedCode=byRace?await discoverOfficialCode():verified;
  const sourceUrl=byRace?(resolvedCode?'https://www.jra.go.jp/JRADB/accessD.html?CNAME='+encodeURIComponent(resolvedCode):''):(url.searchParams.get('sourceUrl')||'');
  if(!sourceUrl)return respond({available:false,date,track,number,error:'official_entry_url_not_yet_verified'});
  try{
   const target=new URL(sourceUrl);
   if(target.protocol!=='https:'||target.hostname!=='www.jra.go.jp'||target.pathname!=='/JRADB/accessD.html'||!/^pw01dde[0-9a-zA-Z/]+$/i.test(target.searchParams.get('CNAME')||''))return respond({available:false,error:'invalid_official_entry_url'},400);
   const response=await fetch(target.toString());
   if(!response.ok)return respond({available:false,date,track,number,error:'JRA_HTTP_'+response.status,sourceUrl});
   const html=new TextDecoder('shift_jis').decode(await response.arrayBuffer());
   const entries=parseJraEntries(html);
   return respond({available:entries.length>0,date,track,number,entries,sourceUrl,error:entries.length?null:'no_entries_parsed',diagnostics:{htmlLength:html.length,rowCount:[...html.matchAll(/<tr\b/gi)].length,horseLinks:[...html.matchAll(/<a\b[^>]*>/gi)].length,pageTitle:textOnly((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').slice(0,80)}});
  }catch(e){return respond({available:false,date,track,number,error:String(e),sourceUrl})}
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
    // The JRA calendar uses venue labels such as "東京" and "第4回東京第6日",
    // not necessarily "東京競馬場". Read the nearest heading before each table.
    const before=stripped.slice(Math.max(0,t.index-1800),t.index);
    const headings=[...before.matchAll(/<(?:h[1-6]|th|caption|div|p|span|strong|b)\b[^>]*>([\s\S]*?)<\/(?:h[1-6]|th|caption|div|p|span|strong|b)>/gi)]
      .map(m=>textOnly(m[1])).filter(v=>v.length<120);
    const venuePattern=/(?:札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)/g;
    const venueCandidates=headings.flatMap(v=>[...v.matchAll(venuePattern)].map(m=>m[0]));
    const match=venueCandidates.at(-1)||[...textOnly(before).matchAll(venuePattern)].map(m=>m[0]).at(-1)||'';
    // Venue fallback for the published October 17-18 three-track program.
    // The calendar table order is Tokyo, Kyoto, Niigata on these dates.
    // Keep this date-scoped; never assign venues by table order on other dates.
    const octoberWeekend=year==='2026'&&month==='10'&&['10','11','12','17','18'].includes(day);
    const tableNumber=diagnostics.length;
    const orderedVenue=octoberWeekend?(['10','11','12'].includes(day)?['東京','京都']:['東京','京都','新潟'])[tableNumber]||null:null;
    const cardText=valid.map(c=>c.join(' ')).join(' ');
    const namedVenue=octoberWeekend
      ? (/富士ステークス|アイビーステークス|東京ハイジャンプ/.test(cardText)?'東京'
        : /トルマリンステークス|もみじステークス|秋華賞/.test(cardText)?'京都'
        : /北陸ステークス|妙高特別|信越ステークス/.test(cardText)?'新潟':orderedVenue)
      : null;
    const track=namedVenue||(ALL_JRA_TRACKS.includes(match)?match:null);
    diagnostics.push({heading:match,detectedTrack:track,rows:valid.length});
    for(const c of valid){
     const number=Number(c[0].match(/\d+/)[0]);
     const description=c.slice(1,-1).join(' ').replace(/\s+/g,' ').trim();
     const time=c.at(-1).match(/\d{1,2}時\d{2}分|\d{1,2}:\d{2}/)?.[0]||'';
     const distance=description.match(/([1-9],?\d{3})\s*[（(]\s*(芝|ダ)/);
     races.push({track,number,name:description,time,surface:distance?.[2]==='芝'?'芝':distance?.[2]==='ダ'?'ダート':'',distance:distance?Number(distance[1].replace(',','')):null});
    }
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
    if(!ALL_JRA_TRACKS.includes(track))return;
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
 const activeTracks=ALL_JRA_TRACKS.filter(name=>tracks[name]);
 const complete=activeTracks.length>0&&activeTracks.every(name=>{const x=tracks[name];return x&&['良','稍重','重','不良'].includes(x.condition)&&Number.isFinite(x.cushion)&&Number.isFinite(x.moistureFinish)&&Number.isFinite(x.moistureCorner)&&typeof x.cushionMeasuredAt==='string'&&typeof x.moistureMeasuredAt==='string'});
 const status=complete?'complete':Object.keys(tracks).length?'partial':'unavailable';
 const debug=url.searchParams.has('debug')?tracks._debug:undefined;
 return new Response(JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),tracks,activeTracks,status,...(debug?{debug}:{}),reason:complete?'開催場の芝馬場状態・クッション値・含水率・測定時刻を取得':status==='partial'?'一部データ未取得':'公式データを取得できませんでした'}),{headers:{...HEADERS,'cache-control':'no-store, max-age=0'}});
}
 return respond({ok:false,error:'not_found'},404);
}};
