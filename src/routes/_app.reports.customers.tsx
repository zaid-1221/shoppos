import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertCircle, Eye, FileText, HandCoins, Printer, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, EmptyState, FilterBar, PageHeader, StatCard, useFakeLoading, type Column } from "@/components/shared";
import { customerStats, useDB } from "@/lib/store";
import { fmtDate, pageHead, rs } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import type { Customer } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/reports/customers")({
  head: pageHead("Customers Report", "Sales, payments and dues per customer."),
  component: CustomersReport,
});

type Row = Customer & { total: number; paid: number; due: number; last: string | undefined };

function CustomersReport() {
  const db = useDB();
  const loading = useFakeLoading();

  const rows: Row[] = useMemo(() => {
    return db.customers
      .map((c) => {
        const st = customerStats(db, c.id);
        return { ...c, total: st.total, paid: st.paid, due: st.due, last: st.last };
      })
      .sort((a, b) => b.total - a.total);
  }, [db]);

  const summary = useMemo(() => ({
    total: db.customers.length,
    sales: rows.reduce((a, r) => a + r.total, 0),
    received: rows.reduce((a, r) => a + r.paid, 0),
    outstanding: rows.reduce((a, r) => a + r.due, 0),
  }), [rows, db]);

  const cols: Column<Row>[] = [
    { key: "name", header: "Customer", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "sales", header: "Sales", cell: (r) => rs(r.total), className: "text-right" },
    { key: "paid", header: "Paid", cell: (r) => rs(r.paid), className: "text-right" },
    { key: "due", header: "Due", cell: (r) => <span className={r.due ? "font-medium text-destructive" : ""}>{rs(r.due)}</span>, className: "text-right" },
    { key: "last", header: "Last Purchase", cell: (r) => (r.last ? fmtDate(r.last) : "—") },
    { key: "actions", header: "", className: "w-10", cell: (r) => <Button asChild variant="ghost" size="sm"><Link to="/customers/$id" params={{ id: r.id }}><Eye className="size-4" />View</Link></Button> },
  ];

  const doPdf = () => {
    exportTablePdf({
      filename: "customers-report.pdf",
      title: "Customers Report",
      shopName: db.settings.shop.name,
      columns: [
        { key: "name", header: "Customer", width: 50 },
        { key: "sales", header: "Sales", align: "right", width: 30 },
        { key: "paid", header: "Paid", align: "right", width: 30 },
        { key: "due", header: "Due", align: "right", width: 30 },
        { key: "last", header: "Last Purchase", width: 35 },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        sales: rs(r.total),
        paid: rs(r.paid),
        due: rs(r.due),
        last: r.last ? fmtDate(r.last) : "—",
      })),
      summary: [
        { label: "Customers", value: String(summary.total) },
        { label: "Total Sales", value: rs(summary.sales) },
        { label: "Outstanding", value: rs(summary.outstanding) },
      ],
    });
  };

  return (
    <div>
      <PageHeader title="Customers Report" description="Sales, payments and outstanding dues per customer." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Customers" value={summary.total} icon={Users} />
        <StatCard label="Total Sales" value={rs(summary.sales)} icon={Receipt} />
        <StatCard label="Total Received" value={rs(summary.received)} icon={HandCoins} tone="success" />
        <StatCard label="Total Outstanding" value={rs(summary.outstanding)} icon={AlertCircle} tone="warning" />
      </div>

      <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
        <FilterBar>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={doPdf}><FileText className="size-4" />PDF</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
          </div>
        </FilterBar>
        <DataTable loading={loading} columns={cols} rows={rows} rowKey={(r) => r.id} pageSize={15} empty={<EmptyState title="No customers found." />} />
      </Card>
    </div>
  );
}
