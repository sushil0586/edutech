import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { TeacherQuestionBankWorkspace } from "@/components/ui/teacher-question-bank-workspace";
import {
  createTeacherQuestionTagMap,
  fetchTeacherOptionCatalog,
  deleteTeacherQuestionTagMap,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  fetchTeacherQuestionPage,
  fetchTeacherQuestionTags,
  fetchTeacherSubjects,
  fetchTeacherTopics,
  performTeacherQuestionBulkAction,
} from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

function asPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildQuestionBankQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === false) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function readLoadError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

async function applyQuestionBulkAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const action = String(formData.get("action") ?? "").trim();
  const questionIds = formData
    .getAll("question_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!action || questionIds.length === 0) {
    redirect("/teacher/question-bank?error=Select%20at%20least%20one%20question%20before%20running%20a%20bulk%20action.");
  }

  const payload: Record<string, unknown> = {
    action,
    question_ids: questionIds,
  };

  if (action === "set_difficulty") {
    const difficulty = String(formData.get("difficulty_level") ?? "").trim();
    if (!difficulty) {
      redirect("/teacher/question-bank?error=Choose%20a%20difficulty%20before%20running%20the%20bulk%20update.");
    }
    payload.difficulty_level = difficulty;
  }

  if (action === "set_topic") {
    const topic = String(formData.get("topic") ?? "").trim();
    if (!topic) {
      redirect("/teacher/question-bank?error=Choose%20a%20topic%20before%20running%20the%20bulk%20update.");
    }
    payload.topic = topic;
  }

  if (action === "attach_tag" || action === "remove_tag") {
    const tagId = String(formData.get("tag_id") ?? "").trim();
    if (!tagId) {
      redirect("/teacher/question-bank?error=Choose%20a%20tag%20before%20running%20the%20bulk%20tag%20action.");
    }

    try {
      const questions = await Promise.all(
        questionIds.map((questionId) => fetchTeacherQuestionDetail(questionId)),
      );

      if (action === "attach_tag") {
        await Promise.all(
          questions.map(async (question) => {
            const alreadyMapped = question.tag_maps.some((tagMap) => tagMap.tag === tagId);
            if (alreadyMapped) {
              return;
            }

            await createTeacherQuestionTagMap({
              question: question.id,
              tag: tagId,
              is_active: true,
            });
          }),
        );
      } else {
        const tagMapIds = questions
          .flatMap((question) => question.tag_maps)
          .filter((tagMap) => tagMap.tag === tagId)
          .map((tagMap) => tagMap.id);

        await Promise.all(tagMapIds.map((tagMapId) => deleteTeacherQuestionTagMap(tagMapId)));
      }

      redirect(
        `/teacher/question-bank?message=${encodeURIComponent(
          action === "attach_tag" ? "Selected questions were tagged." : "Selected tag was removed from matching questions.",
        )}`,
      );
    } catch (error) {
    unstable_rethrow(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to complete the bulk tag action right now.";
      redirect(`/teacher/question-bank?error=${encodeURIComponent(message)}`);
    }
  }

  try {
    await performTeacherQuestionBulkAction(payload);
    redirect(`/teacher/question-bank?message=${encodeURIComponent(`Bulk action "${action}" completed.`)}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to complete the question bulk action right now.";
    redirect(`/teacher/question-bank?error=${encodeURIComponent(message)}`);
  }
}

export default async function TeacherQuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTeacherSession();
  const resolvedSearchParams = await searchParams;

  const page = asPositiveInteger(readSingle(resolvedSearchParams.page), 1);
  const search = readSingle(resolvedSearchParams.search);
  const program = readSingle(resolvedSearchParams.program);
  const subject = readSingle(resolvedSearchParams.subject);
  const topic = readSingle(resolvedSearchParams.topic);
  const tag = readSingle(resolvedSearchParams.tag);
  const questionType = readSingle(resolvedSearchParams.question_type);
  const difficultyLevel = readSingle(resolvedSearchParams.difficulty_level);
  const ordering = readSingle(resolvedSearchParams.ordering) || "-created_at";
  const missingExplanation = readSingle(resolvedSearchParams.missing_explanation) === "true";
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);

  const bootstrapResults = await Promise.allSettled([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms(),
    fetchTeacherQuestionTags(),
  ]);

  const optionCatalogEntries =
    bootstrapResults[0].status === "fulfilled" ? bootstrapResults[0].value : [];
  const programs =
    bootstrapResults[1].status === "fulfilled" ? bootstrapResults[1].value : [];
  const tags =
    bootstrapResults[2].status === "fulfilled" ? bootstrapResults[2].value : [];
  const validProgram = programs.some((entry) => entry.id === program) ? program : "";
  const subjects = await fetchTeacherSubjects({
    program: validProgram || undefined,
  }).catch(() => []);

  const validSubject =
    validProgram && subjects.some((entry) => entry.id === subject) ? subject : "";
  const topics = await fetchTeacherTopics({
    subject: validSubject || undefined,
  }).catch(() => []);

  const validTopic =
    validSubject && topics.some((entry) => entry.id === topic) ? topic : "";

  if (program !== validProgram || subject !== validSubject || topic !== validTopic) {
    redirect(
      `/teacher/question-bank${buildQuestionBankQuery({
        page: 1,
        search: search || undefined,
        program: validProgram || undefined,
        subject: validSubject || undefined,
        topic: validTopic || undefined,
        tag: tag || undefined,
        question_type: questionType || undefined,
        difficulty_level: difficultyLevel || undefined,
        ordering,
        missing_explanation: missingExplanation || undefined,
        error: error || undefined,
        message: message || undefined,
      })}`,
    );
  }

  let loadIssue = "";
  const questionPage = await fetchTeacherQuestionPage({
    page,
    page_size: 20,
    search: search || undefined,
    program: validProgram || undefined,
    subject: validSubject || undefined,
    topic: validTopic || undefined,
    tag: tag || undefined,
    question_type: questionType || undefined,
    difficulty_level: difficultyLevel || undefined,
    ordering,
    missing_explanation: missingExplanation,
  }).catch((caughtError) => {
    loadIssue = readLoadError(
      caughtError,
      "Teacher question bank request failed before results could load.",
    );
    return null;
  });

  if (!questionPage) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
          title="Question Bank"
          description="This route depends on the live teacher-scoped question bank, academic lookup, and bulk action endpoints."
        />
        {loadIssue ? <p className="feedbackBanner feedbackBannerError">{loadIssue}</p> : null}
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question bank could not be loaded"
          description="The question bank workspace needs live question-bank and academic lookup endpoints, and the current request did not complete successfully."
          bullets={[
            "Teacher question bank endpoint",
            "Programs, subjects, and topics lookups",
            "Bulk question action support",
          ]}
          ctaHref="/teacher/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);
  const verifiedCount = questionPage.results.filter((question) => question.is_verified).length;
  const missingExplanationCount = questionPage.results.filter(
    (question) => !question.has_explanation,
  ).length;

  return (
    <div className="studentPage studentPageTight studentDashboardModern">
      <TeacherPageHeader
        action={
          <div className="questionBankButtonRow">
            <Link className="button buttonSecondary" href="/teacher/question-bank/import">
              Import CSV
            </Link>
            <Link className="button buttonPrimary" href="/teacher/question-bank/new">
              Create Question
            </Link>
          </div>
        }
        title="Question Bank"
        description="Search, filter, curate, and improve reusable assessment questions from one teacher-scoped workspace."
        statusLabel={`${questionPage.count} questions in current backend scope`}
        statusTone="live"
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="builderSummaryGrid">
        <article className="builderSummaryCard">
          <span>Total questions</span>
          <strong>{questionPage.count}</strong>
          <small>Current filtered inventory returned by the backend</small>
        </article>
        <article className="builderSummaryCard">
          <span>Published</span>
          <strong>{verifiedCount}</strong>
          <small>Verified questions ready for cleaner reuse across exams</small>
        </article>
        <article className="builderSummaryCard">
          <span>Missing explanation</span>
          <strong>{missingExplanationCount}</strong>
          <small>Teacher guidance content still needed on these items</small>
        </article>
        <article className="builderSummaryCard">
          <span>Academic scope</span>
          <strong>{subjects.length}</strong>
          <small>{topics.length} topic options across the current subject lane</small>
        </article>
      </section>

      <TeacherQuestionBankWorkspace
        key={[validProgram, validSubject, validTopic, search, tag, questionType, difficultyLevel, ordering, missingExplanation ? "1" : "0", page].join(":")}
        bulkAction={applyQuestionBulkAction}
        attachmentTypeLabelMap={optionCatalog.labelMap("question_attachment_type")}
        difficultyLabelMap={optionCatalog.labelMap("question_difficulty")}
        difficultyOptions={optionCatalog.selectOptions("question_difficulty")}
        filters={{
          search,
          program: validProgram,
          subject: validSubject,
          topic: validTopic,
          tag,
          question_type: questionType,
          difficulty_level: difficultyLevel,
          ordering,
          missing_explanation: missingExplanation ? "true" : "",
        }}
        hasNextPage={Boolean(questionPage.next)}
        hasPreviousPage={Boolean(questionPage.previous)}
        page={page}
        programs={programs}
        questionTypeLabelMap={optionCatalog.labelMap("question_type")}
        questionTypeOptions={optionCatalog.selectOptions("question_type")}
        questions={questionPage.results}
        subjects={subjects}
        tags={tags}
        topics={topics}
        totalCount={questionPage.count}
      />
    </div>
  );
}
