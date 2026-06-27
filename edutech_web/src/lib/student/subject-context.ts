export const STUDENT_SUBJECT_CONTEXT_COOKIE = "nexora_student_subject_context";
export const STUDENT_SOURCE_CONTEXT_COOKIE = "nexora_student_source_context";
export const STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE =
  "nexora_student_source_teacher_context";
export const ALL_SUBJECTS_CONTEXT = "overall";
export const ALL_SOURCES_CONTEXT = "all";

export type StudentSubjectOption = {
  value: string;
  label: string;
};

export type StudentSourceValue = "all" | "platform" | "institute" | "teacher";

export type StudentSourceOption = {
  value: StudentSourceValue;
  label: string;
};

export const DEFAULT_STUDENT_SOURCE_OPTIONS: StudentSourceOption[] = [
  { value: ALL_SOURCES_CONTEXT, label: "All Sources" },
  { value: "platform", label: "Platform" },
  { value: "institute", label: "Institute" },
  { value: "teacher", label: "Teacher" },
];

export type StudentTeacherSourceOption = {
  id: string;
  name: string;
};

type SubjectSummaryCarrier = {
  subject_name?: string | null;
  primary_subject_name?: string | null;
  section_subjects?: Array<{
    name?: string | null;
  }> | null;
  subject_summary?: {
    display_label?: string | null;
    subjects?: Array<{
      name?: string | null;
    }> | null;
  } | null;
};

type StudentProfileWorkspaceContext = {
  student_context?: {
    subject_options?: StudentSubjectOption[] | null;
  } | null;
  registration_context?: Record<string, unknown>;
};

function normalizeContextValue(value: string) {
  return value.trim().toLowerCase();
}

export function getStudentSubjectOptions(
  profileOrContext: StudentProfileWorkspaceContext | Record<string, unknown>,
): StudentSubjectOption[] {
  const contextCarrier = profileOrContext as StudentProfileWorkspaceContext;
  const studentContext = contextCarrier.student_context ?? null;
  const workspaceOptions = Array.isArray(studentContext?.subject_options)
    ? studentContext.subject_options
    : [];
  const registrationContext =
    "registration_context" in profileOrContext
      ? (profileOrContext.registration_context ?? {})
      : profileOrContext;
  const contextRecord = registrationContext as Record<string, unknown>;
  const subjectInterests = Array.isArray(contextRecord.subject_interests)
    ? contextRecord.subject_interests
    : [];

  const options: StudentSubjectOption[] = [
    { value: ALL_SUBJECTS_CONTEXT, label: "Overall" },
  ];

  const seen = new Set<string>();

  workspaceOptions.forEach((option: StudentSubjectOption) => {
    if (!option || typeof option.value !== "string" || typeof option.label !== "string") {
      return;
    }

    const value = option.value.trim();
    const label = option.label.trim();
    if (!value || !label) {
      return;
    }

    const normalized = normalizeContextValue(value);
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    options.push({ value, label });
  });

  subjectInterests.forEach((subject) => {
    if (typeof subject !== "string") {
      return;
    }

    const trimmed = subject.trim();
    if (!trimmed) {
      return;
    }

    const normalized = normalizeContextValue(trimmed);
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    options.push({ value: trimmed, label: trimmed });
  });

  return options;
}

export function resolveSelectedStudentSubject(
  options: StudentSubjectOption[],
  storedValue?: string | null,
) {
  if (!storedValue) {
    return ALL_SUBJECTS_CONTEXT;
  }

  const normalizedStoredValue = normalizeContextValue(storedValue);
  const match = options.find(
    (option) => normalizeContextValue(option.value) === normalizedStoredValue,
  );

  return match?.value ?? ALL_SUBJECTS_CONTEXT;
}

export function resolveSelectedStudentSource(
  storedValue?: string | null,
): StudentSourceValue {
  switch (normalizeContextValue(storedValue ?? "")) {
    case "platform":
      return "platform";
    case "institute":
      return "institute";
    case "teacher":
      return "teacher";
    default:
      return "all";
  }
}

export function resolveSelectedStudentSourceTeacher(
  options: StudentTeacherSourceOption[],
  selectedSource: StudentSourceValue,
  storedValue?: string | null,
) {
  if (selectedSource !== "teacher" || !storedValue) {
    return null;
  }

  const trimmed = storedValue.trim();
  if (!trimmed) {
    return null;
  }

  return options.some((option) => option.id === trimmed) ? trimmed : null;
}

export function selectedStudentSourceLabel(value: StudentSourceValue) {
  switch (value) {
    case "platform":
      return "Platform";
    case "institute":
      return "Institute";
    case "teacher":
      return "Teacher";
    default:
      return "All Sources";
  }
}

export function getStudentSourceOptions(records: Array<{
  source_type: string;
  source_teacher_id?: string | null;
  source_teacher_name?: string | null;
}>) {
  const options: StudentSourceOption[] = [...DEFAULT_STUDENT_SOURCE_OPTIONS];
  const teacherMap = new Map<string, string>();

  records.forEach((record) => {
    const sourceType = normalizeContextValue(record.source_type) as StudentSourceValue;
    if (
      sourceType === "teacher" &&
      record.source_teacher_id &&
      record.source_teacher_name
    ) {
      teacherMap.set(record.source_teacher_id, record.source_teacher_name);
    }
  });

  const teacherOptions = Array.from(teacherMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    sourceOptions: options,
    teacherOptions,
  };
}

export function isOverallSubjectContext(value: string) {
  return normalizeContextValue(value) === ALL_SUBJECTS_CONTEXT;
}

export function matchesSelectedSubject(
  subjectName: string,
  selectedSubject: string,
) {
  if (isOverallSubjectContext(selectedSubject)) {
    return true;
  }

  return normalizeContextValue(subjectName) === normalizeContextValue(selectedSubject);
}

function appendUniqueSubjectName(target: string[], seen: Set<string>, value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return;
  }

  const normalized = normalizeContextValue(trimmed);
  if (seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  target.push(trimmed);
}

export function getExamSubjectNames(exam: SubjectSummaryCarrier) {
  const names: string[] = [];
  const seen = new Set<string>();

  appendUniqueSubjectName(names, seen, exam.subject_name);
  appendUniqueSubjectName(names, seen, exam.primary_subject_name);

  exam.subject_summary?.subjects?.forEach((subject) => {
    appendUniqueSubjectName(names, seen, subject?.name);
  });

  exam.section_subjects?.forEach((subject) => {
    appendUniqueSubjectName(names, seen, subject?.name);
  });

  return names;
}

export function getExamSubjectDisplayLabel(exam: SubjectSummaryCarrier) {
  const summaryLabel = exam.subject_summary?.display_label?.trim();
  if (summaryLabel) {
    return summaryLabel;
  }

  return getExamSubjectNames(exam)[0] ?? "Subject pending";
}

export function matchesSelectedSource(
  record: {
    source_type: string;
    source_teacher_id?: string | null;
  },
  selectedSource: StudentSourceValue,
  selectedTeacherId?: string | null,
) {
  if (selectedSource === ALL_SOURCES_CONTEXT) {
    return true;
  }

  if (normalizeContextValue(record.source_type) !== selectedSource) {
    return false;
  }

  if (selectedSource !== "teacher" || !selectedTeacherId) {
    return true;
  }

  return (record.source_teacher_id ?? "").trim() === selectedTeacherId;
}

function decimalValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeStudentWeakTopics<
  T extends {
    topic_id?: string | null;
    topic_name?: string | null;
    subject_name?: string | null;
  },
>(topics: T[]) {
  const seen = new Set<string>();

  return topics.filter((topic) => {
    const key = (topic.topic_id ?? "").trim()
      || `${topic.subject_name ?? ""}::${topic.topic_name ?? ""}`.trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function filterStudentSummaryBySubject<T extends {
  recent_exams: Array<{
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id?: string | null;
    source_teacher_name: string | null;
    subject_name: string | null;
    primary_subject_name?: string | null;
    section_subjects?: Array<{
      name?: string | null;
    }> | null;
    subject_summary?: {
      display_label?: string | null;
      subjects?: Array<{
        name?: string | null;
      }> | null;
    } | null;
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
  strongest_subjects: Array<{ subject_name: string }>;
  weakest_subjects: Array<{ subject_name: string }>;
  weak_topics: Array<{ subject_name: string }>;
}>(summary: T, selectedSubject: string) {
  const summaryWeakTopics = dedupeStudentWeakTopics(summary.weak_topics);

  if (isOverallSubjectContext(selectedSubject)) {
    return {
      ...summary,
      weak_topics: summaryWeakTopics as T["weak_topics"],
    };
  }

  const strongestSubjects = summary.strongest_subjects.filter((subject) =>
    matchesSelectedSubject(subject.subject_name, selectedSubject),
  );
  const weakestSubjects = summary.weakest_subjects.filter((subject) =>
    matchesSelectedSubject(subject.subject_name, selectedSubject),
  );
  const weakTopics = dedupeStudentWeakTopics(
    summaryWeakTopics.filter((topic) =>
      matchesSelectedSubject(topic.subject_name, selectedSubject),
    ),
  );
  const scopedSourceSubjectBreakdown = summary.source_subject_breakdown.filter((row) =>
    matchesSelectedSubject(row.subject_name, selectedSubject),
  );
  const sourceRollups = new Map<
    string,
    {
      source_type: string;
      source_label: string;
      source_name: string;
      source_teacher_id: string | null;
      source_teacher_name: string | null;
      weightedPercentageTotal: number;
      attempted_questions: number;
      skipped_questions: number;
      count: number;
    }
  >();

  scopedSourceSubjectBreakdown.forEach((row) => {
    const existing = sourceRollups.get(row.source_type);
    if (existing) {
      existing.count += row.count;
      existing.attempted_questions += row.attempted_questions;
      existing.skipped_questions += row.skipped_questions;
      existing.weightedPercentageTotal += decimalValue(row.average_percentage) * row.count;
      return;
    }

    sourceRollups.set(row.source_type, {
      source_type: row.source_type,
      source_label: row.source_label,
      source_name: row.source_name,
      source_teacher_id: row.source_teacher_id,
      source_teacher_name: row.source_teacher_name,
      weightedPercentageTotal: decimalValue(row.average_percentage) * row.count,
      attempted_questions: row.attempted_questions,
      skipped_questions: row.skipped_questions,
      count: row.count,
    });
  });

  const sourceBreakdown = Array.from(sourceRollups.values()).map((row) => ({
    source_type: row.source_type,
    source_label: row.source_label,
    source_name: row.source_name,
    source_teacher_id: row.source_teacher_id,
    source_teacher_name: row.source_teacher_name,
    average_percentage: (row.weightedPercentageTotal / Math.max(row.count, 1)).toFixed(2),
    attempted_questions: row.attempted_questions,
    skipped_questions: row.skipped_questions,
    count: row.count,
  })) as T["source_breakdown"];

  return {
    ...summary,
    recent_exams: summary.recent_exams.filter((exam) =>
      getExamSubjectNames(exam).some((subjectName) =>
        matchesSelectedSubject(subjectName, selectedSubject),
      ),
    ) as T["recent_exams"],
    source_breakdown: sourceBreakdown,
    source_subject_breakdown: scopedSourceSubjectBreakdown,
    strongest_subjects: strongestSubjects,
    weakest_subjects: weakestSubjects,
    weak_topics: weakTopics,
  };
}

export function filterStudentSummaryBySource<T extends {
  recent_exams: Array<{
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id?: string | null;
    source_teacher_name: string | null;
  }>;
  source_breakdown: Array<{
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id: string | null;
    source_teacher_name: string | null;
  }>;
  source_subject_breakdown: Array<{
    source_type: string;
    source_label: string;
    source_name: string;
    source_teacher_id: string | null;
    source_teacher_name: string | null;
  }>;
}>(summary: T, selectedSource: StudentSourceValue, selectedTeacherId?: string | null) {
  if (selectedSource === ALL_SOURCES_CONTEXT) {
    return summary;
  }

  return {
    ...summary,
    recent_exams: summary.recent_exams.filter((exam) =>
      matchesSelectedSource(exam, selectedSource, selectedTeacherId),
    ) as T["recent_exams"],
    source_breakdown: summary.source_breakdown.filter((row) =>
      matchesSelectedSource(row, selectedSource, selectedTeacherId),
    ) as T["source_breakdown"],
    source_subject_breakdown: summary.source_subject_breakdown.filter((row) =>
      matchesSelectedSource(row, selectedSource, selectedTeacherId),
    ) as T["source_subject_breakdown"],
  };
}

export function filterStudentExamsBySubject<
  T extends SubjectSummaryCarrier,
>(exams: T[], selectedSubject: string) {
  if (isOverallSubjectContext(selectedSubject)) {
    return exams;
  }

  return exams.filter((exam) =>
    getExamSubjectNames(exam).some((subjectName) =>
      matchesSelectedSubject(subjectName, selectedSubject),
    ),
  );
}

export function filterStudentRecordsBySource<
  T extends { source_type: string; source_teacher_id?: string | null },
>(records: T[], selectedSource: StudentSourceValue, selectedTeacherId?: string | null) {
  if (selectedSource === ALL_SOURCES_CONTEXT) {
    return records;
  }

  return records.filter((record) =>
    matchesSelectedSource(record, selectedSource, selectedTeacherId),
  );
}

export function getMetadataSubjectName(metadata: Record<string, unknown>) {
  const displayLabel = getMetadataSubjectDisplayLabel(metadata);
  return displayLabel === "Subject pending" ? "" : displayLabel;
}

export function getMetadataSubjectNames(metadata: Record<string, unknown>) {
  const names: string[] = [];
  const seen = new Set<string>();

  const subjectName = metadata.subject_name;
  appendUniqueSubjectName(names, seen, typeof subjectName === "string" ? subjectName : null);

  const primarySubjectName = metadata.primary_subject_name;
  appendUniqueSubjectName(
    names,
    seen,
    typeof primarySubjectName === "string" ? primarySubjectName : null,
  );

  const subjectSummary = metadata.subject_summary;
  if (subjectSummary && typeof subjectSummary === "object") {
    const displayLabel = (subjectSummary as { display_label?: unknown }).display_label;
    if (typeof displayLabel === "string" && displayLabel.includes("+")) {
      // Prefer concrete subject names over summary labels like "Physics + Chemistry".
    } else {
      appendUniqueSubjectName(
        names,
        seen,
        typeof displayLabel === "string" ? displayLabel : null,
      );
    }

    const subjects = (subjectSummary as { subjects?: unknown }).subjects;
    if (Array.isArray(subjects)) {
      subjects.forEach((subject) => {
        if (subject && typeof subject === "object") {
          appendUniqueSubjectName(
            names,
            seen,
            typeof (subject as { name?: unknown }).name === "string"
              ? ((subject as { name?: string }).name ?? null)
              : null,
          );
        }
      });
    }
  }

  const sectionSubjects = metadata.section_subjects;
  if (Array.isArray(sectionSubjects)) {
    sectionSubjects.forEach((subject) => {
      if (subject && typeof subject === "object") {
        appendUniqueSubjectName(
          names,
          seen,
          typeof (subject as { name?: unknown }).name === "string"
            ? ((subject as { name?: string }).name ?? null)
            : null,
        );
      }
    });
  }

  return names;
}

export function getMetadataSubjectDisplayLabel(metadata: Record<string, unknown>) {
  const subjectSummary = metadata.subject_summary;
  if (subjectSummary && typeof subjectSummary === "object") {
    const displayLabel = (subjectSummary as { display_label?: unknown }).display_label;
    if (typeof displayLabel === "string" && displayLabel.trim()) {
      return displayLabel.trim();
    }
  }

  return getMetadataSubjectNames(metadata)[0] ?? "Subject pending";
}

export function filterStudentRecordsByMetadataSubject<
  T extends { metadata: Record<string, unknown> },
>(records: T[], selectedSubject: string) {
  if (isOverallSubjectContext(selectedSubject)) {
    return records;
  }

  return records.filter((record) => {
    const subjectNames = getMetadataSubjectNames(record.metadata);
    return subjectNames.some((subjectName) =>
      matchesSelectedSubject(subjectName, selectedSubject),
    );
  });
}
