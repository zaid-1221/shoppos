import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CurrencyInput, Field, ProductThumb, SearchableSelect } from "@/components/shared";
import { actions, getState, useDB } from "@/lib/store";
import { rs, supplierName } from "@/lib/format";
import { categoryLabel, parentCategories, subcategoriesOf, type Product } from "@/lib/mock-data";

export type ProductDraft = Omit<Product, "id">;

const blank = (categoryId: string, supplierId: string): ProductDraft => ({
  name: "", sku: "", barcode: "", categoryId, brand: "", purchasePrice: 0, salePrice: 0, wholesalePrice: 0,
  stock: 0, minStock: 5, supplierId, image: "", description: "", active: true,
});

type CatDialog = { kind: "category" | "subcategory"; name: string; description: string; parentId: string };
type SupplierDialog = { name: string; phone: string; address: string; city: string };
type ProductFieldErrors = Partial<Record<"name" | "sku" | "categoryId" | "subcategoryId" | "supplierId" | "purchasePrice" | "salePrice" | "minStock", string>>;

const emptySupplier: SupplierDialog = { name: "", phone: "", address: "", city: "" };

export function ProductForm({ product, defaultSupplierId }: { product?: Product; defaultSupplierId?: string }) {
  const db = useDB();
  const navigate = useNavigate();
  const parents = useMemo(() => parentCategories(db.categories), [db.categories]);

  const initialParent = (() => {
    if (!product) return parents[0]?.id ?? "";
    const cat = db.categories.find((c) => c.id === product.categoryId);
    return cat?.parentId ?? cat?.id ?? parents[0]?.id ?? "";
  })();
  const initialSub = (() => {
    if (!product) return "";
    const cat = db.categories.find((c) => c.id === product.categoryId);
    return cat?.parentId ? cat.id : "";
  })();

  const initialSupplier = product
    ? product.supplierId
    : (defaultSupplierId && db.suppliers.some((s) => s.id === defaultSupplierId) ? defaultSupplierId : db.suppliers[0]?.id ?? "");
  const [f, setF] = useState<ProductDraft>(
    product ? { ...product } : blank(parents[0]?.id ?? "", initialSupplier),
  );
  const [parentId, setParentId] = useState(initialParent);
  const [subId, setSubId] = useState(initialSub);
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [catDialog, setCatDialog] = useState<CatDialog | null>(null);
  const [catErrors, setCatErrors] = useState<Partial<Record<"name" | "parentId", string>>>({});
  const [supplierDialog, setSupplierDialog] = useState<SupplierDialog | null>(null);
  const [supplierErrors, setSupplierErrors] = useState<Partial<Record<"name" | "phone" | "city", string>>>({});

  const subs = useMemo(() => (parentId ? subcategoriesOf(db.categories, parentId) : []), [db.categories, parentId]);

  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const applyCategory = (nextParent: string, nextSub: string) => {
    setParentId(nextParent);
    setSubId(nextSub);
    set("categoryId", nextSub || nextParent);
  };

  const margin = f.salePrice - f.purchasePrice;
  const marginPct = f.purchasePrice > 0 ? Math.round((margin / f.purchasePrice) * 100) : 0;

  const pickImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("image", String(reader.result));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!f.name.trim()) e.name = "Product name is required.";
    const sku = f.sku.trim();
    if (sku && db.products.some((p) => p.sku && p.sku.toLowerCase() === sku.toLowerCase() && p.id !== product?.id)) e.sku = "This SKU is already used by another product.";
    if (!parentId) e.categoryId = "Choose a category.";
    if (!f.supplierId) e.supplierId = "Choose a supplier.";
    if (f.purchasePrice <= 0) e.purchasePrice = "Enter the purchase price.";
    if (f.salePrice <= 0) e.salePrice = "Enter the sale price.";
    else if (f.salePrice < f.purchasePrice) e.salePrice = "Sale price is lower than purchase price.";
    if (f.minStock < 0) e.minStock = "Minimum stock cannot be negative.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    const categoryId = subId || parentId;
    const payload = { ...f, categoryId, name: f.name.trim(), sku: f.sku.trim().toUpperCase() };
    if (product) {
      actions.updateProduct(product.id, payload);
      toast.success(`${payload.name} updated.`);
      navigate({ to: "/products/$id", params: { id: product.id } });
    } else {
      const id = actions.addProduct(payload);
      toast.success(
        payload.stock > 0
          ? `${payload.name} added. Opening stock recorded as a purchase.`
          : `${payload.name} added to your catalogue.`,
      );
      navigate({ to: "/products/$id", params: { id } });
    }
  };

  const openCatDialog = (kind: "category" | "subcategory") => {
    setCatDialog({
      kind,
      name: "",
      description: "",
      parentId: kind === "subcategory" ? parentId || parents[0]?.id || "" : "",
    });
    setCatErrors({});
  };

  const saveCategory = () => {
    if (!catDialog) return;
    const e: Partial<Record<"name" | "parentId", string>> = {};
    const name = catDialog.name.trim();
    if (!name) e.name = "Name is required.";
    if (catDialog.kind === "subcategory" && !catDialog.parentId) e.parentId = "Choose a parent category.";
    const parentKey = catDialog.kind === "subcategory" ? catDialog.parentId : "";
    if (
      name &&
      db.categories.some(
        (c) => (c.parentId ?? "") === parentKey && c.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      e.name = catDialog.kind === "subcategory" ? "This subcategory already exists." : "This category already exists.";
    }
    setCatErrors(e);
    if (Object.keys(e).length) return;

    const before = new Set(db.categories.map((c) => c.id));
    actions.saveCategory({
      name,
      description: catDialog.description.trim(),
      parentId: catDialog.kind === "subcategory" ? catDialog.parentId : null,
    });
    const created = getState().categories.find((c) => !before.has(c.id));
    if (catDialog.kind === "category" && created) {
      applyCategory(created.id, "");
      toast.success("Category added.");
    } else if (catDialog.kind === "subcategory" && created) {
      applyCategory(catDialog.parentId, created.id);
      toast.success("Subcategory added.");
    } else {
      toast.success(catDialog.kind === "category" ? "Category added." : "Subcategory added.");
    }
    setCatDialog(null);
  };

  const openSupplierDialog = () => {
    setSupplierDialog({ ...emptySupplier });
    setSupplierErrors({});
  };

  const saveSupplier = () => {
    if (!supplierDialog) return;
    const e: Partial<Record<"name" | "phone" | "city", string>> = {};
    const name = supplierDialog.name.trim();
    const phone = supplierDialog.phone.trim();
    const city = supplierDialog.city.trim();
    if (!name) e.name = "Name is required.";
    if (!phone) e.phone = "Phone is required.";
    else if (!/^[0-9+\-\s]{7,15}$/.test(phone)) e.phone = "Enter a valid phone number.";
    if (
      name &&
      db.suppliers.some((s) => s.name.trim().toLowerCase() === name.toLowerCase())
    ) {
      e.name = "This supplier already exists.";
    }
    setSupplierErrors(e);
    if (Object.keys(e).length) return;

    const before = new Set(db.suppliers.map((s) => s.id));
    actions.saveSupplier({
      name,
      contact: "",
      phone,
      address: supplierDialog.address.trim(),
      city,
    });
    const created = getState().suppliers.find((s) => !before.has(s.id));
    if (created) set("supplierId", created.id);
    toast.success("Supplier added.");
    setSupplierDialog(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-base">Product information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" error={errors.name} className="sm:col-span-2">
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. iPhone 15 Silicone Cover" className="bg-card" />
            </Field>
            <Field label="SKU" error={errors.sku} hint="Optional · unique code used on labels">
              <Input value={f.sku} onChange={(e) => set("sku", e.target.value)} placeholder="SF-1031" className="bg-card" />
            </Field>
            <Field label="Barcode">
              <Input value={f.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="8961234567890" className="bg-card" />
            </Field>
            <Field label="Category" error={errors.categoryId}>
              <div className="flex gap-2">
                <SearchableSelect
                  className="flex-1"
                  value={parentId}
                  onChange={(v) => applyCategory(v, "")}
                  options={parents.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Select category"
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => openCatDialog("category")} aria-label="Add category">
                  <Plus className="size-4" />
                </Button>
              </div>
            </Field>
            <Field label="Subcategory" error={errors.subcategoryId} hint={subs.length ? undefined : "Optional — add one if needed"}>
              <div className="flex gap-2">
                <SearchableSelect
                  className="flex-1"
                  value={subId}
                  onChange={(v) => applyCategory(parentId, v)}
                  options={[
                    { value: "", label: "None (use category)" },
                    ...subs.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder={subs.length ? "Select subcategory" : "No subcategories"}
                  emptyText={parentId ? "No subcategories yet." : "Choose a category first."}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={!parents.length}
                  onClick={() => openCatDialog("subcategory")}
                  aria-label="Add subcategory"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </Field>
            <Field label="Brand">
              <Input value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Apple, Baseus, Generic..." className="bg-card" />
            </Field>
            <Field label="Supplier" error={errors.supplierId}>
              <div className="flex gap-2">
                <SearchableSelect
                  className="flex-1"
                  value={f.supplierId}
                  onChange={(v) => set("supplierId", v)}
                  options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Select supplier"
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={openSupplierDialog} aria-label="Add supplier">
                  <Plus className="size-4" />
                </Button>
              </div>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Short description shown on the product page." className="bg-card" />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Purchase price" error={errors.purchasePrice}><CurrencyInput value={f.purchasePrice} onChange={(n) => set("purchasePrice", n)} /></Field>
            <Field label="Sale price" error={errors.salePrice}><CurrencyInput value={f.salePrice} onChange={(n) => set("salePrice", n)} /></Field>
            <Field label="Wholesale price"><CurrencyInput value={f.wholesalePrice} onChange={(n) => set("wholesalePrice", n)} /></Field>
            <p className="text-sm text-muted-foreground sm:col-span-3">
              Profit per unit: <b className={margin >= 0 ? "text-success" : "text-destructive"}>{rs(margin)}</b> ({marginPct}%)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-base">Stock</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={product ? "Current stock" : "Initial stock"} hint={product ? "Use Adjust Stock to change this after creating." : "Quantity available at the shop right now"}>
              <Input type="number" min={0} inputMode="numeric" value={f.stock || ""} onChange={(e) => set("stock", Number(e.target.value) || 0)} disabled={!!product} className="bg-card" />
            </Field>
            <Field label="Minimum stock" error={errors.minStock} hint="You get a low stock alert below this level">
              <Input type="number" min={0} inputMode="numeric" value={f.minStock || ""} onChange={(e) => set("minStock", Number(e.target.value) || 0)} className="bg-card" />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-base">Product image</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <ProductThumb product={{ categoryId: f.categoryId, name: f.name || "Product", ...(f.image ? { image: f.image } : {}) }} className="size-20" />
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                  <ImagePlus className="size-4" />Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
                </label>
                {f.image && (
                  <Button variant="ghost" size="sm" onClick={() => set("image", "")}><X className="size-4" />Remove</Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Optional. Without an image we show a category icon.</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Category</span><span className="text-right">{categoryLabel(db.categories, subId || parentId)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="max-w-[55%] truncate">{supplierName(db.suppliers, f.supplierId)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Stock value</span><b>{rs(f.stock * f.purchasePrice)}</b></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => (product ? navigate({ to: "/products/$id", params: { id: product.id } }) : navigate({ to: "/products" }))}>Cancel</Button>
          <Button onClick={save}><Save className="size-4" />{product ? "Save Changes" : "Save Product"}</Button>
        </div>
      </div>

      <Dialog open={!!catDialog} onOpenChange={(o) => !o && setCatDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catDialog?.kind === "subcategory" ? "Add Subcategory" : "Add Category"}</DialogTitle>
          </DialogHeader>
          {catDialog && (
            <div className="grid gap-3">
              {catDialog.kind === "subcategory" && (
                <Field label="Parent category" error={catErrors.parentId}>
                  <SearchableSelect
                    value={catDialog.parentId}
                    onChange={(v) => setCatDialog({ ...catDialog, parentId: v })}
                    options={parents.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select parent category"
                  />
                </Field>
              )}
              <Field label="Name" error={catErrors.name}>
                <Input
                  autoFocus
                  value={catDialog.name}
                  onChange={(e) => setCatDialog({ ...catDialog, name: e.target.value })}
                  placeholder={catDialog.kind === "subcategory" ? "e.g. Silicone Cases" : "e.g. Mobile Covers"}
                />
              </Field>
              <Field label="Description" hint="Optional">
                <Textarea
                  value={catDialog.description}
                  onChange={(e) => setCatDialog({ ...catDialog, description: e.target.value })}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(null)}>Cancel</Button>
            <Button onClick={saveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!supplierDialog} onOpenChange={(o) => !o && setSupplierDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          {supplierDialog && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={supplierErrors.name} className="sm:col-span-2">
                <Input
                  autoFocus
                  value={supplierDialog.name}
                  onChange={(e) => setSupplierDialog({ ...supplierDialog, name: e.target.value })}
                  placeholder="e.g. Link Road Ahsan"
                />
              </Field>
              <Field label="Phone" error={supplierErrors.phone}>
                <Input
                  value={supplierDialog.phone}
                  onChange={(e) => setSupplierDialog({ ...supplierDialog, phone: e.target.value })}
                  placeholder="03xxxxxxxxx"
                />
              </Field>
              <Field label="City" error={supplierErrors.city}>
                <Input
                  value={supplierDialog.city}
                  onChange={(e) => setSupplierDialog({ ...supplierDialog, city: e.target.value })}
                  placeholder="Lahore"
                />
              </Field>
              <Field label="Address" hint="Optional" className="sm:col-span-2">
                <Textarea
                  value={supplierDialog.address}
                  onChange={(e) => setSupplierDialog({ ...supplierDialog, address: e.target.value })}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialog(null)}>Cancel</Button>
            <Button onClick={saveSupplier}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
