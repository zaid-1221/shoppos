import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ArrowLeft, FileText, HandCoins, Package, Pencil, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Field, PageHeader, StatCard, StatusBadge } from "@/components/shared";
import { PaymentDialog } from "@/components/payment-dialog";
import { actions, due, supplierStats, useDB } from "@/lib/store";
import { fmtDate, fmtDateTime, pageHead, rs } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";

export const Route = createFileRoute("/_app/suppliers/$id")({
  head: pageHead("Supplier Details", "Supplier profile, purchase and payment history."),
  component: SupplierDetail,
});

type Form = { name: string; contact: string; phone: string; address: string; city: string };

function SupplierDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const supplier = db.suppliers.find((s) => s.id === id);
  const [edit, setEdit] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [pay, setPay] = useState(false);

  if (!supplier) {
    return <Card><EmptyState error title="Supplier not found." description="It may have been removed." action={<Button asChild variant="outline"><Link to="/suppliers">Back to suppliers</Link></Button>} /></Card>;
  }

  const stats = supplierStats(db, supplier.id);
  const payments = stats.list.flatMap((p) => p.payments.map((pay) => ({ ...pay, no: p.no, purchaseId: p.id })));

  const downloadStatement = () => {
    exportTablePdf({
      filename: `${supplier.name.replace(/\s+/g, "-").toLowerCase()}-statement.pdf`,
      title: `Supplier Statement — ${supplier.name}`,
      shopName: db.settings.shop.name,
      ...(supplier.phone || supplier.city ? { subtitle: [supplier.phone, supplier.city].filter(Boolean).join(" · ") } : {}),
      columns: [
        { key: "no", header: "PO #", width: 30 },
        { key: "date", header: "Date", width: 40 },
        { key: "total", header: "Total", align: "right", width: 28 },
        { key: "paid", header: "Paid", align: "right", width: 28 },
        { key: "due", header: "Due", align: "right", width: 28 },
        { key: "status", header: "Status", width: 24 },
      ],
      rows: stats.list.map((p) => ({
        no: p.no,
        date: fmtDateTime(p.date),
        total: rs(p.total),
        paid: rs(p.paid),
        due: rs(due(p)),
        status: p.status,
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
    if (!f.phone.trim()) e.phone = "Phone is required.";
    return e;
  };
  const save = () => {
    if (!edit) return;
    const e = validate(edit);
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.saveSupplier({ ...edit, id: supplier.id });
    toast.success("Supplier updated.");
    setEdit(null);
  };

  return (
    <div>
      <PageHeader
        title={supplier.name}
        description={`Supplier since ${fmtDate(supplier.createdAt)}`}
        back={<Button variant="outline" asChild><Link to="/suppliers"><ArrowLeft className="size-4" />Back</Link></Button>}
        actions={<>
          <Button variant="outline" onClick={downloadStatement}><FileText className="size-4" />Statement PDF</Button>
          <Button variant="outline" onClick={() => { setEdit({ name: supplier.name, contact: supplier.contact, phone: supplier.phone, address: supplier.address, city: supplier.city }); setErrors({}); }}><Pencil className="size-4" />Edit Supplier</Button>
          {stats.due > 0 && <Button variant="outline" onClick={() => setPay(true)}><HandCoins className="size-4" />Add Payment</Button>}
          <Button variant="outline" onClick={() => navigate({ to: "/products/new", search: { supplier: supplier.id } })}><Package className="size-4" />Add Product</Button>
          <Button onClick={() => navigate({ to: "/purchases/new", search: {} })}><Plus className="size-4" />Create Purchase</Button>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit shadow-none">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Supplier information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{supplier.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{supplier.city}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="max-w-[60%] text-right">{supplier.address || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Member since</span><span>{fmtDate(supplier.createdAt)}</span></div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total purchases" value={rs(stats.total)} icon={ShoppingBag} tone="info" />
            <StatCard label="Total paid" value={rs(stats.paid)} icon={HandCoins} tone="success" />
            <StatCard label="Total due" value={rs(stats.due)} icon={AlertCircle} tone={stats.due ? "warning" : "default"} />
          </div>

          <Tabs defaultValue="purchases">
            <TabsList>
              <TabsTrigger value="purchases">Purchase History</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                {stats.list.length === 0 ? <EmptyState title="No purchases yet." description="Purchases from this supplier will appear here." /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead className="pl-6">Purchase #</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead><TableHead className="pr-6">Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {stats.list.map((p) => (
                          <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate({ to: "/purchases" })}>
                            <TableCell className="pl-6 font-semibold text-primary">{p.no}</TableCell>
                            <TableCell>{fmtDateTime(p.date)}</TableCell>
                            <TableCell className="text-right">{rs(p.total)}</TableCell>
                            <TableCell className="text-right">{rs(p.paid)}</TableCell>
                            <TableCell className="text-right">{rs(due(p))}</TableCell>
                            <TableCell className="pr-6"><StatusBadge status={p.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>
            <TabsContent value="payments">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                {payments.length === 0 ? <EmptyState title="No payments yet." description="Payments recorded against this supplier's purchases will appear here." /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead className="pl-6">Date</TableHead><TableHead>Purchase #</TableHead><TableHead>Method</TableHead><TableHead className="pr-6 text-right">Amount</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {payments.sort((a, b) => b.date.localeCompare(a.date)).map((p) => (
                          <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate({ to: "/purchases" })}>
                            <TableCell className="pl-6">{fmtDateTime(p.date)}</TableCell>
                            <TableCell className="font-medium text-primary">{p.no}</TableCell>
                            <TableCell>{p.method}</TableCell>
                            <TableCell className="pr-6 text-right font-semibold">{rs(p.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={errors.name} className="sm:col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Phone" error={errors.phone}><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label="City" error={errors.city}><Input value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
              <Field label="Address" className="sm:col-span-2"><Textarea value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog open={pay} onOpenChange={setPay} title={`Add payment · ${supplier.name}`} due={stats.due} onSubmit={(a, m) => actions.recordSupplierPayment(supplier.id, a, m)} />
    </div>
  );
}
