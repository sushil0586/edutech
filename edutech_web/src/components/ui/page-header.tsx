type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  contextLabel?: string;
  action?: React.ReactNode;
  className?: string;
  headingLevel?: 1 | 2 | 3;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  contextLabel,
  action,
  className,
  headingLevel = 1,
}: PageHeaderProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={className ? `pageHeader ${className}` : "pageHeader"}>
      <div className="pageHeaderCopy">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        {contextLabel ? <span className="pageHeaderContext">{contextLabel}</span> : null}
        <Heading>{title}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="pageHeaderAction">{action}</div> : null}
    </div>
  );
}
