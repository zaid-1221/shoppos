import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, Boxes, CircleCheck, FileText, Package, Printer, ShoppingBag, Truck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DateRangePicker, EmptyState, FilterBar, PageHeader, SearchableSelect, StatCard, StatusBadge, useFakeLoading, type Column } from "@/components/shared";
import { due, useDB } from "@/lib/store";
import { fmtDate, inRange, pageHead, rs, supplierName, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import type { Purchase, PurchaseReturn } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/reports/purchases")({
  head: pageHead("Purchases Report", "Purchase spending by supplier and product with full history."),
  component: PurchasesReport,
});

const VIEWS = [
  { value: "history", label: "Purchase History" },
  { value: "product", label: "Product-wise Purchases" },
  { value: "returns", label: "Purchase Return" },
  { value: "pending", label: "Pending Supplier Payments" },
] as const;

type View = (typeof VIEWS)[number]["value"];

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  qty: number;
  amount: number;
  purchases: number;
};

type PendingRow = Purchase & { dueAmt: number };

function PurchasesReport() {
  const db = useDB();
  const loading = useFakeLoading();
  const [range, setRange] = useState<Range>({ from: "", to: "" });
  const [supplier, setSupplier] = useState("all");
  const [view, setView] = useState<View>("history");
  const supName = (id: string) => supplierName(db.suppliers, id);

  const purchases = useMemo(
    () => db.purchases.filter((p) => inRange(p.date, range) && (supplier === "all" || p.supplierId === supplier)),
    [db, range, supplier],
  );

  const returns = useMemo(
    () => db.purchaseReturns.filter((r) => inRange(r.date, range) && (supplier === "all" || r.supplierId === supplier)),
    [db, range, supplier],
  );

  const productRows = useMemo(() => {
    const map = new Map<string, ProductRow>();
    purchases.forEach((p) => {
      p.items.forEach((it) => {
        const cur = map.get(it.productId) ?? {
          id: it.productId,
          name: it.name,
          sku: db.products.find((x) => x.id === it.productId)?.sku ?? "—",
          qty: 0,
          amount: 0,
          purchases: 0,
        };
        cur.qty += it.qty;
        cur.amount += it.qty * it.price;
        cur.purchases += 1;
        map.set(it.productId, cur);
      });
    });
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [purchases, db.products]);

  const pendingRows = useMemo(
    () => purchases.filter((p) => due(p) > 0).map((p) => ({ ...p, dueAmt: due(p) })).sort((a, b) => b.dueAmt - a.dueAmt),
    [purchases],
  );

  const summary = useMemo(() => {
    if (view === "returns") {
      return {
        total: returns.reduce((a, b) => a + b.amount, 0),
        count: returns.length,
        paid: 0,
        due: 0,
        qty: returns.reduce((a, r) => a + r.items.reduce((x, i) => x + i.qty, 0), 0),
      };
    }
    if (view === "product") {
      return {
        total: productRows.reduce((a, b) => a + b.amount, 0),
        count: productRows.length,
        paid: productRows.reduce((a, b) => a + b.qty, 0),
        due: 0,
        qty: productRows.reduce((a, b) => a + b.qty, 0),
      };
    }
    const rows = view === "pending" ? pendingRows : purchases;
    return {
      total: rows.reduce((a, b) => a + b.total, 0),
      paid: rows.reduce((a, b) => a + b.paid, 0),
      due: rows.reduce((a, b) => a + due(b), 0),
      count: rows.length,
      qty: 0,
    };
  }, [view, purchases, returns, productRows, pendingRows]);

  const historyCols: Column<Purchase>[] = [
    { key: "no", header: "PO #", cell: (p) => <span className="font-semibold text-primary">{p.no}</span> },
    { key: "date", header: "Date", cell: (p) => fmtDate(p.date) },
    { key: "sup", header: "Supplier", cell: (p) => supName(p.supplierId) },
    { key: "total", header: "Total", cell: (p) => <b>{rs(p.total)}</b>, className: "text-right" },
    { key: "paid", header: "Paid", cell: (p) => rs(p.paid), className: "text-right" },
    { key: "due", header: "Due", cell: (p) => <span className={due(p) ? "font-medium text-destructive" : ""}>{rs(due(p))}</span>, className: "text-right" },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  const productCols: Column<ProductRow>[] = [
    { key: "name", header: "Product", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "sku", header: "SKU", cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "purchases", header: "POs", cell: (r) => r.purchases, className: "text-right" },
    { key: "qty", header: "Qty", cell: (r) => r.qty, className: "text-right" },
    { key: "amount", header: "Amount", cell: (r) => <b>{rs(r.amount)}</b>, className: "text-right" },
  ];

  const returnCols: Column<PurchaseReturn>[] = [
    { key: "no", header: "Return #", cell: (r) => <span className="font-semibold text-primary">{r.no}</span> },
    { key: "date", header: "Date", cell: (r) => fmtDate(r.date) },
    { key: "pur", header: "Purchase #", cell: (r) => r.purchaseNo },
    { key: "sup", header: "Supplier", cell: (r) => supName(r.supplierId) },
    { key: "items", header: "Items", cell: (r) => r.items.map((i) => `${i.name} ×${i.qty}`).join(", ") },
    { key: "mode", header: "Status", cell: (r) => <StatusBadge status={r.mode} /> },
    { key: "amt", header: "Amount", cell: (r) => <b>{rs(r.amount)}</b>, className: "text-right" },
  ];

  const pendingCols: Column<PendingRow>[] = [
    { key: "no", header: "PO #", cell: (p) => <span className="font-semibold text-primary">{p.no}</span> },
    { key: "date", header: "Date", cell: (p) => fmtDate(p.date) },
    { key: "sup", header: "Supplier", cell: (p) => supName(p.supplierId) },
    { key: "total", header: "Total", cell: (p) => rs(p.total), className: "text-right" },
    { key: "paid", header: "Paid", cell: (p) => rs(p.paid), className: "text-right" },
    { key: "due", header: "Due", cell: (p) => <span className="font-medium text-destructive">{rs(p.dueAmt)}</span>, className: "text-right" },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  const title = VIEWS.find((v) => v.value === view)?.label ?? "Purchase History";

  const doPdf = () => {
    if (view === "product") {
      exportTablePdf({
        filename: "product-wise-purchases.pdf",
        title: "Product-wise Purchases",
        shopName: db.settings.shop.name,
        orientation: "landscape",
        columns: [
          { key: "name", header: "Product", width: 55 },
          { key: "sku", header: "SKU", width: 28 },
          { key: "purchases", header: "POs", align: "right", width: 18 },
          { key: "qty", header: "Qty", align: "right", width: 18 },
          { key: "amount", header: "Amount", align: "right", width: 28 },
        ],
        rows: productRows.map((r) => ({
          name: r.name,
          sku: r.sku,
          purchases: r.purchases,
          qty: r.qty,
          amount: rs(r.amount),
        })),
        summary: [
          { label: "Products", value: String(summary.count) },
          { label: "Total Qty", value: String(summary.paid) },
          { label: "Amount", value: rs(summary.total) },
        ],
      });
      return;
    }
    if (view === "returns") {
      exportTablePdf({
        filename: "purchase-returns-report.pdf",
        title: "Purchase Return",
        shopName: db.settings.shop.name,
        orientation: "landscape",
        columns: [
          { key: "no", header: "Return #", width: 24 },
          { key: "date", header: "Date", width: 28 },
          { key: "pur", header: "Purchase #", width: 28 },
          { key: "sup", header: "Supplier", width: 40 },
          { key: "items", header: "Items", width: 55 },
          { key: "mode", header: "Status", width: 24 },
          { key: "amt", header: "Amount", align: "right", width: 28 },
        ],
        rows: returns.map((r) => ({
          no: r.no,
          date: fmtDate(r.date),
          pur: r.purchaseNo,
          sup: supName(r.supplierId),
          items: r.items.map((i) => `${i.name} ×${i.qty}`).join(", "),
          mode: r.mode,
          amt: rs(r.amount),
        })),
        summary: [
          { label: "Returns", value: String(summary.count) },
          { label: "Purchase Return Qty", value: String(summary.qty) },
          { label: "Total", value: rs(summary.total) },
        ],
      });
      return;
    }
    const rows = view === "pending" ? pendingRows : purchases;
    exportTablePdf({
      filename: view === "pending" ? "pending-supplier-payments.pdf" : "purchases-report.pdf",
      title,
      shopName: db.settings.shop.name,
      orientation: "landscape",
      columns: [
        { key: "no", header: "PO #", width: 28 },
        { key: "date", header: "Date", width: 28 },
        { key: "sup", header: "Supplier", width: 48 },
        { key: "total", header: "Total", align: "right", width: 28 },
        { key: "paid", header: "Paid", align: "right", width: 28 },
        { key: "due", header: "Due", align: "right", width: 28 },
        { key: "status", header: "Status", width: 24 },
      ],
      rows: rows.map((p) => ({
        no: p.no,
        date: fmtDate(p.date),
        sup: supName(p.supplierId),
        total: rs(p.total),
        paid: rs(p.paid),
        due: rs(due(p)),
        status: p.status,
      })),
      summary: [
        { label: "Total", value: rs(summary.total) },
        { label: "Paid", value: rs(summary.paid) },
        { label: "Due", value: rs(summary.due) },
      ],
    });
  };

  return (
    <div>
      <PageHeader title="Purchases Report" description="Stock purchases by supplier and product for the selected period." />

      <FilterBar>
        {VIEWS.map((v) => (
          <Button key={v.value} size="sm" variant={view === v.value ? "default" : "outline"} onClick={() => setView(v.value)}>
            {v.label}
          </Button>
        ))}
        <DateRangePicker value={range} onChange={setRange} />
        <SearchableSelect
          value={supplier}
          onChange={setSupplier}
          className="sm:w-52"
          placeholder="All suppliers"
          options={[{ value: "all", label: "All suppliers" }, ...db.suppliers.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={doPdf}><FileText className="size-4" />PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
        </div>
      </FilterBar>

      <div className={`mt-4 grid grid-cols-1 gap-3 ${view === "returns" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {view === "returns" ? (
          <>
            <StatCard label="Total Returns" value={summary.count} icon={Undo2} />
            <StatCard label="Purchase Return Qty" value={`${summary.qty} pcs`} hint={rs(summary.total)} icon={Package} tone={summary.qty ? "warning" : "default"} />
            <StatCard label="Return Amount" value={rs(summary.total)} icon={AlertCircle} tone="warning" />
            <StatCard label="Suppliers" value={new Set(returns.map((r) => r.supplierId)).size} icon={Truck} />
          </>
        ) : view === "product" ? (
          <>
            <StatCard label="Products" value={summary.count} icon={Boxes} />
            <StatCard label="Total Qty" value={summary.paid} icon={Package} />
            <StatCard label="Purchase Amount" value={rs(summary.total)} icon={ShoppingBag} />
          </>
        ) : (
          <>
            <StatCard label={view === "pending" ? "Pending Amount" : "Total Purchases"} value={rs(view === "pending" ? summary.due : summary.total)} icon={view === "pending" ? AlertCircle : ShoppingBag} />
            <StatCard label={view === "pending" ? "Pending POs" : "Total Paid"} value={view === "pending" ? summary.count : rs(summary.paid)} icon={view === "pending" ? FileText : CircleCheck} tone="success" />
            <StatCard label="Total Due" value={rs(summary.due)} icon={AlertCircle} tone="warning" />
          </>
        )}
      </div>

      <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b py-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        {view === "product" && (
          <DataTable loading={loading} columns={productCols} rows={productRows} rowKey={(r) => r.id} empty={<EmptyState icon={ShoppingBag} title="No product purchases in this period." />} />
        )}
        {view === "returns" && (
          <DataTable loading={loading} columns={returnCols} rows={returns} rowKey={(r) => r.id} empty={<EmptyState icon={ShoppingBag} title="No purchase returns in this period." />} />
        )}
        {view === "pending" && (
          <DataTable loading={loading} columns={pendingCols} rows={pendingRows} rowKey={(p) => p.id} empty={<EmptyState icon={ShoppingBag} title="No pending supplier payments." />} />
        )}
        {view === "history" && (
          <DataTable loading={loading} columns={historyCols} rows={purchases} rowKey={(p) => p.id} empty={<EmptyState icon={ShoppingBag} title="No purchases in this period." />} />
        )}
      </Card>
    </div>
  );
}
