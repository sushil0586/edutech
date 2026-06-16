import {
  TeacherExam,
  TeacherExamAttempt,
  TeacherAttemptIntervention,
  TeacherInsightSummary,
  TeacherLeaderboardRow,
  TeacherLiveExamMonitor,
  TeacherQuestionAnalysis,
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

async function requestTeacherJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const state = getTeacherApiState();

  if (!state.apiConfigured) {
    throw new Error("Teacher API is not configured.");
  }

  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Teacher session is not available.");
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

export async function fetchTeacherExams() {
  return requestTeacherJson<TeacherExam[]>("/api/v1/teacher/exams/");
}

export async function fetchTeacherExamDetail(examId: string) {
  return requestTeacherJson<TeacherExam>(`/api/v1/exams/${examId}/`);
}

export async function fetchTeacherInsightSummary() {
  return requestTeacherJson<TeacherInsightSummary>("/api/v1/teacher/insights/summary/");
}

export async function fetchTeacherResultSummary() {
  return requestTeacherJson<TeacherResultSummary[]>("/api/v1/teacher/results/summary/");
}

export async function fetchTeacherLiveExamMonitor(examId: string) {
  return requestTeacherJson<TeacherLiveExamMonitor>(
    `/api/v1/results/exam/${examId}/live-monitor/`,
  );
}

export async function fetchTeacherExamLeaderboard(examId: string) {
  return requestTeacherJson<TeacherLeaderboardRow[]>(
    `/api/v1/results/exam/${examId}/leaderboard/`,
  );
}

export async function fetchTeacherExamAttempts(examId: string) {
  return requestTeacherJson<TeacherExamAttempt[]>(
    `/api/v1/results/exam/${examId}/attempts/`,
  );
}

export async function fetchTeacherAttemptInterventions(attemptId: string) {
  return requestTeacherJson<TeacherAttemptIntervention[]>(
    `/api/v1/results/attempt/${attemptId}/interventions/`,
  );
}

export async function fetchTeacherQuestionAnalysis(examId: string) {
  return requestTeacherJson<TeacherQuestionAnalysis[]>(
    `/api/v1/results/exam/${examId}/question-analysis/`,
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

export async function fetchTeacherTopicPerformance(examId: string) {
  return requestTeacherJson<PaginatedResponse<StudentTopicPerformance>>(
    `/api/v1/results/topic-performance/?exam=${encodeURIComponent(examId)}`,
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
