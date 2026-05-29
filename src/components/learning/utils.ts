import type { CourseWizardInput, LearningCardType } from "@/lib/learningAi";
import { Code2, FileText, HelpCircle, PartyPopper, Sparkles } from "lucide-react";
import type { WorkspaceCourse, WorkspaceLesson, FeedbackHistoryItem } from "@/components/learning/types";

export function normalizeCourse(course?: WorkspaceCourse): WorkspaceCourse | null {
  if (!course) return null;
  return {
    ...course,
    modules: [...(course.modules ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((module) => ({
        ...module,
        lessons: [...(module.lessons ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((lesson) => ({
            ...lesson,
            learningCards: sortedCards(lesson),
          })),
      })),
  };
}

export function sortedCards(lesson?: WorkspaceLesson | null) {
  return [...(lesson?.learningCards ?? [])]
    .map((card) => ({ ...card, type: normalizeCardType(card.type) }))
    .sort((a, b) => a.position - b.position);
}

export function lessonIsComplete(lesson?: WorkspaceLesson | null) {
  return sortedCards(lesson).some((card) => card.type === "complete");
}

export function flattenLessons(course: WorkspaceCourse | null) {
  return (course?.modules ?? []).flatMap((module) => module.lessons ?? []);
}

export function courseContext(course: WorkspaceCourse) {
  return {
    title: course.title,
    subject: course.subject,
    level: normalizeCourseLevel(course.level),
    goal: course.goal,
    weeklyTimeCommitment: normalizeWeeklyTimeCommitment(course.weeklyTimeCommitment),
  };
}

export function normalizeCourseLevel(value?: string): CourseWizardInput["level"] {
  if (value === "Beginner" || value === "Intermediate" || value === "Advanced") return value;
  return "Beginner";
}

export function normalizeWeeklyTimeCommitment(
  value?: string,
): CourseWizardInput["weeklyTimeCommitment"] {
  if (value === "2-4 hrs" || value === "5-7 hrs" || value === "8-10 hrs" || value === "10+ hrs") {
    return value;
  }
  return "5-7 hrs";
}

export function objectiveContext(lesson: WorkspaceLesson) {
  return {
    id: lesson.id,
    title: lesson.title,
    concept: lesson.concept,
    personalizedContent: lesson.personalizedContent,
    practiceType: lesson.practiceType,
    practicePrompt: lesson.practicePrompt,
  };
}

export function normalizeCardType(type: string): LearningCardType {
  if (type === "intro" || type === "text" || type === "quiz" || type === "coding" || type === "complete") {
    return type;
  }
  return "text";
}

export function parseOptions(optionsJson: string) {
  try {
    const options = JSON.parse(optionsJson) as unknown;
    return Array.isArray(options) ? options.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function parseFeedbackHistory(
  feedbackValue: string,
  fallbackAnswer = "",
  fallbackCreatedAt = Date.now(),
): FeedbackHistoryItem[] {
  if (!feedbackValue.trim()) return [];

  try {
    const parsed = JSON.parse(feedbackValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Partial<FeedbackHistoryItem> => typeof item === "object" && item !== null)
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : `feedback-${fallbackCreatedAt}-${index}`,
        answer: typeof item.answer === "string" ? item.answer : fallbackAnswer,
        feedback: typeof item.feedback === "string" ? item.feedback : "",
        createdAt: typeof item.createdAt === "number" ? item.createdAt : fallbackCreatedAt + index,
      }))
      .filter((item) => item.feedback.trim());
  } catch {
    return [{ id: `feedback-${fallbackCreatedAt}`, answer: fallbackAnswer, feedback: feedbackValue, createdAt: fallbackCreatedAt }];
  }
}

export function feedbackHistorySummary(feedbackValue: string, fallbackAnswer = "", fallbackCreatedAt = Date.now()) {
  return parseFeedbackHistory(feedbackValue, fallbackAnswer, fallbackCreatedAt)
    .map((item, index) => `Attempt ${index + 1}\nAnswer: ${item.answer}\nFeedback: ${item.feedback}`)
    .join("\n\n");
}

export function iconForCard(type: LearningCardType) {
  if (type === "intro") return Sparkles;
  if (type === "quiz") return HelpCircle;
  if (type === "coding") return Code2;
  if (type === "complete") return PartyPopper;
  return FileText;
}

export function labelForCard(type: LearningCardType) {
  if (type === "intro") return "Start";
  if (type === "quiz") return "Question";
  if (type === "coding") return "Practice";
  if (type === "complete") return "Done";
  return "Read";
}
