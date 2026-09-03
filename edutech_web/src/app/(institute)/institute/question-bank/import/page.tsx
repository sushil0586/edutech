import dynamic from "next/dynamic";
import { Suspense } from "react";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchInstituteQuestionBankFeatureEntitlements } from "@/lib/api/portal";
import { fetchTeacherQuestionImportTemplate } from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";
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

function InstituteQuestionImportLoadingShell() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionImportPageVivid">
      <InstitutePageHeader
        title="Import Questions"
        description="Bring structured CSV question sets into the institute bank with a preview-first workflow backed by the live backend validators."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Preview-First Import</span>
          <strong>Loading the import workspace</strong>
          <p>
            The institute import shell is ready. Feature entitlement and template details are loading in the background.
          </p>
          <small>Preparing the current CSV template and entitlement lane</small>
        </div>
      </section>
    </div>
  );
}

async function InstituteQuestionImportPageContent() {
  await requireInstituteAdminSession();

  const [featureEntitlements, template] = await Promise.all([
    fetchInstituteQuestionBankFeatureEntitlements<InstituteQuestionFeatureEntitlement>().catch(
      () => [],
    ),
    fetchTeacherQuestionImportTemplate().catch(() => null),
  ]);
  const hasBulkImportAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_BULK_IMPORT_FEATURE_CODE &&
      entitlement.status === "active",
  );

  if (!hasBulkImportAccess) {
    return (
      <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionImportPageVivid">
        <InstitutePageHeader
          title="Import Questions"
          description="Bring structured CSV question sets into the institute bank with a preview-first workflow backed by the live backend validators."
        />

        <StudentStatePanel
          eyebrow="Feature entitlement required"
          title="Question-bank bulk import is not enabled for this institute yet"
          description="CSV question import now follows the live institute feature entitlement. Ask the platform operator to activate Question Bank Bulk Import through your package or subscription plan before using this workspace."
          bullets={["Question-bank bulk import feature", "Package or subscription activation"]}
          ctaHref="/institute/economy"
          ctaLabel="Open Economy Oversight"
          statusLabel="Subscription controlled"
        />
      </div>
    );
  }

  const resolvedTemplate = template ?? buildFallbackQuestionImportTemplate();

  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionImportPageVivid">
      <InstitutePageHeader
        title="Import Questions"
        description="Bring structured CSV question sets into the institute bank with a preview-first workflow backed by the live backend validators."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Preview-First Import</span>
          <strong>Validate question batches before they become reusable institute content</strong>
          <p>
            Imports should never be blind. Use the template, preview the payload, and only finalize when row-level
            validation matches the academic structure you expect.
          </p>
          <small>{resolvedTemplate.columns.length} template columns available for the current CSV format</small>
        </div>
      </section>

      <TeacherQuestionImportWorkspace
        backHref="/institute/question-bank"
        csvContent={resolvedTemplate.csv_content}
        formId="institute-question-import-form"
        templateColumns={resolvedTemplate.columns}
        workspaceClassName="instituteQuestionImportWorkspaceVivid"
      />
    </div>
  );
}

export default function InstituteQuestionImportPage() {
  return (
    <Suspense fallback={<InstituteQuestionImportLoadingShell />}>
      <InstituteQuestionImportPageContent />
    </Suspense>
  );
}
