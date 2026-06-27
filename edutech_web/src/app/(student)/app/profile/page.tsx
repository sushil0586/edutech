import Link from "next/link";
import { requireStudentSession } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";

function formatContextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Not available";
}

function formatOptionalValue(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function ProfilePage() {
  const profile = await requireStudentSession();
  const context = profile.registration_context ?? {};
  const studentContext = profile.student_context ?? null;
  const locationContext = profile.location_context ?? null;
  const acquisitionContext = profile.acquisition_context ?? null;
  const onboardingStatus = formatOptionalValue(profile.onboarding_status, "Not available");
  const completionState = profile.profile_completion_required
    ? profile.profile_completion_completed_at
      ? "Completed"
      : "Pending"
    : "Not required";
  const instituteName =
    profile.institute_name?.trim() ||
    (typeof context.school_name === "string" && context.school_name.trim()) ||
    "Institute not assigned";
  const referralCode = formatOptionalValue(studentContext?.referral_code, "Not available");
  const referralChannel = formatOptionalValue(acquisitionContext?.referral_channel, "Not available");
  const referralIdentifier = formatOptionalValue(acquisitionContext?.referral_identifier, "Not available");

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAccountPage studentLearnerProfilePage">
      <StudentPageHeader
        title="Profile"
        description="Review the current student account identity and the academic context captured in the live registration and account profile."
        statusLabel={profile.is_active ? "Active profile" : "Inactive profile"}
        statusTone={profile.is_active ? "live" : "warning"}
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Student Identity</span>
          <strong>{profile.display_name || profile.username}</strong>
          <small>
            {profile.email || "Email not available"} · {instituteName}
          </small>
          <p className="sectionDescription">
            This page shows the live identity, academic placement, and onboarding context currently attached to the authenticated student account.
          </p>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/app/settings">
            Open Settings
          </Link>
          <Link className="button buttonSecondary" href="/app/dashboard">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <StudentKpiGrid
        items={[
          {
            label: "Profile Status",
            value: profile.is_active ? "Active" : "Inactive",
            note: "Controlled by backend account state",
            tone: "primary",
          },
          {
            label: "Role",
            value: profile.role.replaceAll("_", " "),
            note: "Current authenticated workspace role",
          },
          {
            label: "Institute",
            value: instituteName,
            note: "Visible institute linkage for this account",
          },
          {
            label: "Program",
            value: formatOptionalValue(studentContext?.program_name, "Not available"),
            note: formatOptionalValue(studentContext?.cohort_name, "Cohort not available"),
          },
          {
            label: "Profile Completion",
            value: completionState,
            note: onboardingStatus,
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Identity</strong>
          </div>
          <div className="detailGrid">
            <article className="detailCard">
              <span>Name</span>
              <strong>{profile.display_name || profile.username}</strong>
            </article>
            <article className="detailCard">
              <span>Email</span>
              <strong>{profile.email || "Not available"}</strong>
            </article>
            <article className="detailCard">
              <span>Role</span>
              <strong>{profile.role.replaceAll("_", " ")}</strong>
            </article>
            <article className="detailCard">
              <span>Institute</span>
              <strong>{instituteName}</strong>
            </article>
            <article className="detailCard">
              <span>Student profile</span>
              <strong>{profile.student_profile || "Not linked"}</strong>
            </article>
            <article className="detailCard">
              <span>Onboarding status</span>
              <strong>{onboardingStatus}</strong>
            </article>
            <article className="detailCard">
              <span>Profile completion</span>
              <strong>{completionState}</strong>
            </article>
          </div>
        </section>

        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Academic Context</strong>
          </div>
          <div className="detailGrid">
            <article className="detailCard">
              <span>Class Level</span>
              <strong>{formatContextValue(context.class_level)}</strong>
            </article>
            <article className="detailCard">
              <span>Board</span>
              <strong>{formatContextValue(context.board)}</strong>
            </article>
            <article className="detailCard">
              <span>Exam Interest</span>
              <strong>{formatContextValue(context.exam_interest)}</strong>
            </article>
            <article className="detailCard">
              <span>School</span>
              <strong>{formatContextValue(context.school_name)}</strong>
            </article>
            <article className="detailCard">
              <span>Program</span>
              <strong>{formatOptionalValue(studentContext?.program_name, "Not available")}</strong>
            </article>
            <article className="detailCard">
              <span>Cohort</span>
              <strong>{formatOptionalValue(studentContext?.cohort_name, "Not available")}</strong>
            </article>
            <article className="detailCard">
              <span>Academic Year</span>
              <strong>{formatOptionalValue(studentContext?.academic_year_name, "Not available")}</strong>
            </article>
          </div>
        </section>
      </section>

      <section className="studentInsightsTwoColumn">
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Orientation</strong>
          </div>
          <div className="detailGrid">
            <article className="detailCard">
              <span>Referral Code</span>
              <strong>{referralCode}</strong>
            </article>
            <article className="detailCard">
              <span>Referral Input</span>
              <strong>{referralIdentifier}</strong>
            </article>
            <article className="detailCard">
              <span>Referral Channel</span>
              <strong>{referralChannel}</strong>
            </article>
            <article className="detailCard">
              <span>Detected Timezone</span>
              <strong>{formatOptionalValue(locationContext?.detected_timezone, "Not available")}</strong>
            </article>
            <article className="detailCard">
              <span>Detected City</span>
              <strong>{formatOptionalValue(locationContext?.detected_city, "Not available")}</strong>
            </article>
            <article className="detailCard">
              <span>Signup Source</span>
              <strong>{formatOptionalValue(acquisitionContext?.signup_source, "Not available")}</strong>
            </article>
            <article className="detailCard">
              <span>Device Category</span>
              <strong>{formatOptionalValue(acquisitionContext?.device_category, "Not available")}</strong>
            </article>
            <article className="detailCard">
              <span>Browser Family</span>
              <strong>{formatOptionalValue(acquisitionContext?.browser_family, "Not available")}</strong>
            </article>
          </div>
        </section>

        <section className="contentCard">
          <div className="sectionHeading">
            <strong>What To Check Next</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Use this page to confirm that your student identity and academic placement are correct before relying on subject-scoped dashboards, practice, or results.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>If you joined using a referral code, the code you entered appears here first. The resulting reward credit, if any, is best verified from Wallet after onboarding is complete.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>If account details look wrong, this page is informational only. Use settings and your institute support flow instead of assuming student progress data is incorrect.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>A good order is: confirm identity here, check settings for session or account guidance, then use notifications, attempts, or results to verify learner-facing state.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonPrimary" href="/app/wallet">
              Open Wallet
            </Link>
            <Link className="button buttonSecondary" href="/app/dashboard">
              Open Dashboard
            </Link>
            <Link className="button buttonGhost" href="/app/notifications">
              Open Notifications
            </Link>
          </div>
        </section>
      </section>

      <section className="studentInsightsTwoColumn">
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Identity Trust Checks</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Check class, board, institute, and program context here before reading subject-scoped analytics or weak-area recommendations too literally.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>If identity context is wrong, downstream dashboards can still be technically correct but misleading for the wrong learner profile.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/settings">
              Open Settings
            </Link>
            <Link className="button buttonGhost" href="/app/analytics">
              Open Analytics
            </Link>
          </div>
        </section>

        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Student Support Flow</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Use this page as a verification layer, not as an editing surface for protected account fields.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>When a student-facing route looks wrong, verify profile context first, then check settings, notifications, attempts, or results before escalating the issue.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/results">
              Check Result Status
            </Link>
            <Link className="button buttonGhost" href="/app/attempts">
              Open Attempt Timeline
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
