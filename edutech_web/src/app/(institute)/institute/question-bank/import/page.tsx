import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { TeacherQuestionImportWorkspace } from "@/components/ui/teacher-question-import-workspace";
import { fetchTeacherQuestionImportTemplate } from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";

export default async function InstituteQuestionImportPage() {
  await requireInstituteAdminSession();

  const template = await fetchTeacherQuestionImportTemplate().catch(() => null);

  if (!template) {
    return (
      <div className="studentPage">
        <InstitutePageHeader
          title="Import Questions"
          description="This route depends on the live question-bank import template and validation endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question import workspace could not be loaded"
          description="The web importer needs the live CSV template endpoint before institute admins can preview and finalize question imports."
          bullets={[
            "Question bank import template endpoint",
            "Question import preview endpoint",
            "Question import finalize endpoint",
          ]}
          ctaHref="/institute/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  return (
    <div className="studentPage studentPageTight studentDashboardModern">
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
          <small>{template.columns.length} template columns available for the current CSV format</small>
        </div>
      </section>

      <TeacherQuestionImportWorkspace
        backHref="/institute/question-bank"
        csvContent={template.csv_content}
        formId="institute-question-import-form"
        templateColumns={template.columns}
      />
    </div>
  );
}
