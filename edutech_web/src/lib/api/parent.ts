import { cache } from "react";
import { getSessionAccessToken } from "@/lib/auth/session";
import type { PaginatedResponse } from "@/features/dashboard/types";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export type ParentApiState = {
  apiBaseUrl: string;
  apiConfigured: boolean;
};

export type ParentChildRecord = {
  relationship_id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  program_name: string;
  academic_year_name: string;
  cohort_name: string;
  relationship_type: string;
  relationship_label: string;
  is_primary_contact: boolean;
  permissions: {
    can_view_progress: boolean;
    can_view_results: boolean;
    can_view_wallet: boolean;
    can_receive_alerts: boolean;
    can_receive_weekly_summary: boolean;
  };
  status: string;
  is_active: boolean;
};

export type ParentDashboardSummary = {
  child: {
    student_id: string;
    student_name: string;
    admission_no: string;
    program_name: string;
    academic_year_name: string;
    cohort_name: string;
  } | null;
  progress_summary: {
    average_percentage: string;
    accuracy_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
    improvement_trend: {
      direction: string;
      change_percentage: string;
    };
  } | null;
  recent_results: Array<{
    exam_id: string;
    exam_title: string;
    exam_code: string;
    percentage: string;
    final_score: string;
    result_status: string;
    published_at: string | null;
  }>;
  weak_subjects: Array<{
    subject_id: string;
    subject_name: string;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
  }>;
  weak_topics: Array<{
    topic_id: string;
    topic_name: string;
    subject_name: string;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
  }>;
  alert_summary: {
    total: number;
    unread: number;
    high: number;
    warning: number;
  };
  insight_messages: string[];
};

export type ParentProgressSummary = {
  child: {
    student_id: string;
    student_name: string;
    admission_no: string;
  } | null;
  average_percentage: string;
  accuracy_percentage: string;
  strongest_subjects: Array<{
    subject_id: string;
    subject_name: string;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
  }>;
  weakest_subjects: Array<{
    subject_id: string;
    subject_name: string;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
  }>;
  weak_topics: Array<{
    topic_id: string;
    topic_name: string;
    subject_name: string;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
  }>;
  recent_results: Array<{
    exam_id: string;
    exam_title: string;
    exam_code: string;
    percentage: string;
    final_score: string;
    result_status: string;
    published_at: string | null;
  }>;
  attempt_behavior: {
    attempt_count: number;
    attempted_questions: number;
    skipped_questions: number;
  };
  improvement_trend: {
    direction: string;
    change_percentage: string;
  };
};

export type ParentAlert = {
  id: string;
  student: string | null;
  student_name: string;
  relationship: string | null;
  relationship_type: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  source_type: string;
  source_reference: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type ParentAlertListResponse = PaginatedResponse<ParentAlert> & {
  summary: {
    total: number;
    unread: number;
    read: number;
    resolved: number;
    dismissed: number;
    high: number;
    warning: number;
    info: number;
  };
  available_alert_types: Array<{
    alert_type: string;
    count: number;
  }>;
  applied_filters: {
    child_id: string | null;
    status: string;
    severity: string;
    alert_type: string;
    ordering: string;
    search: string;
  };
};

export type ParentPreferences = {
  score_drops: boolean;
  inactivity: boolean;
  milestones: boolean;
  weekly_summary: boolean;
  result_published: boolean;
  high_risk_exam_integrity: boolean;
};

export function getParentApiState(): ParentApiState {
  return {
    apiBaseUrl: API_BASE_URL,
    apiConfigured: Boolean(API_BASE_URL),
  };
}

async function performParentRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    throw new Error("Parent API is not configured.");
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
    let message = `Parent API request failed for ${path} with ${response.status}`;

    try {
      const payload = (await response.json()) as Record<string, unknown>;
      const detail = payload.detail;

      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = String(detail[0]);
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

const requestParentJsonCached = cache(async <T>(path: string, accessToken: string) => {
  return performParentRequest<T>(path, accessToken);
});

async function requestParentJson<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Parent session is not available.");
  }

  const method = init?.method ?? "GET";
  const shouldUseCachedRead = method === "GET" && !init?.body && !init?.headers;

  if (shouldUseCachedRead) {
    return requestParentJsonCached<T>(path, accessToken);
  }

  return performParentRequest<T>(path, accessToken, init);
}

export async function fetchParentChildren() {
  return requestParentJson<ParentChildRecord[]>("/api/v1/parent/children/");
}

export async function fetchParentChildDetail(childId: string) {
  return requestParentJson<ParentChildRecord>(`/api/v1/parent/children/${childId}/`);
}

export async function fetchParentDashboardSummary(childId?: string) {
  const query = childId ? `?child_id=${encodeURIComponent(childId)}` : "";
  return requestParentJson<ParentDashboardSummary>(`/api/v1/parent/dashboard/summary/${query}`);
}

export async function fetchParentProgress(childId?: string) {
  const query = childId ? `?child_id=${encodeURIComponent(childId)}` : "";
  return requestParentJson<ParentProgressSummary>(`/api/v1/parent/progress/${query}`);
}

export async function fetchParentAlerts(filters?: {
  childId?: string;
  status?: string;
  severity?: string;
  alertType?: string;
  ordering?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();

  if (filters?.childId) params.set("child_id", filters.childId);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.severity && filters.severity !== "all") params.set("severity", filters.severity);
  if (filters?.alertType && filters.alertType !== "all") params.set("alert_type", filters.alertType);
  if (filters?.ordering && filters.ordering !== "latest") params.set("ordering", filters.ordering);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("page_size", String(filters.pageSize));

  const query = params.toString();
  return requestParentJson<ParentAlertListResponse>(`/api/v1/parent/alerts/${query ? `?${query}` : ""}`);
}

export async function fetchParentPreferences() {
  return requestParentJson<ParentPreferences>("/api/v1/parent/preferences/");
}
