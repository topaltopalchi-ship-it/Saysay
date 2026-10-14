import {
  getEmailSession,
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from "./supabase-email-auth";

const PIN_KEY = "sai-sai-pin";
function hasLegacyPin(): boolean { return Boolean(localStorage.getItem(PIN_KEY)); }
function checkLegacyPin(pin: string): boolean { return localStorage.getItem(PIN_KEY) === pin; }

function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials")) return "ایمیل یا رمز عبور درست نیست.";
  if (message.includes("user already registered")) return "این ایمیل قبلاً ثبت شده است؛ وارد حساب شوید.";
  if (message.includes("email not confirmed")) return "ابتدا ایمیل خود را از طریق لینک تأیید کنید.";
  if (message.includes("password should be at least")) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  if (message.includes("rate limit") || message.includes("too many requests")) return "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.";
  if (message.includes("failed to fetch") || message.includes("network")) return "اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.";
  if (message.includes("تنظیمات اتصال")) return "اتصال حساب آنلاین تنظیم نشده است. تنظیمات Supabase را بررسی کنید.";
  return "عملیات انجام نشد. ایمیل، رمز عبور و اتصال اینترنت را بررسی کنید.";
}

export function authScreen(onSuccess: () => void): void {
  document.querySelector("#auth-lock")?.remove();
  const wrapper = document.createElement("div");
  wrapper.id = "auth-lock";
  wrapper.className = "modal-backdrop";
  const legacyPin = hasLegacyPin();
  wrapper.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <span class="eyebrow">حساب سای‌سای</span>
      <h2 id="auth-title">ورود به سای‌سای</h2>
      <p class="muted">می‌توانید با حساب ایمیل وارد شوید. اگر قبلاً با رمز ۴ تا ۶ رقمی از برنامه استفاده می‌کردید، ورود قبلی شما هم در دسترس است. اطلاعات حسابداری این دستگاه پاک نمی‌شود.</p>
      <div class="auth-methods">
        <button id="auth-email-mode" class="primary-button wide">ورود با ایمیل</button>
        ${legacyPin ? '<button id="auth-pin-mode" class="secondary-button wide">ورود با رمز قبلی</button>' : ""}
      </div>
      <div id="auth-email-panel">
        <label class="field"><span>ایمیل</span><input id="auth-email" type="email" autocomplete="email" placeholder="name@example.com" required></label>
        <label class="field"><span>رمز عبور</span><input id="auth-password" type="password" autocomplete="current-password" minlength="8" placeholder="حداقل ۸ کاراکتر" required></label>
        <p id="auth-error" class="muted" role="status" aria-live="polite"></p>
        <button id="auth-submit" class="primary-button wide">ورود</button>
        <button id="auth-signup" class="secondary-button wide">ساخت حساب جدید</button>
        <button id="auth-reset" class="secondary-button wide">فراموشی رمز عبور</button>
      </div>
      ${legacyPin ? `<div id="auth-pin-panel" hidden>
        <label class="field"><span>رمز ورود قبلی</span><input id="auth-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="رمز ۴ تا ۶ رقمی"></label>
        <p id="auth-pin-error" class="muted" role="alert"></p>
        <button id="auth-pin-submit" class="primary-button wide">ورود با رمز قبلی</button>
      </div>` : ""}
    </section>`;
  document.body.appendChild(wrapper);

  const emailPanel = wrapper.querySelector<HTMLElement>("#auth-email-panel")!;
  const pinPanel = wrapper.querySelector<HTMLElement>("#auth-pin-panel");
  const emailMode = wrapper.querySelector<HTMLButtonElement>("#auth-email-mode")!;
  const pinMode = wrapper.querySelector<HTMLButtonElement>("#auth-pin-mode");
  const showMode = (mode: "email" | "pin") => {
    emailPanel.hidden = mode !== "email";
    if (pinPanel) pinPanel.hidden = mode !== "pin";
    emailMode.className = mode === "email" ? "primary-button wide" : "secondary-button wide";
    if (pinMode) pinMode.className = mode === "pin" ? "primary-button wide" : "secondary-button wide";
    (mode === "email" ? wrapper.querySelector<HTMLInputElement>("#auth-email") : wrapper.querySelector<HTMLInputElement>("#auth-pin"))?.focus();
  };
  emailMode.addEventListener("click", () => showMode("email"));
  pinMode?.addEventListener("click", () => showMode("pin"));

  const email = wrapper.querySelector<HTMLInputElement>("#auth-email")!;
  const password = wrapper.querySelector<HTMLInputElement>("#auth-password")!;
  const status = wrapper.querySelector<HTMLElement>("#auth-error")!;
  const signIn = wrapper.querySelector<HTMLButtonElement>("#auth-submit")!;
  const signUp = wrapper.querySelector<HTMLButtonElement>("#auth-signup")!;
  const reset = wrapper.querySelector<HTMLButtonElement>("#auth-reset")!;
  let busy = false;

  const run = async (action: () => Promise<unknown>, successMessage: string, allowNoSession = false) => {
    if (busy) return;
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      status.textContent = "یک ایمیل معتبر وارد کنید.";
      email.focus();
      return;
    }
    busy = true;
    [signIn, signUp, reset].forEach(button => button.disabled = true);
    status.textContent = "لطفاً صبر کنید…";
    try {
      await action();
      const session = await getEmailSession();
      if (session?.user) {
        status.textContent = successMessage;
        wrapper.remove();
        onSuccess();
      } else if (allowNoSession) {
        status.textContent = successMessage;
      } else {
        status.textContent = "حساب ایجاد شد؛ برای تأیید ایمیل، صندوق ورودی خود را بررسی کنید. سپس وارد شوید.";
      }
    } catch (error) {
      status.textContent = friendlyAuthError(error);
    } finally {
      busy = false;
      [signIn, signUp, reset].forEach(button => button.disabled = false);
    }
  };

  signIn.addEventListener("click", () => {
    if (!password.value) { status.textContent = "رمز عبور را وارد کنید."; password.focus(); return; }
    void run(() => signInWithEmail(email.value, password.value), "ورود موفق بود.");
  });
  signUp.addEventListener("click", () => {
    if (password.value.length < 8) { status.textContent = "رمز عبور باید حداقل ۸ کاراکتر باشد."; password.focus(); return; }
    void run(() => signUpWithEmail(email.value, password.value), "حساب ایجاد شد؛ وارد برنامه شدید.");
  });
  reset.addEventListener("click", () => {
    void run(() => sendPasswordReset(email.value), "اگر این ایمیل ثبت شده باشد، لینک بازیابی رمز ارسال می‌شود.", true);
  });

  const pinInput = wrapper.querySelector<HTMLInputElement>("#auth-pin");
  const pinError = wrapper.querySelector<HTMLElement>("#auth-pin-error");
  const submitPin = () => {
    if (!pinInput || !pinError) return;
    const pin = pinInput.value.trim();
    if (!/^\d{4,6}$/.test(pin)) { pinError.textContent = "رمز باید ۴ تا ۶ رقم باشد."; return; }
    if (!checkLegacyPin(pin)) { pinError.textContent = "رمز واردشده اشتباه است."; pinInput.value = ""; pinInput.focus(); return; }
    wrapper.remove();
    onSuccess();
  };
  wrapper.querySelector<HTMLButtonElement>("#auth-pin-submit")?.addEventListener("click", submitPin);
  pinInput?.addEventListener("keydown", event => { if (event.key === "Enter") submitPin(); });
  password.addEventListener("keydown", event => { if (event.key === "Enter") signIn.click(); });
  email.focus();
}
