import "./student-shell.css";
import { cookies } from "next/headers";
import { requireStudentSession } from "@/lib/auth/session";
import { StudentAppFooter } from "@/components/ui/student-app-footer";
import Link from "next/link";
import { WorkspaceSidebar } from "@/components/ui/workspace-sidebar";
import { WorkspaceTopbar } from "@/components/ui/workspace-topbar";
import {
  fetchStudentUnreadCount,
  fetchStudentWalletSummary,
  getStudentDashboardData,
} from "@/lib/api/student";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  DEFAULT_STUDENT_SOURCE_OPTIONS,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  selectedStudentSourceLabel,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

const studentNavItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: "D" },
  { href: "/app/exams", label: "Tests", icon: "T" },
  { href: "/app/results", label: "Results", icon: "R" },
  { href: "/app/practice", label: "Practice", icon: "P" },
  { href: "/app/attempts", label: "Attempts", icon: "A" },
  { href: "/app/analytics", label: "Analytics", icon: "L" },
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
  const dashboardContext = await getStudentDashboardData().catch(() => ({
    source: "error" as const,
    apiConfigured: true,
    summary: null,
    exams: [],
  }));
  const sourceRecords = [
    ...dashboardContext.exams,
    ...(dashboardContext.summary?.source_breakdown ?? []),
    ...(dashboardContext.summary?.recent_exams ?? []),
  ];
  const { sourceOptions: derivedSourceOptions, teacherOptions } =
    getStudentSourceOptions(sourceRecords);
  const sourceOptions =
    derivedSourceOptions.length > 0
      ? derivedSourceOptions
      : DEFAULT_STUDENT_SOURCE_OPTIONS;
  const selectedSource = resolveSelectedStudentSource(
    cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ?? null,
  );
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSubjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ?? "Overall";
  const summaryText =
    selectedSource === ALL_SOURCES_CONTEXT && selectedSubject === ALL_SUBJECTS_CONTEXT
      ? "Search tests, chapters, topics, and source lanes as the student catalog expands across your workspace."
      : `${selectedStudentSourceLabel(selectedSource)}${
          selectedSource === "teacher" && selectedTeacherId
            ? ` · ${teacherOptions.find((item) => item.id === selectedTeacherId)?.name ?? "Teacher"}`
            : ""
        }${selectedSubject === ALL_SUBJECTS_CONTEXT ? "" : ` · ${selectedSubjectLabel}`} is active. The workspace will stay centered on this filter until you switch again.`;
  const [walletSummaryResult, unreadCountResult] = await Promise.allSettled([
    fetchStudentWalletSummary(),
    fetchStudentUnreadCount(),
  ]);
  const walletSummary =
    walletSummaryResult.status === "fulfilled" ? walletSummaryResult.value : null;
  const unreadCount =
    unreadCountResult.status === "fulfilled"
      ? unreadCountResult.value.unread_count
      : 0;

  return (
    <div className="studentAppShell">
      <WorkspaceSidebar
        profile={profile}
        portalLabel="Student Portal"
        ariaLabel="Student navigation"
        navItems={studentNavItems}
        footerContent={
          <div className="sidebarSupportCard">
            <span className="sidebarSupportIcon" aria-hidden="true">
              ?
            </span>
            <strong>Need help?</strong>
            <p>Use settings and notifications to stay aligned with live workspace updates.</p>
            <Link className="sidebarSupportLink" href="/app/settings">
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
          sourceOptions={sourceOptions}
          selectedSource={selectedSource}
          teacherOptions={teacherOptions}
          selectedTeacherId={selectedTeacherId}
          subjectOptions={subjectOptions}
          selectedSubject={selectedSubject}
          walletSummary={walletSummary}
          unreadCount={unreadCount}
          profileHref="/app/profile"
          profileLabel={profile.display_name || profile.username}
        />
        <div className="studentAppContent">{children}</div>
        <StudentAppFooter />
      </main>
    </div>
  );
}
