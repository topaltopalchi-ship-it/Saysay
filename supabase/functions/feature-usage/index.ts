import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const quotas:Record<string,number>={calculator:20,voice_secretary:10,voice_sale:10,voice_purchase:10,voice_product:10,multi_item_voice:5,smart_pricing:10,market_prices:10,smart_report:5,advanced_reports:5,manual_sale:1000000,manual_purchase:1000000,product_create:1000000};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anonKey=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!serviceKey||!anonKey)return json({error:"server_not_configured"},500);
 const authHeader=req.headers.get("Authorization")||"";if(!authHeader.startsWith("Bearer "))return json({error:"sign_in_required"},401);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await admin.auth.getUser(authHeader.slice(7));if(authError||!user)return json({error:"invalid_session"},401);
 let body:{feature?:unknown;action?:unknown};try{body=await req.json()}catch{return json({error:"invalid_json"},400)}
 const feature=typeof body.feature==="string"?body.feature:"",action=body.action==="status"?"status":"consume";
 if(!Object.prototype.hasOwnProperty.call(quotas,feature))return json({error:"unknown_feature"},400);
 const {data:subs,error:subError}=await admin.from("subscriptions").select("expires_at,status").eq("user_id",user.id).eq("status","active").order("expires_at",{ascending:false}).limit(1);
 if(subError)return json({error:"subscription_check_failed"},503);
 const now=Date.now(),paid=(subs||[]).some((s:{expires_at?:string|null})=>!!s.expires_at&&Date.parse(s.expires_at)>now);
 if(paid)return json({allowed:true,unlimited:true,feature,used:0,quota:null});
 return json({allowed:false,reason:"subscription_required",feature,used:0,quota:quotas[feature]>=1000000?null:quotas[feature]},403);
});