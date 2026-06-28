import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { TeacherQuestionPassageImportWorkspace } from "@/components/ui/teacher-question-passage-import-workspace";
import { fetchPortalList } from "@/lib/api/portal";
import { fetchTeacherQuestionPassageImportTemplate } from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";

const QUESTION_BANK_BULK_IMPORT_FEATURE_CODE = "QUESTION_BANK_BULK_IMPORT";

type InstituteQuestionFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
};

export default async function InstituteQuestionPassageImportPage() {
  await requireInstituteAdminSession();

  const featureEntitlements = await fetchPortalList<InstituteQuestionFeatureEntitlement>(
    "/api/v1/economy/admin/institute-question-bank-feature-entitlements/",
  ).catch(() => []);
  const hasBulkImportAccess = featureEntitlements.some(
    (entitlement) =>
      entitlement.feature_code === QUESTION_BANK_BULK_IMPORT_FEATURE_CODE &&
      entitlement.status === "active",
  );

  if (!hasBulkImportAccess) {
    return (
      <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionImportPageVivid">
        <InstitutePageHeader
          title="Import Comprehension Sets"
          description="Bring shared reading passages into the institute bank with a preview-first workflow backed by the live backend validators."
        />
        <StudentStatePanel
          eyebrow="Feature entitlement required"
          title="Question-bank bulk import is not enabled for this institute yet"
          description="Comprehension CSV import now follows the live institute feature entitlement. Ask the platform operator to activate Question Bank Bulk Import through your package or subscription plan before using this workspace."
          bullets={["Question-bank bulk import feature", "Comprehension import activation"]}
          ctaHref="/institute/economy"
          ctaLabel="Open Economy Oversight"
          statusLabel="Subscription controlled"
        />
      </div>
    );
  }

  const template = await fetchTeacherQuestionPassageImportTemplate().catch(() => null);

  if (!template) {
    return (
      <div className="studentPage">
        <InstitutePageHeader
          title="Import Comprehension Sets"
          description="This route depends on the live comprehension import template and validation endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Comprehension import workspace could not be loaded"
          description="The web importer needs the live comprehension CSV template endpoint before institute admins can preview and finalize passage imports."
          bullets={[
            "Comprehension import template endpoint",
            "Comprehension preview endpoint",
            "Comprehension finalize endpoint",
          ]}
          ctaHref="/institute/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionImportPageVivid">
      <InstitutePageHeader
        title="Import Comprehension Sets"
        description="Bring shared reading passages into the institute bank with a preview-first workflow backed by the live backend validators."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Comprehension Import</span>
          <strong>Validate shared passage batches before they become reusable institute comprehension content</strong>
          <p>
            Import shared passages cleanly, keep them academically mapped, and then link downstream questions from the regular question editor.
          </p>
          <small>{template.columns.length} template columns available for the current comprehension CSV format</small>
        </div>
      </section>

      <TeacherQuestionPassageImportWorkspace
        backHref="/institute/question-bank"
        formId="institute-question-passage-import-form"
        csvContent={template.csv_content}
        templateColumns={template.columns}
        workspaceClassName="instituteQuestionImportWorkspaceVivid"
      />
    </div>
  );
}
