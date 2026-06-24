import { redirect, unstable_rethrow } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherQuestionPassageEditor } from "@/components/ui/teacher-question-passage-editor";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import {
  createTeacherQuestionPassage,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPassagePayload } from "@/lib/teacher/question-bank-form";
import {
  buildQuestionBankErrorSearch,
  parseQuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

async function createQuestionPassageAction(formData: FormData) {
  "use server";

  const profile = await requireInstituteAdminSession();

  if (!profile.institute) {
    redirect("/institute/question-bank?error=Institute%20scope%20is%20missing.");
  }

  try {
    const payload = buildTeacherQuestionPassagePayload(formData, {
      institute: profile.institute,
      teacherProfile: profile.teacher_profile,
    });
    const passage = await createTeacherQuestionPassage(payload);
    redirect(
      `/institute/question-bank/comprehension/${passage.id}?message=${encodeURIComponent("Comprehension set created successfully.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      `/institute/question-bank/comprehension/new?${buildQuestionBankErrorSearch(
        error,
        "Unable to create the comprehension set right now.",
      )}`,
    );
  }
}

export default async function InstituteQuestionPassageCreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] ?? ""
    : resolvedSearchParams.error ?? "";
  const validationErrors = parseQuestionBankValidationErrors(resolvedSearchParams.validation);

  const data = await Promise.all([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms(),
    fetchTeacherSubjects(),
    fetchTeacherTopics(),
  ]).catch(() => null);

  if (!data) {
    return (
      <div className="studentPage">
        <InstitutePageHeader
          title="Create Comprehension Set"
          description="This route depends on live academic lookups and comprehension write access."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Comprehension editor could not be loaded"
          description="The editor needs live program, subject, topic, and question-bank write endpoints before a comprehension set can be authored."
          bullets={[
            "Programs, subjects, and topics lookups",
            "Institute comprehension create endpoint",
          ]}
          ctaHref="/institute/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const [optionCatalogEntries, programs, subjects, topics] = data;
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <>
      <TeacherQuestionPassageEditor
        action={createQuestionPassageAction}
        headerEyebrow="Institute workspace"
        contentScopeLabel="institute-scoped"
        contentFormatOptions={optionCatalog.selectOptions("question_content_format")}
        pageTitle="Create Comprehension Set"
        pageDescription="Author a shared passage that can power multiple linked questions inside the institute bank and exam builder."
        pageClassName="instituteConsolePage instituteQuestionEditorPageVivid"
        programs={programs}
        subjects={subjects}
        topics={topics}
        validationErrors={validationErrors}
        validationMessage={error ? decodeURIComponent(error) : ""}
      />
    </>
  );
}
