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
import { fetchStudentDashboardBundle, fetchStudentResults } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";
import type { StudentAttemptListItem, StudentResult } from "@/types/api";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isActiveAttempt(status: string) {
  return ["in_progress", "active", "started", "resumed"].includes(normalize(status));
}

function isCompletedAttempt(status: string) {
  return ["submitted", "completed", "evaluated", "under_review"].includes(normalize(status));
}

function attemptTone(attempt: StudentAttemptListItem, result: StudentResult | undefined) {
  if (isActiveAttempt(attempt.status)) {
    return {
      container: appStyles.chipSuccess,
      text: appStyles.chipTextSuccess,
      label: "Resume ready",
    };
  }

  if (result?.review_available) {
    return {
      container: appStyles.chipPrimary,
      text: appStyles.chipTextPrimary,
      label: "Review available",
    };
  }

  if (result?.is_published) {
    return {
      container: appStyles.chipWarm,
      text: appStyles.chipTextWarm,
      label: "Result visible",
    };
  }

  return {
    container: appStyles.chipDanger,
    text: appStyles.chipTextDanger,
    label: "Submitted",
  };
}

function attemptSupportCopy(attempt: StudentAttemptListItem, result: StudentResult | undefined) {
  if (isActiveAttempt(attempt.status)) {
    return "This learner attempt is still active, so mobile should re-enter the runtime directly.";
  }

  if (result?.review_available) {
    return "Post-submit summary and review are both available from mobile now.";
  }

  if (result?.is_published) {
    return "The result is visible, but question-level review may still be locked by policy.";
  }

  return "The attempt is complete. Use summary first while result publication is still pending.";
}

function latestResultForAttempt(results: StudentResult[], attemptId: string) {
  return results.find((result) => result.attempt === attemptId);
}

export default function AttemptsScreen() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);

  const query = useQuery({
    queryKey: ["student.attempts.bundle", accessToken],
    queryFn: async () => {
      const [dashboardBundle, results] = await Promise.all([
        fetchStudentDashboardBundle(accessToken as string),
        fetchStudentResults(accessToken as string),
      ]);

      return {
        attempts: dashboardBundle.attempts,
        results,
      };
    },
    enabled: Boolean(accessToken),
  });

  const attempts = query.data?.attempts ?? [];
  const results = query.data?.results ?? [];
  const activeAttempts = useMemo(
    () => attempts.filter((attempt) => isActiveAttempt(attempt.status)),
    [attempts],
  );
  const completedAttempts = useMemo(
    () => attempts.filter((attempt) => !isActiveAttempt(attempt.status)),
    [attempts],
  );
  const reviewReadyCount = completedAttempts.filter((attempt) =>
    latestResultForAttempt(results, attempt.id)?.review_available,
  ).length;

  function openPrimaryAttemptRoute(attempt: StudentAttemptListItem) {
    if (isActiveAttempt(attempt.status)) {
      router.push(`/(attempt)/attempt/${attempt.id}`);
      return;
    }

    const result = latestResultForAttempt(results, attempt.id);
    if (result?.review_available) {
      router.push(`/(attempt)/review/${attempt.id}`);
      return;
    }

    router.push(`/(attempt)/summary/${attempt.id}`);
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Attempts"
        badge={activeAttempts.length ? `${activeAttempts.length} active` : "History"}
        title="Return to live work or inspect completed attempts"
        description="This mobile lane keeps the exam workflow continuous: active attempts reopen runtime, and completed attempts move into summary or review."
        helper={
          query.isLoading
            ? "Loading live attempt history..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load attempts right now."
              : activeAttempts.length
                ? `${activeAttempts.length} attempt${activeAttempts.length === 1 ? "" : "s"} can resume immediately.`
                : completedAttempts.length
                  ? "No active attempts are waiting, but completed attempt history is available below."
                  : "No learner attempt history was returned yet."
        }
        actions={
          <View style={appStyles.rowWrap}>
            <ActionButton
              label="Open Exams"
              testID="attempts-open-exams-button"
              onPress={() => router.push("./exams")}
            />
            <ActionButton
              label="Open Results"
              tone="secondary"
              testID="attempts-open-results-button"
              onPress={() => router.push("./results")}
            />
          </View>
        }
      />

      {query.isError ? (
        <StatePanel
          tone="error"
          title="Attempts unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load attempts right now."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}

      <View style={appStyles.metricGrid}>
        <MetricCard
          label="Total Attempts"
          value={String(attempts.length)}
          helper="All learner attempts returned in this mobile session"
          soft
        />
        <MetricCard
          label="Active"
          value={String(activeAttempts.length)}
          helper="Attempts that can reopen runtime now"
        />
        <MetricCard
          label="Completed"
          value={String(completedAttempts.length)}
          helper="Attempts that now belong in summary or review"
          soft
        />
        <MetricCard
          label="Review Ready"
          value={String(reviewReadyCount)}
          helper="Completed attempts with review already exposed"
        />
      </View>

      <SectionBlock
        title="Resume now"
        subtitle="The fastest path back into active exam work"
      >
        {activeAttempts.length ? (
          activeAttempts.map((attempt) => {
            const result = latestResultForAttempt(results, attempt.id);
            const tone = attemptTone(attempt, result);
            return (
              <View key={attempt.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{attempt.exam_title || "Active exam attempt"}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>Status: {attempt.status}</Text>
                <Text style={appStyles.helper}>{attemptSupportCopy(attempt, result)}</Text>
                <ActionButton
                  label="Resume Attempt"
                  testID="attempts-resume-attempt-button"
                  onPress={() => openPrimaryAttemptRoute(attempt)}
                />
              </View>
            );
          })
        ) : (
          <StatePanel
            tone="success"
            title="No active attempts waiting"
            body="There is no in-progress learner attempt to resume right now."
            action={{ label: "Open Exams", onPress: () => router.push("./exams"), tone: "secondary" }}
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Completed history"
        subtitle="Use summary first, then review when policy allows"
      >
        {completedAttempts.length ? (
          completedAttempts.map((attempt) => {
            const result = latestResultForAttempt(results, attempt.id);
            const tone = attemptTone(attempt, result);
            return (
              <View key={attempt.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{attempt.exam_title || "Completed exam attempt"}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>
                  Status: {attempt.status}
                  {result ? ` · ${result.percentage}%` : ""}
                </Text>
                <Text style={appStyles.helper}>{attemptSupportCopy(attempt, result)}</Text>
                <View style={appStyles.rowWrap}>
                  <ActionButton
                    label="Open Summary"
                    compact
                    tone="secondary"
                    testID="attempts-open-summary-button"
                    onPress={() => router.push(`/(attempt)/summary/${attempt.id}`)}
                  />
                  {result?.review_available ? (
                    <ActionButton
                      label="Open Review"
                      compact
                      testID="attempts-open-review-button"
                      onPress={() => router.push(`/(attempt)/review/${attempt.id}`)}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <StatePanel
            title="No completed attempts yet"
            body="Completed learner attempts will appear here after the student submits their first exam."
            action={{ label: "Open Exams", onPress: () => router.push("./exams"), tone: "secondary" }}
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="How to use this lane"
        subtitle="Keep the mobile exam journey simple"
      >
        <View style={appStyles.column}>
          <View style={appStyles.emphasisPanel}>
            <Text style={appStyles.body}>
              Resume active attempts from here first. Use completed history only after the exam is already submitted.
            </Text>
          </View>
          <Text style={appStyles.helper}>
            Summary is the safest first step after submit. Open review only when result policy has actually exposed it.
          </Text>
        </View>
      </SectionBlock>
    </ScreenShell>
  );
}
