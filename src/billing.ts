import { supabase } from "./auth";
export type SubscriptionStatus = "active" | "expired" | "pending" | "none";
export type BillingProvider = "web" | "bazaar" | "myket";

export interface Subscription {
  status: SubscriptionStatus;
  plan: "monthly" | "none";
  expiresAt: number | null;
  provider?: BillingProvider;
  isTrial?: boolean;
  priceToman?: number;
  durationDays?: number;
}

export interface StorePurchase {
  provider: Exclude<BillingProvider, "web">;
  productId: string;
  purchaseToken: string;
}

const API_BASE = (import.meta.env.VITE_BILLING_API_URL as string | undefined)?.replace(/\/$/, "");
const BILLING_DISABLED = (import.meta.env.VITE_BILLING_DISABLED as string | undefined) === "true";
const TRIAL_DAYS = 30;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const TRIAL_STARTED_KEY = "sai-sai-trial-started-at-v3";

function getTrialStartedAt(): number {
  const stored = Number(localStorage.getItem(TRIAL_STARTED_KEY));
  if (Number.isFinite(stored) && stored > 0) return stored;
  const now = Date.now();
  localStorage.setItem(TRIAL_STARTED_KEY, String(now));
  return now;
}

function getLocalTrialSubscription(): Subscription {
  const startedAt = getTrialStartedAt();
  const expiresAt = startedAt + TRIAL_MS;
  return Date.now() < expiresAt
    ? { status: "active", plan: "monthly", expiresAt, provider: "web", isTrial: true, priceToman: 100000, durationDays: 30 }
    : { status: "expired", plan: "none", expiresAt, provider: "web", isTrial: true, priceToman: 100000, durationDays: 30 };
}

/** The authenticated account's entitlement is decided by Supabase, not the device clock. */
export async function getSubscription(): Promise<Subscription> {
  if (BILLING_DISABLED) return getLocalTrialSubscription();

  if (supabase) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error("نشست حساب کاربری بررسی نشد");
    if (sessionData.session) {
      const { data, error } = await supabase.functions.invoke("subscription-status", { method: "POST" });
      if (error) throw new Error("وضعیت اشتراک از سرور دریافت نشد");
      const subscription = data as Subscription;
      if (!subscription || !["active", "expired", "pending", "none"].includes(subscription.status)) {
        throw new Error("پاسخ وضعیت اشتراک معتبر نیست");
      }
      return subscription;
    }
  }

  if (API_BASE) {
    const response = await fetch(`${API_BASE}/subscription/status`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("وضعیت اشتراک دریافت نشد");
    return response.json() as Promise<Subscription>;
  }

  // Guest mode is a local-only preview trial. Account trial is server-authoritative.
  return getLocalTrialSubscription();
}

/** Web/PWA checkout. The server decides the amount and provider. */
export async function createMonthlyCheckout(): Promise<string> {
  if (!API_BASE) throw new Error("پرداخت اینترنتی هنوز به سرویس پرداخت متصل نشده است");

  const response = await fetch(`${API_BASE}/subscription/checkout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ plan: "monthly", provider: "web" }),
  });

  if (!response.ok) throw new Error("ایجاد پرداخت ناموفق بود");
  const data = (await response.json()) as { checkoutUrl?: string };
  if (!data.checkoutUrl) throw new Error("لینک پرداخت معتبر دریافت نشد");
  return data.checkoutUrl;
}

/**
 * Store purchases must be verified by a trusted backend before entitlement is granted.
 * This endpoint is intentionally not called until the Android Bazaar SDK/product ID
 * and the backend's official Bazaar verification credentials are configured.
 */
export async function verifyStorePurchase(purchase: StorePurchase): Promise<Subscription> {
  if (!API_BASE) throw new Error("تأیید خرید کافه‌بازار هنوز به سرویس اشتراک متصل نشده است");

  const response = await fetch(`${API_BASE}/subscription/store/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(purchase),
  });

  if (!response.ok) throw new Error("تأیید خرید فروشگاه ناموفق بود");
  return response.json() as Promise<Subscription>;
}
