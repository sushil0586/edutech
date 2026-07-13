import { InstitutePageHeader } from "@/components/ui/institute-page-header";

export default function Loading() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage questionBankPageVivid instituteQuestionBankPage">
      <InstitutePageHeader
        title="Question Bank"
        description="Search, filter, curate, and improve reusable assessment questions from one institute workspace."
      />

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Find questions faster</strong>
          <span>The question-bank shell is ready while scope, access, and inventory data finish loading.</span>
        </div>
      </section>
    </div>
  );
}
