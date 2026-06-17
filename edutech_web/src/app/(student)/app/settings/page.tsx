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

  return (
    <div className="studentPage studentDashboardModern">
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
          <strong>Quick access</strong>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonSecondary" href="/app/dashboard">
            Dashboard
          </Link>
          <Link className="button buttonSecondary" href="/app/exams">
            Mock Tests
          </Link>
          <Link className="button buttonSecondary" href="/app/practice">
            Practice
          </Link>
          <Link className="button buttonSecondary" href="/app/results">
            Results
          </Link>
          <Link className="button buttonSecondary" href="/app/analytics">
            Analytics
          </Link>
          <Link className="button buttonGhost" href="/app/notifications">
            Notifications
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
