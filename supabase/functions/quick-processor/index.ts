import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "درخواست پشتیبانی نمی‌شود." });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(500, { error: "تنظیمات سرور کامل نیست." });
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const recoveryCode = String(body.recoveryCode ?? "");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return reply(400, { error: "نام کاربری باید ۳ تا ۲۴ حرف انگلیسی، عدد یا زیرخط باشد." });
    if (password.length < 8 || password.length > 128) return reply(400, { error: "رمز عبور باید حداقل ۸ کاراکتر باشد." });
    if (!/^[A-Fa-f0-9-]{32,80}$/.test(recoveryCode)) return reply(400, { error: "کد بازیابی معتبر نیست." });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = username + "@username.saysay.invalid";
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
    if (error || !data.user) {
      const message = error?.message.toLowerCase() ?? "";
      if (message.includes("already") || message.includes("duplicate")) return reply(409, { error: "این نام کاربری قبلاً انتخاب شده است." });
      return reply(400, { error: "ساخت حساب انجام نشد. اطلاعات را بررسی کنید." });
    }
    const { error: recoveryError } = await admin.from("username_recovery").insert({
      user_id: data.user.id, username, recovery_hash: await sha256(recoveryCode),
    });
    if (recoveryError) {
      await admin.auth.admin.deleteUser(data.user.id);
      if (recoveryError.code === "23505") return reply(409, { error: "این نام کاربری قبلاً انتخاب شده است." });
      return reply(500, { error: "ذخیره امن کد بازیابی انجام نشد؛ دوباره تلاش کنید." });
    }
    return reply(201, { ok: true });
  } catch {
    return reply(400, { error: "درخواست ثبت‌نام معتبر نیست." });
  }
});
