import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { OrgRole } from "@/lib/org";
import { UserPlus } from "lucide-react";
import type { FormEvent } from "react";
import { FieldLabel, SectionCard } from "./shared";
import type { MemberStatus } from "./types";
import type { AdminWorkspace } from "./useAdminWorkspace";

type InviteMemberCardProps = Pick<
  AdminWorkspace,
  | "auth"
  | "overview"
  | "load"
  | "handleError"
  | "inviteFn"
  | "targetUserId"
  | "setTargetUserId"
  | "memberRole"
  | "setMemberRole"
  | "memberStatus"
  | "setMemberStatus"
>;

export function InviteMemberCard({
  auth,
  overview,
  load,
  handleError,
  inviteFn,
  targetUserId,
  setTargetUserId,
  memberRole,
  setMemberRole,
  memberStatus,
  setMemberStatus,
}: InviteMemberCardProps) {
  return (
    <SectionCard
      icon={<UserPlus className="size-5" />}
      title="Invite Member"
      description="Invite instructors, admins, or learners into this organization."
    >
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();

          if (!auth.user || !overview?.organization?.id) return;

          try {
            const normalizedTarget = targetUserId.trim();
            const isEmailTarget = normalizedTarget.includes("@");
            await inviteFn({
              data: {
                actorUserId: auth.user.id,
                orgId: overview.organization.id,
                targetUserId: isEmailTarget ? undefined : normalizedTarget,
                targetUserEmail: isEmailTarget ? normalizedTarget : undefined,
                role: memberRole,
                status: memberStatus,
              },
            });

            setTargetUserId("");
            await load({ silent: true });
          } catch (caught) {
            handleError(caught, "Could not invite member");
          }
        }}
      >
        <div>
          <FieldLabel
            label="Target user email or ID"
            help="Use email to invite users before signup, or Instant user ID for existing users."
          />
          <Input
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            placeholder="name@school.edu or Instant user ID"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel
              label="Role"
              help="Instructors manage content. Learners consume assigned courses."
            />
            <Select
              value={memberRole}
              onValueChange={(value) =>
                value && setMemberRole(value as OrgRole)
              }
            >
              <SelectTrigger>
                <span>{memberRole}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_admin">org_admin</SelectItem>
                <SelectItem value="instructor">instructor</SelectItem>
                <SelectItem value="learner">learner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel
              label="Status"
              help="Invited is pending, active consumes a seat, disabled removes access."
            />
            <Select
              value={memberStatus}
              onValueChange={(value) =>
                setMemberStatus(value as MemberStatus)
              }
            >
              <SelectTrigger>
                <span>{memberStatus}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invited">invited</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          variant="outline"
          disabled={!targetUserId.trim()}
        >
          Invite Member
        </Button>
      </form>
    </SectionCard>
  );
}
