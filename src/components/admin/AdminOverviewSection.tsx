import { AdminWorkflowSteps } from "./AdminWorkflowSteps";
import { CreateCourseCard } from "./CreateCourseCard";
import { InviteMemberCard } from "./InviteMemberCard";
import { MembersCard } from "./MembersCard";
import { OrganizationSettingsCard } from "./OrganizationSettingsCard";
import { useAdminWorkspaceContext } from "./admin-context";

export function AdminOverviewSection() {
  const workspace = useAdminWorkspaceContext();
  const { templates, learners, overview } = workspace;

  return (
    <>
      <AdminWorkflowSteps
        courseCount={templates.length}
        learnerCount={learners.length}
      />

      <CreateCourseCard {...workspace} />

      <div className="grid gap-6 lg:grid-cols-2">
        <OrganizationSettingsCard {...workspace} />
        <InviteMemberCard {...workspace} />
      </div>

      <MembersCard members={overview?.members ?? []} />
    </>
  );
}
