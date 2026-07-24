import "./student-shell.css";
import { cookies } from "next/headers";
import { requireStudentSession } from "@/lib/auth/session";
import { StudentAppFooter } from "@/components/ui/student-app-footer";
import Link from "next/link";
import { WorkspaceSidebar } from "@/components/ui/workspace-sidebar";
import { WorkspaceTopbar } from "@/components/ui/workspace-topbar";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  DEFAULT_STUDENT_SOURCE_OPTIONS,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

const studentNavItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: "D" },
  { href: "/app/exams", label: "Tests", icon: "T" },
  { href: "/app/results", label: "Results", icon: "R" },
  { href: "/app/practice", label: "Practice", icon: "P" },
  { href: "/app/attempts", label: "Attempts", icon: "A" },
  { href: "/app/analytics", label: "Analytics", icon: "L" },
  { href: "/app/reports", label: "Reports", icon: "H" },
  { href: "/app/weak-areas", label: "Weak Areas", icon: "W" },
  { href: "/app/notifications", label: "Alerts", icon: "N" },
  { href: "/app/wallet", label: "Wallet", icon: "W" },
  { href: "/app/subscriptions", label: "Subscriptions", icon: "U" },
  { href: "/app/profile", label: "Profile", icon: "P" },
  { href: "/app/settings", label: "Settings", icon: "G" },
];

export default async function StudentAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireStudentSession();
  const subjectOptions = getStudentSubjectOptions(profile);
  const cookieStore = await cookies();
  const sourceOptions = DEFAULT_STUDENT_SOURCE_OPTIONS;
  const selectedSource = resolveSelectedStudentSource(
    cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";
  const summaryText = `${selectedStudentSourceLabel(selectedSource)}${
    selectedSubject === ALL_SUBJECTS_CONTEXT ? "" : ` · ${selectedSubjectLabel}`
  } is active. ${
    profile.student_context?.program_name || profile.student_context?.cohort_name
      ? `Learner workspace for ${profile.student_context?.program_name ?? "your program"}${
          profile.student_context?.cohort_name ? ` · ${profile.student_context.cohort_name}` : ""
        }.`
      : "Search tests, chapters, topics, and source lanes across your student workspace."
  }`;

  return (
    <div className="studentAppShell">
      <WorkspaceSidebar
        profile={profile}
        portalLabel="Student Portal"
        ariaLabel="Student navigation"
        homeHref="/app/dashboard"
        navItems={studentNavItems}
        footerContent={
          <div className="sidebarSupportCard">
            <span className="sidebarSupportIcon" aria-hidden="true">
              ?
            </span>
            <strong>Need help?</strong>
            <p>Use settings and notifications to stay aligned with live workspace updates.</p>
            <Link className="sidebarSupportLink" href="/app/settings" prefetch={false}>
              Contact support
            </Link>
          </div>
        }
      />
      <main className="studentAppMain">
        <WorkspaceTopbar
          profile={profile}
          workspaceLabel="Student workspace"
          summaryText={summaryText}
          searchActionHref="/app/search"
          searchPlaceholder="Search tests, chapters, topics, practice, results, or settings"
          sourceOptions={sourceOptions}
          selectedSource={selectedSource}
          teacherOptions={[]}
          selectedTeacherId={null}
          subjectOptions={subjectOptions}
          selectedSubject={selectedSubject}
          walletHref="/app/wallet"
          profileHref="/app/profile"
          profileLabel={profile.display_name || profile.username}
        />
        <div className="studentAppContent">{children}</div>
        <StudentAppFooter />
      </main>
    </div>
  );
}
