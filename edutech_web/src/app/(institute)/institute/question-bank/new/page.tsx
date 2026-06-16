import { redirect, unstable_rethrow } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherQuestionEditor } from "@/components/ui/teacher-question-editor";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import {
  createTeacherQuestion,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPayload } from "@/lib/teacher/question-bank-form";

async function createQuestionAction(formData: FormData) {
  "use server";

  const profile = await requireInstituteAdminSession();

  if (!profile.institute) {
    redirect("/institute/question-bank?error=Institute%20scope%20is%20missing.");
  }

  try {
    const payload = buildTeacherQuestionPayload(formData, {
      institute: profile.institute,
      teacherProfile: profile.teacher_profile,
    });
    const question = await createTeacherQuestion(payload);
    redirect(`/institute/question-bank/${question.id}?message=${encodeURIComponent("Question created successfully.")}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create the question right now.";
    redirect(`/institute/question-bank/new?error=${encodeURIComponent(message)}`);
  }
}

export default async function InstituteQuestionCreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;
  const duplicateId = Array.isArray(resolvedSearchParams.duplicate)
    ? resolvedSearchParams.duplicate[0] ?? ""
    : resolvedSearchParams.duplicate ?? "";
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] ?? ""
    : resolvedSearchParams.error ?? "";

  const data = await Promise.all([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms(),
    fetchTeacherSubjects(),
    fetchTeacherTopics(),
    duplicateId ? fetchTeacherQuestionDetail(duplicateId) : Promise.resolve(null),
  ]).catch(() => null);

  if (!data) {
    return (
      <div className="studentPage">
        <InstitutePageHeader
          title="Create Question"
          description="This route depends on live academic lookups and question-bank write access."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question editor could not be loaded"
          description="The editor needs live program, subject, topic, and question-bank write endpoints before a question can be authored from the institute workspace."
          bullets={[
            "Programs, subjects, and topics lookups",
            "Institute question create endpoint",
            "Question detail endpoint for duplication",
          ]}
          ctaHref="/institute/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const [optionCatalogEntries, programs, subjects, topics, duplicateQuestion] = data;
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <>
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}
      <TeacherQuestionEditor
        action={createQuestionAction}
        headerEyebrow="Institute workspace"
        contentScopeLabel="institute-scoped"
        contentFormatOptions={optionCatalog.selectOptions("question_content_format")}
        difficultyOptions={optionCatalog.selectOptions("question_difficulty")}
        duplicateMode={Boolean(duplicateQuestion)}
        initialQuestion={duplicateQuestion}
        pageDescription={
          duplicateQuestion
            ? "Clone an existing question, refine the content, and save a cleaner reusable version into the institute bank."
            : "Author a reusable assessment question with clear scoring, explanation, and answer structure."
        }
        pageTitle={duplicateQuestion ? "Duplicate Question" : "Create Question"}
        programs={programs}
        questionTypeOptions={optionCatalog.selectOptions("question_type")}
        subjects={subjects}
        topics={topics}
      />
    </>
  );
}
