// Cloudflare Worker staging: do not publish unverified values.
const SOURCES={'東京':'https://www.jra.go.jp/keiba/baba/','京都':'https://www.jra.go.jp/keiba/baba/index2.html'};
const cors={'content-type':'application/json; charset=utf-8','access-control-allow-origin':'https://sleeping4439-tech.github.io','cache-control':'no-store'};
const json=(value,status=200)=>new Response(JSON.stringify(value,null,2),{status,headers:cors});
export default {async fetch(request){
 const pathname=new URL(request.url).pathname;
 if(pathname==='/health')return json({ok:true,version:3});
 if(pathname==='/diagnostics'){
  const result={checkedAt:new Date().toISOString(),sources:{}};
  for(const [course,url] of Object.entries(SOURCES)){
   try{
    const res=await fetch(url);
    const html=new TextDecoder('shift_jis').decode(await res.arrayBuffer());
    const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
    result.sources[course]={httpStatus:res.status,title:title.replace(/<[^>]*>/g,'').trim(),matched:title.includes(course)};
   }catch(error){result.sources[course]={error:String(error)}}
  }
  return json(result);
 }
 if(pathname==='/'||pathname==='/latest')return json({schemaVersion:1,updatedAt:null,tracks:{},status:'unavailable',reason:'測定値のパーサーは未検証'});
 return json({ok:false,error:'not_found'},404);
}};
