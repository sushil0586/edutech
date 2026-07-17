import dynamic from "next/dynamic";
import { Suspense } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { OperatorRoutePrefetcher } from "@/components/ui/operator-route-prefetcher";
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
import {
  fetchInstituteQuestionBankEntitlementsCached,
  fetchInstituteQuestionBankFeatureEntitlementsCached,
} from "@/lib/api/portal";
import { requireTeacherSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

const TeacherQuestionBankWorkspace = dynamic(
  () =>
    import("@/components/ui/teacher-question-bank-workspace").then((module) => ({
      default: module.TeacherQuestionBankWorkspace,
    })),
  {
    loading: () => (
      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Loading question tools</strong>
          <span>Filters, previews, and bulk actions are loading now.</span>
        </div>
      </section>
    ),
  },
);

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

function TeacherQuestionBankLoadingShell() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage questionBankPageVivid">
      <TeacherPageHeader
        title="Question Bank"
        description="Search, filter, and improve reusable questions from one teacher view."
        statusLabel="Loading question scope"
        statusTone="live"
      />

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Find questions faster</strong>
          <span>Filters, inventory, and access details are loading now.</span>
        </div>
      </section>
    </div>
  );
}

async function TeacherQuestionBankPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireTeacherSession();
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
  const qualitySignal = readSingle(resolvedSearchParams.quality_signal);
  const revisionPriority = readSingle(resolvedSearchParams.revision_priority);
  const libraryPage = asPositiveInteger(readSingle(resolvedSearchParams.library_page), 1);
  const libraryPageSize = asPositiveInteger(readSingle(resolvedSearchParams.library_page_size), 24);
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);
  const questionPagePromise = fetchTeacherQuestionPage({
    page,
    page_size: 20,
    search: search || undefined,
    program: program || undefined,
    subject: subject || undefined,
    topic: topic || undefined,
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
        "Teacher question bank request failed before results could load.",
      ),
    }));

  const bootstrapResults = await Promise.allSettled([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms({ institute: profile.institute || undefined }),
    fetchTeacherQuestionTags(),
    fetchInstituteQuestionBankEntitlementsCached<InstituteQuestionBankEntitlement>(),
    fetchInstituteQuestionBankFeatureEntitlementsCached<InstituteQuestionFeatureEntitlement>(),
  ]);

  const optionCatalogEntries =
    bootstrapResults[0].status === "fulfilled" ? bootstrapResults[0].value : [];
  const programs =
    bootstrapResults[1].status === "fulfilled" ? bootstrapResults[1].value : [];
  const tags =
    bootstrapResults[2].status === "fulfilled" ? bootstrapResults[2].value : [];
  const questionBankEntitlements =
    bootstrapResults[3].status === "fulfilled" ? bootstrapResults[3].value : [];
  const featureEntitlements =
    bootstrapResults[4].status === "fulfilled" ? bootstrapResults[4].value : [];
  const hasSharedLibraryAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_SHARED_LIBRARY_FEATURE_CODE &&
      entitlement.status === "active",
  );
  const validProgram = programs.some((entry) => entry.id === program) ? program : "";
  const subjects = validProgram
    ? await fetchTeacherSubjects({
        program: validProgram,
      }).catch(() => [])
    : [];

  const validSubject =
    validProgram && subjects.some((entry) => entry.id === subject) ? subject : "";
  const topics = validSubject
    ? await fetchTeacherTopics({
        subject: validSubject,
      }).catch(() => [])
    : [];

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
        quality_signal: qualitySignal || undefined,
        revision_priority: revisionPriority || undefined,
        ordering,
        missing_explanation: missingExplanation || undefined,
        error: error || undefined,
        message: message || undefined,
      })}`,
    );
  }

  const questionPageResult =
    program === validProgram && subject === validSubject && topic === validTopic
      ? await questionPagePromise
      : await fetchTeacherQuestionPage({
          page,
          page_size: 20,
          search: search || undefined,
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
              "Teacher question bank request failed before results could load.",
            ),
          }));
  const questionPage = questionPageResult.data;
  const loadIssue = questionPageResult.error;
  const sharedLibraryDisabledMessage = hasSharedLibraryAccess
    ? ""
    : "Platform question intake is still turned off for this institute, so teachers can only work with local questions here.";

  if (!questionPage) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
        title="Question Bank"
        description="This page needs live question bank, academic lookup, and bulk action services."
      />
        {loadIssue ? <p className="feedbackBanner feedbackBannerError">{loadIssue}</p> : null}
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question bank could not be loaded"
          description="The question bank needs live question bank and academic lookup services, and this request did not complete successfully."
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
  const visibleHighPriorityRevisionCount = questionPage.results.filter(
    (question) => question.revision_priority === "high" || question.revision_priority === "urgent",
  ).length;
  const visibleAmbiguousCount = questionPage.results.filter(
    (question) => question.quality_signal === "ambiguous",
  ).length;
  const visibleSkipRiskCount = questionPage.results.filter(
    (question) => question.quality_signal === "skip_risk",
  ).length;
  const visibleEmergingCount = questionPage.results.filter(
    (question) => question.quality_signal === "emerging",
  ).length;

  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage questionBankPageVivid">
      <OperatorRoutePrefetcher
        hrefs={[
          "/teacher/question-bank/new",
          "/teacher/question-bank/import",
          "/teacher/question-bank/comprehension/import",
          "/teacher/question-bank/comprehension/new",
        ]}
      />

      <TeacherPageHeader
        action={
          <div className="questionBankButtonRow">
            <Link className="button buttonSecondary" href="/teacher/question-bank/import">
              Import Questions
            </Link>
            <Link className="button buttonSecondary" href="/teacher/question-bank/comprehension/import">
              Import Comprehension
            </Link>
            <Link className="button buttonSecondary" href="/teacher/question-bank/comprehension/new">
              New Comprehension Set
            </Link>
            <Link className="button buttonPrimary" href="/teacher/question-bank/new" prefetch>
              New Question
            </Link>
          </div>
        }
        title="Question Bank"
        description="Search, filter, and improve reusable assessment questions from one teacher view."
        statusLabel={`${questionPage.count} questions in current backend scope`}
        statusTone="live"
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>How licensed platform questions work here</strong>
          <span>
            This panel answers three operator questions quickly: can teachers see platform questions,
            can they act on them, and who owns the final linking step.
          </span>
        </div>
        <div className="economyAccessChecklist">
          <div
            className={`economyAccessChecklistCard ${
              hasSharedLibraryAccess ? "economyAccessChecklistCardReady" : "economyAccessChecklistCardAttention"
            }`}
          >
            <span>Shared-library switch</span>
            <strong>
              {hasSharedLibraryAccess
                ? "Platform question visibility is enabled"
                : "Platform question visibility is still locked"}
            </strong>
            <small>
              {hasSharedLibraryAccess
                ? "Teachers can review platform-backed rows only when the institute package lane also matches the current class and subject."
                : "This is an institute-level switch. If support expects platform questions here, ask the institute admin or platform team to enable intake first."}
            </small>
          </div>
          <div
            className={`economyAccessChecklistCard ${
              questionBankEntitlements.length > 0
                ? "economyAccessChecklistCardReady"
                : "economyAccessChecklistCardAttention"
            }`}
          >
            <span>Question package access</span>
            <strong>
              {questionBankEntitlements.length > 0
                ? `${questionBankEntitlements.length} active question package${
                    questionBankEntitlements.length === 1 ? "" : "s"
                  }`
                : "No active question package visible"}
            </strong>
            <small>
              {questionBankEntitlements.length > 0
                ? "A matching package means teachers can inspect the licensed lane and raise the right request for the current class and subject."
                : "Even with the switch on, teachers will not see licensed questions until an institute package covers this academic lane."}
            </small>
          </div>
          <div
            className={`economyAccessChecklistCard ${
              hasSharedLibraryAccess && questionBankEntitlements.length > 0
                ? "economyAccessChecklistCardReady"
                : "economyAccessChecklistCardAttention"
            }`}
          >
            <span>Teacher action path</span>
            <strong>
              {hasSharedLibraryAccess && questionBankEntitlements.length > 0
                ? "Request-led teacher lane is ready"
                : "Teacher request flow is not ready yet"}
            </strong>
            <small>
              Teachers do not perform the final link here. When the switch and package are ready, the
              teacher lane stays request-only and the institute admin still approves or performs the intake step.
            </small>
          </div>
        </div>
      </section>

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
        <article className="builderSummaryCard">
          <span>Comprehension tools</span>
          <strong>Ready</strong>
          <small>Create or import passage-backed sets from the authoring actions above</small>
        </article>
        <article className="builderSummaryCard">
          <span>Visible revision queue</span>
          <strong>{visibleHighPriorityRevisionCount}</strong>
          <small>High-priority items visible on the current page without extra background counting</small>
        </article>
        <article className="builderSummaryCard">
          <span>Visible ambiguous items</span>
          <strong>{visibleAmbiguousCount}</strong>
          <small>Current-page questions whose response patterns suggest unclear wording or options</small>
        </article>
        <article className="builderSummaryCard">
          <span>Visible skip risk</span>
          <strong>{visibleSkipRiskCount}</strong>
          <small>Current-page questions students may be skipping often enough to need editorial review</small>
        </article>
        <article className="builderSummaryCard">
          <span>Visible emerging data</span>
          <strong>{visibleEmergingCount}</strong>
          <small>Current-page questions with limited response history and lower editorial confidence</small>
        </article>
      </section>

      <TeacherQuestionBankWorkspace
        key={[validProgram, validSubject, validTopic, search, tag, questionType, difficultyLevel, qualitySignal, revisionPriority, ordering, missingExplanation ? "1" : "0", page].join(":")}
        bulkAction={applyQuestionBulkAction}
        attachmentTypeLabelMap={optionCatalog.labelMap("question_attachment_type")}
        difficultyLabelMap={optionCatalog.labelMap("question_difficulty")}
        difficultyOptions={optionCatalog.selectOptions("question_difficulty")}
        featureEntitlements={featureEntitlements}
        instituteId={profile.institute || undefined}
        filters={{
          search,
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
        canLinkSharedLibrary={false}
        sharedLibraryMode="request_only"
        deferMasterLibraryBootstrap={hasSharedLibraryAccess}
        masterLibraryPage={libraryPage}
        masterLibraryPageSize={libraryPageSize}
        sharedLibraryDisabledMessage={sharedLibraryDisabledMessage}
        page={page}
        programs={programs}
        questionBankEntitlements={questionBankEntitlements}
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

export default function TeacherQuestionBankPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<TeacherQuestionBankLoadingShell />}>
      <TeacherQuestionBankPageContent {...props} />
    </Suspense>
  );
}
