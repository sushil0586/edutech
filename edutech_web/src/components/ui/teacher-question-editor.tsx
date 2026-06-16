"use client";

import { useMemo, useState } from "react";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import type {
  LookupProgram,
  LookupSubject,
  LookupTopic,
  TeacherQuestion,
  TeacherQuestionOption,
} from "@/lib/api/teacher-builder";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";

type EditableOption = {
  id?: string | null;
  option_text: string;
  option_order: number;
  is_correct: boolean;
  is_active: boolean;
};

function defaultOptionsForType(questionType: string) {
  if (questionType === "true_false") {
    return [
      { option_text: "True", option_order: 1, is_correct: true, is_active: true },
      { option_text: "False", option_order: 2, is_correct: false, is_active: true },
    ];
  }

  if (questionType === "short_answer") {
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
  questionType: string,
  options: TeacherQuestionOption[] | undefined,
) {
  if (!options?.length) {
    return defaultOptionsForType(questionType);
  }

  if (questionType === "short_answer") {
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
  subjects,
  topics,
  initialQuestion,
  duplicateMode = false,
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
  subjects: LookupSubject[];
  topics: LookupTopic[];
  initialQuestion?: TeacherQuestion | null;
  duplicateMode?: boolean;
}) {
  const initialQuestionType = initialQuestion?.question_type ?? questionTypeOptions[0]?.value ?? "";
  const initialContentFormat = initialQuestion?.content_format ?? contentFormatOptions[0]?.value ?? "";
  const [questionType, setQuestionType] = useState(initialQuestionType);
  const [contentFormat, setContentFormat] = useState(initialContentFormat);
  const [programId, setProgramId] = useState(initialQuestion?.program ?? "");
  const [subjectId, setSubjectId] = useState(initialQuestion?.subject ?? "");
  const [topicId, setTopicId] = useState(initialQuestion?.topic ?? "");
  const [options, setOptions] = useState<EditableOption[]>(
    normalizeInitialOptions(initialQuestionType, initialQuestion?.options),
  );

  const subjectOptions = useMemo(() => {
    if (!programId) {
      return subjects;
    }

    return subjects.filter((subject) => subject.program === programId);
  }, [programId, subjects]);

  const selectedSubjectId =
    subjectId && subjectOptions.some((subject) => subject.id === subjectId)
      ? subjectId
      : "";

  const topicOptions = useMemo(() => {
    if (!selectedSubjectId) {
      return topics;
    }

    return topics.filter((topic) => topic.subject === selectedSubjectId);
  }, [selectedSubjectId, topics]);

  const selectedTopicId =
    topicId && topicOptions.some((topic) => topic.id === topicId)
      ? topicId
      : "";

  function syncOptions(nextType: string) {
    setQuestionType(nextType);
    setOptions((current) => {
      if (nextType === "short_answer") {
        return [];
      }

      if (nextType === "true_false") {
        const trueOption = current[0]?.option_text?.trim() ? current[0].option_text : "True";
        const falseOption = current[1]?.option_text?.trim() ? current[1].option_text : "False";
        return [
          { id: current[0]?.id, option_text: trueOption, option_order: 1, is_correct: true, is_active: true },
          { id: current[1]?.id, option_text: falseOption, option_order: 2, is_correct: false, is_active: true },
        ];
      }

      if (!current.length) {
        return defaultOptionsForType(nextType);
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
            questionType === "mcq_single" &&
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

  const optionsPayload = JSON.stringify(
    questionType === "short_answer"
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

  return (
    <div className="studentPage studentPageTight studentDashboardModern">
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
                  name="program"
                  onChange={(event) => setProgramId(event.target.value)}
                  value={programId}
                >
                  <option value="">No program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Subject</span>
                <select
                  name="subject"
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setTopicId("");
                  }}
                  required
                  value={selectedSubjectId}
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Topic</span>
                <select
                  name="topic"
                  onChange={(event) => setTopicId(event.target.value)}
                  value={selectedTopicId}
                >
                  <option value="">No topic</option>
                  {topicOptions.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Question type</span>
                <select
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
              </label>

              <label className="fieldStack">
                <span>Difficulty</span>
                <select
                  defaultValue={initialQuestion?.difficulty_level ?? difficultyOptions[0]?.value ?? ""}
                  name="difficulty_level"
                >
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Content format</span>
                <select
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
              <span>Question text</span>
              <textarea
                defaultValue={initialQuestion?.question_text ?? ""}
                name="question_text"
                placeholder="Write the question prompt"
                required
                rows={5}
              />
            </label>

            <label className="fieldStack fieldStackFull">
              <span>Explanation</span>
              <textarea
                defaultValue={initialQuestion?.explanation ?? ""}
                name="explanation"
                placeholder="Explain the correct answer and how the learner should think through it"
                rows={6}
              />
            </label>

            <div className="builderGrid compact">
              <label className="fieldStack">
                <span>Default marks</span>
                <input
                  defaultValue={initialQuestion?.default_marks ?? "1.00"}
                  min="0"
                  name="default_marks"
                  step="0.01"
                  type="number"
                />
              </label>

              <label className="fieldStack">
                <span>Negative marks</span>
                <input
                  defaultValue={initialQuestion?.negative_marks ?? "0.00"}
                  min="0"
                  name="negative_marks"
                  step="0.01"
                  type="number"
                />
              </label>
            </div>

            <div className="toggleGrid">
              <label><input defaultChecked={initialQuestion?.is_active ?? true} name="is_active" type="checkbox" /> Active</label>
              <label><input defaultChecked={initialQuestion?.is_verified ?? false} name="is_verified" type="checkbox" /> Verified / published</label>
              <label><input defaultChecked={initialQuestion?.metadata?.is_draft === true} name="is_draft" type="checkbox" /> Save as draft</label>
            </div>
          </section>

          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Answer structure</strong>
                <p>Define the answer options and mark the correct choices. Short-answer questions skip this block automatically.</p>
              </div>
            </div>

            <input name="options_payload" type="hidden" value={optionsPayload} />

            {questionType === "short_answer" ? (
              <div className="builderEmptyState">
                <strong>No options required</strong>
                <p>Short-answer questions do not need fixed answer options. Save the prompt and explanation only.</p>
              </div>
            ) : (
              <div className="questionEditorOptionList">
                {options.map((option, index) => (
                  <div className="questionEditorOptionRow" key={option.id ?? `option-${index}`}>
                    <label className="questionEditorOptionCorrect">
                      <input
                        checked={option.is_correct}
                        onChange={(event) => updateOption(index, { is_correct: event.target.checked })}
                        type={questionType === "mcq_multiple" ? "checkbox" : "radio"}
                        name={questionType === "mcq_multiple" ? `option-correct-${index}` : "single-correct-option"}
                      />
                      Correct
                    </label>

                    <label className="fieldStack fieldStackFull">
                      <span>Option {index + 1}</span>
                      <textarea
                        onChange={(event) => updateOption(index, { option_text: event.target.value })}
                        rows={2}
                        value={option.option_text}
                      />
                    </label>

                    {questionType !== "true_false" && options.length > 2 ? (
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

                {questionType !== "true_false" ? (
                  <button className="button buttonSecondary" onClick={addOption} type="button">
                    Add Option
                  </button>
                ) : null}
              </div>
            )}
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
