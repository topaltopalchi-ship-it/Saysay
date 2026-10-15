import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    return Response.json({ error: "server_not_configured" }, { status: 503, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from("subscriptions")
    .select("status, plan, provider, starts_at, expires_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "subscription_lookup_failed" }, { status: 500, headers: corsHeaders });
  }

  const now = Date.now();
  const expiry = data?.expires_at ? Date.parse(data.expires_at) : null;
  const active = data?.status === "active" && expiry !== null && Number.isFinite(expiry) && expiry > now;
  const status = active
    ? "active"
    : data?.status === "pending"
      ? "pending"
      : data?.status === "active" || data?.status === "expired"
        ? "expired"
        : "none";

  return Response.json({
    status,
    plan: active ? data.plan : "none",
    provider: data?.provider ?? undefined,
    expiresAt: expiry,
    isTrial: false,
  }, { headers: { ...corsHeaders, "Cache-Control": "no-store" } });
});
