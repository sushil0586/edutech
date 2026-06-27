import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { LogoutButton } from "@/components/ui/logout-button";
import { requireStudentSession } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StatusPill } from "@/components/ui/status-pill";

function formatContextValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatOptionalValue(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function SettingsPage() {
  const profile = await requireStudentSession();
  const hasStudentProfile = Boolean(profile.student_profile);
  const hasTeacherProfile = Boolean(profile.teacher_profile);
  const registrationContext = profile.registration_context ?? {};
  const classLevel = formatContextValue(registrationContext.class_level, "Not available");
  const board = formatContextValue(registrationContext.board, "Not available");
  const instituteName =
    profile.institute_name?.trim() ||
    (typeof registrationContext.school_name === "string" && registrationContext.school_name.trim()) ||
    "Institute not assigned";
  const studentContext = profile.student_context ?? null;
  const cohortName = formatOptionalValue(studentContext?.cohort_name, "Cohort not available");
  const onboardingStatus = formatOptionalValue(profile.onboarding_status, "Not available");
  const profileCompletionState = profile.profile_completion_required
    ? profile.profile_completion_completed_at
      ? "Completed"
      : "Pending"
    : "Not required";
  const timezone = formatOptionalValue(
    profile.location_context?.confirmed_timezone ??
      profile.location_context?.detected_timezone,
    "Timezone not available",
  );
  const signupSource = formatOptionalValue(
    profile.acquisition_context?.signup_source ??
      profile.acquisition_context?.platform,
    "Source not available",
  );

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAccountPage studentLearnerSettingsPage">
      <StudentPageHeader
        title="Settings"
        description="Review your active student account, understand how this portal works, and manage your current web session."
      />

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Account Controls</span>
          <strong>{profile.is_active ? "Active student session" : "Inactive student session"}</strong>
          <small>
            {hasStudentProfile ? "Student profile linked" : "Student profile pending"} ·{" "}
            {instituteName}
          </small>
          <p className="sectionDescription">
            This page is intentionally a truthful utility surface: session management, account visibility, and guidance only. It does not pretend to offer profile editing that is not backed by the current student APIs.
          </p>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href="/app/profile">
            Open Profile
          </Link>
          <Link className="button buttonSecondary" href="/app/dashboard">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <StudentKpiGrid
        items={[
          {
            label: "Account Status",
            value: profile.is_active ? "Active" : "Inactive",
            note: "Access is controlled by backend account state",
            tone: "primary",
          },
          {
            label: "Student Access",
            value: hasStudentProfile ? "Linked" : "Pending",
            note: hasStudentProfile
              ? "This login is attached to a student profile"
              : "Student profile linkage is not visible yet",
          },
          {
            label: "Academic Context",
            value: classLevel,
            note: board === "Not available" ? "Board not available yet" : board,
          },
          {
            label: "Program",
            value: formatOptionalValue(studentContext?.program_name, "Not available"),
            note: formatOptionalValue(studentContext?.academic_year_name, "Academic year not available"),
          },
          {
            label: "Profile Completion",
            value: profileCompletionState,
            note: onboardingStatus === "Not available" ? "Onboarding state not available" : onboardingStatus,
          },
        ]}
      />

      <section className="studentInsightsTwoColumn">
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Account overview</strong>
            <StatusPill tone={profile.is_active ? "live" : "warning"}>
              {profile.is_active ? "Active account" : "Inactive account"}
            </StatusPill>
          </div>

          <div className="detailGrid">
            <article className="detailCard">
              <span>Username</span>
              <strong>{profile.username}</strong>
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
              <strong>{hasStudentProfile ? "Linked" : "Not available"}</strong>
            </article>
            <article className="detailCard">
              <span>Teacher profile</span>
              <strong>{hasTeacherProfile ? "Linked" : "Not linked"}</strong>
            </article>
            <article className="detailCard">
              <span>Cohort</span>
              <strong>{cohortName}</strong>
            </article>
            <article className="detailCard">
              <span>Timezone</span>
              <strong>{timezone}</strong>
            </article>
          </div>
        </section>

        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Workspace guidance</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Mock tests depend on live availability and attempt state.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Results and review unlock only when backend policy allows them.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Profile edits, password governance, and account corrections are currently handled outside this learner workspace unless backend support is added later.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/exams">
              Open Mock Tests
            </Link>
            <Link className="button buttonGhost" href="/app/results">
              Check Result Status
            </Link>
          </div>
        </section>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>What You Can Do Here</strong>
        </div>
        <div className="detailGrid">
          <article className="detailCard">
            <span>Visible here</span>
            <strong>Account overview</strong>
            <small>See the linked student account, institute, and academic context currently driving this workspace.</small>
          </article>
          <article className="detailCard">
            <span>Visible here</span>
            <strong>Session control</strong>
            <small>Log out safely when you finish on a shared device.</small>
          </article>
          <article className="detailCard">
            <span>Not editable here</span>
            <strong>Password and governance</strong>
            <small>Credential changes and administrative corrections remain outside the current student shell.</small>
          </article>
          <article className="detailCard">
            <span>Best next route</span>
            <strong>Profile or notifications</strong>
            <small>Use profile to verify identity context and notifications to catch learner-facing updates.</small>
          </article>
        </div>
      </section>

      <section className="studentInsightsTwoColumn">
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Session and Access</strong>
            <StatusPill tone={profile.is_active ? "live" : "warning"}>
              {profile.is_active ? "Access available" : "Access restricted"}
            </StatusPill>
          </div>
          <div className="detailGrid">
            <article className="detailCard">
              <span>Session state</span>
              <strong>{profile.is_active ? "Signed in" : "Access limited"}</strong>
              <small>Protected routes depend on this active browser session.</small>
            </article>
            <article className="detailCard">
              <span>Onboarding state</span>
              <strong>{onboardingStatus}</strong>
              <small>Shown from the current authenticated profile metadata.</small>
            </article>
            <article className="detailCard">
              <span>Profile completion</span>
              <strong>{profileCompletionState}</strong>
              <small>
                {profile.profile_completion_completed_at
                  ? "Completion has already been recorded for this account."
                  : "Completion controls are not exposed here unless backend support requires them."}
              </small>
            </article>
            <article className="detailCard">
              <span>Sign-up source</span>
              <strong>{signupSource}</strong>
              <small>Useful for support and account-tracing conversations.</small>
            </article>
          </div>
        </section>

        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Account Management Handoff</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Use this page to understand your current account state, not to edit hidden backend settings.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Password resets, institute corrections, and administrative identity changes remain outside this learner shell today.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>If something looks wrong, verify profile context first, then check notifications, attempt summaries, or result visibility before escalating it as a support issue.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/profile">
              Verify Profile Context
            </Link>
            <Link className="button buttonGhost" href="/app/notifications">
              Check Notifications
            </Link>
          </div>
        </section>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Quick access</strong>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonSecondary" href="/app/dashboard">
            Dashboard
          </Link>
          <Link className="button buttonSecondary" href="/app/profile">
            Profile
          </Link>
          <Link className="button buttonSecondary" href="/app/notifications">
            Notifications
          </Link>
          <Link className="button buttonSecondary" href="/app/results">
            Results
          </Link>
          <Link className="button buttonSecondary" href="/app/analytics">
            Analytics
          </Link>
          <Link className="button buttonGhost" href="/app/wallet">
            Wallet
          </Link>
        </div>
      </section>

      <section className="studentInsightsTwoColumn">
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Session controls</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Your access depends on the current browser session.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Use logout when you finish on a shared device.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Password and account-governance changes remain controlled outside this student workspace.</p>
            </div>
          </div>
          <form action={logoutAction}>
            <div className="settingsActionRow">
              <LogoutButton
                className="button buttonPrimary"
                label="Logout from this device"
                pendingLabel="Logging out..."
              />
            </div>
          </form>
        </section>

        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Notifications and help</strong>
          </div>
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Notifications are backend-driven through live student events.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>Check attempt summary and results first before assuming a result or review problem.</p>
            </div>
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>This page is intentionally informational where backend controls do not yet exist, so every visible action should still map to a real student route.</p>
            </div>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/app/notifications">
              Open Notifications
            </Link>
            <Link className="button buttonGhost" href="/app/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
