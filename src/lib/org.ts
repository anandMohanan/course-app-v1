import { adminDb } from "@/lib/adminDb";
import { id } from "@instantdb/react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const orgRoles = ["org_admin", "instructor", "learner"] as const;
export const memberStatuses = ["active", "invited", "disabled"] as const;
export const billingStatuses = ["active", "past_due", "canceled"] as const;

export type OrgRole = (typeof orgRoles)[number];
export type MemberStatus = (typeof memberStatuses)[number];
export type BillingStatus = (typeof billingStatuses)[number];

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function roleCanManageContent(role: OrgRole | null | undefined) {
  return role === "org_admin" || role === "instructor";
}

export function roleCanManageOrg(role: OrgRole | null | undefined) {
  return role === "org_admin";
}

export function billingBlocksPrivilegedActions(status: BillingStatus | null | undefined) {
  return status === "canceled" || status === "past_due";
}

export function canActivateAnotherSeat(seatCount: number, seatLimit: number) {
  return seatCount < seatLimit;
}

export function isPlatformOwner(email?: string | null) {
  if (!email) return false;
  const allowlist = (process.env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

async function getUserById(userId: string) {
  const result = (await adminDb.query({
    $users: { $: { where: { id: userId } } },
  })) as { $users?: Array<{ id: string; email?: string; activeOrgId?: string }> };
  return result.$users?.[0] ?? null;
}

async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = (await adminDb.query({
    $users: { $: { where: { email: normalizedEmail } } },
  })) as { $users?: Array<{ id: string; email?: string; activeOrgId?: string }> };
  return result.$users?.[0] ?? null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type UserResolutionResult = {
  email: string;
  userId?: string;
  created: boolean;
  error?: string;
};

async function resolveOrProvisionUserByEmail(email: string): Promise<UserResolutionResult> {
  const normalized = normalizeEmail(email);
  const validEmail = z.string().email().safeParse(normalized);
  if (!validEmail.success) {
    return { email: normalized, created: false, error: "invalid email" };
  }

  const existingUser = await getUserByEmail(normalized);
  if (existingUser?.id) {
    return { email: normalized, userId: existingUser.id, created: false };
  }

  try {
    const provisionalUserId = id();
    await adminDb.transact(
      adminDb.tx.$users[provisionalUserId].update({
        email: normalized,
      }),
    );
    const createdUser = await getUserByEmail(normalized);
    if (createdUser?.id) {
      return { email: normalized, userId: createdUser.id, created: true };
    }
  } catch (caught) {
    // Handles races/uniqueness errors by re-checking after failed create.
    const racedUser = await getUserByEmail(normalized);
    if (racedUser?.id) {
      return { email: normalized, userId: racedUser.id, created: false };
    }
    return {
      email: normalized,
      created: false,
      error: caught instanceof Error ? caught.message : "could not create user",
    };
  }
  return { email: normalized, created: false, error: "could not create user" };
}

async function assertPlatformOwner(actorUserId: string) {
  const user = await getUserById(actorUserId);
  if (!user || !isPlatformOwner(user.email)) {
    throw new Error("Platform owner access required.");
  }
  return user;
}

async function assertOrgAdmin(actorUserId: string, orgId: string) {
  const membership = (await adminDb.query({
    organizationMembers: {
      $: {
        where: {
          and: [
            { "organization.id": orgId },
            { "user.id": actorUserId },
            { status: "active" },
            { role: "org_admin" },
          ],
        },
      },
    },
  })) as { organizationMembers?: Array<{ id: string }> };

  if ((membership.organizationMembers ?? []).length === 0) {
    throw new Error("Organization admin access required.");
  }
}

async function assertOrgInstructorOrAdmin(actorUserId: string, orgId: string) {
  const membership = (await adminDb.query({
    organizationMembers: {
      $: {
        where: {
          and: [
            { "organization.id": orgId },
            { "user.id": actorUserId },
            { status: "active" },
            { role: { $in: ["org_admin", "instructor"] } },
          ],
        },
      },
    },
  })) as { organizationMembers?: Array<{ id: string }> };

  if ((membership.organizationMembers ?? []).length === 0) {
    throw new Error("Instructor or admin access required.");
  }
}

export function makeOrgSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "org"}-${suffix}`;
}

const resolveOrgContextInput = z.object({
  userId: z.string().min(1),
  activeOrgId: z.string().optional().nullable(),
});

export const resolveOrgContext = createServerFn({ method: "POST" })
  .inputValidator(resolveOrgContextInput)
  .handler(async ({ data }) => {
    const memberships = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "user.id": data.userId },
              { status: { $in: ["active", "invited"] } },
            ],
          },
        },
        organization: {},
      },
    })) as {
      organizationMembers?: Array<{
        id: string;
        role: OrgRole;
        status: MemberStatus;
        organization?: {
          id: string;
          name: string;
          billingStatus: BillingStatus;
          seatCount: number;
          seatLimit: number;
        };
      }>;
    };

    const rows = (memberships.organizationMembers ?? []).filter(
      (m) => m.organization,
    ) as Array<{
      id: string;
      role: OrgRole;
      status: MemberStatus;
      organization: {
        id: string;
        name: string;
        billingStatus: BillingStatus;
        seatCount: number;
        seatLimit: number;
      };
    }>;

    const active = rows.filter((m) => m.status === "active");
    const selected =
      active.find((m) => m.organization.id === data.activeOrgId) ?? active[0] ?? null;

    return {
      memberships: rows,
      activeMembership: selected,
      shouldOnboard: active.length === 0,
      hasMultipleOrgs: active.length > 1,
    };
  });

const createOrganizationInput = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(120),
  type: z.string().min(2).max(40).default("school"),
  seatLimit: z.number().min(1).max(20000).default(100),
});

export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator(createOrganizationInput)
  .handler(async ({ data }) => {
    const now = Date.now();
    const orgId = id();
    const membershipId = id();

    await adminDb.transact([
      adminDb.tx.organizations[orgId].update({
        name: data.name,
        slug: makeOrgSlug(data.name),
        type: data.type,
        plan: "starter",
        billingStatus: "active",
        seatLimit: data.seatLimit,
        seatCount: 1,
        createdAt: now,
        updatedAt: now,
      }),
      adminDb.tx.organizationMembers[membershipId]
        .update({ role: "org_admin", status: "active", joinedAt: now })
        .link({ organization: orgId, user: data.userId }),
      adminDb.tx.$users[data.userId].update({ activeOrgId: orgId }),
    ]);

    return { orgId };
  });

const setActiveOrgInput = z.object({
  userId: z.string().min(1),
  orgId: z.string().min(1),
});

export const setActiveOrganization = createServerFn({ method: "POST" })
  .inputValidator(setActiveOrgInput)
  .handler(async ({ data }) => {
    const result = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "user.id": data.userId },
              { "organization.id": data.orgId },
              { status: "active" },
            ],
          },
        },
      },
    })) as { organizationMembers?: Array<{ id: string }> };

    if ((result.organizationMembers ?? []).length === 0) {
      throw new Error("You are not an active member of this organization.");
    }

    await adminDb.transact(adminDb.tx.$users[data.userId].update({ activeOrgId: data.orgId }));
    return { ok: true };
  });

const activateMyMembershipInput = z.object({
  userId: z.string().min(1),
  orgId: z.string().min(1),
});

export const activateMyOrganizationMembership = createServerFn({ method: "POST" })
  .inputValidator(activateMyMembershipInput)
  .handler(async ({ data }) => {
    const result = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "user.id": data.userId },
              { "organization.id": data.orgId },
              { status: { $in: ["invited", "active"] } },
            ],
          },
        },
      },
      organizations: { $: { where: { id: data.orgId } } },
    })) as {
      organizationMembers?: Array<{ id: string; status: MemberStatus }>;
      organizations?: Array<{ id: string; seatCount: number; seatLimit: number; billingStatus: BillingStatus }>;
    };

    const membership = result.organizationMembers?.[0];
    const org = result.organizations?.[0];
    if (!membership || !org) throw new Error("Membership not found.");

    if (membership.status === "active") {
      await adminDb.transact(adminDb.tx.$users[data.userId].update({ activeOrgId: data.orgId }));
      return { ok: true, activated: false };
    }
    if (billingBlocksPrivilegedActions(org.billingStatus)) {
      throw new Error("Cannot activate membership while billing is past due or canceled.");
    }
    if (!canActivateAnotherSeat(org.seatCount, org.seatLimit)) {
      throw new Error("Seat limit reached. Contact your organization admin.");
    }

    await adminDb.transact([
      adminDb.tx.organizationMembers[membership.id].update({ status: "active", joinedAt: Date.now() }),
      adminDb.tx.organizations[org.id].update({ seatCount: org.seatCount + 1, updatedAt: Date.now() }),
      adminDb.tx.$users[data.userId].update({ activeOrgId: org.id }),
    ]);

    return { ok: true, activated: true };
  });

const addMemberInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  targetUserId: z.string().min(1),
  role: z.enum(orgRoles),
  status: z.enum(memberStatuses).default("invited"),
});

export const addOrganizationMember = createServerFn({ method: "POST" })
  .inputValidator(addMemberInput)
  .handler(async ({ data }) => {
    const gate = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "user.id": data.actorUserId },
              { "organization.id": data.orgId },
              { status: "active" },
              { role: "org_admin" },
            ],
          },
        },
      },
      organizations: {
        $: { where: { id: data.orgId } },
      },
    })) as {
      organizationMembers?: Array<{ id: string }>;
      organizations?: Array<{ id: string; billingStatus: BillingStatus; seatCount: number; seatLimit: number }>;
    };

    if ((gate.organizationMembers ?? []).length === 0) {
      throw new Error("Only organization admins can manage members.");
    }

    const org = gate.organizations?.[0];
    if (!org) {
      throw new Error("Organization not found.");
    }

    if (billingBlocksPrivilegedActions(org.billingStatus)) {
      throw new Error("Billing status blocks member management. Resolve billing first.");
    }

    const alreadyMember = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "organization.id": data.orgId },
              { "user.id": data.targetUserId },
            ],
          },
        },
      },
    })) as { organizationMembers?: Array<{ id: string; status: MemberStatus }> };

    if ((alreadyMember.organizationMembers ?? []).length > 0) {
      throw new Error("User is already linked to this organization.");
    }

    if (data.status === "active" && !canActivateAnotherSeat(org.seatCount, org.seatLimit)) {
      throw new Error("Seat limit reached. Increase seats before activating more users.");
    }

    const membershipId = id();
    const tx: Array<any> = [
      adminDb.tx.organizationMembers[membershipId]
        .update({ role: data.role, status: data.status, joinedAt: Date.now() })
        .link({ organization: data.orgId, user: data.targetUserId }),
    ];

    if (data.status === "active") {
      tx.push(
        adminDb.tx.organizations[data.orgId].update({
          seatCount: org.seatCount + 1,
          updatedAt: Date.now(),
        }),
      );
    }

    await adminDb.transact(tx);
    return { ok: true };
  });

const updateMemberInput = z.object({
  actorUserId: z.string().min(1),
  membershipId: z.string().min(1),
  role: z.enum(orgRoles),
  status: z.enum(memberStatuses),
});

export const updateOrganizationMember = createServerFn({ method: "POST" })
  .inputValidator(updateMemberInput)
  .handler(async ({ data }) => {
    const lookup = (await adminDb.query({
      organizationMembers: {
        $: { where: { id: data.membershipId } },
        organization: { memberships: { user: {} } },
      },
    })) as {
      organizationMembers?: Array<{
        id: string;
        status: MemberStatus;
        organization?: {
          id: string;
          billingStatus: BillingStatus;
          seatCount: number;
          seatLimit: number;
          memberships?: Array<{ role: OrgRole; user?: { id: string } }>;
        };
      }>;
    };

    const member = lookup.organizationMembers?.[0];
    const org = member?.organization;
    if (!member || !org) throw new Error("Membership not found.");

    const isAdmin = (org.memberships ?? []).some(
      (m) => m.role === "org_admin" && m.user?.id === data.actorUserId,
    );

    if (!isAdmin) throw new Error("Only organization admins can update members.");

    if (billingBlocksPrivilegedActions(org.billingStatus)) {
      throw new Error("Billing status blocks member updates.");
    }

    const activating = member.status !== "active" && data.status === "active";
    const disabling = member.status === "active" && data.status !== "active";

    if (activating && !canActivateAnotherSeat(org.seatCount, org.seatLimit)) {
      throw new Error("Seat limit reached. Increase seats before activating more users.");
    }

    const nextSeatCount = activating
      ? org.seatCount + 1
      : disabling
        ? Math.max(0, org.seatCount - 1)
        : org.seatCount;

    await adminDb.transact([
      adminDb.tx.organizationMembers[data.membershipId].update({
        role: data.role,
        status: data.status,
      }),
      adminDb.tx.organizations[org.id].update({ seatCount: nextSeatCount, updatedAt: Date.now() }),
    ]);

    return { ok: true };
  });

const assignCourseInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  courseId: z.string().min(1),
  memberId: z.string().min(1),
});

export const assignCourseToMember = createServerFn({ method: "POST" })
  .inputValidator(assignCourseInput)
  .handler(async ({ data }) => {
    const gate = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "organization.id": data.orgId },
              { "user.id": data.actorUserId },
              { status: "active" },
              { role: { $in: ["org_admin", "instructor"] } },
            ],
          },
        },
      },
      organizations: { $: { where: { id: data.orgId } } },
    })) as {
      organizationMembers?: Array<{ id: string }>;
      organizations?: Array<{ billingStatus: BillingStatus }>;
    };

    if ((gate.organizationMembers ?? []).length === 0) {
      throw new Error("Only admins/instructors can assign courses.");
    }

    if (billingBlocksPrivilegedActions(gate.organizations?.[0]?.billingStatus)) {
      throw new Error("Billing status blocks course assignment.");
    }

    const existing = (await adminDb.query({
      courseEnrollments: {
        $: {
          where: {
            and: [
              { "course.id": data.courseId },
              { "member.id": data.memberId },
              { status: "active" },
            ],
          },
        },
      },
    })) as { courseEnrollments?: Array<{ id: string }> };

    if ((existing.courseEnrollments ?? []).length > 0) {
      return { ok: true };
    }

    const enrollmentId = id();
    await adminDb.transact(
      adminDb.tx.courseEnrollments[enrollmentId]
        .update({
          orgId: data.orgId,
          role: "learner",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ course: data.courseId, member: data.memberId }),
    );

    return { ok: true };
  });

const platformActorInput = z.object({
  actorUserId: z.string().min(1),
});

export const platformListOrganizations = createServerFn({ method: "POST" })
  .inputValidator(platformActorInput)
  .handler(async ({ data }) => {
    await assertPlatformOwner(data.actorUserId);

    const result = (await adminDb.query({
      organizations: {
        $: { order: { createdAt: "desc" } },
        memberships: { user: {} },
      },
    })) as {
      organizations?: Array<{
        id: string;
        name: string;
        slug: string;
        type: string;
        plan: string;
        billingStatus: BillingStatus;
        seatLimit: number;
        seatCount: number;
        memberships?: Array<{ id: string }>;
      }>;
    };

    return {
      organizations: (result.organizations ?? []).map((org) => ({
        ...org,
        memberCount: org.memberships?.length ?? 0,
      })),
    };
  });

const platformCreateOrgInput = z.object({
  actorUserId: z.string().min(1),
  name: z.string().min(2).max(120),
  type: z.string().min(2).max(40).default("school"),
  seatLimit: z.number().min(1).max(20000).default(100),
  plan: z.string().min(2).max(40).default("starter"),
  adminUserIds: z.array(z.string().min(1)).default([]),
  instructorUserIds: z.array(z.string().min(1)).default([]),
  adminUserEmails: z.array(z.string()).default([]),
  instructorUserEmails: z.array(z.string()).default([]),
});

export const platformCreateOrganizationWithAdmins = createServerFn({ method: "POST" })
  .inputValidator(platformCreateOrgInput)
  .handler(async ({ data }) => {
    await assertPlatformOwner(data.actorUserId);

    const now = Date.now();
    const orgId = id();
    const adminEmailResolutions = await Promise.all(
      data.adminUserEmails.map((email) => resolveOrProvisionUserByEmail(email)),
    );
    const instructorEmailResolutions = await Promise.all(
      data.instructorUserEmails.map((email) => resolveOrProvisionUserByEmail(email)),
    );
    const resolutionErrors = [...adminEmailResolutions, ...instructorEmailResolutions]
      .filter((result) => result.error)
      .map((result) => `${result.email}: ${result.error}`);

    const createdUsers = [...adminEmailResolutions, ...instructorEmailResolutions]
      .filter((result) => result.created)
      .map((result) => result.email);

    const adminResolvedUserIds = adminEmailResolutions
      .map((result) => result.userId)
      .filter(Boolean) as string[];
    const instructorResolvedUserIds = instructorEmailResolutions
      .map((result) => result.userId)
      .filter(Boolean) as string[];

    const adminIds = Array.from(new Set([...data.adminUserIds, ...adminResolvedUserIds]));
    const instructorIds = Array.from(new Set([...data.instructorUserIds, ...instructorResolvedUserIds]));
    const userIds = Array.from(new Set([...adminIds, ...instructorIds]));

    const usersById =
      userIds.length > 0
        ? ((await adminDb.query({
            $users: { $: { where: { id: { $in: userIds } } } },
          })) as { $users?: Array<{ id: string; email?: string }> })
        : ({ $users: [] } as { $users?: Array<{ id: string; email?: string }> });
    const knownUserIds = new Set((usersById.$users ?? []).map((user) => user.id));
    const unresolvedUserIds = userIds.filter((userId) => !knownUserIds.has(userId));
    if (unresolvedUserIds.length > 0) {
      resolutionErrors.push(...unresolvedUserIds.map((userId) => `${userId}: user does not exist`));
    }

    const finalUserIds = userIds.filter((userId) => knownUserIds.has(userId));
    const provisionedUserIds = new Set(
      [...adminEmailResolutions, ...instructorEmailResolutions]
        .filter((result) => result.created && result.userId)
        .map((result) => result.userId as string),
    );

    const tx: Array<any> = [
      adminDb.tx.organizations[orgId].update({
        name: data.name,
        slug: makeOrgSlug(data.name),
        type: data.type,
        plan: data.plan,
        billingStatus: "active",
        seatLimit: data.seatLimit,
        seatCount: 0,
        createdAt: now,
        updatedAt: now,
      }),
    ];

    const linkedMembers: string[] = [];
    const alreadyLinked: string[] = [];
    let seatCount = 0;
    for (const userId of finalUserIds) {
      const membershipId = id();
      const role: OrgRole = adminIds.includes(userId) ? "org_admin" : "instructor";
      const status: MemberStatus = provisionedUserIds.has(userId) ? "invited" : "active";
      if (status === "active" && !canActivateAnotherSeat(seatCount, data.seatLimit)) {
        resolutionErrors.push(`${userId}: seat limit reached`);
        continue;
      }
      tx.push(
        adminDb.tx.organizationMembers[membershipId]
          .update({ role, status, joinedAt: now })
          .link({ organization: orgId, user: userId }),
      );
      linkedMembers.push(userId);
      if (status === "active") {
        seatCount += 1;
        tx.push(adminDb.tx.$users[userId].update({ activeOrgId: orgId }));
      }
    }

    tx.push(adminDb.tx.organizations[orgId].update({ seatCount, updatedAt: now }));
    await adminDb.transact(tx);

    return { orgId, createdUsers, linkedMembers, alreadyLinked, errors: resolutionErrors };
  });

const platformInviteInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  targetUserId: z.string().min(1).optional(),
  targetUserEmail: z.string().optional(),
  role: z.enum(orgRoles),
  status: z.enum(memberStatuses).default("invited"),
}).refine((value) => value.targetUserId || value.targetUserEmail, {
  message: "Provide either targetUserId or targetUserEmail.",
});

export const platformInviteMember = createServerFn({ method: "POST" })
  .inputValidator(platformInviteInput)
  .handler(async ({ data }) => {
    await assertPlatformOwner(data.actorUserId);
    const createdUsers: string[] = [];
    const errors: string[] = [];
    let targetUserId = data.targetUserId;

    if (!targetUserId && data.targetUserEmail) {
      const resolved = await resolveOrProvisionUserByEmail(data.targetUserEmail);
      if (resolved.created) createdUsers.push(resolved.email);
      if (resolved.error) errors.push(`${resolved.email}: ${resolved.error}`);
      targetUserId = resolved.userId;
    }

    if (targetUserId && !data.targetUserEmail) {
      const targetUser = await getUserById(targetUserId);
      if (!targetUser) {
        errors.push(`${targetUserId}: user does not exist`);
        targetUserId = undefined;
      }
    }

    if (!targetUserId) {
      return { ok: false, createdUsers, linkedMembers: [], alreadyLinked: [], errors };
    }

    const orgRes = (await adminDb.query({
      organizations: { $: { where: { id: data.orgId } } },
    })) as { organizations?: Array<{ seatCount: number; seatLimit: number }> };
    const org = orgRes.organizations?.[0];
    if (!org) throw new Error("Organization not found.");

    const exists = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [{ "organization.id": data.orgId }, { "user.id": targetUserId }],
          },
        },
      },
    })) as { organizationMembers?: Array<{ id: string }> };
    if ((exists.organizationMembers ?? []).length > 0) {
      return { ok: true, createdUsers, linkedMembers: [], alreadyLinked: [targetUserId], errors };
    }
    if (data.status === "active" && !canActivateAnotherSeat(org.seatCount, org.seatLimit)) {
      return {
        ok: false,
        createdUsers,
        linkedMembers: [],
        alreadyLinked: [],
        errors: [...errors, "seat limit reached"],
      };
    }

    const finalStatus: MemberStatus =
      createdUsers.length > 0 && data.status === "active" ? "invited" : data.status;
    const tx: Array<any> = [
      adminDb.tx.organizationMembers[id()]
        .update({ role: data.role, status: finalStatus, joinedAt: Date.now() })
        .link({ organization: data.orgId, user: targetUserId }),
    ];
    if (finalStatus === "active") {
      tx.push(
        adminDb.tx.organizations[data.orgId].update({
          seatCount: org.seatCount + 1,
          updatedAt: Date.now(),
        }),
      );
    }
    await adminDb.transact(tx);
    return { ok: true, createdUsers, linkedMembers: [targetUserId], alreadyLinked: [], errors };
  });

const adminOverviewInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().optional(),
});

export const adminGetOrganizationOverview = createServerFn({ method: "POST" })
  .inputValidator(adminOverviewInput)
  .handler(async ({ data }) => {
    const user = await getUserById(data.actorUserId);
    const targetOrgId = data.orgId ?? user?.activeOrgId ?? NIL_UUID;
    if (targetOrgId === NIL_UUID) throw new Error("No active organization.");

    await assertOrgInstructorOrAdmin(data.actorUserId, targetOrgId);

    const result = (await adminDb.query({
      organizations: { $: { where: { id: targetOrgId } } },
      organizationMembers: {
        $: { where: { "organization.id": targetOrgId } },
        user: {},
      },
      courses: {
        $: {
          where: { and: [{ orgId: targetOrgId }, { kind: "template" }] },
          order: { updatedAt: "desc" },
        },
        subjects: { syllabusFile: {} },
      },
      courseSubjects: {
        $: { where: { orgId: targetOrgId }, order: { updatedAt: "desc" } },
        course: {},
        syllabusFile: {},
      },
      courseEnrollments: {
        $: { where: { orgId: targetOrgId } },
        course: {},
        member: { user: {} },
      },
    })) as {
      organizations?: Array<any>;
      organizationMembers?: Array<any>;
      courses?: Array<any>;
      courseSubjects?: Array<any>;
      courseEnrollments?: Array<any>;
    };

    return {
      organization: result.organizations?.[0] ?? null,
      members: result.organizationMembers ?? [],
      courses: result.courses ?? [],
      subjects: result.courseSubjects ?? [],
      enrollments: result.courseEnrollments ?? [],
    };
  });

const adminUpdateOrgInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  name: z.string().min(2).max(120),
  type: z.string().min(2).max(40),
  plan: z.string().min(2).max(40),
  seatLimit: z.number().min(1).max(20000),
  billingStatus: z.enum(billingStatuses),
});

export const adminUpdateOrganizationSettings = createServerFn({ method: "POST" })
  .inputValidator(adminUpdateOrgInput)
  .handler(async ({ data }) => {
    await assertOrgAdmin(data.actorUserId, data.orgId);

    const orgRes = (await adminDb.query({
      organizations: { $: { where: { id: data.orgId } } },
    })) as { organizations?: Array<{ seatCount: number }> };
    const org = orgRes.organizations?.[0];
    if (!org) throw new Error("Organization not found.");
    if (data.seatLimit < org.seatCount) {
      throw new Error("Seat limit cannot be below active seat count.");
    }

    await adminDb.transact(
      adminDb.tx.organizations[data.orgId].update({
        name: data.name,
        type: data.type,
        plan: data.plan,
        seatLimit: data.seatLimit,
        billingStatus: data.billingStatus,
        updatedAt: Date.now(),
      }),
    );
    return { ok: true };
  });

const adminInviteInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  targetUserId: z.string().min(1),
  role: z.enum(orgRoles),
  status: z.enum(memberStatuses).default("invited"),
});

export const adminInviteMember = createServerFn({ method: "POST" })
  .inputValidator(adminInviteInput)
  .handler(async ({ data }) => {
    await assertOrgInstructorOrAdmin(data.actorUserId, data.orgId);
    return addOrganizationMember({
      data: {
        actorUserId: data.actorUserId,
        orgId: data.orgId,
        targetUserId: data.targetUserId,
        role: data.role,
        status: data.status,
      },
    } as any);
  });

const adminAssignInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  courseId: z.string().min(1),
  memberId: z.string().min(1),
});

export const adminAssignCourse = createServerFn({ method: "POST" })
  .inputValidator(adminAssignInput)
  .handler(async ({ data }) => {
    await assertOrgInstructorOrAdmin(data.actorUserId, data.orgId);
    const memberCheck = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { id: data.memberId },
              { "organization.id": data.orgId },
              { role: "learner" },
              { status: "active" },
            ],
          },
        },
      },
      courses: {
        $: {
          where: {
            and: [{ id: data.courseId }, { orgId: data.orgId }, { kind: "template" }],
          },
        },
      },
    })) as {
      organizationMembers?: Array<{ id: string }>;
      courses?: Array<{ id: string }>;
    };

    if ((memberCheck.organizationMembers ?? []).length === 0) {
      throw new Error("Course can be assigned only to active learners.");
    }
    if ((memberCheck.courses ?? []).length === 0) {
      throw new Error("Only template courses can be assigned.");
    }

    return assignCourseToMember({
      data: {
        actorUserId: data.actorUserId,
        orgId: data.orgId,
        courseId: data.courseId,
        memberId: data.memberId,
      },
    } as any);
  });

const adminCreateTemplateInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  title: z.string().min(3).max(80),
  level: z.string().min(2).max(60),
  goal: z.string().min(8).max(500),
  weeklyTimeCommitment: z.enum(["2-4 hrs", "5-7 hrs", "8-10 hrs", "10+ hrs"]),
});

export const adminCreateCourseTemplate = createServerFn({ method: "POST" })
  .inputValidator(adminCreateTemplateInput)
  .handler(async ({ data }) => {
    await assertOrgInstructorOrAdmin(data.actorUserId, data.orgId);
    const now = Date.now();
    const courseId = id();
    await adminDb.transact(
      adminDb.tx.courses[courseId]
        .update({
          title: data.title,
          subject: "General",
          kind: "template",
          level: data.level,
          goal: data.goal,
          weeklyTimeCommitment: data.weeklyTimeCommitment,
          ownerId: data.actorUserId,
          orgId: data.orgId,
          createdAt: now,
          updatedAt: now,
        })
        .link({ owner: data.actorUserId, organization: data.orgId }),
    );
    return { courseId };
  });

const adminCreateSubjectInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  courseId: z.string().min(1),
  name: z.string().min(2).max(120),
});

export const adminCreateCourseSubject = createServerFn({ method: "POST" })
  .inputValidator(adminCreateSubjectInput)
  .handler(async ({ data }) => {
    await assertOrgInstructorOrAdmin(data.actorUserId, data.orgId);
    const course = (await adminDb.query({
      courses: {
        $: { where: { and: [{ id: data.courseId }, { orgId: data.orgId }, { kind: "template" }] } },
      },
    })) as { courses?: Array<{ id: string }> };
    if ((course.courses ?? []).length === 0) throw new Error("Template course not found.");

    const subjectId = id();
    const now = Date.now();
    await adminDb.transact(
      adminDb.tx.courseSubjects[subjectId]
        .update({ name: data.name, orgId: data.orgId, createdAt: now, updatedAt: now })
        .link({ course: data.courseId }),
    );
    return { subjectId };
  });

const adminUpdateSubjectInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  subjectId: z.string().min(1),
  name: z.string().min(2).max(120),
  syllabusText: z.string().max(100000).optional(),
  syllabusFileId: z.string().optional(),
});

export const adminUpdateCourseSubject = createServerFn({ method: "POST" })
  .inputValidator(adminUpdateSubjectInput)
  .handler(async ({ data }) => {
    await assertOrgInstructorOrAdmin(data.actorUserId, data.orgId);
    const tx = [
      adminDb.tx.courseSubjects[data.subjectId].update({
        name: data.name,
        syllabusText: data.syllabusText,
        updatedAt: Date.now(),
      }),
    ];

    if (data.syllabusFileId) {
      tx.push(adminDb.tx.courseSubjects[data.subjectId].link({ syllabusFile: data.syllabusFileId }));
    }
    await adminDb.transact(tx as any);
    return { ok: true };
  });

const createLearnerInstanceInput = z.object({
  actorUserId: z.string().min(1),
  orgId: z.string().min(1),
  templateCourseId: z.string().min(1),
  templateSubjectId: z.string().min(1),
  title: z.string().min(3).max(80),
  subject: z.string().min(2).max(120),
  level: z.string().min(2).max(60),
  goal: z.string().min(8).max(500),
  weeklyTimeCommitment: z.enum(["2-4 hrs", "5-7 hrs", "8-10 hrs", "10+ hrs"]),
  preferredLanguage: z.string().min(2).max(40),
  learningStyle: z.string().min(2).max(200),
  pace: z.string().min(2).max(40),
  strengths: z.string().min(2).max(500),
  weakAreas: z.string().min(2).max(500),
  targetOutcome: z.string().min(2).max(500).optional(),
});

export const createLearnerCourseInstance = createServerFn({ method: "POST" })
  .inputValidator(createLearnerInstanceInput)
  .handler(async ({ data }) => {
    const access = (await adminDb.query({
      organizationMembers: {
        $: {
          where: {
            and: [
              { "organization.id": data.orgId },
              { "user.id": data.actorUserId },
              { status: "active" },
              { role: "learner" },
            ],
          },
        },
      },
      courseEnrollments: {
        $: {
          where: {
            and: [
              { orgId: data.orgId },
              { status: "active" },
              { "course.id": data.templateCourseId },
              { "member.user.id": data.actorUserId },
            ],
          },
        },
      },
      courseSubjects: {
        $: {
          where: { and: [{ id: data.templateSubjectId }, { orgId: data.orgId }, { "course.id": data.templateCourseId }] },
        },
      },
    })) as {
      organizationMembers?: Array<{ id: string }>;
      courseEnrollments?: Array<{ id: string }>;
      courseSubjects?: Array<{ id: string }>;
    };
    if ((access.organizationMembers ?? []).length === 0) throw new Error("Only active learners can create personalized instances.");
    if ((access.courseEnrollments ?? []).length === 0) throw new Error("Template course is not assigned to this learner.");
    if ((access.courseSubjects ?? []).length === 0) throw new Error("Template subject not found.");

    const courseId = id();
    const now = Date.now();
    await adminDb.transact(
      adminDb.tx.courses[courseId]
        .update({
          title: data.title,
          subject: data.subject,
          kind: "learner_instance",
          templateCourseId: data.templateCourseId,
          templateSubjectId: data.templateSubjectId,
          level: data.level,
          goal: data.goal,
          weeklyTimeCommitment: data.weeklyTimeCommitment,
          preferredLanguage: data.preferredLanguage,
          learningStyle: data.learningStyle,
          pace: data.pace,
          strengths: data.strengths,
          weakAreas: data.weakAreas,
          targetOutcome: data.targetOutcome,
          language: data.preferredLanguage,
          ownerId: data.actorUserId,
          orgId: data.orgId,
          createdAt: now,
          updatedAt: now,
        })
        .link({ owner: data.actorUserId, organization: data.orgId }),
    );
    return { courseId };
  });
