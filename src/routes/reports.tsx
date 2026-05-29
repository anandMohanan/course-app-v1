import { Button } from "@/components/ui/button";
import { clientDb } from "@/lib/db";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const DAY_MS = 24 * 60 * 60 * 1000;

type Timeframe = "7d" | "30d" | "all";
type Verdict = "correct" | "partial" | "incorrect";

type Attempt = {
  id: string;
  score: number;
  verdict: Verdict;
  createdAt: number;
};

type LessonNode = {
  id: string;
  title: string;
  learningCards?: Array<{ id: string; type: string; attempts?: Attempt[] }>;
};

type CourseNode = {
  id: string;
  title: string;
  subject: string;
  ownerId: string;
  orgId?: string;
  modules?: Array<{ lessons?: LessonNode[] }>;
};

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  loader: async () => {
    const auth = await clientDb.getAuth();
    if (!auth) {
      throw redirect({ to: "/login" });
    }
  },
  ssr: false,
});

function ReportsPage() {
  const navigate = useNavigate();
  const auth = clientDb.useAuth();
  const requesterId = auth.user?.id ?? NIL_UUID;
  const activeOrgId =
    (auth.user as { activeOrgId?: string } | undefined)?.activeOrgId ?? NIL_UUID;
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [learnerFilter, setLearnerFilter] = useState<string>("self");

  const { isLoading, error, data } = clientDb.useQuery({
    organizationMembers: {
      $: {
        where: {
          and: [
            { "organization.id": activeOrgId },
            { "user.id": requesterId },
            { status: "active" },
          ],
        },
      },
    },
    courseEnrollments: {
      $: {
        where: { and: [{ orgId: activeOrgId }, { status: "active" }] },
      },
      member: { user: {} },
      course: {},
    },
    courses: {
      $: {
        where: {
          or: [{ ownerId: requesterId }, { orgId: activeOrgId }],
        },
        order: { updatedAt: "desc" },
      },
      modules: {
        lessons: {
          learningCards: {
            attempts: {},
          },
        },
      },
      enrollments: {
        member: { user: {} },
      },
    },
  } as any) as {
    isLoading: boolean;
    error: { message?: string } | null;
    data: any;
  };

  const role = (data?.organizationMembers as Array<{ role?: string }> | undefined)?.[0]
    ?.role;
  const canViewOthers = role === "org_admin" || role === "instructor";

  const learnerOptions = useMemo(() => {
    const rows =
      (data?.courseEnrollments as Array<{ member?: { user?: { id: string; email?: string } } }> | undefined) ?? [];
    const unique = new Map<string, { id: string; label: string }>();
    rows.forEach((row) => {
      const user = row.member?.user;
      if (!user?.id) return;
      if (!unique.has(user.id)) {
        unique.set(user.id, { id: user.id, label: user.email ?? user.id });
      }
    });
    return Array.from(unique.values());
  }, [data?.courseEnrollments]);

  const selectedLearnerId =
    canViewOthers && learnerFilter !== "self" ? learnerFilter : requesterId;

  const filteredCourses = useMemo(() => {
    const all = ((data?.courses as CourseNode[] | undefined) ?? []).filter(
      (course) => course.ownerId === selectedLearnerId || course.orgId === activeOrgId,
    );
    if (subjectFilter === "all") return all;
    return all.filter((course) => course.subject === subjectFilter);
  }, [data?.courses, selectedLearnerId, activeOrgId, subjectFilter]);

  const subjects = useMemo(() => {
    return Array.from(new Set((((data?.courses as CourseNode[] | undefined) ?? []).map((c) => c.subject).filter(Boolean))));
  }, [data?.courses]);

  const performance = useMemo(() => {
    const cutoff =
      timeframe === "all"
        ? 0
        : Date.now() - (timeframe === "7d" ? 7 : 30) * DAY_MS;

    const subjectMap = new Map<
      string,
      {
        attempts: Attempt[];
        totalLessons: number;
        completedLessons: number;
        lessonStats: Array<{
          lessonId: string;
          lessonTitle: string;
          attempts: number;
          avgScore: number;
          latestVerdict: Verdict | null;
          incorrectRatio: number;
        }>;
      }
    >();

    filteredCourses.forEach((course) => {
      const lessons = (course.modules ?? []).flatMap((m) => m.lessons ?? []);
      const lessonStats = lessons.map((lesson) => {
        const cards = lesson.learningCards ?? [];
        const attempts = cards
          .flatMap((card) => card.attempts ?? [])
          .filter((a) => a.createdAt >= cutoff);
        const incorrectCount = attempts.filter((a) => a.verdict === "incorrect").length;
        const avgScore =
          attempts.length === 0
            ? 0
            : Math.round(
                attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length,
              );
        const latestVerdict = attempts.length
          ? [...attempts].sort((a, b) => b.createdAt - a.createdAt)[0].verdict
          : null;
        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          attempts: attempts.length,
          avgScore,
          latestVerdict,
          incorrectRatio: attempts.length === 0 ? 0 : incorrectCount / attempts.length,
        };
      });

      const subjectAttempts = lessons
        .flatMap((lesson) => (lesson.learningCards ?? []).flatMap((card) => card.attempts ?? []))
        .filter((a) => a.createdAt >= cutoff);
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((lesson) =>
        (lesson.learningCards ?? []).some((card) => card.type === "complete"),
      ).length;

      const current = subjectMap.get(course.subject) ?? {
        attempts: [],
        totalLessons: 0,
        completedLessons: 0,
        lessonStats: [],
      };
      current.attempts.push(...subjectAttempts);
      current.totalLessons += totalLessons;
      current.completedLessons += completedLessons;
      current.lessonStats.push(...lessonStats);
      subjectMap.set(course.subject, current);
    });

    return Array.from(subjectMap.entries()).map(([subject, value]) => {
      const totalAttempts = value.attempts.length;
      const avgScore =
        totalAttempts === 0
          ? 0
          : Math.round(
              value.attempts.reduce((sum, item) => sum + item.score, 0) / totalAttempts,
            );
      const verdictCounts = {
        correct: value.attempts.filter((a) => a.verdict === "correct").length,
        partial: value.attempts.filter((a) => a.verdict === "partial").length,
        incorrect: value.attempts.filter((a) => a.verdict === "incorrect").length,
      };
      const completion =
        value.totalLessons === 0
          ? 0
          : Math.round((value.completedLessons / value.totalLessons) * 100);
      const weakLessons = [...value.lessonStats]
        .filter((lesson) => lesson.attempts > 0)
        .sort((a, b) => a.avgScore - b.avgScore || b.incorrectRatio - a.incorrectRatio)
        .slice(0, 3);

      return {
        subject,
        totalAttempts,
        avgScore,
        verdictCounts,
        completion,
        lessons: value.lessonStats.sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle)),
        weakLessons,
      };
    });
  }, [filteredCourses, timeframe]);

  if (auth.isLoading || isLoading) {
    return (
      <main className="learning-shell min-h-[calc(100dvh-73px)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="glass-panel p-5 text-sm font-medium text-slate-700">
            Preparing performance report...
          </div>
        </section>
      </main>
    );
  }

  if (auth.error || error) {
    return (
      <main className="learning-shell min-h-[calc(100dvh-73px)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="glass-panel p-5 text-sm font-medium text-rose-700">
            {auth.error?.message ?? error?.message ?? "Could not load report"}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="learning-shell min-h-[calc(100dvh-73px)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
              <ArrowLeft />
            </Button>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-800">
                Reports
              </div>
              <h1 className="text-xl font-medium tracking-[-0.03em]">Subject Performance</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-xl border border-white/70 bg-white/70 px-3 text-sm"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              <option value="all">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-white/70 bg-white/70 px-3 text-sm"
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value as Timeframe)}
            >
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="all">All time</option>
            </select>
            {canViewOthers && (
              <select
                className="h-10 rounded-xl border border-white/70 bg-white/70 px-3 text-sm"
                value={learnerFilter}
                onChange={(event) => setLearnerFilter(event.target.value)}
              >
                <option value="self">Me</option>
                {learnerOptions.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {performance.length === 0 ? (
          <div className="glass-panel p-6 text-sm font-medium text-slate-700">
            No submissions found for the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {performance.map((item) => (
              <article key={item.subject} className="glass-panel p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium tracking-[-0.02em]">{item.subject}</h2>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                      {item.totalAttempts} attempts
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-white/70 px-3 py-1">Avg score: {item.avgScore}</span>
                    <span className="rounded-full bg-white/70 px-3 py-1">Completion: {item.completion}%</span>
                  </div>
                </div>
                <div className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    Correct: {item.verdictCounts.correct}
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    Partial: {item.verdictCounts.partial}
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                    Incorrect: {item.verdictCounts.incorrect}
                  </div>
                </div>
                {item.weakLessons.length > 0 && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm">
                    <div className="mb-2 inline-flex items-center gap-2 font-medium">
                      <TrendingUp className="size-4" /> Focus lessons
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.weakLessons.map((lesson) => (
                        <span key={lesson.lessonId} className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white">
                          {lesson.lessonTitle} (score {lesson.avgScore})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-slate-600">
                        <th className="pb-2 pr-3 font-medium">Lesson</th>
                        <th className="pb-2 pr-3 font-medium">Attempts</th>
                        <th className="pb-2 pr-3 font-medium">Avg score</th>
                        <th className="pb-2 pr-3 font-medium">Latest verdict</th>
                        <th className="pb-2 pr-3 font-medium">Incorrect %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.lessons.map((lesson) => (
                        <tr key={lesson.lessonId} className="border-t border-slate-200/70">
                          <td className="py-2 pr-3">{lesson.lessonTitle}</td>
                          <td className="py-2 pr-3">{lesson.attempts}</td>
                          <td className="py-2 pr-3">{lesson.avgScore}</td>
                          <td className="py-2 pr-3">{lesson.latestVerdict ?? "-"}</td>
                          <td className="py-2 pr-3">{Math.round(lesson.incorrectRatio * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
