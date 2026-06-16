export function percentageLabel(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return `${Math.round(numericValue)}%`;
}

export function signedPercentageLabel(
  value: string | number | null | undefined,
) {
  const numericValue = Math.round(Number(value ?? 0));
  if (numericValue > 0) {
    return `+${numericValue}%`;
  }
  return `${numericValue}%`;
}

export function durationLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function durationMinutesLabel(totalSeconds: number) {
  return `${Math.round(totalSeconds / 60)}m`;
}

export function studentDateTimeLabel(value: string | null) {
  if (!value) return "In progress";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function titleCaseState(value: string) {
  return value.replaceAll("_", " ");
}

export function benchmarkLabel(value: string) {
  const normalized = value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .trim();

  if (!normalized) {
    return "Peer scope";
  }

  return normalized
    .split(/\s+/)
    .map((part) =>
      /^\d+$/.test(part) ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

export function peerRecordLabel(count: number, noun: "records" | "results" = "records") {
  const suffix = count === 1 ? noun.slice(0, -1) : noun;
  return `${count} peer ${suffix}`;
}

export function questionTypeLabel(value: string) {
  switch (value) {
    case "mcq_single":
      return "Single choice";
    case "mcq_multiple":
      return "Multiple choice";
    case "true_false":
      return "True / False";
    case "short_answer":
      return "Short answer";
    default:
      return titleCaseState(value);
  }
}

export function trendDirectionLabel(value: string) {
  switch (value) {
    case "improving":
      return "Improving";
    case "declining":
      return "Needs attention";
    case "stable":
      return "Stable";
    default:
      return titleCaseState(value);
  }
}
