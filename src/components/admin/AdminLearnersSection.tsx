import { Badge } from "@/components/ui/badge";
import { BookUser } from "lucide-react";
import { EmptyState, SectionCard } from "./shared";
import { useAdminWorkspaceContext } from "./admin-context";

export function AdminLearnersSection() {
  const { learners, overview } = useAdminWorkspaceContext();

  return (
    <SectionCard
      icon={<BookUser className="size-5" />}
      title="Learners"
      description="Track active learners and how many course assignments each currently has."
    >
      <div className="mt-5 grid gap-3">
        {learners.length === 0 ? (
          <EmptyState
            title="No active learners"
            description="Invite a learner from Overview and activate them to see assignments here."
          />
        ) : (
          learners.map((member: any) => {
            const assignmentCount = (overview?.enrollments ?? []).filter(
              (enrollment: any) => enrollment.member?.id === member.id,
            ).length;

            return (
              <article
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/55 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {member.user?.email ?? member.user?.id ?? member.id}
                  </p>
                  <p className="text-sm text-slate-500">Role: learner</p>
                </div>

                <Badge variant="info">{assignmentCount} assigned courses</Badge>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
