import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/invoice")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/shop" });
  },
});
