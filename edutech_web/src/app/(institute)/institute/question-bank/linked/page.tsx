import { Suspense } from "react";
import { InstituteQuestionBankPageView } from "@/app/(institute)/institute/question-bank/page";

function InstituteLinkedQuestionBankLoadingShell() {
  return (
    <div className="studentPage studentPageTight studentDashboardModern instituteConsolePage questionBankPageVivid linkedQuestionReviewPage">
      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Linked Questions</strong>
          <span>The linked-question shell is ready while scope and inventory finish loading.</span>
        </div>
      </section>
    </div>
  );
}

async function InstituteLinkedQuestionBankPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return InstituteQuestionBankPageView({ searchParams, linkedOnly: true });
}

export default function InstituteLinkedQuestionBankPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<InstituteLinkedQuestionBankLoadingShell />}>
      <InstituteLinkedQuestionBankPageContent {...props} />
    </Suspense>
  );
}
