import Link from "next/link";

type StudentKpiCardItem = {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "default" | "primary";
  className?: string;
  href?: string;
  icon?: React.ReactNode;
};

type StudentKpiGridProps = {
  items: StudentKpiCardItem[];
  className?: string;
};

export function StudentKpiGrid({
  items,
  className = "resultsSummaryGrid",
}: StudentKpiGridProps) {
  return (
    <section className={className}>
      {items.map((item) => {
        const classes = [
          "metricCard",
          item.tone === "primary" ? "metricCardPrimary" : "",
          "dashboardHeroCard",
          item.className,
        ]
          .filter(Boolean)
          .join(" ");

        const content = (
          <>
            {item.icon ? <span className="metricCardIcon">{item.icon}</span> : null}
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.note ? <small>{item.note}</small> : null}
          </>
        );

        if (item.href) {
          return (
            <Link className={classes} href={item.href} key={`${item.label}-${String(item.value)}`}>
              {content}
            </Link>
          );
        }

        return (
          <article className={classes} key={`${item.label}-${String(item.value)}`}>
            {content}
          </article>
        );
      })}
    </section>
  );
}
