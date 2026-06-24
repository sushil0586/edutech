import { redirect, unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { TeacherQuestionEditor } from "@/components/ui/teacher-question-editor";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import {
  createTeacherQuestionAttachment,
  createTeacherQuestionTagMap,
  deleteTeacherQuestionAttachment,
  deleteTeacherQuestionTagMap,
  fetchTeacherOptionCatalog,
  fetchTeacherQuestionPassages,
  fetchTeacherPrograms,
  fetchTeacherQuestionDetail,
  fetchTeacherQuestionTags,
  fetchTeacherQuestionTypeRegistry,
  fetchTeacherSubjects,
  fetchTeacherTopics,
  updateTeacherQuestion,
} from "@/lib/api/teacher-builder";
import { requireTeacherSession } from "@/lib/auth/session";
import { validateQuestionAttachmentUpload } from "@/lib/http/upload-validation";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";
import { buildTeacherQuestionPayload } from "@/lib/teacher/question-bank-form";
import {
  buildQuestionBankErrorSearch,
  parseQuestionBankValidationErrors,
} from "@/lib/teacher/question-bank-validation";

function isReadOnlyLibraryQuestion(question: {
  id: string;
  metadata?: Record<string, unknown>;
}) {
  return (
    question.metadata?.link_mode === "source_materialization" ||
    typeof question.metadata?.linked_from_master === "string"
  );
}

async function updateQuestionAction(formData: FormData) {
  "use server";

  const profile = await requireTeacherSession();
  const questionId = String(formData.get("question_id") ?? "").trim();

  if (!profile.institute || !questionId) {
    redirect("/teacher/question-bank?error=Question%20context%20is%20missing.");
  }

  try {
    const payload = buildTeacherQuestionPayload(formData, {
      institute: profile.institute,
      teacherProfile: profile.teacher_profile,
    });
    const question = await updateTeacherQuestion(questionId, payload);
    redirect(`/teacher/question-bank/${question.id}?message=${encodeURIComponent("Question updated successfully.")}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      `/teacher/question-bank/${questionId}?${buildQuestionBankErrorSearch(
        error,
        "Unable to update the question right now.",
      )}`,
    );
  }
}

async function addQuestionTagAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const questionId = String(formData.get("question_id") ?? "").trim();
  const tagId = String(formData.get("tag_id") ?? "").trim();

  if (!questionId || !tagId) {
    redirect(`/teacher/question-bank/${questionId || ""}?error=${encodeURIComponent("Choose a tag before saving.")}`);
  }

  try {
    await createTeacherQuestionTagMap({
      question: questionId,
      tag: tagId,
      is_active: true,
    });
    redirect(
      `/teacher/question-bank/${questionId}?message=${encodeURIComponent("Tag added to the question.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to attach the selected tag.";
    redirect(`/teacher/question-bank/${questionId}?error=${encodeURIComponent(message)}`);
  }
}

async function addQuestionAttachmentAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const questionId = String(formData.get("question_id") ?? "").trim();
  const attachmentType = String(formData.get("attachment_type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const altText = String(formData.get("alt_text") ?? "").trim();
  const isInline = formData.get("is_inline") === "on";
  const file = formData.get("file");

  if (!questionId || !(file instanceof File) || !file.size) {
    redirect(
      `/teacher/question-bank/${questionId || ""}?error=${encodeURIComponent("Choose an attachment file before uploading.")}`,
    );
  }

  const fileError = validateQuestionAttachmentUpload(file, attachmentType);
  if (fileError) {
    redirect(`/teacher/question-bank/${questionId}?error=${encodeURIComponent(fileError)}`);
  }

  try {
    await createTeacherQuestionAttachment({
      question: questionId,
      file,
      fileName: file.name,
      attachment_type: attachmentType,
      title: title || file.name,
      display_order: Number(formData.get("display_order") ?? "1") || 1,
      alt_text: altText,
      is_inline: isInline,
      is_active: true,
    });
    redirect(
      `/teacher/question-bank/${questionId}?message=${encodeURIComponent("Attachment uploaded successfully.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to upload the attachment.";
    redirect(`/teacher/question-bank/${questionId}?error=${encodeURIComponent(message)}`);
  }
}

async function removeQuestionAttachmentAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const questionId = String(formData.get("question_id") ?? "").trim();
  const attachmentId = String(formData.get("attachment_id") ?? "").trim();

  if (!questionId || !attachmentId) {
    redirect(
      `/teacher/question-bank/${questionId || ""}?error=${encodeURIComponent("Attachment context is missing.")}`,
    );
  }

  try {
    await deleteTeacherQuestionAttachment(attachmentId);
    redirect(
      `/teacher/question-bank/${questionId}?message=${encodeURIComponent("Attachment removed successfully.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to remove the attachment.";
    redirect(`/teacher/question-bank/${questionId}?error=${encodeURIComponent(message)}`);
  }
}

async function removeQuestionTagAction(formData: FormData) {
  "use server";

  await requireTeacherSession();

  const questionId = String(formData.get("question_id") ?? "").trim();
  const tagMapId = String(formData.get("tag_map_id") ?? "").trim();

  if (!questionId || !tagMapId) {
    redirect(`/teacher/question-bank/${questionId || ""}?error=${encodeURIComponent("Tag context is missing.")}`);
  }

  try {
    await deleteTeacherQuestionTagMap(tagMapId);
    redirect(
      `/teacher/question-bank/${questionId}?message=${encodeURIComponent("Tag removed from the question.")}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to remove the selected tag.";
    redirect(`/teacher/question-bank/${questionId}?error=${encodeURIComponent(message)}`);
  }
}

export default async function TeacherQuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireTeacherSession();
  const { questionId } = await params;
  const resolvedSearchParams = await searchParams;
  const error = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0] ?? ""
    : resolvedSearchParams.error ?? "";
  const message = Array.isArray(resolvedSearchParams.message)
    ? resolvedSearchParams.message[0] ?? ""
    : resolvedSearchParams.message ?? "";
  const validationErrors = parseQuestionBankValidationErrors(resolvedSearchParams.validation);

  const data = await Promise.all([
    fetchTeacherOptionCatalog(),
    fetchTeacherQuestionTypeRegistry(),
    fetchTeacherPrograms(),
    fetchTeacherSubjects(),
    fetchTeacherTopics(),
    fetchTeacherQuestionPassages(),
    fetchTeacherQuestionDetail(questionId),
    fetchTeacherQuestionTags(),
  ]).catch(() => null);

  if (!data) {
    return (
      <div className="studentPage">
        <TeacherPageHeader
          title="Question Detail"
          description="This route depends on live question-bank detail and academic lookup endpoints."
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title="Question detail could not be loaded"
          description="The selected question was not available from the teacher-scoped question bank, or the academic lookup endpoints did not complete successfully."
          bullets={[
            "Teacher question detail endpoint",
            "Programs, subjects, and topics lookups",
            "Teacher question update endpoint",
          ]}
          ctaHref="/teacher/question-bank"
          ctaLabel="Back to Question Bank"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const [optionCatalogEntries, questionTypeDefinitions, programs, subjects, topics, passages, question, tags] = data;
  if (isReadOnlyLibraryQuestion(question)) {
    redirect(
      `/teacher/question-bank/new?duplicate=${question.id}&error=${encodeURIComponent(
        "Public library questions are read-only here. Duplicate the question to create an editable teacher copy.",
      )}`,
    );
  }
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);
  const attachmentTypeOptions = optionCatalog.selectOptions("question_attachment_type");
  const attachmentTypeLabelMap = optionCatalog.labelMap("question_attachment_type");
  const attachedTagIds = new Set(question.tag_maps.map((tagMap) => tagMap.tag));
  const availableTags = tags.filter((tag) => !attachedTagIds.has(tag.id));

  function renderAttachmentPreview(attachment: (typeof question.attachments)[number]) {
    const source = attachment.file_url || attachment.file;

    if (!source) {
      return null;
    }

    if (attachment.attachment_type === "image" || attachment.attachment_type === "diagram") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={attachment.alt_text || attachment.title || "Question attachment"}
          className="questionAttachmentPreviewMedia"
          src={source}
        />
      );
    }

    if (attachment.attachment_type === "pdf") {
      return (
        <iframe
          className="questionAttachmentPreviewFrame"
          src={source}
          title={attachment.title || "Attachment preview"}
        />
      );
    }

    if (attachment.attachment_type === "audio") {
      return <audio className="questionAttachmentPreviewAudio" controls src={source} />;
    }

    if (attachment.attachment_type === "video") {
      return <video className="questionAttachmentPreviewVideo" controls src={source} />;
    }

    return null;
  }

  return (
    <>
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      <TeacherQuestionEditor
        action={updateQuestionAction}
        contentFormatOptions={optionCatalog.selectOptions("question_content_format")}
        difficultyOptions={optionCatalog.selectOptions("question_difficulty")}
        initialQuestion={question}
        pageDescription="Review the question wording, explanation, answer structure, and academic mapping before reusing it in exams."
        pageTitle="Edit Question"
        pageClassName="teacherConsolePage teacherQuestionEditorPageVivid"
        passages={passages}
        programs={programs}
        questionTypeDefinitions={questionTypeDefinitions}
        questionTypeOptions={optionCatalog.selectOptions("question_type")}
        subjects={subjects}
        topics={topics}
        validationErrors={validationErrors}
        validationMessage={error ? decodeURIComponent(error) : ""}
      />

      <section className="studentPage studentPageTight studentDashboardModern teacherConsolePage teacherQuestionEditorPageVivid">
        <section className="studentInsightHeroCard studentInsightHeroCardCompact">
          <div className="studentInsightHeroCopy">
            <span className="studentDashboardTag">Question Enrichment</span>
            <strong>Question metadata and attachments</strong>
            <small>
              {question.tag_maps.length} tags · {question.attachments.length} attachments linked
            </small>
          </div>
          <div className="studentInsightHeroActions">
            <Link className="button buttonSecondary" href="/teacher/question-bank">
              Back to Question Bank
            </Link>
          </div>
        </section>

        <div className="contentCard questionEditorShell">
          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Tags and reuse metadata</strong>
                <p>
                  Organize this question with teacher-facing tags so it is easier to
                  discover, review, and reuse across exam builders.
                </p>
              </div>
              <Link className="button buttonGhost" href="/teacher/question-bank">
                Back to bank
              </Link>
            </div>

            <div className="questionBankTagRow">
              {question.tag_maps.length ? (
                question.tag_maps.map((tagMap) => (
                  <form action={removeQuestionTagAction} className="questionTagForm" key={tagMap.id}>
                    <input name="question_id" type="hidden" value={question.id} />
                    <input name="tag_map_id" type="hidden" value={tagMap.id} />
                    <span className="questionBankTagChip">{tagMap.tag_detail.name}</span>
                    <ActionSubmitButton
                      className="button buttonGhost questionTagRemoveButton"
                      idleLabel="Remove"
                      pendingLabel="Removing..."
                    />
                  </form>
                ))
              ) : (
                <p className="emptyStateText">
                  No tags are attached yet. Add tags to improve question discovery.
                </p>
              )}
            </div>

            <form action={addQuestionTagAction} className="questionTagAddForm">
              <input name="question_id" type="hidden" value={question.id} />
              <label className="fieldStack">
                <span>Add tag</span>
                <select defaultValue="" name="tag_id">
                  <option value="">Select a reusable tag</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name} ({tag.code})
                    </option>
                  ))}
                </select>
              </label>

              <div className="builderMiniBanner">
                <div>
                  <strong>{question.tag_maps.length} tags attached</strong>
                  <span>
                    {availableTags.length
                      ? `${availableTags.length} more active tags are available in the teacher scope.`
                      : "All active tags are already attached to this question."}
                  </span>
                </div>
                <ActionSubmitButton
                  className="button buttonPrimary"
                  disabled={availableTags.length === 0}
                  idleLabel="Attach Tag"
                  pendingLabel="Attaching..."
                />
              </div>
            </form>
          </section>

          <section className="builderSectionCard">
            <div className="builderSectionHeader">
              <div>
                <strong>Attachments and media</strong>
                <p>
                  Add diagrams, PDFs, screenshots, or media that support the question
                  prompt and explanation without crowding the main editor.
                </p>
              </div>
            </div>

            {question.attachments.length ? (
              <div className="questionAttachmentList">
                {question.attachments.map((attachment) => (
                  <article className="questionAttachmentCard" key={attachment.id}>
                    <div className="questionAttachmentCopy">
                      <strong>{attachment.title || attachment.file.split("/").pop() || "Attachment"}</strong>
                      {renderAttachmentPreview(attachment)}
                      <div className="questionBankChipRow">
                        <span className="questionBankMetaChip">
                          {attachmentTypeLabelMap[attachment.attachment_type] ?? attachment.attachment_type}
                        </span>
                        <span className="questionBankMetaChip">
                          Display order {attachment.display_order}
                        </span>
                        {attachment.is_inline ? (
                          <span className="questionBankTagChip">Inline enabled</span>
                        ) : null}
                      </div>
                      {attachment.alt_text ? <p>{attachment.alt_text}</p> : null}
                      <a
                        className="button buttonGhost"
                        href={attachment.file_url || attachment.file}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open file
                      </a>
                    </div>
                    <form action={removeQuestionAttachmentAction}>
                      <input name="question_id" type="hidden" value={question.id} />
                      <input name="attachment_id" type="hidden" value={attachment.id} />
                      <ActionSubmitButton
                        className="button buttonGhost"
                        idleLabel="Remove"
                        pendingLabel="Removing..."
                      />
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <p className="emptyStateText">
                No attachments are linked yet. Upload supporting media after saving the question.
              </p>
            )}

            <form action={addQuestionAttachmentAction} className="questionAttachmentForm">
              <input name="question_id" type="hidden" value={question.id} />

              <div className="builderGrid compact">
                <label className="fieldStack">
                  <span>Attachment title</span>
                  <input
                    defaultValue=""
                    name="title"
                    placeholder="Diagram, reference PDF, screenshot"
                    type="text"
                  />
                </label>

                <label className="fieldStack">
                  <span>Attachment type</span>
                  <select defaultValue={attachmentTypeOptions[0]?.value ?? ""} name="attachment_type">
                    {attachmentTypeOptions.map((option) => (
                      <option key={option.value || "blank"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="fieldStack">
                  <span>Display order</span>
                  <input
                    defaultValue={String(question.attachments.length + 1)}
                    min="1"
                    name="display_order"
                    step="1"
                    type="number"
                  />
                </label>
              </div>

              <label className="fieldStack fieldStackFull">
                <span>Alt text or learner note</span>
                <textarea
                  name="alt_text"
                  placeholder="Describe the file for accessibility or explain when the learner should use it."
                  rows={3}
                />
              </label>

              <div className="builderGrid compact questionAttachmentUploadRow">
                <label className="fieldStack">
                  <span>Attachment file</span>
                  <input name="file" required type="file" />
                </label>

                <label className="questionBankToggle questionAttachmentInlineToggle">
                  <input defaultChecked type="checkbox" name="is_inline" />
                  Allow inline usage
                </label>
              </div>

              <div className="builderMiniBanner">
                <div>
                  <strong>{question.attachments.length} attachment{question.attachments.length === 1 ? "" : "s"} linked</strong>
                  <span>
                    Use attachments for supporting media while keeping the core question text clean and readable.
                  </span>
                </div>
                <ActionSubmitButton
                  className="button buttonPrimary"
                  idleLabel="Upload Attachment"
                  pendingLabel="Uploading..."
                />
              </div>
            </form>
          </section>
        </div>
      </section>
    </>
  );
}
