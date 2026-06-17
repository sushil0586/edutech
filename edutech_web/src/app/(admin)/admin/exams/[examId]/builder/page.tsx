import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { BuilderRapidAttach } from "@/components/ui/builder-rapid-attach";
import { BuilderTabs } from "@/components/ui/builder-tabs";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { fetchTeacherExamDetail } from "@/lib/api/teacher";
import {
  assignTeacherExamStudents,
  createTeacherExamQuestion,
  createTeacherExamSection,
  deleteTeacherExamQuestion,
  deleteTeacherExamSection,
  fetchTeacherAcademicYears,
  fetchTeacherCohorts,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestions,
  fetchTeacherStudents,
  fetchTeacherSubjects,
  fetchTeacherTopics,
  updateTeacherExamQuestion,
  updateTeacherExamBuilder,
  updateTeacherStudent,
} from "@/lib/api/teacher-builder";
import { requirePlatformAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

function isChecked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function asNullableValue(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue ? stringValue : null;
}

function asIsoDateTime(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  if (!stringValue) return null;
  return new Date(stringValue).toISOString();
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

async function upsertTeacherExamQuestionLink(payload: {
  examId: string;
  questionId: string;
  section: string | null;
  questionOrder: number;
  marks: string | null;
  negativeMarks: string | null;
  isMandatory: boolean;
}) {
  try {
    await createTeacherExamQuestion({
      exam: payload.examId,
      question: payload.questionId,
      section: payload.section,
      question_order: payload.questionOrder,
      marks: payload.marks,
      negative_marks: payload.negativeMarks,
      is_mandatory: payload.isMandatory,
    });
    return;
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "";
    const looksLikeExistingPairConflict =
      message.includes("fields exam, question must make a unique set") ||
      message.includes("unique_exam_question_pair");

    if (!looksLikeExistingPairConflict) {
      throw error;
    }
  }

  const detail = await fetchTeacherExamDetail(payload.examId);
  const existingLink = detail.exam_questions.find((link) => link.question === payload.questionId);

  if (!existingLink) {
    throw new Error("An existing exam-question link was expected but could not be found.");
  }

  await updateTeacherExamQuestion(existingLink.id, {
    section: payload.section,
    question_order: payload.questionOrder,
    marks: payload.marks,
    negative_marks: payload.negativeMarks,
    is_mandatory: payload.isMandatory,
    is_active: true,
  });
}

async function updateExamSettingsAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  try {
    await updateTeacherExamBuilder(examId, {
      academic_year: String(formData.get("academic_year") ?? "").trim(),
      program: String(formData.get("program") ?? "").trim(),
      cohort: asNullableValue(formData.get("cohort")),
      subject: asNullableValue(formData.get("subject")),
      title: String(formData.get("title") ?? "").trim(),
      code: String(formData.get("code") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      exam_type: String(formData.get("exam_type") ?? "").trim(),
      delivery_mode: String(formData.get("delivery_mode") ?? "").trim(),
      duration_minutes: Number(formData.get("duration_minutes") ?? 0),
      total_marks: String(formData.get("total_marks") ?? "0").trim() || "0",
      passing_marks: String(formData.get("passing_marks") ?? "0").trim() || "0",
      start_at: asIsoDateTime(formData.get("start_at")),
      end_at: asIsoDateTime(formData.get("end_at")),
      instructions: String(formData.get("instructions") ?? "").trim(),
      allow_late_submit: isChecked(formData, "allow_late_submit"),
      randomize_questions: isChecked(formData, "randomize_questions"),
      randomize_options: isChecked(formData, "randomize_options"),
      show_result_immediately: isChecked(formData, "show_result_immediately"),
      allow_review_after_submit: isChecked(formData, "allow_review_after_submit"),
      max_attempts: Number(formData.get("max_attempts") ?? 1),
      timer_mode: String(formData.get("timer_mode") ?? "").trim(),
      navigation_mode: String(formData.get("navigation_mode") ?? "").trim(),
      attempt_policy: String(formData.get("attempt_policy") ?? "").trim(),
      result_publish_mode: String(formData.get("result_publish_mode") ?? "").trim(),
      review_mode: String(formData.get("review_mode") ?? "").trim(),
      security_mode: String(formData.get("security_mode") ?? "").trim(),
      allow_resume: isChecked(formData, "allow_resume"),
      allow_section_switching: isChecked(formData, "allow_section_switching"),
      allow_return_to_previous_section: isChecked(formData, "allow_return_to_previous_section"),
      result_publish_at: asIsoDateTime(formData.get("result_publish_at")),
      review_available_from: asIsoDateTime(formData.get("review_available_from")),
      review_available_until: asIsoDateTime(formData.get("review_available_until")),
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update exam settings right now.";
    redirect(`/admin/exams/${examId}/builder?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?message=${encodeURIComponent("Exam settings updated.")}`);
}

async function addSectionAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  try {
    await createTeacherExamSection({
      exam: examId,
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      section_order: Number(formData.get("section_order") ?? 1),
      instructions: String(formData.get("instructions") ?? "").trim(),
      total_questions: Number(formData.get("total_questions") ?? 0),
      marks_per_question: asNullableValue(formData.get("marks_per_question")),
      negative_marks_per_question: asNullableValue(formData.get("negative_marks_per_question")),
      timer_enabled: isChecked(formData, "timer_enabled"),
      duration_minutes: isChecked(formData, "timer_enabled")
        ? Number(formData.get("duration_minutes") ?? 0)
        : null,
      allow_skip_section: isChecked(formData, "allow_skip_section"),
      lock_after_submit: isChecked(formData, "lock_after_submit"),
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to add the section right now.";
    redirect(`/admin/exams/${examId}/builder?tab=sections&error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?tab=sections&message=${encodeURIComponent("Section added.")}`);
}

async function deleteSectionAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  if (!examId || !sectionId) return;

  try {
    await deleteTeacherExamSection(sectionId);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to remove the section right now.";
    redirect(`/admin/exams/${examId}/builder?tab=sections&error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?tab=sections&message=${encodeURIComponent("Section removed.")}`);
}

async function addQuestionLinkAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  try {
    await upsertTeacherExamQuestionLink({
      examId,
      questionId: String(formData.get("question") ?? "").trim(),
      section: asNullableValue(formData.get("section")),
      questionOrder: Number(formData.get("question_order") ?? 1),
      marks: asNullableValue(formData.get("marks")),
      negativeMarks: asNullableValue(formData.get("negative_marks")),
      isMandatory: isChecked(formData, "is_mandatory"),
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to link the question right now.";
    redirect(`/admin/exams/${examId}/builder?tab=questions&error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?tab=questions&message=${encodeURIComponent("Question linked to exam.")}`);
}

async function bulkAddQuestionLinksAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const questionIds = formData
    .getAll("question_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!examId) return;

  if (!questionIds.length) {
    redirect(`/admin/exams/${examId}/builder?tab=questions&error=${encodeURIComponent("Select at least one question to attach.")}`);
  }

  try {
    const section = asNullableValue(formData.get("section"));
    const baseOrder = Number(formData.get("question_order") ?? 1);
    const isMandatory = isChecked(formData, "is_mandatory");

    for (const [index, questionId] of questionIds.entries()) {
      await upsertTeacherExamQuestionLink({
        examId,
        questionId,
        section,
        questionOrder: baseOrder + index,
        marks: null,
        negativeMarks: null,
        isMandatory,
      });
    }
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to bulk link questions right now.";
    redirect(`/admin/exams/${examId}/builder?tab=questions&error=${encodeURIComponent(message)}`);
  }

  redirect(
    `/admin/exams/${examId}/builder?tab=questions&message=${encodeURIComponent(
      `${questionIds.length} question${questionIds.length === 1 ? "" : "s"} linked to exam.`,
    )}`,
  );
}

async function deleteQuestionLinkAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const examQuestionId = String(formData.get("exam_question_id") ?? "");
  if (!examId || !examQuestionId) return;

  try {
    await deleteTeacherExamQuestion(examQuestionId);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to remove the linked question right now.";
    redirect(`/admin/exams/${examId}/builder?tab=questions&error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?tab=questions&message=${encodeURIComponent("Linked question removed.")}`);
}

async function updateQuestionLinkAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const examQuestionId = String(formData.get("exam_question_id") ?? "");
  if (!examId || !examQuestionId) return;

  try {
    await updateTeacherExamQuestion(examQuestionId, {
      section: asNullableValue(formData.get("section")),
      question_order: Number(formData.get("question_order") ?? 1),
      marks: asNullableValue(formData.get("marks")),
      negative_marks: asNullableValue(formData.get("negative_marks")),
      is_mandatory: isChecked(formData, "is_mandatory"),
      is_active: true,
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update the linked question right now.";
    redirect(`/admin/exams/${examId}/builder?tab=questions&error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?tab=questions&message=${encodeURIComponent("Linked question updated.")}`);
}

async function updateAssignmentsAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  try {
    await requirePlatformAdminSession();
    const studentIds = formData.getAll("student_ids").map((value) => String(value));
    await assignTeacherExamStudents(examId, {
      assignment_mode: String(formData.get("assignment_mode") ?? "scope"),
      student_ids: studentIds,
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update student assignment right now.";
    redirect(`/admin/exams/${examId}/builder?tab=assignment&error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/exams/${examId}/builder?tab=assignment&message=${encodeURIComponent("Student assignment updated.")}`);
}

async function updateStudentAccommodationAction(formData: FormData) {
  "use server";

  const examId = String(formData.get("exam_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!examId || !studentId) return;

  const extraTimeMinutes = Math.max(
    Number.parseInt(String(formData.get("extra_time_minutes") ?? "0"), 10) || 0,
    0,
  );
  const extraTimePercentage = Math.max(
    Number.parseInt(String(formData.get("extra_time_percentage") ?? "0"), 10) || 0,
    0,
  );
  const additionalViolationAllowance = Math.max(
    Number.parseInt(
      String(formData.get("additional_violation_allowance") ?? "0"),
      10,
    ) || 0,
    0,
  );

  try {
    await updateTeacherStudent(studentId, {
      accommodation_profile: {
        extra_time_minutes: extraTimeMinutes,
        extra_time_percentage: extraTimePercentage,
        additional_violation_allowance: additionalViolationAllowance,
        simplified_warning_copy: isChecked(formData, "simplified_warning_copy"),
        alternative_instructions: String(
          formData.get("alternative_instructions") ?? "",
        ).trim(),
        notes: String(formData.get("notes") ?? "").trim(),
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to update student accommodation support.";
    redirect(`/admin/exams/${examId}/builder?tab=assignment&error=${encodeURIComponent(message)}`);
  }

  redirect(
    `/admin/exams/${examId}/builder?tab=assignment&message=${encodeURIComponent(
      "Student accommodation support updated.",
    )}`,
  );
}

async function loadBuilderData(examId: string) {
  const detail = await fetchTeacherExamDetail(examId);

  const [academicYears, programs, cohorts, subjects, questions, topics, students, optionCatalogEntries] = await Promise.all([
    fetchTeacherAcademicYears(),
    fetchTeacherPrograms(),
    fetchTeacherCohorts({
      academic_year: detail.academic_year,
      program: detail.program,
    }),
    fetchTeacherSubjects({
      program: detail.program,
    }),
    fetchTeacherQuestions({
      program: detail.program,
      subject: detail.subject,
    }),
    fetchTeacherTopics({
      subject: detail.subject,
    }),
    fetchTeacherStudents({
      academic_year: detail.academic_year,
      program: detail.program,
      cohort: detail.cohort,
    }),
    fetchTeacherOptionCatalog(),
  ]);

  return {
    detail,
    academicYears,
    programs,
    cohorts,
    subjects,
    questions,
    topics,
    students,
    optionCatalogEntries,
  };
}

export default async function PlatformAdminExamBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; message?: string; tab?: string }>;
}) {
  await requirePlatformAdminSession();
  const { examId } = await params;
  const { error, message, tab } = await searchParams;

  const builderData = await loadBuilderData(examId).catch(() => null);

  if (!builderData) {
    return (
      <div className="studentPage">
        <PlatformAdminPageHeader
          title="Exam Builder"
          description="This route depends on live platform-admin exam builder data from the backend."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Exam builder could not be loaded"
          description="The exam builder needs exam detail, academic lookup, question bank, and student scope endpoints, and the current request did not complete successfully."
          bullets={[
            "Platform exam detail endpoint",
            "Academic scope lookups",
            "Question bank endpoint",
            "Student scope endpoint",
          ]}
          ctaHref="/admin/exams"
          ctaLabel="Back to Exams"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const {
    detail,
    academicYears,
    programs,
    cohorts,
    subjects,
    questions,
    topics,
    students,
    optionCatalogEntries,
  } = builderData;
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);
  const assignmentModeOptions = optionCatalog.selectOptions("exam_assignment_mode");
  const attemptPolicyOptions = optionCatalog.selectOptions("exam_attempt_policy");
  const deliveryModeOptions = optionCatalog.selectOptions("exam_delivery_mode");
  const examTypeOptions = optionCatalog.selectOptions("exam_type");
  const navigationModeOptions = optionCatalog.selectOptions("exam_navigation_mode");
  const resultPublishModeOptions = optionCatalog.selectOptions("exam_result_publish_mode");
  const reviewModeOptions = optionCatalog.selectOptions("exam_review_mode");
  const securityModeOptions = optionCatalog.selectOptions("exam_security_mode");
  const timerModeOptions = optionCatalog.selectOptions("exam_timer_mode");
  const questionTypeLabelMap = optionCatalog.labelMap("question_type");
  const difficultyLabelMap = optionCatalog.labelMap("question_difficulty");
  const difficultyOptions = optionCatalog.selectOptions("question_difficulty");

  const activeSections = detail.sections.filter((section) => section.is_active);
  const activeExamQuestions = detail.exam_questions.filter((question) => question.is_active);
  const activeAssignedStudents = detail.assigned_students.filter((student) => student.is_active);
  const selectedStudentIds = new Set(activeAssignedStudents.map((student) => student.student));
  const availableQuestions = questions.filter(
    (question) => !activeExamQuestions.some((linked) => linked.question === question.id),
  );
  const rapidAttachQuestions = availableQuestions.slice(0, 18);
  const requestedTabId = tab && ["sections", "questions", "assignment", "bank"].includes(tab) ? tab : null;
  const initialWorkspaceTabId =
    requestedTabId ?? (activeExamQuestions.length === 0 && availableQuestions.length > 0 ? "questions" : "sections");
  const builderWorkspaceItems = [
    {
      id: "sections",
      label: "Sections",
      description: `${activeSections.length} configured`,
      content: (
        <article className="dashboardPanel builderPanel" id="structure-sections">
          <div className="builderPanelHeader">
            <div>
              <span className="builderFlowLabel">Paper design</span>
              <strong>Sections</strong>
              <p>Break the exam into focused blocks so navigation, timing, and question grouping feel intentional.</p>
            </div>
            <div className="builderPanelMetrics">
              <article className="builderMetricChip">
                <span>Configured</span>
                <strong>{activeSections.length}</strong>
              </article>
              <article className="builderMetricChip">
                <span>Linked questions</span>
                <strong>{activeSections.reduce((sum, section) => sum + section.linked_questions_count, 0)}</strong>
              </article>
            </div>
          </div>

          <div className="builderStack">
            {activeSections.map((section) => (
              <div className="builderListRow" key={section.id}>
                <div>
                  <strong>{section.name}</strong>
                  <span>
                    Section {section.section_order} · {section.linked_questions_count} linked question(s)
                  </span>
                </div>
                <div className="builderListMeta">
                  <span>{section.duration_minutes ? `${section.duration_minutes} min` : "No timer"}</span>
                  <span>{section.total_questions} planned</span>
                </div>
                <form action={deleteSectionAction}>
                  <input name="exam_id" type="hidden" value={detail.id} />
                  <input name="section_id" type="hidden" value={section.id} />
                  <ActionSubmitButton
                    className="button buttonGhost"
                    idleLabel="Remove"
                    pendingLabel="Removing..."
                  />
                </form>
              </div>
            ))}

            {!activeSections.length ? (
              <div className="builderEmptyState">
                <strong>No sections yet</strong>
                <p>Add the first section to shape the paper structure before mapping questions into it.</p>
              </div>
            ) : null}
          </div>

          <form action={addSectionAction} className="builderForm builderSubform">
            <input name="exam_id" type="hidden" value={detail.id} />

            <div className="builderMiniBanner">
              <div>
                <strong>Add a new section</strong>
                <span>Use sections for units, difficulty blocks, or timed paper segments.</span>
              </div>
            </div>

            <div className="builderGrid compact">
              <label className="fieldStack">
                <span>Section name</span>
                <input name="name" placeholder="Algebra" required type="text" />
              </label>
              <label className="fieldStack">
                <span>Order</span>
                <input defaultValue={activeSections.length + 1} min="1" name="section_order" required type="number" />
              </label>
              <label className="fieldStack">
                <span>Total questions</span>
                <input defaultValue="0" min="0" name="total_questions" type="number" />
              </label>
              <label className="fieldStack">
                <span>Section duration</span>
                <input min="1" name="duration_minutes" type="number" />
              </label>
            </div>

            <label className="fieldStack fieldStackFull">
              <span>Description</span>
              <textarea name="description" rows={2} />
            </label>
            <label className="fieldStack fieldStackFull">
              <span>Instructions</span>
              <textarea name="instructions" rows={3} />
            </label>

            <div className="toggleGrid">
              <label><input name="timer_enabled" type="checkbox" /> Enable section timer</label>
              <label><input defaultChecked name="allow_skip_section" type="checkbox" /> Allow skip section</label>
              <label><input name="lock_after_submit" type="checkbox" /> Lock after submit</label>
            </div>

            <div className="settingsActionRow">
              <ActionSubmitButton
                className="button buttonSecondary"
                idleLabel="Add Section"
                pendingLabel="Adding Section..."
              />
            </div>
          </form>
        </article>
      ),
    },
    {
      id: "questions",
      label: "Linked Questions",
      description: `${activeExamQuestions.length} attached`,
      content: (
        <article className="dashboardPanel builderPanel" id="linked-questions">
          <div className="builderPanelHeader">
            <div>
              <span className="builderFlowLabel">Question mapping</span>
              <strong>Linked Questions</strong>
              <p>Attach question-bank items to the exam shell and control ordering, section placement, and scoring overrides.</p>
            </div>
            <div className="builderPanelMetrics">
              <article className="builderMetricChip">
                <span>Attached</span>
                <strong>{activeExamQuestions.length}</strong>
              </article>
              <article className="builderMetricChip">
                <span>Available in bank</span>
                <strong>{availableQuestions.length}</strong>
              </article>
            </div>
          </div>

          <div className="builderStack">
            {activeExamQuestions.map((question) => (
              <div className="builderListRow" key={question.id}>
                <div>
                  <strong>{question.question_text_summary}</strong>
                  <span>
                    Q{question.question_order}
                    {question.section_title ? ` · ${question.section_title}` : ""}
                  </span>
                </div>
                <div className="builderListMeta">
                  <span>{question.marks} marks</span>
                  <span>{question.is_mandatory ? "Mandatory" : "Optional"}</span>
                </div>
                <div className="builderListMeta builderListMetaActions">
                  <form action={updateQuestionLinkAction} className="builderInlineQuestionEditor">
                    <input name="exam_id" type="hidden" value={detail.id} />
                    <input name="exam_question_id" type="hidden" value={question.id} />
                    <select defaultValue={question.section ?? ""} name="section">
                      <option value="">No section</option>
                      {activeSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                    <input
                      defaultValue={question.question_order}
                      min="1"
                      name="question_order"
                      type="number"
                    />
                    <input
                      defaultValue={question.marks ?? ""}
                      min="0"
                      name="marks"
                      placeholder="Marks"
                      step="0.01"
                      type="number"
                    />
                    <input
                      defaultValue={question.negative_marks ?? ""}
                      min="0"
                      name="negative_marks"
                      placeholder="Negative"
                      step="0.01"
                      type="number"
                    />
                    <label className="builderInlineCheckbox">
                      <input
                        defaultChecked={question.is_mandatory}
                        name="is_mandatory"
                        type="checkbox"
                      />
                      Mandatory
                    </label>
                    <ActionSubmitButton
                      className="button buttonGhost"
                      idleLabel="Save"
                      pendingLabel="Saving..."
                    />
                  </form>
                  <form action={deleteQuestionLinkAction}>
                    <input name="exam_id" type="hidden" value={detail.id} />
                    <input name="exam_question_id" type="hidden" value={question.id} />
                    <ActionSubmitButton
                      className="button buttonGhost"
                      idleLabel="Remove"
                      pendingLabel="Removing..."
                    />
                  </form>
                </div>
              </div>
            ))}

            {!activeExamQuestions.length ? (
              <div className="builderEmptyState">
                <strong>No questions linked yet</strong>
                <p>Choose from the scoped question inventory below and start building the live paper order.</p>
              </div>
            ) : null}
          </div>

          <form action={addQuestionLinkAction} className="builderForm builderSubform">
            <input name="exam_id" type="hidden" value={detail.id} />

            <div className="builderMiniBanner">
              <div>
                <strong>Attach question from bank</strong>
                <span>Select a question, place it into a section if needed, then control order and marks.</span>
              </div>
              <Link className="button buttonGhost" href="/admin/academic-setup">
                Open Academic Setup
              </Link>
            </div>

            <div className="builderGrid compact">
              <label className="fieldStack fieldStackFull">
                <span>Question</span>
                <select name="question" required>
                  <option value="">Select a question</option>
                  {availableQuestions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.question_text.slice(0, 120)}{question.question_text.length > 120 ? "..." : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Section</span>
                <select name="section">
                  <option value="">No section</option>
                  {activeSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Question order</span>
                <input defaultValue={activeExamQuestions.length + 1} min="1" name="question_order" required type="number" />
              </label>

              <label className="fieldStack">
                <span>Marks</span>
                <input min="0" name="marks" step="0.01" type="number" />
              </label>

              <label className="fieldStack">
                <span>Negative marks</span>
                <input min="0" name="negative_marks" step="0.01" type="number" />
              </label>
            </div>

            <div className="toggleGrid">
              <label><input defaultChecked name="is_mandatory" type="checkbox" /> Mandatory question</label>
            </div>

            <div className="settingsActionRow">
              <ActionSubmitButton
                className="button buttonSecondary"
                idleLabel="Attach Question"
                pendingLabel="Attaching..."
              />
            </div>
          </form>

                <BuilderRapidAttach
                  action={bulkAddQuestionLinksAction}
                  difficultyLabelMap={difficultyLabelMap}
                  difficultyOptions={difficultyOptions}
                  examId={detail.id}
                  nextOrder={activeExamQuestions.length + 1}
                  questionTypeLabelMap={questionTypeLabelMap}
                  questions={rapidAttachQuestions}
                  sections={activeSections.map((section) => ({ id: section.id, name: section.name }))}
                  topics={topics}
                />
        </article>
      ),
    },
    {
      id: "assignment",
      label: "Student Assignment",
      description: `${activeAssignedStudents.length} selected`,
      content: (
        <article className="dashboardPanel builderPanel" id="student-assignment">
          <div className="builderPanelHeader">
            <div>
              <span className="builderFlowLabel">Audience control</span>
              <strong>Student Assignment</strong>
              <p>Choose whether this exam follows scope-based distribution or a curated learner list for targeted delivery.</p>
            </div>
            <div className="builderPanelMetrics">
              <article className="builderMetricChip">
                <span>Assigned</span>
                <strong>{activeAssignedStudents.length}</strong>
              </article>
              <article className="builderMetricChip">
                <span>Visible in scope</span>
                <strong>{students.length}</strong>
              </article>
            </div>
          </div>

          <form action={updateAssignmentsAction} className="builderForm">
            <input name="exam_id" type="hidden" value={detail.id} />

            <div className="builderComposerGrid">
              <label className="fieldStack">
                <span>Assignment mode</span>
                <select defaultValue={detail.assignment_mode} name="assignment_mode">
                  {assignmentModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="builderMiniBanner">
                <div>
                  <strong>Current targeting</strong>
                  <span>{titleCase(detail.assignment_mode)} · {detail.cohort_name ?? "All eligible cohorts in scope"}</span>
                </div>
              </div>
            </div>

            <div className="selectionList">
              {students.map((student) => (
                <label className="selectionRow" key={student.id}>
                  <input
                    defaultChecked={selectedStudentIds.has(student.id)}
                    name="student_ids"
                    type="checkbox"
                    value={student.id}
                  />
                  <div>
                    <strong>{student.full_name}</strong>
                    <span>{student.admission_no}</span>
                  </div>
                </label>
              ))}

              {!students.length ? (
                <div className="builderEmptyState">
                  <strong>No assignable students found</strong>
                  <p>The current academic year, program, and cohort scope did not return any learners yet.</p>
                </div>
              ) : null}
            </div>

            <div className="settingsActionRow">
              <ActionSubmitButton
                className="button buttonPrimary"
                idleLabel="Save Assignment"
                pendingLabel="Saving Assignment..."
              />
            </div>
          </form>

          <div className="builderDivider" />

          <div className="builderPanelHeader">
            <div>
              <span className="builderFlowLabel">Accessibility</span>
              <strong>Student Accommodation Support</strong>
              <p>
                Configure approved runtime support for visible students. These values
                will be snapshotted into new attempts when the learner starts the exam.
              </p>
            </div>
            <div className="builderPanelMetrics">
              <article className="builderMetricChip">
                <span>Support profiles</span>
                <strong>
                  {students.filter((student) => {
                    const profile = student.accommodation_profile ?? {};
                    return Boolean(
                      Number(profile.extra_time_minutes ?? 0) > 0 ||
                        Number(profile.extra_time_percentage ?? 0) > 0 ||
                        profile.simplified_warning_copy ||
                        profile.alternative_instructions ||
                        profile.notes,
                    );
                  }).length}
                </strong>
              </article>
            </div>
          </div>

          <div className="builderAccommodationGrid">
            {students.map((student) => {
              const profile = student.accommodation_profile ?? {};
              return (
                <form
                  action={updateStudentAccommodationAction}
                  className="builderAccommodationCard"
                  key={`accommodation-${student.id}`}
                >
                  <input name="exam_id" type="hidden" value={detail.id} />
                  <input name="student_id" type="hidden" value={student.id} />

                  <div className="resultCardTop">
                    <div>
                      <strong>{student.full_name}</strong>
                      <span>{student.admission_no}</span>
                    </div>
                    <span className="statusPill statusDemo">
                      {Number(profile.extra_time_minutes ?? 0) > 0
                        ? `+${profile.extra_time_minutes} min`
                        : profile.simplified_warning_copy
                          ? "Guidance support"
                          : "Standard"}
                    </span>
                  </div>

                  <div className="builderComposerGrid">
                    <label className="fieldStack">
                      <span>Extra time (minutes)</span>
                      <input
                        defaultValue={String(profile.extra_time_minutes ?? 0)}
                        min={0}
                        name="extra_time_minutes"
                        type="number"
                      />
                    </label>

                    <label className="fieldStack">
                      <span>Extra time (%)</span>
                      <input
                        defaultValue={String(profile.extra_time_percentage ?? 0)}
                        min={0}
                        name="extra_time_percentage"
                        type="number"
                      />
                    </label>
                  </div>

                  <label className="fieldStack">
                    <span>Extra warning allowance</span>
                    <input
                      defaultValue={String(profile.additional_violation_allowance ?? 0)}
                      max={2}
                      min={0}
                      name="additional_violation_allowance"
                      type="number"
                    />
                  </label>

                  <label className="selectionRow builderToggleRow">
                    <input
                      defaultChecked={Boolean(profile.simplified_warning_copy)}
                      name="simplified_warning_copy"
                      type="checkbox"
                    />
                    <div>
                      <strong>Simplified warning copy</strong>
                      <span>Use plainer runtime guidance for this student.</span>
                    </div>
                  </label>

                  <label className="fieldStack">
                    <span>Alternative instructions</span>
                    <textarea
                      className="builderTextarea"
                      defaultValue={String(profile.alternative_instructions ?? "")}
                      name="alternative_instructions"
                      rows={3}
                    />
                  </label>

                  <label className="fieldStack">
                    <span>Support notes</span>
                    <textarea
                      className="builderTextarea"
                      defaultValue={String(profile.notes ?? "")}
                      name="notes"
                      rows={2}
                    />
                  </label>

                  <div className="settingsActionRow">
                    <ActionSubmitButton
                      className="button buttonSecondary"
                      idleLabel="Save Accommodation"
                      pendingLabel="Saving Support..."
                    />
                  </div>
                </form>
              );
            })}

            {!students.length ? (
              <div className="builderEmptyState">
                <strong>No students available for accommodation setup</strong>
                <p>
                  Once learners are visible in this academic scope, you can define their
                  approved runtime support here.
                </p>
              </div>
            ) : null}
          </div>
        </article>
      ),
    },
    {
      id: "bank",
      label: "Question Bank",
      description: `${questions.length} available`,
      content: (
        <article className="dashboardPanel builderPanel">
          <div className="builderPanelHeader">
            <div>
              <span className="builderFlowLabel">Reference pool</span>
              <strong>Question Bank Window</strong>
              <p>Review the scoped question inventory tied to this exam’s program and subject before attaching items.</p>
            </div>
            <div className="builderPanelMetrics">
              <article className="builderMetricChip">
                <span>Total available</span>
                <strong>{questions.length}</strong>
              </article>
              <article className="builderMetricChip">
                <span>Showing</span>
                <strong>{Math.min(questions.length, 12)}</strong>
              </article>
            </div>
          </div>

          <div className="builderStack">
            {questions.slice(0, 12).map((question) => (
              <div className="builderListRow" key={question.id}>
                <div>
                  <strong>{question.question_text.slice(0, 120)}{question.question_text.length > 120 ? "..." : ""}</strong>
                  <span>
                    {(questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type))} · {(difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level))} · {question.default_marks} marks
                  </span>
                </div>
                <div className="builderListMeta builderListMetaActions">
                  <span className="statusPill statusDemo">
                    {question.has_explanation ? "Explanation" : "No explanation"}
                  </span>
                  {!activeExamQuestions.some((linked) => linked.question === question.id) ? (
                    <form action={addQuestionLinkAction}>
                      <input name="exam_id" type="hidden" value={detail.id} />
                      <input name="question" type="hidden" value={question.id} />
                      <input name="question_order" type="hidden" value={activeExamQuestions.length + 1} />
                      <input name="is_mandatory" type="hidden" value="on" />
                      <input name="marks" type="hidden" value="" />
                      <input name="negative_marks" type="hidden" value="" />
                      <ActionSubmitButton
                        className="button buttonGhost"
                        idleLabel="Quick Add"
                        pendingLabel="Adding..."
                      />
                    </form>
                  ) : (
                    <span className="statusPill statusLive">Already linked</span>
                  )}
                </div>
              </div>
            ))}

            {!questions.length ? (
              <div className="builderEmptyState">
                <strong>No question bank items available</strong>
                <p>Check the selected program and subject scope, or add verified questions in the backend first.</p>
              </div>
            ) : null}
          </div>
        </article>
      ),
    },
  ];

  return (
    <div className="studentPage studentDashboardModern">
      <PlatformAdminPageHeader
        title={`${detail.title} Builder`}
        description="Edit the exam configuration, shape sections, attach questions, and control the student audience from one platform-admin workflow."
        statusLabel={titleCase(detail.status)}
        statusTone={
          detail.status === "live"
            ? "live"
            : detail.status === "scheduled"
              ? "warning"
              : "demo"
        }
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Unified Builder</span>
          <strong>Exam builder workflow</strong>
          <small>
            {activeSections.length} sections · {activeExamQuestions.length} linked questions · {activeAssignedStudents.length} learners
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`/admin/exams/${detail.id}`}>
            Open Delivery View
          </Link>
          <Link className="button buttonSecondary" href="/admin/reports">
            Open Reports
          </Link>
        </div>
      </section>

      <section className="builderSummaryGrid">
        <article className="builderSummaryCard">
          <span>Exam code</span>
          <strong>{detail.code}</strong>
          <small>{detail.subject_name ?? "Subject pending"}</small>
        </article>
        <article className="builderSummaryCard">
          <span>Structure</span>
          <strong>{activeSections.length} sections</strong>
          <small>{activeExamQuestions.length} linked questions</small>
        </article>
        <article className="builderSummaryCard">
          <span>Audience</span>
          <strong>{activeAssignedStudents.length} learners</strong>
          <small>{titleCase(detail.assignment_mode)}</small>
        </article>
        <article className="builderSummaryCard">
          <span>Lifecycle</span>
          <strong>{titleCase(detail.status)}</strong>
          <small>{detail.start_at ? new Date(detail.start_at).toLocaleString("en-IN") : "Schedule pending"}</small>
        </article>
      </section>

      {activeExamQuestions.length === 0 ? (
        <section className="builderActionCallout">
          <div>
            <span className="builderFlowLabel">Next best step</span>
            <strong>Link questions before publishing this exam</strong>
            <p>
              This exam shell is ready, but it still has no mapped questions. Open the linked-questions workspace and
              attach items from the scoped question inventory.
            </p>
          </div>
          <div className="resultCardActions">
            <Link className="button buttonSecondary" href={`/admin/exams/${detail.id}/builder?tab=questions`}>
              Link Questions
            </Link>
            <Link className="button buttonGhost" href="/admin/academic-setup">
              Review Academic Setup
            </Link>
          </div>
        </section>
      ) : null}

      <section className="builderFlowLayout">
        <aside className="builderFlowRail">
          <div className="builderFlowRailInner">
            <span className="builderFlowLabel">Builder flow</span>
            <strong>Shape the full exam</strong>
            <p>Start with settings, then move into sections, linked questions, and learner assignment.</p>

            <nav className="builderStepNav" aria-label="Exam builder steps">
              <a className="builderStepLink" href="#scope-identity">
                <span>01</span>
                <div>
                  <strong>Scope and Identity</strong>
                  <small>Academic scope and naming</small>
                </div>
              </a>
              <a className="builderStepLink" href="#schedule-delivery">
                <span>02</span>
                <div>
                  <strong>Schedule and Delivery</strong>
                  <small>Window, marks, duration</small>
                </div>
              </a>
              <a className="builderStepLink" href="#runtime-rules">
                <span>03</span>
                <div>
                  <strong>Runtime Rules</strong>
                  <small>Attempt and security settings</small>
                </div>
              </a>
              <a className="builderStepLink" href="#learner-experience">
                <span>04</span>
                <div>
                  <strong>Learner Experience</strong>
                  <small>Instructions and behavior</small>
                </div>
              </a>
              <a className="builderStepLink" href="#structure-sections">
                <span>05</span>
                <div>
                  <strong>Sections</strong>
                  <small>Paper structure</small>
                </div>
              </a>
              <a className="builderStepLink" href="#linked-questions">
                <span>06</span>
                <div>
                  <strong>Linked Questions</strong>
                  <small>Question bank mapping</small>
                </div>
              </a>
              <a className="builderStepLink" href="#student-assignment">
                <span>07</span>
                <div>
                  <strong>Student Assignment</strong>
                  <small>Scope or selected learners</small>
                </div>
              </a>
            </nav>
          </div>
        </aside>

        <div className="builderFlowContent">
          <section className="contentCard">
            <div className="builderHeroCard">
              <div>
                <span className="builderFlowLabel">Exam settings</span>
                <strong>Refine the shell before publishing it to students</strong>
                <p>Update academic scope, delivery behavior, runtime policy, and student-facing guidance in one place.</p>
              </div>
              <div className="resultCardActions">
                <Link className="button buttonSecondary" href={`/admin/exams/${detail.id}/builder?tab=questions`}>
                  Link Questions
                </Link>
                <Link className="button buttonGhost" href={`/admin/exams/${detail.id}`}>
                  Open delivery view
                </Link>
              </div>
            </div>

            <form action={updateExamSettingsAction} className="builderForm builderWorkspace">
              <input name="exam_id" type="hidden" value={detail.id} />

              <section className="builderSectionCard" id="scope-identity">
                <div className="builderSectionHeader">
                  <div>
                    <strong>Scope and Identity</strong>
                    <p>Define where this exam belongs and how it will be recognized across the institute.</p>
                  </div>
                </div>
                <div className="wizardFeatureGrid">
                  <article className="wizardFeatureCard">
                    <span>Program context</span>
                    <strong>{detail.program_name}</strong>
                    <small>{detail.cohort_name ?? "No cohort restriction applied yet."}</small>
                  </article>
                  <article className="wizardFeatureCard">
                    <span>Subject lane</span>
                    <strong>{detail.subject_name ?? "Subject pending"}</strong>
                    <small>Keep identity clean before moving into sections and linked questions.</small>
                  </article>
                </div>
                <div className="builderGrid">
                  <label className="fieldStack">
                    <span>Academic year</span>
                    <select defaultValue={detail.academic_year} name="academic_year" required>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fieldStack">
                    <span>Program</span>
                    <select defaultValue={detail.program} name="program" required>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name} ({program.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fieldStack">
                    <span>Cohort</span>
                    <select defaultValue={detail.cohort ?? ""} name="cohort">
                      <option value="">No cohort restriction</option>
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name} ({cohort.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fieldStack">
                    <span>Subject</span>
                    <select defaultValue={detail.subject ?? ""} name="subject">
                      <option value="">No subject selected</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fieldStack">
                    <span>Exam title</span>
                    <input defaultValue={detail.title} name="title" required type="text" />
                  </label>

                  <label className="fieldStack">
                    <span>Exam code</span>
                    <input defaultValue={detail.code} name="code" required type="text" />
                  </label>
                </div>
              </section>

              <section className="builderSectionCard" id="schedule-delivery">
                <div className="builderSectionHeader">
                  <div>
                    <strong>Schedule and Delivery</strong>
                    <p>Control exam format, timing, marks, and the live window seen by students.</p>
                  </div>
                </div>
                <div className="builderGrid">
              <label className="fieldStack">
                <span>Exam type</span>
                <select defaultValue={detail.exam_type} name="exam_type">
                  {examTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Delivery mode</span>
                <select defaultValue={detail.delivery_mode} name="delivery_mode">
                  {deliveryModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Duration (minutes)</span>
                <input defaultValue={detail.duration_minutes} min="1" name="duration_minutes" required type="number" />
              </label>

              <label className="fieldStack">
                <span>Max attempts</span>
                <input defaultValue={detail.max_attempts} min="1" name="max_attempts" required type="number" />
              </label>

              <label className="fieldStack">
                <span>Total marks</span>
                <input defaultValue={detail.total_marks} min="0" name="total_marks" step="0.01" type="number" />
              </label>

              <label className="fieldStack">
                <span>Passing marks</span>
                <input defaultValue={detail.passing_marks} min="0" name="passing_marks" step="0.01" type="number" />
              </label>

              <label className="fieldStack">
                <span>Start at</span>
                <input defaultValue={formatDateTimeLocal(detail.start_at)} name="start_at" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>End at</span>
                <input defaultValue={formatDateTimeLocal(detail.end_at)} name="end_at" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>Result publish at</span>
                <input defaultValue={formatDateTimeLocal(detail.result_publish_at)} name="result_publish_at" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>Review available from</span>
                <input defaultValue={formatDateTimeLocal(detail.review_available_from)} name="review_available_from" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>Review available until</span>
                <input defaultValue={formatDateTimeLocal(detail.review_available_until)} name="review_available_until" type="datetime-local" />
              </label>
                </div>
              </section>

              <section className="builderSectionCard" id="runtime-rules">
                <div className="builderSectionHeader">
                  <div>
                    <strong>Runtime Rules</strong>
                    <p>Shape navigation, attempt policy, publishing behavior, review, and security profile.</p>
                  </div>
                </div>
                <div className="builderGrid">
              <label className="fieldStack">
                <span>Timer mode</span>
                <select defaultValue={detail.timer_mode} name="timer_mode">
                  {timerModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Navigation mode</span>
                <select defaultValue={detail.navigation_mode} name="navigation_mode">
                  {navigationModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Attempt policy</span>
                <select defaultValue={detail.attempt_policy} name="attempt_policy">
                  {attemptPolicyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Result publish mode</span>
                <select defaultValue={detail.result_publish_mode} name="result_publish_mode">
                  {resultPublishModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Review mode</span>
                <select defaultValue={detail.review_mode} name="review_mode">
                  {reviewModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Security mode</span>
                <select defaultValue={detail.security_mode} name="security_mode">
                  {securityModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  This setting controls browser-based monitoring only. Webcam capture or external proctoring would require a separate capability.
                </small>
              </label>
                </div>
              </section>

              <section className="builderSectionCard" id="learner-experience">
                <div className="builderSectionHeader">
                  <div>
                    <strong>Learner Experience</strong>
                    <p>Write the context students see and choose the interaction behaviors allowed during an attempt.</p>
                  </div>
                </div>
                <label className="fieldStack fieldStackFull">
                  <span>Description</span>
                  <textarea defaultValue={detail.description} name="description" rows={4} />
                </label>

                <label className="fieldStack fieldStackFull">
                  <span>Student instructions</span>
                  <textarea defaultValue={detail.instructions} name="instructions" rows={6} />
                </label>

                <div className="toggleGrid">
                  <label><input defaultChecked={detail.allow_resume} name="allow_resume" type="checkbox" /> Allow resume</label>
                  <label><input defaultChecked={detail.allow_section_switching} name="allow_section_switching" type="checkbox" /> Allow section switching</label>
                  <label><input defaultChecked={detail.allow_return_to_previous_section} name="allow_return_to_previous_section" type="checkbox" /> Allow return to previous section</label>
                  <label><input defaultChecked={detail.allow_late_submit} name="allow_late_submit" type="checkbox" /> Allow late submit</label>
                  <label><input defaultChecked={detail.randomize_questions} name="randomize_questions" type="checkbox" /> Randomize questions</label>
                  <label><input defaultChecked={detail.randomize_options} name="randomize_options" type="checkbox" /> Randomize options</label>
                  <label><input defaultChecked={detail.show_result_immediately} name="show_result_immediately" type="checkbox" /> Show result immediately</label>
                  <label><input defaultChecked={detail.allow_review_after_submit} name="allow_review_after_submit" type="checkbox" /> Allow review after submit</label>
                </div>
              </section>

              <div className="builderSaveBar">
                <div>
                  <strong>Keep the setup clean and reviewable</strong>
                  <span>Save after major scope, schedule, or policy changes before moving into sections and questions.</span>
                </div>
                <ActionSubmitButton
                  className="button buttonPrimary"
                  idleLabel="Save Exam Settings"
                  pendingLabel="Saving Settings..."
                />
              </div>
            </form>
          </section>

          <div id="builder-workspace">
            <BuilderTabs items={builderWorkspaceItems} initialTabId={initialWorkspaceTabId} />
          </div>
        </div>
      </section>
    </div>
  );
}
