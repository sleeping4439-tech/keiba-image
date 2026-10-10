// Parse a JRA result page. Pure function: does not fetch or redistribute content.
export function parseJraResult(html,sourceUrl=''){
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const head=text.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日[^]{0,90}?(\d+)回\s*(東京|京都|中山|阪神|中京|新潟|福島|小倉|札幌|函館)\s*(\d+)日[^]{0,100}?(\d+)\s*レース/);
 const dist=text.match(/コース\s*[：:]\s*([\d,，]+)\s*メートル\s*[（(]\s*(芝|ダート)/);
 const lm=text.match(/ハロンタイム\s*([\d.\s\-－ー–—]+?)(?=\s*上り\s*|\s*コーナー通過順位|$)/);
 if(!head||!dist||!lm||dist[2]!=='芝')return null;
 const distance=Number(dist[1].replace(/[,，]/g,'')),race=Number(head[7]);
 const laps=(lm[1].match(/\d{1,2}\.\d/g)||[]).map(Number);
 if(!Number.isInteger(distance)||distance<800||distance>4000||distance%200!==0||laps.length!==distance/200||laps.some(n=>n<9||n>25))return null;
 // Winning time is the first finish time in the results table, not the race's first time-looking value.
 const table=text.split('着順').slice(1).join('着順').split('タイム ハロンタイム')[0];
 const winner=table.match(/(?:^|\s)1\s+[^]{0,180}?\s(\d+:\d{2}\.\d)(?=\s|$)/);
 if(!winner)return null;
 const date=head[1]+'-'+head[2].padStart(2,'0')+'-'+head[3].padStart(2,'0');
 const going=text.match(/芝\s*[：:]?\s*(良|稍重|重|不良)(?=\s|$)/);
 return {date,track:head[5],race,surface:'芝',distance,going:going?.[1]||'',finish:winner[1],laps,sourceUrl};
}
