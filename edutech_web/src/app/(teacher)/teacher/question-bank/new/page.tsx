import { redirect, unstable_rethrow } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherQuestionEditor } from "@/components/ui/teacher-question-editor";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  createTeacherQuestion,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPayload } from "@/lib/teacher/question-bank-form";

async function createQuestionAction(formData: FormData) {
  "use server";

  const profile = await requireTeacherSession();

  if (!profile.institute) {
    redirect("/teacher/question-bank?error=Teacher%20institute%20scope%20is%20missing.");
  }

  try {
    const payload = buildTeacherQuestionPayload(formData, {
      institute: profile.institute,
      teacherProfile: profile.teacher_profile,
    });
    const question = await createTeacherQuestion(payload);
    redirect(`/teacher/question-bank/${question.id}?message=${encodeURIComponent("Question created successfully.")}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create the question right now.";
    redirect(`/teacher/question-bank/new?error=${encodeURIComponent(message)}`);
  }
}

export default async function TeacherQuestionCreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTeacherSession();
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
        <TeacherPageHeader
          title="Create Question"
          description="This route depends on live academic lookups and question-bank write access."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question editor could not be loaded"
          description="The editor needs live program, subject, topic, and question-bank write endpoints before a question can be authored from the web workspace."
          bullets={[
            "Programs, subjects, and topics lookups",
            "Teacher question create endpoint",
            "Teacher question detail endpoint for duplication",
          ]}
          ctaHref="/teacher/question-bank"
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
        duplicateMode={Boolean(duplicateQuestion)}
        contentFormatOptions={optionCatalog.selectOptions("question_content_format")}
        difficultyOptions={optionCatalog.selectOptions("question_difficulty")}
        initialQuestion={duplicateQuestion}
        pageDescription={
          duplicateQuestion
            ? "Clone an existing question, refine the content, and save a cleaner reusable version into the bank."
            : "Author a reusable assessment question with clear scoring, explanation, and answer structure."
        }
        pageTitle={duplicateQuestion ? "Duplicate Question" : "Create Question"}
        pageClassName="teacherConsolePage teacherQuestionEditorPageVivid"
        programs={programs}
        questionTypeOptions={optionCatalog.selectOptions("question_type")}
        subjects={subjects}
        topics={topics}
      />
    </>
  );
}
