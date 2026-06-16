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

export type StudentNotificationListResponse = {
  count: number;
  results: StudentNotification[];
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
  question_type: string;
  content_format: string;
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
  is_correct?: boolean;
  marks_awarded?: string;
  negative_marks_applied?: string;
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
  content_format: string;
  question_type: string;
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
  metadata: Record<string, unknown>;
  sections: TeacherExamSection[];
  assigned_students: TeacherAssignedStudent[];
  assigned_student_count: number;
  exam_questions: TeacherExamQuestion[];
  active_questions_count: number;
  publish_logs: TeacherExamPublishLog[];
  economy_policy: TeacherExamEconomyPolicy | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
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
  results_published: boolean;
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
  };
  exam_overview: Array<{
    exam_id: string;
    exam_title: string;
    exam_code: string;
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
  subject_name: string | null;
  topic_name: string | null;
  total_attempts: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  marked_for_review_count: number;
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
