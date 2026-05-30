import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardShell({ status }: { status: string }) {
  return (
    <main className="learning-shell flex min-h-[calc(100dvh-73px)] items-center justify-center px-4">
      <div className="glass-panel max-w-md p-8 text-center">
        <div className="mx-auto flex size-12 animate-pulse items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Sparkles className="size-5" />
        </div>
        <p className="mt-5 text-sm font-semibold text-slate-700">{status}</p>
      </div>
    </main>
  );
}

export function WizardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-800">
      {label}
      {children}
    </label>
  );
}
