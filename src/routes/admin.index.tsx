import { AdminOverviewSection } from "@/components/admin/AdminOverviewSection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewSection,
});
