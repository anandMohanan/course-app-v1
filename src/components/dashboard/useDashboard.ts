import { clientDb } from "@/lib/db";
import {
  activateMyOrganizationMembership,
  createLearnerCourseInstance,
  resolveOrgContext,
  roleCanManageContent,
  setActiveOrganization,
} from "@/lib/org";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { NIL_UUID, type Course, type OrgState } from "./types";

export function useDashboard() {
  const auth = clientDb.useAuth();

  const resolveOrgContextFn = useServerFn(resolveOrgContext);
  const setActiveOrgFn = useServerFn(setActiveOrganization);
  const activateMembershipFn = useServerFn(activateMyOrganizationMembership);
  const createLearnerInstanceFn = useServerFn(createLearnerCourseInstance);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [orgState, setOrgState] = useState<OrgState | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);

  const ownerId = auth.user?.id ?? NIL_UUID;
  const activeOrgId = orgState?.activeMembership?.organization.id ?? NIL_UUID;
  const activeRole = orgState?.activeMembership?.role ?? null;

  const { isLoading, error, data } = clientDb.useQuery({
    courses: {
      $: {
        where: { or: [{ ownerId }, { orgId: activeOrgId }] },
        order: { updatedAt: "desc" },
      },
      modules: { lessons: {} },
      subjects: { syllabusFile: {} },
      enrollments: { member: { user: {} } },
    },
    courseEnrollments: {
      $: {
        where: {
          and: [
            { orgId: activeOrgId },
            { "member.user.id": ownerId },
            { status: "active" },
          ],
        },
      },
      course: {},
      member: {},
    },
  } as any) as {
    isLoading: boolean;
    error: { message?: string } | null;
    data: any;
  };

  useEffect(() => {
    if (auth.isLoading || !auth.user) return;

    const run = async () => {
      try {
        const activeOrgIdFromUser = (auth.user as { activeOrgId?: string } | null)
          ?.activeOrgId;
        let ctx = await resolveOrgContextFn({
          data: { userId: ownerId, activeOrgId: activeOrgIdFromUser },
        });
        if (!ctx.activeMembership) {
          const invitedMembership =
            ctx.memberships.find(
              (m) =>
                m.status === "invited" &&
                m.organization.id === activeOrgIdFromUser,
            ) ??
            ctx.memberships.find((m) => m.status === "invited");
          if (invitedMembership) {
            await activateMembershipFn({
              data: {
                userId: ownerId,
                orgId: invitedMembership.organization.id,
              },
            });
            ctx = await resolveOrgContextFn({
              data: {
                userId: ownerId,
                activeOrgId: invitedMembership.organization.id,
              },
            });
          }
        }
        const shouldAutoSetActiveOrg =
          !activeOrgIdFromUser &&
          !ctx.activeMembership &&
          ctx.memberships.length === 1 &&
          ctx.memberships[0].status === "active";
        if (shouldAutoSetActiveOrg) {
          await setActiveOrgFn({
            data: { userId: ownerId, orgId: ctx.memberships[0].organization.id },
          });
          ctx = await resolveOrgContextFn({
            data: { userId: ownerId, activeOrgId: ctx.memberships[0].organization.id },
          });
        }
        setOrgState(ctx);
      } catch (caught) {
        setOrgError(
          caught instanceof Error
            ? caught.message
            : "Could not resolve org context",
        );
      }
    };

    run();
  }, [auth.isLoading, auth.user, resolveOrgContextFn]);

  const courses = useMemo(() => {
    const all = ((data?.courses ?? []) as Course[])
      .filter((course) => course.kind === "learner_instance")
      .map((course) => ({
        ...course,
        modules: [...(course.modules ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((module) => ({
            ...module,
            lessons: [...(module.lessons ?? [])].sort(
              (a, b) => a.position - b.position,
            ),
          })),
      }));

    if (activeRole !== "learner") return all;

    const assignedCourseIds = new Set(
      ((data?.courseEnrollments ?? []) as Array<{ course?: { id: string } }>).map(
        (row) => row.course?.id,
      ),
    );

    return all.filter(
      (course) =>
        course.ownerId === ownerId || assignedCourseIds.has(course.id),
    );
  }, [data?.courses, data?.courseEnrollments, activeRole, ownerId]);

  const templateCourses = useMemo(() => {
    const all = ((data?.courses ?? []) as Array<any>).filter(
      (course) => course.kind === "template",
    );
    if (activeRole !== "learner") return all;
    const assignedTemplateIds = new Set(
      ((data?.courseEnrollments ?? []) as Array<{ course?: { id: string } }>).map(
        (row) => row.course?.id,
      ),
    );
    return all.filter(
      (course) =>
        assignedTemplateIds.has(course.id) || course.ownerId === ownerId,
    );
  }, [data?.courses, data?.courseEnrollments, activeRole, ownerId]);

  const canCreateCourse =
    !orgState?.activeMembership ||
    roleCanManageContent(activeRole) ||
    (activeRole === "learner" && templateCourses.length > 0);

  const billingBlocksCreate =
    orgState?.activeMembership?.organization.billingStatus !== undefined &&
    orgState.activeMembership.organization.billingStatus !== "active";

  return {
    auth,
    isLoading,
    error,
    orgState,
    orgError,
    ownerId,
    activeOrgId,
    wizardOpen,
    setWizardOpen,
    courses,
    templateCourses,
    canCreateCourse,
    billingBlocksCreate,
    createLearnerInstanceFn,
  };
}

export type DashboardWorkspace = ReturnType<typeof useDashboard>;
