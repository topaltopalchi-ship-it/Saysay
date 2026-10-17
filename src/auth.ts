import { createClient, type Session } from "@supabase/supabase-js";

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://msiiyofbjymwjwgfjbpw.supabase.co").replace(/\/$/, "");
// Supabase anon keys are public client identifiers; access must be restricted by RLS and server-side checks.
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zaWl5b2Zianltd2p3Z2ZqYnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzk1MjQsImV4cCI6MjEwNzU1NTUyNH0.bvK-PYO7chfm07-DfkZLnWeUFYK-XHoYJGF3I2xa3ZY";

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

export async function hasAuthenticatedSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  return !error && Boolean(data.session);
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

type AuthResponse = {
  session?: Session;
  error?: string;
  trialEndsAt?: string;
  user?: { id: string; username: string };
};

function makeRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function authScreen(onSuccess: () => void, initialMode: "login" | "signup" = "login"): void {
  if (!supabase || !SUPABASE_URL || !SUPABASE_KEY) {
    document.querySelector("#auth-lock")?.remove();
    const missing = document.createElement("div");
    missing.id = "auth-lock";
    missing.className = "modal-backdrop auth-backdrop";
    missing.innerHTML = `<section class="modal auth-modal" dir="rtl">
      <h2>ورود به سای‌سای</h2>
      <p class="muted">اتصال امن به سرویس حساب کاربری تنظیم نشده است.</p>
      <p class="muted">مدیر پروژه باید VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را در تنظیمات ساخت برنامه وارد کند.</p>
    </section>`;
    document.body.appendChild(missing);
    return;
  }

  let mode: "login" | "signup" | "recover" = "login";
  let recoveryCode = "";
  document.querySelector("#auth-lock")?.remove();
  const wrapper = document.createElement("div");
  wrapper.id = "auth-lock";
  wrapper.className = "modal-backdrop auth-backdrop";
  wrapper.innerHTML = `<section class="modal auth-modal" dir="rtl">
    <div class="auth-mark">س</div>
    <h2 id="auth-title">ورود به سای‌سای</h2>
    <p class="muted" id="auth-description">نام کاربری و رمز عبور خود را وارد کنید.</p>
    <form id="auth-form" novalidate>
      <label class="field"><span>نام کاربری</span><input id="auth-username" name="username" autocomplete="username" minlength="3" maxlength="24" autocapitalize="none" placeholder="مثلاً sara123" required /></label>
      <label class="field"><span>رمز عبور / رمز جدید</span><input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="حداقل ۸ نویسه" required /></label>
      <label class="field" id="auth-recovery-input-wrap" hidden><span>کد بازیابی</span><input id="auth-recovery-input" autocomplete="off" autocapitalize="characters" placeholder="کد بازیابی ذخیره‌شده" /></label>
      <div id="auth-recovery-wrap" hidden>
        <div class="recovery-box"><b>کد بازیابی حساب</b><p>این کد فقط یک‌بار نمایش داده می‌شود. آن را در جای امنی نگه دارید؛ به سرور فقط اثر انگشت رمزنگاری‌شده آن ارسال می‌شود.</p><code id="auth-recovery-code"></code><button type="button" id="auth-copy-recovery" class="secondary-button wide">کپی کد بازیابی</button></div>
        <label class="recovery-confirm"><input id="auth-recovery-confirm" type="checkbox" /><span>کد بازیابی را در جای امن ذخیره کردم.</span></label>
      </div>
      <p id="auth-error" class="auth-error" role="alert" aria-live="polite"></p>
      <button id="auth-submit" class="primary-button wide" type="submit">ورود</button>
    </form>
    <button id="auth-switch" class="secondary-button wide" type="button">ساخت حساب جدید</button>
    <button id="auth-recover" class="auth-recover-link" type="button">رمز عبور را فراموش کرده‌اید؟</button>
    <p class="auth-footnote">اطلاعات کاری و حسابداری روی همین گوشی می‌ماند.</p>
  </section>`;
  document.body.appendChild(wrapper);

  const form = wrapper.querySelector<HTMLFormElement>("#auth-form")!;
  const usernameInput = wrapper.querySelector<HTMLInputElement>("#auth-username")!;
  const passwordInput = wrapper.querySelector<HTMLInputElement>("#auth-password")!;
  const error = wrapper.querySelector<HTMLElement>("#auth-error")!;
  const submit = wrapper.querySelector<HTMLButtonElement>("#auth-submit")!;
  const recoveryWrap = wrapper.querySelector<HTMLElement>("#auth-recovery-wrap")!;
  const recoveryInputWrap = wrapper.querySelector<HTMLElement>("#auth-recovery-input-wrap")!;
  const recoveryCodeEl = wrapper.querySelector<HTMLElement>("#auth-recovery-code")!;
  const recoveryConfirm = wrapper.querySelector<HTMLInputElement>("#auth-recovery-confirm")!;

  const showError = (message: string) => { error.textContent = message; };
  const setMode = (next: "login" | "signup" | "recover") => {
    mode = next;
    recoveryCode = "";
    recoveryWrap.hidden = true;
    recoveryInputWrap.hidden = mode !== "recover";
    recoveryConfirm.checked = false;
    if (mode === "signup") {
      // Show the recovery code as soon as signup is selected, rather than
      // making the first press of "Create account" appear to do nothing.
      recoveryCode = makeRecoveryCode();
      recoveryCodeEl.textContent = recoveryCode;
      recoveryWrap.hidden = false;
    }
    wrapper.querySelector("#auth-title")!.textContent = mode === "login" ? "ورود به سای‌سای" : mode === "signup" ? "ساخت حساب سای‌سای" : "بازیابی رمز عبور";
    wrapper.querySelector("#auth-description")!.textContent = mode === "login"
      ? "نام کاربری و رمز عبور خود را وارد کنید."
      : mode === "signup"
        ? "حساب بسازید و برای فعال‌سازی امکانات کامل، اشتراک تهیه کنید."
        : "نام کاربری، کد بازیابی و رمز جدید را وارد کنید.";
    passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    submit.textContent = mode === "login" ? "ورود به حساب" : mode === "signup" ? "ساخت حساب" : "تغییر رمز";
    wrapper.querySelector<HTMLButtonElement>("#auth-switch")!.textContent = mode === "login" ? "ساخت حساب جدید" : "قبلاً حساب ساخته‌ام؛ ورود";
    showError("");
  };
  wrapper.querySelector("#auth-switch")!.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
  wrapper.querySelector("#auth-recover")!.addEventListener("click", () => setMode("recover"));
  wrapper.querySelector("#auth-copy-recovery")!.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      showError("کد بازیابی کپی شد؛ آن را در جای امن نگه دارید.");
    } catch {
      showError("کد را دستی یادداشت کنید: " + recoveryCode);
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showError("");
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      showError("نام کاربری باید ۳ تا ۲۴ نویسه و شامل حروف انگلیسی، عدد یا _ باشد.");
      usernameInput.focus();
      return;
    }
    if (password.length < 8 || password.length > 128) {
      showError("رمز عبور باید حداقل ۸ نویسه داشته باشد.");
      passwordInput.focus();
      return;
    }
    if (mode === "recover") {
      const code = wrapper.querySelector<HTMLInputElement>("#auth-recovery-input")!.value.trim();
      if (!code) { showError("کد بازیابی را وارد کنید."); return; }
      submit.disabled = true;
      submit.textContent = "در حال تغییر رمز…";
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/username-auth`, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, body: JSON.stringify({ action: "recover", username, newPassword: password, recoveryCode: code }) });
        const result = await response.json() as AuthResponse;
        if (!response.ok || result.error) throw new Error(result.error || "بازیابی رمز ناموفق بود.");
        setMode("login");
        passwordInput.value = "";
        wrapper.querySelector<HTMLInputElement>("#auth-recovery-input")!.value = "";
        showError("رمز تغییر کرد. با رمز جدید وارد شوید.");
      } catch (e) { showError(e instanceof Error ? e.message : "بازیابی رمز ناموفق بود."); }
      finally { submit.disabled = false; submit.textContent = "تغییر رمز"; }
      return;
    }
    if (mode === "signup" && !recoveryCode) {
      recoveryCode = makeRecoveryCode();
      recoveryCodeEl.textContent = recoveryCode;
      recoveryWrap.hidden = false;
      showError("ابتدا کد بازیابی را ذخیره و تأیید کنید؛ سپس دوباره دکمه ساخت حساب را بزنید.");
      submit.textContent = "ساخت حساب";
      return;
    }
    if (mode === "signup" && !recoveryConfirm.checked) {
      showError("برای ادامه، ذخیره کد بازیابی را تأیید کنید.");
      return;
    }

    submit.disabled = true;
    submit.textContent = mode === "login" ? "در حال ورود…" : "در حال ساخت حساب…";
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/username-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ action: mode, username, password, ...(mode === "signup" ? { recoveryCode } : {}) }),
      });
      const result = await response.json() as AuthResponse;
      if (!response.ok || result.error) throw new Error(result.error || "ورود یا ثبت‌نام انجام نشد.");
      if (result.session) {
        const { error: sessionError } = await supabase!.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        if (sessionError) throw sessionError;
      }
      const { data } = await supabase!.auth.getSession();
      if (!data.session) throw new Error("نشست امن ایجاد نشد؛ دوباره وارد شوید.");
      localStorage.setItem("sai-sai-account-username", username);
      localStorage.setItem("sai-sai-auth-method", "username-password");
      wrapper.remove();
      onSuccess();
    } catch (e) {
      showError(e instanceof Error ? e.message : "ارتباط با سرویس حساب کاربری ناموفق بود.");
    } finally {
      submit.disabled = false;
      submit.textContent = mode === "login" ? "ورود به حساب" : mode === "signup" ? "ساخت حساب" : "تغییر رمز";
    }
  });

  setMode(initialMode);
  usernameInput.focus();
}

/** First-run choice: let new users explore locally before asking them to create an account. */
export function welcomeScreen(onGuest: () => void, onAccount: () => void): void {
  document.querySelector("#auth-lock")?.remove();
  const wrapper = document.createElement("div");
  wrapper.id = "auth-lock";
  wrapper.className = "modal-backdrop auth-backdrop";
  wrapper.innerHTML = `<section class="modal auth-modal welcome-modal" dir="rtl">
    <div class="auth-mark">س</div>
    <h2>به سای‌سای خوش آمدی</h2>
    <p class="muted">حساب‌وکتابت رو ساده شروع کن. بدون ثبت‌نام، امکانات برنامه رو ببین.</p>
    <button id="welcome-guest" class="primary-button wide" type="button">شروع سریع بدون حساب</button>
    <button id="welcome-account" class="secondary-button wide" type="button">ورود / ساخت حساب</button>
    <p class="auth-footnote">اطلاعات کاری روی همین گوشی ذخیره می‌شود. برای جلوگیری از دست رفتن اطلاعات، مرتب نسخه پشتیبان بگیر.</p>
  </section>`;
  document.body.appendChild(wrapper);
  wrapper.querySelector("#welcome-guest")?.addEventListener("click", () => { wrapper.remove(); onGuest(); });
  wrapper.querySelector("#welcome-account")?.addEventListener("click", () => { wrapper.remove(); onAccount(); });
}
