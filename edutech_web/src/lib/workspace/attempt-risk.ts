import type { TeacherExam, TeacherExamAttempt } from "@/features/dashboard/types";

export type AttemptHealth = "critical" | "watch" | "stable";
export type SecurityExamFilter = "all" | "live" | "elevated" | "access_key" | "completed";
export type SecurityExamSort = "recommended" | "latest" | "title" | "risk_high" | "students";
export type SecurityAttemptFilter =
  | "all"
  | "critical"
  | "watch"
  | "stable"
  | "in_progress"
  | "auto_submitted";
export type SecurityAttemptSort = "risk_high" | "latest" | "name" | "alerts_high" | "score_low";
export type SecurityAttemptGroup = "none" | "health" | "status";

export function latestIntegrityLabel(eventType: string | null | undefined) {
  if (!eventType) {
    return "No integrity events";
  }

  return eventType.replaceAll("_", " ");
}

export function securityTitleCase(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return value.replaceAll("_", " ");
}

export function attemptHealth(attempt: Pick<TeacherExamAttempt, "status" | "is_auto_submitted" | "alerts" | "integrity_summary">): AttemptHealth {
  if (
    attempt.is_auto_submitted ||
    attempt.integrity_summary.threshold_reached ||
    attempt.alerts.some((alert) => alert.severity === "high")
  ) {
    return "critical";
  }

  if (
    attempt.integrity_summary.violation_count > 0 ||
    attempt.alerts.some((alert) => alert.severity === "medium") ||
    attempt.status === "in_progress"
  ) {
    return "watch";
  }

  return "stable";
}

export function attemptHealthLabel(health: AttemptHealth) {
  if (health === "critical") return "Intervene now";
  if (health === "watch") return "Watch closely";
  return "Stable";
}

export function attemptHealthTone(health: AttemptHealth) {
  if (health === "critical") return "statusWarning";
  if (health === "watch") return "statusDemo";
  return "statusLive";
}

export function attemptHealthReason(
  attempt: Pick<TeacherExamAttempt, "status" | "is_auto_submitted" | "alerts" | "integrity_summary">,
) {
  if (attempt.is_auto_submitted) {
    return "Attempt was auto-submitted after enforcement.";
  }

  if (attempt.integrity_summary.threshold_reached) {
    return "Integrity threshold has been reached.";
  }

  const highAlert = attempt.alerts.find((alert) => alert.severity === "high");
  if (highAlert) {
    return highAlert.label;
  }

  if (attempt.integrity_summary.violation_count > 0) {
    return `Warnings recorded: ${attempt.integrity_summary.violation_count}. Latest: ${latestIntegrityLabel(
      attempt.integrity_summary.latest_event?.event_type,
    )}.`;
  }

  if (attempt.status === "in_progress") {
    return "Attempt is still in progress and should remain visible.";
  }

  return "No active risk signals returned from monitoring.";
}

export function attemptHealthPriorityScore(
  attempt: Pick<TeacherExamAttempt, "status" | "is_auto_submitted" | "alerts" | "integrity_summary">,
) {
  let score = 0;
  if (attempt.is_auto_submitted) score += 100;
  if (attempt.integrity_summary.threshold_reached) score += 80;
  if (attempt.alerts.some((alert) => alert.severity === "high")) score += 60;
  if (attempt.alerts.some((alert) => alert.severity === "medium")) score += 30;
  score += Math.min(attempt.integrity_summary.violation_count, 10) * 5;
  if (attempt.status === "in_progress") score += 10;
  return score;
}

export function matchesSecurityAttemptFilter(
  attempt: TeacherExamAttempt,
  filter: SecurityAttemptFilter,
) {
  const health = attemptHealth(attempt);

  switch (filter) {
    case "critical":
      return health === "critical";
    case "watch":
      return health === "watch";
    case "stable":
      return health === "stable";
    case "in_progress":
      return attempt.status === "in_progress";
    case "auto_submitted":
      return attempt.is_auto_submitted;
    default:
      return true;
  }
}

export function matchesSecurityAttemptSearch(attempt: TeacherExamAttempt, search: string) {
  if (!search) {
    return true;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return [
    attempt.student_name,
    attempt.student_admission_no,
    attempt.status,
    attempt.exam_title,
    attempt.alerts.map((alert) => alert.label).join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function sortSecurityAttempts(
  attempts: TeacherExamAttempt[],
  sort: SecurityAttemptSort,
) {
  const items = attempts.slice();

  items.sort((left, right) => {
    if (sort === "name") {
      return left.student_name.localeCompare(right.student_name);
    }

    if (sort === "alerts_high") {
      return (
        right.alerts.length - left.alerts.length ||
        attemptHealthPriorityScore(right) - attemptHealthPriorityScore(left)
      );
    }

    if (sort === "score_low") {
      return (
        Number(left.percentage) - Number(right.percentage) ||
        attemptHealthPriorityScore(right) - attemptHealthPriorityScore(left)
      );
    }

    if (sort === "latest") {
      return (
        new Date(right.submitted_at ?? right.started_at ?? 0).getTime() -
          new Date(left.submitted_at ?? left.started_at ?? 0).getTime() ||
        attemptHealthPriorityScore(right) - attemptHealthPriorityScore(left)
      );
    }

    return (
      attemptHealthPriorityScore(right) - attemptHealthPriorityScore(left) ||
      new Date(right.submitted_at ?? right.started_at ?? 0).getTime() -
        new Date(left.submitted_at ?? left.started_at ?? 0).getTime()
    );
  });

  return items;
}

export function groupSecurityAttempts(
  attempts: TeacherExamAttempt[],
  group: SecurityAttemptGroup,
) {
  if (group === "none") {
    return [{ label: "All attempts", items: attempts }];
  }

  const registry = new Map<string, TeacherExamAttempt[]>();

  for (const attempt of attempts) {
    const label =
      group === "health"
        ? attemptHealthLabel(attemptHealth(attempt))
        : securityTitleCase(attempt.status);
    const current = registry.get(label);
    if (current) {
      current.push(attempt);
    } else {
      registry.set(label, [attempt]);
    }
  }

  return Array.from(registry.entries()).map(([label, items]) => ({ label, items }));
}

export function matchesSecurityExamFilter(exam: TeacherExam, filter: SecurityExamFilter) {
  switch (filter) {
    case "live":
      return exam.status === "live";
    case "elevated":
      return exam.security_mode !== "normal";
    case "access_key":
      return exam.access_key_enabled;
    case "completed":
      return exam.status === "completed";
    default:
      return true;
  }
}

export function matchesSecurityExamSearch(exam: TeacherExam, search: string) {
  if (!search) {
    return true;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return [
    exam.title,
    exam.code,
    exam.security_mode,
    exam.status,
    exam.subject_name ?? "",
    exam.program_name ?? "",
    exam.cohort_name ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function sortSecurityExams(exams: TeacherExam[], sort: SecurityExamSort) {
  const items = exams.slice();

  items.sort((left, right) => {
    if (sort === "title") {
      return left.title.localeCompare(right.title);
    }

    if (sort === "students") {
      return (
        right.assigned_student_count - left.assigned_student_count ||
        right.updated_at.localeCompare(left.updated_at)
      );
    }

    if (sort === "risk_high") {
      const score = (exam: TeacherExam) =>
        (exam.security_mode === "fullscreen" ? 4 : 0) +
        (exam.security_mode === "focus" ? 3 : 0) +
        (exam.access_key_enabled ? 2 : 0) +
        (exam.status === "live" ? 2 : 0) +
        (exam.status === "completed" ? 1 : 0);
      return score(right) - score(left) || right.updated_at.localeCompare(left.updated_at);
    }

    if (sort === "latest") {
      return right.updated_at.localeCompare(left.updated_at);
    }

    const recommendedScore = (exam: TeacherExam) =>
      (exam.status === "live" ? 8 : 0) +
      (exam.security_mode !== "normal" ? 5 : 0) +
      (exam.access_key_enabled ? 3 : 0);

    return recommendedScore(right) - recommendedScore(left) || right.updated_at.localeCompare(left.updated_at);
  });

  return items;
}
