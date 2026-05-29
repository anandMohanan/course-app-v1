// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
      activeOrgId: i.string().indexed().optional(),
    }),
    organizations: i.entity({
      name: i.string(),
      slug: i.string().unique().indexed(),
      type: i.string().indexed(),
      plan: i.string().indexed(),
      billingStatus: i.string().indexed(),
      seatLimit: i.number(),
      seatCount: i.number().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    organizationMembers: i.entity({
      role: i.string().indexed(),
      status: i.string().indexed(),
      joinedAt: i.number().indexed(),
    }),
    cohorts: i.entity({
      name: i.string(),
      code: i.string().indexed(),
      orgId: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    courseEnrollments: i.entity({
      orgId: i.string().indexed(),
      role: i.string().indexed(),
      status: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    courses: i.entity({
      title: i.string(),
      subject: i.string(),
      kind: i.string().indexed(),
      templateCourseId: i.string().indexed().optional(),
      templateSubjectId: i.string().indexed().optional(),
      level: i.string(),
      language: i.string().optional(),
      learningStyle: i.string().optional(),
      preferredLanguage: i.string().optional(),
      pace: i.string().optional(),
      strengths: i.string().optional(),
      weakAreas: i.string().optional(),
      targetOutcome: i.string().optional(),
      goal: i.string(),
      weeklyTimeCommitment: i.string().indexed(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    courseSubjects: i.entity({
      name: i.string(),
      syllabusText: i.string().optional(),
      orgId: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    modules: i.entity({
      title: i.string(),
      summary: i.string(),
      position: i.number().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number(),
    }),
    lessons: i.entity({
      title: i.string(),
      concept: i.string(),
      personalizedContent: i.string(),
      practiceType: i.string(),
      practicePrompt: i.string(),
      position: i.number().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number(),
    }),
    learningCards: i.entity({
      type: i.string(),
      title: i.string(),
      content: i.string(),
      prompt: i.string(),
      optionsJson: i.string(),
      answer: i.string(),
      feedback: i.string(),
      status: i.string(),
      position: i.number().indexed(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    cardQuestions: i.entity({
      question: i.string(),
      answer: i.string(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
    }),
    cardAttempts: i.entity({
      answer: i.string(),
      verdict: i.string().indexed(),
      score: i.number().indexed(),
      feedback: i.string(),
      nextStep: i.string(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
    }),
    practiceNotes: i.entity({
      content: i.string(),
      workspaceType: i.string(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      updatedAt: i.number().indexed(),
    }),
    teacherMessages: i.entity({
      role: i.string(),
      content: i.string(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      createdAt: i.number().indexed(),
    }),
    lessonProgress: i.entity({
      key: i.string().unique().indexed(),
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(),
      currentCardId: i.string().optional(),
      currentCardPosition: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    userCourses: {
      forward: { on: "$users", has: "many", label: "courses" },
      reverse: { on: "courses", has: "one", label: "owner" },
    },
    userOrganizations: {
      forward: { on: "$users", has: "many", label: "organizations" },
      reverse: { on: "organizations", has: "many", label: "users" },
    },
    organizationMembershipsUser: {
      forward: { on: "$users", has: "many", label: "organizationMemberships" },
      reverse: { on: "organizationMembers", has: "one", label: "user" },
    },
    organizationMembershipsOrganization: {
      forward: { on: "organizations", has: "many", label: "memberships" },
      reverse: { on: "organizationMembers", has: "one", label: "organization" },
    },
    organizationCourses: {
      forward: { on: "organizations", has: "many", label: "courses" },
      reverse: { on: "courses", has: "one", label: "organization" },
    },
    organizationCohorts: {
      forward: { on: "organizations", has: "many", label: "cohorts" },
      reverse: { on: "cohorts", has: "one", label: "organization" },
    },
    cohortMembers: {
      forward: { on: "cohorts", has: "many", label: "members" },
      reverse: { on: "organizationMembers", has: "many", label: "cohorts" },
    },
    cohortCourses: {
      forward: { on: "cohorts", has: "many", label: "courses" },
      reverse: { on: "courses", has: "many", label: "cohorts" },
    },
    enrollmentCourse: {
      forward: { on: "courses", has: "many", label: "enrollments" },
      reverse: { on: "courseEnrollments", has: "one", label: "course" },
    },
    enrollmentMember: {
      forward: { on: "organizationMembers", has: "many", label: "enrollments" },
      reverse: { on: "courseEnrollments", has: "one", label: "member" },
    },
    courseModules: {
      forward: { on: "courses", has: "many", label: "modules" },
      reverse: { on: "modules", has: "one", label: "course" },
    },
    courseSubjects: {
      forward: { on: "courses", has: "many", label: "subjects" },
      reverse: { on: "courseSubjects", has: "one", label: "course" },
    },
    subjectSyllabusFile: {
      forward: { on: "courseSubjects", has: "one", label: "syllabusFile" },
      reverse: { on: "$files", has: "many", label: "subjectSyllabusFor" },
    },
    moduleLessons: {
      forward: { on: "modules", has: "many", label: "lessons" },
      reverse: { on: "lessons", has: "one", label: "module" },
    },
    lessonLearningCards: {
      forward: { on: "lessons", has: "many", label: "learningCards" },
      reverse: { on: "learningCards", has: "one", label: "lesson" },
    },
    learningCardQuestions: {
      forward: { on: "learningCards", has: "many", label: "cardQuestions" },
      reverse: { on: "cardQuestions", has: "one", label: "card" },
    },
    learningCardAttempts: {
      forward: { on: "learningCards", has: "many", label: "attempts" },
      reverse: { on: "cardAttempts", has: "one", label: "card" },
    },
    lessonPracticeNotes: {
      forward: { on: "lessons", has: "many", label: "practiceNotes" },
      reverse: { on: "practiceNotes", has: "one", label: "lesson" },
    },
    lessonTeacherMessages: {
      forward: { on: "lessons", has: "many", label: "teacherMessages" },
      reverse: { on: "teacherMessages", has: "one", label: "lesson" },
    },
    lessonProgressEntries: {
      forward: { on: "lessons", has: "many", label: "progressEntries" },
      reverse: { on: "lessonProgress", has: "one", label: "lesson" },
    },
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
