import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/printer")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/shop" });
  },
});
