"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type {
  LookupProgram,
  LookupSubject,
  LookupTopic,
  MasterQuestionLibraryQuestion,
} from "@/lib/api/teacher-builder";

type TopicSummary = {
  topicId: string;
  topicCode: string;
  topicName: string;
  availableCount: number;
  linkedCount: number;
  remainingCount: number;
};

function buildHref(
  basePath: string,
  params: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function availabilityTone(question: MasterQuestionLibraryQuestion) {
  if (question.access_availability === "quota_exhausted") return "statusWarn";
  if (question.has_access) return "statusSuccess";
  return "statusDefault";
}

function availabilityLabel(question: MasterQuestionLibraryQuestion) {
  const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
  if (accessState === "linked") return "Already linked";
  if (!question.has_access) return "Package access required";
  if (question.access_availability === "quota_exhausted") return "Quota reached";
  return "Ready to link";
}

export function InstituteSharedLibraryLinker({
  basePath = "/institute/question-bank/library-linker",
  programs,
  subjects,
  topics,
  selectedProgramId,
  selectedSubjectId,
  selectedTopicId,
  search,
  libraryPage,
  libraryPageSize,
  totalCount,
  hasNextPage,
  hasPreviousPage,
  topicSummaries,
  questions,
  sharedLibraryDisabledMessage = "",
  message = "",
  error = "",
}: {
  basePath?: string;
  programs: LookupProgram[];
  subjects: LookupSubject[];
  topics: LookupTopic[];
  selectedProgramId: string;
  selectedSubjectId: string;
  selectedTopicId: string;
  search: string;
  libraryPage: number;
  libraryPageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  topicSummaries: TopicSummary[];
  questions: MasterQuestionLibraryQuestion[];
  sharedLibraryDisabledMessage?: string;
  message?: string;
  error?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [isPendingSingle, startSingleTransition] = useTransition();
  const [isPendingBulk, startBulkTransition] = useTransition();
  const [showRemainingOnly, setShowRemainingOnly] = useState(false);
  const totalAvailableAcrossSubject = topicSummaries.reduce((sum, topicSummary) => sum + topicSummary.availableCount, 0);
  const totalLinkedAcrossSubject = topicSummaries.reduce((sum, topicSummary) => sum + topicSummary.linkedCount, 0);
  const totalRemainingAcrossSubject = topicSummaries.reduce((sum, topicSummary) => sum + topicSummary.remainingCount, 0);

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? null;
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? null;
  const stepLabel = !selectedProgram
    ? "Step 1: choose class/program"
    : !selectedSubject
      ? "Step 1: choose subject"
      : !selectedTopic
        ? "Step 2: choose topic"
        : "Step 3: review and link questions";

  const linkableQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
        return Boolean(question.has_access) && accessState !== "linked";
      }),
    [questions],
  );
  const visibleTopicSummaries = useMemo(
    () =>
      showRemainingOnly
        ? topicSummaries.filter((topicSummary) => topicSummary.remainingCount > 0)
        : topicSummaries,
    [showRemainingOnly, topicSummaries],
  );
  const suggestedTopicForReview =
    visibleTopicSummaries.find((topicSummary) => topicSummary.remainingCount > 0)
    ?? visibleTopicSummaries.find((topicSummary) => topicSummary.availableCount > 0)
    ?? visibleTopicSummaries[0]
    ?? null;

  const allSelected =
    linkableQuestions.length > 0 && linkableQuestions.every((question) => selectedIds.includes(question.id));

  function toggleQuestion(questionId: string) {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function toggleAllOnPage() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(linkableQuestions.map((question) => question.id));
  }

  function runSingleLink(question: MasterQuestionLibraryQuestion) {
    startSingleTransition(() => {
      setPendingQuestionId(question.id);
      void fetch("/api/question-bank/master-library/bulk-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_ids: [question.id],
          subject_code: selectedSubject?.code ?? "",
          topic_code: selectedTopic?.code ?? "",
          local_subject_code: selectedSubject?.code ?? question.source_subject_code,
          local_topic_code: selectedTopic?.code ?? question.source_topic_code ?? "",
        }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as { detail?: string };
          window.location.href = buildHref(basePath, {
            program: selectedProgramId,
            subject: selectedSubjectId,
            topic: selectedTopicId,
            search,
            library_page: libraryPage,
            library_page_size: libraryPageSize,
            message: response.ok ? "Shared question linked successfully." : "",
            error: response.ok ? "" : payload.detail || "Unable to link the selected question.",
          });
        })
        .catch(() => {
          window.location.href = buildHref(basePath, {
            program: selectedProgramId,
            subject: selectedSubjectId,
            topic: selectedTopicId,
            search,
            library_page: libraryPage,
            library_page_size: libraryPageSize,
            error: "Unable to link the selected question.",
          });
        })
        .finally(() => setPendingQuestionId(null));
    });
  }

  function runBulkLinkSelected() {
    if (!selectedIds.length) {
      return;
    }

    startBulkTransition(() => {
      void fetch("/api/question-bank/master-library/bulk-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_ids: selectedIds,
          subject_code: selectedSubject?.code ?? "",
          topic_code: selectedTopic?.code ?? "",
          local_subject_code: selectedSubject?.code ?? "",
          local_topic_code: selectedTopic?.code ?? "",
        }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as {
            detail?: string;
            linked_count?: number;
          };
          window.location.href = buildHref(basePath, {
            program: selectedProgramId,
            subject: selectedSubjectId,
            topic: selectedTopicId,
            search,
            library_page: libraryPage,
            library_page_size: libraryPageSize,
            message: response.ok
              ? `Linked ${Number(payload.linked_count ?? 0)} selected question${Number(payload.linked_count ?? 0) === 1 ? "" : "s"}.`
              : "",
            error: response.ok ? "" : payload.detail || "Unable to link the selected questions.",
          });
        })
        .catch(() => {
          window.location.href = buildHref(basePath, {
            program: selectedProgramId,
            subject: selectedSubjectId,
            topic: selectedTopicId,
            search,
            library_page: libraryPage,
            library_page_size: libraryPageSize,
            error: "Unable to link the selected questions.",
          });
        });
    });
  }

  return (
    <div className="questionBankShell sharedLibraryLinkerPage">
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}
      {sharedLibraryDisabledMessage ? <p className="feedbackBanner">{sharedLibraryDisabledMessage}</p> : null}

      <section className="contentCard sharedLibraryLinkerIntroCard">
        <div className="sectionHeading">
          <strong>Use one lane at a time</strong>
          <span>Use this page only for intake. Review linked rows and local editing in their own lanes so operators do not solve the wrong problem.</span>
        </div>
        <div className="sharedLibraryLinkerIntroGrid">
        <div className="builderHintPanel">
          <strong>Current lane: Shared Library Linker</strong>
          <p>
            Use this page when package access is already valid but the institute still needs more platform-backed questions in a class, subject, or topic lane.
          </p>
          <small>
            This page is not for editing wording. It is only for choosing source rows and adding them into the institute bank.
          </small>
        </div>
        <div className="builderHintPanel">
          <strong>Role boundary for this lane</strong>
          <p>
            Institute admins complete the final intake step here after checking package access, class and subject fit, and topic relevance.
          </p>
          <small>
            Teachers can inspect licensed source rows and request help from their workspace, but they do not complete the final link on this page. After linking, both roles should move to Linked Questions for review and reuse.
          </small>
        </div>
        </div>
      </section>

      <section className="contentCard questionBankFilterSurface sharedLibraryLinkerStepCard">
        <div className="sectionHeading">
          <strong>Step 1. Choose class and subject</strong>
          <span>Start with one academic lane. Pick one class and one subject first, then open only one topic at a time.</span>
        </div>
        <div className="builderHintPanel sharedLibraryLinkerGuidePanel">
          <strong>What this page is for</strong>
          <p>
            This page shows platform questions the institute is allowed to bring into its own bank. The safest workflow is: choose class, choose subject, choose one topic, review the list, then add only the rows teachers will actually use.
          </p>
          <small>
            If this page looks empty, first ask whether package access is missing, the topic is not yet available in the platform library, or the current filters are too narrow.
          </small>
        </div>
        <div className="questionBankChipRow questionBankChipRowCompact">
          <span className="questionBankMetaChip">Current step: {stepLabel}</span>
          <span className="questionBankMetaChip">Class: {selectedProgram?.name || "Not chosen yet"}</span>
          <span className="questionBankMetaChip">Subject: {selectedSubject?.name || "Not chosen yet"}</span>
          <span className="questionBankMetaChip">Topic: {selectedTopic?.name || "Not chosen yet"}</span>
        </div>
        <form className="questionBankFilterForm" method="GET">
          <label className="fieldStack">
            <span>Program</span>
            <select defaultValue={selectedProgramId} name="program">
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldStack">
            <span>Subject</span>
            <select defaultValue={selectedSubjectId} name="subject">
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldStack">
            <span>Topic</span>
            <select defaultValue={selectedTopicId} name="topic">
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fieldStack questionBankSearchField">
            <span>Search current topic</span>
            <input defaultValue={search} name="search" placeholder="Search question text" type="text" />
          </label>
          <input name="library_page_size" type="hidden" value={libraryPageSize} />
        <div className="questionBankCardActions">
          <button className="button buttonPrimary" type="submit">
            {selectedTopicId ? "Show Questions" : "Load Topics"}
          </button>
          {(selectedProgramId || selectedSubjectId || selectedTopicId) ? (
            <Link
              className="button buttonGhost"
              href={buildHref("/institute/question-bank/linked", {
                program: selectedProgramId,
                subject: selectedSubjectId,
                topic: selectedTopicId,
              })}
            >
              Open Linked Questions For This Scope
            </Link>
          ) : null}
          <Link className="button buttonSecondary" href="/institute/question-bank">
            Open Local Question Bank
          </Link>
        </div>
      </form>
      </section>

      {selectedSubject ? (
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Step 2. Pick one topic</strong>
            <span>{visibleTopicSummaries.length} topics are currently visible in this subject</span>
          </div>
          <div className="questionBankChipRow questionBankChipRowCompact">
            <span className="questionBankMetaChip">
              Class: {programs.find((entry) => entry.id === selectedProgramId)?.name || "Not selected"}
            </span>
            <span className="questionBankMetaChip">Subject: {selectedSubject.name}</span>
            <span className="questionBankMetaChip">
              Topics with available source questions: {topicSummaries.filter((entry) => entry.availableCount > 0).length}
            </span>
          </div>
          <div className="builderHintPanel">
            <strong>How to choose the right topic</strong>
            <p>
              Open one topic where the remaining count is high. That usually means the platform still has useful source rows that the institute has not linked yet.
            </p>
            <small>
              `Available in platform bank` means what the platform can currently offer. `Already linked locally` means what your institute already has. `Not yet added` is the gap operators can recover from here.
            </small>
          </div>
          <div className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
            <span>Available in platform bank: {totalAvailableAcrossSubject}</span>
            <span>Already linked locally: {totalLinkedAcrossSubject}</span>
            <span>Not yet added: {totalRemainingAcrossSubject}</span>
          </div>
          <div className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
            <span>Choose one topic only, especially for careful manual review.</span>
            <span>When a topic shows zero source rows, it usually means the platform does not currently offer source content for that topic, not that the institute lost access.</span>
          </div>
          <div className="questionBankCardActions">
            <button
              className="button buttonSecondary"
              onClick={() => setShowRemainingOnly((current) => !current)}
              type="button"
            >
              {showRemainingOnly ? "Show All Topics" : "Show Only Topics Still Linkable"}
            </button>
            {selectedTopicId ? (
              <Link
                className="button buttonGhost"
                href={buildHref("/institute/question-bank/linked", {
                  program: selectedProgramId,
                  subject: selectedSubjectId,
                  topic: selectedTopicId,
                })}
              >
                Open Linked Rows For Current Topic
              </Link>
            ) : null}
          </div>
          <div className="questionBankList">
            {visibleTopicSummaries.map((topicSummary) => (
              <article className="questionBankCard" key={topicSummary.topicId}>
                <div className="questionBankCardHeader">
                  <div className="questionBankCardCopy">
                    <strong>{topicSummary.topicName}</strong>
                    <div className="questionBankChipRow">
                      <span className="questionBankMetaChip">{topicSummary.availableCount} in platform library</span>
                      <span className="questionBankMetaChip">{topicSummary.linkedCount} already linked</span>
                      <span className="questionBankMetaChip">{topicSummary.remainingCount} still linkable</span>
                    </div>
                    {topicSummary.availableCount === 0 ? (
                      <p className="questionBankCardMetaNote">
                        No platform questions are currently available for this topic. This usually means
                        the platform does not currently offer source rows for this topic, not that the institute did anything wrong.
                      </p>
                    ) : null}
                    {topicSummary.availableCount > 0 && topicSummary.remainingCount === 0 ? (
                      <p className="questionBankCardMetaNote">
                        All currently available platform questions for this topic are already linked into
                        the institute bank.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="questionBankCardFooter">
                  <div className="questionBankCardMetaNote">
                    <span>{topicSummary.topicCode}</span>
                  </div>
                  <div className="questionBankCardActions">
                    <Link
                      className={`button ${selectedTopicId === topicSummary.topicId ? "buttonPrimary" : "buttonSecondary"}`}
                      href={buildHref(basePath, {
                        program: selectedProgramId,
                        subject: selectedSubjectId,
                        topic: topicSummary.topicId,
                        library_page_size: libraryPageSize,
                      })}
                    >
                      {selectedTopicId === topicSummary.topicId ? "Currently Open" : "Review This Topic"}
                    </Link>
                    <Link
                      className="button buttonGhost"
                      href={buildHref("/institute/question-bank/linked", {
                        program: selectedProgramId,
                        subject: selectedSubjectId,
                        topic: topicSummary.topicId,
                      })}
                    >
                      Open Linked Rows
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedSubject && !selectedTopic ? (
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Open one topic to continue</strong>
            <span>
              The topic list above is only a summary. The review and linking workspace opens after one topic is selected.
            </span>
          </div>
          <div className="builderHintPanel">
            <strong>Best next step</strong>
            <p>Choose one topic from the list above, preferably one with a high remaining count, then review that topic carefully before linking rows.</p>
            <small>This step helps operators separate “nothing available in this topic” from “nothing linked yet in this topic.”</small>
          </div>
          <div className="questionBankCardActions">
            {suggestedTopicForReview ? (
              <Link
                className="button buttonPrimary"
                href={buildHref(basePath, {
                  program: selectedProgramId,
                  subject: selectedSubjectId,
                  topic: suggestedTopicForReview.topicId,
                  library_page_size: libraryPageSize,
                })}
              >
                Review Suggested Topic: {suggestedTopicForReview.topicName}
              </Link>
            ) : null}
            <Link
              className="button buttonSecondary"
              href={buildHref("/institute/question-bank/linked", {
                program: selectedProgramId,
                subject: selectedSubjectId,
              })}
            >
              Check already linked rows first
            </Link>
          </div>
        </section>
      ) : null}

      {selectedTopic ? (
        <section className="contentCard">
          <div className="sectionHeading">
            <strong>Step 3. Review and link platform source questions</strong>
            <span>{totalCount} source question{totalCount === 1 ? "" : "s"} found in {selectedTopic.name}</span>
          </div>
          <div className="questionBankChipRow questionBankChipRowCompact">
            <span className="questionBankMetaChip">Page {libraryPage}</span>
            <span className="questionBankMetaChip">Rows per page: {libraryPageSize}</span>
            <span className="questionBankMetaChip">Selected to add: {selectedIds.length}</span>
            <span className="questionBankMetaChip">Ready on this page: {linkableQuestions.length}</span>
          </div>
          <div className="builderHintPanel">
            <strong>Review rule before linking</strong>
            <p>
              First read the question text, then check the explanation and topic details, and only then add the row into the institute bank.
            </p>
            <small>
              This list shows platform source rows, not the already-linked local inventory. Use single-link for careful review. Use bulk link only after checking multiple rows on the same page.
            </small>
          </div>
          <div className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
            <span>This topic is showing platform question rows, not only questions already in the institute bank.</span>
            <span>Open Linked Rows For This Topic when you want to review what the institute already has instead of what the platform could still offer.</span>
            <span>
              {linkableQuestions.length > 0
                ? "Best next step: review carefully, then add only the rows teachers are likely to reuse."
                : "Best next step: check linked rows first, or switch to another topic that still has platform stock left."}
            </span>
          </div>
          <div className="questionBankCardActions">
            <label className="fieldStack">
              <span>Rows per page</span>
              <select
                onChange={(event) => {
                  window.location.href = buildHref(basePath, {
                    program: selectedProgramId,
                    subject: selectedSubjectId,
                    topic: selectedTopicId,
                    search,
                    library_page: 1,
                    library_page_size: Number(event.target.value),
                  });
                }}
                value={String(libraryPageSize)}
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button buttonSecondary"
              disabled={!linkableQuestions.length}
              onClick={toggleAllOnPage}
              type="button"
            >
              {allSelected ? "Clear Page Selection" : "Select All Ready Questions"}
            </button>
            <button
              className="button buttonPrimary"
              disabled={!selectedIds.length || isPendingBulk}
              onClick={runBulkLinkSelected}
              type="button"
            >
              {isPendingBulk ? "Adding Selected Questions..." : `Add Selected To Institute Bank (${selectedIds.length})`}
            </button>
            <Link
              className="button buttonGhost"
              href={buildHref("/institute/question-bank/linked", {
                program: selectedProgramId,
                subject: selectedSubjectId,
                topic: selectedTopicId,
              })}
            >
              Open Linked Rows For This Topic
            </Link>
          </div>

          {!questions.length ? (
            <div className="builderEmptyState">
              <strong>{search.trim() ? "No platform questions matched this search" : "No platform questions are available for this topic yet"}</strong>
              <p>
                {search.trim()
                  ? "Try clearing the search box or reviewing the same topic without text filtering first."
                  : "The platform currently has no rows to offer for this topic. Treat this as a source-availability gap, not an institute-side failure."}
              </p>
              <small>
                {search.trim()
                  ? "If the institute linked rows for this topic earlier, use the linked-rows view to review what is already in the bank."
                  : "Open linked rows for this topic to confirm what the institute already has, or switch to another topic that still shows remaining source rows."}
              </small>
              <div className="questionBankCardActions" style={{ marginTop: 16 }}>
                <Link
                  className="button buttonSecondary"
                  href={buildHref("/institute/question-bank/linked", {
                    program: selectedProgramId,
                    subject: selectedSubjectId,
                    topic: selectedTopicId,
                  })}
                >
                  Open Linked Rows For This Topic
                </Link>
                <Link
                  className="button buttonGhost"
                  href={buildHref(basePath, {
                    program: selectedProgramId,
                    subject: selectedSubjectId,
                    library_page: 1,
                    library_page_size: libraryPageSize,
                  })}
                >
                  Back To Topic List
                </Link>
              </div>
            </div>
          ) : (
            <div className="questionBankList">
              {questions.map((question) => {
                const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
                const canLink = Boolean(question.has_access) && accessState !== "linked";
                const isBusy = isPendingSingle && pendingQuestionId === question.id;

                return (
                  <article className="questionBankCard" key={question.id}>
                    <div className="questionBankCardHeader">
                      <div className="questionBankCardCopy">
                        <strong>{question.question_text}</strong>
                        <div className="questionBankChipRow questionBankChipRowCompact">
                          <span className="questionBankMetaChip">{question.question_type.replaceAll("_", " ")}</span>
                          <span className="questionBankMetaChip">{question.difficulty_level}</span>
                          <span className={`statusPill ${availabilityTone(question)}`}>
                            {availabilityLabel(question)}
                          </span>
                          <span className="questionBankMetaChip">{accessState.replaceAll("_", " ")}</span>
                        </div>
                      </div>
                      <label className="questionBankMetaChip">
                        <input
                          checked={selectedIds.includes(question.id)}
                          disabled={!canLink}
                          onChange={() => toggleQuestion(question.id)}
                          type="checkbox"
                        />
                        Select
                      </label>
                    </div>
                    <div className="questionBankCardFooter">
                      <div className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
                        <span>{question.explanation || "No explanation available yet."}</span>
                        {question.matching_packages.length ? (
                          <span>
                            Package: {question.matching_packages.map((entry) => entry.name).join(", ")}
                          </span>
                        ) : null}
                      </div>
                      <div className="questionBankCardActions">
                        <details className="questionBankCardMetaNote questionBankCardMetaNoteCompact">
                          <summary>More details</summary>
                          <span>Source owner: {question.source_institute_name}</span>
                          <span>Topic: {question.source_topic_name || "No topic"}</span>
                          <span>Marks: {question.default_marks}</span>
                        </details>
                        {canLink ? (
                          <button
                            className="button buttonPrimary"
                            disabled={isBusy}
                            onClick={() => runSingleLink(question)}
                            type="button"
                          >
                            {isBusy ? "Adding..." : "Add To Institute Bank"}
                          </button>
                        ) : (
                          <span className="button buttonGhost questionBankButtonDisabled">
                            {accessState === "linked" ? "Already In Institute Bank" : "Not Addable In This Lane"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {hasPreviousPage || hasNextPage ? (
            <div className="questionBankCardActions">
              {hasPreviousPage ? (
                <Link
                  className="button buttonSecondary"
                  href={buildHref(basePath, {
                    program: selectedProgramId,
                    subject: selectedSubjectId,
                    topic: selectedTopicId,
                    search,
                    library_page: Math.max(1, libraryPage - 1),
                    library_page_size: libraryPageSize,
                  })}
                >
                  Previous Page
                </Link>
              ) : (
                <span className="button buttonGhost questionBankButtonDisabled">Previous Page</span>
              )}
              <span className="questionBankMetaChip">Page {libraryPage}</span>
              {hasNextPage ? (
                <Link
                  className="button buttonSecondary"
                  href={buildHref(basePath, {
                    program: selectedProgramId,
                    subject: selectedSubjectId,
                    topic: selectedTopicId,
                    search,
                    library_page: libraryPage + 1,
                    library_page_size: libraryPageSize,
                  })}
                >
                  Next Page
                </Link>
              ) : (
                <span className="button buttonGhost questionBankButtonDisabled">Next Page</span>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
