import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLearnerCourseInstance } from "@/lib/org";
import {
  type CourseWizardInput,
  generateCourseOutline,
} from "@/lib/learningAi";
import { useServerFn } from "@tanstack/react-start";
import { Layers3 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { WizardField } from "./shared";
import { defaultWizard } from "./types";
import { persistCourse } from "./utils";

type CourseWizardProps = {
  ownerId: string;
  orgId: string | null;
  createLearnerInstanceFn: ReturnType<
    typeof useServerFn<typeof createLearnerCourseInstance>
  >;
  templateCourses: Array<any>;
  onClose: () => void;
  onCreated: (courseId: string, lessonId: string) => void;
};

export function CourseWizard({
  ownerId,
  orgId,
  createLearnerInstanceFn,
  templateCourses,
  onClose,
  onCreated,
}: CourseWizardProps) {
  const defaultGoal =
    "Build clear understanding of fundamentals and apply them step by step.";
  const defaultWeeklyTimeCommitment: CourseWizardInput["weeklyTimeCommitment"] =
    "5-7 hrs";
  const generateOutline = useServerFn(generateCourseOutline);
  const [form, setForm] = useState<CourseWizardInput>(defaultWizard);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const update = (
    field: keyof CourseWizardInput,
    value: CourseWizardInput[keyof CourseWizardInput],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsGenerating(true);
    console.info("[CourseWizard] submit:start", {
      ownerId,
      orgId,
      step,
      form,
    });

    try {
      const template = templateCourses.find(
        (course) => course.id === selectedTemplateId,
      );
      const subject = template?.subjects?.find(
        (item: any) => item.id === selectedSubjectId,
      );
      if (!template || !subject || !orgId) {
        throw new Error("Pick template course and subject first.");
      }
      const derivedTitle = `${template.title} - ${subject.name}`;
      const outlineInput: CourseWizardInput = {
        ...form,
        title: derivedTitle,
        goal: defaultGoal,
        weeklyTimeCommitment: defaultWeeklyTimeCommitment,
      };
      console.info("[CourseWizard] submit:inputs", {
        selectedTemplateId,
        selectedSubjectId,
        template: {
          id: template.id,
          title: template.title,
        },
        subject: {
          id: subject.id,
          name: subject.name,
          hasSyllabusPdf: Boolean(subject.syllabusFile),
          syllabusTextLength: subject.syllabusText?.length ?? 0,
          syllabusTextPreview: (subject.syllabusText ?? "").slice(0, 300),
        },
        outlineInput,
      });
      const instance = await createLearnerInstanceFn({
        data: {
          actorUserId: ownerId,
          orgId,
          templateCourseId: template.id,
          templateSubjectId: subject.id,
          title: derivedTitle,
          subject: subject.name,
          level: form.level,
          goal: defaultGoal,
          weeklyTimeCommitment: defaultWeeklyTimeCommitment,
          preferredLanguage: form.preferredLanguage ?? "English",
          learningStyle:
            form.learningStyle ?? "Visual examples and hands-on practice",
          pace: form.pace ?? "Balanced",
          strengths: form.strengths ?? "",
          weakAreas: form.weakAreas ?? "",
        },
      });
      console.info("[CourseWizard] submit:instance-created", instance);
      const outline = await generateOutline({
        data: outlineInput,
      });
      console.info("[CourseWizard] submit:outline-generated", {
        moduleCount: outline.modules.length,
        lessonCount: outline.modules.reduce(
          (count, module) => count + module.lessons.length,
          0,
        ),
      });
      const ids = persistCourse(instance.courseId, orgId, form, outline);
      console.info("[CourseWizard] submit:persisted", ids);
      onCreated(ids.courseId, ids.firstLessonId);
    } catch (caught) {
      console.error("[CourseWizard] submit:error", caught);
      setError(
        caught instanceof Error ? caught.message : "Could not create course",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedTemplate = templateCourses.find(
    (course) => course.id === selectedTemplateId,
  );
  const subjectOptions = selectedTemplate?.subjects ?? [];
  const selectedSubject = subjectOptions.find(
    (subject: any) => subject.id === selectedSubjectId,
  );
  const isStepOneReady = !!selectedTemplate && !!selectedSubject;
  const isStepTwoReady =
    ["Beginner", "Intermediate", "Advanced"].includes(form.level) &&
    (form.preferredLanguage ?? "").trim().length >= 2 &&
    (form.learningStyle ?? "").trim().length >= 2 &&
    (form.pace ?? "").trim().length >= 2 &&
    (form.strengths ?? "").trim().length >= 2 &&
    (form.weakAreas ?? "").trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-xl">
      <form
        className="glass-panel max-h-[92dvh] w-full max-w-3xl overflow-auto p-6 sm:p-8"
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-800">
              Guided course wizard
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">
              Design your learning path
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Two quick steps to generate a focused personalized course.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Close
          </Button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div
            className={
              step === 1
                ? "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-white"
                : "rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-slate-700"
            }
          >
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">
              Step 1
            </p>
            <p className="mt-1 text-sm font-bold">Course selection</p>
          </div>
          <div
            className={
              step === 2
                ? "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-white"
                : "rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-slate-700"
            }
          >
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em]">
              Step 2
            </p>
            <p className="mt-1 text-sm font-bold">Personalization profile</p>
          </div>
        </div>

        {step === 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <WizardField label="Template course">
              <Select
                value={selectedTemplateId}
                onValueChange={(value) => value && setSelectedTemplateId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick course template">
                    {selectedTemplate?.title ?? "Pick course template"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {templateCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WizardField>
            <WizardField label="Subject">
              <Select
                value={selectedSubjectId}
                onValueChange={(value) => value && setSelectedSubjectId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick subject">
                    {selectedSubject?.name ?? "Pick subject"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WizardField>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <WizardField label="Level">
              <Select
                value={form.level}
                onValueChange={(value) =>
                  update("level", value as CourseWizardInput["level"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick level">
                    {form.level}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </WizardField>
            <WizardField label="Preferred language">
              <Input
                value={form.preferredLanguage ?? ""}
                onChange={(event) =>
                  update("preferredLanguage", event.target.value)
                }
                required
              />
            </WizardField>
            <WizardField label="Preferred learning style">
              <Input
                value={form.learningStyle ?? ""}
                onChange={(event) =>
                  update("learningStyle", event.target.value)
                }
                required
              />
            </WizardField>
            <WizardField label="Pace">
              <Input
                value={form.pace ?? ""}
                onChange={(event) => update("pace", event.target.value)}
                required
              />
            </WizardField>
            <WizardField label="Strengths">
              <Textarea
                value={form.strengths ?? ""}
                onChange={(event) => update("strengths", event.target.value)}
                required
              />
            </WizardField>
            <WizardField label="Weak areas">
              <Textarea
                value={form.weakAreas ?? ""}
                onChange={(event) => update("weakAreas", event.target.value)}
                required
              />
            </WizardField>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/35 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Layers3 className="size-4" /> AI will generate modules, lessons, and
            practice prompts.
          </div>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setStep(1)}
                disabled={isGenerating}
              >
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button
                type="button"
                className="rounded-full bg-slate-950 text-white"
                onClick={() => {
                  const template = templateCourses.find(
                    (course) => course.id === selectedTemplateId,
                  );
                  const subject = template?.subjects?.find(
                    (item: any) => item.id === selectedSubjectId,
                  );
                  if (template && subject) {
                    update("subject", subject.name);
                    update("templateTitle", template.title);
                    update("templateSubjectName", subject.name);
                    update("syllabusText", subject.syllabusText ?? "");
                    update("hasSyllabusPdf", Boolean(subject.syllabusFile));
                  }
                  setStep(2);
                }}
                disabled={!isStepOneReady}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="rounded-full bg-slate-950 text-white"
                type="submit"
                loading={isGenerating}
                disabled={isGenerating || !isStepTwoReady}
              >
                {isGenerating ? "Generating" : "Generate course"}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
