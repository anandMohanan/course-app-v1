// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  organizations: {
    allow: {
      view: "isOrgMember",
      create: "isSignedIn",
      update: "isOrgAdmin",
      delete: "isOrgAdmin",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOrgMember:
        "auth.id != null && auth.id in data.ref('memberships.user.id')",
      isOrgAdmin:
        "auth.id != null && auth.id in data.ref('memberships.user.id') && 'org_admin' in data.ref('memberships.role')",
    },
  },
  organizationMembers: {
    allow: {
      view: "isOrgMember",
      create: "isOrgAdmin",
      update: "isOrgAdmin",
      delete: "isOrgAdmin",
    },
    bind: {
      isOrgMember:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id')",
      isOrgAdmin:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id') && 'org_admin' in data.ref('organization.memberships.role')",
    },
  },
  courses: {
    allow: {
      view: "isOwner || isOrgMember",
      create:
        "isSignedIn && isValidKind && ((isTemplateCreate && isOrgInstructor && auth.id == data.ownerId) || (isLearnerInstanceCreate && auth.id == data.ownerId && canCreateLearnerInstance))",
      update:
        "((isTemplate && isOrgInstructor) || (isLearnerInstance && isOwner)) && ((newData.orgId == null && auth.id == newData.ownerId) || (newData.orgId != null && newData.orgId in auth.ref('$user.organizationMemberships.organization.id')))",
      delete: "isOwner || isOrgAdmin",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      isTemplate: "data.kind == 'template'",
      isLearnerInstance: "data.kind == 'learner_instance'",
      isTemplateCreate: "data.kind == 'template'",
      isLearnerInstanceCreate: "data.kind == 'learner_instance'",
      isValidKind: "data.kind == 'template' || data.kind == 'learner_instance'",
      isOrgMember:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id')",
      isOrgInstructor:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id') && ('org_admin' in data.ref('organization.memberships.role') || 'instructor' in data.ref('organization.memberships.role'))",
      isOrgAdmin:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id') && 'org_admin' in data.ref('organization.memberships.role')",
      canCreateLearnerInstance:
        "data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id')",
    },
  },
  courseSubjects: {
    allow: {
      view: "isOrgMember",
      create: "isOrgInstructor",
      update: "isOrgInstructor",
      delete: "isOrgInstructor",
    },
    bind: {
      isOrgMember:
        "auth.id != null && auth.id in data.ref('course.organization.memberships.user.id')",
      isOrgInstructor:
        "auth.id != null && auth.id in data.ref('course.organization.memberships.user.id') && ('org_admin' in data.ref('course.organization.memberships.role') || 'instructor' in data.ref('course.organization.memberships.role'))",
    },
  },
  cohorts: {
    allow: {
      view: "isOrgMember",
      create: "isOrgInstructor",
      update: "isOrgInstructor",
      delete: "isOrgAdmin",
    },
    bind: {
      isOrgMember:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id')",
      isOrgInstructor:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id') && ('org_admin' in data.ref('organization.memberships.role') || 'instructor' in data.ref('organization.memberships.role'))",
      isOrgAdmin:
        "auth.id != null && auth.id in data.ref('organization.memberships.user.id') && 'org_admin' in data.ref('organization.memberships.role')",
    },
  },
  courseEnrollments: {
    allow: {
      view: "isCourseOrgMember",
      create: "isCourseInstructor",
      update: "isCourseInstructor",
      delete: "isCourseInstructor",
    },
    bind: {
      isCourseOrgMember:
        "auth.id != null && auth.id in data.ref('course.organization.memberships.user.id')",
      isCourseInstructor:
        "auth.id != null && auth.id in data.ref('course.organization.memberships.user.id') && ('org_admin' in data.ref('course.organization.memberships.role') || 'instructor' in data.ref('course.organization.memberships.role'))",
    },
  },
  modules: {
    allow: {
      view: "ownsCourse || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id in data.ref('course.owner.id')) || (data.orgId != null && auth.id in data.ref('course.owner.id') && data.orgId in auth.ref('$user.organizationMemberships.organization.id')) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id') && ('org_admin' in auth.ref('$user.organizationMemberships.role') || 'instructor' in auth.ref('$user.organizationMemberships.role'))))",
      update: "ownsCourse || hasOrgInstructorAccess",
      delete: "ownsCourse || hasOrgInstructorAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      ownsCourse: "auth.id != null && auth.id in data.ref('course.owner.id')",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('course.organization.memberships.user.id')",
      hasOrgInstructorAccess:
        "auth.id != null && auth.id in data.ref('course.organization.memberships.user.id') && ('org_admin' in data.ref('course.organization.memberships.role') || 'instructor' in data.ref('course.organization.memberships.role'))",
    },
  },
  lessons: {
    allow: {
      view: "ownsCourse || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id in data.ref('module.course.owner.id')) || (data.orgId != null && auth.id in data.ref('module.course.owner.id') && data.orgId in auth.ref('$user.organizationMemberships.organization.id')) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id') && ('org_admin' in auth.ref('$user.organizationMemberships.role') || 'instructor' in auth.ref('$user.organizationMemberships.role'))))",
      update: "ownsCourse || hasOrgInstructorAccess",
      delete: "ownsCourse || hasOrgInstructorAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      ownsCourse:
        "auth.id != null && auth.id in data.ref('module.course.owner.id')",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('module.course.organization.memberships.user.id')",
      hasOrgInstructorAccess:
        "auth.id != null && auth.id in data.ref('module.course.organization.memberships.user.id') && ('org_admin' in data.ref('module.course.organization.memberships.role') || 'instructor' in data.ref('module.course.organization.memberships.role'))",
    },
  },
  learningCards: {
    allow: {
      view: "isOwner || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id == data.ownerId) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id') && ('org_admin' in auth.ref('$user.organizationMemberships.role') || 'instructor' in auth.ref('$user.organizationMemberships.role'))))",
      update:
        "(isOwner || hasOrgInstructorAccess) && ((newData.orgId == null && auth.id == newData.ownerId) || (newData.orgId != null && newData.orgId in auth.ref('$user.organizationMemberships.organization.id') && ('org_admin' in auth.ref('$user.organizationMemberships.role') || 'instructor' in auth.ref('$user.organizationMemberships.role'))))",
      delete: "isOwner || hasOrgInstructorAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('lesson.module.course.organization.memberships.user.id')",
      hasOrgInstructorAccess:
        "auth.id != null && auth.id in data.ref('lesson.module.course.organization.memberships.user.id') && ('org_admin' in data.ref('lesson.module.course.organization.memberships.role') || 'instructor' in data.ref('lesson.module.course.organization.memberships.role'))",
    },
  },
  cardQuestions: {
    allow: {
      view: "isOwner || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id == data.ownerId) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id')))",
      update: "isOwner || hasOrgAccess",
      delete: "isOwner || hasOrgAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('card.lesson.module.course.organization.memberships.user.id')",
    },
  },
  cardAttempts: {
    allow: {
      view: "isOwner || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id == data.ownerId) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id')))",
      update: "isOwner || hasOrgAccess",
      delete: "isOwner || hasOrgAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('card.lesson.module.course.organization.memberships.user.id')",
    },
  },
  practiceNotes: {
    allow: {
      view: "isOwner || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id == data.ownerId) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id')))",
      update: "isOwner || hasOrgAccess",
      delete: "isOwner || hasOrgAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('lesson.module.course.organization.memberships.user.id')",
    },
  },
  teacherMessages: {
    allow: {
      view: "isOwner || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id == data.ownerId) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id')))",
      update: "false",
      delete: "isOwner || hasOrgAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('lesson.module.course.organization.memberships.user.id')",
    },
  },
  lessonProgress: {
    allow: {
      view: "isOwner || hasOrgAccess",
      create:
        "isSignedIn && ((data.orgId == null && auth.id == data.ownerId) || (data.orgId != null && data.orgId in auth.ref('$user.organizationMemberships.organization.id')))",
      update: "isOwner || hasOrgAccess",
      delete: "isOwner || hasOrgAccess",
    },
    bind: {
      isSignedIn: "auth.id != null",
      isOwner: "auth.id != null && auth.id == data.ownerId",
      hasOrgAccess:
        "auth.id != null && auth.id in data.ref('lesson.module.course.organization.memberships.user.id')",
    },
  },
  $files: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
