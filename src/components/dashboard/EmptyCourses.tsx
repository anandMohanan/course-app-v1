import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap } from "lucide-react";

type EmptyCoursesProps = {
  onCreate: () => void;
  disabled?: boolean;
};

export function EmptyCourses({ onCreate, disabled }: EmptyCoursesProps) {
  return (
    <section className="glass-panel flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-cyan-300/50 text-cyan-950 shadow-2xl shadow-cyan-900/10">
        <GraduationCap className="size-8" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold tracking-[-0.035em]">
        Create your first course
      </h2>
      <p className="mt-3 max-w-xl text-slate-700">
        Start with any subject. The app will generate modules, personalized
        lessons, and a practice notebook tailored to your goal.
      </p>
      <Button
        className="mt-7 rounded-full bg-slate-950 text-white"
        onClick={onCreate}
        disabled={disabled}
      >
        Build with AI <ArrowRight />
      </Button>
    </section>
  );
}
