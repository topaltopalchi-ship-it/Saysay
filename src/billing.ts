export type SubscriptionStatus = "active" | "expired" | "pending" | "none";
export type BillingProvider = "web" | "bazaar" | "myket";

export interface Subscription {
  status: SubscriptionStatus;
  plan: "monthly" | "none";
  expiresAt: number | null;
  provider?: BillingProvider;
  isTrial?: boolean;
}

export interface StorePurchase {
  provider: Exclude<BillingProvider, "web">;
  productId: string;
  purchaseToken: string;
}

const API_BASE = (import.meta.env.VITE_BILLING_API_URL as string | undefined)?.replace(/\/$/, "");

/**
 * Subscription entitlements must come from the authenticated server.
 * Never create a trial or grant access locally: local storage and the device
 * clock are user-controlled and a reinstall would reset a local trial.
 */
export async function getSubscription(): Promise<Subscription> {
  if (!API_BASE) {
    throw new Error("سرویس اشتراک پیکربندی نشده است؛ دسترسی آزمایشی محلی فعال نمی‌شود.");
  }

  const response = await fetch(`${API_BASE}/subscription/status`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("وضعیت اشتراک از سرور دریافت نشد");
  return response.json() as Promise<Subscription>;
}

/**
 * Web/PWA checkout. The server decides the amount and provider.
 * Never put gateway secrets in the frontend.
 */
export async function createMonthlyCheckout(): Promise<string> {
  if (!API_BASE) throw new Error("سرویس اشتراک هنوز به سرور سای‌سای متصل نشده است");

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
 * Bazaar/Myket purchase verification.
 * The native Android layer obtains the purchase token from the store SDK,
 * then sends only the token + product id to our backend.
 * The backend verifies the token with the store and grants the entitlement.
 */
export async function verifyStorePurchase(purchase: StorePurchase): Promise<Subscription> {
  if (!API_BASE) throw new Error("سرویس اشتراک هنوز به سرور سای‌سای متصل نشده است");

  const response = await fetch(`${API_BASE}/subscription/store/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(purchase),
  });

  if (!response.ok) throw new Error("تأیید خرید فروشگاه ناموفق بود");
  return response.json() as Promise<Subscription>;
}

/** CafeBazaar subscription product id configured in the developer console. */
export const BAZAAR_SUBSCRIPTION_PRODUCT_ID = "Saysay110";

/**
 * Verify a purchase token obtained from the native CafeBazaar billing SDK.
 * The server must independently enforce this product id and verify the token
 * with CafeBazaar before granting subscription access.
 */
export async function verifyBazaarPurchase(purchaseToken: string): Promise<Subscription> {
  const token = purchaseToken.trim();
  if (!token) throw new Error("رسید خرید کافه‌بازار دریافت نشد");
  return verifyStorePurchase({
    provider: "bazaar",
    productId: BAZAAR_SUBSCRIPTION_PRODUCT_ID,
    purchaseToken: token,
  });
}
