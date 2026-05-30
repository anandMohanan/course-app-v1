import { clientDb } from "@/lib/db";
import {
  adminAssignCourse,
  adminCreateCourseSubject,
  adminCreateCourseTemplate,
  adminGetOrganizationOverview,
  adminInviteMember,
  adminUpdateCourseSubject,
  adminUpdateOrganizationSettings,
  type OrgRole,
  resolveOrgContext,
  roleCanManageContent,
  setActiveOrganization,
} from "@/lib/org";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import type { BillingStatus, MemberStatus, WeeklyTimeCommitment } from "./types";

export function useAdminWorkspace() {
  const auth = clientDb.useAuth();

  const resolveOrgContextFn = useServerFn(resolveOrgContext);
  const setActiveOrgFn = useServerFn(setActiveOrganization);
  const overviewFn = useServerFn(adminGetOrganizationOverview);
  const updateOrgFn = useServerFn(adminUpdateOrganizationSettings);
  const inviteFn = useServerFn(adminInviteMember);
  const assignFn = useServerFn(adminAssignCourse);
  const createTemplateFn = useServerFn(adminCreateCourseTemplate);
  const createSubjectFn = useServerFn(adminCreateCourseSubject);
  const updateSubjectFn = useServerFn(adminUpdateCourseSubject);

  const [overview, setOverview] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<OrgRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("school");
  const [plan, setPlan] = useState("starter");
  const [seatLimit, setSeatLimit] = useState("100");
  const [billingStatus, setBillingStatus] =
    useState<BillingStatus>("active");

  const [targetUserId, setTargetUserId] = useState("");
  const [memberRole, setMemberRole] = useState<OrgRole>("learner");
  const [memberStatus, setMemberStatus] =
    useState<MemberStatus>("invited");

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedMember, setSelectedMember] = useState("");

  const [templateTitle, setTemplateTitle] = useState("");
  const [templateLevel, setTemplateLevel] = useState(
    "First year undergraduate",
  );
  const [templateGoal, setTemplateGoal] = useState(
    "Understand the core concepts and apply them confidently.",
  );
  const [templateWeeklyTime, setTemplateWeeklyTime] =
    useState<WeeklyTimeCommitment>("5-7 hrs");

  const [subjectName, setSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState("");
  const [editingSubjectText, setEditingSubjectText] = useState("");
  const [editingSubjectPdfFileName, setEditingSubjectPdfFileName] = useState<
    string | null
  >(null);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!auth.user) return;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const ctx = await resolveOrgContextFn({
        data: {
          userId: auth.user.id,
          activeOrgId: (auth.user as { activeOrgId?: string } | null)
            ?.activeOrgId,
        },
      });

      if (!ctx.activeMembership?.organization?.id) {
        throw new Error("No active organization.");
      }

      setActiveRole(ctx.activeMembership.role);

      await setActiveOrgFn({
        data: {
          userId: auth.user.id,
          orgId: ctx.activeMembership.organization.id,
        },
      });

      const data = await overviewFn({
        data: {
          actorUserId: auth.user.id,
          orgId: ctx.activeMembership.organization.id,
        },
      });

      setOverview(data);
      setName(data.organization?.name ?? "");
      setType(data.organization?.type ?? "school");
      setPlan(data.organization?.plan ?? "starter");
      setSeatLimit(String(data.organization?.seatLimit ?? 100));
      setBillingStatus(data.organization?.billingStatus ?? "active");

      const courses = data.courses ?? [];
      const activeLearners = (data.members ?? []).filter(
        (member: any) =>
          member.role === "learner" && member.status === "active",
      );

      setSelectedCourse((current) => {
        const stillExists = courses.some((course: any) => course.id === current);

        return stillExists ? current : courses[0]?.id ?? "";
      });

      setSelectedMember((current) => {
        const stillExists = activeLearners.some(
          (member: any) => member.id === current,
        );

        return stillExists ? current : activeLearners[0]?.id ?? "";
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load admin workspace",
      );
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [auth.user]);

  const canManage = roleCanManageContent(activeRole);

  const learners = useMemo(
    () =>
      (overview?.members ?? []).filter(
        (member: any) =>
          member.role === "learner" && member.status === "active",
      ),
    [overview?.members],
  );

  const assignableLearners = useMemo(
    () =>
      (overview?.members ?? []).filter(
        (member: any) =>
          member.role === "learner" &&
          (member.status === "active" || member.status === "invited"),
      ),
    [overview?.members],
  );

  const templates = useMemo(() => overview?.courses ?? [], [overview?.courses]);

  const selectedTemplate = useMemo(
    () => templates.find((course: any) => course.id === selectedCourse) ?? null,
    [templates, selectedCourse],
  );

  const selectedMemberRecord = useMemo(
    () =>
      assignableLearners.find((member: any) => member.id === selectedMember) ??
      null,
    [assignableLearners, selectedMember],
  );

  const subjects = useMemo(
    () => selectedTemplate?.subjects ?? [],
    [selectedTemplate],
  );

  const totalSubjects = useMemo(
    () =>
      templates.reduce(
        (count: number, course: any) => count + (course.subjects?.length ?? 0),
        0,
      ),
    [templates],
  );

  const selectedCourseName = selectedTemplate?.title ?? "";
  const selectedMemberLabel = selectedMemberRecord
    ? selectedMemberRecord.user?.email ??
      selectedMemberRecord.user?.id ??
      selectedMemberRecord.id
    : "";

  useEffect(() => {
    const current = subjects.find(
      (subject: any) => subject.id === editingSubjectId,
    );

    if (!current) return;

    setEditingSubjectText(current.syllabusText ?? "");
    setEditingSubjectPdfFileName(current.syllabusFile?.path ?? null);
  }, [editingSubjectId, subjects]);

  const handleError = (caught: unknown, fallback: string) => {
    setError(caught instanceof Error ? caught.message : fallback);
  };

  return {
    auth,
    overview,
    error,
    loading,
    refreshing,
    canManage,
    load,
    setError,
    handleError,
    learners,
    assignableLearners,
    templates,
    subjects,
    totalSubjects,
    selectedCourse,
    setSelectedCourse,
    selectedCourseName,
    selectedMember,
    setSelectedMember,
    selectedMemberLabel,
    templateTitle,
    setTemplateTitle,
    templateLevel,
    setTemplateLevel,
    templateGoal,
    setTemplateGoal,
    templateWeeklyTime,
    setTemplateWeeklyTime,
    subjectName,
    setSubjectName,
    editingSubjectId,
    setEditingSubjectId,
    editingSubjectText,
    setEditingSubjectText,
    editingSubjectPdfFileName,
    setEditingSubjectPdfFileName,
    name,
    setName,
    type,
    setType,
    plan,
    setPlan,
    seatLimit,
    setSeatLimit,
    billingStatus,
    setBillingStatus,
    targetUserId,
    setTargetUserId,
    memberRole,
    setMemberRole,
    memberStatus,
    setMemberStatus,
    createTemplateFn,
    createSubjectFn,
    updateSubjectFn,
    assignFn,
    updateOrgFn,
    inviteFn,
  };
}

export type AdminWorkspace = ReturnType<typeof useAdminWorkspace>;
