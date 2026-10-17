/**
 * Myket free-release billing stub.
 * Paid store integrations remain on the separate feature branch for future use.
 */
export type SubscriptionStatus = "active" | "expired" | "pending" | "none";
export type BillingProvider = "web" | "myket";

export interface Subscription {
  status: SubscriptionStatus;
  plan: "monthly" | "none";
  expiresAt: number | null;
  provider?: BillingProvider;
  isTrial?: boolean;
  priceToman?: number;
  durationDays?: number;
}

export async function getSubscription(): Promise<Subscription> {
  return { status: "active", plan: "monthly", expiresAt: null, provider: "web" };
}
