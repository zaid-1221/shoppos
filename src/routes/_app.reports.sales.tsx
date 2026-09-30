import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ChartNoAxesColumn, CircleCheck, FileText, Printer, Receipt, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DateRangePicker, EmptyState, FilterBar, PageHeader, SearchableSelect, StatCard, StatusBadge, useFakeLoading, type Column } from "@/components/shared";
import { saleDue, saleReturnedStats, useDB } from "@/lib/store";
import { fmtDateTime, inRange, pageHead, rs, toDateInput, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import { matchesCategory, parentCategories, type Sale } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/reports/sales")({
  head: pageHead("Sales Report", "Sales performance summary for the selected period."),
  component: SalesReport,
});

function quickRange(preset: string): Range {
  const to = new Date();
  if (preset === "today") return { from: toDateInput(to), to: toDateInput(to) };
  if (preset === "week") {
    const from = new Date();
    from.setDate(from.getDate() - from.getDay());
    return { from: toDateInput(from), to: toDateInput(to) };
  }
  if (preset === "month") {
    const from = new Date();
    from.setDate(1);
    return { from: toDateInput(from), to: toDateInput(to) };
  }
  return { from: "", to: "" };
}

function SalesReport() {
  const db = useDB();
  const loading = useFakeLoading();
  const [preset, setPreset] = useState("month");
  const [range, setRange] = useState<Range>(quickRange("month"));
  const [category, setCategory] = useState("all");
  const [product, setProduct] = useState("all");
  const [staff, setStaff] = useState("all");
  const [method, setMethod] = useState("all");
  const custName = (id: string | null) => db.customers.find((c) => c.id === id)?.name ?? "Walk-in";

  const productOptions = useMemo(() => {
    const list =
      category === "all"
        ? db.products
        : db.products.filter((p) => matchesCategory(db.categories, p.categoryId, category));
    return list.map((p) => ({ value: p.id, label: p.name }));
  }, [db.products, db.categories, category]);

  const staffOptions = useMemo(() => {
    const names = new Set<string>([
      ...db.users.filter((u) => u.status === "Active").map((u) => u.name),
      ...db.sales.map((s) => s.cashier),
    ]);
    return [...names].sort().map((name) => ({ value: name, label: name }));
  }, [db.users, db.sales]);

  const rows = useMemo(() => db.sales.filter((s) => {
    if (!inRange(s.date, range)) return false;
    if (staff !== "all" && s.cashier !== staff) return false;
    if (method !== "all" && s.accountId !== method) return false;
    if (product !== "all") return s.items.some((i) => i.productId === product);
    if (category !== "all") {
      return s.items.some((i) => {
        const pid = db.products.find((p) => p.id === i.productId)?.categoryId;
        return pid ? matchesCategory(db.categories, pid, category) : false;
      });
    }
    return true;
  }), [db, range, category, product, staff, method]);

  const returnsBySale = useMemo(() => {
    const map = new Map<string, { qty: number; amount: number }>();
    for (const s of db.sales) {
      const ret = saleReturnedStats(s, db.saleReturns);
      if (ret.qty) map.set(s.id, ret);
    }
    return map;
  }, [db.sales, db.saleReturns]);

  const summary = useMemo(() => {
    const total = rows.reduce((a, b) => a + b.total, 0);
    const paid = rows.reduce((a, b) => a + b.paid, 0);
    const dueAmt = rows.reduce((a, b) => a + saleDue(b, db.saleReturns), 0);
    let returnedQty = 0;
    let returnedAmt = 0;
    for (const s of rows) {
      const ret = returnsBySale.get(s.id);
      if (!ret) continue;
      returnedQty += ret.qty;
      returnedAmt += ret.amount;
    }
    return {
      total,
      count: rows.length,
      avg: rows.length ? total / rows.length : 0,
      paid,
      due: dueAmt,
      returnedQty,
      returnedAmt,
      net: total - returnedAmt,
    };
  }, [rows, returnsBySale, db.saleReturns]);

  const cols: Column<Sale>[] = [
    { key: "inv", header: "Invoice #", cell: (s) => <span className="font-semibold text-primary">{s.invoiceNo}</span> },
    { key: "date", header: "Date", cell: (s) => <span className="whitespace-nowrap text-sm">{fmtDateTime(s.date)}</span> },
    { key: "cust", header: "Customer", cell: (s) => custName(s.customerId) },
    {
      key: "returned",
      header: "Returned",
      cell: (s) => {
        const ret = returnsBySale.get(s.id);
        if (!ret?.qty) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-right">
            <p className="font-medium text-warning">{ret.qty} pcs</p>
            <p className="text-xs text-muted-foreground">{rs(ret.amount)}</p>
          </div>
        );
      },
      className: "text-right",
    },
    { key: "total", header: "Total", cell: (s) => <b>{rs(s.total)}</b>, className: "text-right" },
    {
      key: "net",
      header: "Net",
      cell: (s) => <b>{rs(s.total - (returnsBySale.get(s.id)?.amount ?? 0))}</b>,
      className: "text-right",
    },
    { key: "paid", header: "Paid", cell: (s) => rs(s.paid), className: "text-right" },
    { key: "due", header: "Due", cell: (s) => { const d = saleDue(s, db.saleReturns); return <span className={d ? "font-medium text-destructive" : ""}>{rs(d)}</span>; }, className: "text-right" },
    { key: "method", header: "Payment", cell: (s) => s.method },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
  ];

  const doPdf = () => {
    exportTablePdf({
      filename: "sales-report.pdf",
      title: "Sales Report",
      shopName: db.settings.shop.name,
      orientation: "landscape",
      columns: [
        { key: "inv", header: "Invoice #", width: 26 },
        { key: "date", header: "Date", width: 32 },
        { key: "cust", header: "Customer", width: 36 },
        { key: "returned", header: "Returned", align: "right", width: 24 },
        { key: "total", header: "Total", align: "right", width: 22 },
        { key: "net", header: "Net", align: "right", width: 22 },
        { key: "paid", header: "Paid", align: "right", width: 22 },
        { key: "due", header: "Due", align: "right", width: 22 },
        { key: "method", header: "Payment", width: 20 },
        { key: "status", header: "Status", width: 20 },
      ],
      rows: rows.map((s) => {
        const ret = returnsBySale.get(s.id);
        return {
          inv: s.invoiceNo,
          date: fmtDateTime(s.date),
          cust: custName(s.customerId),
          returned: ret?.qty ? `${ret.qty} · ${rs(ret.amount)}` : "—",
          total: rs(s.total),
          net: rs(s.total - (ret?.amount ?? 0)),
          paid: rs(s.paid),
          due: rs(saleDue(s, db.saleReturns)),
          method: s.method,
          status: s.status,
        };
      }),
      summary: [
        { label: "Total Sales", value: rs(summary.total) },
        { label: "Returned", value: `${summary.returnedQty} pcs · ${rs(summary.returnedAmt)}` },
        { label: "Net (Sale − Returned)", value: rs(summary.net) },
        { label: "Invoices", value: String(summary.count) },
        { label: "Paid", value: rs(summary.paid) },
        { label: "Due", value: rs(summary.due) },
      ],
    });
  };

  return (
    <div>
      <PageHeader title="Sales Report" description="Detailed sales performance for the selected period." />

      <FilterBar>
        {[{ v: "today", l: "Today" }, { v: "week", l: "This Week" }, { v: "month", l: "This Month" }, { v: "custom", l: "Custom" }].map((p) => (
          <Button key={p.v} size="sm" variant={preset === p.v ? "default" : "outline"} onClick={() => { setPreset(p.v); if (p.v !== "custom") setRange(quickRange(p.v)); }}>{p.l}</Button>
        ))}
        {preset === "custom" && <DateRangePicker value={range} onChange={setRange} />}
        <SearchableSelect
          value={category}
          onChange={(v) => {
            setCategory(v);
            setProduct("all");
          }}
          className="sm:w-44"
          placeholder="All categories"
          options={[{ value: "all", label: "All categories" }, ...parentCategories(db.categories).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <SearchableSelect
          value={product}
          onChange={setProduct}
          className="sm:w-56"
          placeholder="All products"
          options={[{ value: "all", label: "All products" }, ...productOptions]}
        />
        <SearchableSelect
          value={staff}
          onChange={setStaff}
          className="sm:w-44"
          placeholder="All staff"
          options={[{ value: "all", label: "All staff" }, ...staffOptions]}
        />
        <SearchableSelect
          value={method}
          onChange={setMethod}
          className="sm:w-40"
          placeholder="All payments"
          options={[{ value: "all", label: "All payments" }, ...db.accounts.map((a) => ({ value: a.id, label: a.name }))]}
        />
      </FilterBar>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Sales" value={rs(summary.total)} icon={Receipt} />
        <StatCard label="Returned" value={rs(summary.returnedAmt)} hint={`${summary.returnedQty} pcs`} icon={Undo2} tone={summary.returnedAmt ? "warning" : "default"} />
        <StatCard label="Net Sale" value={rs(summary.net)} hint="Sale − Returned" icon={ChartNoAxesColumn} tone="success" />
        <StatCard label="Total Invoices" value={summary.count} icon={FileText} />
        <StatCard label="Paid" value={rs(summary.paid)} icon={CircleCheck} tone="success" />
        <StatCard label="Due" value={rs(summary.due)} icon={AlertCircle} tone="warning" />
      </div>

      <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
          <CardTitle className="text-base">All Sales</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={doPdf}><FileText className="size-4" />PDF</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
          </div>
        </CardHeader>
        <DataTable loading={loading} columns={cols} rows={rows} rowKey={(s) => s.id} empty={<EmptyState icon={Receipt} title="No sales in this period." />} />
      </Card>
    </div>
  );
}
