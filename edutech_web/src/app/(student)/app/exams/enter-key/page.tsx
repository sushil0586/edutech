import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { resolveStudentExamAccessKey } from "@/lib/api/student";

function feedbackMessage(value: string | undefined) {
  if (!value) return "";
  return decodeURIComponent(value);
}

async function resolveExamKeyAction(formData: FormData) {
  "use server";

  const rawKey = String(formData.get("access_key") ?? "");
  const accessKey = rawKey.trim().toUpperCase();

  if (!accessKey) {
    redirect("/app/exams/enter-key?error=Enter%20the%20exam%20key%20to%20continue.");
  }

  try {
    const detail = await resolveStudentExamAccessKey(accessKey);
    if (detail.active_attempt?.id) {
      redirect(`/app/attempts/${detail.active_attempt.id}`);
    }
    redirect(
      `/app/exams/${detail.id}?message=${encodeURIComponent(
        "Exam key accepted. Review the exam rules below before starting.",
      )}`,
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to resolve this exam key right now.";
    redirect(`/app/exams/enter-key?error=${encodeURIComponent(message)}`);
  }
}

export default async function EnterExamKeyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title="Enter Exam Key"
        description="Use an institute-issued key to jump directly to the correct mock test while keeping your normal student access rules in place."
        statusLabel="Signed-in quick entry"
        statusTone="live"
      />

      {error ? (
        <p className="feedbackBanner feedbackBannerError">{feedbackMessage(error)}</p>
      ) : null}

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Quick Exam Lookup</span>
          <strong>Jump directly to the right exam</strong>
          <p>
            Enter the key exactly as shared by your teacher. The platform will still validate assignment, timing, and attempt eligibility before routing you forward.
          </p>
          <small>Access key routing still respects the same backend rules as the full exam catalog.</small>
        </div>
        <form action={resolveExamKeyAction} className="studentInsightHeroActions">
          <input
            autoCapitalize="characters"
            className="builderInput"
            name="access_key"
            placeholder="Enter exam key"
            type="text"
          />
          <button className="button buttonPrimary" type="submit">
            Open Exam
          </button>
        </form>
      </section>
      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>What happens next</strong>
            <span>Validation stays active</span>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>You must already be signed into your student account.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>The exam opens only if your profile is eligible and the timing rules allow it.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>If you already have an active attempt, you will be taken back into it directly.</p>
            </div>
          </div>
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Need the full list instead?</strong>
            <span>Use the standard workspace</span>
          </div>
          <p className="sectionDescription">
            You can always go back to the full mock test workspace if you want to browse all assigned exams and their availability states.
          </p>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/exams">
              Open Mock Tests
            </Link>
            <Link className="button buttonGhost" href="/app/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
