import { getSessionAccessToken } from "@/lib/auth/session";

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

async function requestParentJson<T>(path: string, init?: RequestInit): Promise<T> {
  const state = getParentApiState();

  if (!state.apiConfigured) {
    throw new Error("Parent API is not configured.");
  }

  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Parent session is not available.");
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

export async function fetchParentAlerts(childId?: string) {
  const query = childId ? `?child_id=${encodeURIComponent(childId)}` : "";
  return requestParentJson<ParentAlert[]>(`/api/v1/parent/alerts/${query}`);
}

export async function fetchParentPreferences() {
  return requestParentJson<ParentPreferences>("/api/v1/parent/preferences/");
}
