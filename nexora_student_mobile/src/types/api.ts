export type SubjectOption = {
  value: string;
  label: string;
};

export type MobileAccountProfile = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "student" | "teacher" | "parent" | "institute_admin" | "platform_admin";
  institute: string | null;
  student_profile: string | null;
  teacher_profile: string | null;
  is_active: boolean;
  student_context?: {
    full_name: string;
    program_name: string;
    academic_year_name: string;
    cohort_name: string;
    referral_code?: string | null;
    subject_options: SubjectOption[];
  } | null;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: MobileAccountProfile;
};

export type RegisterOptionsResponse = {
  location_catalog: Array<{
    country: string;
    states: Array<{
      name: string;
      cities: Array<{
        name: string;
        pincodes: string[];
      }>;
    }>;
  }>;
  public_institute: {
    id: string;
    name: string;
    code: string;
  };
  schools: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  class_levels: string[];
  boards: string[];
  student_exam_interests: string[];
  subject_catalog: Record<string, string[]>;
};

export type StudentInsightSummary = {
  student_id: string;
  average_percentage: string;
  accuracy_percentage: string;
  weak_topics: Array<{
    topic_id: string;
    topic_name: string;
    subject_name: string;
    average_percentage: string;
  }>;
  recent_exams: Array<{
    exam_id: string;
    exam_title: string;
    percentage: string;
  }>;
  insight_messages: string[];
};

export type StudentResult = {
  id: string;
  institute: string;
  exam: string;
  student: string;
  attempt: string;
  result_status: string;
  rank: number | null;
  total_marks: string;
  score: string;
  negative_score: string;
  final_score: string;
  percentage: string;
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
  time_taken_seconds: number;
  published_at: string | null;
  is_published: boolean;
  review_available: boolean;
  metadata: Record<string, unknown>;
  exam_title: string;
  exam_code: string;
  student_name: string;
  student_admission_no: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentTopicPerformance = {
  id: string;
  institute: string;
  exam: string;
  student: string;
  subject: string;
  topic: string | null;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
  score: string;
  negative_score: string;
  final_score: string;
  percentage: string;
  student_name: string;
  subject_name: string;
  topic_name: string | null;
  exam_title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentWalletSummary = {
  available_stars: number;
  lifetime_earned_stars: number;
  lifetime_spent_stars: number;
};

export type StudentAvailableExam = {
  id: string;
  title: string;
  subject_name: string;
  duration_minutes: number;
  can_start: boolean;
  can_resume: boolean;
  remaining_attempts: number;
  active_attempt: { id: string } | null;
  economy_access: {
    is_locked: boolean;
    lock_reason_message: string;
    star_cost: number;
    requires_unlock: boolean;
  };
};

export type StudentAttemptListItem = {
  id: string;
  exam: string;
  exam_title?: string;
  status: string;
};

export type StudentContentEconomyAccess = {
  is_locked: boolean;
  lock_reason_message: string;
  star_cost: number;
  requires_unlock: boolean;
};

export type StudentExamSection = {
  id: string;
  title: string;
  instructions: string;
  section_order: number;
  timer_enabled: boolean;
  duration_minutes: number | null;
  allow_skip_section: boolean;
  lock_after_submit: boolean;
  linked_questions_count: number;
  is_active: boolean;
};

export type StudentExamQuestionOption = {
  id: string;
  content_format: string;
  option_text: string;
  option_order: number;
  is_active: boolean;
};

export type StudentExamQuestionDetail = {
  id: string;
  exam: string;
  question: string;
  section: string | null;
  section_title: string | null;
  section_order: number | null;
  question_text_summary: string;
  section_name: string;
  question_order: number;
  marks: string | null;
  negative_marks: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  question_text: string;
  question_type: string;
  content_format: string;
  options: StudentExamQuestionOption[];
};

export type StudentSecurityPolicy = {
  mode: string;
  student_label: string;
  teacher_label: string;
  requires_fullscreen: boolean;
  tracks_focus_loss: boolean;
  tracks_visibility_change: boolean;
  tracks_fullscreen_exit: boolean;
  violation_limit_enabled: boolean;
  violation_limit: number | null;
  violation_action: string | null;
  enhanced_monitoring: boolean;
  student_warning_copy: string;
  teacher_monitoring_copy: string;
};

export type StudentIntegritySummary = {
  violation_count: number;
  violation_limit: number | null;
  remaining_before_action: number | null;
  threshold_reached: boolean;
};

export type StudentAccommodationSnapshot = {
  has_accommodations: boolean;
  extra_time_minutes: number;
  extra_time_percentage: number;
  additional_violation_allowance: number;
  applied_extra_time_minutes: number;
  base_duration_minutes: number;
  effective_duration_minutes: number;
  simplified_warning_copy: boolean;
  alternative_instructions: string;
  notes: string;
  source: string;
};

export type StudentAttemptRuntimeSection = {
  current_section_id?: string | null;
  current_section_name?: string | null;
  current_section_order?: number | null;
  current_section_started_at?: string | null;
  current_section_expires_at?: string | null;
  current_section_timer_enabled?: boolean;
  visited_section_ids?: string[];
  highest_section_order_reached?: number | null;
};

export type StudentExamDetail = {
  id: string;
  title: string;
  code: string;
  exam_type: string;
  access_key_enabled: boolean;
  status: string;
  description: string;
  duration_minutes: number;
  total_marks: string;
  passing_marks: string;
  start_at: string | null;
  end_at: string | null;
  instructions: string;
  allow_late_submit: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  allow_review_after_submit: boolean;
  max_attempts: number;
  allow_resume: boolean;
  allow_section_switching: boolean;
  allow_return_to_previous_section: boolean;
  review_available_from: string | null;
  review_available_until: string | null;
  result_publish_at: string | null;
  subject_name: string | null;
  program_name: string;
  cohort_name: string | null;
  sections: StudentExamSection[];
  exam_questions: StudentExamQuestionDetail[];
  server_time: string;
  active_attempt: {
    id: string;
    status: string;
    started_at: string;
    expires_at: string | null;
    section_runtime: StudentAttemptRuntimeSection;
  } | null;
  attempts_used: number;
  remaining_attempts: number;
  review_available: boolean;
  result_published: boolean;
  result_status: string | null;
  availability_state: string;
  security_mode: string;
  security_policy: StudentSecurityPolicy;
  economy_access: StudentContentEconomyAccess;
};

export type StudentAttemptAnswer = {
  id: string;
  attempt: string;
  question: string;
  question_text_summary: string;
  selected_option: string | null;
  selected_option_text: string | null;
  selected_option_ids: string[];
  selected_option_texts: string[];
  answer_text: string;
  answered_at: string | null;
  time_spent_seconds: number | null;
  is_marked_for_review: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentAttemptDetail = {
  id: string;
  exam: string;
  exam_title: string;
  exam_code: string;
  exam_type: string;
  student: string;
  student_name: string;
  attempt_no: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  server_time: string;
  section_runtime: StudentAttemptRuntimeSection;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
  score: string;
  negative_score: string;
  final_score: string;
  percentage: string;
  time_taken_seconds: number;
  is_auto_submitted: boolean;
  metadata: Record<string, unknown>;
  security_mode: string;
  security_policy: StudentSecurityPolicy;
  integrity_summary: StudentIntegritySummary;
  accommodation_snapshot: StudentAccommodationSnapshot;
  questions: StudentExamQuestionDetail[];
  answers: StudentAttemptAnswer[];
  created_at: string;
  updated_at: string;
};

export type StudentAttemptSummary = {
  id: string;
  exam: string;
  exam_title: string;
  exam_type: string;
  student: string;
  student_name: string;
  attempt_no: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number | null;
  incorrect_answers: number | null;
  skipped_questions: number | null;
  score: string | null;
  negative_score: string | null;
  final_score: string | null;
  percentage: string | null;
  time_taken_seconds: number;
  is_auto_submitted: boolean;
  server_time: string;
  result_visible: boolean;
  review_available: boolean;
  accommodation_snapshot: StudentAccommodationSnapshot;
};

export type StudentAttemptReviewQuestion = {
  exam_question_id: string;
  question_id: string;
  question_order: number;
  section_id: string | null;
  section_name: string | null;
  section_title: string | null;
  section_order: number | null;
  question_text: string;
  content_format: string;
  question_type: string;
  difficulty_level: string;
  subject_name: string | null;
  topic_name: string | null;
  accepted_answers: string[];
  explanation: string;
  selected_option: string | null;
  selected_option_ids: string[];
  answer_text: string;
  is_marked_for_review: boolean;
  marks_awarded: string;
  negative_marks_applied: string;
  result_status: string;
  options: Array<{
    id: string;
    content_format: string;
    option_text: string;
    option_order: number;
    is_selected: boolean;
    is_correct: boolean;
  }>;
};

export type StudentAttemptReview = {
  id: string;
  exam: string;
  exam_title: string;
  exam_code: string;
  exam_type: string;
  student: string;
  student_name: string;
  attempt_no: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  server_time: string;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
  score: string;
  negative_score: string;
  final_score: string;
  percentage: string;
  time_taken_seconds: number;
  is_auto_submitted: boolean;
  review_mode: string;
  show_correct_answers: boolean;
  show_explanations: boolean;
  review_questions: StudentAttemptReviewQuestion[];
};
