import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clientDb } from "@/lib/db";
import { ClipboardList, UploadCloud } from "lucide-react";
import type { FormEvent } from "react";
import { EmptyState, FieldLabel, SectionCard } from "./shared";
import type { AdminWorkspace } from "./useAdminWorkspace";

type CourseSubjectsCardProps = Pick<
  AdminWorkspace,
  | "auth"
  | "overview"
  | "load"
  | "handleError"
  | "createSubjectFn"
  | "updateSubjectFn"
  | "templates"
  | "subjects"
  | "selectedCourse"
  | "setSelectedCourse"
  | "selectedCourseName"
  | "subjectName"
  | "setSubjectName"
  | "editingSubjectId"
  | "setEditingSubjectId"
  | "editingSubjectText"
  | "setEditingSubjectText"
  | "editingSubjectPdfFileName"
  | "setEditingSubjectPdfFileName"
>;

export function CourseSubjectsCard({
  auth,
  overview,
  load,
  handleError,
  createSubjectFn,
  updateSubjectFn,
  templates,
  subjects,
  selectedCourse,
  setSelectedCourse,
  selectedCourseName,
  subjectName,
  setSubjectName,
  editingSubjectId,
  setEditingSubjectId,
  editingSubjectText,
  setEditingSubjectText,
  editingSubjectPdfFileName,
  setEditingSubjectPdfFileName,
}: CourseSubjectsCardProps) {
  return (
    <SectionCard
      icon={<ClipboardList className="size-5" />}
      title="Course Subjects"
      description="Choose a course, add subjects, and provide syllabus material for each subject."
    >
      <div className="mt-5 grid gap-4">
        <div>
          <FieldLabel
            label="Selected course"
            help="Choose the course whose subjects you want to manage."
          />

          {templates.length > 0 ? (
            <Select
              value={selectedCourse}
              onValueChange={(value) => {
                if (!value) return;
                setSelectedCourse(value);
                setEditingSubjectId("");
              }}
            >
              <SelectTrigger>
                <span
                  className={selectedCourseName ? undefined : "text-slate-500"}
                >
                  {selectedCourseName || "Choose course"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {templates.map((course: any) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <EmptyState
              title="No courses yet"
              description="Create your first course before adding subjects."
            />
          )}
        </div>

        {templates.length > 0 && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Current course
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                    {selectedCourseName || "No course selected"}
                  </h3>
                </div>

                <Badge variant="info">
                  {subjects.length}{" "}
                  {subjects.length === 1 ? "subject" : "subjects"}
                </Badge>
              </div>
            </div>

            <form
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white/45 p-4 sm:grid-cols-[1fr_auto]"
              onSubmit={async (event: FormEvent) => {
                event.preventDefault();

                if (
                  !auth.user ||
                  !overview?.organization?.id ||
                  !selectedCourse ||
                  !subjectName.trim()
                ) {
                  return;
                }

                try {
                  await createSubjectFn({
                    data: {
                      actorUserId: auth.user.id,
                      orgId: overview.organization.id,
                      courseId: selectedCourse,
                      name: subjectName,
                    },
                  });

                  setSubjectName("");
                  await load({ silent: true });
                } catch (caught) {
                  handleError(caught, "Could not create subject");
                }
              }}
            >
              <div>
                <FieldLabel
                  label="Add subject"
                  help="Add a subject under the selected course."
                />
                <Input
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder="Example: Microeconomics"
                  required
                />
              </div>

              <Button
                className="self-end"
                type="submit"
                variant="outline"
                disabled={!subjectName.trim()}
              >
                Add Subject
              </Button>
            </form>

            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Subjects in this course
              </p>

              {subjects.length > 0 ? (
                subjects.map((subject: any) => (
                  <button
                    key={subject.id}
                    className={`rounded-2xl border p-4 text-left transition hover:border-slate-400 hover:bg-white/70 ${
                      editingSubjectId === subject.id
                        ? "border-slate-900 bg-white/80"
                        : "border-slate-200 bg-white/45"
                    }`}
                    onClick={() => setEditingSubjectId(subject.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">
                          {subject.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {subject.syllabusText
                            ? "Syllabus text added"
                            : "No syllabus text yet"}
                        </div>
                      </div>

                      <Badge
                        variant={
                          subject.syllabusFile ? "success" : "outline"
                        }
                      >
                        {subject.syllabusFile ? "PDF attached" : "No PDF"}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="No subjects yet"
                  description="Add subjects to help structure this course for learners."
                />
              )}
            </div>

            {editingSubjectId && (
              <form
                className="grid gap-4 rounded-2xl border border-slate-200 bg-white/65 p-4"
                onSubmit={async (event: FormEvent) => {
                  event.preventDefault();

                  if (!auth.user || !overview?.organization?.id) return;

                  const current = subjects.find(
                    (subject: any) => subject.id === editingSubjectId,
                  );

                  if (!current) return;

                  try {
                    await updateSubjectFn({
                      data: {
                        actorUserId: auth.user.id,
                        orgId: overview.organization.id,
                        subjectId: editingSubjectId,
                        name: current.name,
                        syllabusText: editingSubjectText,
                      },
                    });

                    await load({ silent: true });
                  } catch (caught) {
                    handleError(caught, "Could not update syllabus");
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Edit subject syllabus
                    </p>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                      {
                        subjects.find(
                          (subject: any) => subject.id === editingSubjectId,
                        )?.name
                      }
                    </h3>
                  </div>

                  <Badge variant="info">Selected</Badge>
                </div>

                <div>
                  <FieldLabel
                    label="Syllabus text"
                    help="Paste official syllabus text used for personalization context."
                  />
                  <Textarea
                    value={editingSubjectText}
                    onChange={(event) =>
                      setEditingSubjectText(event.target.value)
                    }
                    placeholder="Paste the syllabus, learning outcomes, exam scope, or official subject outline."
                  />
                </div>

                <div>
                  <FieldLabel
                    label="Syllabus PDF"
                    help="Attach the official syllabus PDF. Text and PDF can both exist."
                  />

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
                          <UploadCloud className="size-5" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {editingSubjectPdfFileName
                              ? `Attached: ${editingSubjectPdfFileName}`
                              : "No PDF attached"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Upload an optional PDF syllabus.
                          </p>
                        </div>
                      </div>

                      <input
                        type="file"
                        accept="application/pdf"
                        className="text-xs text-slate-600"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];

                          if (
                            !file ||
                            !auth.user ||
                            !overview?.organization?.id
                          ) {
                            return;
                          }

                          try {
                            const uploadPath =
                              `orgs/${overview.organization.id}` +
                              `/subjects/${editingSubjectId}` +
                              `/${Date.now()}-${file.name}`;

                            const uploaded = await clientDb.storage.uploadFile(
                              uploadPath,
                              file,
                            );

                            await updateSubjectFn({
                              data: {
                                actorUserId: auth.user.id,
                                orgId: overview.organization.id,
                                subjectId: editingSubjectId,
                                name:
                                  subjects.find(
                                    (subject: any) =>
                                      subject.id === editingSubjectId,
                                  )?.name ?? "Subject",
                                syllabusText: editingSubjectText,
                                syllabusFileId: uploaded.data.id,
                              },
                            });

                            setEditingSubjectPdfFileName(file.name);
                            await load({ silent: true });
                          } catch (caught) {
                            handleError(
                              caught,
                              "Could not upload syllabus PDF",
                            );
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit">Save Subject</Button>
              </form>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
