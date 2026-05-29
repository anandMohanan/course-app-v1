import { BookOpen, ClipboardList, GraduationCap, Users } from "lucide-react";
import { WorkspaceStat } from "./shared";

type AdminHeaderProps = {
  refreshing: boolean;
  error: string | null;
  courseCount: number;
  subjectCount: number;
  learnerCount: number;
};

export function AdminHeader({
  refreshing,
  error,
  courseCount,
  subjectCount,
  learnerCount,
}: AdminHeaderProps) {
  return (
    <section className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
            <GraduationCap className="size-3.5" />
            Instructor Workspace
          </div>

          <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Manage courses, subjects, and learners
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            Start by creating a course, add its subjects and syllabus, then assign
            the course to active learners in your organization.
          </p>

          {refreshing && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Refreshing workspace data...
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
          <WorkspaceStat
            icon={<BookOpen className="size-4" />}
            label="Courses"
            value={courseCount}
          />
          <WorkspaceStat
            icon={<ClipboardList className="size-4" />}
            label="Subjects"
            value={subjectCount}
          />
          <WorkspaceStat
            icon={<Users className="size-4" />}
            label="Active learners"
            value={learnerCount}
          />
        </div>
      </div>
    </section>
  );
}
