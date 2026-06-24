import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { TeacherQuestionImportWorkspace } from "@/components/ui/teacher-question-import-workspace";
import { fetchTeacherQuestionImportTemplate } from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { buildFallbackQuestionImportTemplate } from "@/lib/teacher/question-import-template-fallback";

export default async function TeacherQuestionImportPage() {
  await requireTeacherSession();

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
