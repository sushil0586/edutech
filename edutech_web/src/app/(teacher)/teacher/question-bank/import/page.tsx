import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherQuestionImportWorkspace } from "@/components/ui/teacher-question-import-workspace";
import { fetchPortalList } from "@/lib/api/portal";
import { fetchTeacherQuestionImportTemplate } from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { buildFallbackQuestionImportTemplate } from "@/lib/teacher/question-import-template-fallback";

const QUESTION_BANK_BULK_IMPORT_FEATURE_CODE = "QUESTION_BANK_BULK_IMPORT";

type InstituteQuestionFeatureEntitlement = {
  id: string;
  feature_code: string;
  status: string;
};

export default async function TeacherQuestionImportPage() {
  await requireTeacherSession();

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

  const template =
    (await fetchTeacherQuestionImportTemplate().catch(() => null)) ??
    buildFallbackQuestionImportTemplate();

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
          <small>{template.columns.length} template columns available for the current CSV format</small>
        </div>
      </section>

      <TeacherQuestionImportWorkspace
        csvContent={template.csv_content}
        templateColumns={template.columns}
        workspaceClassName="teacherQuestionImportWorkspaceVivid"
      />
    </div>
  );
}
