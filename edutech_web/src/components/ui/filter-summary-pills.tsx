type FilterSummaryItem = {
  label: string;
  value: string | number | null | undefined;
};

export function FilterSummaryPills({
  items,
  className = "workspaceFilterChips",
}: {
  items: FilterSummaryItem[];
  className?: string;
}) {
  const visibleItems = items.filter(
    (item): item is { label: string; value: string | number } =>
      item.value !== null && item.value !== undefined && item.value !== "",
  );

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className={className}>
      {visibleItems.map((item) => (
        <span className="statusPill statusDefault" key={item.label}>
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  );
}
