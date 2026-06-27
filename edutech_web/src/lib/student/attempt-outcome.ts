import { titleCaseState } from "@/lib/student/formatters";

export type AttemptOutcomeState =
  | "awaiting_publication"
  | "published_summary_only"
  | "review_ready";

export function resolveAttemptOutcomeState(args: {
  resultVisible: boolean;
  reviewAvailable: boolean;
}) {
  if (!args.resultVisible) return "awaiting_publication" as const;
  if (!args.reviewAvailable) return "published_summary_only" as const;
  return "review_ready" as const;
}

export function attemptOutcomeLabel(state: AttemptOutcomeState) {
  switch (state) {
    case "awaiting_publication":
      return "Awaiting publication";
    case "published_summary_only":
      return "Result published";
    case "review_ready":
      return "Review ready";
  }
}

export function attemptOutcomeResultsLabel(state: AttemptOutcomeState) {
  switch (state) {
    case "awaiting_publication":
      return "Evaluation pending";
    case "published_summary_only":
    case "review_ready":
      return "Result published";
  }
}

export function attemptOutcomeReviewLabel(state: AttemptOutcomeState) {
  switch (state) {
    case "awaiting_publication":
    case "published_summary_only":
      return "Review locked";
    case "review_ready":
      return "Review available";
  }
}

export function attemptOutcomeProgressLabel(state: AttemptOutcomeState) {
  switch (state) {
    case "awaiting_publication":
      return "Step 1 complete: submitted. Step 2 pending: evaluation and result publication. Step 3 pending: answer review remains locked.";
    case "published_summary_only":
      return "Step 1 complete: submitted. Step 2 complete: result published. Step 3 pending: answer review is still locked.";
    case "review_ready":
      return "All release steps complete: submission confirmed, result published, and answer review is now available.";
  }
}

export function attemptOutcomeTone(state: AttemptOutcomeState) {
  switch (state) {
    case "awaiting_publication":
      return "demo" as const;
    case "published_summary_only":
      return "warning" as const;
    case "review_ready":
      return "live" as const;
  }
}

export function attemptOutcomeHelper(state: AttemptOutcomeState, examType: string) {
  const experience =
    examType === "practice"
      ? "practice set"
      : examType === "mock_exam"
        ? "mock test"
        : titleCaseState(examType);

  switch (state) {
    case "awaiting_publication":
      return `This ${experience} has been submitted, but learner-visible results are still waiting for evaluation and backend publication rules to complete.`;
    case "published_summary_only":
      return `This ${experience} result is now visible, but answer review is still locked by backend policy.`;
    case "review_ready":
      return `This ${experience} is fully released for the learner: result summary is visible and answer review is currently available.`;
  }
}

export function reviewVisibilityLabel(args: {
  showExplanations: boolean;
  showCorrectAnswers: boolean;
}) {
  if (args.showExplanations) return "Review available";
  if (args.showCorrectAnswers) return "Review available";
  return "Review limited";
}

export function reviewVisibilityTone(args: {
  showExplanations: boolean;
  showCorrectAnswers: boolean;
}) {
  if (args.showExplanations) return "live" as const;
  if (args.showCorrectAnswers) return "warning" as const;
  return "demo" as const;
}

export function attemptOutcomeJourney(state: AttemptOutcomeState) {
  switch (state) {
    case "awaiting_publication":
      return {
        laneLabel: "Summary -> Results",
        laneHelper:
          "Use summary to confirm submission, then check results until evaluation and publication are complete.",
        summaryCta: "Check attempt status",
        resultsCta: "Check Result Status",
        reviewCta: "Open Answer Review",
      };
    case "published_summary_only":
      return {
        laneLabel: "Summary -> Results",
        laneHelper:
          "Use summary for release state and results for published score details while answer review remains locked.",
        summaryCta: "Open Summary",
        resultsCta: "Open Results",
        reviewCta: "Open Answer Review",
      };
    case "review_ready":
      return {
        laneLabel: "Summary -> Results -> Review",
        laneHelper:
          "Use summary for release state, results for score reporting, and answer review for question-level learning.",
        summaryCta: "Open Summary",
        resultsCta: "Open Results",
        reviewCta: "Open Answer Review",
      };
  }
}
