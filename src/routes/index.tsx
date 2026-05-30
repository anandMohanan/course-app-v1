import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { clientDb } from "@/lib/db";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  loader: async () => {
    const auth = await clientDb.getAuth();
    if (!auth) throw redirect({ to: "/login" });
  },
  ssr: false,
});
