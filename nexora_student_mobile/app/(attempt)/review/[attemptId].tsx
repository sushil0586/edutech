import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { SkeletonLine, SkeletonList, SkeletonMetricGrid } from "@/components/skeleton";
import { fetchStudentAttemptReview } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

function reviewCopy(review: {
  show_explanations: boolean;
  show_correct_answers: boolean;
}) {
  if (review.show_explanations) {
    return "This review includes correctness and explanations, so the learner can use it as a learning pass.";
  }
  if (review.show_correct_answers) {
    return "Correct answers are visible here, but detailed explanations are still hidden by policy.";
  }
  return "This review is limited by current exam policy. Structure is visible, but solution visibility is restricted.";
}

function resultChip(question: { result_status: string }) {
  if (question.result_status === "correct") {
    return { container: appStyles.chipSuccess, text: appStyles.chipTextSuccess, label: "Correct" };
  }
  if (question.result_status === "incorrect") {
    return { container: appStyles.chipDanger, text: appStyles.chipTextDanger, label: "Incorrect" };
  }
  return { container: appStyles.chipWarm, text: appStyles.chipTextWarm, label: "Skipped" };
}

function improvementPrompt(review: {
  correct_answers: number;
  incorrect_answers: number;
  skipped_questions: number;
}) {
  if (review.skipped_questions > review.incorrect_answers && review.skipped_questions > 0) {
    return "The main opportunity here is attempt confidence. Too many questions were left blank compared with incorrect answers.";
  }

  if (review.incorrect_answers > review.correct_answers) {
    return "The main opportunity here is concept revision. Incorrect answers outnumber correct ones in this attempt.";
  }

  return "The attempt has a useful base. Focus on the incorrect and review-marked questions first before moving on.";
}

const REVIEW_PAGE_SIZE = 8;

type ReviewFilter = "all" | "incorrect" | "skipped" | "marked";

export default function AttemptReviewScreen() {
  const router = useRouter();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const accessToken = useSessionStore((state) => state.accessToken);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [reviewPage, setReviewPage] = useState(1);

  const query = useQuery({
    queryKey: ["student.attempt.review", attemptId, accessToken],
    queryFn: async () => fetchStudentAttemptReview(attemptId as string, accessToken as string),
    enabled: Boolean(attemptId && accessToken),
  });

  const review = query.data ?? null;
  const canShowExplanations = review?.show_explanations ?? false;
  const filteredQuestions = useMemo(() => {
    if (!review) {
      return [];
    }

    switch (reviewFilter) {
      case "incorrect":
        return review.review_questions.filter((question) => question.result_status === "incorrect");
      case "skipped":
        return review.review_questions.filter((question) => question.result_status === "skipped");
      case "marked":
        return review.review_questions.filter((question) => question.is_marked_for_review);
      case "all":
      default:
        return review.review_questions;
    }
  }, [review, reviewFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / REVIEW_PAGE_SIZE));
  const pagedQuestions = useMemo(() => {
    const startIndex = (reviewPage - 1) * REVIEW_PAGE_SIZE;
    return filteredQuestions.slice(startIndex, startIndex + REVIEW_PAGE_SIZE);
  }, [filteredQuestions, reviewPage]);

  useEffect(() => {
    setReviewPage(1);
  }, [reviewFilter, review?.id]);

  useEffect(() => {
    if (reviewPage > totalPages) {
      setReviewPage(totalPages);
    }
  }, [reviewPage, totalPages]);

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Attempt Review"
        badge={review?.review_mode ?? "Review"}
        title={review ? `${review.exam_title} review` : "Loading review"}
        description={
          review
            ? `${review.exam_type} · attempt ${review.attempt_no} · ${review.review_questions.length} review items`
            : "Loading the backend review workspace."
        }
        helper={
          query.isLoading
            ? "Loading review content..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load review."
              : review
                ? reviewCopy(review)
                : "No review data was returned."
        }
        actions={
          review ? (
            <View style={appStyles.rowWrap}>
              <ActionButton
                label="Back to Summary"
                testID="attempt-review-back-summary-button"
                onPress={() => router.replace(`/(attempt)/summary/${review.id}`)}
              />
              <ActionButton
                label="Open Results"
                tone="secondary"
                testID="attempt-review-open-results-button"
                onPress={() => router.replace("../../results")}
              />
              <ActionButton
                label="Open Analytics"
                tone="secondary"
                testID="attempt-review-open-analytics-button"
                onPress={() => router.replace("/(student)/(tabs)/analytics")}
              />
            </View>
          ) : undefined
        }
      />
      {query.isError ? (
        <StatePanel
          tone="error"
          title="Review unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load review."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}

      {review ? (
        <View style={appStyles.metricGrid}>
          <MetricCard
            label="Percentage"
            value={`${review.percentage}%`}
            helper="Backend review percentage"
            soft
          />
          <MetricCard
            label="Correct"
            value={String(review.correct_answers)}
            helper={`${review.incorrect_answers} incorrect`}
          />
          <MetricCard
            label="Review Items"
            value={String(review.review_questions.length)}
            helper={review.show_explanations ? "Explanations visible" : "Explanations limited"}
            soft
          />
          <MetricCard
            label="Final Score"
            value={review.final_score}
            helper="Post-submit computed score"
          />
        </View>
      ) : query.isLoading ? (
        <SkeletonMetricGrid />
      ) : null}

      <SectionBlock
        title="Review state"
        subtitle="What the learner can actually see in this review mode"
      >
        {query.isLoading ? (
          <View style={appStyles.mutedPanel}>
            <SkeletonLine width="94%" height={14} />
            <SkeletonLine width="86%" height={14} soft />
            <SkeletonLine width="66%" height={12} />
          </View>
        ) : review ? (
          <View style={review.show_explanations ? appStyles.successPanel : appStyles.mutedPanel}>
            <Text style={appStyles.body}>{reviewCopy(review)}</Text>
            <Text style={appStyles.body}>{improvementPrompt(review)}</Text>
            <Text style={appStyles.helper}>
              Correct answers: {review.show_correct_answers ? "visible" : "hidden"} · Explanations:{" "}
              {review.show_explanations ? "visible" : "hidden"}
            </Text>
          </View>
        ) : (
          <StatePanel
            title="Waiting for review-state guidance"
            body="Review-state guidance will appear once the backend review payload loads."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Question review"
        subtitle="Inspect reviewed questions in smaller phone-friendly batches"
      >
        {review ? (
          <View style={appStyles.rowWrap}>
            <ActionButton
              label={`All (${review.review_questions.length})`}
              tone={reviewFilter === "all" ? "primary" : "secondary"}
              compact
              testID="attempt-review-filter-all-button"
              onPress={() => setReviewFilter("all")}
            />
            <ActionButton
              label={`Incorrect (${review.incorrect_answers})`}
              tone={reviewFilter === "incorrect" ? "primary" : "secondary"}
              compact
              testID="attempt-review-filter-incorrect-button"
              onPress={() => setReviewFilter("incorrect")}
            />
            <ActionButton
              label={`Skipped (${review.skipped_questions})`}
              tone={reviewFilter === "skipped" ? "primary" : "secondary"}
              compact
              testID="attempt-review-filter-skipped-button"
              onPress={() => setReviewFilter("skipped")}
            />
            <ActionButton
              label={`Marked (${review.review_questions.filter((question) => question.is_marked_for_review).length})`}
              tone={reviewFilter === "marked" ? "primary" : "secondary"}
              compact
              testID="attempt-review-filter-marked-button"
              onPress={() => setReviewFilter("marked")}
            />
          </View>
        ) : null}
        {query.isLoading ? (
          <SkeletonList count={3} />
        ) : pagedQuestions.length ? (
          pagedQuestions.map((question) => {
            const tone = resultChip(question);
            return (
              <View key={question.exam_question_id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>
                    {question.section_name || "General"} · Q{question.question_order}
                  </Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.questionStem}>{question.question_text}</Text>
                {question.options.length ? (
                  question.options.map((option) => (
                    <View
                      key={option.id}
                      style={[
                        appStyles.optionCard,
                        option.is_selected || option.is_correct ? appStyles.optionCardSelected : null,
                      ]}
                    >
                      <View style={appStyles.optionCardHeader}>
                        <Text style={appStyles.optionMeta}>Option</Text>
                        <Text style={appStyles.helper}>
                          {option.is_selected && option.is_correct
                            ? "Selected and correct"
                            : option.is_selected
                              ? "Selected"
                              : option.is_correct
                                ? "Correct answer"
                                : ""}
                        </Text>
                      </View>
                      <Text style={appStyles.body}>{option.option_text}</Text>
                    </View>
                  ))
                ) : (
                  <View style={appStyles.mutedPanel}>
                    <Text style={appStyles.helper}>
                      Written response: {question.answer_text || "No written answer captured."}
                    </Text>
                  </View>
                )}
                <View style={appStyles.rowWrap}>
                  {question.accepted_answers.length ? (
                    <View style={[appStyles.chip, appStyles.chipPrimary]}>
                      <Text style={[appStyles.chipText, appStyles.chipTextPrimary]}>
                        Accepted: {question.accepted_answers.join(", ")}
                      </Text>
                    </View>
                  ) : null}
                  {question.is_marked_for_review ? (
                    <View style={[appStyles.chip, appStyles.chipWarm]}>
                      <Text style={[appStyles.chipText, appStyles.chipTextWarm]}>Marked during attempt</Text>
                    </View>
                  ) : null}
                  <View style={appStyles.chip}>
                    <Text style={appStyles.chipText}>Marks {question.marks_awarded}</Text>
                  </View>
                </View>
                {question.result_status === "incorrect" ? (
                  <View style={appStyles.errorPanel}>
                    <Text style={appStyles.helper}>
                      Revisit this question first in your next revision cycle.
                    </Text>
                  </View>
                ) : null}
                {question.result_status === "skipped" ? (
                  <View style={appStyles.mutedPanel}>
                    <Text style={appStyles.helper}>
                      This question was skipped. Decide whether it was a time-management choice or a concept gap.
                    </Text>
                  </View>
                ) : null}
                {canShowExplanations && question.explanation ? (
                  <View style={appStyles.emphasisPanel}>
                    <Text style={appStyles.body}>{question.explanation}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <StatePanel
            title={review ? "No questions in this filter" : "No review items returned"}
            body={
              review
                ? "Try a different review filter to inspect another slice of this attempt."
                : "No review questions were returned for this attempt. Review availability may still be limited by backend policy."
            }
          />
        )}
        {review && filteredQuestions.length ? (
          <View style={appStyles.rowBetween}>
            <Text style={appStyles.helper}>
              Page {reviewPage} of {totalPages} · Showing{" "}
              {Math.min((reviewPage - 1) * REVIEW_PAGE_SIZE + 1, filteredQuestions.length)}-
              {Math.min(reviewPage * REVIEW_PAGE_SIZE, filteredQuestions.length)} of {filteredQuestions.length}
            </Text>
            <View style={appStyles.rowWrap}>
              <ActionButton
                label="Previous"
                tone="secondary"
                compact
                testID="attempt-review-previous-page-button"
                disabled={reviewPage === 1}
                onPress={() => setReviewPage((currentPage) => Math.max(1, currentPage - 1))}
              />
              <ActionButton
                label="Next"
                compact
                testID="attempt-review-next-page-button"
                disabled={reviewPage === totalPages}
                onPress={() => setReviewPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              />
            </View>
          </View>
        ) : null}
      </SectionBlock>
    </ScreenShell>
  );
}
