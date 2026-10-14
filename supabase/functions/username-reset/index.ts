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
    const recoveryCode = String(body.recoveryCode ?? "");
    const newPassword = String(body.newPassword ?? "");
    const newRecoveryCode = String(body.newRecoveryCode ?? "");
    if (!/^[a-z0-9_]{3,24}$/.test(username) || !/^[A-Fa-f0-9-]{32,80}$/.test(recoveryCode)) return reply(400, { error: "نام کاربری یا کد بازیابی معتبر نیست." });
    if (newPassword.length < 8 || newPassword.length > 128) return reply(400, { error: "رمز جدید باید حداقل ۸ کاراکتر باشد." });
    if (!/^[A-Fa-f0-9-]{32,80}$/.test(newRecoveryCode)) return reply(400, { error: "کد بازیابی جدید معتبر نیست." });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: record, error: lookupError } = await admin.from("username_recovery")
      .select("user_id,recovery_hash").eq("username", username).maybeSingle();
    if (lookupError) return reply(500, { error: "بررسی حساب انجام نشد؛ دوباره تلاش کنید." });
    if (!record || record.recovery_hash !== await sha256(recoveryCode)) return reply(400, { error: "نام کاربری یا کد بازیابی درست نیست." });

    const { error: updateError } = await admin.auth.admin.updateUserById(record.user_id, { password: newPassword });
    if (updateError) return reply(400, { error: "تغییر رمز انجام نشد؛ دوباره تلاش کنید." });
    const { error: rotateError } = await admin.from("username_recovery").update({
      recovery_hash: await sha256(newRecoveryCode), updated_at: new Date().toISOString(),
    }).eq("user_id", record.user_id).eq("recovery_hash", record.recovery_hash);
    if (rotateError) return reply(500, { error: "رمز تغییر کرد اما به‌روزرسانی کد بازیابی کامل نشد؛ با پشتیبانی تماس بگیرید." });
    return reply(200, { ok: true });
  } catch {
    return reply(400, { error: "درخواست بازیابی معتبر نیست." });
  }
});
