import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);

  let body: { action?: string; username?: string; password?: string; newPassword?: string; recoveryCode?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!usernamePattern.test(username)) return json({ error: "نام کاربری باید ۳ تا ۲۴ حرف انگلیسی، عدد یا _ باشد." }, 400);
  if (password.length < 8 || password.length > 128) return json({ error: "رمز عبور باید حداقل ۸ نویسه داشته باشد." }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const emailAlias = `${username}@users.saysay.invalid`;

  if (body.action === "signup") {
    const recoveryCode = String(body.recoveryCode ?? "").trim();
    if (recoveryCode.length < 12 || recoveryCode.length > 128) {
      return json({ error: "کد بازیابی معتبر نیست." }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: emailAlias,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createError || !created.user) {
      // Avoid exposing whether a username exists.
      return json({ error: "ساخت حساب انجام نشد؛ نام کاربری را بررسی یا نام دیگری انتخاب کنید." }, 400);
    }

    const { error: profileError } = await admin.from("user_profiles").insert({
      user_id: created.user.id,
      username,
      recovery_code_hash: await sha256(recoveryCode),
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "ذخیره امن حساب ناموفق بود." }, 500);
    }

    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: emailAlias, password,
    });
    if (sessionError || !sessionData.session) return json({ error: "حساب ساخته شد؛ ورود خودکار ناموفق بود. اکنون وارد شوید." }, 200);
    return json({ session: sessionData.session, user: { id: created.user.id, username }, trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
  }

  if (body.action === "login") {
    const { data, error } = await admin.auth.signInWithPassword({ email: emailAlias, password });
    if (error || !data.session || !data.user) return json({ error: "نام کاربری یا رمز عبور صحیح نیست." }, 401);
    const { data: profile, error: profileError } = await admin.from("user_profiles")
      .select("username,trial_started_at,trial_ends_at").eq("user_id", data.user.id).maybeSingle();
    if (profileError || !profile) return json({ error: "پروفایل حساب پیدا نشد." }, 403);
    return json({ session: data.session, user: { id: data.user.id, username: profile.username }, trialStartedAt: profile.trial_started_at, trialEndsAt: profile.trial_ends_at });
  }

  if (body.action === "recover") {
    const recoveryCode = String(body.recoveryCode ?? "").trim();
    const newPassword = String(body.newPassword ?? "");
    if (recoveryCode.length < 12 || recoveryCode.length > 128) return json({ error: "کد بازیابی معتبر نیست." }, 400);
    if (newPassword.length < 8 || newPassword.length > 128) return json({ error: "رمز جدید باید حداقل ۸ نویسه داشته باشد." }, 400);
    const { data: profile } = await admin.from("user_profiles")
      .select("user_id,recovery_code_hash").eq("username", username).maybeSingle();
    if (!profile?.recovery_code_hash || profile.recovery_code_hash !== await sha256(recoveryCode)) {
      return json({ error: "نام کاربری یا کد بازیابی صحیح نیست." }, 401);
    }
    const { error: resetError } = await admin.auth.admin.updateUserById(profile.user_id, { password: newPassword });
    if (resetError) return json({ error: "تغییر رمز انجام نشد؛ دوباره تلاش کنید." }, 500);
    // Rotate the recovery code after successful use so it cannot be replayed.
    const { error: rotateError } = await admin.from("user_profiles")
      .update({ recovery_code_hash: null }).eq("user_id", profile.user_id);
    if (rotateError) return json({ error: "رمز تغییر کرد، اما کد بازیابی مصرف‌شده باطل نشد. با پشتیبانی تماس بگیرید." }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
