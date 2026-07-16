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
      return "Submitted successfully. Results will appear after evaluation is complete.";
    case "published_summary_only":
      return "Result published. Answer review is not available yet.";
    case "review_ready":
      return "Result and answer review are both available now.";
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
      return `This ${experience} has been submitted and is waiting for evaluation.`;
    case "published_summary_only":
      return `This ${experience} result is visible now, but answer review is still locked.`;
    case "review_ready":
      return `This ${experience} is ready to review, with score details and answer review available.`;
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
        laneLabel: "Summary and results",
        laneHelper:
          "Your submission is saved. Check results again once evaluation is complete.",
        summaryCta: "Check attempt status",
        resultsCta: "Check Result Status",
        reviewCta: "Open Answer Review",
      };
    case "published_summary_only":
      return {
        laneLabel: "Results available",
        laneHelper:
          "Your score is available now. Review answers will appear only if this exam allows them.",
        summaryCta: "Open Summary",
        resultsCta: "Open Results",
        reviewCta: "Open Answer Review",
      };
    case "review_ready":
      return {
        laneLabel: "Review ready",
        laneHelper:
          "Your score and answer review are ready. Use this attempt to learn from mistakes and try the next practice step.",
        summaryCta: "Open Summary",
        resultsCta: "Open Results",
        reviewCta: "Open Answer Review",
      };
  }
}
