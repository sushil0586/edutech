import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import { TeacherQuestionPassageImportWorkspace } from "@/components/ui/teacher-question-passage-import-workspace";
import { fetchTeacherQuestionPassageImportTemplate } from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";

export default async function TeacherQuestionPassageImportPage() {
  await requireTeacherSession();

  const template = await fetchTeacherQuestionPassageImportTemplate().catch(() => null);

  if (!template) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
          title="Import Comprehension Sets"
          description="This route depends on the live comprehension import template and validation endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Comprehension import workspace could not be loaded"
          description="The web importer needs the live comprehension CSV template endpoint before teachers can preview and finalize passage imports."
          bullets={[
            "Comprehension import template endpoint",
            "Comprehension preview endpoint",
            "Comprehension finalize endpoint",
          ]}
          ctaHref="/teacher/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionImportPageVivid">
      <TeacherPageHeader
        title="Import Comprehension Sets"
        description="Bring shared reading passages into the teacher bank with a preview-first workflow backed by the live backend validators."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Comprehension Import</span>
          <strong>Validate shared passage batches before they become reusable comprehension content</strong>
          <p>
            Import shared reading passages cleanly, keep them academically mapped, and then link downstream questions from the regular question editor.
          </p>
          <small>{template.columns.length} template columns available for the current comprehension CSV format</small>
        </div>
      </section>

      <TeacherQuestionPassageImportWorkspace
        csvContent={template.csv_content}
        templateColumns={template.columns}
        workspaceClassName="teacherQuestionImportWorkspaceVivid"
      />
    </div>
  );
}
