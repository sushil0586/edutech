import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentAnalyticsBundle } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

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

function scoreChipStyle(percentage: number) {
  if (percentage >= 75) {
    return {
      container: appStyles.chipSuccess,
      text: appStyles.chipTextSuccess,
    };
  }

  if (percentage >= 55) {
    return {
      container: appStyles.chipWarm,
      text: appStyles.chipTextWarm,
    };
  }

  return {
    container: appStyles.chipDanger,
    text: appStyles.chipTextDanger,
  };
}

function nextActionMessage(params: {
  weakTopicCount: number;
  strongTopicCount: number;
  latestPercentage: number | null;
}) {
  const { weakTopicCount, strongTopicCount, latestPercentage } = params;

  if (latestPercentage !== null && latestPercentage < 50) {
    return "Start with your lowest topics first. Do not spread effort too wide until the recent score stabilizes.";
  }

  if (weakTopicCount >= 3) {
    return "Your next study move should be focused revision, not more random practice. Pick the weakest two topics first.";
  }

  if (strongTopicCount > 0) {
    return "You already have some reliable strengths. Use them for confidence, but spend the next session on weaker areas.";
  }

  return "Keep building attempt history. Analytics will become sharper as more completed results are processed.";
}

export default function AnalyticsScreen() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const profile = useSessionStore((state) => state.profile);
  const selectedSubject = useSessionStore((state) => state.selectedSubject);
  const studentId = profile?.student_profile ?? null;

  const query = useQuery({
    queryKey: ["student.analytics.bundle", accessToken, studentId],
    queryFn: async () => fetchStudentAnalyticsBundle(accessToken as string, studentId as string),
    enabled: Boolean(accessToken && studentId),
  });

  const summary = query.data?.summary ?? null;
  const scopedResults = useMemo(() => {
    const results = query.data?.results ?? [];
    if (normalize(selectedSubject) === "overall") return results;
    return results.filter((result) => {
      const subjectName = metadataSubjectName(result.metadata);
      return subjectName ? matchesSelectedSubject(subjectName, selectedSubject) : false;
    });
  }, [query.data?.results, selectedSubject]);
  const scopedTopics = useMemo(() => {
    const topics = query.data?.topicPerformance ?? [];
    if (normalize(selectedSubject) === "overall") return topics;
    return topics.filter((topic) => matchesSelectedSubject(topic.subject_name, selectedSubject));
  }, [query.data?.topicPerformance, selectedSubject]);
  const publishedResults = scopedResults.filter((result) => result.is_published);
  const weakTopics = [...scopedTopics]
    .sort((a, b) => Number(a.percentage) - Number(b.percentage))
    .slice(0, 4);
  const strongTopics = [...scopedTopics]
    .sort((a, b) => Number(b.percentage) - Number(a.percentage))
    .slice(0, 3);
  const latestResult = publishedResults[0] ?? null;
  const latestPercentage = latestResult ? Number(latestResult.percentage) : null;
  const nextAction = nextActionMessage({
    weakTopicCount: weakTopics.length,
    strongTopicCount: strongTopics.length,
    latestPercentage,
  });

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Analytics"
        badge={normalize(selectedSubject) === "overall" ? "Overall" : selectedSubject}
        title="Understand progress without overload"
        description="This view now combines live student insight summary, student result records, and topic-performance data."
        helper={
          query.isLoading
            ? "Loading live analytics bundle..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load analytics."
              : summary?.insight_messages[0] || "Use weak topics, published results, and accuracy trends to plan the next study move."
        }
      />
      {query.isError ? (
        <StatePanel
          tone="error"
          title="Analytics unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load analytics."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}
      <View style={appStyles.metricGrid}>
        <MetricCard
          label="Average"
          value={summary ? `${summary.average_percentage}%` : "--"}
          helper="Overall result average"
          soft
        />
        <MetricCard
          label="Accuracy"
          value={summary ? `${summary.accuracy_percentage}%` : "--"}
          helper="Correctness signal"
        />
        <MetricCard
          label="Published Results"
          value={String(publishedResults.length)}
          helper="Visible learner result records"
          soft
        />
        <MetricCard
          label="Tracked Topics"
          value={String(scopedTopics.length)}
          helper="Topic performance entries in scope"
        />
      </View>
      <SectionBlock
        title="Next action"
        subtitle="Turn analytics into a practical study move"
      >
        <View style={appStyles.emphasisPanel}>
          <Text style={appStyles.body}>{nextAction}</Text>
        </View>
        {latestResult ? (
          <Text style={appStyles.helper}>
            Latest published result: {latestResult.exam_title} · {latestResult.percentage}% · {latestResult.correct_answers} correct
          </Text>
        ) : (
          <Text style={appStyles.helper}>
            As more published results appear, this guidance will become more precise for the selected subject scope.
          </Text>
        )}
      </SectionBlock>
      <SectionBlock
        title="Weak topics"
        subtitle="Use these signals to decide what to revise next"
      >
        {weakTopics.length ? (
          weakTopics.map((topic) => {
            const tone = scoreChipStyle(Number(topic.percentage));
            return (
              <View key={topic.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{topic.topic_name || "General topic"}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{topic.percentage}%</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>{topic.subject_name}</Text>
                <Text style={appStyles.helper}>
                  {topic.correct_answers} correct · {topic.incorrect_answers} incorrect · {topic.skipped_questions} skipped
                </Text>
                <Text style={appStyles.helper}>
                  Next move: revise this topic before attempting another similar paper.
                </Text>
              </View>
            );
          })
        ) : (
          <StatePanel
            title="No weak-topic signals yet"
            body="Weak-topic insights will appear after enough completed and processed attempts are available."
          />
        )}
      </SectionBlock>
      <SectionBlock
        title="Strong topics"
        subtitle="Areas where the learner is currently performing well"
      >
        {strongTopics.length ? (
          strongTopics.map((topic) => (
            <View key={topic.id} style={appStyles.productCard}>
              <View style={appStyles.rowBetween}>
                <Text style={appStyles.label}>{topic.topic_name || "General topic"}</Text>
                <View style={[appStyles.chip, appStyles.chipSuccess]}>
                  <Text style={[appStyles.chipText, appStyles.chipTextSuccess]}>{topic.percentage}%</Text>
                </View>
              </View>
              <Text style={appStyles.body}>{topic.subject_name}</Text>
              <Text style={appStyles.helper}>Keep this topic warm with light revision, not heavy repetition.</Text>
            </View>
          ))
        ) : (
          <StatePanel
            tone="success"
            title="Strong-topic signals pending"
            body="Strong-topic patterns will appear here as topic-performance records accumulate."
          />
        )}
      </SectionBlock>
      <SectionBlock
        title="Latest published result"
        subtitle="Recent learner-facing outcome in the current scope"
      >
        {latestResult ? (
          <View style={appStyles.productCard}>
            <View style={appStyles.rowBetween}>
              <Text style={appStyles.label}>{latestResult.exam_title}</Text>
              <View
                style={[
                  appStyles.chip,
                  latestResult.result_status === "pass" ? appStyles.chipSuccess : appStyles.chipWarm,
                ]}
              >
                <Text
                  style={[
                    appStyles.chipText,
                    latestResult.result_status === "pass"
                      ? appStyles.chipTextSuccess
                      : appStyles.chipTextWarm,
                  ]}
                >
                  {latestResult.result_status}
                </Text>
              </View>
            </View>
            <Text style={appStyles.body}>
              {latestResult.percentage}% · Score {latestResult.final_score} · Rank{" "}
              {latestResult.rank !== null ? latestResult.rank : "pending"}
            </Text>
            <Text style={appStyles.helper}>
              {latestResult.correct_answers} correct · {latestResult.incorrect_answers} incorrect · {latestResult.skipped_questions} skipped
            </Text>
            <Text style={appStyles.helper}>
              Recommended interpretation:{" "}
              {Number(latestResult.percentage) >= 75
                ? "strong recent signal"
                : Number(latestResult.percentage) >= 55
                  ? "mixed but recoverable signal"
                  : "urgent improvement signal"}
            </Text>
          </View>
        ) : (
          <StatePanel
            title="No published results yet"
            body="No published learner-facing result records are available yet for the current analytics scope."
          />
        )}
      </SectionBlock>
      <SectionBlock
        title="Insight messages"
        subtitle="Backend-generated nudges for the learner"
      >
        {summary?.insight_messages?.length ? (
          summary.insight_messages.slice(0, 3).map((message) => (
            <View key={message} style={appStyles.mutedPanel}>
              <Text style={appStyles.body}>{message}</Text>
            </View>
          ))
        ) : (
          <StatePanel
            title="No insight messages yet"
            body="Backend-generated learner nudges will appear here as enough performance data becomes available."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
