"use client";

import { useMemo, useState } from "react";

type RubricCriterion = {
  key: string;
  label: string;
  max_score: string;
  display_order: number;
  reviewer_hint: string;
};

type RubricScore = {
  criterion_key: string;
  criterion_label: string;
  max_score: string;
  awarded_score: string;
  note: string;
};

type TeacherRubricReviewFieldsProps = {
  criteria: RubricCriterion[];
  initialScores: RubricScore[];
};

function buildInitialScores(
  criteria: RubricCriterion[],
  initialScores: RubricScore[],
): RubricScore[] {
  const existingByKey = new Map(initialScores.map((item) => [item.criterion_key, item]));
  return criteria.map((criterion) => {
    const existing = existingByKey.get(criterion.key);
    return {
      criterion_key: criterion.key,
      criterion_label: criterion.label,
      max_score: criterion.max_score,
      awarded_score: existing?.awarded_score ?? "",
      note: existing?.note ?? "",
    };
  });
}

export function TeacherRubricReviewFields({
  criteria,
  initialScores,
}: TeacherRubricReviewFieldsProps) {
  const [scores, setScores] = useState(() => buildInitialScores(criteria, initialScores));

  const derivedTotal = useMemo(() => {
    const total = scores.reduce((sum, score) => sum + Number(score.awarded_score || 0), 0);
    return total.toFixed(2);
  }, [scores]);

  return (
    <div className="teacherRubricReviewStack">
      <input name="marks_awarded" type="hidden" value={derivedTotal} />
      <input name="rubric_scores_json" type="hidden" value={JSON.stringify(scores)} />

      <div className="teacherRubricReviewSummary">
        <strong>Rubric total</strong>
        <span>{derivedTotal}</span>
      </div>

      <div className="teacherRubricReviewGrid">
        {criteria.map((criterion, index) => (
          <section className="teacherRubricCriterionCard" key={criterion.key}>
            <div className="sectionHeading">
              <strong>{criterion.label}</strong>
              <span>{criterion.max_score} max</span>
            </div>

            {criterion.reviewer_hint ? (
              <p className="teacherRubricCriterionHint">{criterion.reviewer_hint}</p>
            ) : null}

            <label className="fieldStack">
              <span>Score</span>
              <input
                max={criterion.max_score}
                min="0"
                onChange={(event) =>
                  setScores((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, awarded_score: event.target.value }
                        : item,
                    ),
                  )
                }
                step="0.01"
                type="number"
                value={scores[index]?.awarded_score ?? ""}
              />
            </label>

            <label className="fieldStack fieldStackFull">
              <span>Criterion note</span>
              <textarea
                onChange={(event) =>
                  setScores((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, note: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder={`Add feedback for ${criterion.label.toLowerCase()}`}
                rows={3}
                value={scores[index]?.note ?? ""}
              />
            </label>
          </section>
        ))}
      </div>
    </div>
  );
}
