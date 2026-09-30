import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Hash, Printer, Tags, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DateRangePicker, EmptyState, FilterBar, PageHeader, SearchableSelect, StatCard, useFakeLoading, type Column } from "@/components/shared";
import { useDB } from "@/lib/store";
import { fmtDate, inRange, pageHead, rs, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/reports/expenses")({
  head: pageHead("Expenses Report", "Shop expenses broken down by category with full history."),
  component: ExpensesReport,
});

const VIEWS = [
  { value: "history", label: "Expense History" },
  { value: "category", label: "Category-wise Expenses" },
] as const;

type View = (typeof VIEWS)[number]["value"];

type CategoryRow = {
  name: string;
  count: number;
  amount: number;
  share: number;
};

function ExpensesReport() {
  const db = useDB();
  const loading = useFakeLoading();
  const [range, setRange] = useState<Range>({ from: "", to: "" });
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<View>("history");

  const categoryOptions = useMemo(() => {
    const preset = new Set<string>(EXPENSE_CATEGORIES);
    const extras = [...new Set(db.expenses.map((e) => e.category).filter((c) => c && !preset.has(c)))].sort((a, b) =>
      a.localeCompare(b),
    );
    return [...EXPENSE_CATEGORIES, ...extras];
  }, [db.expenses]);

  const rows = useMemo(
    () => db.expenses.filter((e) => inRange(e.date, range) && (category === "all" || e.category === category)),
    [db, range, category],
  );

  const total = rows.reduce((a, e) => a + e.amount, 0);

  const categoryRows = useMemo(() => {
    const m = new Map<string, CategoryRow>();
    rows.forEach((e) => {
      const cur = m.get(e.category) ?? { name: e.category, count: 0, amount: 0, share: 0 };
      cur.count += 1;
      cur.amount += e.amount;
      m.set(e.category, cur);
    });
    return [...m.values()]
      .map((r) => ({ ...r, share: total ? (r.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows, total]);

  const historyCols: Column<Expense>[] = [
    { key: "date", header: "Date", cell: (e) => fmtDate(e.date) },
    { key: "category", header: "Category", cell: (e) => <span className="font-medium">{e.category}</span> },
    { key: "desc", header: "Description", cell: (e) => e.description },
    { key: "amount", header: "Amount", cell: (e) => <b>{rs(e.amount)}</b>, className: "text-right" },
    { key: "method", header: "Method", cell: (e) => e.method },
    { key: "by", header: "Added By", cell: (e) => e.addedBy },
  ];

  const categoryCols: Column<CategoryRow>[] = [
    { key: "name", header: "Category", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "count", header: "Entries", cell: (r) => r.count, className: "text-right" },
    { key: "amount", header: "Amount", cell: (r) => <b>{rs(r.amount)}</b>, className: "text-right" },
    { key: "share", header: "Share", cell: (r) => `${r.share.toFixed(1)}%`, className: "text-right" },
  ];

  const doPdf = () => {
    if (view === "category") {
      exportTablePdf({
        filename: "category-wise-expenses.pdf",
        title: "Category-wise Expenses",
        shopName: db.settings.shop.name,
        columns: [
          { key: "name", header: "Category", width: 50 },
          { key: "count", header: "Entries", align: "right", width: 28 },
          { key: "amount", header: "Amount", align: "right", width: 36 },
          { key: "share", header: "Share", align: "right", width: 28 },
        ],
        rows: categoryRows.map((r) => ({
          name: r.name,
          count: String(r.count),
          amount: rs(r.amount),
          share: `${r.share.toFixed(1)}%`,
        })),
        summary: [
          { label: "Total Expenses", value: rs(total) },
          { label: "Categories", value: String(categoryRows.length) },
        ],
      });
      return;
    }

    exportTablePdf({
      filename: "expenses-report.pdf",
      title: "Expenses Report",
      shopName: db.settings.shop.name,
      orientation: "landscape",
      columns: [
        { key: "date", header: "Date", width: 28 },
        { key: "category", header: "Category", width: 32 },
        { key: "desc", header: "Description", width: 70 },
        { key: "amount", header: "Amount", align: "right", width: 28 },
        { key: "method", header: "Method", width: 24 },
        { key: "by", header: "Added By", width: 28 },
      ],
      rows: rows.map((e) => ({
        date: fmtDate(e.date),
        category: e.category,
        desc: e.description,
        amount: rs(e.amount),
        method: e.method,
        by: e.addedBy,
      })),
      summary: [{ label: "Total Expenses", value: rs(total) }],
    });
  };

  return (
    <div>
      <PageHeader title="Expenses Report" description="Shop expenses by category for the selected period." />

      <FilterBar>
        <SearchableSelect
          value={view}
          onChange={(v) => setView(v as View)}
          className="sm:w-56"
          placeholder="Report type"
          options={[...VIEWS]}
        />
        <DateRangePicker value={range} onChange={setRange} />
        {view === "history" && (
          <SearchableSelect
            value={category}
            onChange={setCategory}
            className="sm:w-44"
            placeholder="All categories"
            options={[{ value: "all", label: "All categories" }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
          />
        )}
      </FilterBar>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Expenses" value={rs(total)} icon={Wallet} tone="destructive" />
        {view === "category" ? (
          <StatCard label="Categories" value={categoryRows.length} icon={Tags} />
        ) : (
          <StatCard label="Number of Expenses" value={rows.length} icon={Hash} />
        )}
        {view === "category" && categoryRows[0] && (
          <StatCard label="Top Category" value={categoryRows[0].name} icon={Trophy} />
        )}
      </div>

      <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-3">
          <CardTitle className="text-base">{view === "category" ? "Category-wise Expenses" : "Expense History"}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={doPdf}><FileText className="size-4" />PDF</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
          </div>
        </CardHeader>
        {view === "category" ? (
          <DataTable
            loading={loading}
            columns={categoryCols}
            rows={categoryRows}
            rowKey={(r) => r.name}
            empty={<EmptyState icon={Wallet} title="No expenses in this period." />}
          />
        ) : (
          <DataTable
            loading={loading}
            columns={historyCols}
            rows={rows}
            rowKey={(e) => e.id}
            empty={<EmptyState icon={Wallet} title="No expenses in this period." />}
          />
        )}
      </Card>
    </div>
  );
}
