import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!url || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);
  if (!token || token === authHeader) return json({ error: "Authentication required" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Authentication required" }, 401);

  const userId = userData.user.id;
  const now = new Date();

  const { data: paid, error: paidError } = await admin
    .from("subscriptions")
    .select("status,provider,starts_at,expires_at,product_id,amount_toman")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paidError) return json({ error: "Subscription status could not be checked" }, 500);

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("amount_toman,duration_days")
    .eq("plan_id", "monthly")
    .eq("enabled", true)
    .maybeSingle();

  if (paid) {
    return json({
      status: "active",
      plan: "monthly",
      expiresAt: Date.parse(paid.expires_at),
      provider: paid.provider || "bazaar",
      isTrial: false,
      priceToman: plan?.amount_toman ?? 100000,
      durationDays: plan?.duration_days ?? 30,
    });
  }

  // No free trial: only a verified, unexpired paid subscription grants full access.
  return json({
    status: "expired",
    plan: "none",
    expiresAt: null,
    provider: "web",
    isTrial: false,
    priceToman: plan?.amount_toman ?? 100000,
    durationDays: plan?.duration_days ?? 30,
  });
});
