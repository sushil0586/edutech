import {
  DashboardData,
  NotificationUnreadCount,
  PaginatedResponse,
  StudentAvailableExam,
  StudentAttemptAnswer,
  StudentAttemptDetail,
  StudentAttemptListItem,
  StudentAttemptReview,
  StudentAttemptSummary,
  StudentExamDetail,
  StudentInsightSummary,
  StudentQuestionAnalytics,
  StudentNotification,
  StudentNotificationListResponse,
  StudentPaymentOrder,
  StudentRewardEvent,
  StudentResult,
  StudentStarLedgerEntry,
  StudentStarPack,
  StudentSubscription,
  StudentSubscriptionPlan,
  StudentTopicPerformance,
  StudentUnlockState,
  StudentWalletSummary,
} from "@/features/dashboard/types";
import { getSessionAccessToken } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export type StudentApiState = {
  apiBaseUrl: string;
  apiConfigured: boolean;
};

export function getStudentApiState(): StudentApiState {
  return {
    apiBaseUrl: API_BASE_URL,
    apiConfigured: Boolean(API_BASE_URL),
  };
}

async function requestStudentJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    throw new Error("Student API is not configured.");
  }

  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Student session is not available.");
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
    let message = `Student API request failed for ${path} with ${response.status}`;

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

async function fetchStudentJson<T>(path: string): Promise<T> {
  return requestStudentJson<T>(path);
}

export async function fetchStudentInsightSummary() {
  return fetchStudentJson<StudentInsightSummary>("/api/v1/student/insights/summary/");
}

export type StudentAvailableExamFilters = {
  source?: "all" | "platform" | "institute" | "teacher";
  teacher?: string | null;
};

export async function fetchStudentAvailableExams(
  filters?: StudentAvailableExamFilters,
) {
  const query = new URLSearchParams();

  if (filters?.source && filters.source !== "all") {
    query.set("source", filters.source);
  }

  if (filters?.source === "teacher" && filters.teacher) {
    query.set("teacher", filters.teacher);
  }

  const queryString = query.toString();
  return fetchStudentJson<StudentAvailableExam[]>(
    `/api/v1/student/exams/available/${queryString ? `?${queryString}` : ""}`,
  );
}

export async function fetchStudentResults() {
  return fetchStudentJson<StudentResult[]>("/api/v1/student/results/");
}

export async function fetchStudentWalletSummary() {
  return fetchStudentJson<StudentWalletSummary>("/api/v1/economy/wallet/");
}

export async function fetchStudentWalletLedger() {
  return fetchStudentJson<StudentStarLedgerEntry[]>("/api/v1/economy/ledger/");
}

export async function fetchStudentRewardEvents() {
  return fetchStudentJson<StudentRewardEvent[]>("/api/v1/economy/rewards/");
}

export async function fetchStudentUnlockStates() {
  return fetchStudentJson<StudentUnlockState[]>("/api/v1/economy/unlocks/");
}

export async function spendStarsForContent(payload: {
  content_type: string;
  content_key: string;
  subject?: string | null;
}) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: {
      spent_stars: number;
      message: string;
      ledger_entry: StudentStarLedgerEntry | null;
      unlock_state: StudentUnlockState;
    };
  }>("/api/v1/economy/spend-stars/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchStudentStarPacks() {
  return fetchStudentJson<StudentStarPack[]>("/api/v1/economy/star-packs/");
}

export async function fetchStudentSubscriptionPlans() {
  return fetchStudentJson<StudentSubscriptionPlan[]>(
    "/api/v1/economy/subscription-plans/",
  );
}

export async function fetchStudentPaymentOrders() {
  return fetchStudentJson<StudentPaymentOrder[]>("/api/v1/economy/orders/");
}

export async function createStudentStarPackOrder(payload: {
  star_pack: string;
  metadata?: Record<string, unknown>;
}) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: StudentPaymentOrder;
  }>("/api/v1/economy/orders/star-pack/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createStudentSubscriptionOrder(payload: {
  subscription_plan_cycle: string;
  metadata?: Record<string, unknown>;
}) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: StudentPaymentOrder;
  }>("/api/v1/economy/orders/subscription/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchStudentSubscriptions() {
  return fetchStudentJson<StudentSubscription[]>(
    "/api/v1/economy/subscriptions/",
  );
}

export async function fetchStudentTopicPerformance(studentId: string) {
  const query = new URLSearchParams({ student: studentId });
  return fetchStudentJson<PaginatedResponse<StudentTopicPerformance>>(
    `/api/v1/results/topic-performance/?${query.toString()}`,
  );
}

export async function fetchStudentQuestionAnalytics(filters?: {
  subject?: string | null;
  topic?: string | null;
  question_type?: string | null;
  source?: string | null;
  teacher?: string | null;
}) {
  const query = new URLSearchParams();
  if (filters?.subject) {
    query.set("subject", filters.subject);
  }
  if (filters?.topic) {
    query.set("topic", filters.topic);
  }
  if (filters?.question_type) {
    query.set("question_type", filters.question_type);
  }
  if (filters?.source) {
    query.set("source", filters.source);
  }
  if (filters?.teacher) {
    query.set("teacher", filters.teacher);
  }
  const queryString = query.toString();
  return fetchStudentJson<StudentQuestionAnalytics>(
    `/api/v1/student/insights/question-analytics/${queryString ? `?${queryString}` : ""}`,
  );
}

export async function fetchStudentNotifications() {
  return fetchStudentJson<StudentNotificationListResponse>("/api/v1/notifications/");
}

export async function fetchStudentUnreadCount() {
  return fetchStudentJson<NotificationUnreadCount>(
    "/api/v1/notifications/unread-count/",
  );
}

export async function markStudentNotificationRead(notificationId: string) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: StudentNotification;
  }>(`/api/v1/notifications/${notificationId}/mark-read/`, {
    method: "POST",
  });
}

export async function markAllStudentNotificationsRead() {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: { updated_count: number };
  }>("/api/v1/notifications/mark-all-read/", {
    method: "POST",
  });
}

export async function fetchStudentExamDetail(examId: string) {
  return fetchStudentJson<StudentExamDetail>(
    `/api/v1/student/exams/${examId}/detail/`,
  );
}

export async function resolveStudentExamAccessKey(accessKey: string) {
  return requestStudentJson<StudentExamDetail>(
    "/api/v1/student/exams/resolve-key/",
    {
      method: "POST",
      body: JSON.stringify({
        access_key: accessKey,
      }),
    },
  );
}

export async function fetchStudentAttemptDetail(attemptId: string) {
  return fetchStudentJson<StudentAttemptDetail>(
    `/api/v1/attempts/${attemptId}/detail/`,
  );
}

export async function fetchStudentAttempts() {
  return fetchStudentJson<StudentAttemptListItem[]>("/api/v1/student/attempts/");
}

export async function fetchStudentAttemptSummary(attemptId: string) {
  return fetchStudentJson<StudentAttemptSummary>(
    `/api/v1/attempts/${attemptId}/summary/`,
  );
}

export async function fetchStudentAttemptReview(attemptId: string) {
  return fetchStudentJson<StudentAttemptReview>(
    `/api/v1/attempts/${attemptId}/review/`,
  );
}

export async function startStudentAttempt(examId: string, studentId: string) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: {
      id: string;
      exam: string;
      student: string;
      status: string;
    };
  }>("/api/v1/attempts/start/", {
    method: "POST",
    body: JSON.stringify({
      exam: examId,
      student: studentId,
    }),
  });
}

export async function saveStudentAnswer(
  attemptId: string,
  payload: {
    question: string;
    selected_option?: string | null;
    selected_option_ids?: string[];
    answer_text?: string;
    is_marked_for_review?: boolean;
    clear_response?: boolean;
    skip?: boolean;
  },
) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: StudentAttemptAnswer;
  }>(`/api/v1/attempts/${attemptId}/save-answer/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitStudentAttempt(attemptId: string) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: StudentAttemptSummary;
  }>(`/api/v1/attempts/${attemptId}/submit/`, {
    method: "POST",
    body: JSON.stringify({
      auto_submitted: false,
    }),
  });
}

export async function switchStudentAttemptSection(
  attemptId: string,
  sectionId: string,
) {
  return requestStudentJson<{
    success: boolean;
    message: string;
    data: StudentAttemptDetail;
  }>(`/api/v1/attempts/${attemptId}/switch-section/`, {
    method: "POST",
    body: JSON.stringify({
      section: sectionId,
    }),
  });
}

export async function getStudentDashboardData(): Promise<DashboardData> {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured",
      apiConfigured: false,
      summary: null,
      exams: [],
    };
  }

  try {
    const [summary, exams] = await Promise.all([
      fetchStudentInsightSummary(),
      fetchStudentAvailableExams(),
    ]);

    return {
      source: "live",
      apiConfigured: true,
      summary,
      exams,
    };
  } catch {
    return {
      source: "error",
      apiConfigured: true,
      summary: null,
      exams: [],
    };
  }
}
