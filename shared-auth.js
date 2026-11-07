import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
// Shared by ゆ馬場, 馬場履歴 and ゆ馬録 on this origin.
export function createSharedClient(url,key){
 const shared='yubaroku-google-auth-v1';
 const legacy='sb-'+new URL(url).hostname.split('.')[0]+'-auth-token';
 try{
  if(!localStorage.getItem(shared)&&localStorage.getItem(legacy))localStorage.setItem(shared,localStorage.getItem(legacy));
  // Do not resurrect an old session after a shared logout.
  localStorage.removeItem(legacy);
 }catch{}
 return createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:shared}});
}
