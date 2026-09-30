import { createFileRoute, redirect } from "@tanstack/react-router";

/** Users live under each shop now — keep this path as a redirect. */
export const Route = createFileRoute("/admin/users")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/shops" });
  },
});
