import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, Users } from "lucide-react";
import { AdminHeader } from "./AdminHeader";
import { AdminWorkspaceProvider } from "./admin-context";
import { useAdminWorkspace } from "./useAdminWorkspace";

const navItems = [
  {
    to: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/admin",
  },
  {
    to: "/admin/courses",
    label: "Courses",
    icon: BookOpen,
    match: (pathname: string) => pathname.startsWith("/admin/courses"),
  },
  {
    to: "/admin/learners",
    label: "Learners",
    icon: Users,
    match: (pathname: string) => pathname.startsWith("/admin/learners"),
  },
] as const;

export function AdminLayout() {
  const workspace = useAdminWorkspace();
  const { auth, loading, canManage, refreshing, error, learners, templates, totalSubjects } =
    workspace;
  const location = useLocation();

  if (auth.isLoading || loading) {
    return <main className="learning-shell p-6">Loading admin workspace...</main>;
  }

  if (!canManage) {
    return (
      <main className="learning-shell p-6">
        Only instructors and admins can manage this workspace.
      </main>
    );
  }

  return (
    <AdminWorkspaceProvider value={workspace}>
      <main className="learning-shell relative min-h-[calc(100dvh-73px)] overflow-hidden p-4 sm:p-6 lg:p-8">
        <section className="mx-auto grid max-w-7xl gap-6">
          <AdminHeader
            refreshing={refreshing}
            error={error}
            courseCount={templates.length}
            subjectCount={totalSubjects}
            learnerCount={learners.length}
          />

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="glass-panel h-fit rounded-3xl border border-white/70 bg-white/70 p-3 backdrop-blur-xl">
              <nav className="grid gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.match(location.pathname);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white/80"
                      }`}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <div className="grid gap-6">
              <Outlet />
            </div>
          </div>
        </section>
      </main>
    </AdminWorkspaceProvider>
  );
}
