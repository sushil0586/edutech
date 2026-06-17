import Link from "next/link";
import { requireStudentSession } from "@/lib/auth/session";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";

function formatContextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Not available";
}

export default async function ProfilePage() {
  const profile = await requireStudentSession();
  const context = profile.registration_context ?? {};
  const instituteName =
    profile.institute_name?.trim() ||
    (typeof context.school_name === "string" && context.school_name.trim()) ||
    "Institute not assigned";

  return (
    <div className="studentPage studentDashboardModern">
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
          </div>
        </section>
      </section>
    </div>
  );
}
