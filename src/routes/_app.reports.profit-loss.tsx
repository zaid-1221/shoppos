import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, FileText, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker, FilterBar, PageHeader, StatCard } from "@/components/shared";
import { saleProfit, useDB } from "@/lib/store";
import { inRange, pageHead, rs, toDateInput, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";

export const Route = createFileRoute("/_app/reports/profit-loss")({
  head: pageHead("Profit & Loss", "Revenue, cost of goods sold, expenses and net profit summary."),
  component: ProfitLossReport,
});

function ProfitLossReport() {
  const db = useDB();
  const [range, setRange] = useState<Range>(() => {
    const from = new Date(); from.setDate(1);
    return { from: toDateInput(from), to: toDateInput(new Date()) };
  });

  const sales = useMemo(() => db.sales.filter((s) => inRange(s.date, range) && s.status !== "Returned"), [db, range]);
  const expenses = useMemo(() => db.expenses.filter((e) => inRange(e.date, range)), [db, range]);

  const revenue = sales.reduce((a, s) => a + s.total, 0);
  const cogs = sales.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty * i.cost, 0), 0);
  const grossProfit = sales.reduce((a, s) => a + saleProfit(s), 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const doPdf = () => {
    exportTablePdf({
      filename: "profit-loss.pdf",
      title: "Profit & Loss",
      shopName: db.settings.shop.name,
      ...(range.from || range.to ? { subtitle: `${range.from || "…"} → ${range.to || "…"}` } : {}),
      columns: [
        { key: "metric", header: "Metric", width: 100 },
        { key: "amount", header: "Amount", align: "right", width: 50 },
      ],
      rows: [
        { metric: "Total Revenue", amount: rs(revenue) },
        { metric: "Cost of Goods Sold", amount: rs(cogs) },
        { metric: "Gross Profit", amount: rs(grossProfit) },
        { metric: "Total Expenses", amount: rs(totalExpenses) },
        { metric: "Net Profit", amount: rs(netProfit) },
      ],
      summary: [{ label: "Net Profit", value: rs(netProfit) }],
    });
  };

  return (
    <div>
      <PageHeader title="Profit & Loss" description="Financial performance summary for the selected period." />

      <FilterBar>
        <DateRangePicker value={range} onChange={setRange} />
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={doPdf}><FileText className="size-4" />PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
        </div>
      </FilterBar>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Revenue" value={rs(revenue)} icon={Banknote} />
        <StatCard label="Cost of Goods Sold" value={rs(cogs)} icon={TrendingDown} tone="warning" />
        <StatCard label="Gross Profit" value={rs(grossProfit)} icon={TrendingUp} tone="success" />
        <StatCard label="Total Expenses" value={rs(totalExpenses)} icon={Wallet} tone="destructive" />
        <StatCard label="Net Profit" value={rs(netProfit)} icon={TrendingUp} tone={netProfit >= 0 ? "success" : "destructive"} />
      </div>

      <Card className="mt-4 shadow-none">
        <CardHeader><CardTitle className="text-base">Profit Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total Revenue</span><span className="font-medium">{rs(revenue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cost of Goods Sold</span><span className="font-medium text-warning">- {rs(cogs)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="font-medium">Gross Profit</span><span className="font-semibold text-success">{rs(grossProfit)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Expenses</span><span className="font-medium text-destructive">- {rs(totalExpenses)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base"><span className="font-bold">Net Profit</span><span className={netProfit >= 0 ? "font-bold text-success" : "font-bold text-destructive"}>{rs(netProfit)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
