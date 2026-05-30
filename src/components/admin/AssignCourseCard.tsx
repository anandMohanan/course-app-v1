import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import type { FormEvent } from "react";
import { EmptyState, FieldLabel, SectionCard } from "./shared";
import type { AdminWorkspace } from "./useAdminWorkspace";

type AssignCourseCardProps = Pick<
  AdminWorkspace,
  | "auth"
  | "overview"
  | "load"
  | "handleError"
  | "assignFn"
  | "templates"
  | "assignableLearners"
  | "selectedCourse"
  | "setSelectedCourse"
  | "selectedCourseName"
  | "selectedMember"
  | "setSelectedMember"
  | "selectedMemberLabel"
>;

export function AssignCourseCard({
  auth,
  overview,
  load,
  handleError,
  assignFn,
  templates,
  assignableLearners,
  selectedCourse,
  setSelectedCourse,
  selectedCourseName,
  selectedMember,
  setSelectedMember,
  selectedMemberLabel,
}: AssignCourseCardProps) {
  return (
    <SectionCard
      icon={<CheckCircle2 className="size-5" />}
      title="Assign Course to Learner"
      description="Assign a course to active or invited learners. Invited learners will see it after signup."
    >
      <form
        className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();

          if (
            !auth.user ||
            !overview?.organization?.id ||
            !selectedCourse ||
            !selectedMember
          ) {
            return;
          }

          try {
            await assignFn({
              data: {
                actorUserId: auth.user.id,
                orgId: overview.organization.id,
                courseId: selectedCourse,
                memberId: selectedMember,
              },
            });

            await load({ silent: true });
          } catch (caught) {
            handleError(caught, "Could not assign course");
          }
        }}
      >
        <div>
          <FieldLabel
            label="Course"
            help="Choose the course you want to assign."
          />
          <Select
            value={selectedCourse}
            onValueChange={(value) => value && setSelectedCourse(value)}
          >
            <SelectTrigger>
              <span
                className={selectedCourseName ? undefined : "text-slate-500"}
              >
                {selectedCourseName || "Choose course"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {templates.map((course: any) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel
            label="Learner"
            help="Active and invited learners can receive assignments."
          />
          <Select
            value={selectedMember}
            onValueChange={(value) => value && setSelectedMember(value)}
          >
            <SelectTrigger>
              <span
                className={selectedMemberLabel ? undefined : "text-slate-500"}
              >
                {selectedMemberLabel || "Choose learner"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {assignableLearners.map((member: any) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.user?.email ?? member.user?.id ?? member.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="self-end"
          type="submit"
          disabled={!selectedCourse || !selectedMember}
        >
          Assign Course
        </Button>
      </form>

      {templates.length === 0 && (
        <div className="mt-4">
          <EmptyState
            title="Create a course first"
            description="You need at least one course before assigning learners."
          />
        </div>
      )}

      {templates.length > 0 && assignableLearners.length === 0 && (
        <div className="mt-4">
          <EmptyState
            title="No assignable learners"
            description="Invite or activate a learner before assigning a course."
          />
        </div>
      )}
    </SectionCard>
  );
}
