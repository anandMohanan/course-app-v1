import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { BookOpenText } from "lucide-react";
import { EmptyState, SectionCard } from "./shared";
import { useAdminWorkspaceContext } from "./admin-context";

export function AdminCoursesSection() {
  const { templates, overview } = useAdminWorkspaceContext();

  return (
    <SectionCard
      icon={<BookOpenText className="size-5" />}
      title="Courses"
      description="Open a course to manage subjects and assign learners in context."
    >
      <div className="mt-5 grid gap-3">
        {templates.length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="Create a course from Overview first, then manage it here."
          />
        ) : (
          templates.map((course: any) => {
            const assignedCount = (overview?.enrollments ?? []).filter(
              (enrollment: any) => enrollment.course?.id === course.id,
            ).length;

            return (
              <article
                key={course.id}
                className="rounded-2xl border border-slate-200 bg-white/55 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-950">{course.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{course.goal}</p>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="info">
                      {course.subjects?.length ?? 0} subjects
                    </Badge>
                    <Badge variant="outline">{assignedCount} learners</Badge>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    render={
                      <Link
                        to="/admin/courses/$courseId"
                        params={{ courseId: course.id }}
                      />
                    }
                  >
                    Open Course
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
