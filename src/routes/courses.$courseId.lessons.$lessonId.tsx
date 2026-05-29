import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent, MarkdownInlineContent } from "@/components/learning/MarkdownContent";
import { WorkspaceStatus } from "@/components/learning/WorkspaceStatus";
import { clientDb } from "@/lib/db";
import type { CardQuestion, LearningCard, LessonProgress, WorkspaceCourse, WorkspaceLesson } from "@/components/learning/types";
import { courseContext, feedbackHistorySummary, flattenLessons, iconForCard, labelForCard, lessonIsComplete, normalizeCourse, objectiveContext, parseFeedbackHistory, parseOptions, sortedCards } from "@/components/learning/utils";
import { type EvaluateCardAnswerResult, GeneratedLearningCard, askCardQuestion, evaluateCardAnswer, generateNextLearningCard } from "@/lib/learningAi";
import { id } from "@instantdb/react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PartyPopper,
  PencilLine,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export const Route = createFileRoute("/courses/$courseId/lessons/$lessonId")({
  component: LearningWorkspace,
  loader: async () => {
    const auth = await clientDb.getAuth();
    if (!auth) {
      throw redirect({ to: "/login" });
    }
  },
  ssr: false,
});

function LearningWorkspace() {
  const { courseId, lessonId } = Route.useParams();
  const navigate = useNavigate();
  const auth = clientDb.useAuth();
  const ownerId = auth.user?.id ?? NIL_UUID;
  const activeOrgId =
    (auth.user as { activeOrgId?: string } | undefined)?.activeOrgId ?? NIL_UUID;
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isObjectivesCollapsed, setIsObjectivesCollapsed] = useState(false);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notepadText, setNotepadText] = useState("");
  const noteStorageKey = `lesson-notepad:${courseId}:${lessonId}`;
  const { isLoading, error, data } = clientDb.useQuery({
    courses: {
      $: {
        where: {
          and: [{ id: courseId }, { or: [{ ownerId }, { orgId: activeOrgId }] }],
        },
      },
      modules: {
        lessons: {
          learningCards: {
            cardQuestions: { $: { where: { ownerId } } },
          },
          progressEntries: {
            $: { where: { ownerId } },
          },
        },
      },
    },
    organizationMembers: {
      $: {
        where: {
          and: [
            { "organization.id": activeOrgId },
            { "user.id": ownerId },
            { status: "active" },
          ],
        },
      },
    },
    courseEnrollments: {
      $: {
        where: {
          and: [
            { orgId: activeOrgId },
            { "course.id": courseId },
            { "member.user.id": ownerId },
            { status: "active" },
          ],
        },
      },
    },
  } as any) as {
    isLoading: boolean;
    error: { message?: string } | null;
    data: any;
  };

  const course = useMemo(
    () => normalizeCourse(data?.courses?.[0] as WorkspaceCourse | undefined),
    [data],
  );
  const allLessons = useMemo(() => flattenLessons(course), [course]);
  const lesson = useMemo(
    () => allLessons.find((item) => item.id === lessonId) ?? null,
    [allLessons, lessonId],
  );
  const cards = useMemo(() => sortedCards(lesson), [lesson]);
  const lessonProgress = useMemo(
    () => ((lesson?.progressEntries ?? [])[0] as LessonProgress | undefined) ?? null,
    [lesson],
  );
  const currentCard = cards[activeCardIndex] ?? null;
  const currentLessonIndex = allLessons.findIndex((item) => item.id === lessonId);
  const nextLesson = allLessons[currentLessonIndex + 1] ?? null;
  const firstIncompleteLessonIndex = allLessons.findIndex((item) => !lessonIsComplete(item));
  const isCurrentLessonLocked =
    firstIncompleteLessonIndex !== -1 && currentLessonIndex > firstIncompleteLessonIndex;
  const currentObjectiveComplete = lessonIsComplete(lesson);
  const availableNextLesson = currentObjectiveComplete ? nextLesson : null;
  const previousLesson = allLessons[currentLessonIndex - 1] ?? null;
  const myMembership = (
    data?.organizationMembers as Array<{ role?: string }> | undefined
  )?.[0];
  const isLearner = myMembership?.role === "learner";
  const hasEnrollment =
    ((data?.courseEnrollments as Array<{ id: string }> | undefined)?.length ?? 0) > 0;
  const isOwnedCourse = course?.ownerId === ownerId;
  const restoredLessonIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (auth.isLoading || isLoading) return;
    console.info("[LearningWorkspace] query:resolved", {
      route: { courseId, lessonId },
      auth: {
        ownerId,
        activeOrgId,
      },
      querySummary: {
        courseCount: (data?.courses as Array<unknown> | undefined)?.length ?? 0,
        membershipCount:
          (data?.organizationMembers as Array<unknown> | undefined)?.length ?? 0,
        enrollmentCount:
          (data?.courseEnrollments as Array<unknown> | undefined)?.length ?? 0,
      },
      resolved: {
        hasCourse: !!course,
        lessonCount: allLessons.length,
        hasLesson: !!lesson,
        isLearner,
        hasEnrollment,
        isOwnedCourse,
      },
    });
  }, [
    auth.isLoading,
    isLoading,
    courseId,
    lessonId,
    ownerId,
    activeOrgId,
    data,
    course,
    lesson,
    allLessons.length,
    isLearner,
    hasEnrollment,
    isOwnedCourse,
  ]);

  useEffect(() => {
    restoredLessonIdRef.current = null;
    setIsGeneratingCard(false);
    setUiError(null);
  }, [lessonId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedNote = window.localStorage.getItem(noteStorageKey);
    setNotepadText(savedNote ?? "");
  }, [noteStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(noteStorageKey, notepadText);
  }, [noteStorageKey, notepadText]);

  useEffect(() => {
    if (!lesson) return;
    if (restoredLessonIdRef.current === lesson.id) return;
    restoredLessonIdRef.current = lesson.id;

    if (cards.length === 0) {
      setActiveCardIndex(0);
      return;
    }
    setActiveCardIndex(clampCardIndex(lessonProgress?.currentCardPosition ?? 0, cards.length));
  }, [lesson, cards.length, lessonProgress?.currentCardPosition]);

  useEffect(() => {
    if (cards.length === 0) {
      setActiveCardIndex(0);
      return;
    }
    setActiveCardIndex((index) => clampCardIndex(index, cards.length));
  }, [cards.length]);

  useEffect(() => {
    if (auth.isLoading || isLoading || !course || !lesson || !isCurrentLessonLocked) return;
    const targetLesson = allLessons[firstIncompleteLessonIndex];
    if (!targetLesson) return;

    navigate({
      to: "/courses/$courseId/lessons/$lessonId",
      params: { courseId, lessonId: targetLesson.id },
      replace: true,
    });
  }, [
    auth.isLoading,
    isLoading,
    course,
    lesson,
    isCurrentLessonLocked,
    allLessons,
    firstIncompleteLessonIndex,
    courseId,
    navigate,
  ]);

  if (auth.isLoading || isLoading) {
    return <WorkspaceStatus status="Opening your lesson" />;
  }

  if (auth.error || error) {
    return (
      <WorkspaceStatus
        status={auth.error?.message ?? error?.message ?? "Could not load lesson"}
      />
    );
  }

  if (!course || !lesson) {
    console.warn("[LearningWorkspace] guard:missing-course-or-lesson", {
      route: { courseId, lessonId },
      ownerId,
      activeOrgId,
      courseFound: !!course,
      lessonFound: !!lesson,
      availableLessonIds: allLessons.map((item) => item.id),
    });
    return <WorkspaceStatus status="Learning objective not found for this student account." />;
  }

  if (course.orgId && isLearner && !isOwnedCourse && !hasEnrollment) {
    console.warn("[LearningWorkspace] guard:not-assigned", {
      route: { courseId, lessonId },
      ownerId,
      activeOrgId,
      courseOrgId: course.orgId,
      isLearner,
      hasEnrollment,
      isOwnedCourse,
    });
    return <WorkspaceStatus status="This course is not assigned to your learner profile." />;
  }

  if (isCurrentLessonLocked) {
    return <WorkspaceStatus status="Finish the current objective first." />;
  }

  const goToLesson = (targetLessonId: string) => {
    const targetIndex = allLessons.findIndex((item) => item.id === targetLessonId);
    if (
      firstIncompleteLessonIndex !== -1 &&
      targetIndex > firstIncompleteLessonIndex
    ) {
      setUiError("Finish the current objective first.");
      return;
    }

    navigate({
      to: "/courses/$courseId/lessons/$lessonId",
      params: { courseId, lessonId: targetLessonId },
    });
  };

  const moveToCard = (nextIndex: number) => {
    if (!lesson) return;
    if (cards.length > 0 && nextIndex >= cards.length) {
      setActiveCardIndex(nextIndex);
      return;
    }
    const clampedIndex = clampCardIndex(nextIndex, cards.length);
    setActiveCardIndex(clampedIndex);
    persistLessonProgress({
      lessonId: lesson.id,
      ownerId,
      orgId: course?.orgId ?? lesson.orgId,
      cards,
      nextIndex: clampedIndex,
      existingProgressId: lessonProgress?.id,
    });
  };

  const handleCardGenerated = (newIndex: number) => {
    if (!lesson) return;
    const clampedIndex = clampCardIndex(newIndex, cards.length + 1);
    setActiveCardIndex(clampedIndex);
    persistLessonProgress({
      lessonId: lesson.id,
      ownerId,
      orgId: course?.orgId ?? lesson.orgId,
      cards,
      nextIndex: clampedIndex,
      existingProgressId: lessonProgress?.id,
    });
  };

  return (
    <main className="learning-shell min-h-dvh px-3 py-4 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-4">
        <WorkspaceHeader course={course} lesson={lesson} onBack={() => navigate({ to: "/" })} />

        <details className="glass-panel group p-3 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2 py-1 text-sm font-medium text-slate-800">
            <span className="inline-flex items-center gap-2">
              <Menu className="size-4" /> Learning objectives
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-800">
              {currentLessonIndex + 1}/{allLessons.length}
            </span>
          </summary>
          <div className="mt-3">
            <ObjectiveRail
              course={course}
              activeLessonId={lesson.id}
              onSelectLesson={goToLesson}
            />
          </div>
        </details>

        <div
          className={
            isObjectivesCollapsed
              ? "learning-workspace-grid grid min-h-[720px] gap-4 lg:min-h-0 lg:grid-cols-[64px_minmax(0,1fr)_112px] xl:grid-cols-[72px_minmax(0,1fr)_124px]"
              : "learning-workspace-grid grid min-h-[720px] gap-4 lg:min-h-0 lg:grid-cols-[280px_minmax(0,1fr)_112px] xl:grid-cols-[320px_minmax(0,1fr)_124px]"
          }
        >
          <aside className="workspace-side-panel hidden min-h-0 lg:block">
            {isObjectivesCollapsed ? (
              <CollapsedObjectiveRail
                currentIndex={currentLessonIndex}
                totalCount={allLessons.length}
                onExpand={() => setIsObjectivesCollapsed(false)}
              />
            ) : (
              <ObjectiveRail
                course={course}
                activeLessonId={lesson.id}
                onCollapse={() => setIsObjectivesCollapsed(true)}
                onSelectLesson={goToLesson}
              />
            )}
          </aside>

          <section className="deck-shell relative flex min-h-[720px] items-center justify-center overflow-visible rounded-[2rem] px-2 py-4 sm:px-6">
            <LearningDeck
              course={course}
              lesson={lesson}
              cards={cards}
              currentCard={currentCard}
              activeCardIndex={activeCardIndex}
              ownerId={ownerId}
              nextLesson={availableNextLesson}
              isObjectivesCollapsed={isObjectivesCollapsed}
              isGeneratingCard={isGeneratingCard}
              onGoToNextLesson={() => availableNextLesson && goToLesson(availableNextLesson.id)}
              onCardGenerated={handleCardGenerated}
              onPersistProgress={moveToCard}
              onGeneratingChange={setIsGeneratingCard}
              onError={setUiError}
            />
          </section>

          <aside className="workspace-side-panel hidden min-h-0 lg:block">
            <DeckNavigation
              cards={cards}
              activeCardIndex={activeCardIndex}
              currentCard={currentCard}
              lesson={lesson}
              course={course}
              ownerId={ownerId}
              nextLesson={availableNextLesson}
              isFirstObjective={!previousLesson}
              isGeneratingCard={isGeneratingCard}
              onMove={moveToCard}
              onGenerated={handleCardGenerated}
              onPersistProgress={moveToCard}
              onGeneratingChange={setIsGeneratingCard}
              onNextLesson={() => availableNextLesson && goToLesson(availableNextLesson.id)}
              onError={setUiError}
            />
          </aside>
        </div>

        <div className="lg:hidden">
          <DeckNavigation
            mobile
            cards={cards}
            activeCardIndex={activeCardIndex}
            currentCard={currentCard}
            lesson={lesson}
            course={course}
            ownerId={ownerId}
            nextLesson={availableNextLesson}
            isFirstObjective={!previousLesson}
            isGeneratingCard={isGeneratingCard}
            onMove={moveToCard}
            onGenerated={handleCardGenerated}
            onPersistProgress={moveToCard}
            onGeneratingChange={setIsGeneratingCard}
            onNextLesson={() => availableNextLesson && goToLesson(availableNextLesson.id)}
            onError={setUiError}
          />
        </div>

        {uiError && (
          <div className="glass-panel border-rose-200/80 bg-rose-50/80 p-4 text-sm font-medium text-rose-800">
            {uiError}
          </div>
        )}

        <FloatingNotepad
          isOpen={isNotepadOpen}
          noteText={notepadText}
          onToggle={() => setIsNotepadOpen((open) => !open)}
          onClose={() => setIsNotepadOpen(false)}
          onNoteChange={setNotepadText}
          onClear={() => setNotepadText("")}
        />
      </div>
    </main>
  );
}

function FloatingNotepad({
  isOpen,
  noteText,
  onToggle,
  onClose,
  onNoteChange,
  onClear,
}: {
  isOpen: boolean;
  noteText: string;
  onToggle: () => void;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        onClick={onToggle}
        className="fixed bottom-5 right-5 z-40 h-12 rounded-full border border-amber-200 bg-amber-100/95 px-4 text-amber-900 shadow-xl shadow-amber-300/45 backdrop-blur hover:bg-amber-50 sm:bottom-6 sm:right-6"
      >
        <PencilLine className="mr-2 size-4" />
        Scratchpad
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-[2px]" onClick={onClose} />
      )}

      <section
        className={
          isOpen
            ? "fixed bottom-20 right-4 z-50 w-[min(92vw,420px)] rounded-3xl border border-amber-200/80 bg-amber-50/95 p-4 shadow-2xl shadow-amber-300/40 backdrop-blur-xl transition-all duration-200 sm:bottom-24 sm:right-6"
            : "pointer-events-none fixed bottom-20 right-4 z-50 w-[min(92vw,420px)] translate-y-2 scale-95 rounded-3xl border border-amber-200/80 bg-amber-50/95 p-4 opacity-0 shadow-2xl shadow-amber-300/40 backdrop-blur-xl transition-all duration-200 sm:bottom-24 sm:right-6"
        }
        aria-hidden={!isOpen}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-900">
              Scratchpad
            </h3>
          
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-full px-3 text-xs text-amber-900 hover:bg-amber-100"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mb-3 h-8 rounded-full px-3 text-xs text-amber-900 hover:bg-amber-100"
          onClick={onClear}
        >
          Clear
        </Button>
        <Textarea
          value={noteText}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Try equations, steps, or reminders here..."
          className="min-h-56 resize-y border-amber-200 bg-white/90 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus-visible:ring-amber-300"
        />
      </section>
    </>
  );
}

function WorkspaceHeader({
  course,
  lesson,
  onBack,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  onBack: () => void;
}) {
  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-800">
            {course.subject} / Lesson
          </div>
          <h1 className="text-lg font-medium tracking-[-0.03em] sm:text-xl">
            {lesson.title}
          </h1>
        </div>
      </div>
      <div className="rounded-full border border-white/70 bg-white/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-700 backdrop-blur">
        {course.weeklyTimeCommitment ?? "5-7 hrs weekly"} / {course.level}
      </div>
    </div>
  );
}

function ObjectiveRail({
  course,
  activeLessonId,
  onCollapse,
  onSelectLesson,
}: {
  course: WorkspaceCourse;
  activeLessonId: string;
  onCollapse?: () => void;
  onSelectLesson: (lessonId: string) => void;
}) {
  const orderedLessons = flattenLessons(course);
  const firstIncompleteLessonIndex = orderedLessons.findIndex((item) => !lessonIsComplete(item));
  const lessonIndexById = new Map(orderedLessons.map((lesson, index) => [lesson.id, index]));

  return (
    <nav className="glass-panel objective-rail flex h-full max-h-[70dvh] flex-col overflow-hidden p-4 lg:max-h-none">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ListChecks className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-800">
            Objectives
          </div>
          <div className="truncate text-sm font-medium text-slate-900">{course.title}</div>
        </div>
        {onCollapse && (
          <Button
            aria-label="Collapse learning objectives"
            className="shrink-0 rounded-2xl bg-white/55 text-slate-700 hover:bg-white/80"
            onClick={onCollapse}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="-mx-1 flex-1 px-1" scrollFade scrollbarGutter>
        <div className="space-y-5 pb-1">
          {(course.modules ?? []).map((module) => (
            <section key={module.id}>
              <div className="mb-2 px-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                {module.title}
              </div>
              <div className="space-y-2">
                {(module.lessons ?? []).map((lesson) => {
                  const cards = sortedCards(lesson);
                  const isComplete = lessonIsComplete(lesson);
                  const isActive = lesson.id === activeLessonId;
                  const lessonIndex = lessonIndexById.get(lesson.id) ?? 0;
                  const isLocked =
                    firstIncompleteLessonIndex !== -1 && lessonIndex > firstIncompleteLessonIndex;
                  return (
                    <button
                      key={lesson.id}
                      className={
                        isActive
                          ? "objective-item w-full rounded-2xl border border-slate-950 bg-slate-950 px-3 py-3 text-left text-white shadow-xl shadow-slate-950/20"
                          : isLocked
                            ? "objective-item w-full cursor-not-allowed rounded-2xl border border-white/45 bg-white/25 px-3 py-3 text-left text-slate-400"
                          : "objective-item w-full rounded-2xl border border-white/65 bg-white/45 px-3 py-3 text-left text-slate-800 transition hover:bg-white/70"
                      }
                      type="button"
                      disabled={isLocked}
                      title={isLocked ? "Finish the current objective first." : undefined}
                      onClick={() => onSelectLesson(lesson.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-5">{lesson.title}</span>
                        {isComplete && <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />}
                        {isLocked && <Lock className="size-4 shrink-0 text-slate-400" />}
                      </div>
                      <div className={isActive ? "mt-2 text-xs text-white/70" : "mt-2 text-xs text-slate-500"}>
                        {cards.length} step{cards.length === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </nav>
  );
}

function CollapsedObjectiveRail({
  currentIndex,
  totalCount,
  onExpand,
}: {
  currentIndex: number;
  totalCount: number;
  onExpand: () => void;
}) {
  return (
    <div className="glass-panel flex h-full flex-col items-center justify-between p-3">
      <Button
        aria-label="Show learning objectives"
        className="rounded-2xl bg-white/60 text-slate-800 hover:bg-white/85"
        onClick={onExpand}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PanelLeftOpen className="size-4" />
      </Button>
      <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
        Objectives
      </div>
      <div className="rounded-full bg-slate-950 px-2 py-2 text-xs font-medium text-white [writing-mode:vertical-rl]">
        {currentIndex + 1}/{totalCount}
      </div>
    </div>
  );
}

function LearningDeck({
  course,
  lesson,
  cards,
  currentCard,
  activeCardIndex,
  ownerId,
  nextLesson,
  isObjectivesCollapsed,
  isGeneratingCard,
  onGoToNextLesson,
  onCardGenerated,
  onPersistProgress,
  onGeneratingChange,
  onError,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  cards: LearningCard[];
  currentCard: LearningCard | null;
  activeCardIndex: number;
  ownerId: string;
  nextLesson: WorkspaceLesson | null;
  isObjectivesCollapsed: boolean;
  isGeneratingCard: boolean;
  onGoToNextLesson: () => void;
  onCardGenerated: (newIndex: number) => void;
  onPersistProgress: (newIndex: number) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
  onError: (error: string | null) => void;
}) {
  const isPendingCard = isGeneratingCard || (cards.length > 0 && activeCardIndex >= cards.length);

  return (
    <div
      className={
        isObjectivesCollapsed
          ? "deck-stage h-full w-full max-w-6xl"
          : "deck-stage h-full w-full max-w-4xl"
      }
    >
      <div className="deck-ghost deck-ghost-3" />
      <div className="deck-ghost deck-ghost-2" />
      <div className="deck-ghost deck-ghost-1" />

      {isPendingCard ? (
        <LearningCardSkeleton pendingIndex={cards.length + 1} />
      ) : currentCard ? (
        <LearningCardView
          key={currentCard.id}
          course={course}
          lesson={lesson}
          card={currentCard}
          activeCardIndex={activeCardIndex}
          cardsCount={cards.length}
          ownerId={ownerId}
          nextLesson={nextLesson}
          onGoToNextLesson={onGoToNextLesson}
          onError={onError}
        />
      ) : (
        <EmptyDeckCard
          course={course}
          lesson={lesson}
          ownerId={ownerId}
          onGenerated={onCardGenerated}
          onPersistProgress={onPersistProgress}
          onGeneratingChange={onGeneratingChange}
          onError={onError}
        />
      )}
    </div>
  );
}

function LearningCardView({
  course,
  lesson,
  card,
  activeCardIndex,
  cardsCount,
  ownerId,
  nextLesson,
  onGoToNextLesson,
  onError,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  card: LearningCard;
  activeCardIndex: number;
  cardsCount: number;
  ownerId: string;
  nextLesson: WorkspaceLesson | null;
  onGoToNextLesson: () => void;
  onError: (error: string | null) => void;
}) {
  const Icon = iconForCard(card.type);
  const options = parseOptions(card.optionsJson);

  return (
    <article className="deck-card relative z-10 flex h-[min(78vh,760px)] min-h-[610px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 shadow-2xl shadow-slate-950/18 backdrop-blur-2xl">
      <header className="border-b border-slate-200/70 bg-white/55 px-6 py-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/20">
              <Icon className="size-5" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-800">
                {labelForCard(card.type)} / {activeCardIndex + 1} of {cardsCount}
              </div>
              <h2 className="mt-1 text-2xl font-medium tracking-[-0.04em] text-slate-950 sm:text-3xl">
                {card.title}
              </h2>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
            {card.status || "ready"}
          </span>
        </div>
      </header>

      <div className="deck-card-scroll flex flex-1 flex-col overflow-auto px-6 py-5 pb-3">
        <MarkdownContent content={card.content} />

        {(card.type === "quiz" || card.type === "coding") && (
          <AnswerBlock
            course={course}
            lesson={lesson}
            card={card}
            ownerId={ownerId}
            options={options}
            onError={onError}
          />
        )}

        {card.type === "complete" && (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="flex items-center gap-3 text-lg font-medium">
              <PartyPopper className="size-5" /> Objective complete
            </div>
            <p className="mt-2 text-sm leading-6">
              {nextLesson
                ? `Next up: ${nextLesson.title}`
                : "You completed the final objective in this course."}
            </p>
            {nextLesson && (
              <Button className="mt-4 rounded-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={onGoToNextLesson}>
                Start next objective
              </Button>
            )}
          </div>
        )}

        <CardQuestionThread
          course={course}
          lesson={lesson}
          card={card}
          ownerId={ownerId}
          onError={onError}
        />
      </div>
    </article>
  );
}

function EmptyDeckCard({
  course,
  lesson,
  ownerId,
  onGenerated,
  onPersistProgress,
  onGeneratingChange,
  onError,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  ownerId: string;
  onGenerated: (newIndex: number) => void;
  onPersistProgress: (newIndex: number) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
  onError: (error: string | null) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateCard = useGenerateAndPersistCard({
    course,
    lesson,
    ownerId,
    cards: [],
    onGenerated,
    onPersistProgress,
    onError,
  });

  const start = async () => {
    setIsGenerating(true);
    onGeneratingChange(true);
    try {
      await generateCard();
    } catch {
      // useGenerateAndPersistCard already reports the recoverable UI error.
    } finally {
      setIsGenerating(false);
      onGeneratingChange(false);
    }
  };

  return (
    <article className="deck-card relative z-10 flex h-[min(78vh,760px)] min-h-[610px] flex-col items-center justify-center rounded-[2rem] border border-white/80 bg-white/82 p-8 text-center shadow-2xl shadow-slate-950/18 backdrop-blur-2xl">
      <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-slate-950 text-white shadow-xl shadow-slate-950/20">
        <Sparkles className="size-7" />
      </div>
      <div className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-cyan-800">
        New learning objective
      </div>
      <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-[-0.05em] text-slate-950 sm:text-4xl">
        Start {lesson.title}
      </h2>
      <p className="mt-4 max-w-xl text-base leading-7 text-slate-650">
        The first step introduces the objective. Each next step appears only
        when you ask for it, using your answers and questions as context.
      </p>
      <Button className="mt-8 rounded-full bg-slate-950 px-6 text-white" size="lg" loading={isGenerating} onClick={start}>
        Start lesson
      </Button>
    </article>
  );
}

function LearningCardSkeleton({ pendingIndex }: { pendingIndex: number }) {
  return (
    <article className="deck-card learning-card-skeleton relative z-10 flex h-[min(78vh,760px)] min-h-[610px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 shadow-2xl shadow-slate-950/18 backdrop-blur-2xl">
      <header className="border-b border-slate-200/70 bg-white/55 px-6 py-5 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="skeleton-shimmer size-12 rounded-2xl" />
          <div className="flex-1">
            <div className="skeleton-shimmer h-3 w-44 rounded-full" />
            <div className="skeleton-shimmer mt-4 h-8 w-2/3 rounded-full" />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col px-6 py-6">
        <div className="mb-6 rounded-3xl border border-white/70 bg-white/45 p-5">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-800">
            Preparing step {pendingIndex}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Preparing the next part from your progress, answers, and questions.
          </p>
        </div>
        <div className="space-y-4">
          <div className="skeleton-shimmer h-5 w-11/12 rounded-full" />
          <div className="skeleton-shimmer h-5 w-10/12 rounded-full" />
          <div className="skeleton-shimmer h-5 w-8/12 rounded-full" />
          <div className="skeleton-shimmer mt-8 h-32 w-full rounded-3xl" />
          <div className="skeleton-shimmer h-5 w-9/12 rounded-full" />
          <div className="skeleton-shimmer h-5 w-7/12 rounded-full" />
        </div>
        <div className="mt-auto flex justify-end pt-8">
          <div className="skeleton-shimmer size-14 rounded-full" />
        </div>
      </div>
    </article>
  );
}

function DeckNavigation({
  cards,
  activeCardIndex,
  currentCard,
  lesson,
  course,
  ownerId,
  nextLesson,
  isFirstObjective,
  mobile = false,
  isGeneratingCard,
  onMove,
  onGenerated,
  onPersistProgress,
  onGeneratingChange,
  onNextLesson,
  onError,
}: {
  cards: LearningCard[];
  activeCardIndex: number;
  currentCard: LearningCard | null;
  lesson: WorkspaceLesson;
  course: WorkspaceCourse;
  ownerId: string;
  nextLesson: WorkspaceLesson | null;
  isFirstObjective: boolean;
  mobile?: boolean;
  isGeneratingCard: boolean;
  onMove: (index: number) => void;
  onGenerated: (newIndex: number) => void;
  onPersistProgress: (newIndex: number) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
  onNextLesson: () => void;
  onError: (error: string | null) => void;
}) {
  const generateCard = useGenerateAndPersistCard({
    course,
    lesson,
    ownerId,
    cards,
    onGenerated,
    onPersistProgress,
    onError,
  });
  const isAtLastCard = activeCardIndex >= cards.length - 1;
  const canMoveUp = activeCardIndex > 0;
  const canMoveDown = activeCardIndex < cards.length - 1;
  const progress = cards.length === 0 ? 0 : ((activeCardIndex + 1) / cards.length) * 100;

  const down = async () => {
    if (canMoveDown) {
      onMove(activeCardIndex + 1);
      return;
    }

    if (currentCard?.type === "complete" && nextLesson) {
      onNextLesson();
      return;
    }

    onMove(cards.length);
    onGeneratingChange(true);
    let generated = false;
    try {
      await generateCard();
      generated = true;
    } finally {
      onGeneratingChange(false);
      if (!generated && cards.length > 0) {
        onMove(cards.length - 1);
      }
    }
  };

  if (mobile) {
    return (
      <div className="glass-panel flex items-center justify-between gap-3 p-3">
        <Button variant="outline" className="rounded-full bg-white/55" disabled={isGeneratingCard || !canMoveUp} onClick={() => onMove(activeCardIndex - 1)}>
          <ChevronUp /> Previous
        </Button>
        <div className="text-center text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
          {cards.length ? `${activeCardIndex + 1}/${cards.length}` : "No steps"}
        </div>
        <Button className="rounded-full bg-slate-950 text-white" disabled={isGeneratingCard} loading={isGeneratingCard} onClick={down}>
          {isAtLastCard ? currentCard?.type === "complete" && nextLesson ? "Next objective" : "Generate" : "Next"}
          <ChevronDown />
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col items-center justify-between p-4">
      <Button size="icon-xl" variant="outline" className="rounded-2xl bg-white/55" disabled={isGeneratingCard || !canMoveUp} onClick={() => onMove(activeCardIndex - 1)}>
        <ChevronUp />
      </Button>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-52 w-3 overflow-hidden rounded-full bg-white/55">
          <div className="absolute bottom-0 left-0 w-full rounded-full bg-slate-950 transition-all duration-500" style={{ height: `${Math.max(progress, 7)}%` }} />
        </div>
        <div>
          <div className="text-2xl font-medium tracking-[-0.04em] text-slate-950">
            {cards.length ? activeCardIndex + 1 : 0}
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            of {cards.length}
          </div>
        </div>
        <div className="rounded-2xl border border-white/65 bg-white/45 px-3 py-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-slate-600">
          {isFirstObjective ? "First objective" : "Lesson"}
        </div>
      </div>

      <Button size="icon-xl" className="rounded-2xl bg-slate-950 text-white" disabled={isGeneratingCard} loading={isGeneratingCard} onClick={down}>
        <ChevronDown />
      </Button>
    </div>
  );
}

function useGenerateAndPersistCard({
  course,
  lesson,
  ownerId,
  cards,
  onGenerated,
  onPersistProgress,
  onError,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  ownerId: string;
  cards: LearningCard[];
  onGenerated: (newIndex: number) => void;
  onPersistProgress: (newIndex: number) => void;
  onError: (error: string | null) => void;
}) {
  const generateCard = useServerFn(generateNextLearningCard);

  return async () => {
    onError(null);
    try {
      const generated = await generateCard({
        data: {
          courseContext: courseContext(course),
          objective: objectiveContext(lesson),
          previousCards: cards.map((card) => ({
            type: card.type,
            title: card.title,
            content: card.content,
            prompt: card.prompt,
            answer: card.answer,
            feedback: feedbackHistorySummary(card.feedback, card.answer, card.updatedAt),
            status: card.status,
            questionsSummary: (card.cardQuestions ?? [])
              .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
              .join("\n\n"),
          })),
        },
      });
      const now = Date.now();
      const cardId = id();
      const nextIndex = cards.length;
      persistLearningCard(cardId, lesson.id, ownerId, generated, nextIndex, now);
      onGenerated(nextIndex);
      onPersistProgress(nextIndex);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not prepare the next step");
      throw caught;
    }
  };
}

function AnswerBlock({
  course,
  lesson,
  card,
  ownerId,
  options,
  onError,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  card: LearningCard;
  ownerId: string;
  options: string[];
  onError: (error: string | null) => void;
}) {
  const evaluate = useServerFn(evaluateCardAnswer);
  const [answer, setAnswer] = useState(card.answer);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const isQuiz = card.type === "quiz";

  useEffect(() => {
    setAnswer(card.answer);
  }, [card.answer, card.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answer.trim()) return;

    onError(null);
    setIsEvaluating(true);
    try {
      clientDb.transact(
        clientDb.tx.learningCards[card.id].update({
          answer,
          status: "submitted",
          updatedAt: Date.now(),
          ownerId,
        }),
      );
      const evaluation = (await evaluate({
        data: {
          courseContext: courseContext(course),
          objective: objectiveContext(lesson),
          card: {
            type: card.type === "coding" ? "coding" : "quiz",
            title: card.title,
            content: card.content,
            prompt: card.prompt,
            options,
          },
          answer,
        },
      })) as EvaluateCardAnswerResult;
      const feedbackHistory = parseFeedbackHistory(card.feedback, card.answer, card.updatedAt);
      const nextFeedbackHistory = [
        ...feedbackHistory,
        {
          id: id(),
          answer,
          feedback: evaluation.feedback,
          createdAt: Date.now(),
        },
      ];
      const createdAt = Date.now();
      clientDb.transact([
        clientDb.tx.learningCards[card.id].update({
          answer,
          feedback: JSON.stringify(nextFeedbackHistory),
          status: "evaluated",
          updatedAt: createdAt,
          ownerId,
        }),
        clientDb.tx.cardAttempts[id()]
          .update({
            answer,
            verdict: evaluation.verdict,
            score: evaluation.score,
            feedback: evaluation.feedback,
            nextStep: evaluation.nextStep,
            ownerId,
            orgId: course.orgId,
            createdAt,
          })
          .link({ card: card.id }),
      ]);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not evaluate answer");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <form className="practice-answer-card mt-6" onSubmit={submit}>
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-950">
        {card.type === "coding" ? "Try this" : "Your answer"}
      </div>
      {card.prompt && (
        <div className="mt-2 text-sm leading-6 text-slate-750">
          <MarkdownContent content={card.prompt} />
        </div>
      )}
      {options.length > 0 && (
        <div className="mt-4 grid gap-2">
          {options.map((option) => (
            <button
              key={option}
              className={
                answer === option
                  ? "practice-option practice-option-selected"
                  : "practice-option"
              }
              type="button"
              onClick={() => setAnswer(option)}
            >
              <MarkdownInlineContent content={option} />
            </button>
          ))}
        </div>
      )}
      {!isQuiz && (
        <Textarea
          className="practice-textarea mt-4 min-h-28 border-white/70 bg-white/75"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Write your solution or pseudocode here..."
        />
      )}
      <Button
        className="practice-submit mt-4 rounded-full text-emerald-950 data-loading:text-emerald-950 *:data-[slot=button-loading-indicator]:text-emerald-950"
        type="submit"
        loading={isEvaluating}
      >
        {isQuiz ? "Submit answer" : "Submit for feedback"}
      </Button>
    </form>
  );
}

function CardQuestionThread({
  course,
  lesson,
  card,
  ownerId,
  onError,
}: {
  course: WorkspaceCourse;
  lesson: WorkspaceLesson;
  card: LearningCard;
  ownerId: string;
  onError: (error: string | null) => void;
}) {
  const askQuestion = useServerFn(askCardQuestion);
  const [question, setQuestion] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<CardQuestion | null>(null);
  const questions = [...(card.cardQuestions ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const feedbackHistory = parseFeedbackHistory(card.feedback, card.answer, card.updatedAt);
  const visibleQuestions =
    pendingQuestion && !questions.some((item) => item.id === pendingQuestion.id)
      ? [...questions, pendingQuestion]
      : questions;
  const tutorEvents = [
    ...feedbackHistory.map((item) => ({
      id: item.id,
      studentText: item.answer,
      aiText: item.feedback,
      createdAt: item.createdAt,
      isPending: false,
    })),
    ...visibleQuestions.map((item) => ({
      id: item.id,
      studentText: item.question,
      aiText: item.answer,
      createdAt: item.createdAt,
      isPending: item.id === pendingQuestion?.id,
    })),
  ].sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    if (pendingQuestion && questions.some((item) => item.id === pendingQuestion.id)) {
      setPendingQuestion(null);
    }
  }, [pendingQuestion, questions]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;

    const studentQuestion = question.trim();
    const questionId = id();
    const createdAt = Date.now();
    setQuestion("");
    setPendingQuestion({
      id: questionId,
      question: studentQuestion,
      answer: "",
      ownerId,
      createdAt,
    });
    setIsAsking(true);
    onError(null);
    try {
      const answer = await askQuestion({
        data: {
          courseContext: courseContext(course),
          objective: objectiveContext(lesson),
          card: {
            type: card.type,
            title: card.title,
            content: card.content,
            prompt: card.prompt,
            answer: card.answer,
            feedback: feedbackHistorySummary(card.feedback, card.answer, card.updatedAt),
          },
          previousQuestions: questions.slice(-8).map((item) => ({
            question: item.question,
            answer: item.answer,
          })),
          question: studentQuestion,
        },
      });
      clientDb.transact(
        clientDb.tx.cardQuestions[questionId]
          .update({
            question: studentQuestion,
            answer,
            ownerId,
            createdAt,
          })
          .link({ card: card.id }),
      );
    } catch (caught) {
      setPendingQuestion(null);
      onError(caught instanceof Error ? caught.message : "Could not answer your question");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <section className="card-question-section mt-6 flex flex-1 flex-col border-t border-slate-200/80 pt-5">
      {tutorEvents.length > 0 && (
        <div className="tutor-chat-thread mt-4 space-y-4">
          {tutorEvents.map((item) => (
            <div key={item.id} className="space-y-3">
              <div className="flex justify-end">
                <div className="tutor-message tutor-message-user">
                  {item.studentText}
                </div>
              </div>
              <div className="flex items-end justify-start gap-2">
                <div className="tutor-message-ai-icon">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="tutor-message tutor-message-ai">
                  {item.isPending ? (
                    <span className="text-sm font-medium text-slate-500">Thinking...</span>
                  ) : (
                    <MarkdownContent content={item.aiText} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="card-question-dock">
        {!isComposerOpen ? (
          <Button
            className="ai-assistant-fab size-14 rounded-full p-0 text-slate-950"
            type="button"
            aria-label="Open assistant"
            onClick={() => setIsComposerOpen(true)}
          >
            <Sparkles className="size-5" />
          </Button>
        ) : (
          <form className="card-question-form flex gap-2" onSubmit={submit}>
            <Button
              className="ai-assistant-close shrink-0 rounded-2xl bg-white/65 text-slate-700 hover:bg-white/85"
              type="button"
              variant="ghost"
              aria-label="Close assistant"
              onClick={() => setIsComposerOpen(false)}
              disabled={isAsking}
            >
              <X className="size-4" />
            </Button>
            <Textarea
              autoFocus
              className="ai-assistant-textarea min-h-16 border-white/70 bg-white/70"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask in your own words..."
            />
            <Button
              className="ai-assistant-send h-auto rounded-2xl text-slate-950 data-loading:text-slate-950 *:data-[slot=button-loading-indicator]:text-slate-950"
              type="submit"
              aria-label="Send question"
              loading={isAsking}
            >
              <Send />
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

function persistLearningCard(
  cardId: string,
  lessonId: string,
  ownerId: string,
  generated: GeneratedLearningCard,
  position: number,
  now: number,
) {
  clientDb.transact(
    clientDb.tx.learningCards[cardId]
      .update({
        type: generated.type,
        title: generated.title,
        content: generated.content,
        prompt: generated.prompt,
        optionsJson: JSON.stringify(generated.options),
        answer: "",
        feedback: "",
        status: generated.type === "complete" ? "completed" : "ready",
        position,
        ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .link({ lesson: lessonId }),
  );
}

function clampCardIndex(index: number, cardsCount: number) {
  if (cardsCount <= 0) return 0;
  return Math.max(0, Math.min(index, cardsCount - 1));
}

function persistLessonProgress({
  lessonId,
  ownerId,
  orgId,
  cards,
  nextIndex,
  existingProgressId,
}: {
  lessonId: string;
  ownerId: string;
  orgId?: string;
  cards: LearningCard[];
  nextIndex: number;
  existingProgressId?: string;
}) {
  const currentCard = cards[nextIndex];
  const now = Date.now();
  const key = `${lessonId}:${ownerId}`;
  const progressId = existingProgressId ?? id();

  clientDb.transact(
    clientDb.tx.lessonProgress[progressId]
      .update({
        key,
        ownerId,
        orgId,
        currentCardId: currentCard?.id,
        currentCardPosition: nextIndex,
        updatedAt: now,
      })
      .link({ lesson: lessonId }),
  );
}
