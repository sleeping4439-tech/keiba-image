// Pure parser for JRA race-result HTML. No requests or crawling.
const strip = s => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;|&#xA0;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
export function parseJraResult(html,sourceUrl=''){
 if(typeof html!=='string')return null;
 const text=strip(html);
 const header=text.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日[\s\S]{0,180}?(\d+)回\s*(東京|京都|中山|阪神|中京|新潟|福島|小倉|札幌|函館)\s*(\d+)日[\s\S]{0,120}?(\d+)\s*レース/);
 const course=text.match(/コース\s*[：:]?\s*([\d,，]+)\s*メートル\s*[（(]\s*(芝|ダート)/);
 if(!header||!course||course[2]!=='芝')return null;
 const distance=Number(course[1].replace(/[,，]/g,'')),race=Number(header[7]);
 if(!Number.isInteger(distance)||distance<800||distance>4000||distance%200!==0||race<1||race>12)return null;
 const section=text.match(/ハロンタイム\s*([0-9.\s\-－ー–—]+?)(?=\s*上り\s*|\s*コーナー通過順位|$)/);
 if(!section)return null;
 const laps=(section[1].match(/\d{1,2}\.\d/g)||[]).map(Number);
 if(laps.length!==distance/200||laps.some(n=>n<9||n>25))return null;
 // Restrict the winning-time search to the first results row, never the payout or split section.
 const table=(html.match(/<table\b[^>]*>[\s\S]*?着順[\s\S]*?<\/table>/i)||[])[0];
 let winner=null;
 if(table){
  const trs=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows=trs.map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>strip(c[1])));
  const headings=rows.findIndex(r=>r.some(v=>v==='着順')&&r.some(v=>v==='タイム'));
  if(headings>=0){
   const timeIndex=rows[headings].findIndex(v=>v==='タイム');
   const rankIndex=rows[headings].findIndex(v=>v==='着順');
   const first=rows.slice(headings+1).find(r=>r[rankIndex]==='1');
   const candidate=first?.[timeIndex]||'';
   if(/^\d+:\d{2}\.\d$/.test(candidate))winner=candidate;
  }
 }
 // Fallback for result HTML with complex merged cells.
 if(!winner){
  const region=text.split('着順').slice(1).join('着順').split('ハロンタイム')[0];
  const m=region.match(/(?:^|\s)1\s+[\s\S]{0,150}?\s(\d+:\d{2}\.\d)(?=\s|$)/);
  winner=m?.[1]||null;
 }
 if(!winner)return null;
 // Published race laps must add up to the winning time (within rounding tolerance).
 const seconds=Number(winner.split(':')[0])*60+Number(winner.split(':')[1]);
 const lapSeconds=laps.reduce((sum,v)=>sum+v,0);
 if(Math.abs(seconds-lapSeconds)>0.15)return null;
 const date=header[1]+'-'+header[2].padStart(2,'0')+'-'+header[3].padStart(2,'0');
 const going=text.match(/(?:天候\s*[晴曇雨雪小]+[\s\S]{0,30}?)?芝\s*[：:]?\s*(良|稍重|重|不良)(?=\s|$)/);
 return {date,track:header[5],race,surface:'芝',distance,going:going?.[1]||'',finish:winner,laps,sourceUrl};
}
