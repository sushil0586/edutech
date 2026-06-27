export type TrendDirection = "improving" | "declining" | "stable";

export type StudentInsightSummary = {
  student_id: string;
  average_percentage: string;
  accuracy_percentage: string;
  attempted_questions: number;
  skipped_questions: number;
  recent_exams: Array<{
    exam_id: string;
    exam_title: string;
    exam_code: string;
    subject_name: string | null;
    primary_subject: string | null;
    primary_subject_name: string | null;
    is_multi_subject: boolean;
    section_subjects: TeacherExamSectionSubjectSummary[];
    subject_summary: TeacherExamSubjectSummary;
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id: string | null;
    source_teacher_name: string | null;
    percentage: string;
    final_score: string;
    result_status: string;
    published_at: string | null;
  }>;
  source_breakdown: Array<{
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id: string | null;
    source_teacher_name: string | null;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
    count: number;
  }>;
  source_subject_breakdown: Array<{
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id: string | null;
    source_teacher_name: string | null;
    subject_name: string;
    average_percentage: string;
    attempted_questions: number;
    skipped_questions: number;
    count: number;
  }>;
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
  improvement_trend: {
    direction: TrendDirection;
    change_percentage: string;
  };
  weak_question_types: Array<{
    question_type: string;
    wrong_percentage: string;
    skip_percentage: string;
    wrong_count: number;
    skipped_count: number;
    total: number;
  }>;
  insight_messages: string[];
  attempt_behavior: {
    attempt_count: number;
    attempted_questions: number;
    skipped_questions: number;
  };
  benchmark_overview: Array<{
    scope: string;
    label: string;
    participant_count: number;
    average_percentage: string;
    accuracy_percentage: string;
  }>;
};

export type StudentAvailableExam = {
  id: string;
  title: string;
  code: string;
  exam_type: string;
  attempt_policy: string;
  access_key_enabled: boolean;
  status: string;
  subject_name: string;
  primary_subject: string | null;
  primary_subject_name: string | null;
  is_multi_subject: boolean;
  section_subjects: TeacherExamSectionSubjectSummary[];
  subject_summary: TeacherExamSubjectSummary;
  duration_minutes: number;
  start_at: string | null;
  end_at: string | null;
  total_marks: string;
  passing_marks: string;
  instructions: string;
  server_time?: string;
  attempts_used: number;
  remaining_attempts: number;
  active_attempt: {
    id: string;
    status: string;
    started_at: string;
    expires_at: string | null;
    section_runtime: {
      current_section_id: string | null;
      current_section_name: string | null;
      current_section_order: number | null;
      current_section_started_at: string | null;
      current_section_expires_at: string | null;
      current_section_timer_enabled: boolean;
      visited_section_ids: string[];
      highest_section_order_reached: number | null;
    };
  } | null;
  availability_state: string;
  starts_in_seconds?: number;
  ends_in_seconds?: number;
  can_start: boolean;
  can_resume: boolean;
  review_available: boolean;
  result_published: boolean;
  result_status: string | null;
  latest_attempt_status: string | null;
  security_mode: string;
  security_policy: StudentSecurityPolicy;
  assignment_mode?: string;
  assigned_to_student?: boolean;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_id: string | null;
  source_teacher_name: string | null;
  economy_access: StudentContentEconomyAccess;
  experience_profile: StudentExamExperienceProfile;
};

export type DashboardData = {
  source: "live" | "unconfigured" | "error";
  apiConfigured: boolean;
  summary: StudentInsightSummary | null;
  exams: StudentAvailableExam[];
};

export type StudentWalletSummary = {
  id: string;
  institute: string;
  student: string;
  student_name: string;
  student_admission_no: string;
  available_stars: number;
  lifetime_earned_stars: number;
  lifetime_spent_stars: number;
  admin_granted_stars: number;
  paid_credited_stars: number;
  subscription_credited_stars: number;
  reserved_stars: number;
  last_ledger_entry_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type EconomyOperatorPolicy = {
  role: "platform_admin" | "institute_admin";
  can_grant_stars: boolean;
  max_grant_stars: number | null;
  can_confirm_orders: boolean;
  max_confirm_order_amount: string | null;
  max_confirm_order_currency: string | null;
  catalog_governance_scope: "platform_only";
  support_scope: "cross_institute" | "institute_only";
};

export type StudentStarLedgerEntry = {
  id: string;
  institute: string;
  student: string;
  student_name: string;
  direction: string;
  source_type: string;
  source_id: string;
  source_reference: string;
  reason: string;
  stars_delta: number;
  balance_after: number;
  balance_source: string;
  created_by: number | null;
  created_by_label: string | null;
  effective_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentRewardEvent = {
  id: string;
  institute: string;
  student: string;
  student_name: string;
  reward_rule: string;
  reward_rule_name: string;
  reward_rule_type: string;
  ledger_entry: StudentStarLedgerEntry | null;
  event_key: string;
  event_reference: string;
  awarded_stars: number;
  processed_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentUnlockState = {
  id: string;
  institute: string;
  student: string;
  student_name: string;
  subject: string | null;
  subject_name: string | null;
  content_type: string;
  content_key: string;
  content_label: string;
  status: string;
  lock_reason_code: string;
  lock_reason_message: string;
  unlocked_at: string | null;
  locked_at: string | null;
  last_evaluated_at: string | null;
  granted_by: number | null;
  granted_by_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentContentEconomyAccess = {
  content_type: string;
  content_key: string;
  subject_id: string | null;
  content_label: string;
  policy_type: string | null;
  star_cost: number;
  requires_unlock: boolean;
  can_unlock_with_stars: boolean;
  is_unlocked: boolean;
  is_locked: boolean;
  lock_reason_code: string;
  lock_reason_message: string;
  unlock_state_status: string;
};

export type StudentStarPack = {
  id: string;
  institute: string;
  name: string;
  code: string;
  stars_credited: number;
  price_amount: string;
  currency: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
};

export type StudentSubscriptionStarCreditRule = {
  id: string;
  stars_credited: number;
  credit_on_activation: boolean;
  credit_on_renewal: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
};

export type StudentSubscriptionPlanCycle = {
  id: string;
  billing_interval: string;
  interval_count: number;
  price_amount: string;
  currency: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  star_credit_rules: StudentSubscriptionStarCreditRule[];
};

export type StudentSubscriptionPlan = {
  id: string;
  institute: string;
  name: string;
  code: string;
  description: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  cycles: StudentSubscriptionPlanCycle[];
};

export type StudentPaymentTransaction = {
  id: string;
  status: string;
  provider_name: string;
  provider_transaction_reference: string;
  amount: string;
  currency: string;
  ledger_entry: string | null;
  processed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentPaymentOrder = {
  id: string;
  institute: string;
  student: string;
  student_name: string;
  star_pack: string | null;
  star_pack_name: string;
  subscription_plan_cycle: string | null;
  subscription_plan_name: string;
  subscription_cycle_label: string;
  order_type: string;
  status: string;
  amount: string;
  currency: string;
  provider_name: string;
  provider_order_reference: string;
  metadata: Record<string, unknown>;
  transactions: StudentPaymentTransaction[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentSubscriptionBillingEvent = {
  id: string;
  payment_transaction: string | null;
  ledger_entry: string | null;
  event_type: string;
  amount: string;
  currency: string;
  event_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentSubscription = {
  id: string;
  institute: string;
  student: string;
  student_name: string;
  plan_cycle: string;
  plan_name: string;
  billing_interval: string;
  interval_count: number;
  status: string;
  activated_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  metadata: Record<string, unknown>;
  billing_events: StudentSubscriptionBillingEvent[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type StudentResult = {
  id: string;
  institute: string;
  exam: string;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_id: string | null;
  source_teacher_name: string | null;
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

export type StudentQuestionBenchmark = {
  participant_count: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  correct_percentage: string;
} | null;

export type StudentQuestionAnalyticsItem = {
  question_id: string;
  question_text: string;
  question_text_summary: string;
  subject_name: string | null;
  topic_id: string | null;
  topic_name: string | null;
  question_type: string;
  difficulty_level: string;
  category_label: string;
  tag_labels: string[];
  has_image: boolean;
  attachments: Array<{
    id: string;
    title: string;
    attachment_type: string;
    file_url: string;
    alt_text: string;
    is_inline: boolean;
  }>;
  explanation: string;
  attempted_by_you: boolean;
  your_result: "correct" | "wrong" | "skipped";
  your_time_spent_seconds: number;
  your_marks_awarded: string;
  your_negative_marks: string;
  school_benchmark: StudentQuestionBenchmark;
  city_benchmark: StudentQuestionBenchmark;
  state_benchmark: StudentQuestionBenchmark;
  program_benchmark: StudentQuestionBenchmark;
};

export type StudentQuestionAnalytics = {
  overview: {
    question_count: number;
    attempted_count: number;
    correct_count: number;
    wrong_count: number;
    skipped_count: number;
  };
  benchmark_overview: Array<{
    scope: string;
    label: string;
  participant_count: number;
  average_percentage: string;
  accuracy_percentage: string;
  }>;
  questions: StudentQuestionAnalyticsItem[];
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

export type AssessmentQuestionTypeDefinition = {
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

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type StudentNotification = {
  id: string;
  institute: string | null;
  recipient_user: number;
  notification_type: string;
  title: string;
  message: string;
  related_object_type: string;
  related_object_id: string;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type StudentNotificationFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type StudentNotificationListResponse = PaginatedResponse<StudentNotification> & {
  summary: {
    total: number;
    unread: number;
    read: number;
  };
  available_notification_types: StudentNotificationFacetOption[];
  available_related_object_types: StudentNotificationFacetOption[];
  applied_filters: {
    status: string;
    notification_type: string;
    related_object_type: string;
    ordering: string;
    search: string;
  };
};

export type NotificationUnreadCount = {
  unread_count: number;
};

export type StudentExamSection = {
  id: string;
  exam: string;
  name: string;
  description: string;
  section_order: number;
  instructions: string;
  total_questions: number;
  marks_per_question: string | null;
  negative_marks_per_question: string | null;
  timer_enabled: boolean;
  duration_minutes: number | null;
  allow_skip_section: boolean;
  lock_after_submit: boolean;
  linked_questions_count: number;
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
  assertion_text?: string;
  reason_text?: string;
  matrix_left_items?: string[];
  matrix_right_items?: string[];
  question_type: string;
  question_type_definition: AssessmentQuestionTypeDefinition | null;
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
  options: Array<{
    id: string;
    content_format: string;
    option_text: string;
    option_order: number;
    is_active: boolean;
  }>;
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

export type StudentExamExperienceProfile = {
  exam_type: string;
  assessment_family: string;
  assessment_family_label: string;
  experience_mode: string;
  experience_label: string;
  recommended_media_flow: string;
  recommended_media_flow_label: string;
  recommended_timer_mode: string;
  recommended_navigation_mode: string;
  section_strategy: string;
  section_strategy_label: string;
  delivery_emphasis: string;
  supports_section_media_guidance: boolean;
  learner_summary: string;
  creator_summary: string;
  delivery_mode: string;
  actual_timer_mode: string;
  actual_navigation_mode: string;
  runtime_alignment: boolean;
};

export type StudentIntegrityEvent = {
  event_type: string;
  severity: string;
  counts_as_violation: boolean;
  event_at: string;
  metadata: Record<string, unknown>;
};

export type StudentIntegritySummary = {
  violation_count: number;
  violation_limit: number | null;
  remaining_before_action: number | null;
  threshold_reached: boolean;
  latest_event: StudentIntegrityEvent | null;
  recent_events: StudentIntegrityEvent[];
};

export type StudentSectionMediaContext = {
  has_media: boolean;
  scope: string;
  section_id: string | null;
  section_name: string | null;
  question_count: number;
  questions_with_media: number;
  total_attachments: number;
  inline_attachment_count: number;
  attachment_types: string[];
  delivery_modes: string[];
  preload_strategies: string[];
  supports_audio_prompt: boolean;
  supports_video_prompt: boolean;
  supports_document_prompt: boolean;
  supports_visual_prompt: boolean;
  recommended_experience: string;
  learner_notice: string;
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

export type StudentExamDetail = {
  id: string;
  title: string;
  code: string;
  exam_type: string;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
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
  primary_subject: string | null;
  primary_subject_name: string | null;
  is_multi_subject: boolean;
  section_subjects: TeacherExamSectionSubjectSummary[];
  subject_summary: TeacherExamSubjectSummary;
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
    section_runtime: {
      current_section_id: string | null;
      current_section_name: string | null;
      current_section_order: number | null;
      current_section_started_at: string | null;
      current_section_expires_at: string | null;
      current_section_timer_enabled: boolean;
      visited_section_ids: string[];
      highest_section_order_reached: number | null;
    };
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
  experience_profile: StudentExamExperienceProfile;
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
  answered_at: string | null;
  time_spent_seconds: number | null;
  is_marked_for_review: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_correct?: boolean;
  marks_awarded?: string;
  negative_marks_applied?: string;
};

export type StudentUploadedResponseArtifact = {
  asset_kind: string;
  upload_token: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_status: string;
  checksum: string;
  storage_path: string;
  file_url: string;
};

export type StudentAttemptDetail = {
  id: string;
  exam: string;
  exam_title: string;
  exam_code: string;
  exam_type: string;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
  student: string;
  student_name: string;
  attempt_no: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  server_time: string;
  section_runtime: {
    current_section_id?: string | null;
    current_section_name?: string | null;
    current_section_order?: number | null;
    current_section_started_at?: string | null;
    current_section_expires_at?: string | null;
    current_section_timer_enabled?: boolean;
    visited_section_ids?: string[];
    highest_section_order_reached?: number | null;
  };
  current_section_media_context: StudentSectionMediaContext;
  experience_profile: StudentExamExperienceProfile;
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
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
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

export type StudentAttemptListItem = {
  id: string;
  exam: string;
  exam_title: string;
  exam_code: string;
  exam_type: string;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_id: string | null;
  source_teacher_name: string | null;
  student: string;
  student_name: string;
  attempt_no: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
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
  created_at: string;
  updated_at: string;
  is_active: boolean;
  server_time: string;
  section_runtime: {
    current_section_id?: string | null;
    current_section_name?: string | null;
    current_section_order?: number | null;
    current_section_started_at?: string | null;
    current_section_expires_at?: string | null;
    current_section_timer_enabled?: boolean;
    visited_section_ids?: string[];
    highest_section_order_reached?: number | null;
  };
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
  assertion_text?: string;
  reason_text?: string;
  matrix_left_items?: string[];
  matrix_right_items?: string[];
  content_format: string;
  question_type: string;
  question_type_definition: AssessmentQuestionTypeDefinition | null;
  passage: string | null;
  passage_order: number | null;
  passage_detail: {
    id: string;
    title: string;
    content_format: string;
    passage_text: string;
    description: string;
  } | null;
  difficulty_level: string;
  subject_name: string | null;
  topic_name: string | null;
  accepted_answers: string[];
  explanation: string;
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
  selected_option: string | null;
  selected_option_ids: string[];
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

export type TeacherExamSection = {
  id: string;
  exam: string;
  subject: string | null;
  subject_name: string | null;
  name: string;
  description: string;
  section_order: number;
  instructions: string;
  total_questions: number;
  marks_per_question: string | null;
  negative_marks_per_question: string | null;
  timer_enabled: boolean;
  duration_minutes: number | null;
  allow_skip_section: boolean;
  lock_after_submit: boolean;
  linked_questions_count: number;
  is_active: boolean;
};

export type TeacherAssignedStudent = {
  id: string;
  student: string;
  full_name: string;
  admission_no: string;
  cohort_name: string | null;
  notes: string;
  is_active: boolean;
};

export type TeacherExamQuestion = {
  id: string;
  exam: string;
  question: string;
  section: string | null;
  section_title: string | null;
  section_order: number | null;
  question_text_summary: string;
  question_text: string;
  question_type: string;
  difficulty_level: string;
  passage: string | null;
  passage_order: number | null;
  passage_title: string | null;
  passage_content_format: string | null;
  passage_text: string | null;
  topic: string | null;
  topic_name: string | null;
  explanation: string;
  has_explanation: boolean;
  section_name: string;
  question_order: number;
  marks: string | null;
  negative_marks: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherExamPublishLog = {
  id: string;
  exam: string;
  old_status: string;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  remarks: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type TeacherExamEconomyPolicy = {
  id: string;
  content_type: string;
  content_key: string;
  content_label: string;
  policy_type: string;
  star_cost: number;
  entitlement_code: string;
  priority: number;
  subject: string | null;
  subject_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeacherExamSectionSubjectSummary = {
  id: string;
  name: string;
  code: string;
  section_count: number;
  section_ids: string[];
};

export type TeacherExamSubjectSummary = {
  display_label: string;
  short_label: string;
  subject_count: number;
  primary_subject_id: string | null;
  primary_subject_name: string | null;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
  }>;
};

export type ReadinessIssue = {
  code: string;
  field: string;
  message: string;
  level: "blocker" | "warning";
};

export type TeacherExamPublishReadiness = {
  ready: boolean;
  blocker_count: number;
  warning_count: number;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
};

export type TeacherResultPublishReadiness = {
  ready: boolean;
  blocker_count: number;
  warning_count: number;
  generated_results_count: number;
  published_results_count: number;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
};

export type TeacherExam = {
  id: string;
  institute: string;
  academic_year: string;
  program: string;
  program_name: string | null;
  cohort: string | null;
  cohort_name: string | null;
  subject: string | null;
  subject_name: string | null;
  primary_subject: string | null;
  primary_subject_name: string | null;
  is_multi_subject: boolean;
  section_subjects: TeacherExamSectionSubjectSummary[];
  subject_summary: TeacherExamSubjectSummary;
  title: string;
  code: string;
  description: string;
  exam_type: string;
  delivery_mode: string;
  status: string;
  duration_minutes: number;
  total_marks: string;
  passing_marks: string;
  start_at: string | null;
  end_at: string | null;
  instructions: string;
  allow_late_submit: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_result_immediately: boolean;
  allow_review_after_submit: boolean;
  max_attempts: number;
  timer_mode: string;
  navigation_mode: string;
  attempt_policy: string;
  result_publish_mode: string;
  review_mode: string;
  security_mode: string;
  access_key: string;
  access_key_enabled: boolean;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
  assignment_mode: string;
  allow_resume: boolean;
  allow_section_switching: boolean;
  allow_return_to_previous_section: boolean;
  result_publish_at: string | null;
  review_available_from: string | null;
  review_available_until: string | null;
  rank_visibility_mode: string;
  percentile_visibility_mode: string;
  benchmark_visibility_mode: string;
  rank_freeze_policy: string;
  experience_profile: StudentExamExperienceProfile;
  metadata: Record<string, unknown>;
  sections: TeacherExamSection[];
  assigned_students: TeacherAssignedStudent[];
  assigned_student_count: number;
  exam_questions: TeacherExamQuestion[];
  active_questions_count: number;
  publish_logs: TeacherExamPublishLog[];
  publish_readiness: TeacherExamPublishReadiness;
  economy_policy: TeacherExamEconomyPolicy | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type TeacherExamListItem = {
  id: string;
  institute: string;
  academic_year: string;
  program: string;
  program_name: string | null;
  cohort: string | null;
  cohort_name: string | null;
  subject: string | null;
  subject_name: string | null;
  primary_subject: string | null;
  primary_subject_name: string | null;
  is_multi_subject: boolean;
  section_subjects: TeacherExamSectionSubjectSummary[];
  subject_summary: TeacherExamSubjectSummary;
  title: string;
  code: string;
  description: string;
  exam_type: string;
  delivery_mode: string;
  status: string;
  duration_minutes: number;
  total_marks: string;
  passing_marks: string;
  start_at: string | null;
  end_at: string | null;
  instructions: string;
  allow_late_submit: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_result_immediately: boolean;
  allow_review_after_submit: boolean;
  max_attempts: number;
  timer_mode: string;
  navigation_mode: string;
  attempt_policy: string;
  result_publish_mode: string;
  review_mode: string;
  security_mode: string;
  access_key: string;
  access_key_enabled: boolean;
  source_type: string;
  source_label: string;
  source_name: string;
  source_teacher_name: string | null;
  assignment_mode: string;
  allow_resume: boolean;
  allow_section_switching: boolean;
  allow_return_to_previous_section: boolean;
  result_publish_at: string | null;
  review_available_from: string | null;
  review_available_until: string | null;
  rank_visibility_mode: string;
  percentile_visibility_mode: string;
  benchmark_visibility_mode: string;
  rank_freeze_policy: string;
  experience_profile: StudentExamExperienceProfile;
  metadata: Record<string, unknown>;
  assigned_student_count: number;
  active_questions_count: number;
  security_policy: StudentSecurityPolicy;
  economy_policy: TeacherExamEconomyPolicy | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type TeacherExamPage = PaginatedResponse<TeacherExamListItem> & {
  applied_filter: string;
  applied_sort: string;
  applied_search: string;
  summary?: {
    total_star_cost: number;
  };
};

export type TeacherResultSummary = {
  id: string;
  institute: string;
  exam: string;
  total_attempted: number;
  total_passed: number;
  total_failed: number;
  highest_score: string;
  lowest_score: string;
  average_percentage: string;
  last_calculated_at: string;
  exam_title: string;
  exam_code: string;
  total_results_count: number;
  published_results_count: number;
  pending_review_tasks_count: number;
  recheck_review_tasks_count: number;
  results_published: boolean;
  review_blocked: boolean;
  review_release_risk: {
    level: "none" | "low" | "medium" | "high";
    label: string;
    summary: string;
    pending_review_tasks: number;
    recheck_review_tasks: number;
    oldest_open_hours: number;
  };
  experience_profile: StudentExamExperienceProfile;
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
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type TeacherInsightSummary = {
  overview: {
    tracked_exams: number;
    total_attempts: number;
    average_percentage: string;
    accuracy_percentage: string;
    average_time_taken_seconds: number;
    pending_review_tasks: number;
  };
  review_summary: {
    pending_tasks: number;
    assigned_tasks: number;
    in_review_tasks: number;
    recheck_requested_tasks: number;
    blocked_exams: number;
  };
  exam_overview: Array<{
    exam_id: string;
    exam_title: string;
    exam_code: string;
    experience_profile: StudentExamExperienceProfile;
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
    total_attempted: number;
    total_passed: number;
    total_failed: number;
    average_percentage: string;
    highest_score: string;
    lowest_score: string;
  }>;
  high_performing_students: Array<{
    student_id: string;
    student_name: string;
    admission_no: string;
    average_percentage: string;
  }>;
  low_performing_students: Array<{
    student_id: string;
    student_name: string;
    admission_no: string;
    average_percentage: string;
  }>;
  weak_topics: Array<{
    subject_name: string;
    topic_name: string | null;
    average_percentage: string;
    attempted_questions: number;
  }>;
  most_wrong_questions: Array<{
    question_id: string;
    question_text_summary: string;
    subject_name: string | null;
    topic_name: string | null;
    wrong_count: number;
    total_attempts: number;
  }>;
  most_skipped_questions: Array<{
    question_id: string;
    question_text_summary: string;
    subject_name: string | null;
    topic_name: string | null;
    skipped_count: number;
    total_attempts: number;
  }>;
};

export type TeacherLeaderboardRow = {
  id: string;
  student: string;
  student_name: string;
  student_admission_no: string;
  rank: number | null;
  final_score: string;
  percentage: string;
  time_taken_seconds: number | null;
  result_status: string;
  is_published: boolean;
};

export type TeacherAttemptAlert = {
  code: string;
  label: string;
  severity: string;
  message: string;
};

export type TeacherExamAttempt = {
  id: string;
  exam: string;
  exam_title: string;
  student: string;
  student_name: string;
  student_admission_no: string;
  attempt_no: number;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
  final_score: string;
  percentage: string;
  time_taken_seconds: number | null;
  is_auto_submitted: boolean;
  can_force_submit: boolean;
  force_submit_block_reason: string | null;
  integrity_summary: StudentIntegritySummary;
  accommodation_snapshot: StudentAccommodationSnapshot;
  alerts: TeacherAttemptAlert[];
};

export type TeacherQuestionAnalysis = {
  question_id: string;
  question_text_summary: string;
  passage_title: string;
  subject_name: string | null;
  topic_name: string | null;
  total_attempts: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  marked_for_review_count: number;
  correct_rate: number;
  wrong_rate: number;
  skip_rate: number;
  quality_signal: "healthy" | "watch" | "hard" | "skip_risk" | "ambiguous" | "revision_candidate" | "emerging";
  revision_priority: "none" | "watch" | "medium" | "high" | "urgent";
  quality_note: string;
  distractor_insights: Array<{
    option_id: string;
    option_text_summary: string;
    is_correct: boolean;
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
  }>;
  revision_reasons: string[];
};

type TeacherDistractorInsight = TeacherQuestionAnalysis["distractor_insights"][number];

export type TeacherQuestionAnalysisPage = PaginatedResponse<TeacherQuestionAnalysis> & {
  applied_filter?: string;
  summary?: {
    question_quality?: {
      revision_candidates: number;
      urgent_revision_candidates: number;
      high_skip_questions: number;
      hard_questions: number;
      healthy_questions: number;
      watch_questions: number;
      ambiguous_questions: number;
      emerging_questions: number;
      top_revision_topics: Array<{
        topic_name: string;
        count: number;
      }>;
      top_revision_questions: Array<{
        question_id: string;
        question_text_summary: string;
        topic_name: string | null;
        revision_priority: "high" | "urgent";
        quality_signal: "healthy" | "watch" | "hard" | "skip_risk" | "ambiguous" | "revision_candidate" | "emerging";
      }>;
      recommended_actions: string[];
    };
    distractor_quality?: {
      weak_distractors: number;
      untested_distractors: number;
      strong_distractors: number;
      key_review_options: number;
      top_weak_distractors: TeacherDistractorInsight[];
      top_strong_distractors: TeacherDistractorInsight[];
    };
    rubric?: {
      reviewed_responses: number;
      criteria_count: number;
      weakest_criteria: Array<{
        criterion_key: string;
        criterion_label: string;
        awarded_total: number;
        max_total: number;
        reviewed_count: number;
        average_percentage: number;
        average_awarded_score: number;
        average_max_score: number;
      }>;
      strongest_criteria: Array<{
        criterion_key: string;
        criterion_label: string;
        awarded_total: number;
        max_total: number;
        reviewed_count: number;
        average_percentage: number;
        average_awarded_score: number;
        average_max_score: number;
      }>;
    };
  };
};

export type TeacherAttemptQuestionAnalysisRow = {
  answer_id: string | null;
  review_task_id?: string | null;
  question_id: string;
  question_order: number;
  question_text_summary: string;
  question_text: string;
  assertion_text?: string;
  reason_text?: string;
  matrix_left_items?: string[];
  matrix_right_items?: string[];
  question_type: string;
  question_type_definition: AssessmentQuestionTypeDefinition | null;
  content_format: string;
  question_marks: string | null;
  passage: string | null;
  passage_order: number | null;
  passage_title: string;
  passage_content_format: string;
  passage_text: string;
  passage_description: string;
  subject_name: string | null;
  topic_name: string | null;
  accepted_answers: string[];
  selected_option: string | null;
  selected_option_text: string | null;
  selected_option_ids: string[];
  selected_option_texts: string[];
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
  evaluation_status: string;
  outcome: "correct" | "wrong" | "skipped";
  is_correct: boolean | null;
  was_skipped: boolean;
  is_marked_for_review: boolean;
  marks_awarded: string | null;
  negative_marks_applied: string | null;
  reviewed_at: string | null;
  reviewed_by_teacher_name: string;
  review_notes: string;
  has_rubric?: boolean;
  rubric?: {
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
  rubric_scores?: Array<{
    criterion_key: string;
    criterion_label: string;
    max_score: string;
    awarded_score: string;
    note: string;
  }>;
  rubric_total?: string;
  time_spent_seconds: number | null;
  answered_at: string | null;
};

export type TeacherAttemptQuestionAnalysis = {
  selected_attempt: TeacherExamAttempt | null;
  summary: {
    total_questions: number;
    attempted_questions: number;
    correct_count: number;
    wrong_count: number;
    skipped_count: number;
    marked_count: number;
    total_time_seconds: number;
    average_time_seconds: number;
  };
  applied_filter: "all" | "correct" | "wrong" | "skipped" | "marked" | "slow";
  results: TeacherAttemptQuestionAnalysisRow[];
};

export type TeacherLeaderboardPage = PaginatedResponse<TeacherLeaderboardRow> & {
  summary: {
    total: number;
    ranked_count: number;
    published_count: number;
    all_ranked: boolean;
    published_results: boolean;
  };
};

export type TeacherExamAttemptPage = PaginatedResponse<TeacherExamAttempt> & {
  summary: {
    total_attempts: number;
  };
  applied_filter: string;
  applied_sort: string;
  applied_search: string;
  selected_attempt: TeacherExamAttempt | null;
};

export type TeacherLiveExamMonitor = {
  exam_id: string;
  exam_title: string;
  exam_code: string;
  exam_status: string;
  total_students: number;
  started_students: number;
  not_started_students: number;
  in_progress_students: number;
  submitted_students: number;
  auto_submitted_students: number;
  completed_students: number;
  alerted_attempts: number;
  high_alert_attempts: number;
  medium_alert_attempts: number;
  stalled_attempts: number;
  integrity_warning_attempts: number;
  integrity_warnings_total: number;
  threshold_reached_attempts: number;
  attempts_by_health: {
    critical: number;
    watch: number;
    stable: number;
  };
  completion_percentage: number;
  submission_percentage: number;
  last_activity_at: string | null;
  recent_attempts: TeacherExamAttempt[];
};

export type TeacherAttemptIntervention = {
  id: string;
  action: string;
  message: string;
  metadata: {
    follow_up?: string;
    exam_id?: string;
    student_id?: string;
  };
  created_at: string;
  user_label: string;
};
