type QuestionOptionPayload = {
  id?: string;
  content_format: string;
  option_text: string;
  option_order: number;
  is_correct: boolean;
  is_active: boolean;
};

function readCheckbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readNullableString(formData: FormData, name: string) {
  const value = readString(formData, name);
  return value || null;
}

function readNumberString(formData: FormData, name: string, fallback: string) {
  const value = readString(formData, name);
  return value || fallback;
}

function parseOptionsPayload(formData: FormData) {
  const raw = readString(formData, "options_payload");
  const questionContentFormat = readString(formData, "content_format");
  if (!raw) {
    return [] as QuestionOptionPayload[];
  }

  try {
    const parsed = JSON.parse(raw) as QuestionOptionPayload[];
    return parsed.map((option, index) => ({
      ...(option.id ? { id: option.id } : {}),
      content_format: option.content_format || questionContentFormat,
      option_text: String(option.option_text ?? ""),
      option_order: index + 1,
      is_correct: Boolean(option.is_correct),
      is_active: option.is_active ?? true,
    }));
  } catch {
    return [];
  }
}

export function buildTeacherQuestionPayload(
  formData: FormData,
  context: {
    institute: string;
    teacherProfile: string | null;
  },
) {
  return {
    institute: context.institute,
    program: readNullableString(formData, "program"),
    subject: readString(formData, "subject"),
    topic: readNullableString(formData, "topic"),
    created_by_teacher: context.teacherProfile,
    question_type: readString(formData, "question_type"),
    difficulty_level: readString(formData, "difficulty_level"),
    content_format: readString(formData, "content_format"),
    question_text: readString(formData, "question_text"),
    explanation: readString(formData, "explanation"),
    default_marks: readNumberString(formData, "default_marks", "1.00"),
    negative_marks: readNumberString(formData, "negative_marks", "0.00"),
    is_active: readCheckbox(formData, "is_active"),
    is_verified: readCheckbox(formData, "is_verified"),
    metadata: {
      is_draft: readCheckbox(formData, "is_draft"),
    },
    options: parseOptionsPayload(formData),
  };
}
