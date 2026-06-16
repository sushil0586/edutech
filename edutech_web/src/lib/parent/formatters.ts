export function percentageLabel(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.round(numeric)}%`;
}

export function signedPercentageLabel(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  if (numeric > 0) {
    return `+${Math.round(numeric)}%`;
  }
  return `${Math.round(numeric)}%`;
}

export function trendDirectionLabel(direction: string, changePercentage?: string | number | null) {
  if (direction === "improving") {
    return `Improving ${signedPercentageLabel(changePercentage)}`;
  }
  if (direction === "declining") {
    return `Declining ${signedPercentageLabel(changePercentage)}`;
  }
  return "Stable trend";
}

export function titleCaseLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
