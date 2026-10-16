import { supabase } from "./auth";

export type LimitedFeature =
  | "calculator" | "voice_secretary" | "voice_sale" | "voice_purchase" | "voice_product"
  | "multi_item_voice" | "smart_pricing" | "market_prices" | "smart_report"
  | "advanced_reports" | "manual_sale" | "manual_purchase" | "product_create";

export interface QuotaResult {
  allowed: boolean;
  unlimited?: boolean;
  feature: string;
  used?: number;
  quota?: number | null;
  remaining?: number;
  resetsAt?: string;
  reason?: string;
}

export async function consumeFeatureQuota(feature: LimitedFeature): Promise<QuotaResult> {
  if (!supabase) throw new Error("اتصال امن سرور سهمیه فعال نیست؛ لطفاً اتصال را بررسی کنید.");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error("برای استفاده از این قابلیت ابتدا وارد حساب شوید.");
  const { data, error } = await supabase.functions.invoke("feature-usage", {
    method: "POST", body: { action: "consume", feature },
  });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 429) throw new Error("سهمیه روزانه این قابلیت تمام شده است. فردا دوباره تلاش کنید یا اشتراک را فعال کنید.");
    throw new Error("بررسی سهمیه از سرور انجام نشد؛ برای جلوگیری از دور زدن محدودیت، عملیات ادامه پیدا نکرد.");
  }
  const result = data as QuotaResult;
  if (!result?.allowed) {
    if (result?.reason === "subscription_required") throw new Error("مهلت آزمایشی حساب تمام شده است؛ برای ادامه اشتراک را فعال کنید.");
    throw new Error(`سهمیه امروز این قابلیت تمام شده است (${result?.used ?? 0}/${result?.quota ?? 0}). فردا دوباره تلاش کنید یا اشتراک را فعال کنید.`);
  }
  return result;
}