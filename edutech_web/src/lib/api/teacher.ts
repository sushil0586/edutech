import { cache } from "react";
import {
  TeacherExam,
  TeacherExamPage,
  TeacherExamAttempt,
  TeacherExamAttemptPage,
  TeacherExamPublishReadiness,
  TeacherAttemptIntervention,
  TeacherInsightSummary,
  TeacherLeaderboardPage,
  TeacherLeaderboardRow,
  TeacherLiveExamMonitor,
  TeacherAttemptQuestionAnalysis,
  TeacherQuestionAnalysis,
  TeacherQuestionAnalysisPage,
  TeacherResultPublishReadiness,
  TeacherResultSummary,
  StudentTopicPerformance,
  PaginatedResponse,
} from "@/features/dashboard/types";
import { getSessionAccessToken } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export type TeacherApiState = {
  apiBaseUrl: string;
  apiConfigured: boolean;
};

export function getTeacherApiState(): TeacherApiState {
  return {
    apiBaseUrl: API_BASE_URL,
    apiConfigured: Boolean(API_BASE_URL),
  };
}

async function performTeacherRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    throw new Error("Teacher API is not configured.");
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
    let message = `Teacher API request failed for ${path} with ${response.status}`;

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
      // Fall back to the default message if the body is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

const requestTeacherJsonCached = cache(async <T>(path: string, accessToken: string) => {
  return performTeacherRequest<T>(path, accessToken);
});

async function requestTeacherJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Teacher session is not available.");
  }

  const method = init?.method ?? "GET";
  const shouldUseCachedRead = method === "GET" && !init?.body && !init?.headers;

  if (shouldUseCachedRead) {
    return requestTeacherJsonCached<T>(path, accessToken);
  }

  return performTeacherRequest<T>(path, accessToken, init);
}

export async function fetchTeacherExams() {
  return requestTeacherJson<TeacherExam[]>("/api/v1/teacher/exams/");
}

export async function fetchTeacherExamPage(
  options?: {
    page?: number;
    pageSize?: number;
    filter?:
      | "all"
      | "live"
      | "scheduled"
      | "draft"
      | "completed"
      | "elevated"
      | "access_key"
      | "economy_gated"
      | "stars_gated"
      | "entitlement_gated";
    sort?:
      | "recommended"
      | "latest"
      | "title"
      | "risk_high"
      | "students"
      | "start_soon"
      | "duration_short"
      | "learners_high"
      | "marks_high";
    search?: string;
    teacher?: string;
  },
) {
  const params = new URLSearchParams();
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  if (options?.filter && options.filter !== "all") params.set("filter", options.filter);
  if (options?.sort && options.sort !== "recommended") params.set("sort", options.sort);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  if (options?.teacher?.trim()) params.set("teacher", options.teacher.trim());
  const query = params.toString();
  return requestTeacherJson<TeacherExamPage>(`/api/v1/teacher/exams/${query ? `?${query}` : ""}`);
}

export async function fetchTeacherExamDetail(examId: string) {
  return requestTeacherJson<TeacherExam>(`/api/v1/exams/${examId}/`);
}

export async function fetchTeacherExamPublishReadiness(examId: string) {
  const response = await requestTeacherJson<{
    success?: boolean;
    message?: string;
    data: TeacherExamPublishReadiness;
  }>(`/api/v1/exams/${examId}/publish-readiness/`);
  return response.data;
}

export async function fetchTeacherInsightSummary() {
  return requestTeacherJson<TeacherInsightSummary>("/api/v1/teacher/insights/summary/");
}

export async function fetchTeacherResultSummary() {
  return requestTeacherJson<TeacherResultSummary[]>("/api/v1/teacher/results/summary/");
}

export async function fetchTeacherResultPublishReadiness(examId: string) {
  const response = await requestTeacherJson<{
    success?: boolean;
    message?: string;
    data: TeacherResultPublishReadiness;
  }>(`/api/v1/results/exam/${examId}/publish-readiness/`);
  return response.data;
}

export async function fetchTeacherLiveExamMonitor(examId: string) {
  return requestTeacherJson<TeacherLiveExamMonitor>(
    `/api/v1/results/exam/${examId}/live-monitor/`,
  );
}

export async function fetchTeacherExamLeaderboard(
  examId: string,
  options?: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams();
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  const query = params.toString();
  return requestTeacherJson<TeacherLeaderboardPage>(
    `/api/v1/results/exam/${examId}/leaderboard/${query ? `?${query}` : ""}`,
  );
}

export async function fetchTeacherExamAttempts(examId: string) {
  return requestTeacherJson<TeacherExamAttempt[]>(
    `/api/v1/results/exam/${examId}/attempts/`,
  );
}

export async function fetchTeacherExamAttemptPage(
  examId: string,
  options?: {
    page?: number;
    pageSize?: number;
    filter?: "all" | "low_performers" | "skipped_heavy" | "critical" | "watch" | "stable" | "in_progress" | "auto_submitted";
    sort?: "risk_high" | "latest" | "name" | "alerts_high" | "score_low" | "warnings_high" | "time_long";
    attemptId?: string | null;
    search?: string;
  },
) {
  const params = new URLSearchParams();
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  if (options?.filter && options.filter !== "all") params.set("filter", options.filter);
  if (options?.sort && options.sort !== "latest") params.set("sort", options.sort);
  if (options?.attemptId) params.set("attempt_id", options.attemptId);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  const query = params.toString();
  return requestTeacherJson<TeacherExamAttemptPage>(
    `/api/v1/results/exam/${examId}/attempts/${query ? `?${query}` : ""}`,
  );
}

export async function fetchTeacherAttemptInterventions(attemptId: string) {
  return requestTeacherJson<TeacherAttemptIntervention[]>(
    `/api/v1/results/attempt/${attemptId}/interventions/`,
  );
}

export async function fetchTeacherQuestionAnalysis(
  examId: string,
  options?: { page?: number; pageSize?: number; filter?: "all" | "hard_questions" | "skipped_often" | "revision_candidates" },
) {
  const params = new URLSearchParams();
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  if (options?.filter && options.filter !== "all") params.set("filter", options.filter);
  const query = params.toString();
  return requestTeacherJson<TeacherQuestionAnalysisPage>(
    `/api/v1/results/exam/${examId}/question-analysis/${query ? `?${query}` : ""}`,
  );
}

export async function fetchTeacherAttemptQuestionAnalysis(
  examId: string,
  options?: {
    attemptId?: string | null;
    filter?: "all" | "correct" | "wrong" | "skipped" | "marked" | "slow";
    search?: string;
  },
) {
  const params = new URLSearchParams();
  if (options?.attemptId) params.set("attempt_id", options.attemptId);
  if (options?.filter && options.filter !== "all") params.set("filter", options.filter);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  const query = params.toString();
  return requestTeacherJson<TeacherAttemptQuestionAnalysis>(
    `/api/v1/results/exam/${examId}/attempt-question-analysis/${query ? `?${query}` : ""}`,
  );
}

export async function generateTeacherResultsForExam(examId: string) {
  return requestTeacherJson<Record<string, unknown>>("/api/v1/results/generate-for-exam/", {
    method: "POST",
    body: JSON.stringify({ exam: examId }),
  });
}

export async function calculateTeacherExamRanks(examId: string) {
  return requestTeacherJson<Record<string, unknown>>("/api/v1/results/calculate-ranks/", {
    method: "POST",
    body: JSON.stringify({ exam: examId }),
  });
}

export async function publishTeacherExamResults(examId: string) {
  return requestTeacherJson<Record<string, unknown>>(
    "/api/v1/results/publish-exam-results/",
    {
      method: "POST",
      body: JSON.stringify({ exam: examId }),
    },
  );
}

export async function forceSubmitTeacherAttempt(attemptId: string) {
  return requestTeacherJson<Record<string, unknown>>(
    "/api/v1/results/force-submit-attempt/",
    {
      method: "POST",
      body: JSON.stringify({ attempt: attemptId }),
    },
  );
}

export async function createTeacherAttemptInterventionNote(payload: {
  attempt: string;
  note: string;
  follow_up: "monitoring" | "contacted" | "force_submit_considered" | "resolved";
}) {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherAttemptIntervention;
  }>("/api/v1/results/attempt-intervention-note/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function manualReviewTeacherAnswer(
  answerId: string,
  payload: {
    marks_awarded: string;
    review_notes?: string;
  },
) {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/api/v1/attempts/answers/${answerId}/manual-review/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

import type { AssessmentQuestionTypeDefinition } from "@/features/dashboard/types";

export type TeacherReviewTask = {
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

export type TeacherReviewTaskEvent = {
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

export type TeacherReviewTaskDetail = TeacherReviewTask & {
  events: TeacherReviewTaskEvent[];
};

export type TeacherReviewTaskSummary = {
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

export async function fetchTeacherReviewTaskPage(options?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  exam?: string;
}) {
  const params = new URLSearchParams();
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  if (options?.status && options.status !== "all") params.set("status", options.status);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  if (options?.exam?.trim()) params.set("exam", options.exam.trim());
  const query = params.toString();
  return requestTeacherJson<PaginatedResponse<TeacherReviewTask>>(
    `/api/v1/attempts/review-tasks/${query ? `?${query}` : ""}`,
  );
}

export async function fetchTeacherReviewTaskSummary(options?: {
  status?: string;
  search?: string;
  exam?: string;
}) {
  const params = new URLSearchParams();
  if (options?.status && options.status !== "all") params.set("status", options.status);
  if (options?.search?.trim()) params.set("search", options.search.trim());
  if (options?.exam?.trim()) params.set("exam", options.exam.trim());
  const query = params.toString();
  return requestTeacherJson<TeacherReviewTaskSummary>(
    `/api/v1/attempts/review-tasks/summary/${query ? `?${query}` : ""}`,
  );
}

export async function fetchTeacherReviewTaskDetail(taskId: string) {
  return requestTeacherJson<TeacherReviewTaskDetail>(`/api/v1/attempts/review-tasks/${taskId}/`);
}

export async function submitTeacherReviewTask(
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
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherReviewTaskDetail;
  }>(`/api/v1/attempts/review-tasks/${taskId}/submit-review/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assignTeacherReviewTaskToMe(taskId: string) {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherReviewTaskDetail;
  }>(`/api/v1/attempts/review-tasks/${taskId}/assign-to-me/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function claimNextTeacherReviewTask() {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherReviewTaskDetail;
  }>("/api/v1/attempts/review-tasks/claim-next/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function requestTeacherReviewTaskRecheck(
  taskId: string,
  payload: {
    review_notes?: string;
  },
) {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherReviewTaskDetail;
  }>(`/api/v1/attempts/review-tasks/${taskId}/request-recheck/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchTeacherTopicPerformance(
  examId: string,
  options?: { page?: number; pageSize?: number },
) {
  const params = new URLSearchParams();
  params.set("exam", examId);
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  if (options?.pageSize) params.set("page_size", String(options.pageSize));
  return requestTeacherJson<PaginatedResponse<StudentTopicPerformance>>(
    `/api/v1/results/topic-performance/?${params.toString()}`,
  );
}

export async function runTeacherExamAction(
  examId: string,
  action:
    | "sync-marks"
    | "publish"
    | "refresh-status"
    | "mark-live"
    | "mark-completed"
    | "cancel"
    | "regenerate-access-key"
    | "toggle-access-key",
  payload?: {
    changed_by?: string;
    remarks?: string;
  },
) {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherExam;
  }>(`/api/v1/exams/${examId}/${action}/`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function configureTeacherExamEconomyAccess(
  examId: string,
  payload: {
    policy_type?: string;
    star_cost?: number;
    entitlement_code?: string;
    priority?: number;
  },
) {
  return requestTeacherJson<{
    success?: boolean;
    message?: string;
    data?: TeacherExam;
  }>(`/api/v1/exams/${examId}/economy-access-policy/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
