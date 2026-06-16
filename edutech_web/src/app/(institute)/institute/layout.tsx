import { WorkspaceSidebar } from "@/components/ui/workspace-sidebar";
import { WorkspaceTopbar } from "@/components/ui/workspace-topbar";
import { requireInstituteAdminSession } from "@/lib/auth/session";

const instituteNavItems = [
  { href: "/institute/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/institute/exams", label: "Exams", icon: "◫" },
  { href: "/institute/results", label: "Results", icon: "◎" },
  { href: "/institute/question-bank", label: "Question Bank", icon: "◍" },
  { href: "/institute/people", label: "People", icon: "◫" },
  { href: "/institute/academic-setup", label: "Academic Setup", icon: "◌" },
  { href: "/institute/teacher-assignments", label: "Teacher Assignments", icon: "⌁" },
  { href: "/institute/reports", label: "Reports", icon: "▣" },
  { href: "/institute/economy", label: "Economy", icon: "✦" },
  { href: "/institute/security", label: "Security", icon: "⛉" },
  { href: "/institute/settings", label: "Settings", icon: "⌘" },
];

export default async function InstituteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireInstituteAdminSession();

  return (
    <div className="studentAppShell">
      <WorkspaceSidebar
        profile={profile}
        portalLabel="Institute Admin Portal"
        ariaLabel="Institute admin navigation"
        navItems={instituteNavItems}
      />
      <main className="studentAppMain">
        <WorkspaceTopbar
          profile={profile}
          workspaceLabel="Institute admin workspace"
          summaryText="Institute-only control surface for roster, academic setup, exams, and daily operations."
          searchActionHref="/institute/search"
          searchPlaceholder="Search exams, people, question bank, reports, or security"
          hintLabel="Institute"
          actions={[
            { href: "/institute/people", label: "People", icon: "◫" },
            { href: "/institute/academic-setup", label: "Academic Setup", icon: "◌" },
            { href: "/institute/exams", label: "Exams", icon: "◫" },
          ]}
        />
        {children}
      </main>
    </div>
  );
}
