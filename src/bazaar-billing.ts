import { Capacitor } from "@capacitor/core";
import { CafebazaarPoolakey } from "@salarizadi/capacitor-cafebazaar-poolakey";
import { verifyStorePurchase, type Subscription } from "./billing";

// This is the public key from the Bazaar developer console; it is not a secret.
const BAZAAR_RSA_PUBLIC_KEY = "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwDYeg6mGAfKgsLxOw3GaQ9O4Mzl/u5pMLoAx+6fHpYWm/3XdDv2ss56E64QUrsxaRjWNCoO3Z+nTX3YjPWn4zOR82gnRgpt3XcJmSFEMFYiGtNlFjE3r2HX0wKb5mJE/cvXDMvtQmrdqnbEd/Bt6jTK32DDyEEU+D2HJvLl4TQY2esERavDZdUMp9dYfM9v+Pwa1akYdTwRAXYZTfXN2ROyiTDWQu7gXB92eYAbVyUCAwEAAQ==";
const BAZAAR_PRODUCT_ID = "Saysay110";

export async function purchaseBazaarMonthly(): Promise<Subscription> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    throw new Error("پرداخت کافه‌بازار فقط در نسخه اندروید نصب‌شده از بازار در دسترس است");
  }

  try {
    await CafebazaarPoolakey.initialize({ rsaPublicKey: BAZAAR_RSA_PUBLIC_KEY });
    const result = await CafebazaarPoolakey.purchaseProduct({
      productId: BAZAAR_PRODUCT_ID,
      payload: "saysay-monthly",
    });

    if (result.state === "CANCELLED") throw new Error("پرداخت لغو شد");
    if (result.state !== "PURCHASED" || !result.purchase?.purchaseToken) {
      throw new Error("کافه‌بازار خرید را تأیید نکرد؛ مبلغی را دوباره پرداخت نکنید و وضعیت خرید را بررسی کنید");
    }

    // Only the trusted server may grant subscription access.
    return await verifyStorePurchase({
      provider: "bazaar",
      productId: BAZAAR_PRODUCT_ID,
      purchaseToken: result.purchase.purchaseToken,
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("ارتباط با کافه‌بازار یا تأیید خرید ناموفق بود");
  }
}
