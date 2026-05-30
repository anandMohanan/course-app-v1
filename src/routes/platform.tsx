import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientDb } from "@/lib/db";
import {
  OrgRole,
  platformCreateOrganizationWithAdmins,
  platformInviteMember,
  platformListOrganizations,
} from "@/lib/org";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FormEvent, useEffect, useState } from "react";

const ORG_TYPES = ["school", "university", "academy", "enterprise"] as const;
const ORG_PLANS = ["starter", "growth", "pro", "enterprise"] as const;
const SEAT_LIMIT_OPTIONS = ["50", "100", "250", "500", "1000"] as const;

export const Route = createFileRoute("/platform")({
  component: PlatformOwnerPage,
  loader: async () => {
    const auth = await clientDb.getAuth();
    if (!auth) throw redirect({ to: "/login" });
  },
  ssr: false,
});

function PlatformOwnerPage() {
  const auth = clientDb.useAuth();
  const listOrgsFn = useServerFn(platformListOrganizations);
  const createOrgFn = useServerFn(platformCreateOrganizationWithAdmins);
  const inviteFn = useServerFn(platformInviteMember);

  const [organizations, setOrganizations] = useState<Array<any>>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("school");
  const [orgPlan, setOrgPlan] = useState("starter");
  const [seatLimit, setSeatLimit] = useState("100");
  const [adminUserEmails, setAdminUserEmails] = useState("");
  const [instructorUserEmails, setInstructorUserEmails] = useState("");

  const [inviteOrgId, setInviteOrgId] = useState("");
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("instructor");
  const [inviteStatus, setInviteStatus] = useState<"invited" | "active">("invited");
  const selectedInviteOrg = organizations.find((org) => org.id === inviteOrgId);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!auth.user) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await listOrgsFn({ data: { actorUserId: auth.user.id } });
      setOrganizations(res.organizations ?? []);
      if (!inviteOrgId && res.organizations?.[0]?.id) setInviteOrgId(res.organizations[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load organizations");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [auth.user]);

  if (auth.isLoading || loading) {
    return <main className="learning-shell p-6">Loading platform console...</main>;
  }

  return (
    <main className="learning-shell relative min-h-[calc(100dvh-73px)] overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-white/80 to-slate-100/90" />
      </div>
      <section className="mx-auto grid max-w-7xl gap-6">
        <div className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
          <h1 className="text-3xl font-extrabold tracking-[-0.035em]">Platform Owner Console</h1>
          <p className="mt-2 text-sm text-slate-700">
            Create and manage organizations, seed initial admins, and invite members in one place.
          </p>
          {refreshing && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Refreshing data...</p>}
          {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
          {resultSummary && <p className="mt-2 text-sm font-semibold text-emerald-700">{resultSummary}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-extrabold">Create Organization</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault();
                if (!auth.user) return;
                setError(null);
                setResultSummary(null);
                setCreateSubmitting(true);
                try {
                  const result = await createOrgFn({
                    data: {
                      actorUserId: auth.user.id,
                      name: orgName,
                      type: orgType,
                      plan: orgPlan,
                      seatLimit: Number(seatLimit),
                      adminUserEmails: adminUserEmails.split(",").map((v) => v.trim()).filter(Boolean),
                      instructorUserEmails: instructorUserEmails.split(",").map((v) => v.trim()).filter(Boolean),
                    },
                  });
                  setOrgName("");
                  setAdminUserEmails("");
                  setInstructorUserEmails("");
                  setResultSummary(
                    `Created users: ${result.createdUsers.length} · Linked members: ${result.linkedMembers.length} · Skipped: ${result.errors.length}`,
                  );
                  if (result.errors.length > 0) {
                    setError(result.errors.join(", "));
                  }
                  await load({ silent: true });
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Could not create organization");
                } finally {
                  setCreateSubmitting(false);
                }
              }}
            >
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Organization Name</label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Learning" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Organization Type</label>
                  <Select value={orgType} onValueChange={(value) => value && setOrgType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Plan</label>
                  <Select value={orgPlan} onValueChange={(value) => value && setOrgPlan(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_PLANS.map((plan) => (
                        <SelectItem key={plan} value={plan}>
                          {plan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Seat Limit</label>
                  <Select value={seatLimit} onValueChange={(value) => value && setSeatLimit(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seat limit" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEAT_LIMIT_OPTIONS.map((limit) => (
                        <SelectItem key={limit} value={limit}>
                          {limit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Admin Emails</label>
                <Input
                  value={adminUserEmails}
                  onChange={(e) => setAdminUserEmails(e.target.value)}
                  placeholder="admin@acme.com, owner@acme.com"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Instructor Emails</label>
                <Input
                  value={instructorUserEmails}
                  onChange={(e) => setInstructorUserEmails(e.target.value)}
                  placeholder="instructor1@acme.com, instructor2@acme.com"
                />
              </div>
              <Button type="submit" loading={createSubmitting} disabled={createSubmitting || inviteSubmitting}>
                Create Tenant
              </Button>
            </form>
          </section>

          <section className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-extrabold">Invite / Attach Member</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault();
                if (!auth.user) return;
                setError(null);
                setResultSummary(null);
                setInviteSubmitting(true);
                try {
                  const result = await inviteFn({
                    data: {
                      actorUserId: auth.user.id,
                      orgId: inviteOrgId,
                      targetUserEmail: targetUserEmail.trim().toLowerCase(),
                      role: inviteRole,
                      status: inviteStatus,
                    },
                  });
                  setTargetUserEmail("");
                  setResultSummary(
                    `Created users: ${result.createdUsers.length} · Linked members: ${result.linkedMembers.length} · Already linked: ${result.alreadyLinked.length} · Errors: ${result.errors.length}`,
                  );
                  if (result.errors.length > 0) {
                    setError(result.errors.join(", "));
                  }
                  await load({ silent: true });
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Could not invite member");
                } finally {
                  setInviteSubmitting(false);
                }
              }}
            >
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Organization</label>
                <Select value={inviteOrgId} onValueChange={(value) => value && setInviteOrgId(value)}>
                  <SelectTrigger>
                    <span className="truncate text-sm">
                      {selectedInviteOrg?.name ?? "Select organization"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">Target User Email</label>
                <Input
                  value={targetUserEmail}
                  onChange={(e) => setTargetUserEmail(e.target.value)}
                  placeholder="member@acme.com"
                  type="email"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <Select value={inviteRole} onValueChange={(value) => value && setInviteRole(value as OrgRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org_admin">org_admin</SelectItem>
                      <SelectItem value="instructor">instructor</SelectItem>
                      <SelectItem value="learner">learner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select value={inviteStatus} onValueChange={(value) => value && setInviteStatus(value as "invited" | "active")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invited">invited</SelectItem>
                      <SelectItem value="active">active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                loading={inviteSubmitting}
                disabled={!inviteOrgId || inviteSubmitting || createSubmitting}
              >
                Invite Member
              </Button>
            </form>
          </section>
        </div>

        <section className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-extrabold">Organizations</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <article
                key={org.id}
                className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/55 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/65 via-white/20 to-sky-100/30" />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-extrabold">{org.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{org.slug}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge variant="info">{org.type}</Badge>
                    <Badge variant="secondary">{org.plan}</Badge>
                    <Badge variant={org.billingStatus === "active" ? "success" : "warning"}>
                      {org.billingStatus}
                    </Badge>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/70 bg-white/60 p-2 text-center backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seats</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-800">{org.seatCount}/{org.seatLimit}</p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/60 p-2 text-center backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Members</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-800">{org.memberCount}</p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/60 p-2 text-center backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Usage</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-800">
                      {Math.min(100, Math.round((org.seatCount / Math.max(1, org.seatLimit)) * 100))}%
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
