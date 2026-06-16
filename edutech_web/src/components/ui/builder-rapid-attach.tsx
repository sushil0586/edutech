"use client";

import { useMemo, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
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

    return Array.from(groups.entries()).map(([id, group]) => ({ id, ...group }));
  }, [difficultyFilter, questions, searchTerm, topicNameMap, typeFilter]);

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
          <span>Pick multiple questions and attach them in one run using default marks from the bank.</span>
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
        <small>{groupedQuestions.reduce((sum, group) => sum + group.questions.length, 0)} visible after filters</small>
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
                        </div>
                        <strong>{previewText.slice(0, 160)}{previewText.length > 160 ? "..." : ""}</strong>
                        <p>{difficultyLabelMap[question.difficulty_level] ?? titleCase(question.difficulty_level)} difficulty</p>
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
