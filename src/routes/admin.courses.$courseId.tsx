import { AdminCourseDetailSection } from "@/components/admin/AdminCourseDetailSection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/courses/$courseId")({
  component: AdminCourseRoute,
});

function AdminCourseRoute() {
  const { courseId } = Route.useParams();
  return <AdminCourseDetailSection courseId={courseId} />;
}
