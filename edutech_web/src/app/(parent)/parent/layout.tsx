import { WorkspaceSidebar } from "@/components/ui/workspace-sidebar";
import { WorkspaceTopbar } from "@/components/ui/workspace-topbar";
import { requireParentSession } from "@/lib/auth/session";

const parentNavItems = [
  { href: "/parent/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/parent/children", label: "Children", icon: "◎" },
  { href: "/parent/progress", label: "Progress", icon: "↗" },
  { href: "/parent/alerts", label: "Alerts", icon: "!" },
  { href: "/parent/settings", label: "Settings", icon: "⌘" },
];

export default async function ParentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireParentSession();
  const linkedChildrenCount = profile.parent_context?.linked_children_count ?? 0;
  const summaryText =
    linkedChildrenCount > 0
      ? `${linkedChildrenCount} linked children, progress trends, and alert preferences are available from this family workspace.`
      : "This family workspace is ready for linked children, progress visibility, and parent alert preferences.";

  return (
    <div className="studentAppShell">
      <WorkspaceSidebar
        profile={profile}
        portalLabel="Parent Portal"
        ariaLabel="Parent navigation"
        navItems={parentNavItems}
      />
      <main className="studentAppMain">
        <WorkspaceTopbar
          profile={profile}
          workspaceLabel="Parent workspace"
          summaryText={summaryText}
          searchActionHref="/parent/search"
          searchPlaceholder="Search children, progress, alerts, or settings"
          hintLabel="Parent"
          actions={[
            { href: "/parent/children", label: "Children", icon: "◎" },
            { href: "/parent/alerts", label: "Alerts", icon: "!" },
            { href: "/parent/settings", label: "Settings", icon: "⌘" },
          ]}
        />
        {children}
      </main>
    </div>
  );
}
