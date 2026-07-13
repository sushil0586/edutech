import { TeacherPageHeader } from "@/components/ui/teacher-page-header";

export default function Loading() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionEditorPageVivid">
      <TeacherPageHeader
        title="Create Question"
        description="Author a reusable assessment question with clear scoring, explanation, and answer structure."
      />

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Question Authoring</span>
          <strong>Loading the teacher question editor</strong>
          <p>The editor shell is ready while question types, lookups, and duplicate context finish loading.</p>
          <small>Preparing the authoring lane for the current teacher scope</small>
        </div>
      </section>
    </div>
  );
}
