import { cache } from "react";
import { PaginatedResponse, TeacherExam } from "@/features/dashboard/types";
import { getSessionAccessToken } from "@/lib/auth/session";
import { TeacherBuilderApiError } from "@/lib/api/teacher-builder-error";

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
  assessment_family: string | null;
  assessment_family_code?: string | null;
  assessment_family_label?: string | null;
  assessment_family_profile?: {
    id: string;
    code: string;
    label: string;
    description: string;
    sort_order: number;
    allowed_question_types: string[];
    scoring_defaults: Record<string, unknown>;
    delivery_defaults: Record<string, unknown>;
    analytics_preset: Record<string, unknown>;
    authoring_hints: Record<string, unknown>;
    is_active: boolean;
  } | null;
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
  sort_order: number;
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
  passage: string | null;
  passage_order: number | null;
  passage_title: string;
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
  is_quality_ready: boolean;
  correct_rate: number;
  wrong_rate: number;
  skip_rate: number;
  quality_signal: "healthy" | "watch" | "hard" | "skip_risk" | "ambiguous" | "revision_candidate" | "emerging";
  revision_priority: "none" | "watch" | "medium" | "high" | "urgent";
  quality_note: string;
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
  selected_count: number;
  selected_correct_count: number;
  selected_wrong_count: number;
  selection_rate: number;
  distractor_signal:
    | "validated_key"
    | "key_review"
    | "untested_distractor"
    | "weak_distractor"
    | "strong_distractor"
    | "working_distractor"
    | "light_distractor";
  distractor_note: string;
};

export type TeacherQuestionRubricCriterion = {
  key: string;
  label: string;
  max_score: string;
  display_order: number;
  reviewer_hint?: string;
  band_descriptors?: Array<{
    label: string;
    description?: string;
    score?: string;
  }>;
};

export type TeacherQuestionTypeDefinition = {
  code: string;
  label: string;
  description: string;
  family: string;
  response_mode: string;
  answer_mode: string;
  evaluation_mode: string;
  option_source: string;
  min_active_options: number;
  max_active_options: number | null;
  min_correct_options: number;
  max_correct_options: number | null;
  supports_passage: boolean;
  supports_rich_content: boolean;
  supports_negative_marking: boolean;
  supports_partial_scoring: boolean;
  requires_manual_review: boolean;
  is_available: boolean;
  lifecycle_stage: string;
  authoring_variant: string;
  delivery_variant: string;
  supports_attachments: boolean;
  allowed_attachment_types: string[];
  recommended_attachment_types: string[];
  allowed_response_artifact_types: string[];
  media_delivery_mode: string;
  media_preload_strategy: string;
  response_mode_definition: AssessmentResponseModeDefinition | null;
  evaluation_mode_definition: AssessmentEvaluationModeDefinition | null;
  capabilities?: {
    supports_options: boolean;
    supports_multiple_selection: boolean;
    supports_text_answer: boolean;
    is_numeric_response: boolean;
    supports_accepted_answers: boolean;
    supports_numeric_tolerance: boolean;
    supports_review_guidance: boolean;
    requires_manual_review: boolean;
    is_auto_scorable: boolean;
    supports_attachments: boolean;
    supports_image_attachments: boolean;
    supports_diagram_attachments: boolean;
    supports_pdf_attachments: boolean;
    supports_audio_attachments: boolean;
    supports_video_attachments: boolean;
    supports_response_artifacts: boolean;
    allowed_response_artifact_types: string[];
  } | null;
};

export type AssessmentResponseModeDefinition = {
  code: string;
  label: string;
  description: string;
  input_kind: string;
  cardinality: string;
  requires_options: boolean;
  allows_manual_entry: boolean;
  allows_file_upload: boolean;
  is_available: boolean;
  lifecycle_stage: string;
};

export type AssessmentEvaluationModeDefinition = {
  code: string;
  label: string;
  description: string;
  scoring_kind: string;
  is_auto_scorable: boolean;
  requires_manual_review: boolean;
  supports_partial_scoring: boolean;
  supports_answer_key: boolean;
  is_available: boolean;
  lifecycle_stage: string;
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
  passage: string | null;
  passage_order: number | null;
  passage_detail: TeacherQuestionPassageSummary | null;
  question_type: string;
  question_type_definition: TeacherQuestionTypeDefinition | null;
  difficulty_level: string;
  content_format: string;
  question_text: string;
  assertion_text?: string;
  reason_text?: string;
  matrix_left_items?: string[];
  matrix_right_items?: string[];
  explanation: string;
  accepted_answers: string[];
  numeric_tolerance: string | null;
  review_guidance: string;
  rubric_criteria: TeacherQuestionRubricCriterion[];
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
  correct_rate: number;
  wrong_rate: number;
  skip_rate: number;
  quality_signal: "healthy" | "watch" | "hard" | "skip_risk" | "ambiguous" | "revision_candidate" | "emerging";
  revision_priority: "none" | "watch" | "medium" | "high" | "urgent";
  quality_note: string;
  is_shared_library_link: boolean;
  shared_library_access_active: boolean | null;
  shared_library_access_state: "active" | "inactive" | "not_applicable";
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
  created_by_teacher: string | null;
  created_by_teacher_name: string;
  passage: string | null;
  passage_order: number | null;
  passage_title: string;
  question_type: string;
  question_type_definition: TeacherQuestionTypeDefinition | null;
  difficulty_level: string;
  content_format: string;
  question_text: string;
  explanation: string;
  accepted_answers?: string[];
  numeric_tolerance?: string | null;
  review_guidance?: string;
  rubric_criteria?: TeacherQuestionRubricCriterion[];
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
  correct_rate: number;
  wrong_rate: number;
  skip_rate: number;
  quality_signal: "healthy" | "watch" | "hard" | "skip_risk" | "ambiguous" | "revision_candidate" | "emerging";
  revision_priority: "none" | "watch" | "medium" | "high" | "urgent";
  quality_note: string;
  is_shared_library_link: boolean;
  shared_library_access_active: boolean | null;
  shared_library_access_state: "active" | "inactive" | "not_applicable";
};

export type TeacherQuestionPage = PaginatedResponse<TeacherQuestionSummary>;

export type MasterQuestionLibraryPackage = {
  code: string;
  name: string;
};

export type MasterQuestionLibraryQuestion = {
  id: string;
  source_institute_code: string;
  source_institute_name: string;
  source_program_code: string;
  source_program_name: string;
  source_subject_code: string;
  source_subject_name: string;
  source_topic_code: string | null;
  source_topic_name: string | null;
  question_type: string;
  difficulty_level: string;
  content_format: string;
  question_text: string;
  explanation: string;
  default_marks: string;
  negative_marks: string;
  is_verified: boolean;
  source_type: string;
  visibility: string;
  metadata: Record<string, unknown>;
  option_count: number;
  has_access: boolean | null;
  has_entitlement: boolean | null;
  access_availability: string;
  quota_limited: boolean | null;
  quota_exhausted: boolean | null;
  quota_note: string;
  matching_packages: MasterQuestionLibraryPackage[];
  access_status: string;
  created_at: string;
  updated_at: string;
};

export type MasterQuestionLibraryPage = PaginatedResponse<MasterQuestionLibraryQuestion>;

export type MasterQuestionAccessActionResponse = {
  master_question_id: string;
  institute_code: string;
  status: string;
  linked_question_id?: string | null;
  matching_package_codes?: string[];
};

export type TeacherQuestionPassageQuestion = {
  id: string;
  question_type: string;
  question_type_definition: TeacherQuestionTypeDefinition | null;
  difficulty_level: string;
  question_text: string;
  default_marks: string;
  negative_marks: string;
  passage_order: number | null;
  is_active: boolean;
  is_verified: boolean;
};

export type TeacherQuestionPassageSummary = {
  id: string;
  institute: string;
  program: string | null;
  subject: string;
  topic: string | null;
  created_by_teacher: string | null;
  created_by_teacher_name: string;
  title: string;
  content_format: string;
  passage_text?: string;
  description: string;
  is_active: boolean;
  linked_question_count: number;
  created_at: string;
  updated_at: string;
};

export type TeacherQuestionTypeRegistryResponse = {
  count: number;
  results: TeacherQuestionTypeDefinition[];
};

export type TeacherAssessmentRegistryResponse = {
  question_types: TeacherQuestionTypeDefinition[];
  response_modes: AssessmentResponseModeDefinition[];
  evaluation_modes: AssessmentEvaluationModeDefinition[];
};

export type TeacherQuestionPassage = TeacherQuestionPassageSummary & {
  passage_text: string;
  metadata: Record<string, unknown>;
  linked_questions: TeacherQuestionPassageQuestion[];
};

export type TeacherQuestionPassagePage = PaginatedResponse<TeacherQuestionPassageSummary>;

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
  passage_title?: string;
  passage_order?: string | number;
  error_fields?: string[];
  expectations?: string[];
  error_map?: Record<string, string | string[]>;
  status?: string;
  tag_values?: string[];
  question_text: string;
  subject_code: string;
  topic_code: string;
  question_type: string;
  difficulty_level: string;
};

export type QuestionImportPreview = {
  preview_schema_version: number;
  preview_signature: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: QuestionImportPreviewRow[];
  valid_payloads: Record<string, unknown>[];
};

export type QuestionPassageImportPreviewRow = {
  row_number: number;
  is_valid: boolean;
  errors: string[];
  error_fields?: string[];
  expectations?: string[];
  error_map?: Record<string, string | string[]>;
  status?: string;
  title: string;
  subject_code: string;
  topic_code: string;
  content_format: string;
};

export type QuestionPassageImportPreview = {
  preview_schema_version: number;
  preview_signature: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: QuestionPassageImportPreviewRow[];
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
    let payload: Record<string, unknown> | null = null;

    try {
      payload = (await response.json()) as Record<string, unknown>;
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

    throw new TeacherBuilderApiError(message, {
      status: response.status,
      payload,
    });
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

export async function fetchTeacherAcademicYears(filters?: { institute?: string | null }) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupAcademicYear>>(
    `/api/v1/academics/academic-years/${toQueryString({
      is_active: true,
      institute: filters?.institute,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherPrograms(filters?: { institute?: string | null }) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupProgram>>(
    `/api/v1/academics/programs/${toQueryString({
      is_active: true,
      page_size: 500,
      institute: filters?.institute,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherInstituteDetail(instituteId: string) {
  return requestTeacherBuilderJson<LookupInstitute>(`/api/v1/institutes/${instituteId}/`);
}

export async function fetchTeacherCohorts(filters?: {
  institute?: string | null;
  academic_year?: string;
  program?: string;
}) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupCohort>>(
    `/api/v1/academics/cohorts/${toQueryString({
      institute: filters?.institute,
      is_active: true,
      academic_year: filters?.academic_year,
      program: filters?.program,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherSubjects(filters?: { institute?: string | null; program?: string }) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupSubject>>(
    `/api/v1/academics/subjects/${toQueryString({
      institute: filters?.institute,
      is_active: true,
      page_size: 500,
      program: filters?.program,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherTopics(filters?: { institute?: string | null; subject?: string | null }) {
  const response = await requestTeacherBuilderJson<PaginatedResponse<LookupTopic>>(
    `/api/v1/academics/topics/${toQueryString({
      institute: filters?.institute,
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
      page_size: 500,
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
  created_by_teacher?: string | null;
  ordering?: string | null;
  missing_explanation?: boolean;
  quality_signal?: string | null;
  revision_priority?: string | null;
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
      created_by_teacher: filters?.created_by_teacher,
      tag: filters?.tag,
      question_type: filters?.question_type,
      difficulty_level: filters?.difficulty_level,
      ordering: filters?.ordering,
      missing_explanation: filters?.missing_explanation ? true : undefined,
      quality_signal: filters?.quality_signal,
      revision_priority: filters?.revision_priority,
    })}`,
  );
}

export async function fetchTeacherMasterQuestionLibrary(filters?: {
  page?: number;
  page_size?: number;
  subject_code?: string | null;
  topic_code?: string | null;
  question_type?: string | null;
  difficulty_level?: string | null;
  search?: string | null;
  ordering?: string | null;
}) {
  return requestTeacherBuilderJson<MasterQuestionLibraryPage>(
    `/api/v1/question-bank/master-library/${toQueryString({
      page: filters?.page,
      page_size: filters?.page_size,
      subject_code: filters?.subject_code,
      topic_code: filters?.topic_code,
      question_type: filters?.question_type,
      difficulty_level: filters?.difficulty_level,
      search: filters?.search,
      ordering: filters?.ordering,
    })}`,
  );
}

export async function requestTeacherMasterQuestionAccess(
  questionId: string,
  payload: {
    local_subject_code?: string;
    local_topic_code?: string;
    notes?: string;
  },
) {
  return requestTeacherBuilderJson<MasterQuestionAccessActionResponse>(
    `/api/v1/question-bank/master-library/${questionId}/request-access`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function linkTeacherMasterQuestionAccess(
  questionId: string,
  payload: {
    local_subject_code?: string;
    local_topic_code?: string;
    notes?: string;
  },
) {
  return requestTeacherBuilderJson<MasterQuestionAccessActionResponse>(
    `/api/v1/question-bank/master-library/${questionId}/link`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchTeacherQuestionDetail(questionId: string) {
  return requestTeacherBuilderJson<TeacherQuestion>(
    `/api/v1/question-bank/questions/${questionId}/`,
  );
}

export async function fetchTeacherQuestionTypeRegistry() {
  const response = await requestTeacherBuilderJson<TeacherQuestionTypeRegistryResponse>(
    `/api/v1/question-bank/questions/type-registry/${toQueryString({
      available_only: true,
    })}`,
  );
  return response.results;
}

export async function fetchTeacherAssessmentRegistry() {
  return requestTeacherBuilderJson<TeacherAssessmentRegistryResponse>(
    `/api/v1/question-bank/questions/assessment-registry/${toQueryString({
      available_only: true,
    })}`,
  );
}

export async function fetchTeacherQuestionPassagePage(filters?: {
  page?: number;
  page_size?: number;
  program?: string | null;
  subject?: string | null;
  topic?: string | null;
  created_by_teacher?: string | null;
}) {
  return requestTeacherBuilderJson<TeacherQuestionPassagePage>(
    `/api/v1/question-bank/passages/${toQueryString({
      page: filters?.page,
      page_size: filters?.page_size,
      program: filters?.program,
      subject: filters?.subject,
      topic: filters?.topic,
      created_by_teacher: filters?.created_by_teacher,
      is_active: true,
    })}`,
  );
}

export async function fetchTeacherQuestionPassages(filters?: {
  program?: string | null;
  subject?: string | null;
  topic?: string | null;
  created_by_teacher?: string | null;
}) {
  const response = await fetchTeacherQuestionPassagePage({
    ...filters,
    page_size: 500,
  });
  return response.results;
}

export async function fetchTeacherQuestionPassageDetail(passageId: string) {
  return requestTeacherBuilderJson<TeacherQuestionPassage>(
    `/api/v1/question-bank/passages/${passageId}/`,
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

export async function createTeacherQuestionPassage(payload: Record<string, unknown>) {
  return requestTeacherBuilderJson<TeacherQuestionPassage>(
    "/api/v1/question-bank/passages/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateTeacherQuestionPassage(
  passageId: string,
  payload: Record<string, unknown>,
) {
  return requestTeacherBuilderJson<TeacherQuestionPassage>(
    `/api/v1/question-bank/passages/${passageId}/`,
    {
      method: "PATCH",
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

export async function fetchTeacherQuestionPassageImportTemplate() {
  return requestTeacherBuilderJson<{
    columns: string[];
    csv_content: string;
  }>("/api/v1/question-bank/passages/import-template/");
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

export async function previewTeacherQuestionPassageImport(payload: {
  institute: string;
  file: File | Blob;
  fileName?: string;
}) {
  const formData = new FormData();
  formData.set("institute", payload.institute);
  formData.set("file", payload.file, payload.fileName ?? "question-passages-import.csv");

  return requestTeacherBuilderJson<QuestionPassageImportPreview>(
    "/api/v1/question-bank/passages/preview-import/",
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function finalizeTeacherQuestionPassageImport(payload: {
  institute: string;
  preview_rows: QuestionPassageImportPreviewRow[];
  valid_payloads: Record<string, unknown>[];
  preview_schema_version: number;
  preview_signature: string;
}) {
  return requestTeacherBuilderJson<{
    created_count: number;
  }>("/api/v1/question-bank/passages/finalize-import/", {
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
