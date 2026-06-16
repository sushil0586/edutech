type StatusPillTone = "default" | "live" | "warning" | "demo" | "danger";

const toneClassName: Record<StatusPillTone, string> = {
  default: "",
  live: "statusLive",
  warning: "statusWarning",
  demo: "statusDemo",
  danger: "statusDanger",
};

type StatusPillProps = {
  children: React.ReactNode;
  tone?: StatusPillTone;
  className?: string;
};

export function StatusPill({
  children,
  tone = "default",
  className,
}: StatusPillProps) {
  const classes = ["statusPill", toneClassName[tone], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
