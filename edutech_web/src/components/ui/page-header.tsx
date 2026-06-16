type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  contextLabel?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  contextLabel,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={className ? `pageHeader ${className}` : "pageHeader"}>
      <div className="pageHeaderCopy">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        {contextLabel ? <span className="pageHeaderContext">{contextLabel}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="pageHeaderAction">{action}</div> : null}
    </div>
  );
}
