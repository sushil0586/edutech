import dynamic from "next/dynamic";
import { Suspense } from "react";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchInstituteQuestionBankFeatureEntitlementsCached } from "@/lib/api/portal";
import { fetchTeacherQuestionImportTemplate } from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { buildFallbackQuestionImportTemplate } from "@/lib/teacher/question-import-template-fallback";

const QUESTION_BANK_BULK_IMPORT_FEATURE_CODE = "QUESTION_BANK_BULK_IMPORT";

type InstituteQuestionFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
};

const TeacherQuestionImportWorkspace = dynamic(
  () =>
    import("@/components/ui/teacher-question-import-workspace").then((module) => ({
      default: module.TeacherQuestionImportWorkspace,
    })),
  {
    loading: () => (
      <section className="contentCard questionImportPanel">
        <div className="builderSectionHeader">
          <div>
            <strong>Loading import tools</strong>
            <p>
              The page shell is ready. Preview, row-inspection, and finalize controls are loading now.
            </p>
          </div>
        </div>
      </section>
    ),
  },
);

function TeacherQuestionImportLoadingShell() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionImportPageVivid">
      <TeacherPageHeader
        title="Import Questions"
        description="Bring structured CSV question sets into the teacher bank with a preview-first workflow backed by the live backend validators."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Preview-First Import</span>
          <strong>Loading the import workspace</strong>
          <p>The import shell is ready while entitlement and template details finish loading.</p>
          <small>Preparing the current CSV template and access lane</small>
        </div>
      </section>
    </div>
  );
}

async function TeacherQuestionImportPageContent() {
  await requireTeacherSession();

  const [featureEntitlements, template] = await Promise.all([
    fetchInstituteQuestionBankFeatureEntitlementsCached<InstituteQuestionFeatureEntitlement>().catch(() => []),
    fetchTeacherQuestionImportTemplate().catch(() => null),
  ]);
  const hasBulkImportAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_BULK_IMPORT_FEATURE_CODE &&
      entitlement.status === "active",
  );

  if (!hasBulkImportAccess) {
    return (
      <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionImportPageVivid">
        <TeacherPageHeader
          title="Import Questions"
          description="Bring structured CSV question sets into the teacher bank with a preview-first workflow backed by the live backend validators."
        />

        <StudentStatePanel
          eyebrow="Feature entitlement required"
          title="Question-bank bulk import is not enabled for your institute yet"
          description="Teacher CSV import now follows the live institute feature entitlement. Ask your institute admin or platform operator to activate Question Bank Bulk Import before using this workspace."
          bullets={["Institute-level feature activation", "Teacher import access"]}
          ctaHref="/teacher/question-bank"
          ctaLabel="Back To Question Bank"
          statusLabel="Subscription controlled"
        />
      </div>
    );
  }

  const resolvedTemplate = template ?? buildFallbackQuestionImportTemplate();

  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionImportPageVivid">
      <TeacherPageHeader
        title="Import Questions"
        description="Bring structured CSV question sets into the teacher bank with a preview-first workflow backed by the live backend validators."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Preview-First Import</span>
          <strong>Validate question batches before they become reusable teacher content</strong>
          <p>
            Imports should never be blind. Use the template, preview the payload, and only finalize when row-level
            validation matches the academic structure you expect.
          </p>
          <small>{resolvedTemplate.columns.length} template columns available for the current CSV format</small>
        </div>
      </section>

      <TeacherQuestionImportWorkspace
        csvContent={resolvedTemplate.csv_content}
        templateColumns={resolvedTemplate.columns}
        workspaceClassName="teacherQuestionImportWorkspaceVivid"
      />
    </div>
  );
}

export default function TeacherQuestionImportPage() {
  return (
    <Suspense fallback={<TeacherQuestionImportLoadingShell />}>
      <TeacherQuestionImportPageContent />
    </Suspense>
  );
}
