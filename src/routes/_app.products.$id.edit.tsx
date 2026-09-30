import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared";
import { ProductForm } from "@/components/product-form";
import { pageHead } from "@/lib/format";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/_app/products/$id/edit")({
  head: pageHead("Edit Product", "Update product details, pricing and stock settings."),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const db = useDB();
  const product = db.products.find((p) => p.id === id);

  if (!product) {
    return (
      <div>
        <PageHeader
          title="Edit Product"
          back={<Button variant="outline" asChild><Link to="/products"><ArrowLeft className="size-4" />Back</Link></Button>}
        />
        <Card>
          <EmptyState
            title="Product not found"
            description="This product may have been deleted."
            action={<Button asChild><Link to="/products">Back to products</Link></Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Product"
        description={product.name}
        back={<Button variant="outline" asChild><Link to="/products"><ArrowLeft className="size-4" />Back</Link></Button>}
      />
      <ProductForm product={product} />
    </div>
  );
}
