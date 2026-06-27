import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { MetricCard } from "@/components/metric-card";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentDashboardBundle } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function DashboardScreen() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const profile = useSessionStore((state) => state.profile);
  const selectedSubject = useSessionStore((state) => state.selectedSubject);
  const setSelectedSubject = useSessionStore((state) => state.setSelectedSubject);
  const query = useQuery({
    queryKey: ["student.dashboard.bundle", accessToken],
    queryFn: async () => fetchStudentDashboardBundle(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const subjectOptions = profile?.student_context?.subject_options ?? [];
  const exams = query.data?.exams ?? [];
  const scopedExams =
    normalize(selectedSubject) === "overall"
      ? exams
      : exams.filter((exam) => normalize(exam.subject_name) === normalize(selectedSubject));
  const summary = query.data?.summary ?? null;
  const wallet = query.data?.wallet ?? null;
  const recommendedExam =
    scopedExams.find((exam) => exam.can_resume) ??
    scopedExams.find((exam) => exam.can_start) ??
    scopedExams[0] ??
    null;
  const availableExams = scopedExams.filter((exam) => !exam.economy_access.is_locked).slice(0, 3);
  const lockedExams = scopedExams.filter((exam) => exam.economy_access.is_locked).slice(0, 2);

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Dashboard"
        badge={wallet ? `${wallet.available_stars.toLocaleString("en-IN")} stars` : "Live student lane"}
        title={`Welcome${profile?.display_name ? `, ${profile.display_name}` : ""}`}
        description={
          profile?.student_context
            ? `${profile.student_context.program_name} · ${profile.student_context.academic_year_name}${profile.student_context.cohort_name ? ` · ${profile.student_context.cohort_name}` : ""}`
            : "Your student dashboard will use live context, stars, and exam availability once the mobile session is active."
        }
        helper={
          query.isLoading
            ? "Loading live dashboard data..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load dashboard right now."
              : recommendedExam
                ? `Next recommended exam${normalize(selectedSubject) === "overall" ? "" : ` in ${selectedSubject}`}: ${recommendedExam.title}`
                : `No recommended exam is available${normalize(selectedSubject) === "overall" ? "" : ` in ${selectedSubject}`} right now.`
        }
        actions={
          <View style={appStyles.rowWrap}>
            {recommendedExam ? (
              <ActionButton
                label={recommendedExam.can_resume ? "Resume Attempt" : "Open Exam"}
                onPress={() =>
                  router.push(
                    recommendedExam.can_resume && recommendedExam.active_attempt
                      ? `/(attempt)/attempt/${recommendedExam.active_attempt.id}`
                      : `/(student)/exam/${recommendedExam.id}`,
                  )
                }
              />
            ) : null}
            <ActionButton
              label="Open Exams"
              tone="secondary"
              onPress={() => router.push("./exams")}
            />
            <ActionButton
              label="Attempts"
              tone="secondary"
              onPress={() => router.push("./attempts")}
            />
          </View>
        }
      />
      {query.isError ? (
        <StatePanel
          tone="error"
          title="Dashboard unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load dashboard right now."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}
      <View style={appStyles.metricGrid}>
        <MetricCard
          label="Available Stars"
          value={wallet ? wallet.available_stars.toLocaleString("en-IN") : "--"}
          helper="Live star wallet balance"
          soft
        />
        <MetricCard
          label="Average Score"
          value={summary ? `${summary.average_percentage}%` : "--"}
          helper="Powered by student insight summary"
        />
        <MetricCard
          label="Accuracy"
          value={summary ? `${summary.accuracy_percentage}%` : "--"}
          helper="Latest backend accuracy signal"
          soft
        />
        <MetricCard
          label="Weak Topics"
          value={summary ? String(summary.weak_topics.length) : "--"}
          helper="Topics needing focused practice"
        />
      </View>
      {subjectOptions.length ? (
        <SectionBlock
          title="Subject lane"
          subtitle="Switch the dashboard context without leaving the page"
        >
          <View style={appStyles.rowWrap}>
            <ActionButton
              key="overall"
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
        title="Available exams"
        subtitle="Start or resume the next best practice actions"
        action={<ActionButton label="All Exams" tone="secondary" onPress={() => router.push("./exams")} />}
      >
        {availableExams.length ? (
          availableExams.map((exam) => (
            <View key={exam.id} style={appStyles.productCard}>
              <View style={appStyles.rowBetween}>
                <Text style={appStyles.label}>{exam.title}</Text>
                <View style={[appStyles.chip, appStyles.chipSuccess]}>
                  <Text style={[appStyles.chipText, appStyles.chipTextSuccess]}>
                    {exam.can_resume ? "Resume" : "Available"}
                  </Text>
                </View>
              </View>
              <Text style={appStyles.body}>{exam.subject_name} · {exam.duration_minutes} min</Text>
              <View style={appStyles.rowWrap}>
                <View style={[appStyles.chip, appStyles.chipPrimary]}>
                  <Text style={[appStyles.chipText, appStyles.chipTextPrimary]}>
                    {exam.can_resume ? "Resume ready" : `${exam.remaining_attempts} attempts left`}
                  </Text>
                </View>
                {exam.economy_access.star_cost > 0 ? (
                  <View style={[appStyles.chip, appStyles.chipWarm]}>
                    <Text style={[appStyles.chipText, appStyles.chipTextWarm]}>
                      {exam.economy_access.star_cost} star access
                    </Text>
                  </View>
                ) : null}
              </View>
              <ActionButton
                label={exam.can_resume ? "Resume" : "Open"}
                tone="secondary"
                onPress={() =>
                  router.push(
                    exam.can_resume && exam.active_attempt
                      ? `/(attempt)/attempt/${exam.active_attempt.id}`
                      : `/(student)/exam/${exam.id}`,
                  )
                }
              />
            </View>
          ))
        ) : (
          <StatePanel
            title="No available exams yet"
            body={`No currently available exams were returned${normalize(selectedSubject) === "overall" ? "" : ` for ${selectedSubject}`}. Check back after scheduling, unlock changes, or new assignments.`}
            action={{ label: "Open Attempts", onPress: () => router.push("./attempts"), tone: "secondary" }}
          />
        )}
      </SectionBlock>
      <SectionBlock
        title="Locked exams"
        subtitle="These items still need star unlocks or policy clearance"
      >
        {lockedExams.length ? (
          lockedExams.map((exam) => (
            <View key={exam.id} style={appStyles.productCard}>
              <View style={appStyles.rowBetween}>
                <Text style={appStyles.label}>{exam.title}</Text>
                <View style={[appStyles.chip, appStyles.chipDanger]}>
                  <Text style={[appStyles.chipText, appStyles.chipTextDanger]}>Locked</Text>
                </View>
              </View>
              <View style={[appStyles.chip, appStyles.chipWarm]}>
                <Text style={[appStyles.chipText, appStyles.chipTextWarm]}>
                  Unlocks with {exam.economy_access.star_cost} stars
                </Text>
              </View>
              <Text style={appStyles.body}>
                {exam.economy_access.lock_reason_message || "This exam is locked right now."}
              </Text>
            </View>
          ))
        ) : (
          <StatePanel
            tone="success"
            title="Nothing is locked right now"
            body={`This learner currently has no premium or gated exams${normalize(selectedSubject) === "overall" ? "" : ` in ${selectedSubject}`} blocking progress.`}
          />
        )}
      </SectionBlock>
      <SectionBlock
        title="Analytics preview"
        subtitle="Understand the learning signal before opening the full analytics lane"
        action={<ActionButton label="Open Analytics" tone="secondary" onPress={() => router.push("/(student)/(tabs)/analytics")} />}
      >
        <Text style={appStyles.body}>
          {summary
            ? `Average ${summary.average_percentage}% · Accuracy ${summary.accuracy_percentage}% · ${summary.weak_topics.length} weak topic signals available`
            : "Analytics preview will populate from live student summary and topic performance APIs."}
        </Text>
      </SectionBlock>
    </ScreenShell>
  );
}
