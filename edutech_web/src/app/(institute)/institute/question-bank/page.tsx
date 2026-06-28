import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { TeacherQuestionBankWorkspace } from "@/components/ui/teacher-question-bank-workspace";
import {
  createTeacherQuestionTagMap,
  deleteTeacherQuestionTagMap,
  fetchTeacherMasterQuestionLibrary,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  fetchTeacherQuestionPassagePage,
  fetchTeacherQuestionPage,
  fetchTeacherQuestionTags,
  fetchTeacherSubjects,
  fetchTeacherTopics,
  performTeacherQuestionBulkAction,
} from "@/lib/api/teacher-builder";
import { fetchPortalList } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

const QUESTION_BANK_SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY";

type InstituteQuestionFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
  source_package_name?: string | null;
};

type InstituteQuestionBankEntitlement = {
  id: string;
  status: string;
  question_bank_package_name: string;
  question_bank_package_code: string;
  question_bank_package_type: string;
  question_bank_package_ownership_type: string;
  question_bank_package_access_mode: string;
  subscription_plan_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  scope_summary: string[];
};

type TeacherOption = {
  id: string;
  full_name: string;
  employee_code: string;
  is_active: boolean;
};

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

function summarizeRichText(value: string | null | undefined, fallback: string) {
  const normalized = (value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function buildQuestionScopeFilters(params: {
  search: string;
  teacher: string;
  program: string;
  subject: string;
  topic: string;
  tag: string;
  questionType: string;
  difficultyLevel: string;
  missingExplanation: boolean;
}) {
  return {
    search: params.search || undefined,
    created_by_teacher: params.teacher || undefined,
    program: params.program || undefined,
    subject: params.subject || undefined,
    topic: params.topic || undefined,
    tag: params.tag || undefined,
    question_type: params.questionType || undefined,
    difficulty_level: params.difficultyLevel || undefined,
    missing_explanation: params.missingExplanation,
    page: 1,
    page_size: 1,
  };
}

function readLoadError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

async function applyQuestionBulkAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();

  const action = String(formData.get("action") ?? "").trim();
  const questionIds = formData
    .getAll("question_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!action || questionIds.length === 0) {
    redirect("/institute/question-bank?error=Select%20at%20least%20one%20question%20before%20running%20a%20bulk%20action.");
  }

  const payload: Record<string, unknown> = {
    action,
    question_ids: questionIds,
  };

  if (action === "set_difficulty") {
    const difficulty = String(formData.get("difficulty_level") ?? "").trim();
    if (!difficulty) {
      redirect("/institute/question-bank?error=Choose%20a%20difficulty%20before%20running%20the%20bulk%20update.");
    }
    payload.difficulty_level = difficulty;
  }

  if (action === "set_topic") {
    const topic = String(formData.get("topic") ?? "").trim();
    if (!topic) {
      redirect("/institute/question-bank?error=Choose%20a%20topic%20before%20running%20the%20bulk%20update.");
    }
    payload.topic = topic;
  }

  if (action === "attach_tag" || action === "remove_tag") {
    const tagId = String(formData.get("tag_id") ?? "").trim();
    if (!tagId) {
      redirect("/institute/question-bank?error=Choose%20a%20tag%20before%20running%20the%20bulk%20tag%20action.");
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
        `/institute/question-bank?message=${encodeURIComponent(
          action === "attach_tag" ? "Selected questions were tagged." : "Selected tag was removed from matching questions.",
        )}`,
      );
    } catch (error) {
    unstable_rethrow(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to complete the bulk tag action right now.";
      redirect(`/institute/question-bank?error=${encodeURIComponent(message)}`);
    }
  }

  try {
    await performTeacherQuestionBulkAction(payload);
    redirect(`/institute/question-bank?message=${encodeURIComponent(`Bulk action "${action}" completed.`)}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to complete the question bulk action right now.";
    redirect(`/institute/question-bank?error=${encodeURIComponent(message)}`);
  }
}

export default async function InstituteQuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;

  const page = asPositiveInteger(readSingle(resolvedSearchParams.page), 1);
  const search = readSingle(resolvedSearchParams.search);
  const program = readSingle(resolvedSearchParams.program);
  const subject = readSingle(resolvedSearchParams.subject);
  const topic = readSingle(resolvedSearchParams.topic);
  const teacher = readSingle(resolvedSearchParams.teacher);
  const tag = readSingle(resolvedSearchParams.tag);
  const questionType = readSingle(resolvedSearchParams.question_type);
  const difficultyLevel = readSingle(resolvedSearchParams.difficulty_level);
  const ordering = readSingle(resolvedSearchParams.ordering) || "-created_at";
  const missingExplanation = readSingle(resolvedSearchParams.missing_explanation) === "true";
  const qualitySignal = readSingle(resolvedSearchParams.quality_signal);
  const revisionPriority = readSingle(resolvedSearchParams.revision_priority);
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);

  const bootstrapResults = await Promise.allSettled([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms(),
    fetchTeacherQuestionTags(),
    fetchTeacherQuestionPassagePage({ page_size: 20 }),
    fetchPortalList<TeacherOption>(
      `/api/v1/teachers/${profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100"}`,
    ),
    fetchPortalList<InstituteQuestionBankEntitlement>(
      "/api/v1/economy/admin/institute-question-bank-entitlements/",
    ),
    fetchPortalList<InstituteQuestionFeatureEntitlement>(
      "/api/v1/economy/admin/institute-question-bank-feature-entitlements/",
    ),
  ]);

  const optionCatalogResult = bootstrapResults[0];
  const programsResult = bootstrapResults[1];
  const tagsResult = bootstrapResults[2];
  const passageResult = bootstrapResults[3];
  const teachersResult = bootstrapResults[4];
  const entitlementsResult = bootstrapResults[5];

  const optionCatalogEntries =
    optionCatalogResult.status === "fulfilled" ? optionCatalogResult.value : [];
  const programs = programsResult.status === "fulfilled" ? programsResult.value : [];
  const tags = tagsResult.status === "fulfilled" ? tagsResult.value : [];
  const passagePage = passageResult.status === "fulfilled" ? passageResult.value : null;
  const teachers = teachersResult.status === "fulfilled" ? teachersResult.value : [];
  const questionBankEntitlements =
    entitlementsResult.status === "fulfilled" ? entitlementsResult.value : [];
  const featureEntitlements =
    bootstrapResults[6].status === "fulfilled" ? bootstrapResults[6].value : [];
  const hasSharedLibraryAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_SHARED_LIBRARY_FEATURE_CODE &&
      entitlement.status === "active",
  );
  const validTeacher = teachers.some((entry) => entry.id === teacher) ? teacher : "";
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
  const selectedSubjectRecord = subjects.find((entry) => entry.id === validSubject) ?? null;
  const selectedTopicRecord = topics.find((entry) => entry.id === validTopic) ?? null;

  if (
    teacher !== validTeacher ||
    program !== validProgram ||
    subject !== validSubject ||
    topic !== validTopic
  ) {
    redirect(
      `/institute/question-bank${buildQuestionBankQuery({
        page: 1,
        search: search || undefined,
        teacher: validTeacher || undefined,
        program: validProgram || undefined,
        subject: validSubject || undefined,
        topic: validTopic || undefined,
        tag: tag || undefined,
        question_type: questionType || undefined,
        difficulty_level: difficultyLevel || undefined,
        quality_signal: qualitySignal || undefined,
        revision_priority: revisionPriority || undefined,
        ordering,
        missing_explanation: missingExplanation || undefined,
        error: error || undefined,
        message: message || undefined,
      })}`,
    );
  }

  const questionPageResult = await fetchTeacherQuestionPage({
    page,
    page_size: 20,
    search: search || undefined,
    created_by_teacher: validTeacher || undefined,
    program: validProgram || undefined,
    subject: validSubject || undefined,
    topic: validTopic || undefined,
    tag: tag || undefined,
    question_type: questionType || undefined,
    difficulty_level: difficultyLevel || undefined,
    quality_signal: qualitySignal || undefined,
    revision_priority: revisionPriority || undefined,
    ordering,
    missing_explanation: missingExplanation,
  })
    .then((data) => ({ data, error: "" }))
    .catch((caughtError) => ({
      data: null,
      error: readLoadError(
        caughtError,
        "Institute question bank request failed before results could load.",
      ),
    }));
  const questionPage = questionPageResult.data;
  const loadIssue = questionPageResult.error;

  const masterLibraryResult = hasSharedLibraryAccess
    ? await fetchTeacherMasterQuestionLibrary({
        page: 1,
        page_size: 8,
        search: search || undefined,
        subject_code: selectedSubjectRecord?.code ?? undefined,
        topic_code: selectedTopicRecord?.code ?? undefined,
        question_type: questionType || undefined,
        difficulty_level: difficultyLevel || undefined,
        ordering,
      })
        .then((data) => ({ data, error: "" }))
        .catch((caughtError) => ({
          data: null,
          error: readLoadError(
            caughtError,
            "Shared platform library could not be loaded right now.",
          ),
        }))
    : { data: null, error: "" };
  const masterLibraryPage = masterLibraryResult.data;
  const masterLibraryLoadError = masterLibraryResult.error;
  const sharedLibraryDisabledMessage = hasSharedLibraryAccess
    ? ""
    : "Shared platform library is not enabled for this institute subscription yet.";

  if (!questionPage) {
    return (
      <div className="studentPage">
        <InstitutePageHeader
          title="Question Bank"
          description="This route depends on the live institute-scoped question bank, academic lookup, and bulk action endpoints."
        />
        {loadIssue ? <p className="feedbackBanner feedbackBannerError">{loadIssue}</p> : null}
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question bank could not be loaded"
          description="The institute question bank workspace needs live question-bank and academic lookup endpoints, and the current request did not complete successfully."
          bullets={[
            "Institute question bank endpoint",
            "Programs, subjects, and topics lookups",
            "Bulk question action support",
          ]}
          ctaHref="/institute/dashboard"
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
  const scopeFilters = buildQuestionScopeFilters({
    search,
    teacher: validTeacher,
    program: validProgram,
    subject: validSubject,
    topic: validTopic,
    tag,
    questionType,
    difficultyLevel,
    missingExplanation: missingExplanation,
  });
  const qualitySummaryResults = await Promise.allSettled([
    fetchTeacherQuestionPage({ ...scopeFilters, revision_priority: "high" }),
    fetchTeacherQuestionPage({ ...scopeFilters, quality_signal: "ambiguous" }),
    fetchTeacherQuestionPage({ ...scopeFilters, quality_signal: "skip_risk" }),
    fetchTeacherQuestionPage({ ...scopeFilters, quality_signal: "emerging" }),
  ]);
  const highPriorityRevisionCount =
    qualitySummaryResults[0].status === "fulfilled" ? qualitySummaryResults[0].value.count : 0;
  const ambiguousCount =
    qualitySummaryResults[1].status === "fulfilled" ? qualitySummaryResults[1].value.count : 0;
  const skipRiskCount =
    qualitySummaryResults[2].status === "fulfilled" ? qualitySummaryResults[2].value.count : 0;
  const emergingCount =
    qualitySummaryResults[3].status === "fulfilled" ? qualitySummaryResults[3].value.count : 0;

  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage questionBankPageVivid">
      <InstitutePageHeader
        action={
          <div className="questionBankButtonRow">
            <Link className="button buttonSecondary" href="/institute/question-bank/import">
              Import Questions CSV
            </Link>
            <Link className="button buttonSecondary" href="/institute/question-bank/comprehension/import">
              Import Comprehension CSV
            </Link>
            <Link className="button buttonSecondary" href="/institute/question-bank/comprehension/new">
              Create Comprehension Set
            </Link>
            <Link className="button buttonPrimary" href="/institute/question-bank/new">
              Create Question
            </Link>
          </div>
        }
        title="Question Bank"
        description="Search, filter, curate, and improve reusable assessment questions from one institute-scoped workspace."
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="builderSummaryGrid questionBankSummaryGridCompact">
        <article className="builderSummaryCard">
          <span>Total questions</span>
          <strong>{questionPage.count}</strong>
          <small>Current filtered inventory returned by the backend</small>
        </article>
        <article className="builderSummaryCard">
          <span>Published</span>
          <strong>{verifiedCount}</strong>
          <small>Verified questions ready for cleaner institutional reuse</small>
        </article>
        <article className="builderSummaryCard">
          <span>Missing explanation</span>
          <strong>{missingExplanationCount}</strong>
          <small>Guidance content still needed on these items</small>
        </article>
        <article className="builderSummaryCard">
          <span>Academic scope</span>
          <strong>{subjects.length}</strong>
          <small>{topics.length} topic options across the current subject lane</small>
        </article>
        <article className="builderSummaryCard">
          <span>Comprehension sets</span>
          <strong>{passagePage?.count ?? 0}</strong>
          <small>Shared passages available for linked question authoring</small>
        </article>
        <article className="builderSummaryCard">
          <span>Revision queue</span>
          <strong>{highPriorityRevisionCount}</strong>
          <small>High-priority questions across the current institute scope that need editorial cleanup</small>
        </article>
        <article className="builderSummaryCard">
          <span>Ambiguous items</span>
          <strong>{ambiguousCount}</strong>
          <small>Questions where wrong and skip behavior suggests wording or distractor problems</small>
        </article>
        <article className="builderSummaryCard">
          <span>Skip risk</span>
          <strong>{skipRiskCount}</strong>
          <small>Questions students defer often and may need simpler phrasing or stronger scaffolds</small>
        </article>
        <article className="builderSummaryCard">
          <span>Emerging data</span>
          <strong>{emergingCount}</strong>
          <small>Questions with early response volume that should be monitored before heavy edits</small>
        </article>
      </section>

      {passagePage?.results?.length ? (
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Recent comprehension sets</strong>
            <span>{passagePage.count} in current institute scope</span>
          </div>
          <div className="questionBankList">
            {passagePage.results.slice(0, 4).map((passage) => (
              <article className="questionBankCard" key={passage.id}>
                <div className="questionBankCardHeader">
                  <div className="questionBankCardCopy">
                    <strong>{passage.title}</strong>
                    <div className="questionBankChipRow">
                      <span className="questionBankMetaChip">{passage.content_format}</span>
                      <span className="questionBankMetaChip">{passage.linked_question_count} linked</span>
                    </div>
                  </div>
                </div>
                <div className="questionBankCardFooter">
                  <div className="questionBankCardMetaNote">
                    <span>{summarizeRichText(passage.description, "No institute note added yet.")}</span>
                  </div>
                  <div className="questionBankCardActions">
                    <Link className="button buttonSecondary" href={`/institute/question-bank/comprehension/${passage.id}`}>
                      Open Set
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <TeacherQuestionBankWorkspace
        key={[validProgram, validSubject, validTopic, search, tag, questionType, difficultyLevel, qualitySignal, revisionPriority, ordering, missingExplanation ? "1" : "0", page].join(":")}
        attachmentTypeLabelMap={optionCatalog.labelMap("question_attachment_type")}
        basePath="/institute/question-bank"
        bulkAction={applyQuestionBulkAction}
        difficultyLabelMap={optionCatalog.labelMap("question_difficulty")}
        difficultyOptions={optionCatalog.selectOptions("question_difficulty")}
        featureEntitlements={featureEntitlements}
        filters={{
          search,
          teacher: validTeacher,
          program: validProgram,
          subject: validSubject,
          topic: validTopic,
          tag,
          question_type: questionType,
          difficulty_level: difficultyLevel,
          quality_signal: qualitySignal,
          revision_priority: revisionPriority,
          ordering,
          missing_explanation: missingExplanation ? "true" : "",
        }}
        hasNextPage={Boolean(questionPage.next)}
        hasPreviousPage={Boolean(questionPage.previous)}
        canLinkSharedLibrary={hasSharedLibraryAccess}
        sharedLibraryMode="direct_link"
        masterLibraryLoadError={masterLibraryLoadError}
        masterLibraryQuestions={masterLibraryPage?.results ?? []}
        sharedLibraryDisabledMessage={sharedLibraryDisabledMessage}
        page={page}
        programs={programs}
        previewThemeClass="questionPreviewGlossy"
        questionBankEntitlements={questionBankEntitlements}
        questionTypeLabelMap={optionCatalog.labelMap("question_type")}
        questionTypeOptions={optionCatalog.selectOptions("question_type")}
        questions={questionPage.results}
        storageKeyPrefix="institute-question-bank"
        subjects={subjects}
        tags={tags}
        teachers={teachers}
        topics={topics}
        totalCount={questionPage.count}
      />
    </div>
  );
}
