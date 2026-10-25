import { supabase } from "./auth";
import { Capacitor } from "@capacitor/core";
import { Poolakey } from "capacitor-poolakey";

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
// CafeBazaar's RSA public key is public by design (it is used only to verify the
// store connection on-device). Keep a build-time override for deployments that rotate it,
// but fall back to the registered public key so a missing GitHub build secret cannot disable
// the purchase button in a released APK.
const BAZAAR_RSA_PUBLIC_KEY = (
  (import.meta.env.VITE_CAFEBAZAAR_RSA_PUBLIC_KEY as string | undefined) ||
  "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwDYeg6mGAfKgsLxOw3GaQ9O4Mzl/u5pMLoAx+6fHpYWm/3XdDv2ss56E64QUrsxaRjWNCoO3Z+nTX3YjPWn4zOR82gnRgpt3XcJmSFEMFYiGtNlFjE3r2HX0wKb5mJE/cvXDMvtQmrdqnbEd/Bt6jTK32DDyEEU+D2HJvLl4TQY2esERavDZdUMp9dYfM9v+Pwa1akYdTwRAXYZTfXN2ROyiTDWQu7gXB92eYAbVyUCAwEAAQ=="
).trim();

async function requireSignedInUser(): Promise<void> {
  if (!supabase) throw new Error("اتصال حساب کاربری تنظیم نشده است");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("برای مدیریت اشتراک ابتدا وارد حساب سای‌سای شوید");
}

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
 * Start a native CafeBazaar subscription purchase, then activate it only
 * after the authenticated Supabase Edge Function verifies the purchase token.
 */
export async function createMonthlyCheckout(): Promise<Subscription> {
  await requireSignedInUser();
  if (Capacitor.getPlatform() !== "android") {
    throw new Error("خرید اشتراک فعلاً فقط در نسخه اندروید کافه‌بازار در دسترس است.");
  }
  if (!BAZAAR_RSA_PUBLIC_KEY) {
    throw new Error("کلید عمومی کافه‌بازار تنظیم نشده است؛ مدیر پروژه باید CAFEBAZAAR_RSA_PUBLIC_KEY را در Secrets ساخت اندروید ثبت کند.");
  }

  let connected = false;
  try {
    await Poolakey.connectPayment(BAZAAR_RSA_PUBLIC_KEY);
    connected = true;
    const purchase = await Poolakey.subscribeProduct(BAZAAR_PRODUCT_ID, "sai-sai-monthly-v1");
    if (purchase.productId !== BAZAAR_PRODUCT_ID || !purchase.purchaseToken) {
      throw new Error("اطلاعات خرید اشتراک از کافه‌بازار معتبر نیست.");
    }
    if (purchase.purchaseState !== 0) {
      throw new Error("کافه‌بازار خرید را کامل‌شده اعلام نکرد.");
    }
    return await verifyStorePurchase({
      provider: "bazaar",
      productId: purchase.productId,
      purchaseToken: purchase.purchaseToken,
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("خرید اشتراک از کافه‌بازار ناموفق بود.");
  } finally {
    if (connected) {
      try { await Poolakey.disconnectPayment(); } catch { /* Do not mask purchase/verification result. */ }
    }
  }
}

/**
 * Restore an existing CafeBazaar subscription without starting a new checkout.
 * The store inventory is queried and each matching token is verified server-side.
 */
export async function restoreMonthlySubscription(): Promise<Subscription> {
  await requireSignedInUser();
  if (Capacitor.getPlatform() !== "android") {
    throw new Error("بازیابی خرید فقط در نسخه اندروید کافه‌بازار در دسترس است.");
  }

  let connected = false;
  try {
    await Poolakey.connectPayment(BAZAAR_RSA_PUBLIC_KEY);
    connected = true;
    const result = await Poolakey.getSubscribedProducts();
    const purchases = Array.isArray(result?.list) ? result.list : [];
    const matching = purchases.filter((item) =>
      item.productId === BAZAAR_PRODUCT_ID &&
      item.purchaseState === 0 &&
      typeof item.purchaseToken === "string" &&
      item.purchaseToken.trim().length >= 8
    );
    if (!matching.length) {
      throw new Error("خرید فعالی برای این محصول در حساب کافه‌بازار پیدا نشد. با همان حساب کافه‌بازاری وارد شوید که خرید را انجام داده است.");
    }

    let lastError: unknown;
    for (const purchase of matching) {
      try {
        return await verifyStorePurchase({
          provider: "bazaar",
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("بازیابی خرید و تأیید سرور ناموفق بود.");
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("بازیابی خرید از کافه‌بازار ناموفق بود.");
  } finally {
    if (connected) {
      try { await Poolakey.disconnectPayment(); } catch { /* Preserve restore result. */ }
    }
  }
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
