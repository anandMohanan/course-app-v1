import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Course } from "./types";
import { firstLesson, lessonCount } from "./utils";

type CourseGridProps = {
  courses: Course[];
};

export function CourseGrid({ courses }: CourseGridProps) {
  const navigate = useNavigate();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => {
        const nextLesson = firstLesson(course);
        return (
          <article key={course.id} className="glass-card group p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full border border-cyan-200/70 bg-cyan-100/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-950">
                  {course.subject}
                </div>
                <h3 className="mt-4 text-xl font-extrabold tracking-[-0.035em]">
                  {course.title}
                </h3>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/45 p-3">
                <BookOpen className="size-5" />
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
              {course.goal}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
              <span className="rounded-full bg-white/55 px-3 py-1">
                {course.modules?.length ?? 0} modules
              </span>
              <span className="rounded-full bg-white/55 px-3 py-1">
                {lessonCount([course])} lessons
              </span>
              <span className="rounded-full bg-white/55 px-3 py-1">
                {course.weeklyTimeCommitment ?? "5-7 hrs"}
              </span>
            </div>

            <Button
              className="mt-5 w-full rounded-full bg-white/60 backdrop-blur hover:bg-white/80"
              variant="outline"
              disabled={!nextLesson}
              onClick={() => {
                if (!nextLesson) return;
                navigate({
                  to: "/courses/$courseId/lessons/$lessonId",
                  params: { courseId: course.id, lessonId: nextLesson.id },
                });
              }}
            >
              Open Course <ArrowRight />
            </Button>
          </article>
        );
      })}
    </section>
  );
}
