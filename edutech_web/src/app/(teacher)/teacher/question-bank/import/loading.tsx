import { TeacherPageHeader } from "@/components/ui/teacher-page-header";

export default function Loading() {
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
