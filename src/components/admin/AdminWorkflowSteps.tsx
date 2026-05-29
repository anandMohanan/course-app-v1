import { WorkflowStep } from "./shared";

type AdminWorkflowStepsProps = {
  courseCount: number;
  learnerCount: number;
};

export function AdminWorkflowSteps({
  courseCount,
  learnerCount,
}: AdminWorkflowStepsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <WorkflowStep
        number="1"
        title="Create a course"
        description="Set the course title, level, learning goal, and default weekly workload."
        active
      />
      <WorkflowStep
        number="2"
        title="Add subjects"
        description="Break the course into subjects and attach syllabus text or PDFs."
        active={courseCount > 0}
      />
      <WorkflowStep
        number="3"
        title="Assign learners"
        description="Give active learners access to the course when it is ready."
        active={courseCount > 0 && learnerCount > 0}
      />
    </section>
  );
}
