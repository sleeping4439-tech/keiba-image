// Cloudflare Worker: conservative, racecourse-scoped JRA diagnostics.
// This is NOT a live measurement parser. It never guesses numeric readings.
const JRA_URL = 'https://www.jra.go.jp/keiba/baba/index.html';
const ALLOWED_ORIGIN = 'https://sleeping4439-tech.github.io';
const COURSES = ['東京', '京都'];
function reply(body, status=200) {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: {'content-type':'application/json; charset=utf-8',
      'access-control-allow-origin':ALLOWED_ORIGIN,
      'cache-control':'no-store', 'x-content-type-options':'nosniff'}
  });
}
function stripTags(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
async function checkSource() {
  const res = await fetch(JRA_URL, {headers:{accept:'text/html'}});
  if (!res.ok) throw new Error('JRA HTTP '+res.status);
  const bytes = await res.arrayBuffer();
  const html = new TextDecoder('shift_jis').decode(bytes);
  const title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  // A course must be unambiguously identified. Page text alone is not enough to
  // attach moisture/cushion readings to a track or observation time.
  const heading = COURSES.filter(c=>title.includes(c+'競馬場'));
  return {reachable:true, pageTitle:title,
    detectedCourse:heading.length===1?heading[0]:null,
    reason:'数値抽出は未検証のため無効。誤った競馬場・測定時刻の混入を防止。',
    sourceUrl:JRA_URL};
}
export default {
  async fetch(request) {
    const path=new URL(request.url).pathname;
    if(path==='/health') return reply({ok:true,service:'keiba-track-data',version:2});
    if(path==='/diagnostics') {
      try {return reply({ok:true,checkedAt:new Date().toISOString(),jra:await checkSource()});}
      catch(e){return reply({ok:false,checkedAt:new Date().toISOString(),error:String(e.message||e)},502);}
    }
    if(path==='/' || path==='/latest') {
      return reply({schemaVersion:1,updatedAt:null,tracks:{},
        status:'unavailable',reason:'JRAの競馬場別数値と測定時刻の検証が未完了'});
    }
    return reply({ok:false,error:'not_found'},404);
  }
};
