import { StudentPageHeader } from "@/components/ui/student-page-header";

type ParentPageHeaderProps = {
  title: string;
  description: string;
  contextLabel?: string;
  statusLabel?: string;
  statusTone?: "default" | "live" | "warning" | "demo" | "danger";
  action?: React.ReactNode;
  className?: string;
};

export function ParentPageHeader(props: ParentPageHeaderProps) {
  return <StudentPageHeader eyebrow="Parent workspace" {...props} />;
}
