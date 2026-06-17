import { cache } from "react";
import { PaginatedResponse, TeacherExam } from "@/features/dashboard/types";
import { getSessionAccessToken } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export type LookupAcademicYear = {
  id: string;
  institute: string;
  name: string;
  is_current: boolean;
  is_active: boolean;
};

export type LookupProgram = {
  id: string;
  institute: string;
  name: string;
  code: string;
  category: string;
  sort_order: number;
  is_active: boolean;
};

export type LookupInstitute = {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  is_active: boolean;
};

export type LookupCohort = {
  id: string;
  institute: string;
  academic_year: string;
  program: string;
  name: string;
  code: string;
  is_active: boolean;
};

export type LookupSubject = {
  id: string;
  institute: string;
  program: string;
  name: string;
  code: string;
  is_active: boolean;
};

export type LookupTopic = {
  id: string;
  institute: string;
  subject: string;
  parent_topic: string | null;
  name: string;
  code: string;
  difficulty_level: string;
  is_active: boolean;
};

export type LookupStudent = {
  id: string;
  institute: string;
  academic_year: string;
  program: string;
  cohort: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  admission_no: string;
  accommodation_profile: {
    extra_time_minutes?: number;
    extra_time_percentage?: number;
    additional_violation_allowance?: number;
    simplified_warning_copy?: boolean;
    alternative_instructions?: string;
    notes?: string;
  };
  is_active: boolean;
};

export type LookupQuestion = {
  id: string;
  institute: string;
  program: string | null;
  subject: string | null;
  topic: string | null;
  question_type: string;
  difficulty_level: string;
  question_text: string;
  explanation: string;
  default_marks: string;
  negative_marks: string;
  is_active: boolean;
  is_verified: boolean;
  usage_count: number;
  wrong_count: number;
  skipped_count: number;
  has_explanation: boolean;
};

export type TeacherOptionCatalogEntry = {
  id: string;
  namespace: string;
  code: string;
  label: string;
  description: string;
  sort_order: number;
  is_default: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherQuestionOption = {
  id: string | null;
  content_format: string;
  option_text: string;
  option_order: number;
  is_correct: boolean;
  is_active: boolean;
};

export type TeacherQuestionTagMap = {
  id: string;
  question: string;
  tag: string;
  tag_detail: {
    id: string;
    institute: string;
    name: string;
    code: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherQuestionAttachment = {
  id: string;
  question: string;
  file: string;
  file_url: string;
  attachment_type: string;
  title: string;
  display_order: number;
  alt_text: string;
  is_inline: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherQuestion = {
  id: string;
  institute: string;
  program: string | null;
  subject: string | null;
  topic: string | null;
  created_by_teacher: string | null;
  question_type: string;
  difficulty_level: string;
  content_format: string;
  question_text: string;
  explanation: string;
  default_marks: string;
  negative_marks: string;
  is_active: boolean;
  is_verified: boolean;
  metadata: Record<string, unknown>;
  options: TeacherQuestionOption[];
  tag_maps: TeacherQuestionTagMap[];
  attachments: TeacherQuestionAttachment[];
  usage_count: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  correct_attempt_percentage: string;
  wrong_attempt_percentage: string;
  skip_percentage: string;
  has_explanation: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherQuestionSummary = {
  id: string;
  institute: string;
  program: string | null;
  subject: string | null;
  topic: string | null;
  question_type: string;
  difficulty_level: string;
  content_format: string;
  question_text: string;
  explanation: string;
  default_marks: string;
  negative_marks: string;
  is_active: boolean;
  is_verified: boolean;
  metadata: Record<string, unknown>;
  usage_count: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  option_count: number;
  correct_option_count: number;
  attachment_count: number;
  tag_count: number;
  has_explanation: boolean;
  wrong_attempt_percentage: string;
  skip_percentage: string;
  is_quality_ready: boolean;
};

export type TeacherQuestionPage = PaginatedResponse<TeacherQuestionSummary>;

export type QuestionTagLite = {
  id: string;
  institute: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionImportPreviewRow = {
  row_number: number;
  is_valid: boolean;
  errors: string[];
  question_text: string;
  subject_code: string;
  topic_code: string;
  question_type: string;
  difficulty_level: string;
};

export type QuestionImportPreview = {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: QuestionImportPreviewRow[];
  valid_payloads: Record<string, unknown>[];
};

type TeacherBuilderApiState = {
  apiBaseUrl: string;
  apiConfigured: boolean;
};

function getTeacherBuilderApiState(): TeacherBuilderApiState {
  return {
    apiBaseUrl: API_BASE_URL,
    apiConfigured: Boolean(API_BASE_URL),
  };
}

async function performTeacherBuilderRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const state = getTeacherBuilderApiState();

  if (!state.apiConfigured) {
    throw new Error("Teacher builder API is not configured.");
  }

  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = `Teacher builder request failed for ${path} with ${response.status}`;

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

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

const requestTeacherBuilderJsonCached = cache(async <T>(path: string, accessToken: string) => {
  return performTeacherBuilderRequest<T>(path, accessToken);
});

async function requestTeacherBuilderJson<T>(
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
    return requestTeacherBuilderJsonCached<T>(path, accessToken);
  }

  return performTeacherBuilderRequest<T>(path, accessToken, init);
}

function toQueryString(values: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    query.set(key, String(value));
  });

  const stringified = query.toString();
  return stringified ? `?${stringified}` : "";
}

export async function fetchTeacherAcademicYears() {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupAcademicYear>>(
    `/api/v1/academics/academic-years/${toQueryString({ is_active: true })}`,
  );
  return response.results;
}

export async function fetchTeacherPrograms() {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupProgram>>(
    `/api/v1/academics/programs/${toQueryString({ is_active: true, page_size: 500 })}`,
  );
  return response.results;
}

export async function fetchTeacherInstituteDetail(instituteId: string) {
  return requestTeacherBuilderJson<LookupInstitute>(`/api/v1/institutes/${instituteId}/`);
}

export async function fetchTeacherCohorts(filters?: {
  academic_year?: string;
  program?: string;
}) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupCohort>>(
    `/api/v1/academics/cohorts/${toQueryString({
      is_active: true,
      academic_year: filters?.academic_year,
      program: filters?.program,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherSubjects(filters?: { program?: string }) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupSubject>>(
    `/api/v1/academics/subjects/${toQueryString({
      is_active: true,
      page_size: 500,
      program: filters?.program,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherTopics(filters?: { subject?: string | null }) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupTopic>>(
    `/api/v1/academics/topics/${toQueryString({
      is_active: true,
      page_size: 500,
      subject: filters?.subject,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherOptionCatalog() {
  const response = await requestTeacherBuilderJson<PaginatedResponse<TeacherOptionCatalogEntry>>(
    `/api/v1/academics/option-catalog/${toQueryString({
      is_active: true,
      page_size: 200,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherStudents(filters: {
  academic_year: string;
  program: string;
  cohort?: string | null;
}) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupStudent>>(
    `/api/v1/students/${toQueryString({
      is_active: true,
      academic_year: filters.academic_year,
      program: filters.program,
      cohort: filters.cohort,
    })}`,
  );
  return response.results;
}

export async function updateTeacherStudent(studentId: string, payload: {
  accommodation_profile: {
    extra_time_minutes: number;
    extra_time_percentage: number;
    additional_violation_allowance: number;
    simplified_warning_copy: boolean;
    alternative_instructions: string;
    notes: string;
  };
}) {
  return requestTeacherBuilderJson<LookupStudent>(`/api/v1/students/${studentId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchTeacherQuestions(filters?: {
  program?: string | null;
  subject?: string | null;
}) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupQuestion>>(
    `/api/v1/question-bank/questions/${toQueryString({
      compact: true,
      is_active: true,
      program: filters?.program,
      subject: filters?.subject,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherQuestionPage(filters?: {
  page?: number;
  page_size?: number;
  search?: string | null;
  program?: string | null;
  subject?: string | null;
  topic?: string | null;
  tag?: string | null;
  question_type?: string | null;
  difficulty_level?: string | null;
  ordering?: string | null;
  missing_explanation?: boolean;
}) {
  return requestTeacherBuilderJson<TeacherQuestionPage>(
    `/api/v1/question-bank/questions/${toQueryString({
      compact: true,
      page: filters?.page,
      page_size: filters?.page_size,
      search: filters?.search,
      program: filters?.program,
      subject: filters?.subject,
      topic: filters?.topic,
      tag: filters?.tag,
      question_type: filters?.question_type,
      difficulty_level: filters?.difficulty_level,
      ordering: filters?.ordering,
      missing_explanation: filters?.missing_explanation ? true : undefined,
    })}`,
  );
}

export async function fetchTeacherQuestionDetail(questionId: string) {
  return requestTeacherBuilderJson<TeacherQuestion>(
    `/api/v1/question-bank/questions/${questionId}/`,
  );
}

export async function fetchTeacherQuestionTags(search?: string) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<QuestionTagLite>>(
    `/api/v1/question-bank/tags/${toQueryString({
      is_active: true,
      search: search ?? undefined,
      page_size: 100,
    })}`,
  );
  return response.results;
}

export async function createTeacherQuestion(payload: Record<string, unknown>) {
  return requestTeacherBuilderJson<TeacherQuestion>(
    "/api/v1/question-bank/questions/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateTeacherQuestion(
  questionId: string,
  payload: Record<string, unknown>,
) {
  return requestTeacherBuilderJson<TeacherQuestion>(
    `/api/v1/question-bank/questions/${questionId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function createTeacherQuestionTagMap(payload: {
  question: string;
  tag: string;
  is_active?: boolean;
}) {
  return requestTeacherBuilderJson<TeacherQuestionTagMap>(
    "/api/v1/question-bank/tag-maps/",
    {
      method: "POST",
      body: JSON.stringify({
        is_active: true,
        ...payload,
      }),
    },
  );
}

export async function deleteTeacherQuestionTagMap(tagMapId: string) {
  return requestTeacherBuilderJson<Record<string, never>>(
    `/api/v1/question-bank/tag-maps/${tagMapId}/`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchTeacherQuestionImportTemplate() {
  return requestTeacherBuilderJson<{
    columns: string[];
    csv_content: string;
  }>("/api/v1/question-bank/questions/import-template/");
}

export async function previewTeacherQuestionImport(payload: {
  institute: string;
  file: File | Blob;
  fileName?: string;
}) {
  const formData = new FormData();
  formData.set("institute", payload.institute);
  formData.set("file", payload.file, payload.fileName ?? "questions-import.csv");

  return requestTeacherBuilderJson<QuestionImportPreview>(
    "/api/v1/question-bank/questions/preview-import/",
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function finalizeTeacherQuestionImport(payload: {
  institute: string;
  preview_rows: QuestionImportPreviewRow[];
  valid_payloads: Record<string, unknown>[];
}) {
  return requestTeacherBuilderJson<{
    created_questions: TeacherQuestion[];
    created_count: number;
  }>("/api/v1/question-bank/questions/finalize-import/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createTeacherQuestionAttachment(payload: {
  question: string;
  file: File | Blob;
  fileName?: string;
  attachment_type: string;
  title: string;
  display_order: number;
  alt_text: string;
  is_inline: boolean;
  is_active?: boolean;
}) {
  const formData = new FormData();
  formData.set("question", payload.question);
  formData.set("file", payload.file, payload.fileName ?? "question-attachment");
  formData.set("attachment_type", payload.attachment_type);
  formData.set("title", payload.title);
  formData.set("display_order", String(payload.display_order));
  formData.set("alt_text", payload.alt_text);
  formData.set("is_inline", String(payload.is_inline));
  formData.set("is_active", String(payload.is_active ?? true));

  return requestTeacherBuilderJson<TeacherQuestionAttachment>(
    "/api/v1/question-bank/attachments/",
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function deleteTeacherQuestionAttachment(attachmentId: string) {
  return requestTeacherBuilderJson<Record<string, never>>(
    `/api/v1/question-bank/attachments/${attachmentId}/`,
    {
      method: "DELETE",
    },
  );
}

export async function performTeacherQuestionBulkAction(payload: Record<string, unknown>) {
  return requestTeacherBuilderJson<Record<string, unknown>>(
    "/api/v1/question-bank/questions/bulk-action/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createTeacherExam(payload: Record<string, unknown>) {
  return requestTeacherBuilderJson<TeacherExam>("/api/v1/exams/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTeacherExamBuilder(
  examId: string,
  payload: Record<string, unknown>,
) {
  return requestTeacherBuilderJson<TeacherExam>(`/api/v1/exams/${examId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createTeacherExamSection(payload: Record<string, unknown>) {
  return requestTeacherBuilderJson<Record<string, unknown>>("/api/v1/exams/sections/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteTeacherExamSection(sectionId: string) {
  await requestTeacherBuilderJson<Record<string, unknown>>(`/api/v1/exams/sections/${sectionId}/`, {
    method: "DELETE",
  });
}

export async function createTeacherExamQuestion(payload: Record<string, unknown>) {
  return requestTeacherBuilderJson<Record<string, unknown>>("/api/v1/exams/questions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTeacherExamQuestion(
  examQuestionId: string,
  payload: Record<string, unknown>,
) {
  return requestTeacherBuilderJson<Record<string, unknown>>(`/api/v1/exams/questions/${examQuestionId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTeacherExamQuestion(examQuestionId: string) {
  await requestTeacherBuilderJson<Record<string, unknown>>(`/api/v1/exams/questions/${examQuestionId}/`, {
    method: "DELETE",
  });
}

export async function assignTeacherExamStudents(
  examId: string,
  payload: Record<string, unknown>,
) {
  return requestTeacherBuilderJson<{
    success?: boolean;
    message?: string;
    data?: TeacherExam;
  }>(`/api/v1/exams/${examId}/assign-students/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
