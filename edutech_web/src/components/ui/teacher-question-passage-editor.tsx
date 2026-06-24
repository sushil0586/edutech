"use client";

import { useMemo, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { HtmlRichTextEditor } from "@/components/ui/html-rich-text-editor";
import { RichTextTextarea } from "@/components/ui/rich-text-textarea";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import type {
  LookupProgram,
  LookupSubject,
  LookupTopic,
  TeacherQuestionPassage,
} from "@/lib/api/teacher-builder";
import { formatTopicOptionLabel, sortTopicOptions } from "@/lib/academics/topic-options";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";
import {
  getQuestionBankFieldError,
  getQuestionBankFieldErrorEntries,
  getQuestionBankFieldLabel,
  getQuestionBankGeneralErrors,
  type QuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

export function TeacherQuestionPassageEditor({
  action,
  headerEyebrow = "Teacher workspace",
  contentScopeLabel = "teacher-scoped",
  contentFormatOptions,
  pageTitle,
  pageDescription,
  programs,
  subjects,
  topics,
  initialPassage,
  pageClassName = "",
  validationErrors,
  validationMessage = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  headerEyebrow?: string;
  contentScopeLabel?: string;
  contentFormatOptions: CatalogSelectOption[];
  pageTitle: string;
  pageDescription: string;
  programs: LookupProgram[];
  subjects: LookupSubject[];
  topics: LookupTopic[];
  initialPassage?: TeacherQuestionPassage | null;
  pageClassName?: string;
  validationErrors?: QuestionBankValidationErrors;
  validationMessage?: string;
}) {
  const [programId, setProgramId] = useState(initialPassage?.program ?? "");
  const [subjectId, setSubjectId] = useState(initialPassage?.subject ?? "");
  const [topicId, setTopicId] = useState(initialPassage?.topic ?? "");
  const [contentFormat, setContentFormat] = useState(initialPassage?.content_format ?? "rich_text_html");
  const [passageText, setPassageText] = useState(initialPassage?.passage_text ?? "");
  const [description, setDescription] = useState(initialPassage?.description ?? "");

  const passageContentFormatOptions = useMemo(() => {
    if (contentFormatOptions.some((option) => option.value === "rich_text_html")) {
      return contentFormatOptions;
    }
    return [
      { value: "rich_text_html", label: "Rich Text Editor" },
      ...contentFormatOptions,
    ];
  }, [contentFormatOptions]);

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
  const programError = getQuestionBankFieldError(validationErrors, "program");
  const subjectError = getQuestionBankFieldError(validationErrors, "subject");
  const topicError = getQuestionBankFieldError(validationErrors, "topic");
  const contentFormatError = getQuestionBankFieldError(validationErrors, "content_format");
  const titleError = getQuestionBankFieldError(validationErrors, "title");
  const passageTextError = getQuestionBankFieldError(validationErrors, "passage_text");
  const descriptionError = getQuestionBankFieldError(validationErrors, "description");
  const generalErrors = getQuestionBankGeneralErrors(validationErrors);
  const fieldErrorEntries = getQuestionBankFieldErrorEntries(validationErrors);

  const linkedQuestions = initialPassage?.linked_questions ?? [];

  return (
    <div className={`studentPage studentPageTight studentDashboardModern ${pageClassName}`.trim()}>
      <StudentPageHeader
        eyebrow={headerEyebrow}
        title={pageTitle}
        description={pageDescription}
      />

      <section className="studentInsightHeroCard">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Comprehension Authoring</span>
          <strong>Group a shared passage with multiple downstream questions in one reusable comprehension set</strong>
          <p>
            The passage carries the reading context, while each linked question keeps its own marks,
            explanation, and answer logic. This keeps builder selection and future analytics cleaner.
          </p>
          <small>{`Managing reusable ${contentScopeLabel} comprehension content`}</small>
        </div>
      </section>

      <section className="contentCard questionEditorShell">
        <form action={action} className="builderForm builderWorkspace">
          {initialPassage ? <input name="passage_id" type="hidden" value={initialPassage.id} /> : null}

          {validationMessage || generalErrors.length || fieldErrorEntries.length ? (
            <section className="builderSectionCard questionEditorValidationCard">
              <div className="builderSectionHeader">
                <div>
                  <strong>Review the highlighted details</strong>
                  <p>Fix the flagged fields below and submit again. The comprehension draft is still preserved in the editor.</p>
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
                <strong>Set identity</strong>
                <p>Attach the passage to the right program, subject, and topic so every linked question stays in the same academic lane.</p>
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
                <small>Select the program first so the comprehension set stays aligned with the correct subject inventory.</small>
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
                    ? "Only subjects belonging to the selected program are available."
                    : "Program selection unlocks the right subject list."}
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
                    ? "Topics are filtered to the chosen subject."
                    : "Pick the subject before attaching a narrower topic."}
                </small>
                {topicError ? <small className="setupFieldError">{topicError}</small> : null}
              </label>

              <label className="fieldStack">
                <span>Content format</span>
                <select
                  aria-invalid={Boolean(contentFormatError)}
                  className={contentFormatError ? "setupFieldInvalid" : undefined}
                  name="content_format"
                  onChange={(event) => setContentFormat(event.target.value)}
                  value={contentFormat}
                >
                  {passageContentFormatOptions.map((option) => (
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
                <strong>Passage content</strong>
                <p>Write the reading passage once, then link multiple questions under it from the standard question editor.</p>
              </div>
            </div>

            <label className="fieldStack fieldStackFull">
              <span>Set title</span>
              <input
                aria-invalid={Boolean(titleError)}
                className={titleError ? "setupFieldInvalid" : undefined}
                defaultValue={initialPassage?.title ?? ""}
                name="title"
                placeholder="Example: AWS Shared Responsibility Reading Set"
                required
                type="text"
              />
              {titleError ? <small className="setupFieldError">{titleError}</small> : null}
            </label>

            <label className="fieldStack fieldStackFull">
              <span>Passage text</span>
              {contentFormat === "rich_text_html" ? (
                <HtmlRichTextEditor
                  helperText="Use the visual toolbar to format the reading passage. Bold, headings, lists, links, and quotes are supported."
                  name="passage_text"
                  onChange={setPassageText}
                  placeholder="Write or paste the reading passage here"
                  required
                  value={passageText}
                />
              ) : (
                <RichTextTextarea
                  defaultValue={initialPassage?.passage_text ?? ""}
                  helperText="Write the full reading passage here. Bold key phrases, add headings, and structure long comprehension sets with lists where needed."
                  name="passage_text"
                  onChange={setPassageText}
                  placeholder="Paste the full reading passage here"
                  previewLabel="Passage preview"
                  required
                  rows={12}
                  value={passageText}
                />
              )}
              {passageTextError ? <small className="setupFieldError">{passageTextError}</small> : null}
            </label>

            <label className="fieldStack fieldStackFull">
              <span>Teacher notes</span>
              {contentFormat === "rich_text_html" ? (
                <HtmlRichTextEditor
                  helperText="Optional internal guidance for teachers and reviewers. Keep notes readable for future edits and audits."
                  name="description"
                  onChange={setDescription}
                  placeholder="Add usage notes, comprehension focus, or editorial comments"
                  value={description}
                />
              ) : (
                <RichTextTextarea
                  defaultValue={initialPassage?.description ?? ""}
                  helperText="Optional internal guidance for teachers and reviewers. You can highlight focus areas, rubrics, or editorial notes."
                  name="description"
                  onChange={setDescription}
                  placeholder="Add usage notes, comprehension focus, or editorial comments"
                  previewLabel="Notes preview"
                  rows={4}
                  value={description}
                />
              )}
              {descriptionError ? <small className="setupFieldError">{descriptionError}</small> : null}
            </label>

            <div className="toggleGrid">
              <label><input defaultChecked={initialPassage?.is_active ?? true} name="is_active" type="checkbox" /> Active</label>
              <label><input defaultChecked={initialPassage?.metadata?.is_draft === true} name="is_draft" type="checkbox" /> Save as draft</label>
            </div>
          </section>

          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Linked questions</strong>
                <p>After saving the comprehension set, create or edit questions and assign this set in the question editor.</p>
              </div>
            </div>

            {linkedQuestions.length ? (
              <div className="questionBankList">
                {linkedQuestions.map((question) => (
                  <article className="questionBankCard" key={question.id}>
                    <div className="questionBankCardHeader">
                      <div className="questionBankCardCopy">
                        <strong>{question.question_text}</strong>
                        <div className="questionBankChipRow">
                          <span className="questionBankMetaChip">Order {question.passage_order ?? "-"}</span>
                          <span className="questionBankMetaChip">{question.question_type}</span>
                          <span className="questionBankMetaChip">{question.difficulty_level}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="builderEmptyState">
                <strong>No linked questions yet</strong>
                <p>Save this set first, then open the regular question editor and choose this comprehension set from the new linkage field.</p>
              </div>
            )}
          </section>

          <div className="builderSaveBar">
            <div>
              <strong>{initialPassage ? "Update the comprehension set cleanly" : "Create the comprehension set cleanly"}</strong>
              <span>Keep the passage academically mapped and readable so the linked questions can stay modular and easier to analyze later.</span>
            </div>
            <ActionSubmitButton
              className="button buttonPrimary"
              idleLabel={initialPassage ? "Save Comprehension Set" : "Create Comprehension Set"}
              pendingLabel={initialPassage ? "Saving..." : "Creating..."}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
