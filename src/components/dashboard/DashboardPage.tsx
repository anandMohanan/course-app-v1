import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { CourseGrid } from "./CourseGrid";
import { CourseWizard } from "./CourseWizard";
import { EmptyCourses } from "./EmptyCourses";
import { DashboardShell } from "./shared";
import { NIL_UUID } from "./types";
import { useDashboard } from "./useDashboard";

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    auth,
    isLoading,
    error,
    orgState,
    orgError,
    ownerId,
    activeOrgId,
    wizardOpen,
    setWizardOpen,
    courses,
    templateCourses,
    canCreateCourse,
    billingBlocksCreate,
    createLearnerInstanceFn,
  } = useDashboard();

  if (auth.isLoading || isLoading || !orgState) {
    return <DashboardShell status="Preparing your workspace" />;
  }

  if (auth.error || error) {
    return (
      <DashboardShell
        status={auth.error?.message ?? error?.message ?? "Something went wrong"}
      />
    );
  }

  return (
    <main className="learning-shell min-h-[calc(100dvh-73px)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="glass-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-end sm:p-5">
          {orgError && (
            <p className="mr-auto text-sm font-semibold text-rose-700">
              {orgError}
            </p>
          )}
          <Button
            variant="outline"
            className="rounded-full bg-white/65"
            onClick={() => navigate({ to: "/reports" })}
          >
            Reports
          </Button>
          <Button
            className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
            size="lg"
            onClick={() => setWizardOpen(true)}
            disabled={!canCreateCourse || billingBlocksCreate}
          >
            <Sparkles /> Create course
          </Button>
        </div>

        {courses.length === 0 ? (
          <EmptyCourses
            onCreate={() => setWizardOpen(true)}
            disabled={!canCreateCourse}
          />
        ) : (
          <CourseGrid courses={courses} />
        )}
      </section>

      {wizardOpen && (
        <CourseWizard
          ownerId={ownerId}
          orgId={activeOrgId === NIL_UUID ? null : activeOrgId}
          createLearnerInstanceFn={createLearnerInstanceFn}
          templateCourses={templateCourses}
          onClose={() => setWizardOpen(false)}
          onCreated={(courseId, lessonId) => {
            setWizardOpen(false);
            navigate({
              to: "/courses/$courseId/lessons/$lessonId",
              params: { courseId, lessonId },
            });
          }}
        />
      )}
    </main>
  );
}
