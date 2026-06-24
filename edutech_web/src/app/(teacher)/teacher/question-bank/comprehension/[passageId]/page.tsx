import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherQuestionPassageEditor } from "@/components/ui/teacher-question-passage-editor";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestionPassageDetail,
  fetchTeacherSubjects,
  fetchTeacherTopics,
  updateTeacherQuestionPassage,
} from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPassagePayload } from "@/lib/teacher/question-bank-form";
import {
  buildQuestionBankErrorSearch,
  parseQuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

async function updateQuestionPassageAction(formData: FormData) {
  "use server";

  const profile = await requireTeacherSession();
  const passageId = String(formData.get("passage_id") ?? "").trim();

  if (!profile.institute || !passageId) {
    redirect("/teacher/question-bank?error=Comprehension%20set%20context%20is%20missing.");
  }

  try {
    const payload = buildTeacherQuestionPassagePayload(formData, {
      institute: profile.institute,
      teacherProfile: profile.teacher_profile,
    });
    const passage = await updateTeacherQuestionPassage(passageId, payload);
    redirect(
      `/teacher/question-bank/comprehension/${passage.id}?message=${encodeURIComponent("Comprehension set updated successfully.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      `/teacher/question-bank/comprehension/${passageId}?${buildQuestionBankErrorSearch(
        error,
        "Unable to update the comprehension set right now.",
      )}`,
    );
  }
}

export default async function TeacherQuestionPassageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ passageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTeacherSession();
  const { passageId } = await params;
  const resolvedSearchParams = await searchParams;
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] ?? ""
    : resolvedSearchParams.error ?? "";
  const message = Array.isArray(resolvedSearchParams.message)
    ? resolvedSearchParams.message[0] ?? ""
    : resolvedSearchParams.message ?? "";
  const validationErrors = parseQuestionBankValidationErrors(resolvedSearchParams.validation);

  const data = await Promise.all([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms(),
    fetchTeacherSubjects(),
    fetchTeacherTopics(),
    fetchTeacherQuestionPassageDetail(passageId),
  ]).catch(() => null);

  if (!data) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
          title="Comprehension Detail"
          description="This route depends on live comprehension detail and academic lookup endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Comprehension detail could not be loaded"
          description="The selected comprehension set was not available from the teacher-scoped question bank, or the academic lookup endpoints did not complete successfully."
          bullets={[
            "Teacher comprehension detail endpoint",
            "Programs, subjects, and topics lookups",
            "Teacher comprehension update endpoint",
          ]}
          ctaHref="/teacher/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const [optionCatalogEntries, programs, subjects, topics, passage] = data;
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <>
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      <TeacherQuestionPassageEditor
        action={updateQuestionPassageAction}
        contentFormatOptions={optionCatalog.selectOptions("question_content_format")}
        initialPassage={passage}
        pageTitle="Edit Comprehension Set"
        pageDescription="Refine the shared passage, topic mapping, and linked question context before reuse in exams."
        pageClassName="teacherConsolePage teacherQuestionEditorPageVivid"
        programs={programs}
        subjects={subjects}
        topics={topics}
        validationErrors={validationErrors}
        validationMessage={error ? decodeURIComponent(error) : ""}
      />

      <section className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionEditorPageVivid">
        <section className="studentInsightHeroCard studentInsightHeroCardCompact">
          <div className="studentInsightHeroCopy">
            <span className="studentDashboardTag">Next Step</span>
            <strong>Attach questions into this comprehension set</strong>
            <small>{passage.linked_question_count} linked question{passage.linked_question_count === 1 ? "" : "s"} right now</small>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/teacher/question-bank">
              Back to Question Bank
            </Link>
            <Link className="button buttonPrimary" href="/teacher/question-bank/new">
              Create Linked Question
            </Link>
          </div>
        </section>
      </section>
    </>
  );
}
