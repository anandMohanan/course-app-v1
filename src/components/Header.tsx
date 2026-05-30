import { Button } from "@/components/ui/button";
import { clientDb } from "@/lib/db";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LogOut } from "lucide-react";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export default function Header() {
  const auth = clientDb.useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLearningWorkspace = pathname.startsWith("/courses/") && pathname.includes("/lessons/");
  const activeOrgId =
    (auth.user as { activeOrgId?: string } | undefined)?.activeOrgId ?? null;
  const { data } = clientDb.useQuery(
    activeOrgId
      ? {
          organizations: {
            $: { where: { id: activeOrgId } },
          },
        }
      : { organizations: { $: { where: { id: NIL_UUID } } } },
  );
  const activeOrgName = (data?.organizations as Array<{ name: string }> | undefined)?.[0]?.name;

  if (isLearningWorkspace) {
    return null;
  }

  const signOut = () => {
    clientDb.auth.signOut().then(() => {
      navigate({ to: "/login" });
    });
  };

  return (
    <header className="sticky top-0 z-40 px-4 py-4 text-slate-950 sm:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 rounded-full bg-white/52 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-white/70 backdrop-blur-2xl sm:px-5">
        <button className="group flex items-center gap-3" type="button" onClick={() => navigate({ to: "/" })}>
          <span className="flex size-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition-transform duration-200 group-hover:scale-105">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-black leading-4 tracking-[-0.035em]">NeuroLearn</span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">Course Studio</span>
          </span>
        </button>
        {auth.user && (
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[260px] truncate text-sm font-semibold text-slate-700 sm:block">
              {auth.user.email ?? "Student"}
            </span>
            {activeOrgName && (
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 md:block">
                {activeOrgName}
              </span>
            )}
            <Button className="rounded-full bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
