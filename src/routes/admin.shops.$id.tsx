import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MoreHorizontal, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  SearchInput,
  SimpleSelect,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/shared";
import { actions, usePlatform } from "@/lib/store";
import { fmtDateTime, pageHead, rs } from "@/lib/format";
import { shopMonthlyFee } from "@/lib/plans";
import type { User } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/shops/$id")({
  head: pageHead("Shop", "Shop logins and details."),
  component: AdminShopDetail,
});

function AdminShopDetail() {
  const { id } = Route.useParams();
  const platform = usePlatform();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const shop = platform.shops.find((s) => s.id === id);
  const shopUsers = useMemo(
    () => platform.users.filter((u) => u.shopId === id),
    [platform.users, id],
  );
  const owner = shopUsers.find((u) => u.role === "Owner") ?? shopUsers[0];
  const stats = platform.shopStats(id);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return shopUsers.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (status !== "all" && u.status !== status) return false;
      if (!query) return true;
      return `${u.name} ${u.email} ${u.phone} ${u.role}`.toLowerCase().includes(query);
    });
  }, [shopUsers, q, role, status]);

  if (!shop) {
    return (
      <EmptyState
        icon={Store}
        title="Shop not found"
        description="This shop may have been removed."
        action={
          <Button variant="outline" onClick={() => navigate({ to: "/admin/shops" })}>
            Back to shops
          </Button>
        }
      />
    );
  }

  const enter = () => {
    const res = actions.enterShop(shop.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Entered ${shop.name}`);
    navigate({ to: "/dashboard" });
  };

  const toggleShop = () => {
    const next = shop.status === "Active" ? "Suspended" : "Active";
    actions.setShopStatus(shop.id, next);
    toast.success(`${shop.name} is now ${next}.`);
  };

  const toggleUser = (user: User) => {
    const next = user.status === "Active" ? "Inactive" : "Active";
    actions.setUserStatus(user.id, next);
    toast.success(`${user.name} is now ${next}.`);
  };

  const cols: Column<User>[] = [
    {
      key: "user",
      header: "Login / person",
      cell: (u) => (
        <div>
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (u) => u.role },
    { key: "phone", header: "Phone", cell: (u) => u.phone || "—" },
    { key: "status", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
    {
      key: "lastLogin",
      header: "Last login",
      cell: (u) => <span className="text-muted-foreground">{u.lastLogin ? fmtDateTime(u.lastLogin) : "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toggleUser(user)}>
              {user.status === "Active" ? "Deactivate login" : "Activate login"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/shops"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All shops
        </Link>
        <PageHeader
          title={shop.name}
          description={
            owner
              ? `Owner: ${owner.name} · ${owner.email}`
              : shop.email || "No owner login yet"
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={toggleShop}>
                {shop.status === "Active" ? "Suspend shop" : "Activate shop"}
              </Button>
              <Button onClick={enter}>Enter shop</Button>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value={shop.status} icon={Store} tone={shop.status === "Active" ? "success" : "warning"} />
        <StatCard label="Monthly fee" value={rs(shopMonthlyFee(shop))} icon={Store} tone="info" />
        <StatCard label="Logins" value={stats.users} icon={Users} tone="default" />
        <StatCard label="Products" value={stats.products} icon={Store} tone="default" />
      </div>

      <Card>
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Logins in this shop</h2>
          <p className="text-sm text-muted-foreground">
            These people can sign in to {shop.name}. Fee details Fees tab mein hain.
          </p>
        </div>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" className="sm:w-72" />
          <SimpleSelect
            value={role}
            onChange={setRole}
            className="sm:w-40"
            options={[
              { value: "all", label: "All roles" },
              { value: "Owner", label: "Owner" },
              { value: "Manager", label: "Manager" },
              { value: "Cashier", label: "Cashier" },
              { value: "Staff", label: "Staff" },
            ]}
          />
          <SimpleSelect
            value={status}
            onChange={setStatus}
            className="sm:w-40"
            options={[
              { value: "all", label: "All statuses" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
        </FilterBar>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(u) => u.id}
          empty={
            <EmptyState
              icon={Users}
              title="No logins yet"
              description="When this shop signs up or adds staff, their logins appear here."
            />
          }
        />
      </Card>
    </div>
  );
}
