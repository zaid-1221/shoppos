import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Boxes,
  Package,
  PackagePlus,
  Pencil,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog, DataTable, EmptyState, Field, PageHeader, ProductThumb, StatCard, StatusBadge, type Column } from "@/components/shared";
import { actions, stockStatus, useDB } from "@/lib/store";
import { fmtDateTime, pageHead, rs, supplierName } from "@/lib/format";
import { categoryLabel } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/products/$id/")({
  head: pageHead("Product Details", "Product info, pricing, stock and movement history."),
  component: ProductDetail,
});

type SaleRow = {
  id: string;
  saleId: string;
  invoiceNo: string;
  date: string;
  qty: number;
  price: number;
  total: number;
  status: string;
};

type PurchaseRow = {
  id: string;
  no: string;
  date: string;
  qty: number;
  price: number;
  total: number;
  status: string;
  supplierId: string;
};

type Movement = { id: string; date: string; kind: string; detail: string; change: number; href?: string };

const PAGE_SIZE = 10;

function ProductDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const [del, setDel] = useState(false);
  const [addStock, setAddStock] = useState(false);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [qtyErr, setQtyErr] = useState("");
  const product = db.products.find((p) => p.id === id);

  useEffect(() => {
    if (addStock) {
      setQty(1);
      setReason("");
      setNotes("");
      setQtyErr("");
    }
  }, [addStock]);

  const sales = useMemo(
    () =>
      db.sales
        .flatMap((s) =>
          s.items
            .filter((i) => i.productId === id)
            .map((i) => ({
              id: `${s.id}-${i.productId}`,
              saleId: s.id,
              invoiceNo: s.invoiceNo,
              date: s.date,
              qty: i.qty,
              price: i.price,
              total: i.qty * i.price,
              status: s.status,
            })),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.sales, id],
  );

  const purchases = useMemo(
    () =>
      db.purchases
        .flatMap((p) =>
          p.items
            .filter((i) => i.productId === id)
            .map((i) => ({
              id: `${p.id}-${i.productId}`,
              no: p.no,
              date: p.date,
              qty: i.qty,
              price: i.price,
              total: i.qty * i.price,
              status: p.status,
              supplierId: p.supplierId,
            })),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.purchases, id],
  );

  const movements = useMemo(() => {
    if (!product) return [] as Movement[];
    const rows: Movement[] = [];
    for (const a of db.adjustments) {
      if (a.productId !== product.id) continue;
      rows.push({ id: a.id, date: a.date, kind: a.type, detail: a.reason || "Stock adjustment", change: a.after - a.before });
    }
    for (const s of db.sales) {
      for (const it of s.items) {
        if (it.productId !== product.id) continue;
        rows.push({
          id: `${s.id}-${it.productId}`,
          date: s.date,
          kind: "Sale",
          detail: s.invoiceNo,
          change: -it.qty,
          href: `/sales/${s.id}`,
        });
      }
    }
    for (const p of db.purchases) {
      for (const it of p.items) {
        if (it.productId !== product.id) continue;
        rows.push({ id: `${p.id}-${it.productId}`, date: p.date, kind: "Purchase", detail: p.no, change: it.qty });
      }
    }
    for (const r of db.saleReturns) {
      for (const it of r.items) {
        if (it.productId !== product.id) continue;
        rows.push({ id: `${r.id}-${it.productId}`, date: r.date, kind: "Sale return", detail: r.invoiceNo, change: it.qty });
      }
    }
    for (const r of db.purchaseReturns) {
      for (const it of r.items) {
        if (it.productId !== product.id) continue;
        rows.push({ id: `${r.id}-${it.productId}`, date: r.date, kind: "Purchase return", detail: r.purchaseNo, change: -it.qty });
      }
    }
    return rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [db, product]);

  if (!product) {
    return (
      <Card>
        <EmptyState
          error
          title="Product not found."
          description="It may have been removed."
          action={<Button asChild variant="outline"><Link to="/products">Back to products</Link></Button>}
        />
      </Card>
    );
  }

  const supplier = db.suppliers.find((s) => s.id === product.supplierId);
  const status = stockStatus(product);
  const stockValue = product.stock * product.purchasePrice;
  const margin = product.salePrice - product.purchasePrice;
  const marginPct = product.purchasePrice > 0 ? Math.round((margin / product.purchasePrice) * 100) : 0;
  const soldQty = sales.reduce((a, s) => a + s.qty, 0);
  const soldValue = sales.reduce((a, s) => a + s.total, 0);

  const saleCols: Column<SaleRow>[] = [
    { key: "invoice", header: "Invoice #", cell: (s) => <span className="font-semibold text-primary">{s.invoiceNo}</span> },
    { key: "date", header: "Date", cell: (s) => fmtDateTime(s.date) },
    { key: "qty", header: "Qty", cell: (s) => s.qty, className: "text-right" },
    { key: "price", header: "Price", cell: (s) => rs(s.price), className: "text-right" },
    { key: "total", header: "Total", cell: (s) => rs(s.total), className: "text-right" },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
  ];

  const purchaseCols: Column<PurchaseRow>[] = [
    { key: "no", header: "PO #", cell: (p) => <span className="font-semibold text-primary">{p.no}</span> },
    { key: "date", header: "Date", cell: (p) => fmtDateTime(p.date) },
    { key: "qty", header: "Qty", cell: (p) => p.qty, className: "text-right" },
    { key: "price", header: "Cost", cell: (p) => rs(p.price), className: "text-right" },
    { key: "total", header: "Total", cell: (p) => rs(p.total), className: "text-right" },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  const movementCols: Column<Movement>[] = [
    { key: "date", header: "Date", cell: (m) => fmtDateTime(m.date) },
    { key: "kind", header: "Type", cell: (m) => m.kind },
    {
      key: "detail",
      header: "Reference",
      cell: (m) => <span className={m.href ? "font-medium text-primary" : undefined}>{m.detail}</span>,
    },
    {
      key: "change",
      header: "Change",
      className: "text-right",
      cell: (m) => (
        <span className={`font-semibold ${m.change > 0 ? "text-success" : m.change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {m.change > 0 ? `+${m.change}` : m.change}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={product.name}
        titleAside={<StatusBadge status={status} />}
        description={`${product.sku}${product.brand ? ` · ${product.brand}` : ""}`}
        back={<Button variant="outline" asChild><Link to="/products"><ArrowLeft className="size-4" />Back</Link></Button>}
        actions={
          <>
            <Button onClick={() => setAddStock(true)}>
              <PackagePlus className="size-4" />Add stock
            </Button>
            <Button variant="outline" onClick={() => setDel(true)}><Trash2 className="size-4" />Delete</Button>
            <Button variant="outline" asChild><Link to="/products/$id/edit" params={{ id: product.id }}><Pencil className="size-4" />Edit</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit shadow-none">
          <CardHeader className="gap-4">
            <ProductThumb product={product} className="size-24 rounded-lg" />
            <div>
              <CardTitle className="text-base">{product.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{categoryLabel(db.categories, product.categoryId)}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">SKU</span><span className="font-mono text-xs">{product.sku}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Barcode</span><span className="font-mono text-xs">{product.barcode || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Brand</span><span>{product.brand || "—"}</span></div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Supplier</span>
              {supplier ? (
                <Link to="/suppliers/$id" params={{ id: supplier.id }} className="max-w-[60%] truncate text-right text-primary hover:underline">
                  {supplier.name}
                </Link>
              ) : (
                <span className="max-w-[60%] truncate text-right text-muted-foreground">{supplierName(db.suppliers, product.supplierId)}</span>
              )}
            </div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><StatusBadge status={product.active ? "Active" : "Inactive"} /></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Min stock</span><span>{product.minStock}</span></div>
            {product.description ? (
              <div className="border-t pt-3">
                <p className="mb-1 text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap text-foreground">{product.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="In stock" value={product.stock} icon={Boxes} tone={status === "Out of Stock" ? "destructive" : status === "Low Stock" ? "warning" : "default"} />
            <StatCard label="Stock value" value={rs(stockValue)} icon={Banknote} tone="info" />
            <StatCard label="Margin" value={`${rs(margin)} (${marginPct}%)`} icon={TrendingUp} tone={margin >= 0 ? "success" : "destructive"} />
            <StatCard label="Sold" value={`${soldQty} · ${rs(soldValue)}`} icon={ShoppingBag} tone="info" />
          </div>

          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Pricing</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Purchase</span>
                <span className="font-medium">{rs(product.purchasePrice)}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Sale</span>
                <span className="font-semibold">{rs(product.salePrice)}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Wholesale</span>
                <span className="font-medium">{product.wholesalePrice ? rs(product.wholesalePrice) : "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
              <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
              <TabsTrigger value="stock">Stock history ({movements.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <DataTable
                  columns={saleCols}
                  rows={sales}
                  rowKey={(s) => s.id}
                  pageSize={PAGE_SIZE}
                  onRowClick={(s) => navigate({ to: "/sales/$id", params: { id: s.saleId } })}
                  empty={<EmptyState icon={ShoppingBag} title="No sales yet." description="POS sales that include this product will appear here." />}
                />
              </Card>
            </TabsContent>

            <TabsContent value="purchases">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <DataTable
                  columns={purchaseCols}
                  rows={purchases}
                  rowKey={(p) => p.id}
                  pageSize={PAGE_SIZE}
                  onRowClick={() => navigate({ to: "/purchases" })}
                  empty={<EmptyState icon={Package} title="No purchases yet." description="Purchase orders that include this product will appear here." />}
                />
              </Card>
            </TabsContent>

            <TabsContent value="stock">
              <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <DataTable
                  columns={movementCols}
                  rows={movements}
                  rowKey={(m) => m.id}
                  pageSize={PAGE_SIZE}
                  onRowClick={(m) => {
                    if (m.href?.startsWith("/sales/")) {
                      navigate({ to: "/sales/$id", params: { id: m.href.replace("/sales/", "") } });
                    }
                  }}
                  rowClassName={(m) => (m.href ? undefined : "!cursor-default")}
                  empty={<EmptyState icon={Boxes} title="No stock movement yet." description="Sales, purchases, returns and adjustments will show up here." />}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={addStock} onOpenChange={setAddStock}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add stock</DialogTitle>
            <DialogDescription>
              {product.name} · currently <b>{product.stock}</b> in stock
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Quantity" error={qtyErr}>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                autoFocus
                className="bg-card"
                value={qty || ""}
                onChange={(e) => {
                  setQty(Number(e.target.value) || 0);
                  setQtyErr("");
                }}
              />
            </Field>
            <Field label="Reason" hint="Optional">
              <Input
                className="bg-card"
                placeholder="e.g. Restock, Found inventory"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Field label="Notes" hint="Optional">
              <Textarea
                className="bg-card"
                rows={2}
                placeholder="Any extra detail…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            {qty > 0 && (
              <p className="text-sm text-muted-foreground">
                New stock: <b className="text-foreground">{product.stock + qty}</b>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStock(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (qty <= 0) return setQtyErr("Enter a quantity greater than zero.");
                actions.addAdjustment({
                  productId: product.id,
                  type: "Add",
                  qty,
                  reason: reason.trim() || "Stock added",
                  notes: notes.trim(),
                });
                toast.success(`Added ${qty} to ${product.name}. Stock is now ${product.stock + qty}.`);
                setAddStock(false);
              }}
            >
              <PackagePlus className="size-4" />Add stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title={`Delete ${product.name}?`}
        description="This removes the product from your catalogue. Past invoices stay unchanged."
        onConfirm={() => {
          actions.deleteProduct(product.id);
          toast.success(`${product.name} deleted.`);
          navigate({ to: "/products" });
        }}
      />
    </div>
  );
}
