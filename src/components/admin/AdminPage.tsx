import { AdminHeader } from "./AdminHeader";
import { AdminWorkflowSteps } from "./AdminWorkflowSteps";
import { AssignCourseCard } from "./AssignCourseCard";
import { CourseSubjectsCard } from "./CourseSubjectsCard";
import { CreateCourseCard } from "./CreateCourseCard";
import { InviteMemberCard } from "./InviteMemberCard";
import { MembersCard } from "./MembersCard";
import { OrganizationSettingsCard } from "./OrganizationSettingsCard";
import { useAdminWorkspace } from "./useAdminWorkspace";

export function AdminPage() {
  const workspace = useAdminWorkspace();
  const {
    auth,
    overview,
    error,
    loading,
    refreshing,
    canManage,
    learners,
    templates,
    totalSubjects,
  } = workspace;

  if (auth.isLoading || loading) {
    return <main className="learning-shell p-6">Loading admin workspace...</main>;
  }

  if (!canManage) {
    return (
      <main className="learning-shell p-6">
        Only instructors and admins can manage this workspace.
      </main>
    );
  }

  return (
    <main className="learning-shell relative min-h-[calc(100dvh-73px)] overflow-hidden p-4 sm:p-6 lg:p-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <AdminHeader
          refreshing={refreshing}
          error={error}
          courseCount={templates.length}
          subjectCount={totalSubjects}
          learnerCount={learners.length}
        />

        <AdminWorkflowSteps
          courseCount={templates.length}
          learnerCount={learners.length}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          <CreateCourseCard {...workspace} />
          <CourseSubjectsCard {...workspace} />
        </div>

        <AssignCourseCard {...workspace} />

        <div className="grid gap-6 lg:grid-cols-2">
          <OrganizationSettingsCard {...workspace} />
          <InviteMemberCard {...workspace} />
        </div>

        <MembersCard members={overview?.members ?? []} />
      </section>
    </main>
  );
}
