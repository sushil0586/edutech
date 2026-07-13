import { InstitutePageHeader } from "@/components/ui/institute-page-header";

export default function Loading() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage questionBankPageVivid linkedQuestionReviewPage">
      <InstitutePageHeader
        title="Linked Questions"
        description="Review only the platform questions already linked into this institute bank, without mixing them into normal local authoring."
      />

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Linked Questions</strong>
          <span>The linked-question shell is ready while scope and inventory finish loading.</span>
        </div>
      </section>
    </div>
  );
}
