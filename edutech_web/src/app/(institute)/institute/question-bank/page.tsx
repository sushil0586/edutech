import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { TeacherQuestionBankWorkspace } from "@/components/ui/teacher-question-bank-workspace";
import {
  createTeacherQuestionTagMap,
  deleteTeacherQuestionTagMap,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  type MasterQuestionLibraryPage,
  type LookupSubject,
  type LookupTopic,
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

function clampMasterLibraryPageSize(value: string | undefined, fallback: number) {
  const parsed = asPositiveInteger(value, fallback);
  const allowedSizes = new Set([8, 24, 50, 100]);
  return allowedSizes.has(parsed) ? parsed : fallback;
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

function buildHref(path: string, params: Record<string, string | number | boolean | undefined>) {
  return `${path}${buildQuestionBankQuery(params)}`;
}

function summarizePreview(items: string[], singularLabel: string, pluralLabel: string) {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  return `${items[0]} +${items.length - 1} more ${items.length - 1 === 1 ? singularLabel : pluralLabel}`;
}

function readLoadError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

async function applyQuestionBulkAction(formData: FormData) {
  "use server";

  await requireInstituteAdminSession();
  const returnPath =
    String(formData.get("return_path") ?? "/institute/question-bank").trim() ||
    "/institute/question-bank";

  const action = String(formData.get("action") ?? "").trim();
  const questionIds = formData
    .getAll("question_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (!action || questionIds.length === 0) {
    redirect(`${returnPath}?error=Select%20at%20least%20one%20question%20before%20running%20a%20bulk%20action.`);
  }

  const payload: Record<string, unknown> = {
    action,
    question_ids: questionIds,
  };

  if (action === "set_difficulty") {
    const difficulty = String(formData.get("difficulty_level") ?? "").trim();
    if (!difficulty) {
      redirect(`${returnPath}?error=Choose%20a%20difficulty%20before%20running%20the%20bulk%20update.`);
    }
    payload.difficulty_level = difficulty;
  }

  if (action === "set_topic") {
    const topic = String(formData.get("topic") ?? "").trim();
    if (!topic) {
      redirect(`${returnPath}?error=Choose%20a%20topic%20before%20running%20the%20bulk%20update.`);
    }
    payload.topic = topic;
  }

  if (action === "attach_tag" || action === "remove_tag") {
    const tagId = String(formData.get("tag_id") ?? "").trim();
    if (!tagId) {
      redirect(`${returnPath}?error=Choose%20a%20tag%20before%20running%20the%20bulk%20tag%20action.`);
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
        `${returnPath}?message=${encodeURIComponent(
          action === "attach_tag" ? "Selected questions were tagged." : "Selected tag was removed from matching questions.",
        )}`,
      );
    } catch (error) {
    unstable_rethrow(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to complete the bulk tag action right now.";
      redirect(`${returnPath}?error=${encodeURIComponent(message)}`);
    }
  }

  try {
    await performTeacherQuestionBulkAction(payload);
    redirect(`${returnPath}?message=${encodeURIComponent(`Bulk action "${action}" completed.`)}`);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to complete the question bulk action right now.";
    redirect(`${returnPath}?error=${encodeURIComponent(message)}`);
  }
}

export async function InstituteQuestionBankPageView({
  searchParams,
  linkedOnly = false,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  linkedOnly?: boolean;
}) {
  const profile = await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;
  const routeBasePath = linkedOnly ? "/institute/question-bank/linked" : "/institute/question-bank";

  const page = asPositiveInteger(readSingle(resolvedSearchParams.page), 1);
  const masterLibraryPageNumber = asPositiveInteger(readSingle(resolvedSearchParams.library_page), 1);
  const masterLibraryPageSize = clampMasterLibraryPageSize(
    readSingle(resolvedSearchParams.library_page_size),
    24,
  );
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
  const sourceState = linkedOnly ? "linked" : readSingle(resolvedSearchParams.source_state);

  const bootstrapResults = await Promise.allSettled([
    fetchTeacherOptionCatalog(),
    fetchTeacherPrograms(),
    fetchTeacherQuestionTags(),
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
  const teachersResult = bootstrapResults[3];
  const entitlementsResult = bootstrapResults[4];

  const optionCatalogEntries = asArray(
    optionCatalogResult.status === "fulfilled" ? optionCatalogResult.value : [],
  );
  const programs = asArray(
    programsResult.status === "fulfilled" ? programsResult.value : [],
  );
  const tags = asArray(
    tagsResult.status === "fulfilled" ? tagsResult.value : [],
  );
  const teachers = asArray(
    teachersResult.status === "fulfilled" ? teachersResult.value : [],
  );
  const questionBankEntitlements = asArray(
    entitlementsResult.status === "fulfilled" ? entitlementsResult.value : [],
  );
  const featureEntitlements = asArray(
    bootstrapResults[5].status === "fulfilled" ? bootstrapResults[5].value : [],
  );
  const hasSharedLibraryAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_SHARED_LIBRARY_FEATURE_CODE &&
      entitlement.status === "active",
  );
  const validTeacher = teachers.some((entry) => entry.id === teacher) ? teacher : "";
  const validProgram = programs.some((entry) => entry.id === program) ? program : "";
  const subjects = asArray(await fetchTeacherSubjects({
    program: validProgram || undefined,
  }).catch(() => [] as LookupSubject[]));

  const validSubject =
    validProgram && subjects.some((entry) => entry.id === subject) ? subject : "";
  const topics = asArray(await fetchTeacherTopics({
    subject: validSubject || undefined,
  }).catch(() => [] as LookupTopic[]));

  const validTopic =
    validSubject && topics.some((entry) => entry.id === topic) ? topic : "";

  if (
    teacher !== validTeacher ||
    program !== validProgram ||
    subject !== validSubject ||
    topic !== validTopic
  ) {
    redirect(
      `${routeBasePath}${buildQuestionBankQuery({
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
        source_state: sourceState || undefined,
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
    source_state: sourceState || undefined,
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

  const masterLibraryResult: { data: MasterQuestionLibraryPage | null; error: string } = {
    data: null,
    error: "",
  };
  const masterLibraryPage = masterLibraryResult.data;
  const masterLibraryLoadError = masterLibraryResult.error;
  const sharedLibraryDisabledMessage = hasSharedLibraryAccess
    ? ""
    : "Shared platform library is not enabled for this institute subscription yet.";
  const sharedLibraryLinkerHref = `/institute/question-bank/library-linker${buildQuestionBankQuery({
    program: validProgram || undefined,
    subject: validSubject || undefined,
    topic: validTopic || undefined,
  })}`;

  if (!questionPage) {
    return (
      <div className="studentPage">
        <InstitutePageHeader
          title={linkedOnly ? "Linked Questions" : "Question Bank"}
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
  const questionResults = asArray(questionPage.results);
  const verifiedCount = questionResults.filter((question) => question.is_verified).length;
  const missingExplanationCount = questionResults.filter(
    (question) => !question.has_explanation,
  ).length;
  const highPriorityRevisionCount = questionResults.filter(
    (question) => question.revision_priority === "high",
  ).length;
  const ambiguousCount = questionResults.filter(
    (question) => question.quality_signal === "ambiguous",
  ).length;
  const skipRiskCount = questionResults.filter(
    (question) => question.quality_signal === "skip_risk",
  ).length;
  const emergingCount = questionResults.filter(
    (question) => question.quality_signal === "emerging",
  ).length;
  const linkedAccessActiveCount = questionResults.filter(
    (question) => question.is_shared_library_link && question.shared_library_access_active === true,
  ).length;
  const linkedAccessPausedCount = questionResults.filter(
    (question) => question.is_shared_library_link && question.shared_library_access_active === false,
  ).length;
  const linkedVerifiedCount = questionResults.filter(
    (question) => question.is_shared_library_link && question.is_verified,
  ).length;
  const linkedMissingExplanationCount = questionResults.filter(
    (question) => question.is_shared_library_link && !question.has_explanation,
  ).length;
  const activeQuestionBankEntitlements = questionBankEntitlements.filter(
    (entitlement) => entitlement.status === "active",
  );
  const activeFeatureEntitlements = featureEntitlements.filter(
    (entitlement) => entitlement.status === "active",
  );
  const currentProgramLabel =
    programs.find((entry) => entry.id === validProgram)?.name || "All classes";
  const currentSubjectLabel =
    subjects.find((entry) => entry.id === validSubject)?.name || "All subjects";
  const currentTopicLabel =
    topics.find((entry) => entry.id === validTopic)?.name || "All topics";
  const packageScopePreview = activeQuestionBankEntitlements
    .flatMap((entitlement) => asArray(entitlement.scope_summary))
    .filter(Boolean)
    .slice(0, 2);
  const packageNamePreview = activeQuestionBankEntitlements
    .map((entitlement) => entitlement.question_bank_package_name)
    .filter(Boolean)
    .slice(0, 2);
  const featureNamePreview = activeFeatureEntitlements
    .map((entitlement) =>
      entitlement.source_package_name
        ? `${entitlement.feature_code} · ${entitlement.source_package_name}`
        : entitlement.feature_code,
    )
    .slice(0, 2);
  const packagePreviewLabel = summarizePreview(packageNamePreview, "package", "packages");
  const featurePreviewLabel = summarizePreview(featureNamePreview, "feature", "features");
  const packageScopeLabel = summarizePreview(packageScopePreview, "scope lane", "scope lanes");
  const linkedRowsOnThisPage = questionResults.length;
  const activePackageCoverageLabel =
    packageScopeLabel ||
    (activeQuestionBankEntitlements.length > 0
      ? `${activeQuestionBankEntitlements.length} active package lane${
          activeQuestionBankEntitlements.length === 1 ? "" : "s"
        }`
      : "No active package coverage");
  const linkedInventoryReady = linkedOnly ? questionPage.count > 0 : linkedAccessActiveCount > 0;
  const accessStepOneLabel = hasSharedLibraryAccess ? "Ready" : "Blocked";
  const accessStepTwoLabel = activeQuestionBankEntitlements.length > 0 ? "Ready" : "Missing";
  const accessStepThreeLabel = linkedInventoryReady ? "Ready" : linkedOnly ? "Empty" : "Pending review";
  const operatorNextStepTitle = !hasSharedLibraryAccess
    ? "Next step: ask the platform team to enable platform question intake"
    : activeQuestionBankEntitlements.length === 0
      ? "Next step: attach a question package for the required class and subject"
      : linkedOnly && questionPage.count === 0
        ? "Next step: open the Shared Library Linker and bring questions into this institute bank"
        : linkedOnly
          ? "Current status: linked platform questions are already available for review and exam use"
          : "Current status: platform question access is active and your team can switch lanes as needed";
  const operatorNextStepDescription = !hasSharedLibraryAccess
    ? "Until the intake switch is enabled, this institute cannot bring new platform questions into its bank."
    : activeQuestionBankEntitlements.length === 0
      ? "The intake switch is already on, but no package currently gives this institute academic coverage for platform questions."
      : linkedOnly && questionPage.count === 0
        ? "Package access exists, but no linked questions have been brought into the current filtered bank yet."
        : linkedOnly
          ? "Stay in Linked Questions for filtering, preview, and exam reuse. Open the linker only when this stock is not enough."
          : "Stay in the local lane for editing institute-owned rows. Open Linked Questions or the linker only when you need platform-backed stock.";
  const accessChainGuidance = !hasSharedLibraryAccess
    ? "This institute cannot add new platform questions yet because the shared library switch is still off."
    : activeQuestionBankEntitlements.length === 0
      ? "The shared library switch is on, but no active question package is visible for this institute yet."
      : linkedOnly
        ? "Platform question access is active. Stay here to review questions already added into the institute bank, or open the linker only when this stock is not enough."
        : "Platform question access is active. Open Linked Questions to use what is already inside the institute bank, or open the linker when more questions are needed.";

  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage questionBankPageVivid">
      <InstitutePageHeader
        action={
          <div className="questionBankButtonRow">
            <Link className="button buttonSecondary" href={sharedLibraryLinkerHref}>
              Open Shared Library Linker
            </Link>
            {linkedOnly ? (
              <Link className="button buttonSecondary" href="/institute/question-bank">
                Open Local Question Bank
              </Link>
            ) : (
              <>
                <Link className="button buttonSecondary" href="/institute/question-bank/linked">
                  Open Linked Questions
                </Link>
                <Link className="button buttonSecondary" href="/institute/question-bank/import">
                  Import Questions CSV
                </Link>
                <Link className="button buttonSecondary" href="/institute/question-bank/comprehension/import">
                  Import Comprehension CSV
                </Link>
                <Link className="button buttonSecondary" href="/institute/question-bank/comprehension/new">
                  Create Comprehension Set
                </Link>
              </>
            )}
            <Link className="button buttonPrimary" href="/institute/question-bank/new">
              {linkedOnly ? "Create Editable Local Question" : "Create Question"}
            </Link>
          </div>
        }
        title={linkedOnly ? "Linked Questions" : "Question Bank"}
        description={
          linkedOnly
            ? "Review only the platform questions already linked into this institute bank, without mixing them into normal local authoring."
            : "Search, filter, curate, and improve reusable assessment questions from one institute workspace."
        }
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Why questions are or are not visible</strong>
          <span>
            Platform question access depends on three checks staying aligned: shared-library switch,
            package access, and the current class and subject filter.
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
                ? "Platform question intake is enabled"
                : "Platform question intake is still locked"}
            </strong>
            <small>
              {hasSharedLibraryAccess
                ? "This institute can open the intake page when a matching question package is also active."
                : "The intake page will stay blocked until the platform operator enables shared-library access for this institute."}
            </small>
          </div>
          <div
            className={`economyAccessChecklistCard ${
              activeQuestionBankEntitlements.length > 0
                ? "economyAccessChecklistCardReady"
                : "economyAccessChecklistCardAttention"
            }`}
          >
            <span>Question package access</span>
            <strong>
              {activeQuestionBankEntitlements.length > 0
                ? `${activeQuestionBankEntitlements.length} active question package${
                    activeQuestionBankEntitlements.length === 1 ? "" : "s"
                  }`
                : "No active question package visible"}
            </strong>
            <small>
              {activeQuestionBankEntitlements.length > 0
                ? "Package coverage decides which class, subject, and topic rows can actually be brought into the institute bank."
                : "Even with the intake switch enabled, platform questions will not appear unless a matching package is attached."}
            </small>
          </div>
          <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
            <span>Current class and subject filter</span>
            <strong>
              {currentProgramLabel} · {currentSubjectLabel} · {currentTopicLabel}
            </strong>
            <small>
              Filters only change what this page shows right now. They do not grant or remove access.
            </small>
          </div>
        </div>
        <div className="questionBankChipRow questionBankChipRowCompact">
          <span className="questionBankMetaChip">
            Feature status: {hasSharedLibraryAccess ? "Enabled" : "Locked"}
          </span>
          <span className="questionBankMetaChip">
            Active package lanes: {activeQuestionBankEntitlements.length}
          </span>
          <span className="questionBankMetaChip">
            Active shared-library switches: {activeFeatureEntitlements.length}
          </span>
          {packagePreviewLabel ? <span className="questionBankMetaChip">{packagePreviewLabel}</span> : null}
          {featurePreviewLabel ? <span className="questionBankMetaChip">{featurePreviewLabel}</span> : null}
        </div>
        <div className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
          <span>{accessChainGuidance}</span>
          {packageScopeLabel ? (
            <span>Package coverage preview: {packageScopeLabel}</span>
          ) : (
            <span>
              If questions feel missing, first confirm the intake switch, then package access, and only
              then the class or subject filter.
            </span>
          )}
        </div>
        <div className="builderHintPanel" data-testid="question-bank-access-diagnosis" style={{ marginTop: 16 }}>
          <strong>{operatorNextStepTitle}</strong>
          <p>{operatorNextStepDescription}</p>
          <small>
            Read the chain in this order: switch status, package coverage, then linked questions already inside the institute bank.
          </small>
        </div>
        <div className="questionBankChipRow questionBankChipRowCompact" data-testid="question-bank-access-steps">
          <span className="questionBankMetaChip">1. Intake switch: {accessStepOneLabel}</span>
          <span className="questionBankMetaChip">2. Package coverage: {accessStepTwoLabel}</span>
          <span className="questionBankMetaChip">
            3. {linkedOnly ? "Linked questions in bank" : "Linked stock ready to review"}: {accessStepThreeLabel}
          </span>
        </div>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Use one lane at a time</strong>
          <span>Pick the screen that matches today&apos;s job so your team does not mix editing, review, and intake.</span>
        </div>
        <div className="builderHintPanel">
          <strong>{linkedOnly ? "Current lane: Linked Questions" : "Current lane: Local Question Bank"}</strong>
          <p>
            {linkedOnly
              ? "Stay here to review and use already-linked platform questions. Open the local bank only when you need editable institute-owned rows."
              : "Stay here to create, edit, import, and organize institute-owned questions. Open Linked Questions only when you need to review platform rows already available in the bank."}
          </p>
          <small>
            Open the Shared Library Linker only when the current bank does not have enough questions and you need to bring in more platform stock.
          </small>
        </div>
        <div className="questionBankCardActions">
          {linkedOnly ? (
            <>
              <Link className="button buttonGhost" href="/institute/question-bank">
                Open Local Question Bank
              </Link>
              <Link className="button buttonPrimary" href={sharedLibraryLinkerHref}>
                Open Shared Library Linker
              </Link>
            </>
          ) : (
            <>
              <Link className="button buttonGhost" href="/institute/question-bank/linked">
                Open Linked Questions
              </Link>
              <Link className="button buttonPrimary" href={sharedLibraryLinkerHref}>
                Open Shared Library Linker
              </Link>
            </>
          )}
        </div>
        <div className="weakTopicStack" style={{ marginTop: 16 }}>
          {linkedOnly ? (
            <>
              <div className="weakTopicRow">
                <div>
                  <strong>Use this screen when the question is already available</strong>
                  <span>Stay on Linked Questions when your team only needs to review, filter, preview, and reuse licensed questions already inside the institute bank.</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Open the linker when you need more platform stock</strong>
                  <span>If the current linked count is too small for exam creation, open the Shared Library Linker and add more questions topic by topic.</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Create an editable local copy before changing wording</strong>
                  <span>Linked rows are for reuse, not direct editing. Duplicate into a local editable row first whenever the institute wants its own wording or explanation.</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="weakTopicRow">
                <div>
                  <strong>Use this screen for institute-owned questions</strong>
                  <span>Stay on the local question bank when your team is writing, editing, importing, tagging, or organizing questions created by the institute.</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Open Linked Questions for already-added licensed rows</strong>
                  <span>Use the linked lane when the platform questions are already inside the institute bank and the team only needs to review or reuse them.</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Open the linker only when you need new platform questions</strong>
                  <span>The Shared Library Linker is the intake lane. Use it when the current institute bank is not enough and you want to add more platform source rows.</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {linkedOnly ? (
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>How linked questions work</strong>
            <span>Use this page to review only the platform questions already available inside your institute bank.</span>
          </div>
          <div className="builderHintPanel">
            <strong>Use this page for review and exam reuse</strong>
            <p>
              Questions shown here are already inside the institute bank. Use filters, inspect the row, and move ahead to exam creation when the question is suitable.
            </p>
            <small>
              If a linked row needs local wording changes, create an editable local copy first. If the current stock is not enough, open the Shared Library Linker.
            </small>
          </div>
          <div className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
            <span>
              Current selection: {programs.find((entry) => entry.id === validProgram)?.name || "All classes"} ·{" "}
              {subjects.find((entry) => entry.id === validSubject)?.name || "All subjects"} ·{" "}
              {topics.find((entry) => entry.id === validTopic)?.name || "All topics"}
            </span>
            <span>
              You are seeing {linkedRowsOnThisPage} rows on this page. The total linked count can be larger when
              filters or pagination are narrowing the view.
            </span>
          </div>
          <div className="builderHintPanel">
            <strong>Linked questions are not the same as package coverage</strong>
            <p>
              This page counts only questions already added into the institute bank. Active package coverage can be broader,
              because package access decides what can be linked, not what has already been brought in.
            </p>
            <small>
              If totals feel different, first compare the linked count here, then open the Shared Library Linker to
              review platform source stock and remaining linkable rows topic by topic.
            </small>
          </div>
          <div className="weakTopicStack" style={{ marginTop: 16 }}>
            <div className="weakTopicRow">
              <div>
                <strong>Step 1: package coverage says what this institute is allowed to take</strong>
                <span>Coverage is the permission layer. It does not mean those questions are already sitting inside the institute bank.</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Step 2: the Shared Library Linker brings matching platform questions into the bank</strong>
                <span>Use the linker topic by topic whenever the current linked stock is too small for exam creation.</span>
              </div>
            </div>
            <div className="weakTopicRow">
              <div>
                <strong>Step 3: Linked Questions shows only what is already available for your team right now</strong>
                <span>If this page still looks small, the next place to check is the linker, not the local question editor.</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {linkedOnly ? (
        <section className="builderSummaryGrid questionBankSummaryGridCompact">
          <article className="builderSummaryCard">
            <span>Total linked rows in this filtered scope</span>
            <strong>{questionPage.count}</strong>
            <small>Only institute-available linked questions returned by the current filters across all pages.</small>
          </article>
          <article className="builderSummaryCard">
            <span>Rows on this page</span>
            <strong>{linkedRowsOnThisPage}</strong>
            <small>This is the current page slice only. Pagination can hide the rest of the filtered linked rows.</small>
          </article>
          <article className="builderSummaryCard">
            <span>Current view</span>
            <strong>{validSubject ? "Filtered selection" : "Full linked selection"}</strong>
            <small>
              {validSubject
                ? "You are viewing only the selected academic slice, not the institute-wide total."
                : "No subject filter is active, so this count reflects the full linked inventory."}
            </small>
          </article>
          <article className="builderSummaryCard">
            <span>Active package coverage</span>
            <strong>{activeQuestionBankEntitlements.length}</strong>
            <small>
              {activePackageCoverageLabel}. Coverage tells your team what can be linked, not how many linked questions are already inside this bank.
            </small>
          </article>
          <article className="builderSummaryCard">
            <span>Package status</span>
            <strong>{linkedAccessActiveCount} active · {linkedAccessPausedCount} paused</strong>
            <small>Use active rows first. Paused rows may remain visible for review, but reuse can be restricted.</small>
          </article>
          <article className="builderSummaryCard">
            <span>Why totals can differ</span>
            <strong>{validSubject ? "Scope is filtered" : "Counts come from different stages"}</strong>
            <small>
              Linked Questions shows already-added questions. Shared Library Linker shows platform source inventory and remaining intake opportunity.
            </small>
          </article>
          <article className="builderSummaryCard">
            <span>Needs review first</span>
            <strong>{linkedMissingExplanationCount + highPriorityRevisionCount}</strong>
            <small>Rows needing better explanation or already marked for higher-priority cleanup.</small>
          </article>
          <article className="builderSummaryCard">
            <span>Ready to reuse</span>
            <strong>{linkedVerifiedCount}</strong>
            <small>Cleaner, more ready-to-use linked questions for classroom teams.</small>
          </article>
        </section>
      ) : (
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
            <span>Academic coverage</span>
            <strong>{subjects.length}</strong>
            <small>{topics.length} topic options across the current subject lane</small>
          </article>
          <article className="builderSummaryCard">
            <span>Comprehension lane</span>
            <strong>Ready</strong>
            <small>Open the comprehension create or import lanes when the current question needs a shared passage.</small>
          </article>
          <article className="builderSummaryCard">
            <span>Revision queue</span>
            <strong>{highPriorityRevisionCount}</strong>
            <small>High-priority questions on this visible page slice that need editorial cleanup</small>
          </article>
          <article className="builderSummaryCard">
            <span>Ambiguous items</span>
            <strong>{ambiguousCount}</strong>
            <small>Visible questions where wrong and skip behavior suggests wording or distractor problems</small>
          </article>
          <article className="builderSummaryCard">
            <span>Skip risk</span>
            <strong>{skipRiskCount}</strong>
            <small>Visible questions students defer often and may need simpler phrasing or stronger scaffolds</small>
          </article>
          <article className="builderSummaryCard">
            <span>Emerging data</span>
            <strong>{emergingCount}</strong>
            <small>Visible questions with early response volume that should be monitored before heavy edits</small>
          </article>
        </section>
      )}

      {!linkedOnly ? (
      <section className="contentCard">
        <div className="sectionHeading">
            <strong>{linkedOnly ? "Need more linked questions?" : "Shared library intake"}</strong>
            <span>
              {linkedOnly
                ? "Open the Shared Library Linker when this institute needs more platform questions in the current academic selection."
                : "Use the topic-wise intake page to review available coverage, choose the right slices, and add platform questions."}
            </span>
          </div>
        <div className="builderHintPanel">
          <strong>{linkedOnly ? "When to open the linker" : "How this intake page should be used"}</strong>
          <p>
            {linkedOnly
              ? "Open the linker only when the current linked stock is not enough. Stay on Linked Questions when you only need filtering, review, or exam creation support."
              : "This page is intake only. Link the right source rows here, then return to Linked Questions or the main Question Bank for day-to-day institute work."}
          </p>
          <small>
            {sharedLibraryDisabledMessage
              ? sharedLibraryDisabledMessage
              : linkedOnly
                ? "Separating intake from review helps users avoid confusing source inventory with already linked institute-ready questions."
                : "Keeping intake separate prevents accidental mixing of source selection and local authoring."}
          </small>
        </div>
        <div className="questionBankCardActions">
          <Link className="button buttonPrimary" href={sharedLibraryLinkerHref}>
            Open Shared Library Linker
          </Link>
          {linkedOnly ? null : (
            <Link
              className="button buttonGhost"
              href={buildHref("/institute/question-bank/linked", {
                program: validProgram,
                subject: validSubject,
                topic: validTopic,
              })}
            >
              Open Linked Questions For This Scope
            </Link>
          )}
        </div>
      </section>
      ) : null}

      <TeacherQuestionBankWorkspace
        key={[validProgram, validSubject, validTopic, search, tag, questionType, difficultyLevel, qualitySignal, revisionPriority, ordering, missingExplanation ? "1" : "0", page].join(":")}
        attachmentTypeLabelMap={optionCatalog.labelMap("question_attachment_type")}
        basePath={routeBasePath}
        bulkAction={applyQuestionBulkAction}
        bulkActionReturnPath={routeBasePath}
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
          source_state: sourceState,
          ordering,
          missing_explanation: missingExplanation ? "true" : "",
        }}
        hasNextPage={Boolean(questionPage.next)}
        hasPreviousPage={Boolean(questionPage.previous)}
        canLinkSharedLibrary={hasSharedLibraryAccess}
        sharedLibraryMode="direct_link"
        masterLibraryLoadError={masterLibraryLoadError}
        masterLibraryQuestions={masterLibraryPage?.results ?? []}
        masterLibraryPage={masterLibraryPageNumber}
        masterLibraryPageSize={masterLibraryPageSize}
        masterLibraryTotalCount={masterLibraryPage?.count ?? 0}
        masterLibraryHasNextPage={Boolean(masterLibraryPage?.next)}
        masterLibraryHasPreviousPage={Boolean(masterLibraryPage?.previous)}
        lockedSharedLibraryFilter={linkedOnly ? "linked" : ""}
        hideBulkDangerActions={linkedOnly}
        hideInlinePreferenceControls={linkedOnly}
        hideRecentTopics={linkedOnly}
        showBulkActions={!linkedOnly}
        showDifficultyFilter={true}
        showExtendedQuickFilters={!linkedOnly}
        showLocalStatusFilter={!linkedOnly}
        showQualitySignalFilter={!linkedOnly}
        showQuestionTypeFilter={!linkedOnly}
        showRevisionPriorityFilter={!linkedOnly}
        showSortFilter={true}
        showTagFilter={!linkedOnly}
        showTeacherFilter={!linkedOnly}
        actionMode={linkedOnly ? "linked-review" : "default"}
        inventoryTitle={linkedOnly ? "Linked question inventory" : "Question inventory"}
        emptyStateDescription={
          linkedOnly
            ? "No linked questions match this selection yet. Open the shared library linker to add questions into this lane, or broaden the academic filters."
            : "Broaden the search, adjust the filters, or switch off local favorites and status filters."
        }
        emptyStateTitle={
          linkedOnly ? "No linked questions match this selection" : "No questions match these filters"
        }
        emptyStateActionHref={
          linkedOnly
            ? buildHref("/institute/question-bank/library-linker", {
                program: validProgram,
                subject: validSubject,
                topic: validTopic,
              })
            : undefined
        }
        emptyStateActionLabel={linkedOnly ? "Open Shared Library Linker For This Scope" : undefined}
        showSharedLibraryQuickFilters={!linkedOnly}
        showSharedLibrarySection={false}
        showSharedLibraryStateControls={!linkedOnly}
        sharedLibraryDisabledMessage={sharedLibraryDisabledMessage}
        page={page}
        programs={programs}
        previewThemeClass="questionPreviewGlossy"
        questionBankEntitlements={questionBankEntitlements}
        questionTypeLabelMap={optionCatalog.labelMap("question_type")}
        questionTypeOptions={optionCatalog.selectOptions("question_type")}
        questions={questionPage.results}
        storageKeyPrefix={linkedOnly ? "institute-linked-question-bank" : "institute-question-bank"}
        subjects={subjects}
        tags={tags}
        teachers={teachers}
        topics={topics}
        totalCount={questionPage.count}
      />
    </div>
  );
}

export default async function InstituteQuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return InstituteQuestionBankPageView({ searchParams, linkedOnly: false });
}
