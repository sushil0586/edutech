import { InstitutePageHeader } from "@/components/ui/institute-page-header";

export default function Loading() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage instituteQuestionEditorPageVivid">
      <InstitutePageHeader
        title="Create Question"
        description="Author a reusable assessment question with clear scoring, explanation, and answer structure."
      />

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Question Authoring</span>
          <strong>Loading the institute question editor</strong>
          <p>
            The editor shell is ready. Academic lookups, question types, and duplicate context are loading in the background.
          </p>
          <small>Preparing the authoring lane for the current institute scope</small>
        </div>
      </section>
    </div>
  );
}
