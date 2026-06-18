import { WorkspaceSidebar } from "@/components/ui/workspace-sidebar";
import { WorkspaceTopbar } from "@/components/ui/workspace-topbar";
import {
  requirePlatformAdminSession,
} from "@/lib/auth/session";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "◈" },
  { href: "/admin/exams", label: "Exams", icon: "◍" },
  { href: "/admin/institutes", label: "Institutes", icon: "◎" },
  { href: "/admin/economy", label: "Economy", icon: "✦" },
  { href: "/admin/security", label: "Security", icon: "◍" },
  { href: "/admin/reports", label: "Reports", icon: "▣" },
  { href: "/admin/people", label: "People", icon: "◫" },
  { href: "/admin/academic-setup", label: "Academic Setup", icon: "◌" },
  { href: "/admin/settings", label: "Settings", icon: "⌘" },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requirePlatformAdminSession();

  return (
    <div className="studentAppShell instituteAppShell adminAppShell">
      <WorkspaceSidebar
        profile={profile}
        portalLabel="Platform Admin Portal"
        ariaLabel="Platform admin navigation"
        navItems={adminNavItems}
      />
      <main className="studentAppMain adminAppMain">
        <WorkspaceTopbar
          profile={profile}
          workspaceLabel="Platform admin workspace"
          summaryText="Cross-institute control surface for coverage, readiness, and operational health."
          searchActionHref="/admin/search"
          searchPlaceholder="Search institutes, people, exams, reports, or security"
          hintLabel="Platform"
          actions={[
            { href: "/admin/institutes", label: "Institutes", icon: "◎" },
            { href: "/admin/people", label: "People", icon: "◫" },
            { href: "/admin/reports", label: "Reports", icon: "▣" },
          ]}
        />
        {children}
      </main>
    </div>
  );
}
