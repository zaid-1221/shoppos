import type { ShopPlan } from "./mock-data";

/** Monthly platform subscription prices (PKR). */
export const PLAN_PRICES: Record<ShopPlan, number> = {
  Starter: 1500,
  Business: 3500,
  Professional: 6900,
};

export function planPrice(plan: ShopPlan): number {
  return PLAN_PRICES[plan] ?? PLAN_PRICES.Starter;
}

/** Effective monthly fee for a shop (custom override or plan list price). */
export function shopMonthlyFee(shop: { plan: ShopPlan; monthlyFee?: number }): number {
  if (typeof shop.monthlyFee === "number" && shop.monthlyFee >= 0) return shop.monthlyFee;
  return planPrice(shop.plan);
}

/** Billing month key as YYYY-MM. */
export function monthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

/** Last `count` months including current, newest first. */
export function recentMonthKeys(count = 12, from = new Date()): string[] {
  const keys: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < count; i++) {
    keys.push(monthKey(d));
    d.setMonth(d.getMonth() - 1);
  }
  return keys;
}
