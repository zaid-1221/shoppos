import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart3, Boxes, ShoppingBag, TrendingUp, Truck, Users, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared";
import { due, saleDue, saleProfit, useDB } from "@/lib/store";
import { pageHead, rs } from "@/lib/format";

export const Route = createFileRoute("/_app/reports/")({
  head: pageHead("Reports", "Business reports for sales, purchases, profit, inventory, customers and suppliers."),
  component: ReportsIndex,
});

function ReportsIndex() {
  const db = useDB();
  const figures = useMemo(() => {
    const totalSales = db.sales.reduce((a, s) => a + s.total, 0);
    const totalPurchases = db.purchases.reduce((a, p) => a + p.total, 0);
    const grossProfit = db.sales.reduce((a, s) => a + saleProfit(s), 0);
    const totalExpenses = db.expenses.reduce((a, e) => a + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const stockValue = db.products.reduce((a, p) => a + p.stock * p.purchasePrice, 0);
    const receivable = db.sales.reduce((a, s) => a + saleDue(s, db.saleReturns), 0);
    const payable = db.purchases.reduce((a, p) => a + due(p), 0);
    return { totalSales, totalPurchases, netProfit, stockValue, receivable, payable, totalExpenses };
  }, [db]);

  const cards = [
    { to: "/reports/sales" as const, name: "Sales Report", icon: BarChart3, description: "Revenue, invoices and payment breakdowns.", figure: rs(figures.totalSales) },
    { to: "/reports/purchases" as const, name: "Purchases Report", icon: ShoppingBag, description: "Stock purchases by supplier and product.", figure: rs(figures.totalPurchases) },
    { to: "/reports/profit-loss" as const, name: "Profit & Loss", icon: TrendingUp, description: "Revenue, cost of goods sold and net profit.", figure: rs(figures.netProfit) },
    { to: "/reports/inventory" as const, name: "Inventory Reports", icon: Boxes, description: "Current stock, valuation, movement and velocity reports.", figure: rs(figures.stockValue) },
    { to: "/reports/customers" as const, name: "Customers Report", icon: Users, description: "Sales, payments and dues per customer.", figure: rs(figures.receivable) },
    { to: "/reports/suppliers" as const, name: "Suppliers Report", icon: Truck, description: "Purchases, payments and dues per supplier.", figure: rs(figures.payable) },
    { to: "/reports/expenses" as const, name: "Expenses Report", icon: Wallet, description: "Shop expenses broken down by category.", figure: rs(figures.totalExpenses) },
  ];

  return (
    <div>
      <PageHeader title="Reports" description="Pick a report to view detailed figures for your shop." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="h-full shadow-none transition-colors hover:border-primary">
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="mb-3 grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <c.icon className="size-5" />
                  </div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  <p className="mt-3 text-lg font-bold tracking-tight">{c.figure}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
