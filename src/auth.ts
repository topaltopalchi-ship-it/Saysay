import { Capacitor } from "@capacitor/core";

const SESSION_KEY = "sai-sai-auth-session";
const AUTH_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type AuthSession = { access_token: string; refresh_token?: string; expires_at?: number; user?: { id: string; email?: string } };

function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.access_token) return null;
    if (session.expires_at && session.expires_at * 1000 < Date.now()) return null;
    return session;
  } catch { return null; }
}

export function hasPin(): boolean { return Boolean(getSession()); }
export function savePin(_pin: string): void { /* Device-only PINs are no longer used. */ }
export function checkPin(_pin: string): boolean { return Boolean(getSession()); }

export function clearPin(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("sai-sai-unlocked");
}

export function authScreen(onSuccess: () => void): void {
  if (!AUTH_URL || !ANON_KEY) {
    renderMessage("تنظیم اتصال حساب کاربری", "برای فعال‌شدن ورود واقعی، آدرس پروژه Supabase و کلید عمومی anon باید در تنظیمات ساخت برنامه ثبت شوند.");
    return;
  }
  if (getSession()) { onSuccess(); return; }

  document.querySelector("#auth-lock")?.remove();
  const wrapper = document.createElement("div");
  wrapper.id = "auth-lock";
  wrapper.className = "modal-backdrop";
  wrapper.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <h2 id="auth-title">ورود به سای‌سای</h2>
      <p class="muted">با نام کاربری و رمز عبور وارد شوید یا حساب بسازید.</p>
      <label class="field"><span>نام کاربری</span><input id="auth-username" autocomplete="username" maxlength="32" placeholder="نام کاربری" /></label>
      <label class="field"><span>رمز عبور</span><input id="auth-password" type="password" autocomplete="current-password" minlength="8" placeholder="حداقل ۸ نویسه" /></label>
      <p id="auth-error" class="muted" role="alert"></p>
      <button id="auth-submit" class="primary-button wide">ورود</button>
      <button id="auth-toggle" class="secondary-button wide" type="button">ساخت حساب جدید</button>
    </section>`;
  document.body.appendChild(wrapper);

  const username = wrapper.querySelector<HTMLInputElement>("#auth-username")!;
  const password = wrapper.querySelector<HTMLInputElement>("#auth-password")!;
  const error = wrapper.querySelector<HTMLElement>("#auth-error")!;
  const submit = wrapper.querySelector<HTMLButtonElement>("#auth-submit")!;
  const toggle = wrapper.querySelector<HTMLButtonElement>("#auth-toggle")!;
  let mode: "login" | "signup" = "login";
  toggle.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    submit.textContent = mode === "login" ? "ورود" : "ساخت حساب";
    toggle.textContent = mode === "login" ? "ساخت حساب جدید" : "قبلاً حساب دارم؛ ورود";
    password.autocomplete = mode === "login" ? "current-password" : "new-password";
    error.textContent = "";
  });

  const run = async () => {
    const user = username.value.trim().toLowerCase();
    const pass = password.value;
    if (!/^[a-z0-9_.-]{3,32}$/.test(user)) { error.textContent = "نام کاربری باید ۳ تا ۳۲ نویسه و شامل حروف انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد."; return; }
    if (pass.length < 8) { error.textContent = "رمز عبور باید حداقل ۸ نویسه باشد."; return; }
    submit.disabled = true; toggle.disabled = true; error.textContent = "در حال اتصال…";
    try {
      const response = await fetch(`${AUTH_URL}/functions/v1/username-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ action: mode, username: user, password: pass, platform: Capacitor.isNativePlatform() ? "android" : "web" }),
      });
      const data = await response.json() as { session?: AuthSession; error?: string; message?: string };
      if (!response.ok || !data.session?.access_token) throw new Error(data.error || data.message || "ورود ناموفق بود. تنظیمات سرور را بررسی کنید.");
      localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
      localStorage.setItem("sai-sai-unlocked", "1");
      wrapper.remove();
      onSuccess();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : "ارتباط با سرویس ورود ناموفق بود.";
    } finally { submit.disabled = false; toggle.disabled = false; }
  };
  submit.addEventListener("click", () => { void run(); });
  password.addEventListener("keydown", event => { if (event.key === "Enter") void run(); });
  username.focus();
}

function renderMessage(title: string, message: string): void {
  document.querySelector("#auth-lock")?.remove();
  const wrapper = document.createElement("div");
  wrapper.id = "auth-lock";
  wrapper.className = "modal-backdrop";
  wrapper.innerHTML = `<section class="modal"><h2></h2><p class="muted"></p><p class="muted">کلید service_role را هرگز در برنامه یا فایل env عمومی قرار ندهید.</p></section>`;
  wrapper.querySelector("h2")!.textContent = title;
  wrapper.querySelector("p")!.textContent = message;
  document.body.appendChild(wrapper);
}
