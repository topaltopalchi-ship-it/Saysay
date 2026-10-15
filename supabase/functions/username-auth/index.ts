// Supabase Edge Function: username-auth
// Required server-side secret: SUPABASE_SERVICE_ROLE_KEY (never expose to the app).
// Uses Supabase Auth for password hashing/session issuance and a private username lookup table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const { action, username, password } = await req.json();
    const normalized = String(username ?? "").trim().toLowerCase();
    const pass = String(password ?? "");
    if (!/^[a-z0-9_.-]{3,32}$/.test(normalized)) return reply({ error: "نام کاربری معتبر نیست." }, 400);
    if (pass.length < 8 || pass.length > 128) return reply({ error: "رمز عبور باید حداقل ۸ نویسه باشد." }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return reply({ error: "تنظیمات سرور احراز هویت کامل نیست." }, 500);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const auth = createClient(url, anonKey, { auth: { persistSession: false } });
    const email = `${normalized}@users.saisai.invalid`;

    if (action === "signup") {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password: pass, email_confirm: true, user_metadata: { username: normalized },
      });
      if (createError) {
        const duplicate = /already|exists|registered/i.test(createError.message);
        return reply({ error: duplicate ? "این نام کاربری قبلاً ثبت شده است." : "ساخت حساب انجام نشد." }, duplicate ? 409 : 400);
      }
      const { error: profileError } = await admin.from("profiles").insert({ id: created.user.id, username: normalized });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return reply({ error: "ثبت مشخصات حساب ناموفق بود." }, 500);
      }
    } else if (action === "login") {
      const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("username", normalized).maybeSingle();
      if (profileError || !profile) return reply({ error: "نام کاربری یا رمز عبور اشتباه است." }, 401);
    } else {
      return reply({ error: "درخواست نامعتبر است." }, 400);
    }

    const { data, error } = await auth.auth.signInWithPassword({ email, password: pass });
    if (error || !data.session) return reply({ error: "نام کاربری یا رمز عبور اشتباه است." }, 401);
    return reply({ session: data.session }, 200);
  } catch {
    return reply({ error: "درخواست قابل پردازش نیست." }, 400);
  }
});

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
