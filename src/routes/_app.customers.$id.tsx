import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, FileText, HandCoins, Pencil, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, EmptyState, Field, PageHeader, SearchableSelect, StatCard, StatusBadge, type Column } from "@/components/shared";
import { PaymentDialog } from "@/components/payment-dialog";
import { actions, customerStats, saleDue, useDB } from "@/lib/store";
import { fmtDate, fmtDateTime, pageHead, rs } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import { CITIES, type Payment, type Sale } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/customers/$id")({
  head: pageHead("Customer Details", "Customer profile, purchase and payment history."),
  component: CustomerDetail,
});

type Form = { name: string; phone: string; email: string; address: string; city: string };
type PayRow = Payment & { invoiceNo: string; saleId: string };

function CustomerDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const customer = db.customers.find((c) => c.id === id);
  const [edit, setEdit] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [pay, setPay] = useState(false);

  const cities = useMemo(() => {
    const fromData = [...db.customers.map((c) => c.city), ...(customer ? [customer.city] : [])].filter(Boolean);
    return [...new Set([...CITIES, ...fromData])].sort();
  }, [db.customers, customer]);

  if (!customer) {
    return <Card><EmptyState error title="Customer not found." description="It may have been removed." action={<Button asChild variant="outline"><Link to="/customers">Back to customers</Link></Button>} /></Card>;
  }

  const stats = customerStats(db, customer.id);
  const payments: PayRow[] = stats.list
    .flatMap((s) => s.payments.map((p) => ({ ...p, invoiceNo: s.invoiceNo, saleId: s.id })))
    .sort((a, b) => b.date.localeCompare(a.date));

  const downloadStatement = () => {
    exportTablePdf({
      filename: `${customer.name.replace(/\s+/g, "-").toLowerCase()}-statement.pdf`,
      title: `Customer Statement — ${customer.name}`,
      shopName: db.settings.shop.name,
      ...(customer.phone || customer.city ? { subtitle: [customer.phone, customer.city].filter(Boolean).join(" · ") } : {}),
      columns: [
        { key: "inv", header: "Invoice #", width: 30 },
        { key: "date", header: "Date", width: 40 },
        { key: "total", header: "Total", align: "right", width: 28 },
        { key: "paid", header: "Paid", align: "right", width: 28 },
        { key: "due", header: "Due", align: "right", width: 28 },
        { key: "status", header: "Status", width: 24 },
      ],
      rows: stats.list.map((s) => ({
        inv: s.invoiceNo,
        date: fmtDateTime(s.date),
        total: rs(s.total),
        paid: rs(s.paid),
        due: rs(saleDue(s, db.saleReturns)),
        status: s.status,
      })),
      summary: [
        { label: "Total purchases", value: rs(stats.total) },
        { label: "Total paid", value: rs(stats.paid) },
        { label: "Total due", value: rs(stats.due) },
      ],
    });
  };

  const validate = (f: Form) => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!f.name.trim()) e.name = "Name is required.";
    if (f.phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(f.phone.trim())) e.phone = "Enter a valid phone number.";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email.";
    return e;
  };
  const save = () => {
    if (!edit) return;
    const e = validate(edit);
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.saveCustomer({ ...edit, id: customer.id });
    toast.success("Customer updated.");
    setEdit(null);
  };

  const saleCols: Column<Sale>[] = [
    { key: "inv", header: "Invoice #", cell: (s) => <span className="font-semibold text-primary">{s.invoiceNo}</span> },
    { key: "date", header: "Date", cell: (s) => fmtDateTime(s.date) },
    { key: "total", header: "Total", cell: (s) => rs(s.total), className: "text-right" },
    { key: "paid", header: "Paid", cell: (s) => rs(s.paid), className: "text-right" },
    { key: "due", header: "Due", cell: (s) => rs(saleDue(s, db.saleReturns)), className: "text-right" },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
  ];

  const payCols: Column<PayRow>[] = [
    { key: "date", header: "Date", cell: (p) => fmtDateTime(p.date) },
    { key: "inv", header: "Invoice #", cell: (p) => <span className="font-medium text-primary">{p.invoiceNo}</span> },
    { key: "method", header: "Method", cell: (p) => p.method },
    { key: "amount", header: "Amount", cell: (p) => <span className="font-semibold">{rs(p.amount)}</span>, className: "text-right" },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`Customer since ${fmtDate(customer.createdAt)}`}
        back={<Button variant="outline" asChild><Link to="/customers"><ArrowLeft className="size-4" />Back</Link></Button>}
        actions={<>
          <Button variant="outline" onClick={downloadStatement}><FileText className="size-4" />Statement PDF</Button>
          <Button variant="outline" onClick={() => { setEdit({ name: customer.name, phone: customer.phone, email: customer.email ?? "", address: customer.address, city: customer.city }); setErrors({}); }}><Pencil className="size-4" />Edit Customer</Button>
          <Button variant="outline" disabled={stats.due <= 0} onClick={() => setPay(true)}><HandCoins className="size-4" />Add Payment</Button>
          <Button onClick={() => navigate({ to: "/pos" })}><Plus className="size-4" />Create Sale</Button>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit shadow-none">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Customer information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customer.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{customer.city}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="max-w-[60%] text-right">{customer.address || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Member since</span><span>{fmtDate(customer.createdAt)}</span></div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total purchases" value={rs(stats.total)} icon={ShoppingBag} tone="info" />
            <StatCard label="Total paid" value={rs(stats.paid)} icon={HandCoins} tone="success" />
            <StatCard label="Total due" value={rs(stats.due)} icon={AlertCircle} tone={stats.due ? "warning" : "default"} />
          </div>

          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">Sales History</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <DataTable
                  columns={saleCols}
                  rows={stats.list}
                  rowKey={(s) => s.id}
                  pageSize={10}
                  onRowClick={(s) => navigate({ to: "/sales/$id", params: { id: s.id } })}
                  empty={<EmptyState title="No sales yet." description="This customer has not made any purchases." />}
                />
              </Card>
            </TabsContent>
            <TabsContent value="payments">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <DataTable
                  columns={payCols}
                  rows={payments}
                  rowKey={(p) => p.id}
                  pageSize={10}
                  onRowClick={(p) => navigate({ to: "/sales/$id", params: { id: p.saleId } })}
                  empty={<EmptyState title="No payments yet." description="Payments recorded against this customer's sales will appear here." />}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={errors.name} className="sm:col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Phone" error={errors.phone}><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label="Email" error={errors.email}><Input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="City" error={errors.city} className="sm:col-span-2">
                <SearchableSelect
                  value={edit.city}
                  onChange={(city) => setEdit({ ...edit, city })}
                  placeholder="Select city"
                  options={cities}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2"><Textarea value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog open={pay} onOpenChange={setPay} title={`Add payment · ${customer.name}`} due={stats.due} onSubmit={(a, m) => actions.recordCustomerPayment(customer.id, a, m)} />
    </div>
  );
}
