import { requestJson } from "@/lib/api/client";
import {
  StudentAttemptAnswer,
  StudentAttemptDetail,
  StudentAttemptListItem,
  StudentAttemptReview,
  StudentAttemptSummary,
  StudentAvailableExam,
  StudentExamDetail,
  StudentInsightSummary,
  StudentResult,
  StudentTopicPerformance,
  StudentWalletSummary,
} from "@/types/api";

export async function fetchStudentDashboardBundle(accessToken: string) {
  const [summary, exams, wallet, attempts] = await Promise.all([
    requestJson<StudentInsightSummary>("/api/v1/student/insights/summary/", undefined, accessToken),
    requestJson<StudentAvailableExam[]>("/api/v1/student/exams/available/", undefined, accessToken),
    requestJson<StudentWalletSummary>("/api/v1/economy/wallet/", undefined, accessToken),
    requestJson<StudentAttemptListItem[]>("/api/v1/student/attempts/", undefined, accessToken),
  ]);

  return { summary, exams, wallet, attempts };
}

export async function fetchStudentResults(accessToken: string) {
  return requestJson<StudentResult[]>("/api/v1/student/results/", undefined, accessToken);
}

export async function fetchStudentTopicPerformance(studentId: string, accessToken: string) {
  return requestJson<{
    count: number;
    next: string | null;
    previous: string | null;
    results: StudentTopicPerformance[];
  }>(`/api/v1/results/topic-performance/?student=${encodeURIComponent(studentId)}`, undefined, accessToken);
}

export async function fetchStudentAnalyticsBundle(accessToken: string, studentId: string) {
  const [summary, results, topicPerformanceResponse] = await Promise.all([
    requestJson<StudentInsightSummary>("/api/v1/student/insights/summary/", undefined, accessToken),
    fetchStudentResults(accessToken),
    fetchStudentTopicPerformance(studentId, accessToken),
  ]);

  return {
    summary,
    results,
    topicPerformance: topicPerformanceResponse.results,
  };
}

export async function fetchStudentExamDetail(examId: string, accessToken: string) {
  return requestJson<StudentExamDetail>(`/api/v1/student/exams/${examId}/detail/`, undefined, accessToken);
}

export async function startStudentAttempt(examId: string, studentId: string, accessToken: string) {
  return requestJson<{
    success: boolean;
    message: string;
    data: {
      id: string;
      exam: string;
      student: string;
      status: string;
    };
  }>(
    "/api/v1/attempts/start/",
    {
      method: "POST",
      body: JSON.stringify({
        exam: examId,
        student: studentId,
      }),
    },
    accessToken,
  );
}

export async function fetchStudentAttemptDetail(attemptId: string, accessToken: string) {
  return requestJson<StudentAttemptDetail>(`/api/v1/attempts/${attemptId}/detail/`, undefined, accessToken);
}

export async function fetchStudentAttemptSummary(attemptId: string, accessToken: string) {
  return requestJson<StudentAttemptSummary>(`/api/v1/attempts/${attemptId}/summary/`, undefined, accessToken);
}

export async function fetchStudentAttemptReview(attemptId: string, accessToken: string) {
  return requestJson<StudentAttemptReview>(`/api/v1/attempts/${attemptId}/review/`, undefined, accessToken);
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
  accessToken: string,
) {
  return requestJson<{
    success: boolean;
    message: string;
    data: StudentAttemptAnswer;
  }>(
    `/api/v1/attempts/${attemptId}/save-answer/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export async function switchStudentAttemptSection(attemptId: string, sectionId: string, accessToken: string) {
  return requestJson<{
    success: boolean;
    message: string;
    data: StudentAttemptDetail;
  }>(
    `/api/v1/attempts/${attemptId}/switch-section/`,
    {
      method: "POST",
      body: JSON.stringify({
        section: sectionId,
      }),
    },
    accessToken,
  );
}

export async function submitStudentAttempt(attemptId: string, accessToken: string) {
  return requestJson<{
    success: boolean;
    message: string;
    data: StudentAttemptSummary;
  }>(
    `/api/v1/attempts/${attemptId}/submit/`,
    {
      method: "POST",
      body: JSON.stringify({
        auto_submitted: false,
      }),
    },
    accessToken,
  );
}
