import type { Role } from "./mock-data";

export const PERM_MODULES = [
  "Sales",
  "Purchases",
  "Products",
  "Inventory",
  "Customers",
  "Suppliers",
  "Expenses",
  "Reports",
  "Settings",
] as const;

export const PERM_ACTIONS = ["View", "Create", "Edit", "Delete"] as const;

export type PermModule = (typeof PERM_MODULES)[number];
export type PermAction = (typeof PERM_ACTIONS)[number];
export type RolePerms = Record<PermModule, Record<PermAction, boolean>>;
export type RolePermissions = Record<Role, RolePerms>;

const allTrue = () => Object.fromEntries(PERM_ACTIONS.map((a) => [a, true])) as Record<PermAction, boolean>;
const allFalse = () => Object.fromEntries(PERM_ACTIONS.map((a) => [a, false])) as Record<PermAction, boolean>;
const viewOnly = (): Record<PermAction, boolean> => ({ View: true, Create: false, Edit: false, Delete: false });
const crudNoDelete = (): Record<PermAction, boolean> => ({ View: true, Create: true, Edit: true, Delete: false });

function forModules(fn: (m: PermModule) => Record<PermAction, boolean>): RolePerms {
  return Object.fromEntries(PERM_MODULES.map((m) => [m, fn(m)])) as RolePerms;
}

export function defaultRolePermissions(): RolePermissions {
  return {
    Owner: forModules(() => allTrue()),
    Manager: forModules((m) => (m === "Settings" ? viewOnly() : allTrue())),
    Cashier: forModules((m) => {
      if (m === "Sales" || m === "Customers") return crudNoDelete();
      if (m === "Products" || m === "Inventory") return viewOnly();
      return allFalse();
    }),
    Staff: forModules((m) => (m === "Products" || m === "Inventory" || m === "Sales" ? viewOnly() : allFalse())),
  };
}

/** Map app paths to permission modules. null = any logged-in user. */
export function moduleForPath(pathname: string): PermModule | null {
  if (pathname === "/profile" || pathname === "/notifications") return null;
  if (pathname === "/dashboard") return null;
  if (pathname.startsWith("/pos") || pathname.startsWith("/sales") || pathname.startsWith("/sale-returns")) return "Sales";
  if (pathname.startsWith("/purchases") || pathname.startsWith("/purchase-returns")) return "Purchases";
  if (pathname.startsWith("/products") || pathname.startsWith("/categories")) return "Products";
  if (pathname.startsWith("/inventory")) return "Inventory";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/suppliers")) return "Suppliers";
  if (pathname.startsWith("/expenses")) return "Expenses";
  if (pathname.startsWith("/reports")) return "Reports";
  if (
    pathname.startsWith("/users") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/accounts")
  ) {
    return "Settings";
  }
  return null;
}

export type NavAccess = { to: string; module: PermModule | null };

export const NAV_ACCESS: NavAccess[] = [
  { to: "/dashboard", module: null },
  { to: "/pos", module: "Sales" },
  { to: "/sales", module: "Sales" },
  { to: "/sale-returns", module: "Sales" },
  { to: "/purchases", module: "Purchases" },
  { to: "/purchase-returns", module: "Purchases" },
  { to: "/products", module: "Products" },
  { to: "/categories", module: "Products" },
  { to: "/inventory", module: "Inventory" },
  { to: "/customers", module: "Customers" },
  { to: "/suppliers", module: "Suppliers" },
  { to: "/staff", module: "Settings" },
  { to: "/accounts", module: "Settings" },
  { to: "/expenses", module: "Expenses" },
  { to: "/reports", module: "Reports" },
  { to: "/users", module: "Settings" },
];

export function can(
  perms: RolePermissions,
  role: Role,
  module: PermModule,
  action: PermAction = "View",
): boolean {
  if (role === "Owner") return true;
  return !!perms[role]?.[module]?.[action];
}

export function canAccessPath(perms: RolePermissions, role: Role, pathname: string): boolean {
  const mod = moduleForPath(pathname);
  if (!mod) return true;
  return can(perms, role, mod, "View");
}

export function firstAllowedPath(perms: RolePermissions, role: Role): string {
  for (const item of NAV_ACCESS) {
    if (!item.module || can(perms, role, item.module, "View")) return item.to;
  }
  return "/profile";
}
