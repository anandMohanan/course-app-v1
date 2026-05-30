import { chat } from "@tanstack/ai";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const practiceTypes = ["code", "math", "writing", "general"] as const;
export const proficiencyLevels = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;
export const learningCardTypes = [
  "intro",
  "text",
  "quiz",
  "coding",
  "complete",
] as const;

const lessonSchema = z.object({
  title: z.string().min(3),
  concept: z.string().min(12),
  personalizedContent: z.string().min(80),
  practiceType: z.enum(practiceTypes),
  practicePrompt: z.string().min(30),
});

const moduleSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(20),
  lessons: z.array(lessonSchema).min(2).max(4),
});

export const courseOutlineSchema = z.object({
  overview: z.string().min(80),
  modules: z.array(moduleSchema).min(2).max(4),
});

export const courseWizardSchema = z.object({
  title: z.string().min(3).max(80),
  templateTitle: z.string().min(3).max(80).optional(),
  templateSubjectName: z.string().min(2).max(120).optional(),
  syllabusText: z.string().max(100000).optional(),
  hasSyllabusPdf: z.boolean().optional(),
  subject: z.string().min(2).max(80),
  level: z.enum(proficiencyLevels),
  goal: z.string().min(8).max(500),
  weeklyTimeCommitment: z.enum(["2-4 hrs", "5-7 hrs", "8-10 hrs", "10+ hrs"]),
  preferredLanguage: z.string().min(2).max(40).optional(),
  learningStyle: z.string().min(2).max(200).optional(),
  pace: z.string().min(2).max(40).optional(),
  strengths: z.string().min(2).max(500).optional(),
  weakAreas: z.string().min(2).max(500).optional(),
  targetOutcome: z.string().min(2).max(500).optional(),
});

const objectiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  concept: z.string(),
  personalizedContent: z.string(),
  practiceType: z.string(),
  practicePrompt: z.string(),
});

const previousCardSchema = z.object({
  type: z.enum(learningCardTypes),
  title: z.string(),
  content: z.string(),
  prompt: z.string(),
  answer: z.string(),
  feedback: z.string(),
  status: z.string(),
  questionsSummary: z.string(),
});

const generatedLearningCardSchema = z.object({
  type: z.enum(learningCardTypes),
  title: z.string().min(3).max(90),
  content: z.string().min(40).max(4500),
  prompt: z.string().max(1800),
  options: z.array(z.string().min(1).max(240)).max(6),
});

export const generateNextLearningCardSchema = z.object({
  courseContext: courseWizardSchema,
  objective: objectiveSchema,
  previousCards: z.array(previousCardSchema).max(100),
});

export const evaluateCardAnswerSchema = z.object({
  courseContext: courseWizardSchema,
  objective: objectiveSchema,
  card: z.object({
    type: z.enum(["quiz", "coding"]),
    title: z.string(),
    content: z.string(),
    prompt: z.string(),
    options: z.array(z.string()),
  }),
  answer: z.string().min(1).max(8000),
});

export const evaluateCardAnswerResultSchema = z.object({
  verdict: z.enum(["correct", "partial", "incorrect"]),
  score: z.number().min(0).max(100),
  feedback: z.string().min(1).max(2200),
  nextStep: z.string().min(1).max(600),
});

export const cardQuestionSchema = z.object({
  courseContext: courseWizardSchema,
  objective: objectiveSchema,
  card: z.object({
    type: z.enum(learningCardTypes),
    title: z.string(),
    content: z.string(),
    prompt: z.string(),
    answer: z.string(),
    feedback: z.string(),
  }),
  previousQuestions: z
    .array(
      z.object({
        question: z.string().max(1200),
        answer: z.string().max(3000),
      }),
    )
    .max(8),
  question: z.string().min(3).max(1200),
});

export const lessonContentSchema = z.object({
  title: z.string().min(3),
  concept: z.string().min(12),
  courseContext: courseWizardSchema,
});

export const teacherQuestionSchema = z.object({
  question: z.string().min(3).max(1200),
  lessonTitle: z.string().min(2),
  lessonConcept: z.string().min(2),
  lessonContent: z.string().min(20),
  practicePrompt: z.string().min(10),
  practiceNote: z.string().max(5000),
  courseContext: courseWizardSchema,
  previousMessages: z
    .array(
      z.object({
        role: z.enum(["student", "teacher"]),
        content: z.string().max(3000),
      }),
    )
    .max(8),
});

export type CourseOutline = z.infer<typeof courseOutlineSchema>;
export type CourseWizardInput = z.infer<typeof courseWizardSchema>;
export type GeneratedLearningCard = z.infer<typeof generatedLearningCardSchema>;
export type LearningCardType = (typeof learningCardTypes)[number];
export type PracticeType = (typeof practiceTypes)[number];
export type EvaluateCardAnswerResult = z.infer<typeof evaluateCardAnswerResultSchema>;

function geminiAdapter() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to your server environment to generate personalized learning content.",
    );
  }

  return createGeminiChat("gemini-2.5-flash", apiKey);
}

function levelPedagogyInstruction(level: CourseWizardInput["level"]) {
  if (level === "Beginner") {
    return "Write so a child can understand it while staying technically correct. Use very simple words, short sentences, concrete real-life analogies, define every new term before using it, and assume zero prior knowledge.";
  }
  if (level === "Intermediate") {
    return "Use balanced depth with mild jargon. Explain terms briefly, include practical examples, and keep progression steady.";
  }
  return "Use advanced depth with denser explanations, faster pacing, precise technical language, and nuanced reasoning.";
}

export const generateCourseOutline = createServerFn({ method: "POST" })
  .inputValidator(courseWizardSchema)
  .handler(async ({ data }) => {
    const levelInstruction = levelPedagogyInstruction(data.level);
    const userPrompt = `Create a university pilot course outline.\n\nTemplate title: ${data.templateTitle ?? data.title}\nTemplate subject: ${data.templateSubjectName ?? data.subject}\nCourse title: ${data.title}\nSubject: ${data.subject}\nLevel: ${data.level}\nWeekly time commitment: ${data.weeklyTimeCommitment}\nStudent goal: ${data.goal}\nPreferred language: ${data.preferredLanguage ?? "English"}\nLearning style: ${data.learningStyle ?? "Visual examples and hands-on practice"}\nLearning pace: ${data.pace ?? "Balanced"}\nStrengths: ${data.strengths ?? "Not specified"}\nWeak areas: ${data.weakAreas ?? "Not specified"}\nTarget outcome: ${data.targetOutcome ?? "Not specified"}\nSyllabus PDF attached: ${data.hasSyllabusPdf ? "Yes" : "No"}\nSyllabus text:\n${data.syllabusText ?? "Not provided"}\n\nRequirements:\n- Ensure full coverage of the provided syllabus text. Do not skip major topics.\n- Organize topics into 2-4 modules and 2-4 lessons per module.\n- Distribute lessons so the full syllabus is covered end-to-end.\n- Scale lesson depth to the selected level and keep pace realistic for the learner profile.\n- Level instruction: ${levelInstruction}\n- Each lesson must include a personalized explanation, a practice type chosen from code/math/writing/general, and a hands-on practice prompt.`;
    console.info("[learningAi] generateCourseOutline:input", {
      title: data.title,
      templateTitle: data.templateTitle ?? null,
      templateSubjectName: data.templateSubjectName ?? null,
      subject: data.subject,
      weeklyTimeCommitment: data.weeklyTimeCommitment,
      goalLength: data.goal.length,
      syllabusTextLength: data.syllabusText?.length ?? 0,
      hasSyllabusPdf: Boolean(data.hasSyllabusPdf),
      syllabusTextPreview: (data.syllabusText ?? "").slice(0, 500),
    });
    console.info("[learningAi] generateCourseOutline:prompt", userPrompt);

    const result = await chat({
      adapter: geminiAdapter(),
      outputSchema: courseOutlineSchema,
      temperature: 0.7,
      systemPrompts: [
        "You are an expert university learning designer. Generate practical, personalized course material for a student-owned self-study course. Keep it structured and directly useful inside a learning app. Cover the full syllabus when syllabus text is provided. Strictly adapt explanation style to the requested learner level.",
      ],
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });
    console.info("[learningAi] generateCourseOutline:output", {
      overviewLength: result.overview.length,
      moduleCount: result.modules.length,
      lessonCount: result.modules.reduce(
        (count, module) => count + module.lessons.length,
        0,
      ),
      moduleTitles: result.modules.map((module) => module.title),
    });
    return result;
  });

export const generateNextLearningCard = createServerFn({ method: "POST" })
  .inputValidator(generateNextLearningCardSchema)
  .handler(async ({ data }) => {
    const isFirstCard = data.previousCards.length === 0;
    const lastCard = data.previousCards.at(-1);
    const levelInstruction = levelPedagogyInstruction(data.courseContext.level);

    return chat({
      adapter: geminiAdapter(),
      outputSchema: generatedLearningCardSchema,
      temperature: 0.68,
      systemPrompts: [
        "You design one learning card at a time for a university learning deck. Return exactly one card. Use concise markdown in content. Do not overload the student. Make the next card respond to previous answers, feedback, and questions. Card types: intro, text, quiz, coding, complete. Strictly adapt language complexity and pacing to learner level.",
      ],
      messages: [
        {
          role: "user",
          content: `Course context:\n${JSON.stringify(data.courseContext, null, 2)}\n\nLearning objective:\n${JSON.stringify(data.objective, null, 2)}\n\nPrevious cards:\n${JSON.stringify(data.previousCards, null, 2)}\n\nLevel instruction:\n${levelInstruction}\n\nRules:\n- Return exactly one structured card.\n- ${isFirstCard ? "This is the first card, so type MUST be intro." : "Choose the next best type based on the student's progress."}\n- If the previous assessed card shows strong understanding, you may return complete.\n- Do not return complete before at least one explanation/practice cycle unless the objective is trivial.\n- Text cards should teach with polished markdown.\n- Quiz cards should put the question in prompt and options in options.\n- Coding cards should put the coding task in prompt and leave options empty.\n- Complete cards should celebrate, summarize what was learned, and suggest the next objective.\n\nLast card: ${lastCard ? JSON.stringify(lastCard, null, 2) : "None"}`,
        },
      ],
    });
  });

export const evaluateCardAnswer = createServerFn({ method: "POST" })
  .inputValidator(evaluateCardAnswerSchema)
  .handler(async ({ data }) => {
    const levelInstruction = levelPedagogyInstruction(data.courseContext.level);
    return chat({
      adapter: geminiAdapter(),
      outputSchema: evaluateCardAnswerResultSchema,
      stream: false,
      temperature: 0.35,
      systemPrompts: [
        "You evaluate a student answer inside a learning card and return strict structured JSON. Decide verdict as correct/partial/incorrect, set score from 0 to 100, give actionable feedback, and one concrete nextStep. Keep feedback under 180 words. Match language complexity to learner level.",
      ],
      messages: [
        {
          role: "user",
          content: `Course context:\n${JSON.stringify(data.courseContext, null, 2)}\n\nLevel instruction:\n${levelInstruction}\n\nObjective:\n${JSON.stringify(data.objective, null, 2)}\n\nCard:\n${JSON.stringify(data.card, null, 2)}\n\nStudent answer:\n${data.answer}`,
        },
      ],
    });
  });

export const askCardQuestion = createServerFn({ method: "POST" })
  .inputValidator(cardQuestionSchema)
  .handler(async ({ data }) => {
    const levelInstruction = levelPedagogyInstruction(data.courseContext.level);
    return chat({
      adapter: geminiAdapter(),
      stream: false,
      temperature: 0.45,
      systemPrompts: [
        "You answer a student's question on a specific learning card. Adapt to their course, objective, current card, and previous Q&A. Answer clearly, use a compact example, and avoid drifting away from the card. Match language complexity to learner level.",
      ],
      messages: [
        {
          role: "user",
          content: `Course context:\n${JSON.stringify(data.courseContext, null, 2)}\n\nLevel instruction:\n${levelInstruction}\n\nObjective:\n${JSON.stringify(data.objective, null, 2)}\n\nCurrent card:\n${JSON.stringify(data.card, null, 2)}\n\nPrevious card questions:\n${JSON.stringify(data.previousQuestions, null, 2)}\n\nStudent question: ${data.question}`,
        },
      ],
    });
  });

export const generateLessonContent = createServerFn({ method: "POST" })
  .inputValidator(lessonContentSchema)
  .handler(async ({ data }) => {
    const levelInstruction = levelPedagogyInstruction(data.courseContext.level);
    return chat({
      adapter: geminiAdapter(),
      stream: false,
      temperature: 0.65,
      systemPrompts: [
        "You are a patient university tutor. Explain the concept in a personalized way with a visual mental model, a concrete example, and a short self-check. Strictly match language complexity to learner level.",
      ],
      messages: [
        {
          role: "user",
          content: `Rewrite this lesson for the student.\n\nCourse: ${data.courseContext.title}\nSubject: ${data.courseContext.subject}\nLevel: ${data.courseContext.level}\nWeekly time commitment: ${data.courseContext.weeklyTimeCommitment}\nGoal: ${data.courseContext.goal}\nLevel instruction: ${levelInstruction}\n\nDefaults:\n- Language: English\n- Learning style: visual examples and hands-on practice\n\nLesson: ${data.title}\nConcept: ${data.concept}`,
        },
      ],
    });
  });

export const askTeacher = createServerFn({ method: "POST" })
  .inputValidator(teacherQuestionSchema)
  .handler(async ({ data }) => {
    const levelInstruction = levelPedagogyInstruction(data.courseContext.level);
    return chat({
      adapter: geminiAdapter(),
      stream: false,
      temperature: 0.55,
      systemPrompts: [
        "You are Teacher, an instant doubt-clearing AI for university students. Answer directly, adapt to the student's language/style, use analogies from familiar domains, and end with one tiny action the student can try in the practice notebook. Match language complexity to learner level.",
      ],
      messages: [
        {
          role: "user",
          content: `Student profile:\nCourse: ${data.courseContext.title}\nSubject: ${data.courseContext.subject}\nLevel: ${data.courseContext.level}\nWeekly time commitment: ${data.courseContext.weeklyTimeCommitment}\nGoal: ${data.courseContext.goal}\nLevel instruction: ${levelInstruction}\nLanguage: English\nLearning style: visual examples and hands-on practice\n\nCurrent lesson: ${data.lessonTitle}\nConcept: ${data.lessonConcept}\nLesson content: ${data.lessonContent}\nPractice prompt: ${data.practicePrompt}\nStudent notebook: ${data.practiceNote || "No notes yet."}\nPrevious messages: ${data.previousMessages.map((message) => `${message.role}: ${message.content}`).join("\n") || "None"}\n\nStudent doubt: ${data.question}`,
        },
      ],
    });
  });
