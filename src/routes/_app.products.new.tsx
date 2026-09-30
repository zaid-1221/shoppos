import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";
import { ProductForm } from "@/components/product-form";
import { pageHead } from "@/lib/format";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/_app/products/new")({
  validateSearch: z.object({ supplier: z.string().optional() }),
  head: pageHead("Add Product", "Add a new product to your catalogue."),
  component: AddProductPage,
});

function AddProductPage() {
  const { supplier } = Route.useSearch();
  const db = useDB();
  const supplierName = db.suppliers.find((s) => s.id === supplier)?.name;

  return (
    <div>
      <PageHeader
        title="Add Product"
        description={supplierName ? `Adding a product for ${supplierName}.` : "Fill in product details, pricing and stock."}
        back={<Button variant="outline" asChild><Link to="/products"><ArrowLeft className="size-4" />Back</Link></Button>}
      />
      <ProductForm {...(supplier ? { defaultSupplierId: supplier } : {})} />
    </div>
  );
}
