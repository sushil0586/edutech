import type {
  AssessmentQuestionTypeDefinition,
  AssessmentEvaluationModeDefinition,
  AssessmentResponseModeDefinition,
} from "@/features/dashboard/types";
import type { TeacherQuestionTypeDefinition } from "@/lib/api/teacher-builder";

type QuestionTypeCapabilities = {
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
};

type SharedQuestionTypeDefinition = {
  code: string;
  label: string;
  response_mode: string;
  answer_mode: string;
  evaluation_mode: string;
  option_source: string;
  authoring_variant: string;
  supports_attachments?: boolean;
  allowed_attachment_types?: string[];
  recommended_attachment_types?: string[];
  allowed_response_artifact_types?: string[];
  media_delivery_mode?: string;
  media_preload_strategy?: string;
  response_mode_definition?: AssessmentResponseModeDefinition | null;
  evaluation_mode_definition?: AssessmentEvaluationModeDefinition | null;
  capabilities?: QuestionTypeCapabilities | null;
};

export type AppQuestionTypeDefinition =
  | AssessmentQuestionTypeDefinition
  | TeacherQuestionTypeDefinition
  | SharedQuestionTypeDefinition
  | null
  | undefined;

export function questionTypeLabel(
  value: string,
  definition?: AppQuestionTypeDefinition,
) {
  if (definition?.label?.trim()) {
    return definition.label;
  }

  switch (value) {
    case "mcq_single":
      return "Single choice";
    case "mcq_multiple":
      return "Multiple choice";
    case "true_false":
      return "True / False";
    case "assertion_reason":
      return "Assertion / Reason";
    case "matrix_match":
      return "Matrix Match";
    case "short_answer":
      return "Short answer";
    case "fill_in_blanks":
      return "Fill in the blanks";
    case "numeric_answer":
      return "Numeric answer";
    case "essay_manual_review":
      return "Essay";
    default:
      return value.replaceAll("_", " ");
  }
}

export function questionTypeSupportsOptions(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_options === "boolean") {
    return definition.capabilities.supports_options;
  }
  return definition.option_source !== "none";
}

export function questionTypeSupportsMultipleSelection(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_multiple_selection === "boolean") {
    return definition.capabilities.supports_multiple_selection;
  }
  return definition.response_mode === "multi_choice" || definition.answer_mode === "multi_choice";
}

export function questionTypeSupportsTextAnswer(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_text_answer === "boolean") {
    return definition.capabilities.supports_text_answer;
  }
  return definition.response_mode === "text" || definition.response_mode === "numeric";
}

export function questionTypeIsNumericResponse(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.is_numeric_response === "boolean") {
    return definition.capabilities.is_numeric_response;
  }
  return definition.response_mode === "numeric";
}

export function questionTypeSupportsAcceptedAnswers(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_accepted_answers === "boolean") {
    return definition.capabilities.supports_accepted_answers;
  }
  return questionTypeSupportsTextAnswer(definition) && !questionTypeRequiresManualReview(definition);
}

export function questionTypeSupportsNumericTolerance(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_numeric_tolerance === "boolean") {
    return definition.capabilities.supports_numeric_tolerance;
  }
  return questionTypeIsNumericResponse(definition);
}

export function questionTypeSupportsReviewGuidance(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_review_guidance === "boolean") {
    return definition.capabilities.supports_review_guidance;
  }
  return questionTypeRequiresManualReview(definition);
}

export function questionTypeRequiresManualReview(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.requires_manual_review === "boolean") {
    return definition.capabilities.requires_manual_review;
  }
  if (definition.evaluation_mode_definition) {
    return definition.evaluation_mode_definition.requires_manual_review;
  }
  return definition.evaluation_mode === "manual_rubric_review";
}

export function questionTypeSupportsAttachments(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_attachments === "boolean") {
    return definition.capabilities.supports_attachments;
  }
  if (typeof definition.supports_attachments === "boolean") {
    return definition.supports_attachments;
  }
  return Array.isArray(definition.allowed_attachment_types) && definition.allowed_attachment_types.length > 0;
}

function questionTypeSupportsAttachmentKind(
  definition: AppQuestionTypeDefinition,
  capabilityKey:
    | "supports_image_attachments"
    | "supports_diagram_attachments"
    | "supports_pdf_attachments"
    | "supports_audio_attachments"
    | "supports_video_attachments",
  attachmentType: string,
) {
  if (!definition) {
    return false;
  }
  const capabilityValue = definition.capabilities?.[capabilityKey];
  if (typeof capabilityValue === "boolean") {
    return capabilityValue;
  }
  return Array.isArray(definition.allowed_attachment_types)
    ? definition.allowed_attachment_types.includes(attachmentType)
    : false;
}

export function questionTypeSupportsImageAttachments(definition: AppQuestionTypeDefinition) {
  return questionTypeSupportsAttachmentKind(definition, "supports_image_attachments", "image");
}

export function questionTypeSupportsDiagramAttachments(definition: AppQuestionTypeDefinition) {
  return questionTypeSupportsAttachmentKind(definition, "supports_diagram_attachments", "diagram");
}

export function questionTypeSupportsPdfAttachments(definition: AppQuestionTypeDefinition) {
  return questionTypeSupportsAttachmentKind(definition, "supports_pdf_attachments", "pdf");
}

export function questionTypeSupportsAudioAttachments(definition: AppQuestionTypeDefinition) {
  return questionTypeSupportsAttachmentKind(definition, "supports_audio_attachments", "audio");
}

export function questionTypeSupportsVideoAttachments(definition: AppQuestionTypeDefinition) {
  return questionTypeSupportsAttachmentKind(definition, "supports_video_attachments", "video");
}

export function questionTypeAllowedResponseArtifactKinds(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return [] as string[];
  }
  const capabilityValue = definition.capabilities?.allowed_response_artifact_types;
  if (Array.isArray(capabilityValue)) {
    return capabilityValue;
  }
  return Array.isArray(definition.allowed_response_artifact_types)
    ? definition.allowed_response_artifact_types
    : [];
}

export function questionTypeSupportsResponseArtifacts(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  if (typeof definition.capabilities?.supports_response_artifacts === "boolean") {
    return definition.capabilities.supports_response_artifacts;
  }
  return questionTypeAllowedResponseArtifactKinds(definition).length > 0;
}

export function questionTypeIsTrueFalse(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  return definition.authoring_variant === "true_false";
}

export function questionTypeIsFillInBlanks(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  return definition.authoring_variant === "fill_in_blanks";
}

export function questionTypeIsAssertionReason(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  return definition.authoring_variant === "assertion_reason";
}

export function questionTypeIsMatrixMatch(definition: AppQuestionTypeDefinition) {
  if (!definition) {
    return false;
  }
  return definition.authoring_variant === "matrix_match";
}
