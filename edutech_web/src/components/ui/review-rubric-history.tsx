type ReviewRubricHistoryProps = {
  metadata: Record<string, unknown> | null | undefined;
};

type RubricHistoryScore = {
  criterion_key: string;
  criterion_label: string;
  max_score: string;
  awarded_score: string;
  note: string;
};

function readRubricSnapshot(metadata: Record<string, unknown> | null | undefined): {
  rubricTotal: string;
  rubricScores: RubricHistoryScore[];
  previousRubricTotal: string;
  previousRubricScores: RubricHistoryScore[];
} | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const rubricTotal = String(metadata.rubric_total ?? "").trim();
  const previousRubricTotal = String(metadata.previous_rubric_total ?? "").trim();
  const rawScores = Array.isArray(metadata.rubric_scores) ? metadata.rubric_scores : [];
  const rawPreviousScores = Array.isArray(metadata.previous_rubric_scores)
    ? metadata.previous_rubric_scores
    : [];

  const normalizeScores = (scores: unknown[]) =>
    scores
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        criterion_key: String(item.criterion_key ?? "").trim(),
        criterion_label: String(item.criterion_label ?? item.criterion_key ?? "").trim(),
        max_score: String(item.max_score ?? "").trim(),
        awarded_score: String(item.awarded_score ?? "").trim(),
        note: String(item.note ?? "").trim(),
      }))
      .filter((item) => item.criterion_key && item.awarded_score);

  const rubricScores = normalizeScores(rawScores);
  const previousRubricScores = normalizeScores(rawPreviousScores);

  if (!rubricScores.length) {
    return null;
  }

  return {
    rubricTotal,
    rubricScores,
    previousRubricTotal,
    previousRubricScores,
  };
}

function formatDelta(current: string, previous: string) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  const delta = currentValue - previousValue;
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.001) {
    return "No change";
  }
  return `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;
}

export function ReviewRubricHistory({ metadata }: ReviewRubricHistoryProps) {
  const snapshot = readRubricSnapshot(metadata);

  if (!snapshot) {
    return null;
  }

  const previousByKey = new Map(
    snapshot.previousRubricScores.map((score) => [score.criterion_key, score]),
  );

  return (
    <div className="teacherRubricReviewStack">
      <div className="teacherRubricReviewSummary">
        <strong>Rubric snapshot</strong>
        <span>{snapshot.rubricTotal || "0.00"}</span>
      </div>

      {snapshot.previousRubricScores.length ? (
        <div className="teacherRubricReviewDelta">
          <span>Previous total</span>
          <strong>{snapshot.previousRubricTotal || "0.00"}</strong>
          <span>Delta</span>
          <strong>{formatDelta(snapshot.rubricTotal, snapshot.previousRubricTotal)}</strong>
        </div>
      ) : null}

      <div className="teacherRubricReviewGrid">
        {snapshot.rubricScores.map((score) => {
          const previous = previousByKey.get(score.criterion_key);
          const deltaLabel = previous ? formatDelta(score.awarded_score, previous.awarded_score) : "";

          return (
            <section className="teacherRubricCriterionCard" key={score.criterion_key}>
              <div className="sectionHeading">
                <strong>{score.criterion_label}</strong>
                <span>
                  {score.awarded_score}
                  {score.max_score ? ` / ${score.max_score}` : ""}
                </span>
              </div>
              {previous ? (
                <p className="teacherRubricCriterionDelta">
                  Previous: {previous.awarded_score}
                  {deltaLabel === "No change" ? " (No change)" : ` (${deltaLabel})`}
                </p>
              ) : null}
              {score.note ? <p className="teacherRubricCriterionHint">{score.note}</p> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
