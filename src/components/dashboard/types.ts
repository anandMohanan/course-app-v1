import type { CourseWizardInput } from "@/lib/learningAi";
import type { OrgRole } from "@/lib/org";

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export type Course = {
  id: string;
  title: string;
  subject: string;
  kind: "template" | "learner_instance";
  templateCourseId?: string;
  templateSubjectId?: string;
  level: string;
  language?: string;
  learningStyle?: string;
  preferredLanguage?: string;
  pace?: string;
  strengths?: string;
  weakAreas?: string;
  targetOutcome?: string;
  goal: string;
  weeklyTimeCommitment?: string;
  ownerId: string;
  orgId?: string;
  updatedAt: number;
  modules?: Array<{
    id: string;
    title: string;
    position: number;
    lessons?: Array<{ id: string; title: string; position: number }>;
  }>;
};

export const defaultWizard: CourseWizardInput = {
  title: "Personalized learning path",
  templateTitle: "",
  templateSubjectName: "",
  syllabusText: "",
  hasSyllabusPdf: false,
  subject: "",
  level: "Beginner",
  goal: "Build clear understanding of fundamentals and apply them step by step.",
  weeklyTimeCommitment: "5-7 hrs",
  preferredLanguage: "English",
  learningStyle: "Visual examples and hands-on practice",
  pace: "Balanced",
  strengths: "",
  weakAreas: "",
};

export type OrgState = {
  memberships: Array<{
    id: string;
    role: OrgRole;
    status: "active" | "invited" | "disabled";
    organization: {
      id: string;
      name: string;
      billingStatus: "active" | "past_due" | "canceled";
      seatCount: number;
      seatLimit: number;
    };
  }>;
  activeMembership: {
    id: string;
    role: OrgRole;
    status: "active" | "invited" | "disabled";
    organization: {
      id: string;
      name: string;
      billingStatus: "active" | "past_due" | "canceled";
      seatCount: number;
      seatLimit: number;
    };
  } | null;
  shouldOnboard: boolean;
  hasMultipleOrgs: boolean;
};
