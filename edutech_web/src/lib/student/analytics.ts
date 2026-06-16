import {
  fetchStudentAvailableExams,
  fetchStudentInsightSummary,
  fetchStudentResults,
  fetchStudentTopicPerformance,
  getStudentApiState,
} from "@/lib/api/student";

export type StudentAnalyticsScopedFilters = {
  subject?: string | null;
  source?: string | null;
  teacher?: string | null;
};

export type StudentAnalyticsSourceKey = "platform" | "institute" | "teacher";

export function decodeAnalyticsParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function sourceDescriptor(row: {
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name?: string | null;
}) {
  if (row.source_type === "teacher" && row.source_teacher_name) {
    return `${row.source_label} · ${row.source_teacher_name}`;
  }

  if (row.source_name && row.source_name !== row.source_label) {
    return `${row.source_label} · ${row.source_name}`;
  }

  return row.source_label;
}

export function scoreTone(value: number) {
  if (value >= 75) return "good";
  if (value >= 55) return "mid";
  if (value >= 40) return "warn";
  return "risk";
}

function withFilterQuery(
  basePath: string,
  filters?: StudentAnalyticsScopedFilters & {
    label?: string | null;
  },
) {
  const query = new URLSearchParams();
  if (filters?.subject) query.set("subject", filters.subject);
  if (filters?.source) query.set("source", filters.source);
  if (filters?.teacher) query.set("teacher", filters.teacher);
  if (filters?.label) query.set("label", filters.label);
  const queryString = query.toString();
  return `${basePath}${queryString ? `?${queryString}` : ""}`;
}

export function buildAnalyticsTimelineHref(
  filters?: StudentAnalyticsScopedFilters,
) {
  return withFilterQuery("/app/analytics/timeline", filters);
}

export function buildAnalyticsActionsHref(
  filters?: StudentAnalyticsScopedFilters,
) {
  return withFilterQuery("/app/analytics/actions", filters);
}

export function isStudentAnalyticsSourceKey(
  value: string,
): value is StudentAnalyticsSourceKey {
  return value === "platform" || value === "institute" || value === "teacher";
}

export function buildAnalyticsSourceHref(params: {
  sourceKey: StudentAnalyticsSourceKey;
  subject?: string | null;
  teacher?: string | null;
  label?: string | null;
}) {
  return withFilterQuery(
    `/app/analytics/sources/${encodeURIComponent(params.sourceKey)}`,
    params,
  );
}

export function buildAnalyticsSubjectHref(
  subject: string,
  filters?: Omit<StudentAnalyticsScopedFilters, "subject">,
) {
  return withFilterQuery(
    `/app/analytics/subjects/${encodeURIComponent(subject)}`,
    filters,
  );
}

export function buildAnalyticsTopicHref(params: {
  topicId: string;
  subject?: string | null;
  label?: string | null;
  source?: string | null;
  teacher?: string | null;
}) {
  return withFilterQuery(
    `/app/analytics/topics/${encodeURIComponent(params.topicId)}`,
    params,
  );
}

export function buildAnalyticsQuestionTypeHref(params: {
  questionType: string;
  subject?: string | null;
  source?: string | null;
  teacher?: string | null;
}) {
  return withFilterQuery(
    `/app/analytics/question-types/${encodeURIComponent(params.questionType)}`,
    params,
  );
}

export function buildQuestionAnalyticsHref(filters: {
  subject?: string | null;
  topic?: string | null;
  questionType?: string | null;
  source?: string | null;
  teacher?: string | null;
}) {
  const query = new URLSearchParams();
  if (filters.subject) query.set("subject", filters.subject);
  if (filters.topic) query.set("topic", filters.topic);
  if (filters.questionType) query.set("question_type", filters.questionType);
  if (filters.source) query.set("source", filters.source);
  if (filters.teacher) query.set("teacher", filters.teacher);
  const queryString = query.toString();
  return `/app/analytics/questions${queryString ? `?${queryString}` : ""}`;
}

export function buildAnalyticsResultsCompareHref(
  filters?: StudentAnalyticsScopedFilters,
) {
  return withFilterQuery("/app/analytics/results/compare", filters);
}

export async function loadStudentAnalyticsBundle() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      summary: null,
      results: [],
      topicPerformance: [],
      exams: [],
    };
  }

  try {
    const summary = await fetchStudentInsightSummary();
    const [results, topicPerformanceResponse, exams] = await Promise.all([
      fetchStudentResults(),
      fetchStudentTopicPerformance(summary.student_id),
      fetchStudentAvailableExams(),
    ]);

    return {
      source: "live" as const,
      summary,
      results,
      topicPerformance: topicPerformanceResponse.results,
      exams,
    };
  } catch {
    return {
      source: "error" as const,
      summary: null,
      results: [],
      topicPerformance: [],
      exams: [],
    };
  }
}
