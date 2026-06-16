import { StudentPageHeader } from "@/components/ui/student-page-header";

type PlatformAdminPageHeaderProps = {
  title: string;
  description: string;
  contextLabel?: string;
  statusLabel?: string;
  statusTone?: "default" | "live" | "warning" | "demo" | "danger";
  action?: React.ReactNode;
  className?: string;
};

export function PlatformAdminPageHeader(props: PlatformAdminPageHeaderProps) {
  return <StudentPageHeader eyebrow="Platform admin workspace" {...props} />;
}
