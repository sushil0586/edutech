import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherQuestionPassageEditor } from "@/components/ui/teacher-question-passage-editor";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import {
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestionPassageDetail,
  fetchTeacherSubjects,
  fetchTeacherTopics,
  updateTeacherQuestionPassage,
} from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPassagePayload } from "@/lib/teacher/question-bank-form";
import {
  buildQuestionBankErrorSearch,
  parseQuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

async function updateQuestionPassageAction(formData: FormData) {
  "use server";

  const profile = await requireInstituteAdminSession();
  const passageId = String(formData.get("passage_id") ?? "").trim();

  if (!profile.institute || !passageId) {
    redirect("/institute/question-bank?error=Comprehension%20set%20context%20is%20missing.");
  }

  try {
    const payload = buildTeacherQuestionPassagePayload(formData, {
      institute: profile.institute,
      teacherProfile: profile.teacher_profile,
    });
    const passage = await updateTeacherQuestionPassage(passageId, payload);
    redirect(
      `/institute/question-bank/comprehension/${passage.id}?message=${encodeURIComponent("Comprehension set updated successfully.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      `/institute/question-bank/comprehension/${passageId}?${buildQuestionBankErrorSearch(
        error,
        "Unable to update the comprehension set right now.",
      )}`,
    );
  }
}

export default async function InstituteQuestionPassageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ passageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireInstituteAdminSession();
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
        <InstitutePageHeader
          title="Comprehension Detail"
          description="This route depends on live comprehension detail and academic lookup endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Comprehension detail could not be loaded"
          description="The selected comprehension set was not available from the institute question bank, or the academic lookup endpoints did not complete successfully."
          bullets={[
            "Institute comprehension detail endpoint",
            "Programs, subjects, and topics lookups",
            "Institute comprehension update endpoint",
          ]}
          ctaHref="/institute/question-bank"
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
        headerEyebrow="Institute workspace"
        contentScopeLabel="institute-scoped"
        contentFormatOptions={optionCatalog.selectOptions("question_content_format")}
        initialPassage={passage}
        pageTitle="Edit Comprehension Set"
        pageDescription="Refine the shared passage, topic mapping, and linked question context before reuse in institute exams."
        pageClassName="instituteConsolePage instituteQuestionEditorPageVivid"
        programs={programs}
        subjects={subjects}
        topics={topics}
        validationErrors={validationErrors}
        validationMessage={error ? decodeURIComponent(error) : ""}
      />

      <section className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionEditorPageVivid">
        <section className="studentInsightHeroCard studentInsightHeroCardCompact">
          <div className="studentInsightHeroCopy">
            <span className="studentDashboardTag">Next Step</span>
            <strong>Attach questions into this comprehension set</strong>
            <small>{passage.linked_question_count} linked question{passage.linked_question_count === 1 ? "" : "s"} right now</small>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/institute/question-bank">
              Back to Question Bank
            </Link>
            <Link className="button buttonPrimary" href="/institute/question-bank/new">
              Create Linked Question
            </Link>
          </div>
        </section>
      </section>
    </>
  );
}
