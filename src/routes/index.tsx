import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionUser, sessionHome } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopOnline — Simple POS & Inventory Management for Your Shop" },
      { name: "description", content: "POS, inventory, sales and accounts for accessories shops in Pakistan." },
      { property: "og:title", content: "ShopOnline — Simple POS & Inventory Management" },
      { property: "og:description", content: "POS, inventory, sales and accounts for accessories shops in Pakistan." },
    ],
  }),
  beforeLoad: () => {
    const user = getSessionUser();
    if (user && user.status === "Active") {
      throw redirect({ to: sessionHome() as "/dashboard" });
    }
    throw redirect({ to: "/login" });
  },
});
