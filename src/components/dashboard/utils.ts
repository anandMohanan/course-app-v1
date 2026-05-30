import { clientDb } from "@/lib/db";
import {
  type CourseOutline,
  type CourseWizardInput,
  practiceTypes,
} from "@/lib/learningAi";
import { id } from "@instantdb/react";
import type { Course } from "./types";

export function firstLesson(course?: Course) {
  return course?.modules?.[0]?.lessons?.[0] ?? null;
}

export function lessonCount(courses: Course[]) {
  return courses.reduce(
    (count, course) =>
      count +
      (course.modules ?? []).reduce(
        (moduleCount, module) => moduleCount + (module.lessons?.length ?? 0),
        0,
      ),
    0,
  );
}

export function persistCourse(
  courseId: string,
  orgId: string | null,
  form: CourseWizardInput,
  outline: CourseOutline,
) {
  console.info("[CourseWizard] persist:start", {
    courseId,
    orgId,
    title: form.title,
    weeklyTimeCommitment: form.weeklyTimeCommitment,
  });
  const now = Date.now();
  const moduleIds = outline.modules.map(() => id());
  const lessonIds = outline.modules.map((module) =>
    module.lessons.map(() => id()),
  );
  const firstLessonId = lessonIds[0]?.[0];

  if (!firstLessonId) {
    throw new Error("AI returned a course without lessons. Try generating again.");
  }

  clientDb.transact([
    ...outline.modules.flatMap((module, moduleIndex) => {
      const moduleId = moduleIds[moduleIndex];
      return [
        clientDb.tx.modules[moduleId]
          .update({
            title: module.title,
            summary: module.summary,
            position: moduleIndex,
            orgId: orgId ?? undefined,
            createdAt: now,
          })
          .link({ course: courseId }),
        ...module.lessons.map((lesson, lessonIndex) =>
          clientDb.tx.lessons[lessonIds[moduleIndex][lessonIndex]]
            .update({
              title: lesson.title,
              concept: lesson.concept,
              personalizedContent: lesson.personalizedContent,
              practiceType: practiceTypes.includes(lesson.practiceType)
                ? lesson.practiceType
                : "general",
              practicePrompt: lesson.practicePrompt,
              position: lessonIndex,
              orgId: orgId ?? undefined,
              createdAt: now,
            })
            .link({ module: moduleId }),
        ),
      ];
    }),
  ]);

  console.info("[CourseWizard] persist:success", {
    courseId,
    firstLessonId,
    moduleCount: moduleIds.length,
    lessonCount: lessonIds.flat().length,
  });
  return { courseId, firstLessonId };
}
