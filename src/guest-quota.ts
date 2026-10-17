export type GuestFeature = "sales" | "purchases" | "inventory" | "people" | "checks" | "cash" | "orders" | "expenses" | "assistant" | "reports" | "marketRates" | "calculator" | "voiceQuery" | "exports";

const LIMIT = 10;
const PREFIX = "sai-sai-guest-quota-v1:";
const LABELS: Record<GuestFeature, string> = {
  sales: "ثبت فروش",
  purchases: "ثبت خرید",
  inventory: "مدیریت موجودی کالا",
  people: "مدیریت اشخاص",
  checks: "مدیریت چک‌ها",
  cash: "دریافت و پرداخت",
  orders: "مدیریت سفارش‌ها",
  expenses: "ثبت هزینه",
  assistant: "پرسش‌وپاسخ منشی هوشمند",
  reports: "گزارش زنده و گزارش امروز",
  marketRates: "دریافت نرخ لحظه‌ای بازار",
  calculator: "ماشین حساب",
  voiceQuery: "از سای‌سای بپرس؛ پرسش هوشمند صوتی",
  exports: "تمام خروجی‌ها (فاکتور، گزارش و پشتیبان)",
};

function isGuestMode(): boolean {
  return localStorage.getItem("sai-sai-unlocked") === "1"
    && !localStorage.getItem("sai-sai-account-username");
}

function usage(feature: GuestFeature): number {
  const value = Number(localStorage.getItem(PREFIX + feature) || "0");
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function showLimitDialog(feature: GuestFeature): void {
  document.querySelector("#guest-quota-modal")?.remove();
  const modal = document.createElement("div");
  modal.id = "guest-quota-modal";
  modal.className = "modal-backdrop auth-backdrop";
  modal.innerHTML = `<section class="modal auth-modal" dir="rtl">
    <div class="auth-mark">س</div>
    <h2>سهمیه رایگان این قابلیت تمام شد</h2>
    <p class="muted">سهمیه رایگان «${LABELS[feature]}» تمام شده است. برای ادامه، حساب بسازید یا وارد حساب خود شوید؛ سپس پنجره خرید اشتراک باز می‌شود.</p>
    <button id="guest-quota-account" class="primary-button wide" type="button">ساخت حساب / ورود و خرید اشتراک</button>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector("#guest-quota-account")?.addEventListener("click", () => {
    modal.remove();
    window.dispatchEvent(new CustomEvent("sai-sai-quota-account"));
  });
}

/** Checks the per-feature guest allowance without counting a cancelled or failed action. */
export function assertGuestFeatureAvailable(feature: GuestFeature): void {
  if (!isGuestMode()) return;
  if (usage(feature) >= LIMIT) {
    showLimitDialog(feature);
    throw new Error("سهمیه رایگان این قابلیت تمام شده است.");
  }
}

/** Call only after the requested operation has completed successfully. */
export function recordGuestFeatureUse(feature: GuestFeature): void {
  if (!isGuestMode()) return;
  localStorage.setItem(PREFIX + feature, String(Math.min(LIMIT, usage(feature) + 1)));
}

export async function withGuestFeature<T>(feature: GuestFeature, action: () => Promise<T>): Promise<T> {
  assertGuestFeatureAvailable(feature);
  const result = await action();
  recordGuestFeatureUse(feature);
  return result;
}
