import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientDb } from "@/lib/db";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, Mail, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

export const Route = createFileRoute("/login")({
  component: Login,
  ssr: false,
  loader: async () => {
    const auth = await clientDb.getAuth();
    if (auth) {
      throw redirect({ to: "/" });
    }
  },
});

function Login() {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const sendEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await clientDb.auth.sendMagicCode({ email });
      setStage("code");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginWithCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await clientDb.auth.signInWithMagicCode({ email, code });
      if (response.user) {
        navigate({ to: "/" });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="learning-shell flex min-h-[calc(100dvh-88px)] items-center justify-center px-4 py-10 text-slate-950">
      <section className="grid w-full max-w-6xl items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-10">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="absolute -bottom-28 left-14 size-80 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-100 ring-1 ring-white/15">
              Course studio
            </div>
            <h1 className="mt-8 max-w-2xl font-heading text-4xl font-black leading-[0.96] tracking-[-0.06em] sm:text-6xl">
              Learn with a workspace that stays out of the way.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Sign in with your email to continue building courses, lessons, and practice paths without passwords.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                [BookOpenCheck, "Course paths"],
                [Sparkles, "AI outlines"],
                [Mail, "Magic code"],
              ].map(([Icon, label]) => (
                <div key={label as string} className="rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
                  <Icon className="size-5 text-cyan-100" />
                  <div className="mt-3 text-sm font-bold text-white">{label as string}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white/78 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.05] backdrop-blur-2xl sm:p-8">
          <div className="flex h-full flex-col justify-center rounded-[1.5rem] bg-white/70 p-6 shadow-inner shadow-white/60 sm:p-8">
            <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-950">
              <Mail className="size-5" />
            </div>
            <h2 className="text-3xl font-black tracking-[-0.05em]">
              {stage === "email" ? "Enter your email" : "Enter magic code"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {stage === "email"
                ? "We will send a one-time sign-in code. No password required."
                : `We sent a code to ${email}.`}
            </p>

            {stage === "email" ? (
              <form className="mt-6 grid gap-4" onSubmit={sendEmail}>
                <Input
                  autoFocus
                  nativeInput
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@university.edu"
                />
                <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" type="submit" loading={isSubmitting}>
                  Send code <ArrowRight className="size-4" />
                </Button>
              </form>
            ) : (
              <form className="mt-6 grid gap-4" onSubmit={loginWithCode}>
                <Input
                  autoFocus
                  nativeInput
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                />
                <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" type="submit" loading={isSubmitting}>
                  Sign in <ArrowRight className="size-4" />
                </Button>
                <Button className="rounded-full" variant="ghost" onClick={() => setStage("email")}>
                  Use a different email
                </Button>
              </form>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-semibold text-rose-800">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
