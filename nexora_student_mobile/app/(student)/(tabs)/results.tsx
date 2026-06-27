import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentResults } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";
import type { StudentResult } from "@/types/api";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function metadataSubjectName(metadata: Record<string, unknown>) {
  const subjectName = metadata.subject_name;
  return typeof subjectName === "string" ? subjectName.trim() : "";
}

function matchesSelectedSubject(subjectName: string, selectedSubject: string) {
  if (normalize(selectedSubject) === "overall") {
    return true;
  }

  return normalize(subjectName) === normalize(selectedSubject);
}

function resultTone(result: StudentResult) {
  if (!result.is_published) {
    return {
      container: appStyles.chipWarm,
      text: appStyles.chipTextWarm,
      label: "Pending",
    };
  }

  if (result.review_available) {
    return {
      container: appStyles.chipSuccess,
      text: appStyles.chipTextSuccess,
      label: "Review Ready",
    };
  }

  if (normalize(result.result_status) === "pass") {
    return {
      container: appStyles.chipPrimary,
      text: appStyles.chipTextPrimary,
      label: "Published",
    };
  }

  return {
    container: appStyles.chipDanger,
    text: appStyles.chipTextDanger,
    label: "Needs Work",
  };
}

function statusMessage(result: StudentResult) {
  if (!result.is_published) {
    return "This attempt is submitted, but learner-visible results are still controlled by backend release policy.";
  }

  if (result.review_available) {
    return "Result is published and question-level review is already available from mobile.";
  }

  return "Result is visible now, but detailed review is still locked by exam policy.";
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ResultsScreen() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const profile = useSessionStore((state) => state.profile);
  const selectedSubject = useSessionStore((state) => state.selectedSubject);
  const setSelectedSubject = useSessionStore((state) => state.setSelectedSubject);

  const query = useQuery({
    queryKey: ["student.results", accessToken],
    queryFn: async () => fetchStudentResults(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const subjectOptions = profile?.student_context?.subject_options ?? [];
  const scopedResults = useMemo(() => {
    const results = [...(query.data ?? [])];
    results.sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );

    if (normalize(selectedSubject) === "overall") {
      return results;
    }

    return results.filter((result) => {
      const subjectName = metadataSubjectName(result.metadata);
      return subjectName ? matchesSelectedSubject(subjectName, selectedSubject) : false;
    });
  }, [query.data, selectedSubject]);

  const publishedResults = scopedResults.filter((result) => result.is_published);
  const reviewReadyResults = scopedResults.filter((result) => result.review_available);
  const pendingResults = scopedResults.filter((result) => !result.is_published);
  const latestPublishedResult = publishedResults[0] ?? null;
  const bestPublishedResult = publishedResults.reduce<StudentResult | null>((best, current) => {
    if (!best) return current;
    return Number(current.percentage) > Number(best.percentage) ? current : best;
  }, null);

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Results"
        badge={normalize(selectedSubject) === "overall" ? "Overall" : selectedSubject}
        title="Track what is published and what still needs review"
        description="This mobile results lane turns submitted attempts into a clearer post-exam workflow without forcing the learner back to the web shell."
        helper={
          query.isLoading
            ? "Loading live student results..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load results right now."
              : latestPublishedResult
                ? `Latest published result: ${latestPublishedResult.exam_title} · ${latestPublishedResult.percentage}%`
                : scopedResults.length
                  ? "Attempts exist, but learner-visible result publication is still pending for the current scope."
                  : "No student result records were returned for the current scope."
        }
        actions={
          <View style={appStyles.rowWrap}>
            <ActionButton
              label="Open Analytics"
              testID="results-open-analytics-button"
              onPress={() => router.push("./analytics")}
            />
            <ActionButton
              label="Back to Dashboard"
              tone="secondary"
              testID="results-back-dashboard-button"
              onPress={() => router.push("./dashboard")}
            />
          </View>
        }
      />

      {query.isError ? (
        <StatePanel
          tone="error"
          title="Results unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load results right now."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}

      <View style={appStyles.metricGrid}>
        <MetricCard
          label="Results in Scope"
          value={String(scopedResults.length)}
          helper="Student result records matching the active subject lane"
          soft
        />
        <MetricCard
          label="Published"
          value={String(publishedResults.length)}
          helper="Results already visible to the learner"
        />
        <MetricCard
          label="Review Ready"
          value={String(reviewReadyResults.length)}
          helper="Published results that already allow question-level review"
          soft
        />
        <MetricCard
          label="Best Score"
          value={bestPublishedResult ? `${bestPublishedResult.percentage}%` : "--"}
          helper="Highest visible published percentage in this scope"
        />
      </View>

      {subjectOptions.length ? (
        <SectionBlock
          title="Subject scope"
          subtitle="Keep results, dashboard, and analytics aligned to the same learner context"
        >
          <View style={appStyles.rowWrap}>
            <ActionButton
              label="Overall"
              tone={normalize(selectedSubject) === "overall" ? "primary" : "secondary"}
              onPress={() => setSelectedSubject("overall")}
            />
            {subjectOptions.map((option) => (
              <ActionButton
                key={option.value}
                label={option.label}
                tone={selectedSubject === option.value ? "primary" : "secondary"}
                onPress={() => setSelectedSubject(option.value)}
              />
            ))}
          </View>
        </SectionBlock>
      ) : null}

      <SectionBlock
        title="Ready for review"
        subtitle="Use this first when the learner wants question-level follow-up"
      >
        {reviewReadyResults.length ? (
          reviewReadyResults.slice(0, 4).map((result) => {
            const tone = resultTone(result);
            return (
              <View key={result.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{result.exam_title}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>
                  {metadataSubjectName(result.metadata) || "General subject"} · {result.percentage}% · {result.correct_answers} correct
                </Text>
                <Text style={appStyles.helper}>
                  Published {formatDateLabel(result.published_at || result.created_at)} · rank{" "}
                  {result.rank ?? "not assigned"}
                </Text>
                <Text style={appStyles.helper}>{statusMessage(result)}</Text>
                <View style={appStyles.rowWrap}>
                  <ActionButton
                    label="Review"
                    compact
                    testID="results-review-button"
                    onPress={() => router.push(`/(attempt)/review/${result.attempt}`)}
                  />
                  <ActionButton
                    label="Summary"
                    tone="secondary"
                    compact
                    testID="results-summary-button"
                    onPress={() => router.push(`/(attempt)/summary/${result.attempt}`)}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <StatePanel
            tone="success"
            title="No review-ready results right now"
            body="This learner currently has no published result with mobile review access in the active subject scope."
            action={{ label: "Open Attempts", onPress: () => router.push("./attempts"), tone: "secondary" }}
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Pending publication"
        subtitle="Attempts that are complete but still waiting on learner-visible release"
      >
        {pendingResults.length ? (
          pendingResults.slice(0, 4).map((result) => (
            <View key={result.id} style={appStyles.productCard}>
              <View style={appStyles.rowBetween}>
                <Text style={appStyles.label}>{result.exam_title}</Text>
                <View style={[appStyles.chip, appStyles.chipWarm]}>
                  <Text style={[appStyles.chipText, appStyles.chipTextWarm]}>Pending release</Text>
                </View>
              </View>
              <Text style={appStyles.body}>
                {metadataSubjectName(result.metadata) || "General subject"} · submitted {formatDateLabel(result.created_at)}
              </Text>
              <Text style={appStyles.helper}>
                The learner can use summary now, but result visibility still depends on backend publish policy.
              </Text>
              <View style={appStyles.rowWrap}>
                <ActionButton
                  label="Open Summary"
                  compact
                  tone="secondary"
                  testID="results-pending-summary-button"
                  onPress={() => router.push(`/(attempt)/summary/${result.attempt}`)}
                />
              </View>
            </View>
          ))
        ) : (
          <StatePanel
            title="Nothing is waiting for publication"
            body="There are no submitted-but-hidden results in the current scope right now."
            action={{ label: "Open Exams", onPress: () => router.push("./exams"), tone: "secondary" }}
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Results timeline"
        subtitle="Compact learner-facing history for the current subject scope"
      >
        {scopedResults.length ? (
          scopedResults.map((result) => {
            const tone = resultTone(result);
            return (
              <View key={result.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{result.exam_title}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>
                  {metadataSubjectName(result.metadata) || "General subject"} · {result.percentage}% · {result.time_taken_seconds}s
                </Text>
                <Text style={appStyles.helper}>
                  {result.correct_answers} correct · {result.incorrect_answers} incorrect · {result.skipped_questions} skipped
                </Text>
                <Text style={appStyles.helper}>{statusMessage(result)}</Text>
                <View style={appStyles.rowWrap}>
                  <ActionButton
                    label="Summary"
                    compact
                    tone="secondary"
                    testID="results-timeline-summary-button"
                    onPress={() => router.push(`/(attempt)/summary/${result.attempt}`)}
                  />
                  {result.review_available ? (
                    <ActionButton
                      label="Review"
                      compact
                      testID="results-timeline-review-button"
                      onPress={() => router.push(`/(attempt)/review/${result.attempt}`)}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <StatePanel
            title="No results returned"
            body="No student result records were returned for the current subject scope yet."
            action={{ label: "Open Exams", onPress: () => router.push("./exams"), tone: "secondary" }}
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
