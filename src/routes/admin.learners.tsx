import { AdminLearnersSection } from "@/components/admin/AdminLearnersSection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/learners")({
  component: AdminLearnersSection,
});
