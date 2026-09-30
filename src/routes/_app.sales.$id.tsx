import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, HandCoins, Pencil, Printer, Undo2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, StatusBadge } from "@/components/shared";
import { downloadInvoicePdf, InvoicePreview } from "@/components/invoice-preview";
import { PaymentDialog } from "@/components/payment-dialog";
import { actions, saleDue, saleReturnedStats, useDB } from "@/lib/store";
import { fmtDateTime, pageHead, rs } from "@/lib/format";

export const Route = createFileRoute("/_app/sales/$id")({
  validateSearch: z.object({ print: z.boolean().optional() }),
  head: pageHead("Sale Details", "Invoice details, items and payment history."),
  component: SaleDetail,
});

function SaleDetail() {
  const { id } = Route.useParams();
  const { print } = Route.useSearch();
  const db = useDB();
  const navigate = useNavigate();
  const [pay, setPay] = useState(false);
  const sale = db.sales.find((s) => s.id === id);
  const canEdit = !!sale && sale.status !== "Returned" && !db.saleReturns.some((r) => r.saleId === sale.id);

  useEffect(() => {
    if (print && sale) setTimeout(() => window.print(), 400);
  }, [print, sale]);

  if (!sale) {
    return (
      <Card>
        <EmptyState
          error
          title="Invoice not found."
          description="It may have been removed."
          action={<Button asChild variant="outline"><Link to="/sales">Back to sales</Link></Button>}
        />
      </Card>
    );
  }

  const customer = db.customers.find((c) => c.id === sale.customerId);
  const returns = db.saleReturns.filter((r) => r.saleId === sale.id);
  const returned = saleReturnedStats(sale, db.saleReturns);
  const returnedQty = returned.qty;
  const returnedAmt = returned.amount;
  const netSale = sale.total - returnedAmt;
  const amountDue = saleDue(sale, db.saleReturns);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={sale.invoiceNo}
        titleAside={<StatusBadge status={sale.status} />}
        description={sale.editedAt ? `${fmtDateTime(sale.date)} · Edited ${fmtDateTime(sale.editedAt)}` : fmtDateTime(sale.date)}
        back={<Button variant="outline" asChild><Link to="/sales"><ArrowLeft className="size-4" />Back</Link></Button>}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
            <Button variant="outline" onClick={() => downloadInvoicePdf(sale, db.settings, customer?.name)}><FileText className="size-4" />PDF</Button>
            {amountDue > 0 && (
              <Button variant="outline" onClick={() => setPay(true)}><HandCoins className="size-4" />Receive</Button>
            )}
            <Button variant="outline" disabled={!canEdit} onClick={() => navigate({ to: "/pos", search: { edit: sale.id } })}>
              <Pencil className="size-4" />Edit
            </Button>
            <Button
              variant="outline"
              disabled={sale.status === "Returned"}
              onClick={() => navigate({ to: "/sale-returns", search: { invoice: sale.invoiceNo } })}
            >
              <Undo2 className="size-4" />Return
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <Card className="shadow-none">
          <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              {customer ? (
                <>
                  <Link to="/customers/$id" params={{ id: customer.id }} className="font-medium text-primary hover:underline">
                    {customer.name}
                  </Link>
                  <p className="text-muted-foreground">{customer.phone}</p>
                </>
              ) : (
                <p className="font-medium">Walk-in customer</p>
              )}
            </div>
            <div className="space-y-1.5 sm:text-right">
              <p><span className="text-muted-foreground">Cashier</span> · {sale.cashier}</p>
              <p><span className="text-muted-foreground">Payment</span> · {sale.method}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((i) => (
                  <TableRow key={i.productId}>
                    <TableCell className="pl-4 font-medium">{i.name}</TableCell>
                    <TableCell className="text-center">{i.qty}</TableCell>
                    <TableCell className="text-right">{rs(i.price)}</TableCell>
                    <TableCell className="pr-4 text-right">{rs(i.qty * i.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-1 border-t px-4 py-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rs(sale.subtotal)}</span></div>
            {sale.discount > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>- {rs(sale.discount)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{rs(sale.total)}</span></div>
            {returnedQty > 0 && (
              <>
                <div className="flex justify-between text-warning">
                  <span>Returned ({returnedQty} pcs)</span>
                  <span>- {rs(returnedAmt)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Net (Sale − Returned)</span>
                  <span>{rs(netSale)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{rs(sale.paid)}</span></div>
            {amountDue > 0 && (
              <div className="flex justify-between font-semibold text-destructive"><span>Due</span><span>{rs(amountDue)}</span></div>
            )}
          </div>
        </Card>

        {(sale.payments.length > 0 || returns.length > 0) && (
          <Card className="shadow-none">
            <CardContent className="space-y-0 p-4">
              <p className="mb-2 text-sm font-medium">Payments</p>
              {sale.payments.map((p) => (
                <div key={p.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                  <span className="text-muted-foreground">{fmtDateTime(p.date)} · {p.method}</span>
                  <span className="font-medium">{rs(p.amount)}</span>
                </div>
              ))}
              {returns.map((r) => (
                <div key={r.id} className="flex justify-between border-b py-2 text-sm text-muted-foreground last:border-0">
                  <span>Refund {r.no} · {r.reason}</span>
                  <span>- {rs(r.refund)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {sale.notes && (
          <Card className="shadow-none">
            <CardContent className="p-4 text-sm">
              <p className="mb-1 font-medium">Notes</p>
              <p className="text-muted-foreground">{sale.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt form used only for browser print */}
      <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden>
        <InvoicePreview sale={sale} settings={db.settings} customerName={customer?.name} showActions={false} />
      </div>

      <PaymentDialog
        open={pay}
        onOpenChange={setPay}
        title={`Receive payment · ${sale.invoiceNo}`}
        due={amountDue}
        onSubmit={(a, m) => actions.recordSalePayment(sale.id, a, m)}
      />
    </div>
  );
}
