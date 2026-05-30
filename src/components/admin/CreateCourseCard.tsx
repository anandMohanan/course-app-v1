import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen } from "lucide-react";
import type { FormEvent } from "react";
import { FieldLabel, SectionCard } from "./shared";
import type { AdminWorkspace } from "./useAdminWorkspace";
import type { WeeklyTimeCommitment } from "./types";

type CreateCourseCardProps = Pick<
  AdminWorkspace,
  | "auth"
  | "overview"
  | "load"
  | "handleError"
  | "createTemplateFn"
  | "templateTitle"
  | "setTemplateTitle"
  | "templateLevel"
  | "setTemplateLevel"
  | "templateGoal"
  | "setTemplateGoal"
  | "templateWeeklyTime"
  | "setTemplateWeeklyTime"
>;

export function CreateCourseCard({
  auth,
  overview,
  load,
  handleError,
  createTemplateFn,
  templateTitle,
  setTemplateTitle,
  templateLevel,
  setTemplateLevel,
  templateGoal,
  setTemplateGoal,
  templateWeeklyTime,
  setTemplateWeeklyTime,
}: CreateCourseCardProps) {
  return (
    <SectionCard
      icon={<BookOpen className="size-5" />}
      title="Create Course"
      description="Create a reusable course that can be assigned to one or more learners."
    >
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();

          if (!auth.user || !overview?.organization?.id) return;

          try {
            await createTemplateFn({
              data: {
                actorUserId: auth.user.id,
                orgId: overview.organization.id,
                title: templateTitle,
                level: templateLevel,
                goal: templateGoal,
                weeklyTimeCommitment: templateWeeklyTime,
              },
            });

            setTemplateTitle("");
            await load({ silent: true });
          } catch (caught) {
            handleError(caught, "Could not create course");
          }
        }}
      >
        <div>
          <FieldLabel
            label="Course title"
            help="The course name learners will see."
          />
          <Input
            value={templateTitle}
            onChange={(event) => setTemplateTitle(event.target.value)}
            placeholder="Example: Introduction to Economics"
            required
          />
        </div>

        <div>
          <FieldLabel
            label="Target level"
            help="The learner level this course is designed for."
          />
          <Input
            value={templateLevel}
            onChange={(event) => setTemplateLevel(event.target.value)}
            placeholder="Example: First year undergraduate"
            required
          />
        </div>

        <div>
          <FieldLabel
            label="Learning goal"
            help="The main outcome learners should achieve by completing this course."
          />
          <Textarea
            value={templateGoal}
            onChange={(event) => setTemplateGoal(event.target.value)}
            placeholder="Describe what learners should understand or be able to do."
            required
          />
        </div>

        <div>
          <FieldLabel
            label="Default weekly time"
            help="The expected weekly workload before learner personalization."
          />
          <Select
            value={templateWeeklyTime}
            onValueChange={(value) =>
              setTemplateWeeklyTime(value as WeeklyTimeCommitment)
            }
          >
            <SelectTrigger>
              <span>{templateWeeklyTime}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2-4 hrs">2-4 hrs</SelectItem>
              <SelectItem value="5-7 hrs">5-7 hrs</SelectItem>
              <SelectItem value="8-10 hrs">8-10 hrs</SelectItem>
              <SelectItem value="10+ hrs">10+ hrs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={!templateTitle.trim()}>
          Create Course
        </Button>
      </form>
    </SectionCard>
  );
}
