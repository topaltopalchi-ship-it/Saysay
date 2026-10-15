import { authScreen } from "./auth";

const SUPABASE_URL = "https://msiiyofbjymwjwgfjbpw.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_d8eYB6N-49hGZIPVma8HuQ_EwAX1tSW";

type ApiResult = { ok?: boolean; error?: string; recoveryCode?: string; recoveryCodeRotated?: boolean };

function makeRecoveryCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function callFunction(name: string, body: Record<string, string>): Promise<ApiResult> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLIC_KEY,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as ApiResult;
  if (!response.ok) {
    const error = new Error(result.error || "درخواست انجام نشد؛ دوباره تلاش کنید.") as Error & ApiResult;
    error.recoveryCode = result.recoveryCode;
    error.recoveryCodeRotated = result.recoveryCodeRotated;
    throw error;
  }
  return result;
}

function recoveryMarkup(code: string, message: string): string {
  return `<div class="panel" style="margin-top:16px"><strong>${message}</strong>
    <p class="muted">این کد را همین حالا در جایی امن یادداشت کنید. پس از بستن این پنجره، دوباره نمایش داده نمی‌شود.</p>
    <code id="cloud-recovery-code" style="display:block;overflow-wrap:anywhere;user-select:all;padding:12px">${code}</code>
    <button class="secondary-button wide" id="cloud-copy-recovery" type="button">کپی کد بازیابی</button>
  </div>`;
}

export function openCloudAccount(onSuccess?: (mode: "cloud" | "local") => void, startup = false): void {
  document.querySelector("#cloud-account-modal")?.remove();
  const wrapper = document.createElement("div");
  wrapper.id = "cloud-account-modal";
  wrapper.className = "modal-backdrop";
  wrapper.innerHTML = `
    <section class="modal">
      <button class="modal-close" id="cloud-account-close" type="button" ${startup ? "hidden" : ""}>×</button>
      <span class="eyebrow">حساب کاربری سای‌سای</span>
      <h2>${startup ? "ورود به سای‌سای" : "حساب کاربری آنلاین"}</h2>
      <p class="muted">${startup ? "برای ورود نام کاربری و رمز عبور حساب سای‌سای را وارد کنید؛ اگر حساب ندارید، ثبت‌نام کنید." : "این بخش برای ثبت‌نام، بررسی رمز و بازیابی حساب است."} توجه: اطلاعات حسابداری فعلاً روی همین دستگاه ذخیره می‌شود و با ورود به حساب آنلاین همگام‌سازی نمی‌شود.</p>
      <div class="form-grid">
        <button class="secondary-button" id="cloud-tab-signup" type="button">ثبت‌نام</button>
        <button class="secondary-button" id="cloud-tab-signin" type="button">ورود</button>
        <button class="secondary-button" id="cloud-tab-reset" type="button">بازیابی رمز</button>
      </div>
      <form id="cloud-account-form">
        <label class="field"><span>نام کاربری (حروف انگلیسی، عدد و زیرخط)</span><input id="cloud-username" autocomplete="username" minlength="3" maxlength="24" required pattern="[A-Za-z0-9_]{3,24}"></label>
        <label class="field" id="cloud-password-row"><span>رمز عبور (حداقل ۸ کاراکتر)</span><input id="cloud-password" type="password" autocomplete="new-password" minlength="8" maxlength="128"></label>
        <label class="field" id="cloud-confirm-row"><span>تکرار رمز عبور</span><input id="cloud-confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128"></label>
        <label class="field" id="cloud-recovery-row" hidden><span>کد بازیابی فعلی</span><input id="cloud-recovery" autocomplete="off"></label>
        <p id="cloud-account-status" class="muted" role="status"></p>
        <button class="primary-button wide" id="cloud-account-submit" type="submit">ساخت حساب</button>
      </form>
      <div id="cloud-account-result"></div>
      ${startup ? '<button class="secondary-button wide" id="cloud-local-pin" type="button">ورود با رمز محلی این دستگاه</button>' : ""}
    </section>`;
  document.body.appendChild(wrapper);

  const form = wrapper.querySelector<HTMLFormElement>("#cloud-account-form")!;
  const username = wrapper.querySelector<HTMLInputElement>("#cloud-username")!;
  const password = wrapper.querySelector<HTMLInputElement>("#cloud-password")!;
  const confirm = wrapper.querySelector<HTMLInputElement>("#cloud-confirm")!;
  const recovery = wrapper.querySelector<HTMLInputElement>("#cloud-recovery")!;
  const status = wrapper.querySelector<HTMLElement>("#cloud-account-status")!;
  const result = wrapper.querySelector<HTMLElement>("#cloud-account-result")!;
  const passwordRow = wrapper.querySelector<HTMLElement>("#cloud-password-row")!;
  const confirmRow = wrapper.querySelector<HTMLElement>("#cloud-confirm-row")!;
  const recoveryRow = wrapper.querySelector<HTMLElement>("#cloud-recovery-row")!;
  const submit = wrapper.querySelector<HTMLButtonElement>("#cloud-account-submit")!;
  let mode: "signup" | "signin" | "reset" = startup ? "signin" : "signup";

  const setMode = (next: "signup" | "signin" | "reset") => {
    mode = next;
    result.innerHTML = "";
    status.textContent = "";
    passwordRow.hidden = false;
    confirmRow.hidden = next !== "signup";
    recoveryRow.hidden = next !== "reset";
    password.autocomplete = next === "signin" ? "current-password" : "new-password";
    recovery.required = next === "reset";
    confirm.required = next === "signup";
    password.required = true;
    submit.textContent = next === "signup" ? "ساخت حساب" : next === "signin" ? "ورود به حساب" : "تغییر رمز";
  };
  wrapper.querySelector("#cloud-account-close")?.addEventListener("click", () => wrapper.remove());
  wrapper.querySelector("#cloud-tab-signup")?.addEventListener("click", () => setMode("signup"));
  wrapper.querySelector("#cloud-tab-signin")?.addEventListener("click", () => setMode("signin"));
  wrapper.querySelector("#cloud-tab-reset")?.addEventListener("click", () => setMode("reset"));
  wrapper.querySelector("#cloud-local-pin")?.addEventListener("click", () => {
    wrapper.remove();
    authScreen(() => onSuccess?.("local"));
  });
  setMode(startup ? "signin" : "signup");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "در حال ارتباط با سرور…";
    result.innerHTML = "";
    submit.disabled = true;
    try {
      const user = username.value.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(user)) throw new Error("نام کاربری باید ۳ تا ۲۴ حرف انگلیسی، عدد یا زیرخط باشد.");
      if (password.value.length < 8 || password.value.length > 128) throw new Error("رمز عبور باید ۸ تا ۱۲۸ کاراکتر باشد.");
      if (mode === "signup") {
        if (password.value !== confirm.value) throw new Error("تکرار رمز عبور با رمز اصلی یکسان نیست.");
        const recoveryCode = makeRecoveryCode();
        await callFunction("quick-processor", { username: user, password: password.value, recoveryCode });
        result.innerHTML = recoveryMarkup(recoveryCode, "حساب ساخته شد. کد بازیابی شما:") + (onSuccess ? '<button class="primary-button wide" id="cloud-continue" type="button">کد را ذخیره کردم؛ ادامه</button>' : "");
        wrapper.querySelector("#cloud-continue")?.addEventListener("click", () => { wrapper.remove(); onSuccess?.("cloud"); });
        wrapper.querySelector("#cloud-copy-recovery")?.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(recoveryCode); status.textContent = "کد بازیابی کپی شد."; }
          catch { status.textContent = "کپی خودکار ممکن نیست؛ کد را انتخاب و کپی کنید."; }
        });
        status.textContent = "ثبت‌نام موفق بود.";
      } else if (mode === "signin") {
        await callFunction("clever-api", { username: user, password: password.value });
        status.textContent = "ورود موفق بود.";
        if (onSuccess) { wrapper.remove(); onSuccess("cloud"); return; }
      } else {
        if (!/^[a-f0-9-]{32,80}$/i.test(recovery.value.trim())) throw new Error("کد بازیابی واردشده معتبر نیست.");
        const newRecoveryCode = makeRecoveryCode();
        await callFunction("dynamic-worker", {
          username: user,
          recoveryCode: recovery.value.trim(),
          newPassword: password.value,
          newRecoveryCode,
        });
        result.innerHTML = recoveryMarkup(newRecoveryCode, "رمز تغییر کرد. کد بازیابی جدید شما:");
        wrapper.querySelector("#cloud-copy-recovery")?.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(newRecoveryCode); status.textContent = "کد بازیابی کپی شد."; }
          catch { status.textContent = "کپی خودکار ممکن نیست؛ کد را انتخاب و کپی کنید."; }
        });
        status.textContent = "بازیابی موفق بود.";
      }
      password.value = "";
      confirm.value = "";
      recovery.value = "";
    } catch (error) {
      const apiError = error as Error & ApiResult;
      status.textContent = apiError instanceof Error ? apiError.message : "درخواست انجام نشد؛ دوباره تلاش کنید.";
      if (apiError.recoveryCodeRotated && apiError.recoveryCode) {
        result.innerHTML = recoveryMarkup(apiError.recoveryCode, "سرور کد بازیابی را تغییر داده است؛ این کد را حتماً ذخیره کنید:");
        wrapper.querySelector("#cloud-copy-recovery")?.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(apiError.recoveryCode!); status.textContent = "کد بازیابی کپی شد."; }
          catch { status.textContent = "کپی خودکار ممکن نیست؛ کد را انتخاب و کپی کنید."; }
        });
      }
    } finally {
      submit.disabled = false;
    }
  });
}
