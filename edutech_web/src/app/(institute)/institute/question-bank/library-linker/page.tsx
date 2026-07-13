import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { InstituteSharedLibraryLinker } from "@/components/ui/institute-shared-library-linker";
import {
  fetchTeacherMasterQuestionLibrary,
  fetchTeacherPrograms,
  fetchTeacherQuestionPage,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { fetchInstituteQuestionBankFeatureEntitlementsCached } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

const QUESTION_BANK_SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY";

type InstituteQuestionFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
  source_package_name?: string | null;
};

function asPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function clampPageSize(value: string | undefined, fallback: number) {
  const parsed = asPositiveInteger(value, fallback);
  const allowedSizes = new Set([25, 50, 100]);
  return allowedSizes.has(parsed) ? parsed : fallback;
}

export default async function InstituteQuestionBankLibraryLinkerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireInstituteAdminSession();
  const resolvedSearchParams = await searchParams;

  const program = readSingle(resolvedSearchParams.program);
  const subject = readSingle(resolvedSearchParams.subject);
  const topic = readSingle(resolvedSearchParams.topic);
  const search = readSingle(resolvedSearchParams.search);
  const message = readSingle(resolvedSearchParams.message);
  const error = readSingle(resolvedSearchParams.error);
  const libraryPage = asPositiveInteger(readSingle(resolvedSearchParams.library_page), 1);
  const libraryPageSize = clampPageSize(readSingle(resolvedSearchParams.library_page_size), 100);

  const [programs, featureEntitlements] = await Promise.all([
    fetchTeacherPrograms({ institute: profile.institute || undefined }).catch(() => []),
    fetchInstituteQuestionBankFeatureEntitlementsCached<InstituteQuestionFeatureEntitlement>().catch(
      () => [],
    ),
  ]);

  const hasSharedLibraryAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_SHARED_LIBRARY_FEATURE_CODE &&
      entitlement.status === "active",
  );

  const validProgram = programs.some((entry) => entry.id === program) ? program : "";
  const subjects = validProgram
    ? await fetchTeacherSubjects({
        institute: profile.institute || undefined,
        program: validProgram,
      }).catch(() => [])
    : [];
  const validSubject = subjects.some((entry) => entry.id === subject) ? subject : "";
  const topics = validSubject
    ? await fetchTeacherTopics({
        institute: profile.institute || undefined,
        subject: validSubject,
      }).catch(() => [])
    : [];
  const validTopic = topics.some((entry) => entry.id === topic) ? topic : "";

  const selectedSubject = subjects.find((entry) => entry.id === validSubject) ?? null;
  const selectedTopic = topics.find((entry) => entry.id === validTopic) ?? null;

  const topicSummaries = selectedSubject
    ? await Promise.all(
        topics.map(async (topicEntry) => {
          const [availablePage, localPage] = await Promise.all([
            fetchTeacherMasterQuestionLibrary({
              page: 1,
              page_size: 1,
              available_only: true,
              subject_code: selectedSubject.code,
              topic_code: topicEntry.code,
            }).catch(() => null),
            fetchTeacherQuestionPage({
              page: 1,
              page_size: 1,
              program: validProgram || undefined,
              subject: validSubject || undefined,
              topic: topicEntry.id,
            }).catch(() => null),
          ]);

          const availableCount = availablePage?.count ?? 0;
          const linkedCount = localPage?.count ?? 0;
          return {
            topicId: topicEntry.id,
            topicCode: topicEntry.code,
            topicName: topicEntry.name,
            availableCount,
            linkedCount,
            remainingCount: Math.max(availableCount - linkedCount, 0),
          };
        }),
      )
    : [];

  const masterLibraryPage =
    hasSharedLibraryAccess && selectedSubject && selectedTopic
      ? await fetchTeacherMasterQuestionLibrary({
          page: libraryPage,
          page_size: libraryPageSize,
          available_only: true,
          search: search || undefined,
          subject_code: selectedSubject.code,
          topic_code: selectedTopic.code,
        }).catch(() => null)
      : null;

  const sharedLibraryDisabledMessage = hasSharedLibraryAccess
    ? ""
    : "Shared platform library is not enabled for this institute subscription yet.";

  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage questionBankPageVivid">
      <InstitutePageHeader
        title="Shared Library Linker"
        description="Link licensed platform questions topic by topic with counts, review controls, and bulk selection."
      />

      <InstituteSharedLibraryLinker
        error={error}
        hasNextPage={Boolean(masterLibraryPage?.next)}
        hasPreviousPage={Boolean(masterLibraryPage?.previous)}
        libraryPage={libraryPage}
        libraryPageSize={libraryPageSize}
        message={message}
        programs={programs}
        questions={masterLibraryPage?.results ?? []}
        search={search}
        selectedProgramId={validProgram}
        selectedSubjectId={validSubject}
        selectedTopicId={validTopic}
        sharedLibraryDisabledMessage={sharedLibraryDisabledMessage}
        subjects={subjects}
        topicSummaries={topicSummaries}
        topics={topics}
        totalCount={masterLibraryPage?.count ?? 0}
      />
    </div>
  );
}
