import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clientDb } from "@/lib/db";
import { BookCopy, UploadCloud, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { EmptyState, FieldLabel, SectionCard } from "./shared";
import { useAdminWorkspaceContext } from "./admin-context";

export function AdminCourseDetailSection({ courseId }: { courseId: string }) {
  const workspace = useAdminWorkspaceContext();
  const {
    auth,
    overview,
    templates,
    assignableLearners,
    load,
    handleError,
    createSubjectFn,
    updateSubjectFn,
    assignFn,
  } = workspace;

  const [subjectName, setSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState("");
  const [editingSubjectText, setEditingSubjectText] = useState("");
  const [editingSubjectPdfFileName, setEditingSubjectPdfFileName] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState("");

  const course = useMemo(
    () => templates.find((row: any) => row.id === courseId) ?? null,
    [templates, courseId],
  );

  const subjects = course?.subjects ?? [];

  const enrollments = useMemo(
    () =>
      (overview?.enrollments ?? []).filter(
        (enrollment: any) => enrollment.course?.id === courseId,
      ),
    [overview?.enrollments, courseId],
  );

  if (!course) {
    return (
      <EmptyState
        title="Course not found"
        description="This course no longer exists or you do not have access to it."
      />
    );
  }

  const selectedSubject =
    subjects.find((subject: any) => subject.id === editingSubjectId) ?? null;

  return (
    <>
      <section className="glass-panel border border-white/70 bg-white/70 p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-slate-950">{course.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{course.goal}</p>
          </div>

          <div className="flex gap-2">
            <Badge variant="info">{subjects.length} subjects</Badge>
            <Badge variant="outline">{enrollments.length} assigned learners</Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <SectionCard
          icon={<BookCopy className="size-5" />}
          title="Subjects"
          description="Manage subjects and syllabus content for this course."
        >
          <form
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault();

              if (!auth.user || !overview?.organization?.id || !subjectName.trim()) {
                return;
              }

              try {
                await createSubjectFn({
                  data: {
                    actorUserId: auth.user.id,
                    orgId: overview.organization.id,
                    courseId,
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
              <FieldLabel label="Add subject" help="Add a subject to this course." />
              <Input
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="Example: Microeconomics"
                required
              />
            </div>

            <Button className="self-end" variant="outline" type="submit" disabled={!subjectName.trim()}>
              Add Subject
            </Button>
          </form>

          <div className="mt-5 grid gap-2">
            {subjects.length === 0 ? (
              <EmptyState
                title="No subjects yet"
                description="Add your first subject to structure this course."
              />
            ) : (
              subjects.map((subject: any) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    setEditingSubjectId(subject.id);
                    setEditingSubjectText(subject.syllabusText ?? "");
                    setEditingSubjectPdfFileName(subject.syllabusFile?.path ?? null);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white/55 p-4 text-left transition hover:border-slate-400"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{subject.name}</p>
                      <p className="text-xs text-slate-600">
                        {subject.syllabusText ? "Syllabus text added" : "No syllabus text yet"}
                      </p>
                    </div>

                    <Badge variant={subject.syllabusFile ? "success" : "outline"}>
                      {subject.syllabusFile ? "PDF attached" : "No PDF"}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={<Users className="size-5" />}
          title="Assigned Learners"
          description="View current assignments and add learners directly to this course."
        >
          <form
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={async (event: FormEvent) => {
              event.preventDefault();

              if (!auth.user || !overview?.organization?.id || !selectedMember) return;

              try {
                await assignFn({
                  data: {
                    actorUserId: auth.user.id,
                    orgId: overview.organization.id,
                    courseId,
                    memberId: selectedMember,
                  },
                });

                setSelectedMember("");
                await load({ silent: true });
              } catch (caught) {
                handleError(caught, "Could not assign course");
              }
            }}
          >
            <div>
              <FieldLabel
                label="Add learner"
                help="Assign this course to active or invited learners."
              />
              <Select value={selectedMember} onValueChange={(value) => value && setSelectedMember(value)}>
                <SelectTrigger>
                  <span className={selectedMember ? undefined : "text-slate-500"}>
                    {selectedMember
                      ? assignableLearners.find((row: any) => row.id === selectedMember)?.user?.email
                      : "Choose learner"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {assignableLearners.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user?.email ?? member.user?.id ?? member.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="self-end" type="submit" disabled={!selectedMember || assignableLearners.length === 0}>
              Assign Learner
            </Button>
          </form>

          {assignableLearners.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No assignable learners"
                description="Invite or activate learners first from Overview."
              />
            </div>
          ) : null}

          <div className="mt-4">
            {enrollments.length === 0 ? (
              <EmptyState
                title="No assigned learners"
                description="This course has no learner assignments yet."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        {enrollment.member?.user?.email ??
                          enrollment.member?.user?.id ??
                          enrollment.member?.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{enrollment.status ?? "active"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SectionCard>
      </div>

      <Sheet open={Boolean(selectedSubject)} onOpenChange={(open) => !open && setEditingSubjectId("") }>
        <SheetPopup side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedSubject?.name ?? "Subject details"}</SheetTitle>
          </SheetHeader>

          <SheetPanel>
            {selectedSubject ? (
              <form
                className="grid gap-4"
                onSubmit={async (event: FormEvent) => {
                  event.preventDefault();

                  if (!auth.user || !overview?.organization?.id) return;

                  try {
                    await updateSubjectFn({
                      data: {
                        actorUserId: auth.user.id,
                        orgId: overview.organization.id,
                        subjectId: selectedSubject.id,
                        name: selectedSubject.name,
                        syllabusText: editingSubjectText,
                      },
                    });

                    await load({ silent: true });
                  } catch (caught) {
                    handleError(caught, "Could not update syllabus");
                  }
                }}
              >
                <div>
                  <FieldLabel
                    label="Syllabus text"
                    help="Paste official syllabus text used for personalization context."
                  />
                  <Textarea
                    value={editingSubjectText}
                    onChange={(event) => setEditingSubjectText(event.target.value)}
                    placeholder="Paste syllabus, outcomes, and exam scope."
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
                          <p className="text-xs text-slate-500">Upload an optional PDF syllabus.</p>
                        </div>
                      </div>

                      <input
                        type="file"
                        accept="application/pdf"
                        className="text-xs text-slate-600"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];

                          if (!file || !auth.user || !overview?.organization?.id) {
                            return;
                          }

                          try {
                            const uploadPath =
                              `orgs/${overview.organization.id}` +
                              `/subjects/${selectedSubject.id}` +
                              `/${Date.now()}-${file.name}`;

                            const uploaded = await clientDb.storage.uploadFile(uploadPath, file);

                            await updateSubjectFn({
                              data: {
                                actorUserId: auth.user.id,
                                orgId: overview.organization.id,
                                subjectId: selectedSubject.id,
                                name: selectedSubject.name,
                                syllabusText: editingSubjectText,
                                syllabusFileId: uploaded.data.id,
                              },
                            });

                            setEditingSubjectPdfFileName(file.name);
                            await load({ silent: true });
                          } catch (caught) {
                            handleError(caught, "Could not upload syllabus PDF");
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit">Save Subject</Button>
              </form>
            ) : null}
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </>
  );
}
