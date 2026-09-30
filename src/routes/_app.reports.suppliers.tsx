import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, Eye, FileText, HandCoins, Printer, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, DateRangePicker, EmptyState, FilterBar, PageHeader, SearchableSelect, SearchInput, StatCard, useFakeLoading, type Column } from "@/components/shared";
import { useDB } from "@/lib/store";
import { fmtDate, inRange, pageHead, rs, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import type { Supplier } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/reports/suppliers")({
  head: pageHead("Suppliers Report", "Purchases, payments and dues per supplier."),
  component: SuppliersReport,
});

const BALANCE = [
  { value: "all", label: "All Suppliers" },
  { value: "due", label: "Outstanding Dues" },
  { value: "paid", label: "Fully Paid" },
] as const;

type Balance = (typeof BALANCE)[number]["value"];
type Row = Supplier & { total: number; paid: number; due: number; last: string | undefined };

function SuppliersReport() {
  const db = useDB();
  const loading = useFakeLoading();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [balance, setBalance] = useState<Balance>("all");
  const [range, setRange] = useState<Range>({ from: "", to: "" });

  const cities = useMemo(
    () => [...new Set(db.suppliers.map((s) => s.city).filter(Boolean))].sort(),
    [db.suppliers],
  );

  const rows: Row[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const stats = new Map<string, { total: number; paid: number; last?: string }>();
    for (const p of db.purchases) {
      if (!inRange(p.date, range)) continue;
      const cur = stats.get(p.supplierId) ?? { total: 0, paid: 0 };
      cur.total += p.total;
      cur.paid += p.paid;
      if (!cur.last || p.date > cur.last) cur.last = p.date;
      stats.set(p.supplierId, cur);
    }
    return db.suppliers
      .map((s) => {
        const st = stats.get(s.id) ?? { total: 0, paid: 0 };
        return { ...s, total: st.total, paid: st.paid, due: Math.max(0, st.total - st.paid), last: st.last };
      })
      .filter((r) => {
        if (needle && !`${r.name} ${r.contact} ${r.phone} ${r.city}`.toLowerCase().includes(needle)) return false;
        if (city !== "all" && r.city !== city) return false;
        if (balance === "due" && r.due <= 0) return false;
        if (balance === "paid" && r.due > 0) return false;
        if ((range.from || range.to) && r.total <= 0 && !r.last) return false;
        return true;
      })
      .sort((a, b) => b.total - a.total);
  }, [db.suppliers, db.purchases, q, city, balance, range]);

  const summary = useMemo(() => ({
    total: rows.length,
    purchases: rows.reduce((a, r) => a + r.total, 0),
    paid: rows.reduce((a, r) => a + r.paid, 0),
    outstanding: rows.reduce((a, r) => a + r.due, 0),
  }), [rows]);

  const cols: Column<Row>[] = [
    { key: "name", header: "Supplier", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "city", header: "City", cell: (r) => r.city },
    { key: "purchases", header: "Purchases", cell: (r) => rs(r.total), className: "text-right" },
    { key: "paid", header: "Paid", cell: (r) => rs(r.paid), className: "text-right" },
    { key: "due", header: "Due", cell: (r) => <span className={r.due ? "font-medium text-destructive" : ""}>{rs(r.due)}</span>, className: "text-right" },
    { key: "last", header: "Last Purchase", cell: (r) => (r.last ? fmtDate(r.last) : "—") },
    { key: "actions", header: "", className: "w-10", cell: (r) => <Button asChild variant="ghost" size="sm"><Link to="/suppliers/$id" params={{ id: r.id }}><Eye className="size-4" />View</Link></Button> },
  ];

  const doPdf = () => {
    exportTablePdf({
      filename: "suppliers-report.pdf",
      title: "Suppliers Report",
      shopName: db.settings.shop.name,
      columns: [
        { key: "name", header: "Supplier", width: 45 },
        { key: "city", header: "City", width: 28 },
        { key: "purchases", header: "Purchases", align: "right", width: 28 },
        { key: "paid", header: "Paid", align: "right", width: 28 },
        { key: "due", header: "Due", align: "right", width: 28 },
        { key: "last", header: "Last Purchase", width: 32 },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        city: r.city,
        purchases: rs(r.total),
        paid: rs(r.paid),
        due: rs(r.due),
        last: r.last ? fmtDate(r.last) : "—",
      })),
      summary: [
        { label: "Suppliers", value: String(summary.total) },
        { label: "Purchases", value: rs(summary.purchases) },
        { label: "Outstanding", value: rs(summary.outstanding) },
      ],
    });
  };

  return (
    <div>
      <PageHeader title="Suppliers Report" description="Purchases, payments and outstanding dues per supplier." />

      <FilterBar>
        {BALANCE.map((b) => (
          <Button key={b.value} size="sm" variant={balance === b.value ? "default" : "outline"} onClick={() => setBalance(b.value)}>
            {b.label}
          </Button>
        ))}
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone or city" className="sm:w-64" />
        <SearchableSelect
          value={city}
          onChange={setCity}
          className="sm:w-40"
          placeholder="All cities"
          options={[{ value: "all", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]}
        />
        <DateRangePicker value={range} onChange={setRange} />
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={doPdf}><FileText className="size-4" />PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
        </div>
      </FilterBar>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Suppliers" value={summary.total} icon={Truck} />
        <StatCard label="Total Purchases" value={rs(summary.purchases)} icon={ShoppingBag} />
        <StatCard label="Total Paid" value={rs(summary.paid)} icon={HandCoins} tone="success" />
        <StatCard label="Total Outstanding" value={rs(summary.outstanding)} icon={AlertCircle} tone="warning" />
      </div>

      <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
        <DataTable loading={loading} columns={cols} rows={rows} rowKey={(r) => r.id} pageSize={15} empty={<EmptyState title="No suppliers match these filters." />} />
      </Card>
    </div>
  );
}
