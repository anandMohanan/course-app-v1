import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

export function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <div className="mb-1 mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
      <span>{label}</span>
      <span title={help} aria-label={help} className="inline-flex text-slate-500">
        <CircleHelp className="size-3.5" />
      </span>
    </div>
  );
}

export function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

export function WorkspaceStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

export function WorkflowStep({
  number,
  title,
  description,
  active,
}: {
  number: string;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 backdrop-blur-xl ${
        active
          ? "border-white/70 bg-white/70"
          : "border-slate-200/70 bg-white/35 opacity-75"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-2xl text-sm font-extrabold ${
            active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
          }`}
        >
          {number}
        </div>

        <div>
          <h3 className="font-extrabold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </article>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/45 p-5 text-center">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
