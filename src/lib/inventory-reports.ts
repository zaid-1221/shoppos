import type { Adjustment, Product } from "@/lib/mock-data";
import { stockStatus, type useDB } from "@/lib/store";

export type InventoryReportSlug =
  | "current-stock"
  | "low-stock"
  | "out-of-stock"
  | "stock-valuation"
  | "stock-movement"
  | "stock-adjustment-history"
  | "fast-moving"
  | "slow-moving"
  | "dead-stock"
  | "product-wise-stock";

export type InventoryReportMeta = {
  slug: InventoryReportSlug;
  name: string;
  description: string;
};

export const INVENTORY_REPORTS: InventoryReportMeta[] = [
  { slug: "current-stock", name: "Current Stock", description: "Live stock quantity for every product in catalogue." },
  { slug: "low-stock", name: "Low Stock", description: "Products at or below their minimum stock level." },
  { slug: "out-of-stock", name: "Out of Stock", description: "Products with zero quantity available." },
  { slug: "stock-valuation", name: "Stock Valuation", description: "Inventory value at purchase and sale price." },
  { slug: "stock-movement", name: "Stock Movement", description: "Sales, purchases, returns and adjustments over time." },
  { slug: "stock-adjustment-history", name: "Stock Adjustment History", description: "Manual add, remove, damage and correction log." },
  { slug: "fast-moving", name: "Fast-Moving Products", description: "Top sellers by quantity sold in the period." },
  { slug: "slow-moving", name: "Slow-Moving Products", description: "Products with stock that sell infrequently." },
  { slug: "dead-stock", name: "Dead Stock", description: "Products with stock but no sales in the period." },
  { slug: "product-wise-stock", name: "Product-wise Stock", description: "Full stock detail by product, brand and category." },
];

export function isInventoryReportSlug(v: string): v is InventoryReportSlug {
  return INVENTORY_REPORTS.some((r) => r.slug === v);
}

export function inventoryReportMeta(slug: string): InventoryReportMeta | undefined {
  return INVENTORY_REPORTS.find((r) => r.slug === slug);
}

export type Db = ReturnType<typeof useDB>;

export type StockMovementRow = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  kind: string;
  detail: string;
  change: number;
};

export function allStockMovements(db: Db): StockMovementRow[] {
  const byId = new Map(db.products.map((p) => [p.id, p]));
  const rows: StockMovementRow[] = [];

  for (const a of db.adjustments) {
    const p = byId.get(a.productId);
    if (!p) continue;
    rows.push({
      id: a.id,
      date: a.date,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      kind: a.type,
      detail: a.reason || "Stock adjustment",
      change: a.after - a.before,
    });
  }
  for (const s of db.sales) {
    for (const it of s.items) {
      const p = byId.get(it.productId);
      if (!p) continue;
      rows.push({
        id: `${s.id}-${it.productId}`,
        date: s.date,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        kind: "Sale",
        detail: s.invoiceNo,
        change: -it.qty,
      });
    }
  }
  for (const p of db.purchases) {
    for (const it of p.items) {
      const prod = byId.get(it.productId);
      if (!prod) continue;
      rows.push({
        id: `${p.id}-${it.productId}`,
        date: p.date,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        kind: "Purchase",
        detail: p.no,
        change: it.qty,
      });
    }
  }
  for (const r of db.saleReturns) {
    for (const it of r.items) {
      const p = byId.get(it.productId);
      if (!p) continue;
      rows.push({
        id: `${r.id}-${it.productId}`,
        date: r.date,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        kind: "Sale return",
        detail: r.invoiceNo,
        change: it.qty,
      });
    }
  }
  for (const r of db.purchaseReturns) {
    for (const it of r.items) {
      const p = byId.get(it.productId);
      if (!p) continue;
      rows.push({
        id: `${r.id}-${it.productId}`,
        date: r.date,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        kind: "Purchase return",
        detail: r.purchaseNo,
        change: -it.qty,
      });
    }
  }
  return rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export type SoldQtyRow = Product & { soldQty: number; soldValue: number };

export function soldByProduct(db: Db, fromMs?: number, toMs?: number): SoldQtyRow[] {
  const map = new Map<string, { soldQty: number; soldValue: number }>();
  for (const s of db.sales) {
    const t = +new Date(s.date);
    if (fromMs != null && t < fromMs) continue;
    if (toMs != null && t > toMs) continue;
    for (const it of s.items) {
      const cur = map.get(it.productId) ?? { soldQty: 0, soldValue: 0 };
      cur.soldQty += it.qty;
      cur.soldValue += it.qty * it.price;
      map.set(it.productId, cur);
    }
  }
  return db.products.map((p) => {
    const sold = map.get(p.id) ?? { soldQty: 0, soldValue: 0 };
    return { ...p, ...sold };
  });
}

export function filterProducts(slug: InventoryReportSlug, products: Product[], sold: SoldQtyRow[]): SoldQtyRow[] {
  const soldMap = new Map(sold.map((p) => [p.id, p]));
  const withSold = (list: Product[]): SoldQtyRow[] =>
    list.map((p) => soldMap.get(p.id) ?? { ...p, soldQty: 0, soldValue: 0 });

  switch (slug) {
    case "current-stock":
    case "stock-valuation":
    case "product-wise-stock":
      return withSold(products);
    case "low-stock":
      return withSold(products.filter((p) => stockStatus(p) === "Low Stock"));
    case "out-of-stock":
      return withSold(products.filter((p) => stockStatus(p) === "Out of Stock"));
    case "fast-moving":
      return [...sold].filter((p) => p.soldQty > 0).sort((a, b) => b.soldQty - a.soldQty);
    case "slow-moving":
      return [...sold].filter((p) => p.stock > 0 && p.soldQty > 0 && p.soldQty <= 3).sort((a, b) => a.soldQty - b.soldQty);
    case "dead-stock":
      return [...sold].filter((p) => p.stock > 0 && p.soldQty === 0).sort((a, b) => b.stock * b.purchasePrice - a.stock * a.purchasePrice);
    default:
      return withSold(products);
  }
}

export type AdjustmentRow = Adjustment & { productName: string; sku: string };

export function adjustmentRows(db: Db): AdjustmentRow[] {
  const byId = new Map(db.products.map((p) => [p.id, p]));
  return db.adjustments.map((a) => {
    const p = byId.get(a.productId);
    return { ...a, productName: p?.name ?? "—", sku: p?.sku ?? "—" };
  });
}
