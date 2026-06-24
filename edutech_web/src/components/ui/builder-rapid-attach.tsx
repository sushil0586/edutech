"use client";

import { useMemo, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { BuilderQuestionPreviewTrigger } from "@/components/ui/builder-question-preview-trigger";
import type { LookupQuestion, LookupTopic } from "@/lib/api/teacher-builder";
import type { CatalogSelectOption } from "@/lib/teacher/option-catalog";

type BuilderRapidAttachProps = {
  action: (formData: FormData) => void | Promise<void>;
  difficultyLabelMap: Record<string, string>;
  difficultyOptions: CatalogSelectOption[];
  examId: string;
  nextOrder: number;
  questionTypeLabelMap: Record<string, string>;
  questions: LookupQuestion[];
  sections: Array<{ id: string; name: string }>;
  topics: LookupTopic[];
};

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

function qualityTone(signal: LookupQuestion["quality_signal"]) {
  if (signal === "ambiguous" || signal === "revision_candidate") return "statusDemo";
  if (signal === "skip_risk" || signal === "hard" || signal === "watch") return "statusWarning";
  if (signal === "healthy") return "statusLive";
  return "statusNeutral";
}

function questionPriorityScore(question: LookupQuestion) {
  const revisionWeightMap: Record<LookupQuestion["revision_priority"], number> = {
    urgent: 80,
    high: 60,
    medium: 35,
    watch: 15,
    none: 0,
  };
  const qualityWeightMap: Record<LookupQuestion["quality_signal"], number> = {
    ambiguous: 50,
    revision_candidate: 45,
    skip_risk: 30,
    hard: 20,
    watch: 12,
    emerging: 8,
    healthy: -20,
  };
  let score = 0;
  score += revisionWeightMap[question.revision_priority];
  score += qualityWeightMap[question.quality_signal];
  if (!question.is_verified) score += 12;
  if (!question.has_explanation) score += 18;
  return score;
}

export function BuilderRapidAttach({
  action,
  difficultyLabelMap,
  difficultyOptions,
  examId,
  nextOrder,
  questionTypeLabelMap,
  questions,
  sections,
  topics,
}: BuilderRapidAttachProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const topicNameMap = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic.name])),
    [topics],
  );

  const questionTypeOptions = useMemo(
    () => Array.from(new Set(questions.map((question) => question.question_type))).sort(),
    [questions],
  );

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  const groupedQuestions = useMemo(() => {
    const groups = new Map<string, { label: string; questions: LookupQuestion[] }>();
    const normalizedSearch = searchTerm.trim().toLowerCase();

    for (const question of questions) {
      const previewText = question.question_text.replaceAll("\n", " ").trim().toLowerCase();
      const topicLabel = question.topic ? topicNameMap.get(question.topic) ?? "Untitled topic" : "No topic";

      if (difficultyFilter && question.difficulty_level !== difficultyFilter) {
        continue;
      }

      if (typeFilter && question.question_type !== typeFilter) {
        continue;
      }

      if (
        normalizedSearch &&
        !previewText.includes(normalizedSearch) &&
        !topicLabel.toLowerCase().includes(normalizedSearch)
      ) {
        continue;
      }

      const groupId = question.topic ?? "ungrouped";
      const label = topicLabel;
      const existing = groups.get(groupId);
      if (existing) {
        existing.questions.push(question);
      } else {
        groups.set(groupId, { label, questions: [question] });
      }
    }

    return Array.from(groups.entries()).map(([id, group]) => ({
      id,
      ...group,
      questions: [...group.questions].sort((left, right) => questionPriorityScore(left) - questionPriorityScore(right)),
    }));
  }, [difficultyFilter, questions, searchTerm, topicNameMap, typeFilter]);

  const selectedQuestions = useMemo(
    () =>
      selectedIds
        .map((id) => questionMap.get(id))
        .filter((question): question is LookupQuestion => Boolean(question)),
    [questionMap, selectedIds],
  );

  const visibleQuestionCount = groupedQuestions.reduce((sum, group) => sum + group.questions.length, 0);
  const visibleHealthyCount = groupedQuestions.reduce(
    (sum, group) => sum + group.questions.filter((question) => question.quality_signal === "healthy" && question.is_verified && question.has_explanation).length,
    0,
  );
  const selectedRevisionQueueCount = selectedQuestions.filter(
    (question) => question.revision_priority === "urgent" || question.revision_priority === "high",
  ).length;

  function toggleQuestion(questionId: string) {
    setSelectedIds((current) =>
      current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId],
    );
  }

  function selectAll() {
    setSelectedIds((current) => Array.from(new Set([...current, ...groupedQuestions.flatMap((group) => group.questions.map((question) => question.id))])));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function selectTopic(groupQuestionIds: string[]) {
    setSelectedIds((current) => Array.from(new Set([...current, ...groupQuestionIds])));
  }

  function clearTopic(groupQuestionIds: string[]) {
    setSelectedIds((current) => current.filter((id) => !groupQuestionIds.includes(id)));
  }

  return (
    <form action={action} className="builderForm builderSubform">
      <input name="exam_id" type="hidden" value={examId} />
      {selectedIds.map((questionId) => (
        <input key={questionId} name="question_ids" type="hidden" value={questionId} />
      ))}

      <div className="builderMiniBanner">
        <div>
          <strong>Rapid attach</strong>
          <span>Pick multiple questions, preview the selection before submission, and attach them in one run using bank defaults.</span>
        </div>
        <div className="builderQuickActionRow">
          <button className="button buttonGhost" onClick={selectAll} type="button">
            Select All
          </button>
          <button className="button buttonGhost" onClick={clearSelection} type="button">
            Clear
          </button>
        </div>
      </div>

      <div className="builderQuickAttachWorkspace">
        <div className="builderQuickAttachMain">
          <div className="builderQuickAttachTopbar">
            <div className="builderGrid compact">
              <label className="fieldStack fieldStackFull">
                <span>Search questions</span>
                <input
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search question text or topic"
                  type="search"
                  value={searchTerm}
                />
              </label>

              <label className="fieldStack">
                <span>Difficulty</span>
                <select onChange={(event) => setDifficultyFilter(event.target.value)} value={difficultyFilter}>
                  <option value="">All difficulty levels</option>
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Question type</span>
                <select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
                  <option value="">All question types</option>
                  {questionTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {questionTypeLabelMap[type] ?? titleCase(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Target section</span>
                <select name="section">
                  <option value="">No section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Start order</span>
                <input defaultValue={nextOrder} min="1" name="question_order" required type="number" />
              </label>
            </div>

            <div className="toggleGrid">
              <label><input defaultChecked name="is_mandatory" type="checkbox" /> Mark all selected as mandatory</label>
            </div>
          </div>

          <div className="builderQuickSelectionSummary">
            <strong>{selectedIds.length}</strong>
            <span>question(s) selected for bulk attach</span>
            <small>{visibleQuestionCount} visible after filters · {visibleHealthyCount} healthy-first candidates</small>
          </div>

          <div className="builderTopicAttachStack">
            {groupedQuestions.map((group) => {
              const groupQuestionIds = group.questions.map((question) => question.id);

              return (
                <section className="builderTopicAttachGroup" key={group.id}>
                  <div className="builderTopicAttachHeader">
                    <div>
                      <strong>{group.label}</strong>
                      <span>{group.questions.length} available question(s)</span>
                    </div>
                    <div className="builderQuickActionRow">
                      <button className="button buttonGhost" onClick={() => selectTopic(groupQuestionIds)} type="button">
                        Select Topic
                      </button>
                      <button className="button buttonGhost" onClick={() => clearTopic(groupQuestionIds)} type="button">
                        Clear Topic
                      </button>
                    </div>
                  </div>

                  <div className="builderQuickAttachGrid">
                    {group.questions.map((question) => {
                      const previewText = question.question_text.replaceAll("\n", " ").trim();
                      const isSelected = selectedIds.includes(question.id);

                      return (
                        <label
                          className={`builderQuickAttachCard ${isSelected ? "builderQuickAttachCardSelected" : ""}`}
                          key={question.id}
                        >
                          <input
                            checked={isSelected}
                            onChange={() => toggleQuestion(question.id)}
                            type="checkbox"
                          />
                          <div className="builderQuickAttachBody">
                            <div className="builderQuickAttachMeta">
                              <span className="statusPill statusDemo">
                                {questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type)}
                              </span>
                              <span className="statusPill statusLive">{question.default_marks} marks</span>
                              <span className={`statusPill ${qualityTone(question.quality_signal)}`}>
                                {titleCase(question.quality_signal)}
                              </span>
                              <span className={`statusPill ${qualityTone(question.quality_signal)}`}>
                                {titleCase(question.revision_priority)} priority
                              </span>
                              {question.passage_title ? (
                                <span className="statusPill statusDemo">Comprehension</span>
                              ) : null}
                            </div>
                            <strong>{previewText.slice(0, 160)}{previewText.length > 160 ? "..." : ""}</strong>
                            <p>
                              {difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level)} difficulty
                              {question.passage_title ? ` · ${question.passage_title}` : ""}
                              {` · wrong ${Math.round(question.wrong_rate)}% · skip ${Math.round(question.skip_rate)}%`}
                            </p>
                            <small className="builderQuickAttachHint">{question.quality_note}</small>
                            <div className="builderQuickAttachPreviewRow">
                              <BuilderQuestionPreviewTrigger
                                buttonClassName="button buttonGhost builderQuickAttachPreviewButton"
                                buttonLabel="Preview"
                                difficultyLabel={difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level)}
                                explanation={question.explanation}
                                marksLabel={`${question.default_marks} marks`}
                                negativeMarksLabel={`${question.negative_marks} negative`}
                                questionId={question.id}
                                questionText={question.question_text}
                                questionTypeLabel={questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type)}
                                topicLabel={question.topic ? topicNameMap.get(question.topic) ?? "Untitled topic" : "No topic"}
                              />
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {!groupedQuestions.length ? (
              <div className="builderEmptyState">
                <strong>No questions match the current filters</strong>
                <p>Broaden the search or reset difficulty and question-type filters to see more available items.</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="builderSelectionPreviewPanel">
          <div className="builderSelectionPreviewHeader">
            <div>
              <strong>Selection preview</strong>
              <p>Review the exact questions that will be attached next.</p>
            </div>
            <span className="statusPill statusLive">{selectedQuestions.length} selected</span>
          </div>

          <div className="builderSelectionPreviewStats">
            <article>
              <span>Visible now</span>
              <strong>{visibleQuestionCount}</strong>
            </article>
            <article>
              <span>Healthy now</span>
              <strong>{visibleHealthyCount}</strong>
            </article>
            <article>
              <span>Topic groups</span>
              <strong>{groupedQuestions.length}</strong>
            </article>
            <article>
              <span>Starting order</span>
              <strong>{nextOrder}</strong>
            </article>
            <article>
              <span>Selected risk</span>
              <strong>{selectedRevisionQueueCount}</strong>
            </article>
          </div>

          <div className="builderSelectionPreviewList">
            {selectedQuestions.map((question, index) => {
              const topicLabel = question.topic ? topicNameMap.get(question.topic) ?? "Unmapped topic" : "No topic";

              return (
                <article className="builderSelectionPreviewCard" key={question.id}>
                  <div className="builderSelectionPreviewMeta">
                    <span>#{index + 1}</span>
                    <span>{question.default_marks} marks</span>
                  </div>
                  <strong>{question.question_text.replaceAll("\n", " ").trim().slice(0, 120)}{question.question_text.trim().length > 120 ? "..." : ""}</strong>
                  <p>
                    {topicLabel} · {questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type)} · {difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level)}
                    {question.passage_title ? ` · ${question.passage_title}` : ""}
                  </p>
                  <div className="builderQuestionBankChips">
                    <span className={`statusPill ${qualityTone(question.quality_signal)}`}>
                      {titleCase(question.quality_signal)}
                    </span>
                    <span className={`statusPill ${qualityTone(question.quality_signal)}`}>
                      {titleCase(question.revision_priority)} priority
                    </span>
                  </div>
                  <small className="builderQuickAttachHint">{question.quality_note}</small>
                  <div className="builderSelectionPreviewAction">
                    <BuilderQuestionPreviewTrigger
                      buttonClassName="button buttonGhost builderQuickAttachPreviewButton"
                      buttonLabel="Open Preview"
                      difficultyLabel={difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level)}
                      explanation={question.explanation}
                      marksLabel={`${question.default_marks} marks`}
                      negativeMarksLabel={`${question.negative_marks} negative`}
                      questionId={question.id}
                      questionText={question.question_text}
                      questionTypeLabel={questionTypeLabelMap[question.question_type] ?? titleCase(question.question_type)}
                      topicLabel={topicLabel}
                    />
                  </div>
                </article>
              );
            })}

            {!selectedQuestions.length ? (
              <div className="builderEmptyState builderSelectionPreviewEmpty">
                <strong>No bulk selection yet</strong>
                <p>Choose questions from the grouped bank list to build a preview before attaching them.</p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="settingsActionRow">
        <ActionSubmitButton
          className="button buttonPrimary"
          disabled={!selectedIds.length}
          idleLabel="Attach Selected Questions"
          pendingLabel="Attaching Selected..."
        />
      </div>
    </form>
  );
}
