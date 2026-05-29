import { Layers3 } from "lucide-react";

export function WorkspaceStatus({ status }: { status: string }) {
  return (
    <main className="learning-shell flex min-h-dvh items-center justify-center px-4">
      <div className="glass-panel max-w-md p-8 text-center">
        <Layers3 className="mx-auto size-8" />
        <p className="mt-4 text-sm font-medium text-slate-700">{status}</p>
      </div>
    </main>
  );
}
