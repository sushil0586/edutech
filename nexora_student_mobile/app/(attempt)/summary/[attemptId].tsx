import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentAttemptSummary } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

function outcomeCopy(summary: {
  result_visible: boolean;
  review_available: boolean;
  exam_type: string;
}) {
  if (summary.exam_type === "practice" && summary.review_available) {
    return "Practice feedback is ready immediately. Review the attempt and continue improving.";
  }
  if (summary.review_available) {
    return "Your attempt is submitted and review is already available for this exam.";
  }
  if (summary.result_visible) {
    return "Your result is visible now, but detailed review may still be controlled by exam policy.";
  }
  return "Your attempt is safely submitted. Result and review will unlock when the backend policy allows them.";
}

function nextStepCopy(summary: {
  review_available: boolean;
  result_visible: boolean;
  attempted_questions: number;
  total_questions: number;
}) {
  if (summary.review_available) {
    return "Best next step: open review while the attempt is still fresh, then move to analytics to spot repeat patterns.";
  }

  if (summary.result_visible) {
    return "Best next step: open analytics to understand the broader pattern behind this result and decide what to practice next.";
  }

  if (summary.attempted_questions < summary.total_questions) {
    return "Some questions were left unanswered. Return to the dashboard and plan a calmer follow-up attempt if policy allows.";
  }

  return "Your submission is complete. You can return to the dashboard now and check analytics again once result processing finishes.";
}

export default function AttemptSummaryScreen() {
  const router = useRouter();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const accessToken = useSessionStore((state) => state.accessToken);

  const query = useQuery({
    queryKey: ["student.attempt.summary", attemptId, accessToken],
    queryFn: async () => fetchStudentAttemptSummary(attemptId as string, accessToken as string),
    enabled: Boolean(attemptId && accessToken),
  });

  const summary = query.data ?? null;
  const attemptedRatio = summary
    ? `${summary.attempted_questions}/${summary.total_questions}`
    : "--";

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Attempt Summary"
        badge={summary?.status ?? "Post-submit"}
        title={summary ? `${summary.exam_title} completed` : "Loading summary"}
        description={
          summary
            ? `${summary.exam_type} · attempt ${summary.attempt_no} · ${summary.total_questions} questions`
            : "Reading the backend post-submit summary state."
        }
        helper={
          query.isLoading
            ? "Loading submitted attempt summary..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load the attempt summary."
              : summary
                ? outcomeCopy(summary)
                : "No summary was returned."
        }
        actions={
          summary ? (
            <View style={appStyles.rowWrap}>
              {summary.review_available ? (
                <ActionButton
                  label="Review Attempt"
                  onPress={() => router.replace(`/(attempt)/review/${summary.id}`)}
                  testID="attempt-summary-review-button"
                />
              ) : null}
              {summary.result_visible ? (
                <ActionButton
                  label="Open Results"
                  tone={summary.review_available ? "secondary" : "primary"}
                  onPress={() => router.replace("../../results")}
                  testID="attempt-summary-open-results-button"
                />
              ) : null}
              <ActionButton
                label="Open Analytics"
                tone={summary.result_visible || summary.review_available ? "secondary" : "primary"}
                onPress={() => router.replace("/(student)/(tabs)/analytics")}
                testID="attempt-summary-open-analytics-button"
              />
              <ActionButton
                label="Back to Dashboard"
                tone="secondary"
                onPress={() => router.replace("/(student)/(tabs)/dashboard")}
                testID="attempt-summary-back-dashboard-button"
              />
            </View>
          ) : undefined
        }
      />
      {query.isError ? (
        <StatePanel
          tone="error"
          title="Summary unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load the attempt summary."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}

      {summary ? (
        <View style={appStyles.metricGrid}>
          <MetricCard
            label="Attempted"
            value={attemptedRatio}
            helper="Saved questions in this submission"
            soft
          />
          <MetricCard
            label="Correct"
            value={summary.correct_answers !== null ? String(summary.correct_answers) : "--"}
            helper="Visible only when processed"
          />
          <MetricCard
            label="Final Score"
            value={summary.final_score ?? "--"}
            helper="Backend-computed attempt score"
            soft
          />
          <MetricCard
            label="Percentage"
            value={summary.percentage ? `${summary.percentage}%` : "--"}
            helper="Available when result visibility allows"
          />
        </View>
      ) : null}

      <SectionBlock
        title="Submission state"
        subtitle="This is the safe handoff after the live attempt runtime"
      >
        {summary ? (
          <View style={summary.result_visible || summary.review_available ? appStyles.successPanel : appStyles.mutedPanel}>
            <Text style={appStyles.body}>{outcomeCopy(summary)}</Text>
            <Text style={appStyles.helper}>
              Result visibility: {summary.result_visible ? "visible" : "pending"} · Review:{" "}
              {summary.review_available ? "available" : "locked"}
            </Text>
          </View>
        ) : (
          <StatePanel
            title="Waiting for submission state"
            body="The post-submit summary state will appear here once the backend summary query resolves."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="What happens next"
        subtitle="Guide the learner without making them guess"
      >
        {summary ? (
          <View style={appStyles.column}>
            <View style={appStyles.emphasisPanel}>
              <Text style={appStyles.body}>{nextStepCopy(summary)}</Text>
            </View>
            <Text style={appStyles.body}>
              {summary.review_available
                ? "Start with review if you want question-level learning while the memory of the attempt is still strong."
                : "If detailed review is not open yet, analytics is the best place to understand performance direction."}
            </Text>
            <View style={appStyles.rowWrap}>
              <View style={[appStyles.chip, summary.review_available ? appStyles.chipSuccess : appStyles.chipWarm]}>
                <Text
                  style={[
                    appStyles.chipText,
                    summary.review_available ? appStyles.chipTextSuccess : appStyles.chipTextWarm,
                  ]}
                >
                  {summary.review_available ? "Review enabled" : "Waiting for review"}
                </Text>
              </View>
              <View style={[appStyles.chip, summary.result_visible ? appStyles.chipSuccess : appStyles.chipWarm]}>
                <Text
                  style={[
                    appStyles.chipText,
                    summary.result_visible ? appStyles.chipTextSuccess : appStyles.chipTextWarm,
                  ]}
                >
                  {summary.result_visible ? "Result visible" : "Result pending"}
                </Text>
              </View>
              <View style={appStyles.chip}>
                <Text style={appStyles.chipText}>
                  {summary.attempted_questions} attempted · {Math.max(summary.total_questions - summary.attempted_questions, 0)} unattempted
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <StatePanel
            title="Waiting for next-step guidance"
            body="Result-state guidance will appear automatically from the backend summary response."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
