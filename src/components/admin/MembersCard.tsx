import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { EmptyState, SectionCard } from "./shared";

type MembersCardProps = {
  members: any[];
};

export function MembersCard({ members }: MembersCardProps) {
  return (
    <SectionCard
      icon={<Users className="size-5" />}
      title="Members"
      description="View people currently connected to this organization."
    >
      <div className="mt-5 grid gap-3">
        {members.length > 0 ? (
          members.map((member: any) => (
            <article
              key={member.id}
              className="rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {member.user?.email ??
                      member.user?.id ??
                      "unknown-user"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Member ID: {member.id}
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <Badge variant="info">{member.role}</Badge>
                  <Badge
                    variant={
                      member.status === "active"
                        ? "success"
                        : member.status === "invited"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {member.status}
                  </Badge>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="No members found"
            description="Invite members to start building your learning workspace."
          />
        )}
      </div>
    </SectionCard>
  );
}
