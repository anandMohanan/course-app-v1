import { AdminLayout } from "@/components/admin/AdminLayout";
import { clientDb } from "@/lib/db";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  loader: async () => {
    const auth = await clientDb.getAuth();

    if (!auth) {
      throw redirect({ to: "/login" });
    }
  },
  ssr: false,
});
