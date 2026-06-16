import { StudentPageHeader } from "@/components/ui/student-page-header";

type TeacherPageHeaderProps = {
  title: string;
  description: string;
  contextLabel?: string;
  statusLabel?: string;
  statusTone?: "default" | "live" | "warning" | "demo" | "danger";
  action?: React.ReactNode;
  className?: string;
};

export function TeacherPageHeader(props: TeacherPageHeaderProps) {
  return <StudentPageHeader eyebrow="Teacher workspace" {...props} />;
}
