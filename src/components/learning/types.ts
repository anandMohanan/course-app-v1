import type { LearningCardType } from "@/lib/learningAi";

export type WorkspaceCourse = {
  id: string;
  title: string;
  subject: string;
  level: string;
  language?: string;
  learningStyle?: string;
  goal: string;
  weeklyTimeCommitment?: string;
  ownerId: string;
  orgId?: string;
  modules?: Array<WorkspaceModule>;
};

export type WorkspaceModule = {
  id: string;
  title: string;
  summary: string;
  position: number;
  lessons?: Array<WorkspaceLesson>;
};

export type WorkspaceLesson = {
  id: string;
  title: string;
  concept: string;
  personalizedContent: string;
  practiceType: string;
  practicePrompt: string;
  position: number;
  orgId?: string;
  learningCards?: Array<LearningCard>;
  progressEntries?: Array<LessonProgress>;
};

export type LearningCard = {
  id: string;
  type: LearningCardType;
  title: string;
  content: string;
  prompt: string;
  optionsJson: string;
  answer: string;
  feedback: string;
  status: string;
  position: number;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  cardQuestions?: Array<CardQuestion>;
  attempts?: Array<CardAttempt>;
};

export type CardQuestion = {
  id: string;
  question: string;
  answer: string;
  ownerId: string;
  createdAt: number;
};

export type AttemptVerdict = "correct" | "partial" | "incorrect";

export type CardAttempt = {
  id: string;
  answer: string;
  verdict: AttemptVerdict;
  score: number;
  feedback: string;
  nextStep: string;
  ownerId: string;
  orgId?: string;
  createdAt: number;
};

export type LessonProgress = {
  id: string;
  key: string;
  ownerId: string;
  orgId?: string;
  currentCardId?: string;
  currentCardPosition: number;
  updatedAt: number;
};

export type FeedbackHistoryItem = {
  id: string;
  answer: string;
  feedback: string;
  createdAt: number;
};
