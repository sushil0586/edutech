import { cache } from "react";
import { getSessionAccessToken } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

type PortalApiState = {
  apiBaseUrl: string;
  apiConfigured: boolean;
};

function getPortalApiState(): PortalApiState {
  return {
    apiBaseUrl: API_BASE_URL,
    apiConfigured: Boolean(API_BASE_URL),
  };
}

async function performPortalRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const state = getPortalApiState();

  if (!state.apiConfigured) {
    throw new Error("Portal API is not configured.");
  }

  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = `Portal API request failed for ${path} with ${response.status}`;

    try {
      const payload = (await response.json()) as Record<string, unknown>;
      const detail = payload.detail;
      const apiMessage = payload.message;

      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = String(detail[0]);
      } else if (typeof apiMessage === "string" && apiMessage.trim()) {
        message = apiMessage;
      } else {
        const firstError = Object.values(payload).find((value) => {
          if (typeof value === "string" && value.trim()) return true;
          if (Array.isArray(value) && value.length > 0) return true;
          return false;
        });

        if (typeof firstError === "string") {
          message = firstError;
        } else if (Array.isArray(firstError) && firstError.length > 0) {
          message = String(firstError[0]);
        }
      }
    } catch {
      // Use the default message when the payload is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

const requestPortalJsonCached = cache(async <T>(path: string, accessToken: string) => {
  return performPortalRequest<T>(path, accessToken);
});

async function requestPortalJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Portal session is not available.");
  }

  const method = init?.method ?? "GET";
  const shouldUseCachedRead = method === "GET" && !init?.body && !init?.headers;

  if (shouldUseCachedRead) {
    return requestPortalJsonCached<T>(path, accessToken);
  }

  return performPortalRequest<T>(path, accessToken, init);
}

export async function fetchPortalCount(path: string) {
  const payload = await requestPortalJson<unknown>(path);

  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "count" in payload &&
    typeof (payload as { count?: unknown }).count === "number"
  ) {
    return (payload as { count: number }).count;
  }

  return 0;
}

export async function fetchPortalRecord<T>(path: string) {
  return requestPortalJson<T>(path);
}

export type InstituteDashboardSummary = {
  institute: {
    id: string;
    name: string;
    code: string;
    is_active: boolean;
    exam_default_count: number;
  };
  counts: {
    academic_years: number;
    programs: number;
    cohorts: number;
    subjects: number;
    topics: number;
    students: number;
    teachers: number;
    exams: number;
    results: number;
    pending_review_tasks: number;
    blocked_review_exams: number;
    recheck_review_tasks: number;
    assessment_family_mix: Array<{
      code: string;
      label: string;
      program_count: number;
    }>;
  };
  derived: {
    people_count: number;
    academic_structure_count: number;
    active_coverage_signals: number;
    readiness_score: number;
    review_ops_pressure: number;
    active_assessment_families: number;
    analytics_ready_exams: number;
    analytics_result_rows: number;
  };
  recent_exam_analytics: Array<{
    exam_id: string;
    exam_title: string;
    exam_code: string;
    average_percentage: string;
    total_attempted: number;
    total_passed: number;
    total_failed: number;
    last_calculated_at: string | null;
    experience_profile: import("@/features/dashboard/types").StudentExamExperienceProfile;
    score_distribution: Array<{
      label: string;
      min_percentage: number;
      max_percentage: number;
      count: number;
      percentage_share: number;
    }>;
    section_performance: Array<{
      section_id: string | null;
      section_name: string;
      section_order: number;
      total_questions: number;
      attempted_answers: number;
      correct_answers: number;
      wrong_answers: number;
      skipped_answers: number;
      accuracy_percentage: number;
      skip_percentage: number;
      marks_awarded: string;
      negative_marks_applied: string;
      average_time_seconds: number;
    }>;
  }>;
  aggregate_score_distribution: Array<{
    label: string;
    min_percentage: number;
    max_percentage: number;
    count: number;
    percentage_share: number;
  }>;
};

export async function fetchInstituteDashboardSummary() {
  return requestPortalJson<InstituteDashboardSummary>("/api/v1/institute/dashboard/summary/");
}

export async function fetchPortalList<T>(path: string) {
  const payload = await requestPortalJson<{
    results?: T[];
    count?: number;
  }>(path);

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload as unknown[])) {
    return payload as unknown as T[];
  }

  return [];
}

import type { AssessmentQuestionTypeDefinition } from "@/features/dashboard/types";

export type PortalReviewTask = {
  id: string;
  answer_id: string;
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  student_id: string;
  student_name: string;
  question_id: string;
  question_type: string;
  question_type_definition: AssessmentQuestionTypeDefinition | null;
  question_text_summary: string;
  question_text: string;
  assertion_text?: string;
  reason_text?: string;
  matrix_left_items?: string[];
  matrix_right_items?: string[];
  content_format: string;
  passage: string | null;
  passage_order: number | null;
  passage_detail: {
    id: string;
    title: string;
    content_format: string;
    passage_text: string;
    description: string;
  } | null;
  attachments: Array<{
    id: string;
    file: string;
    file_url: string;
    attachment_type: string;
    title: string;
    display_order: number;
    alt_text: string;
    is_inline: boolean;
    is_active: boolean;
  }>;
  media_context: {
    has_media: boolean;
    total_attachments: number;
    attachment_types: string[];
    primary_attachment_type: string | null;
    delivery_mode: string;
    preload_strategy: string;
    supports_audio_prompt: boolean;
    supports_video_prompt: boolean;
    supports_document_prompt: boolean;
    supports_visual_prompt: boolean;
    inline_attachment_count: number;
  };
  answer_text: string;
  answer_transcript: string;
  response_artifacts: Array<{
    asset_kind: string;
    upload_token: string;
    file_name?: string;
    mime_type?: string;
    size_bytes?: number;
    duration_seconds?: number;
    storage_status?: string;
    checksum?: string;
    storage_path?: string;
    file_url?: string;
  }>;
  review_guidance: string;
  rubric_checklist: string[];
  has_rubric: boolean;
  rubric: {
    mode: string;
    criteria: Array<{
      key: string;
      label: string;
      max_score: string;
      display_order: number;
      reviewer_hint: string;
      band_descriptors: unknown[];
    }>;
  } | null;
  rubric_scores: Array<{
    criterion_key: string;
    criterion_label: string;
    max_score: string;
    awarded_score: string;
    note: string;
  }>;
  rubric_total: string;
  question_marks: string;
  status: string;
  priority: string;
  opened_at: string;
  assigned_at: string | null;
  review_started_at: string | null;
  resolved_at: string | null;
  last_reviewed_at: string | null;
  latest_marks_awarded: string;
  latest_review_summary: string;
  assigned_to_teacher: string | null;
  assigned_to_teacher_name: string;
  last_reviewed_by_teacher: string | null;
  last_reviewed_by_teacher_name: string;
  created_at: string;
  updated_at: string;
};

export type PortalReviewTaskEvent = {
  id: string;
  event_type: string;
  from_status: string;
  to_status: string;
  marks_awarded: string | null;
  notes: string;
  metadata: Record<string, unknown>;
  actor_user: string | null;
  actor_user_name: string;
  actor_teacher: string | null;
  actor_teacher_name: string;
  created_at: string;
};

export type PortalReviewTaskDetail = PortalReviewTask & {
  events: PortalReviewTaskEvent[];
};

export type PortalReviewTaskSummary = {
  total: number;
  pending: number;
  assigned: number;
  in_review: number;
  reviewed: number;
  unassigned: number;
  recheck_requested: number;
  blocked_exams: number;
  average_turnaround_hours: number;
  slowest_turnaround_hours: number;
  oldest_open_hours: number;
  backlog_age_buckets: {
    under_4h: number;
    under_24h: number;
    under_72h: number;
    over_72h: number;
  };
  throughput_trend: {
    opened_last_24h: number;
    opened_previous_24h: number;
    resolved_last_24h: number;
    resolved_previous_24h: number;
    net_queue_change_last_24h: number;
    net_queue_change_previous_24h: number;
    direction: "improving" | "steady" | "worsening";
  };
  throughput_windows: Array<{
    label: string;
    hours: number;
    opened: number;
    resolved: number;
    net_queue_change: number;
  }>;
  release_risk_summary: {
    high_risk_exams: number;
    medium_risk_exams: number;
    low_risk_exams: number;
  };
  reviewers: Array<{
    teacher_id: string | null;
    teacher_name: string;
    task_count: number;
    pending_count: number;
    assigned_count: number;
    in_review_count: number;
    reviewed_count: number;
    recheck_requested_count: number;
    unresolved_count: number;
    oldest_open_hours: number;
    average_turnaround_hours: number;
  }>;
  exams: Array<{
    exam_id: string;
    exam_title: string;
    task_count: number;
    pending_count: number;
    assigned_count: number;
    in_review_count: number;
    reviewed_count: number;
    unassigned_count: number;
    recheck_requested_count: number;
    oldest_open_hours: number;
    release_risk_level: "high" | "medium" | "low";
  }>;
  oldest_pending_tasks: Array<{
    task_id: string;
    exam_id: string;
    exam_title: string;
    student_name: string;
    question_text_summary: string;
    assigned_to_teacher_name: string;
    status: string;
    opened_at: string | null;
  }>;
};

export async function fetchPortalReviewTaskPage(options?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  exam?: string;
  assignedToTeacher?: string;
  assignmentScope?: "all" | "unassigned" | "assigned";
}) {
  const params = new URLSearchParams();
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  if (options?.status && options.status !== "all") params.set("status", options.status);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  if (options?.exam?.trim()) params.set("exam", options.exam.trim());
  if (options?.assignedToTeacher?.trim()) params.set("assigned_to_teacher", options.assignedToTeacher.trim());
  if (options?.assignmentScope && options.assignmentScope !== "all") {
    params.set("assignment_scope", options.assignmentScope);
  }
  const query = params.toString();
  return requestPortalJson<{
    count: number;
    next: string | null;
    previous: string | null;
    results: PortalReviewTask[];
  }>(`/api/v1/attempts/review-tasks/${query ? `?${query}` : ""}`);
}

export async function fetchPortalReviewTaskSummary(options?: {
  status?: string;
  search?: string;
  exam?: string;
  assignedToTeacher?: string;
  assignmentScope?: "all" | "unassigned" | "assigned";
}) {
  const params = new URLSearchParams();
  if (options?.status && options.status !== "all") params.set("status", options.status);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  if (options?.exam?.trim()) params.set("exam", options.exam.trim());
  if (options?.assignedToTeacher?.trim()) params.set("assigned_to_teacher", options.assignedToTeacher.trim());
  if (options?.assignmentScope && options.assignmentScope !== "all") {
    params.set("assignment_scope", options.assignmentScope);
  }
  const query = params.toString();
  return requestPortalJson<PortalReviewTaskSummary>(
    `/api/v1/attempts/review-tasks/summary/${query ? `?${query}` : ""}`,
  );
}

export async function fetchPortalReviewTaskDetail(taskId: string) {
  return requestPortalJson<PortalReviewTaskDetail>(`/api/v1/attempts/review-tasks/${taskId}/`);
}

export async function assignPortalReviewTask(
  taskId: string,
  payload: {
    assigned_to_teacher?: string | null;
  },
) {
  return requestPortalJson<{
    success?: boolean;
    message?: string;
    data?: PortalReviewTaskDetail;
  }>(`/api/v1/attempts/review-tasks/${taskId}/assign/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkAssignPortalReviewTasks(payload: {
  task_ids: string[];
  assigned_to_teacher?: string | null;
}) {
  return requestPortalJson<{
    success?: boolean;
    message?: string;
    data?: PortalReviewTask[];
  }>("/api/v1/attempts/review-tasks/bulk-assign/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkRequestPortalReviewTasksRecheck(payload: {
  task_ids: string[];
  review_notes?: string;
}) {
  return requestPortalJson<{
    success?: boolean;
    message?: string;
    data?: PortalReviewTask[];
  }>("/api/v1/attempts/review-tasks/bulk-request-recheck/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkModeratePortalReviewTasks(payload: {
  task_ids: string[];
  review_notes?: string;
}) {
  return requestPortalJson<{
    success?: boolean;
    message?: string;
    data?: PortalReviewTask[];
  }>("/api/v1/attempts/review-tasks/bulk-moderate/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestPortalReviewTaskRecheck(
  taskId: string,
  payload: {
    review_notes?: string;
  },
) {
  return requestPortalJson<{
    success?: boolean;
    message?: string;
    data?: PortalReviewTaskDetail;
  }>(`/api/v1/attempts/review-tasks/${taskId}/request-recheck/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function moderatePortalReviewTask(
  taskId: string,
  payload: {
    marks_awarded: string;
    review_notes?: string;
    rubric_scores?: Array<{
      criterion_key: string;
      awarded_score: string;
      note?: string;
    }>;
  },
) {
  return requestPortalJson<{
    success?: boolean;
    message?: string;
    data?: PortalReviewTaskDetail;
  }>(`/api/v1/attempts/review-tasks/${taskId}/moderate/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
