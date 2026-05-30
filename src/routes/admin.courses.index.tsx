import { AdminCoursesSection } from "@/components/admin/AdminCoursesSection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/courses/")({
  component: AdminCoursesSection,
});
