import { StudentPageHeader } from "@/components/ui/student-page-header";

type InstitutePageHeaderProps = {
  title: string;
  description: string;
  contextLabel?: string;
  statusLabel?: string;
  statusTone?: "default" | "live" | "warning" | "demo" | "danger";
  action?: React.ReactNode;
  className?: string;
};

export function InstitutePageHeader(props: InstitutePageHeaderProps) {
  return <StudentPageHeader eyebrow="Institute workspace" {...props} />;
}
