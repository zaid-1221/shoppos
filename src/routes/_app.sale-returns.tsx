import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Undo2, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput, DataTable, EmptyState, Field, FilterBar, PageHeader, SearchableSelect, SimpleSelect, StatusBadge, type Column } from "@/components/shared";
import { actions, getState, maxSaleRefund, saleReturnValue, useDB } from "@/lib/store";
import { fmtDate, pageHead, rs } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import { accountIdOf, type Sale, type SaleReturn } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/sale-returns")({
  validateSearch: z.object({ invoice: z.string().optional() }),
  head: pageHead("Sale Returns", "Return sold products and refund customers."),
  component: SaleReturns,
});

const REASONS = ["Defective product", "Wrong model", "Customer changed mind", "Damaged packaging", "Other"];

function normalizeInvoice(raw: string, prefix: string) {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  if (/^\d+$/.test(t)) return `${prefix.toUpperCase()}-${t}`;
  return t;
}

function findSaleByInvoice(raw: string): Sale | undefined {
  const { sales, settings } = getState();
  const key = normalizeInvoice(raw, settings.invoice.prefix);
  if (!key) return undefined;
  const exact =
    sales.find((x) => x.invoiceNo.toUpperCase() === key) ??
    sales.find((x) => x.invoiceNo.toUpperCase().endsWith(key.replace(/^[A-Z]+-/, "")));
  if (exact) return exact;
  // Fuzzy includes only when the query looks like an invoice (has a digit)
  if (/\d/.test(key)) {
    return sales.find((x) => x.invoiceNo.toUpperCase().includes(key));
  }
  return undefined;
}

function findSalesByCustomerName(raw: string): Sale[] {
  const { sales, customers } = getState();
  const key = raw.trim().toLowerCase();
  if (!key) return [];
  const matchIds = new Set(
    customers.filter((c) => c.name.toLowerCase().includes(key)).map((c) => c.id),
  );
  if (!matchIds.size) return [];
  return sales
    .filter((s) => s.customerId && matchIds.has(s.customerId) && s.status !== "Returned")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

function overReturnMessage(name: string, sold: number, already: number, entered: number) {
  const soldPart = already > 0 ? `Sold ${sold} of ${name} (${already} already returned)` : `Sold ${sold} of ${name}`;
  return `${soldPart}, but you are returning ${entered}.`;
}

function SaleReturns() {
  const db = useDB();
  const { invoice } = Route.useSearch();
  const [q, setQ] = useState(invoice ?? "");
  const [saleId, setSaleId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Sale[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState(REASONS[0]!);
  const [customReasons, setCustomReasons] = useState<string[]>([]);
  const [accountId, setAccountId] = useState(accountIdOf("Cash"));
  const [refund, setRefund] = useState(0);
  const reasonOptions = [...REASONS, ...customReasons.filter((r) => !REASONS.includes(r))];
  const sale = db.sales.find((s) => s.id === saleId);
  const customer = sale?.customerId ? db.customers.find((c) => c.id === sale.customerId) : null;
  const customerName = (id: string | null) => db.customers.find((c) => c.id === id)?.name ?? "Walk-in customer";

  const loadSale = (s: Sale, keepList = false) => {
    setSaleId(s.id);
    setQty({});
    if (!keepList) {
      setMatches([]);
      setNameQuery("");
      setQ(s.invoiceNo);
    }
    toast.success(`Loaded ${s.invoiceNo} · ${s.items.length} item${s.items.length === 1 ? "" : "s"} · ${rs(s.total)}`);
  };

  const find = (v = q) => {
    const byInvoice = findSaleByInvoice(v);
    if (byInvoice) {
      loadSale(byInvoice);
      return;
    }
    const byName = findSalesByCustomerName(v);
    if (byName.length === 0) {
      toast.error("No invoice or customer found. Try an invoice number or customer name.");
      setSaleId(null);
      setMatches([]);
      setNameQuery("");
      setQty({});
      return;
    }
    setNameQuery(v.trim());
    setQ(v.trim());
    setMatches(byName);
    setQty({});
    if (byName.length === 1) {
      loadSale(byName[0]!, true);
      return;
    }
    setSaleId(null);
    toast.message(`${byName.length} invoices found. Select one to return.`);
  };

  const backToInvoices = () => {
    setSaleId(null);
    setQty({});
    if (nameQuery) setQ(nameQuery);
  };

  useEffect(() => {
    if (invoice) find(invoice);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const returned = (pid: string) =>
    db.saleReturns
      .filter((r) => r.saleId === saleId)
      .flatMap((r) => r.items)
      .filter((i) => i.productId === pid)
      .reduce((a, b) => a + b.qty, 0);
  const returnItems = sale
    ? sale.items
        .map((i) => {
          const max = Math.max(0, i.qty - returned(i.productId));
          const q = Math.min(qty[i.productId] ?? 0, max);
          return q > 0 ? { ...i, qty: q } : null;
        })
        .filter((i): i is NonNullable<typeof i> => !!i)
    : [];
  const computed = sale ? saleReturnValue(sale, returnItems) : 0;
  const maxRefund = sale ? maxSaleRefund(sale, db.saleReturns, returnItems) : 0;
  const dueCancel = Math.max(0, computed - maxRefund);
  useEffect(() => setRefund(maxRefund), [maxRefund]);

  const submit = () => {
    if (!sale) return;
    const over = sale.items.find((i) => (qty[i.productId] ?? 0) > i.qty - returned(i.productId));
    if (over) {
      const max = over.qty - returned(over.productId);
      toast.error(overReturnMessage(over.name, over.qty, over.qty - max, qty[over.productId] ?? 0));
      return;
    }
    const items = sale.items.filter((i) => (qty[i.productId] ?? 0) > 0).map((i) => ({ ...i, qty: qty[i.productId]! }));
    if (!items.length) {
      toast.error("Select at least one product to return.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Enter a return reason.");
      return;
    }
    const capped = Math.min(Math.max(0, refund), maxSaleRefund(sale, db.saleReturns, items));
    const saved = actions.addSaleReturn({ saleId: sale.id, items, reason: reason.trim(), refund: capped, accountId });
    if (!saved) {
      toast.error("Return quantity is more than the quantity sold on this invoice.");
      return;
    }
    const accName = db.accounts.find((a) => a.id === accountId)?.name ?? "Cash";
    const cancelled = Math.max(0, saleReturnValue(sale, items) - capped);
    toast.success(
      cancelled > 0
        ? `Return saved. ${rs(capped)} refunded via ${accName}. ${rs(cancelled)} unpaid due cleared. Stock updated.`
        : `Return saved. ${rs(capped)} refunded via ${accName}. Stock updated.`,
    );
    setSaleId(null);
    setQty({});
    setReason(REASONS[0]!);
    if (nameQuery) {
      const remaining = findSalesByCustomerName(nameQuery);
      setMatches(remaining);
      setQ(nameQuery);
      if (!remaining.length) setNameQuery("");
    } else {
      setQ("");
      setMatches([]);
    }
  };

  const cols: Column<SaleReturn>[] = [
    { key: "no", header: "Return #", cell: (r) => <b>{r.no}</b> },
    { key: "date", header: "Date", cell: (r) => fmtDate(r.date) },
    { key: "inv", header: "Invoice", cell: (r) => r.invoiceNo },
    { key: "items", header: "Items", cell: (r) => r.items.map((i) => `${i.name} ×${i.qty}`).join(", ") },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "method", header: "Refund method", cell: (r) => r.method },
    { key: "amt", header: "Refund", cell: (r) => <b>{rs(r.refund)}</b>, className: "text-right" },
  ];

  return (
    <div>
      <PageHeader title="Sale Returns" description="Take back products from customers and give refunds." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-base">1. Find the invoice</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); find(); }}>
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (saleId) setSaleId(null);
                  if (matches.length) setMatches([]);
                  if (nameQuery) setNameQuery("");
                }}
                placeholder="Invoice number or customer name"
                className="bg-card"
              />
              <Button type="submit"><Search className="size-4" />Search</Button>
            </form>
            {sale ? (
              <div className="space-y-3">
                {matches.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={backToInvoices}>
                    <ArrowLeft className="size-4" />
                    Back to invoices
                  </Button>
                )}
                <div className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <b>{sale.invoiceNo}</b>
                        <StatusBadge status={sale.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(sale.date)} · {customer?.name ?? "Walk-in customer"} · {sale.cashier}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{rs(sale.total)}</p>
                      <p className="text-xs text-muted-foreground">{sale.items.length} item{sale.items.length === 1 ? "" : "s"} · Paid {rs(sale.paid)}</p>
                    </div>
                  </div>
                  {sale.items.map((i) => {
                    const max = i.qty - returned(i.productId);
                    const entered = qty[i.productId] ?? 0;
                    const on = entered > 0;
                    const over = entered > max;
                    const already = i.qty - max;
                    return (
                      <div key={i.productId} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                        <Checkbox checked={on} disabled={max <= 0} onCheckedChange={(c) => setQty({ ...qty, [i.productId]: c ? Math.min(1, max) : 0 })} />
                        <div className="flex-1 text-sm">
                          <p className="font-medium">{i.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Sold {i.qty} × {rs(i.price)}
                            {max < i.qty && ` · ${already} already returned`}
                            {max <= 0 && " · Fully returned"}
                          </p>
                          {over && (
                            <p className="text-xs text-destructive">{overReturnMessage(i.name, i.qty, already, entered)}</p>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={0}
                          disabled={max <= 0}
                          value={entered}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const next = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)));
                            if (!Number.isFinite(next)) return;
                            if (next > max && entered <= max) toast.error(overReturnMessage(i.name, i.qty, already, next));
                            setQty({ ...qty, [i.productId]: next });
                          }}
                          className={`w-20 ${over ? "border-destructive" : ""}`}
                          aria-label="Return quantity"
                          aria-invalid={over}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : matches.length > 0 ? (
              <div className="rounded-lg border">
                <p className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
                  {matches.length} invoice{matches.length === 1 ? "" : "s"} for {nameQuery || "customer"} — select one to return
                </p>
                {matches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSale(s, true)}
                    className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <b>{s.invoiceNo}</b>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(s.date)} · {customerName(s.customerId)} · {s.items.length} item{s.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="font-semibold">{rs(s.total)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={Undo2} title="Search an invoice to start a return." description="Type an invoice number or customer name and press Search." />
            )}
          </CardContent>
        </Card>
        <Card className="h-fit shadow-none">
          <CardHeader><CardTitle className="text-base">2. Refund details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Return reason">
              <SearchableSelect
                value={reason}
                onChange={setReason}
                options={reasonOptions}
                placeholder="Select or add a reason"
                emptyText="No matching reason."
                onCreate={(label) => {
                  setCustomReasons((prev) => (prev.some((r) => r.toLowerCase() === label.toLowerCase()) ? prev : [...prev, label]));
                  setReason(label);
                }}
              />
            </Field>
            <Field
              label="Refund amount"
              hint={
                computed > 0
                  ? dueCancel > 0
                    ? `Return value ${rs(computed)} · Max refund ${rs(maxRefund)} (unpaid ${rs(dueCancel)} cleared)`
                    : `Return value ${rs(computed)} · Max refund ${rs(maxRefund)}`
                  : `Calculated: ${rs(computed)}`
              }
            >
              <CurrencyInput value={refund} onChange={(v) => setRefund(Math.min(Math.max(0, v), maxRefund || v))} />
            </Field>
            <Field label="Refund account">
              <SimpleSelect
                value={accountId}
                onChange={setAccountId}
                options={db.accounts.filter((a) => a.active && a.type !== "Credit").map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
            <Button className="w-full" disabled={!sale} onClick={submit}><Undo2 className="size-4" />Submit return</Button>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
        <FilterBar>
          <span className="px-1 font-semibold">Return history</span>
          <Button variant="outline" className="sm:ml-auto" onClick={() => {
            exportTablePdf({
              filename: "sale-returns.pdf",
              title: "Sale Returns",
              shopName: db.settings.shop.name,
              orientation: "landscape",
              columns: [
                { key: "no", header: "Return #", width: 24 },
                { key: "date", header: "Date", width: 28 },
                { key: "inv", header: "Invoice", width: 28 },
                { key: "items", header: "Items", width: 70 },
                { key: "reason", header: "Reason", width: 36 },
                { key: "method", header: "Method", width: 24 },
                { key: "amt", header: "Refund", align: "right", width: 28 },
              ],
              rows: db.saleReturns.map((r) => ({
                no: r.no,
                date: fmtDate(r.date),
                inv: r.invoiceNo,
                items: r.items.map((i) => `${i.name} ×${i.qty}`).join(", "),
                reason: r.reason,
                method: r.method,
                amt: rs(r.refund),
              })),
              summary: [{ label: "Total refunded", value: rs(db.saleReturns.reduce((a, r) => a + r.refund, 0)) }],
            });
          }}><FileText className="size-4" />PDF</Button>
        </FilterBar>
        <DataTable columns={cols} rows={db.saleReturns} rowKey={(r) => r.id} empty={<EmptyState title="No returns yet." />} />
      </Card>
    </div>
  );
}
