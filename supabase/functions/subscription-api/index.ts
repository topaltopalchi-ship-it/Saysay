/// <reference lib="deno.ns" />
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return json(500, { error: "server_not_configured" });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: "authentication_required" });
  }

  // Validate the caller's access token with Supabase Auth; never trust a user id
  // supplied in request JSON or query parameters.
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!userResponse.ok) return json(401, { error: "invalid_session" });
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return json(401, { error: "invalid_session" });

  const path = new URL(req.url).pathname.replace(/\/$/, "");
  if (req.method === "GET" && path.endsWith("/status")) {
    // Insert-once: repeated requests, app reinstalls, and device clock changes
    // must not reset the trial. The unique user_id makes the start immutable.
    const insertResponse = await fetch(`${url}/rest/v1/user_subscriptions`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ user_id: user.id }),
    });
    if (!insertResponse.ok) return json(500, { error: "trial_initialization_failed" });

    const recordResponse = await fetch(
      `${url}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=trial_started_at,paid_until,provider`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!recordResponse.ok) return json(500, { error: "subscription_lookup_failed" });
    const records = await recordResponse.json() as Array<{
      trial_started_at: string; paid_until: string | null; provider: string | null;
    }>;
    const record = records[0];
    if (!record) return json(500, { error: "subscription_record_missing" });

    const now = Date.now();
    const trialStartedAt = Date.parse(record.trial_started_at);
    const trialExpiresAt = trialStartedAt + 30 * 24 * 60 * 60 * 1000;
    const paidUntil = record.paid_until ? Date.parse(record.paid_until) : 0;
    if (paidUntil > now) {
      return json(200, { status: "active", plan: "monthly", expiresAt: paidUntil, provider: record.provider, isTrial: false });
    }
    if (now < trialExpiresAt) {
      return json(200, { status: "active", plan: "monthly", expiresAt: trialExpiresAt, provider: "web", isTrial: true });
    }
    return json(200, { status: "expired", plan: "none", expiresAt: trialExpiresAt, provider: "web", isTrial: true });
  }

  if (req.method === "POST" && path.endsWith("/store/verify")) {
    // Fail closed until CafeBazaar's official receipt verification is wired in.
    // Never grant entitlement merely because a client supplied a purchase token.
    return json(501, { error: "store_verification_not_configured" });
  }

  if (req.method === "POST" && path.endsWith("/checkout")) {
    return json(501, { error: "checkout_not_configured" });
  }

  return json(404, { error: "not_found" });
});
