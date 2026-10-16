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

const BAZAAR_PRODUCT_ID = "Saysay110";

async function requireSignedInUser(): Promise<void> {
  if (!supabase) throw new Error("اتصال حساب کاربری تنظیم نشده است");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("برای مدیریت اشتراک ابتدا وارد حساب سای‌سای شوید");
}

/**
 * Subscription state is authoritative on the Supabase backend.
 * Do not fall back to a device-local trial: it can be reset by reinstalling
 * and must not be confused with a verified store subscription.
 */
export async function getSubscription(): Promise<Subscription> {
  await requireSignedInUser();
  const { data, error } = await supabase!.functions.invoke("subscription-status", {
    method: "GET",
  });
  if (error) throw new Error("وضعیت اشتراک از سرور دریافت نشد");
  if (!data || typeof data !== "object" || !("status" in data)) {
    throw new Error("پاسخ وضعیت اشتراک معتبر نیست");
  }
  return data as Subscription;
}

/**
 * Bazaar billing must be started by the native Android billing bridge.
 * A web checkout URL is intentionally not substituted for a Bazaar purchase.
 */
export async function createMonthlyCheckout(): Promise<string> {
  throw new Error("اتصال خرید کافه‌بازار به نسخه اندروید هنوز کامل نشده است");
}

/** Send the native Bazaar purchase token to the authenticated verification function. */
export async function verifyStorePurchase(purchase: StorePurchase): Promise<Subscription> {
  await requireSignedInUser();
  if (purchase.provider !== "bazaar") {
    throw new Error("در حال حاضر فقط تأیید خرید کافه‌بازار پشتیبانی می‌شود");
  }
  if (purchase.productId !== BAZAAR_PRODUCT_ID || purchase.purchaseToken.trim().length < 8) {
    throw new Error("اطلاعات خرید کافه‌بازار معتبر نیست");
  }
  const { data, error } = await supabase!.functions.invoke("verify-bazaar-purchase", {
    method: "POST",
    body: { productId: purchase.productId, purchaseToken: purchase.purchaseToken },
  });
  if (error) throw new Error("تأیید خرید کافه‌بازار ناموفق بود");
  if (!data || data.status !== "active" || !Number.isFinite(Number(data.expiresAt))) {
    throw new Error(typeof data?.error === "string" ? data.error : "سرور خرید را تأیید نکرد");
  }
  return data as Subscription;
}
