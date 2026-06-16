import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
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

export default function AttemptReviewScreen() {
  const router = useRouter();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const accessToken = useSessionStore((state) => state.accessToken);

  const query = useQuery({
    queryKey: ["student.attempt.review", attemptId, accessToken],
    queryFn: async () => fetchStudentAttemptReview(attemptId as string, accessToken as string),
    enabled: Boolean(attemptId && accessToken),
  });

  const review = query.data ?? null;

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
                onPress={() => router.replace(`/(attempt)/summary/${review.id}`)}
              />
              <ActionButton
                label="Open Analytics"
                tone="secondary"
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
      ) : null}

      <SectionBlock
        title="Review state"
        subtitle="What the learner can actually see in this review mode"
      >
        {review ? (
          <View style={review.show_explanations ? appStyles.successPanel : appStyles.mutedPanel}>
            <Text style={appStyles.body}>{reviewCopy(review)}</Text>
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
        subtitle="Inspect how each reviewed question was handled"
      >
        {review?.review_questions.length ? (
          review.review_questions.map((question) => {
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
                  <View style={appStyles.chip}>
                    <Text style={appStyles.chipText}>Marks {question.marks_awarded}</Text>
                  </View>
                </View>
                {review.show_explanations && question.explanation ? (
                  <View style={appStyles.emphasisPanel}>
                    <Text style={appStyles.body}>{question.explanation}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <StatePanel
            title="No review items returned"
            body="No review questions were returned for this attempt. Review availability may still be limited by backend policy."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
