import dynamic from "next/dynamic";
import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import {
  createTeacherQuestion,
  fetchTeacherOptionCatalog,
  fetchTeacherQuestionPassages,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  fetchTeacherQuestionTypeRegistry,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPayload } from "@/lib/teacher/question-bank-form";
import {
  buildQuestionBankErrorSearch,
  parseQuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

const TeacherQuestionEditor = dynamic(
  () =>
    import("@/components/ui/teacher-question-editor").then((module) => ({
      default: module.TeacherQuestionEditor,
    })),
  {
    loading: () => (
      <section className="contentCard questionImportPanel">
        <div className="builderSectionHeader">
          <div>
            <strong>Loading editor tools</strong>
            <p>
              The page shell is ready. Academic mapping, scoring, and answer-structure controls are loading now.
            </p>
          </div>
        </div>
      </section>
    ),
  },
);

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
    redirect(
      `/institute/question-bank/new?${buildQuestionBankErrorSearch(
        error,
        "Unable to create the question right now.",
      )}`,
    );
  }
}

function InstituteQuestionCreatePageShell() {
  return (
    <>
      <InstitutePageHeader
        title="Create Question"
        description="Author a reusable assessment question with clear scoring, explanation, and answer structure."
      />

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Question Authoring</span>
          <strong>Loading the institute question editor</strong>
          <p>
            The editor shell is ready. Academic lookups, question types, and duplicate context are loading in the background.
          </p>
          <small>Preparing the authoring lane for the current institute scope</small>
        </div>
      </section>
    </>
  );
}

function InstituteQuestionCreateEditorLoading() {
  return (
    <section className="contentCard questionImportPanel">
      <div className="builderSectionHeader">
        <div>
          <strong>Loading editor tools</strong>
          <p>
            Academic mapping, scoring defaults, and answer-structure controls are loading now.
          </p>
        </div>
      </div>
    </section>
  );
}

async function InstituteQuestionCreateEditorData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;
  const duplicateId = Array.isArray(resolvedSearchParams.duplicate)
    ? resolvedSearchParams.duplicate[0] ?? ""
    : resolvedSearchParams.duplicate ?? "";
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] ?? ""
    : resolvedSearchParams.error ?? "";
  const validationErrors = parseQuestionBankValidationErrors(resolvedSearchParams.validation);

  const baseData = await Promise.all([
    fetchTeacherOptionCatalog(),
    fetchTeacherQuestionTypeRegistry(),
    fetchTeacherPrograms({ institute: profile.institute }),
    duplicateId ? fetchTeacherQuestionDetail(duplicateId) : Promise.resolve(null),
  ]).catch(() => null);

  if (!baseData) {
    return (
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
    );
  }

  const [optionCatalogEntries, questionTypeDefinitions, programs, duplicateQuestion] = baseData;
  const initialProgram = duplicateQuestion?.program ?? "";
  const initialSubject = duplicateQuestion?.subject ?? "";
  const scopedLookups = await Promise.all([
    initialProgram
      ? fetchTeacherSubjects({
          institute: profile.institute,
          program: initialProgram,
        }).catch(() => [])
      : Promise.resolve([]),
    initialSubject
      ? fetchTeacherTopics({
          institute: profile.institute,
          subject: initialSubject,
        }).catch(() => [])
      : Promise.resolve([]),
    initialSubject
      ? fetchTeacherQuestionPassages({
          program: initialProgram || undefined,
          subject: initialSubject,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const [subjects, topics, passages] = scopedLookups;
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
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
      pageClassName="instituteConsolePage instituteQuestionEditorPageVivid"
      lookupEndpoint="/api/institute/question-bank/create-lookups"
      passages={passages}
      programs={programs}
      questionTypeDefinitions={questionTypeDefinitions}
      questionTypeOptions={optionCatalog.selectOptions("question_type")}
      subjects={subjects}
      topics={topics}
      validationErrors={validationErrors}
      validationMessage={error ? decodeURIComponent(error) : ""}
    />
  );
}

export default function InstituteQuestionCreatePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionEditorPageVivid">
      <InstituteQuestionCreatePageShell />
      <Suspense fallback={<InstituteQuestionCreateEditorLoading />}>
        <InstituteQuestionCreateEditorData {...props} />
      </Suspense>
    </div>
  );
}
