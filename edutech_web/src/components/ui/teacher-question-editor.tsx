"use client";

import { useMemo, useState } from "react";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import type {
  LookupProgram,
  LookupSubject,
  LookupTopic,
  TeacherQuestion,
  TeacherQuestionPassageSummary,
  TeacherQuestionOption,
  TeacherQuestionRubricCriterion,
  TeacherQuestionTypeDefinition,
} from "@/lib/api/teacher-builder";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { formatTopicOptionLabel, sortTopicOptions } from "@/lib/academics/topic-options";
import {
  questionTypeIsAssertionReason,
  questionTypeIsTrueFalse,
  questionTypeSupportsMultipleSelection,
  questionTypeSupportsOptions,
} from "@/lib/assessment/question-type";
import { buildQuestionTypePresentationProfile } from "@/lib/assessment/question-type-presentation";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";
import {
  getQuestionBankFieldError,
  getQuestionBankFieldErrorEntries,
  getQuestionBankFieldLabel,
  getQuestionBankGeneralErrors,
  type QuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

type EditableOption = {
  id?: string | null;
  option_text: string;
  option_order: number;
  is_correct: boolean;
  is_active: boolean;
};

type EditableRubricCriterion = {
  key: string;
  label: string;
  max_score: string;
  display_order: number;
  reviewer_hint: string;
};

const ASSERTION_REASON_DEFAULT_OPTIONS = [
  "Both Assertion and Reason are true, and Reason is the correct explanation of Assertion.",
  "Both Assertion and Reason are true, but Reason is not the correct explanation of Assertion.",
  "Assertion is true, but Reason is false.",
  "Assertion is false, but Reason is true.",
];

function getQuestionTypeDefinition(
  questionType: string,
  definitions: TeacherQuestionTypeDefinition[],
) {
  return definitions.find((definition) => definition.code === questionType) ?? null;
}

function defaultOptionsForType(definition: TeacherQuestionTypeDefinition | null) {
  if (questionTypeIsAssertionReason(definition)) {
    return ASSERTION_REASON_DEFAULT_OPTIONS.map((option_text, index) => ({
      option_text,
      option_order: index + 1,
      is_correct: index === 0,
      is_active: true,
    }));
  }

  if (questionTypeIsTrueFalse(definition)) {
    return [
      { option_text: "True", option_order: 1, is_correct: true, is_active: true },
      { option_text: "False", option_order: 2, is_correct: false, is_active: true },
    ];
  }

  if (!questionTypeSupportsOptions(definition)) {
    return [] as EditableOption[];
  }

  return [
    { option_text: "", option_order: 1, is_correct: true, is_active: true },
    { option_text: "", option_order: 2, is_correct: false, is_active: true },
    { option_text: "", option_order: 3, is_correct: false, is_active: true },
    { option_text: "", option_order: 4, is_correct: false, is_active: true },
  ];
}

function normalizeInitialOptions(
  definition: TeacherQuestionTypeDefinition | null,
  options: TeacherQuestionOption[] | undefined,
) {
  if (!options?.length) {
    return defaultOptionsForType(definition);
  }

  if (!questionTypeSupportsOptions(definition)) {
    return [] as EditableOption[];
  }

  return options
    .slice()
    .sort((a, b) => a.option_order - b.option_order)
    .map((option) => ({
      id: option.id,
      option_text: option.option_text,
      option_order: option.option_order,
      is_correct: option.is_correct,
      is_active: option.is_active,
    }));
}

function slugifyCriterionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function normalizeInitialRubricCriteria(criteria?: TeacherQuestionRubricCriterion[]) {
  if (!criteria?.length) {
    return [] as EditableRubricCriterion[];
  }

  return criteria
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((criterion, index) => ({
      key: criterion.key,
      label: criterion.label,
      max_score: String(criterion.max_score ?? ""),
      display_order: criterion.display_order ?? index + 1,
      reviewer_hint: criterion.reviewer_hint ?? "",
    }));
}

export function TeacherQuestionEditor({
  action,
  headerEyebrow = "Teacher workspace",
  contentScopeLabel = "teacher-scoped",
  contentFormatOptions,
  difficultyOptions,
  pageTitle,
  pageDescription,
  programs,
  questionTypeOptions,
  questionTypeDefinitions,
  passages = [],
  subjects,
  topics,
  initialQuestion,
  duplicateMode = false,
  pageClassName = "",
  validationErrors,
  validationMessage = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  headerEyebrow?: string;
  contentScopeLabel?: string;
  contentFormatOptions: CatalogSelectOption[];
  difficultyOptions: CatalogSelectOption[];
  pageTitle: string;
  pageDescription: string;
  programs: LookupProgram[];
  questionTypeOptions: CatalogSelectOption[];
  questionTypeDefinitions: TeacherQuestionTypeDefinition[];
  passages?: TeacherQuestionPassageSummary[];
  subjects: LookupSubject[];
  topics: LookupTopic[];
  initialQuestion?: TeacherQuestion | null;
  duplicateMode?: boolean;
  pageClassName?: string;
  validationErrors?: QuestionBankValidationErrors;
  validationMessage?: string;
}) {
  const initialQuestionType = initialQuestion?.question_type ?? questionTypeOptions[0]?.value ?? "";
  const initialContentFormat = initialQuestion?.content_format ?? contentFormatOptions[0]?.value ?? "";
  const initialQuestionTypeDefinition = getQuestionTypeDefinition(initialQuestionType, questionTypeDefinitions);
  const [questionType, setQuestionType] = useState(initialQuestionType);
  const [contentFormat, setContentFormat] = useState(initialContentFormat);
  const [programId, setProgramId] = useState(initialQuestion?.program ?? "");
  const [subjectId, setSubjectId] = useState(initialQuestion?.subject ?? "");
  const [topicId, setTopicId] = useState(initialQuestion?.topic ?? "");
  const [passageId, setPassageId] = useState(initialQuestion?.passage ?? "");
  const [defaultMarksValue, setDefaultMarksValue] = useState(initialQuestion?.default_marks ?? "1.00");
  const [options, setOptions] = useState<EditableOption[]>(
    normalizeInitialOptions(initialQuestionTypeDefinition, initialQuestion?.options),
  );
  const [rubricCriteria, setRubricCriteria] = useState<EditableRubricCriterion[]>(
    normalizeInitialRubricCriteria(initialQuestion?.rubric_criteria),
  );
  const questionTypeDefinition = getQuestionTypeDefinition(questionType, questionTypeDefinitions);
  const hasOptions = questionTypeSupportsOptions(questionTypeDefinition);
  const supportsMultipleSelection = questionTypeSupportsMultipleSelection(questionTypeDefinition);
  const isTrueFalse = questionTypeIsTrueFalse(questionTypeDefinition);
  const presentationProfile = buildQuestionTypePresentationProfile(questionTypeDefinition);
  const programError = getQuestionBankFieldError(validationErrors, "program");
  const subjectError = getQuestionBankFieldError(validationErrors, "subject");
  const topicError = getQuestionBankFieldError(validationErrors, "topic");
  const passageError = getQuestionBankFieldError(validationErrors, "passage");
  const passageOrderError = getQuestionBankFieldError(validationErrors, "passage_order");
  const questionTypeError = getQuestionBankFieldError(validationErrors, "question_type");
  const difficultyError = getQuestionBankFieldError(validationErrors, "difficulty_level");
  const contentFormatError = getQuestionBankFieldError(validationErrors, "content_format");
  const questionTextError = getQuestionBankFieldError(validationErrors, "question_text");
  const explanationError = getQuestionBankFieldError(validationErrors, "explanation");
  const acceptedAnswersError = getQuestionBankFieldError(validationErrors, "accepted_answers");
  const numericToleranceError = getQuestionBankFieldError(validationErrors, "numeric_tolerance");
  const reviewGuidanceError = getQuestionBankFieldError(validationErrors, "review_guidance");
  const rubricCriteriaError = getQuestionBankFieldError(validationErrors, "rubric_criteria");
  const assertionTextError = getQuestionBankFieldError(validationErrors, "assertion_text");
  const reasonTextError = getQuestionBankFieldError(validationErrors, "reason_text");
  const matrixLeftItemsError = getQuestionBankFieldError(validationErrors, "matrix_left_items");
  const matrixRightItemsError = getQuestionBankFieldError(validationErrors, "matrix_right_items");
  const defaultMarksError = getQuestionBankFieldError(validationErrors, "default_marks");
  const negativeMarksError = getQuestionBankFieldError(validationErrors, "negative_marks");
  const generalErrors = getQuestionBankGeneralErrors(validationErrors);
  const fieldErrorEntries = getQuestionBankFieldErrorEntries(validationErrors);

  const subjectOptions = useMemo(() => {
    if (!programId) {
      return [] as LookupSubject[];
    }

    return subjects.filter((subject) => subject.program === programId);
  }, [programId, subjects]);

  const selectedSubjectId =
    subjectId && subjectOptions.some((subject) => subject.id === subjectId)
      ? subjectId
      : "";

  const topicOptions = useMemo(() => {
    if (!selectedSubjectId) {
      return [] as LookupTopic[];
    }

    return sortTopicOptions(topics.filter((topic) => topic.subject === selectedSubjectId));
  }, [selectedSubjectId, topics]);

  const selectedTopicId =
    topicId && topicOptions.some((topic) => topic.id === topicId)
      ? topicId
      : "";

  const passageOptions = useMemo(() => {
    if (!selectedSubjectId) {
      return [] as TeacherQuestionPassageSummary[];
    }

    return passages.filter((passage) => {
      if (programId && passage.program && passage.program !== programId) {
        return false;
      }
      if (selectedSubjectId && passage.subject !== selectedSubjectId) {
        return false;
      }
      return true;
    });
  }, [passages, programId, selectedSubjectId]);

  const selectedPassageId =
    passageId && passageOptions.some((passage) => passage.id === passageId)
      ? passageId
      : "";

  function syncOptions(nextType: string) {
    setQuestionType(nextType);
    const nextDefinition = getQuestionTypeDefinition(nextType, questionTypeDefinitions);
    setOptions((current) => {
      if (!questionTypeSupportsOptions(nextDefinition)) {
        return [];
      }

      if (questionTypeIsTrueFalse(nextDefinition)) {
        const trueOption = current[0]?.option_text?.trim() ? current[0].option_text : "True";
        const falseOption = current[1]?.option_text?.trim() ? current[1].option_text : "False";
        return [
          { id: current[0]?.id, option_text: trueOption, option_order: 1, is_correct: true, is_active: true },
          { id: current[1]?.id, option_text: falseOption, option_order: 2, is_correct: false, is_active: true },
        ];
      }

      if (questionTypeIsAssertionReason(nextDefinition)) {
        return ASSERTION_REASON_DEFAULT_OPTIONS.map((option_text, index) => ({
          id: current[index]?.id,
          option_text,
          option_order: index + 1,
          is_correct: index === 0,
          is_active: true,
        }));
      }

      if (!current.length) {
        return defaultOptionsForType(nextDefinition);
      }

      return current.map((option, index) => ({
        ...option,
        option_order: index + 1,
      }));
    });
  }

  function updateOption(index: number, next: Partial<EditableOption>) {
    setOptions((current) =>
      current.map((option, optionIndex) => {
        if (optionIndex !== index) {
          if (
            next.is_correct === true &&
            questionTypeDefinition?.max_correct_options === 1 &&
            option.is_correct
          ) {
            return { ...option, is_correct: false };
          }
          return option;
        }

        return { ...option, ...next };
      }),
    );
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        option_text: "",
        option_order: current.length + 1,
        is_correct: false,
        is_active: true,
      },
    ]);
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          option_order: optionIndex + 1,
        })),
    );
  }

  function addRubricCriterion() {
    setRubricCriteria((current) => [
      ...current,
      {
        key: `criterion_${current.length + 1}`,
        label: "",
        max_score: "",
        display_order: current.length + 1,
        reviewer_hint: "",
      },
    ]);
  }

  function updateRubricCriterion(index: number, next: Partial<EditableRubricCriterion>) {
    setRubricCriteria((current) =>
      current.map((criterion, criterionIndex) => {
        if (criterionIndex !== index) {
          return criterion;
        }

        return { ...criterion, ...next };
      }),
    );
  }

  function removeRubricCriterion(index: number) {
    setRubricCriteria((current) =>
      current
        .filter((_, criterionIndex) => criterionIndex !== index)
        .map((criterion, criterionIndex) => ({
          ...criterion,
          display_order: criterionIndex + 1,
        })),
    );
  }

  const optionsPayload = JSON.stringify(
    !hasOptions
      ? []
      : options.map((option, index) => ({
          ...(option.id ? { id: option.id } : {}),
          content_format: contentFormat,
          option_text: option.option_text,
          option_order: index + 1,
          is_correct: option.is_correct,
          is_active: option.is_active,
        })),
  );

  const rubricCriteriaPayload = JSON.stringify(
    rubricCriteria.map((criterion, index) => ({
      key: criterion.key.trim(),
      label: criterion.label.trim(),
      max_score: criterion.max_score.trim(),
      display_order: index + 1,
      reviewer_hint: criterion.reviewer_hint.trim(),
      band_descriptors: [],
    })),
  );

  const rubricTotal = useMemo(
    () =>
      rubricCriteria
        .reduce((total, criterion) => total + (Number.parseFloat(criterion.max_score) || 0), 0)
        .toFixed(2),
    [rubricCriteria],
  );

  return (
    <div className={`studentPage studentPageTight studentDashboardModern ${pageClassName}`.trim()}>
      <StudentPageHeader
        eyebrow={headerEyebrow}
        title={pageTitle}
        description={pageDescription}
      />

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Question Authoring</span>
          <strong>Keep academic mapping, wording, scoring, and answer logic in one clean editor</strong>
          <p>
            Questions created here are meant for repeated reuse across exam builders, so the editor should help
            authors refine clarity, explanation quality, and answer structure before publishing that content downstream.
          </p>
          <small>
            {duplicateMode
              ? "Duplicating an existing question into a new reusable version"
              : `Creating or updating reusable ${contentScopeLabel} content`}
          </small>
        </div>
      </section>

      <section className="contentCard questionEditorShell">
        <form action={action} className="builderForm builderWorkspace">
          {initialQuestion && !duplicateMode ? (
            <input name="question_id" type="hidden" value={initialQuestion.id} />
          ) : null}
          {duplicateMode && initialQuestion ? (
            <input name="duplicate_from" type="hidden" value={initialQuestion.id} />
          ) : null}

          {validationMessage || generalErrors.length || fieldErrorEntries.length ? (
            <section className="builderSectionCard questionEditorValidationCard">
              <div className="builderSectionHeader">
                <div>
                  <strong>Review the highlighted details</strong>
                  <p>Fix the flagged fields below and submit again. Your draft values are still preserved in the editor.</p>
                </div>
              </div>

              {validationMessage ? (
                <p className="feedbackBanner feedbackBannerError">{validationMessage}</p>
              ) : null}

              {generalErrors.length ? (
                <div className="questionEditorValidationList">
                  {generalErrors.map((message, index) => (
                    <p className="setupFieldError" key={`general-${index}`}>{message}</p>
                  ))}
                </div>
              ) : null}

              {fieldErrorEntries.length ? (
                <div className="questionEditorValidationList">
                  {fieldErrorEntries.map(([field, messages]) => (
                    <p className="setupFieldError" key={field}>
                      <strong>{getQuestionBankFieldLabel(field)}:</strong> {messages[0]}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Question identity</strong>
                <p>Anchor the question to the right academic lane before refining content, difficulty, and answer structure.</p>
              </div>
            </div>

            <div className="builderGrid">
              <label className="fieldStack">
                <span>Program</span>
                <select
                  aria-invalid={Boolean(programError)}
                  className={programError ? "setupFieldInvalid" : undefined}
                  name="program"
                  onChange={(event) => {
                    setProgramId(event.target.value);
                    setSubjectId("");
                    setTopicId("");
                    setPassageId("");
                  }}
                  required
                  value={programId}
                >
                  <option value="">Select program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <small>Select the program first. Subjects and topics are validated inside that academic lane.</small>
                {programError ? <small className="setupFieldError">{programError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Subject</span>
                <select
                  aria-invalid={Boolean(subjectError)}
                  className={subjectError ? "setupFieldInvalid" : undefined}
                  disabled={!programId}
                  name="subject"
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setTopicId("");
                    setPassageId("");
                  }}
                  required
                  value={selectedSubjectId}
                >
                  <option value="">{programId ? "Select subject" : "Select program first"}</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <small>
                  {programId
                    ? "Only subjects mapped to the selected program are shown."
                    : "Program selection unlocks the correct subject list."}
                </small>
                {subjectError ? <small className="setupFieldError">{subjectError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Topic</span>
                <select
                  aria-invalid={Boolean(topicError)}
                  className={topicError ? "setupFieldInvalid" : undefined}
                  disabled={!selectedSubjectId}
                  name="topic"
                  onChange={(event) => setTopicId(event.target.value)}
                  value={selectedTopicId}
                >
                  <option value="">{selectedSubjectId ? "No topic" : "Select subject first"}</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {formatTopicOptionLabel(topic)}
                    </option>
                  ))}
                </select>
                <small>
                  {selectedSubjectId
                    ? "Topics are filtered to the selected subject."
                    : "Choose a subject before narrowing the question into a topic."}
                </small>
                {topicError ? <small className="setupFieldError">{topicError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Comprehension set</span>
                <select
                  aria-invalid={Boolean(passageError)}
                  className={passageError ? "setupFieldInvalid" : undefined}
                  disabled={!selectedSubjectId}
                  name="passage"
                  onChange={(event) => setPassageId(event.target.value)}
                  value={selectedPassageId}
                >
                  <option value="">{selectedSubjectId ? "Standalone question" : "Select subject first"}</option>
                  {passageOptions.map((passage) => (
                    <option key={passage.id} value={passage.id}>
                      {passage.title}
                    </option>
                  ))}
                </select>
                <small>
                  {selectedSubjectId
                    ? "Only comprehension sets from the same academic lane are available."
                    : "Linked passages appear after subject selection so comprehension mapping stays clean."}
                </small>
                {passageError ? <small className="setupFieldError">{passageError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Comprehension order</span>
                <input
                  aria-invalid={Boolean(passageOrderError)}
                  className={passageOrderError ? "setupFieldInvalid" : undefined}
                  defaultValue={initialQuestion?.passage_order ?? ""}
                  disabled={!selectedPassageId}
                  min="1"
                  name="passage_order"
                  placeholder={selectedPassageId ? "1" : "Select a comprehension set first"}
                  step="1"
                  type="number"
                />
                {passageOrderError ? <small className="setupFieldError">{passageOrderError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Question type</span>
                <select
                  aria-invalid={Boolean(questionTypeError)}
                  className={questionTypeError ? "setupFieldInvalid" : undefined}
                  defaultValue={initialQuestionType}
                  name="question_type"
                  onChange={(event) => syncOptions(event.target.value)}
                >
                  {questionTypeOptions.map((option) => (
                    <option key={option.value || "blank"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {questionTypeError ? <small className="setupFieldError">{questionTypeError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Difficulty</span>
                <select
                  aria-invalid={Boolean(difficultyError)}
                  className={difficultyError ? "setupFieldInvalid" : undefined}
                  defaultValue={initialQuestion?.difficulty_level ?? difficultyOptions[0]?.value ?? ""}
                  name="difficulty_level"
                >
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {difficultyError ? <small className="setupFieldError">{difficultyError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Content format</span>
                <select
                  aria-invalid={Boolean(contentFormatError)}
                  className={contentFormatError ? "setupFieldInvalid" : undefined}
                  defaultValue={initialContentFormat}
                  name="content_format"
                  onChange={(event) => setContentFormat(event.target.value)}
                >
                  {contentFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {contentFormatError ? <small className="setupFieldError">{contentFormatError}</small> : null}
              </label>
            </div>
          </section>

          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Content and scoring</strong>
                <p>Write the question prompt, add the teacher explanation, and control the scoring defaults for downstream exam reuse.</p>
              </div>
            </div>

            <label className="fieldStack fieldStackFull">
              <span>{presentationProfile.questionTextLabel}</span>
              {presentationProfile.questionTextHidden ? (
                <>
                  <input name="question_text" type="hidden" value={initialQuestion?.question_text ?? ""} />
                  {presentationProfile.questionTextHelper ? <small>{presentationProfile.questionTextHelper}</small> : null}
                </>
              ) : (
                <>
                  <textarea
                    aria-invalid={Boolean(questionTextError)}
                    className={questionTextError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.question_text ?? ""}
                    name="question_text"
                    placeholder={presentationProfile.questionTextPlaceholder}
                    required
                    rows={presentationProfile.questionTextRows}
                  />
                  {questionTextError ? <small className="setupFieldError">{questionTextError}</small> : null}
                </>
              )}
            </label>

            {presentationProfile.showsAssertionReasonFields ? (
              <div className="builderGrid compact">
                <label className="fieldStack fieldStackFull">
                  <span>Assertion</span>
                  <textarea
                    aria-invalid={Boolean(assertionTextError)}
                    className={assertionTextError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.assertion_text ?? ""}
                    name="assertion_text"
                    placeholder="Write the assertion statement"
                    required
                    rows={4}
                  />
                  <small>State the assertion exactly as the learner should evaluate it.</small>
                  {assertionTextError ? <small className="setupFieldError">{assertionTextError}</small> : null}
                </label>

                <label className="fieldStack fieldStackFull">
                  <span>Reason</span>
                  <textarea
                    aria-invalid={Boolean(reasonTextError)}
                    className={reasonTextError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.reason_text ?? ""}
                    name="reason_text"
                    placeholder="Write the reason statement"
                    required
                    rows={4}
                  />
                  <small>State the reason separately so the student page can render both blocks clearly.</small>
                  {reasonTextError ? <small className="setupFieldError">{reasonTextError}</small> : null}
                </label>
              </div>
            ) : null}

            {presentationProfile.showsMatrixMatchFields ? (
              <div className="builderGrid compact">
                <label className="fieldStack fieldStackFull">
                  <span>Left column items</span>
                  <textarea
                    aria-invalid={Boolean(matrixLeftItemsError)}
                    className={matrixLeftItemsError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.matrix_left_items?.join("\n") ?? ""}
                    name="matrix_left_items"
                    placeholder={"One item per line\nExample:\nS3\nEC2\nRDS"}
                    required
                    rows={5}
                  />
                  <small>Add the first column items in order, one per line.</small>
                  {matrixLeftItemsError ? <small className="setupFieldError">{matrixLeftItemsError}</small> : null}
                </label>

                <label className="fieldStack fieldStackFull">
                  <span>Right column items</span>
                  <textarea
                    aria-invalid={Boolean(matrixRightItemsError)}
                    className={matrixRightItemsError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.matrix_right_items?.join("\n") ?? ""}
                    name="matrix_right_items"
                    placeholder={"One item per line\nExample:\nObject storage\nVirtual machine\nManaged database"}
                    required
                    rows={5}
                  />
                  <small>Add the second column items in order, one per line.</small>
                  {matrixRightItemsError ? <small className="setupFieldError">{matrixRightItemsError}</small> : null}
                </label>
              </div>
            ) : null}

            <label className="fieldStack fieldStackFull">
              <span>Explanation</span>
              <textarea
                aria-invalid={Boolean(explanationError)}
                className={explanationError ? "setupFieldInvalid" : undefined}
                defaultValue={initialQuestion?.explanation ?? ""}
                name="explanation"
                placeholder="Explain the correct answer and how the learner should think through it"
                rows={6}
              />
              {explanationError ? <small className="setupFieldError">{explanationError}</small> : null}
            </label>

            <div className="builderGrid compact">
              <label className="fieldStack">
                <span>Default marks</span>
                <input
                  aria-invalid={Boolean(defaultMarksError)}
                  className={defaultMarksError ? "setupFieldInvalid" : undefined}
                  min="0"
                  name="default_marks"
                  onChange={(event) => setDefaultMarksValue(event.target.value)}
                  step="0.01"
                  type="number"
                  value={defaultMarksValue}
                />
                {defaultMarksError ? <small className="setupFieldError">{defaultMarksError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Negative marks</span>
                <input
                  aria-invalid={Boolean(negativeMarksError)}
                  className={negativeMarksError ? "setupFieldInvalid" : undefined}
                  defaultValue={initialQuestion?.negative_marks ?? "0.00"}
                  min="0"
                  name="negative_marks"
                  step="0.01"
                  type="number"
                />
                {negativeMarksError ? <small className="setupFieldError">{negativeMarksError}</small> : null}
              </label>
            </div>

            <div className="toggleGrid">
              <label><input defaultChecked={initialQuestion?.is_active ?? true} name="is_active" type="checkbox" /> Active</label>
              <label><input defaultChecked={initialQuestion?.is_verified ?? false} name="is_verified" type="checkbox" /> Verified / published</label>
              <label><input defaultChecked={initialQuestion?.metadata?.is_draft === true} name="is_draft" type="checkbox" /> Save as draft</label>
            </div>

            {selectedPassageId ? (
              <div className="builderEmptyState">
                <strong>Linked to a comprehension set</strong>
                <p>This question will inherit the shared reading context from the selected passage while keeping its own answer logic, marks, and explanation.</p>
              </div>
            ) : null}

            {questionTypeDefinition ? (
              <div className="builderEmptyState">
                <strong>{questionTypeDefinition.label}</strong>
                <p>{questionTypeDefinition.description}</p>
                <small>
                  Answer mode: {questionTypeDefinition.answer_mode.replaceAll("_", " ")}. Evaluation:{" "}
                  {questionTypeDefinition.evaluation_mode.replaceAll("_", " ")}.
                </small>
              </div>
            ) : null}
          </section>

          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Answer structure</strong>
                <p>
                  Define answer options for objective questions, or configure accepted answers for text and numeric responses.
                </p>
              </div>
            </div>

            <input name="options_payload" type="hidden" value={optionsPayload} />
            <input name="rubric_criteria_json" type="hidden" value={rubricCriteriaPayload} />

            {!hasOptions ? (
              <div className="builderEmptyState">
                <strong>No options required</strong>
                <p>
                  This question type captures a direct response instead of fixed answer options. Save the prompt and explanation only.
                </p>
              </div>
            ) : (
              <div className="questionEditorOptionList">
                {options.map((option, index) => (
                  <div className="questionEditorOptionRow" key={option.id ?? `option-${index}`}>
                    <label className="questionEditorOptionCorrect">
                      <input
                        checked={option.is_correct}
                        onChange={(event) => updateOption(index, { is_correct: event.target.checked })}
                        type={supportsMultipleSelection ? "checkbox" : "radio"}
                        name={supportsMultipleSelection ? `option-correct-${index}` : "single-correct-option"}
                      />
                      Correct
                    </label>

                    <label className="fieldStack fieldStackFull">
                      <span>Option {index + 1}</span>
                      <textarea
                        disabled={presentationProfile.optionsAreLocked}
                        onChange={(event) => updateOption(index, { option_text: event.target.value })}
                        rows={2}
                        value={option.option_text}
                      />
                    </label>

                    {presentationProfile.allowsRemoveOption && options.length > 2 ? (
                      <button
                        className="button buttonGhost"
                        onClick={() => removeOption(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}

                {presentationProfile.allowsAddOption ? (
                  <button className="button buttonSecondary" onClick={addOption} type="button">
                    Add Option
                  </button>
                ) : null}

                {presentationProfile.optionsHint ? <small className="fieldHint">{presentationProfile.optionsHint}</small> : null}
              </div>
            )}

            {presentationProfile.supportsAcceptedAnswers ? (
              <div className="builderGrid compact">
                <label className="fieldStack fieldStackFull">
                  <span>{presentationProfile.acceptedAnswersLabel}</span>
                  <textarea
                    aria-invalid={Boolean(acceptedAnswersError)}
                    className={acceptedAnswersError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.accepted_answers?.join("\n") ?? ""}
                    name="accepted_answers"
                    placeholder={presentationProfile.acceptedAnswersPlaceholder}
                    required
                    rows={4}
                  />
                  {presentationProfile.acceptedAnswersHelper ? <small>{presentationProfile.acceptedAnswersHelper}</small> : null}
                  {acceptedAnswersError ? <small className="setupFieldError">{acceptedAnswersError}</small> : null}
                </label>

                {presentationProfile.supportsNumericTolerance ? (
                  <label className="fieldStack">
                    <span>Numeric tolerance</span>
                    <input
                      aria-invalid={Boolean(numericToleranceError)}
                      className={numericToleranceError ? "setupFieldInvalid" : undefined}
                      defaultValue={initialQuestion?.numeric_tolerance ?? ""}
                      name="numeric_tolerance"
                      placeholder="Optional, for example 0.01"
                      step="0.0001"
                      type="number"
                    />
                    <small>Leave blank for exact numeric match only.</small>
                    {numericToleranceError ? <small className="setupFieldError">{numericToleranceError}</small> : null}
                  </label>
                ) : null}
              </div>
            ) : null}

            {presentationProfile.supportsReviewGuidance ? (
              <div className="builderGrid compact">
                <label className="fieldStack fieldStackFull">
                  <span>{presentationProfile.reviewGuidanceLabel}</span>
                  <textarea
                    aria-invalid={Boolean(reviewGuidanceError)}
                    className={reviewGuidanceError ? "setupFieldInvalid" : undefined}
                    defaultValue={initialQuestion?.review_guidance ?? ""}
                    name="review_guidance"
                    placeholder={presentationProfile.reviewGuidancePlaceholder}
                    rows={4}
                  />
                  {presentationProfile.reviewGuidanceHelper ? <small>{presentationProfile.reviewGuidanceHelper}</small> : null}
                  {reviewGuidanceError ? <small className="setupFieldError">{reviewGuidanceError}</small> : null}
                </label>

                {presentationProfile.showsRubricCriteria ? (
                  <div className="fieldStack fieldStackFull">
                    <span>Rubric criteria</span>
                    <div className="teacherRubricAuthoringSummary">
                      <span>Total rubric marks: {rubricTotal}</span>
                      <small>
                        Keep the rubric total aligned with the question marks so evaluators score each response consistently.
                        Question marks: {defaultMarksValue || "0.00"}
                      </small>
                    </div>

                    {rubricCriteria.length ? (
                      <div className="teacherRubricAuthoringList">
                        {rubricCriteria.map((criterion, index) => (
                          <div className="teacherRubricAuthoringCard" key={`${criterion.key || "criterion"}-${index}`}>
                            <div className="builderGrid compact">
                              <label className="fieldStack">
                                <span>Criterion label</span>
                                <input
                                  onChange={(event) => {
                                    const nextLabel = event.target.value;
                                    updateRubricCriterion(index, {
                                      label: nextLabel,
                                      key:
                                        criterion.key.trim().length > 0 &&
                                        criterion.key !== `criterion_${index + 1}`
                                          ? criterion.key
                                          : slugifyCriterionKey(nextLabel),
                                    });
                                  }}
                                  placeholder="Example: Content accuracy"
                                  value={criterion.label}
                                />
                              </label>

                              <label className="fieldStack">
                                <span>Criterion key</span>
                                <input
                                  onChange={(event) =>
                                    updateRubricCriterion(index, {
                                      key: slugifyCriterionKey(event.target.value),
                                    })
                                  }
                                  placeholder="content_accuracy"
                                  value={criterion.key}
                                />
                                <small>Internal rubric key used for review data and analytics.</small>
                              </label>

                              <label className="fieldStack">
                                <span>Max score</span>
                                <input
                                  min="0"
                                  onChange={(event) =>
                                    updateRubricCriterion(index, { max_score: event.target.value })
                                  }
                                  placeholder="0.00"
                                  step="0.01"
                                  type="number"
                                  value={criterion.max_score}
                                />
                              </label>
                            </div>

                            <label className="fieldStack fieldStackFull">
                              <span>Reviewer hint</span>
                              <textarea
                                onChange={(event) =>
                                  updateRubricCriterion(index, { reviewer_hint: event.target.value })
                                }
                                placeholder="Tell reviewers what strong, partial, and weak responses should include."
                                rows={3}
                                value={criterion.reviewer_hint}
                              />
                            </label>

                            <button
                              className="button buttonGhost"
                              onClick={() => removeRubricCriterion(index)}
                              type="button"
                            >
                              Remove Criterion
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="builderEmptyState">
                        <strong>No rubric criteria yet</strong>
                        <p>
                          Add criterion-level scoring so essay/manual review becomes consistent for teachers,
                          moderators, and future analytics.
                        </p>
                      </div>
                    )}

                    <button className="button buttonSecondary" onClick={addRubricCriterion} type="button">
                      Add Rubric Criterion
                    </button>
                    <small>
                      Add 2 to 6 criteria for the cleanest reviewer experience. Each criterion becomes a separate score card
                      on teacher and institute review screens.
                    </small>
                    {rubricCriteriaError ? <small className="setupFieldError">{rubricCriteriaError}</small> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="builderSaveBar">
            <div>
              <strong>{initialQuestion && !duplicateMode ? "Update the question cleanly" : "Create the question cleanly"}</strong>
              <span>Keep explanations, correct options, and topic mapping accurate so the question bank stays reusable across exams and analytics.</span>
            </div>
            <ActionSubmitButton
              className="button buttonPrimary"
              idleLabel={initialQuestion && !duplicateMode ? "Save Question" : duplicateMode ? "Create Duplicate" : "Create Question"}
              pendingLabel={initialQuestion && !duplicateMode ? "Saving..." : "Creating..."}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
