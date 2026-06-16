import { TeacherSidebar } from "@/components/ui/teacher-sidebar";
import { WorkspaceTopbar } from "@/components/ui/workspace-topbar";
import { requireTeacherSession } from "@/lib/auth/session";

export default async function TeacherAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireTeacherSession();

  return (
    <div className="studentAppShell">
      <TeacherSidebar profile={profile} />
      <main className="studentAppMain">
        <WorkspaceTopbar
          profile={profile}
          workspaceLabel="Teacher workspace"
          summaryText="Create exams, monitor question quality, and move between authoring and results without leaving the teacher workspace."
          hintLabel="Teacher"
          actions={[
            { href: "/teacher/exams/new", label: "New Exam", icon: "+" },
            { href: "/teacher/question-bank/new", label: "New Question", icon: "*" },
          ]}
          profileLabel={profile.display_name || profile.username}
        />
        {children}
      </main>
    </div>
  );
}
