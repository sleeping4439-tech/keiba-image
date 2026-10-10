// JRA result page -> lap record. No network calls are made by this module.
export function parseJraResult(html,sourceUrl=''){
 const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const text=clean(html);
 const head=text.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日[^]{0,100}?(東京|京都|中山|阪神|中京|新潟|福島|小倉|札幌|函館)[^]{0,70}?(\d{1,2})\s*レース/);
 const dist=text.match(/コース\s*[：:]?\s*([\d,，]+)\s*メートル\s*[（(]\s*(芝|ダート)/);
 const lapsMatch=text.match(/ハロンタイム\s*([\d.\s\-－ー–—]+?)(?=\s*上り\s*|\s*コーナー通過順位|$)/);
 if(!head||!dist||!lapsMatch||dist[2]!=='芝')return null;
 const distance=Number(dist[1].replace(/[,，]/g,'')),race=Number(head[5]);
 const laps=(lapsMatch[1].match(/\d{1,2}\.\d/g)||[]).map(Number);
 if(!Number.isInteger(distance)||distance<800||distance>4000||distance%200!==0||laps.length!==distance/200||laps.some(n=>n<9||n>25))return null;
 const winner=text.match(/(?:着順[^]{0,300}?)?\b1\s+[^]{0,180}?\b(\d+:\d{2}\.\d)\b/);
 if(!winner)return null;
 const date=head[1]+'-'+head[2].padStart(2,'0')+'-'+head[3].padStart(2,'0');
 const going=text.match(/芝\s*[：:]\s*(良|稍重|重|不良)/);
 return {date,track:head[4],race,surface:'芝',distance,going:going?.[1]||'',finish:winner[1],laps,sourceUrl};
}
