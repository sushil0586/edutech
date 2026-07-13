import { TeacherPageHeader } from "@/components/ui/teacher-page-header";

export default function Loading() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern teacherConsolePage questionBankPageVivid">
      <TeacherPageHeader
        title="Question Bank"
        description="Search, filter, curate, and improve reusable assessment questions from one teacher-scoped workspace."
        statusLabel="Loading question scope"
        statusTone="live"
      />

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Find questions faster</strong>
          <span>The question-bank shell is ready while filters, inventory, and access data finish loading.</span>
        </div>
      </section>
    </div>
  );
}
