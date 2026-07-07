import { InstitutePageHeader } from "@/components/ui/institute-page-header";

export default function Loading() {
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
