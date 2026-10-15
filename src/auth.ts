import { getEmailSession, signOutEmailAccount } from "./supabase-email-auth";
import { signInWithUsername, signUpWithUsername, resetPasswordWithRecovery } from "./username-auth";
import { setDataScope, repairDataIntegrity } from "./db";

const PIN_KEY = "sai-sai-pin";
function hasLegacyPin(): boolean { return Boolean(localStorage.getItem(PIN_KEY)); }
function checkLegacyPin(pin: string): boolean { return localStorage.getItem(PIN_KEY) === pin; }

function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials")) return "نام کاربری یا رمز عبور درست نیست.";
  if (message.includes("already") || message.includes("duplicate")) return "این نام کاربری قبلاً انتخاب شده است.";
  if (message.includes("password") && message.includes("least")) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  if (message.includes("rate limit") || message.includes("too many requests")) return "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.";
  if (message.includes("failed to fetch") || message.includes("network")) return "اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.";
  if (message.includes("تنظیمات اتصال")) return "اتصال حساب آنلاین تنظیم نشده است. تنظیمات Supabase را بررسی کنید.";
  return error instanceof Error ? error.message : "عملیات انجام نشد؛ دوباره تلاش کنید.";
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
      <p class="muted">با نام کاربری و رمز عبور وارد شوید یا حساب جدید بسازید. اطلاعات حسابداری این دستگاه با ورود یا خروج پاک نمی‌شود.</p>
      <div class="auth-methods">
        <button id="auth-user-mode" class="primary-button wide">حساب کاربری</button>
        ${legacyPin ? '<button id="auth-pin-mode" class="secondary-button wide">ورود با رمز قبلی</button>' : ""}
      </div>
      <div id="auth-user-panel">
        <label class="field"><span>نام کاربری</span><input id="auth-username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" placeholder="مثلاً ali_123" required></label>
        <label class="field"><span>رمز عبور (حداقل ۸ کاراکتر)</span><input id="auth-password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="رمز عبور" required></label>
        <p id="auth-error" class="muted" role="status" aria-live="polite"></p>
        <button id="auth-submit" type="button" class="primary-button wide">ورود</button>
        <button id="auth-signup" type="button" class="secondary-button wide">ساخت حساب جدید</button>
        <button id="auth-reset-mode" type="button" class="secondary-button wide">بازیابی رمز با کد بازیابی</button>
        <div id="auth-recovery-panel" hidden>
          <label class="field"><span>کد بازیابی ذخیره‌شده</span><input id="auth-recovery-code" type="text" autocomplete="off" placeholder="کد بازیابی"></label>
          <label class="field"><span>رمز عبور جدید</span><input id="auth-new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="حداقل ۸ کاراکتر"></label>
          <button id="auth-reset-submit" type="button" class="primary-button wide">تغییر رمز و صدور کد جدید</button>
        </div>
        <div id="auth-recovery-result" hidden>
          <p class="muted">این کد فقط همین بار نمایش داده می‌شود. آن را در جای امن نگه دارید؛ برای بازیابی بعدی لازم است.</p>
          <textarea id="auth-recovery-output" readonly rows="3" aria-label="کد بازیابی جدید"></textarea>
          <button id="auth-recovery-copy" type="button" class="secondary-button wide">کپی کد بازیابی</button>
          <button id="auth-recovery-done" type="button" class="primary-button wide">ذخیره کردم، ادامه</button>
        </div>
      </div>
      ${legacyPin ? `<div id="auth-pin-panel" hidden>
        <label class="field"><span>رمز ورود قبلی</span><input id="auth-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="رمز ۴ تا ۶ رقمی"></label>
        <p id="auth-pin-error" class="muted" role="alert"></p>
        <button id="auth-pin-submit" class="primary-button wide">ورود با رمز قبلی</button>
      </div>` : ""}
    </section>`;
  document.body.appendChild(wrapper);

  const userPanel = wrapper.querySelector<HTMLElement>("#auth-user-panel")!;
  const pinPanel = wrapper.querySelector<HTMLElement>("#auth-pin-panel");
  const userMode = wrapper.querySelector<HTMLButtonElement>("#auth-user-mode")!;
  const pinMode = wrapper.querySelector<HTMLButtonElement>("#auth-pin-mode");
  const username = wrapper.querySelector<HTMLInputElement>("#auth-username")!;
  const password = wrapper.querySelector<HTMLInputElement>("#auth-password")!;
  const status = wrapper.querySelector<HTMLElement>("#auth-error")!;
  const signIn = wrapper.querySelector<HTMLButtonElement>("#auth-submit")!;
  const signUp = wrapper.querySelector<HTMLButtonElement>("#auth-signup")!;
  const resetMode = wrapper.querySelector<HTMLButtonElement>("#auth-reset-mode")!;
  const recoveryPanel = wrapper.querySelector<HTMLElement>("#auth-recovery-panel")!;
  const recoveryResult = wrapper.querySelector<HTMLElement>("#auth-recovery-result")!;
  let busy = false;

  const showMode = (mode: "user" | "pin") => {
    userPanel.hidden = mode !== "user";
    if (pinPanel) pinPanel.hidden = mode !== "pin";
    userMode.className = mode === "user" ? "primary-button wide" : "secondary-button wide";
    if (pinMode) pinMode.className = mode === "pin" ? "primary-button wide" : "secondary-button wide";
    (mode === "user" ? username : wrapper.querySelector<HTMLInputElement>("#auth-pin"))?.focus();
  };
  userMode.addEventListener("click", () => showMode("user"));
  pinMode?.addEventListener("click", () => showMode("pin"));

  const run = async (action: () => Promise<unknown>, successMessage: string) => {
    if (busy) return;
    if (!username.value.trim()) { status.textContent = "نام کاربری را وارد کنید."; username.focus(); return; }
    busy = true;
    [signIn, signUp, resetMode].forEach(button => button.disabled = true);
    status.textContent = "لطفاً صبر کنید…";
    try {
      await action();
      const session = await getEmailSession();
      if (session?.user) { await setDataScope(session.user.id); await repairDataIntegrity(); wrapper.remove(); onSuccess(); }
      else status.textContent = successMessage;
    } catch (error) {
      status.textContent = friendlyAuthError(error);
    } finally {
      busy = false;
      [signIn, signUp, resetMode].forEach(button => button.disabled = false);
    }
  };

  signIn.addEventListener("click", () => {
    if (!password.value) { status.textContent = "رمز عبور را وارد کنید."; password.focus(); return; }
    void run(() => signInWithUsername(username.value, password.value), "ورود انجام نشد.");
  });
  signUp.addEventListener("click", async () => {
    if (busy) return;
    if (password.value.length < 8) { status.textContent = "رمز عبور باید حداقل ۸ کاراکتر باشد."; password.focus(); return; }
    busy = true; signIn.disabled = signUp.disabled = resetMode.disabled = true;
    status.textContent = "در حال ساخت حساب…";
    try {
      const result = await signUpWithUsername(username.value, password.value);
      const session = await getEmailSession();
      if (session?.user) await setDataScope(session.user.id);
      wrapper.querySelector<HTMLTextAreaElement>("#auth-recovery-output")!.value = result.recoveryCode;
      recoveryResult.hidden = false;
      recoveryPanel.hidden = true;
      status.textContent = "حساب ساخته شد. کد بازیابی را حتماً ذخیره کنید.";
      signIn.hidden = true; signUp.hidden = true; resetMode.hidden = true;
    } catch (error) { status.textContent = friendlyAuthError(error); }
    finally { busy = false; signIn.disabled = signUp.disabled = resetMode.disabled = false; }
  });
  resetMode.addEventListener("click", () => {
    recoveryPanel.hidden = !recoveryPanel.hidden;
    if (!recoveryPanel.hidden) wrapper.querySelector<HTMLInputElement>("#auth-recovery-code")?.focus();
  });
  wrapper.querySelector<HTMLButtonElement>("#auth-reset-submit")!.addEventListener("click", async () => {
    if (busy) return;
    const code = wrapper.querySelector<HTMLInputElement>("#auth-recovery-code")!.value.trim();
    const newPassword = wrapper.querySelector<HTMLInputElement>("#auth-new-password")!.value;
    if (!code) { status.textContent = "کد بازیابی را وارد کنید."; return; }
    if (newPassword.length < 8) { status.textContent = "رمز جدید باید حداقل ۸ کاراکتر باشد."; return; }
    busy = true; status.textContent = "در حال بازیابی…";
    try {
      const result = await resetPasswordWithRecovery(username.value, code, newPassword);
      wrapper.querySelector<HTMLInputElement>("#auth-recovery-output")!.value = result.recoveryCode;
      recoveryResult.hidden = false; recoveryPanel.hidden = true;
      signIn.hidden = true; signUp.hidden = true; resetMode.hidden = true;
      status.textContent = result.passwordChanged
        ? "رمز تغییر کرد؛ کد بازیابی جدید را ذخیره کنید."
        : "رمز تغییر نکرد، اما کد بازیابی جدید فعال شده است. آن را ذخیره کنید و سپس دوباره بازیابی را انجام دهید.";
    } catch (error) { status.textContent = friendlyAuthError(error); }
    finally { busy = false; }
  });
  wrapper.querySelector<HTMLButtonElement>("#auth-recovery-copy")!.addEventListener("click", async () => {
    const value = wrapper.querySelector<HTMLTextAreaElement>("#auth-recovery-output")!.value;
    try { await navigator.clipboard.writeText(value); status.textContent = "کد کپی شد."; }
    catch { status.textContent = "کپی خودکار نشد؛ کد را دستی یادداشت کنید."; }
  });
  wrapper.querySelector<HTMLButtonElement>("#auth-recovery-done")!.addEventListener("click", async () => {
    const session = await getEmailSession().catch(() => null);
    if (session?.user) { await setDataScope(session.user.id); await repairDataIntegrity(); wrapper.remove(); onSuccess(); }
    else {
      recoveryResult.hidden = true; signIn.hidden = signUp.hidden = resetMode.hidden = false;
      status.textContent = "کد را ذخیره کنید و با نام کاربری و رمز وارد شوید.";
    }
  });

  const pinInput = wrapper.querySelector<HTMLInputElement>("#auth-pin");
  const pinError = wrapper.querySelector<HTMLElement>("#auth-pin-error");
  const submitPin = async () => {
    if (!pinInput || !pinError) return;
    const pin = pinInput.value.trim();
    if (!/^\d{4,6}$/.test(pin)) { pinError.textContent = "رمز باید ۴ تا ۶ رقم باشد."; return; }
    if (!checkLegacyPin(pin)) { pinError.textContent = "رمز واردشده اشتباه است."; pinInput.value = ""; pinInput.focus(); return; }
    try { await setDataScope(null); await repairDataIntegrity(); wrapper.remove(); onSuccess(); }
    catch { pinError.textContent = "باز کردن اطلاعات محلی ناموفق بود؛ دوباره تلاش کنید."; }
  };
  wrapper.querySelector<HTMLButtonElement>("#auth-pin-submit")?.addEventListener("click", () => { void submitPin(); });
  pinInput?.addEventListener("keydown", event => { if (event.key === "Enter") void submitPin(); });
  password.addEventListener("keydown", event => { if (event.key === "Enter") signIn.click(); });
  username.focus();
}
