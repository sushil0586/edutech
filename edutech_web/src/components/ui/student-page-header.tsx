import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type StudentPageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  contextLabel?: string;
  statusLabel?: string;
  statusTone?: "default" | "live" | "warning" | "demo" | "danger";
  action?: React.ReactNode;
  className?: string;
};

export function StudentPageHeader({
  title,
  description,
  eyebrow = "Student workspace",
  contextLabel,
  statusLabel,
  statusTone = "default",
  action,
  className = "pageHeaderCompact",
}: StudentPageHeaderProps) {
  return (
    <PageHeader
      className={className}
      eyebrow={eyebrow}
      title={title}
      description={description}
      contextLabel={contextLabel}
      action={
        action ??
        (statusLabel ? (
          <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
        ) : null)
      }
    />
  );
}
