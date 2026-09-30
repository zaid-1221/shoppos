import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Archive, ArrowLeftRight, Boxes, Gauge, History, PackageSearch, PackageX, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared";
import { INVENTORY_REPORTS, type InventoryReportSlug } from "@/lib/inventory-reports";
import { pageHead } from "@/lib/format";

export const Route = createFileRoute("/_app/reports/inventory/")({
  head: pageHead("Inventory Reports", "Stock levels, valuation, movement and product velocity reports."),
  component: InventoryReportsHub,
});

const ICONS: Record<InventoryReportSlug, React.ComponentType<{ className?: string }>> = {
  "current-stock": Boxes,
  "low-stock": AlertTriangle,
  "out-of-stock": PackageX,
  "stock-valuation": Wallet,
  "stock-movement": ArrowLeftRight,
  "stock-adjustment-history": History,
  "fast-moving": TrendingUp,
  "slow-moving": TrendingDown,
  "dead-stock": Archive,
  "product-wise-stock": PackageSearch,
};

function InventoryReportsHub() {
  return (
    <div>
      <PageHeader title="📦 Inventory Reports" description="Choose a stock report to review levels, value, movement and product velocity." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INVENTORY_REPORTS.map((r) => {
          const Icon = ICONS[r.slug];
          return (
            <Link key={r.slug} to="/reports/inventory/$report" params={{ report: r.slug }}>
              <Card className="h-full shadow-none transition-colors hover:border-primary">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{r.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Gauge className="size-4" />
        <span>{INVENTORY_REPORTS.length} inventory reports available</span>
      </div>
    </div>
  );
}
