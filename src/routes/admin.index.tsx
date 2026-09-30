import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Store, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared";
import { pageHead } from "@/lib/format";
import { usePlatform } from "@/lib/store";

export const Route = createFileRoute("/admin/")({
  head: pageHead("Admin", "Shops on the platform — open one to see its logins."),
  component: AdminOverview,
});

function AdminOverview() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const activeShops = platform.shops.filter((s) => s.status === "Active").length;
  const suspended = platform.shops.length - activeShops;
  const activeUsers = platform.users.filter((u) => u.status === "Active").length;

  const ownerOf = (shopId: string) => {
    const users = platform.users.filter((u) => u.shopId === shopId);
    return users.find((u) => u.role === "Owner") ?? users[0] ?? null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="Admin login pe shops dikhte hain. Har shop ke andar uske logins hain."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Shops" value={platform.shops.length} icon={Store} tone="info" />
        <StatCard label="Active shops" value={activeShops} icon={Store} tone="success" />
        <StatCard label="Suspended" value={suspended} icon={Store} tone="warning" />
        <StatCard label="Total logins" value={activeUsers} icon={Users} tone="default" />
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Shops</h2>
              <p className="text-sm text-muted-foreground">Shop name + owner name — click to see all logins.</p>
            </div>
            <Button variant="outline" onClick={() => navigate({ to: "/admin/shops" })}>View all</Button>
          </div>
          <div className="divide-y rounded-lg border">
            {platform.shops.slice(0, 8).map((shop) => {
              const owner = ownerOf(shop.id);
              const stats = platform.shopStats(shop.id);
              return (
                <button
                  key={shop.id}
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  onClick={() => navigate({ to: "/admin/shops/$id", params: { id: shop.id } })}
                >
                  <div>
                    <p className="font-medium">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {owner ? `Owner: ${owner.name} · ${owner.email}` : shop.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <StatusBadge status={shop.status} />
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {stats.users} logins
                    </span>
                  </div>
                </button>
              );
            })}
            {platform.shops.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No shops yet. New signups will appear here.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
