import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentDashboardBundle } from "@/lib/api/student";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";
import type { StudentAvailableExam } from "@/types/api";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesSelectedSubject(subjectName: string, selectedSubject: string) {
  if (normalize(selectedSubject) === "overall") {
    return true;
  }

  return normalize(subjectName) === normalize(selectedSubject);
}

function availabilityTone(exam: StudentAvailableExam) {
  if (exam.can_resume) {
    return {
      container: appStyles.chipSuccess,
      text: appStyles.chipTextSuccess,
      label: "Resume ready",
    };
  }

  if (exam.economy_access.is_locked) {
    return {
      container: appStyles.chipDanger,
      text: appStyles.chipTextDanger,
      label: "Locked",
    };
  }

  return {
    container: appStyles.chipPrimary,
    text: appStyles.chipTextPrimary,
    label: "Available",
  };
}

function examSupportCopy(exam: StudentAvailableExam) {
  if (exam.can_resume) {
    return "A live attempt already exists for this exam, so resume takes priority.";
  }

  if (exam.economy_access.is_locked) {
    return exam.economy_access.lock_reason_message || "This exam is currently gated by stars or policy.";
  }

  if (exam.remaining_attempts <= 1) {
    return "Only one learner attempt remains, so start when the student is ready to focus.";
  }

  return "This exam is ready to open from mobile now.";
}

type ExamFilterMode = "all" | "resume" | "startable" | "locked";

export default function ExamsScreen() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const profile = useSessionStore((state) => state.profile);
  const selectedSubject = useSessionStore((state) => state.selectedSubject);
  const setSelectedSubject = useSessionStore((state) => state.setSelectedSubject);
  const [searchText, setSearchText] = useState("");
  const [filterMode, setFilterMode] = useState<ExamFilterMode>("all");

  const query = useQuery({
    queryKey: ["student.exams.bundle", accessToken],
    queryFn: async () => fetchStudentDashboardBundle(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const subjectOptions = profile?.student_context?.subject_options ?? [];
  const scopedExams = useMemo(() => {
    const exams = query.data?.exams ?? [];
    if (normalize(selectedSubject) === "overall") {
      return exams;
    }

    return exams.filter((exam) => matchesSelectedSubject(exam.subject_name, selectedSubject));
  }, [query.data?.exams, selectedSubject]);

  const filteredExams = useMemo(() => {
    const queryText = normalize(searchText);

    return scopedExams.filter((exam) => {
      const matchesQuery =
        !queryText ||
        normalize(exam.title).includes(queryText) ||
        normalize(exam.subject_name).includes(queryText);

      if (!matchesQuery) {
        return false;
      }

      if (filterMode === "resume") {
        return exam.can_resume;
      }

      if (filterMode === "startable") {
        return !exam.economy_access.is_locked && !exam.can_resume;
      }

      if (filterMode === "locked") {
        return exam.economy_access.is_locked;
      }

      return true;
    });
  }, [filterMode, scopedExams, searchText]);

  const resumeReadyExams = filteredExams.filter((exam) => exam.can_resume);
  const availableExams = filteredExams.filter(
    (exam) => !exam.economy_access.is_locked && !exam.can_resume,
  );
  const lockedExams = filteredExams.filter((exam) => exam.economy_access.is_locked);
  const recommendedExam =
    resumeReadyExams[0] ??
    availableExams[0] ??
    lockedExams[0] ??
    null;

  function openExam(exam: StudentAvailableExam) {
    if (exam.can_resume && exam.active_attempt) {
      router.push(`/(attempt)/attempt/${exam.active_attempt.id}`);
      return;
    }

    router.push(`/(student)/exam/${exam.id}`);
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Exams"
        badge={normalize(selectedSubject) === "overall" ? "Overall" : selectedSubject}
        title="Browse exams with clearer start and resume guidance"
        description="This lane keeps the mobile student experience centered on the real exam workflow: open, resume, unlock, and move into attempt runtime."
        helper={
          query.isLoading
            ? "Loading the live exam catalog..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load exams right now."
              : recommendedExam
                ? `${recommendedExam.title} is the next highest-signal exam action in the current scope.`
                : "No exams were returned for the current student scope."
        }
        actions={
          <View style={appStyles.rowWrap}>
            {recommendedExam ? (
              <ActionButton
                label={recommendedExam.can_resume ? "Resume Top Exam" : "Open Top Exam"}
                onPress={() => openExam(recommendedExam)}
                testID="exams-open-top-exam-button"
              />
            ) : null}
            <ActionButton
              label="Dashboard"
              tone="secondary"
              onPress={() => router.push("/(student)/(tabs)/dashboard")}
              testID="exams-open-dashboard-button"
            />
          </View>
        }
      />

      {query.isError ? (
        <StatePanel
          tone="error"
          title="Exams unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load exams right now."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}

      <View style={appStyles.metricGrid}>
        <MetricCard
          label="In Scope"
          value={String(filteredExams.length)}
          helper="Exams matching the current subject, search, and state filter"
          soft
        />
        <MetricCard
          label="Resume Ready"
          value={String(resumeReadyExams.length)}
          helper="Live attempts that can continue immediately"
        />
        <MetricCard
          label="Open Now"
          value={String(availableExams.length)}
          helper="Exams the learner can start from mobile"
          soft
        />
        <MetricCard
          label="Locked"
          value={String(lockedExams.length)}
          helper="Exams still gated by stars or access policy"
        />
      </View>

      {subjectOptions.length ? (
        <SectionBlock
          title="Subject lane"
          subtitle="Keep exams, results, and analytics aligned to one learner context"
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
        title="Find the right exam"
        subtitle="Narrow the lane before opening detail or resuming runtime"
      >
        <View style={appStyles.fieldStack}>
          <Text style={appStyles.label}>Search exams</Text>
          <TextInput
            placeholder="Search by exam title or subject"
            style={appStyles.input}
            testID="exams-search-input"
            value={searchText}
            onChangeText={setSearchText}
          />
          <Text style={appStyles.fieldHint}>
            Use quick state filters below to jump straight to resume-ready, startable, or locked exams.
          </Text>
        </View>
        <View style={appStyles.rowWrap}>
          <ActionButton
            label="All"
            tone={filterMode === "all" ? "primary" : "secondary"}
            compact
            onPress={() => setFilterMode("all")}
            testID="exams-filter-all-button"
          />
          <ActionButton
            label="Resume"
            tone={filterMode === "resume" ? "primary" : "secondary"}
            compact
            onPress={() => setFilterMode("resume")}
            testID="exams-filter-resume-button"
          />
          <ActionButton
            label="Startable"
            tone={filterMode === "startable" ? "primary" : "secondary"}
            compact
            onPress={() => setFilterMode("startable")}
            testID="exams-filter-startable-button"
          />
          <ActionButton
            label="Locked"
            tone={filterMode === "locked" ? "primary" : "secondary"}
            compact
            onPress={() => setFilterMode("locked")}
            testID="exams-filter-locked-button"
          />
          {(searchText || filterMode !== "all") ? (
            <ActionButton
              label="Reset"
              tone="secondary"
              compact
              onPress={() => {
                setSearchText("");
                setFilterMode("all");
              }}
              testID="exams-filter-reset-button"
            />
          ) : null}
        </View>
        {!filteredExams.length ? (
          <StatePanel
            title="No exams match this filter"
            body="Try clearing the search or switching back to a broader exam state."
          />
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Resume now"
        subtitle="Fastest path back into active learner work"
      >
        {resumeReadyExams.length ? (
          resumeReadyExams.map((exam) => {
            const tone = availabilityTone(exam);
            return (
              <View key={exam.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{exam.title}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>{exam.subject_name} · {exam.duration_minutes} min</Text>
                <Text style={appStyles.helper}>{examSupportCopy(exam)}</Text>
                <View style={appStyles.rowWrap}>
                  <View style={[appStyles.chip, appStyles.chipSuccess]}>
                    <Text style={[appStyles.chipText, appStyles.chipTextSuccess]}>
                      Active attempt linked
                    </Text>
                  </View>
                </View>
                <ActionButton label="Resume Attempt" onPress={() => openExam(exam)} />
              </View>
            );
          })
        ) : (
          <StatePanel
            tone="success"
            title="No active attempts waiting"
            body="There is nothing to resume in the current subject scope right now."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Ready to start"
        subtitle="Mobile-safe starts for new learner attempts"
      >
        {availableExams.length ? (
          availableExams.map((exam) => {
            const tone = availabilityTone(exam);
            return (
              <View key={exam.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{exam.title}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>{exam.subject_name} · {exam.duration_minutes} min</Text>
                <Text style={appStyles.helper}>
                  Attempts left: {exam.remaining_attempts} · {examSupportCopy(exam)}
                </Text>
                <View style={appStyles.rowWrap}>
                  <View style={[appStyles.chip, appStyles.chipPrimary]}>
                    <Text style={[appStyles.chipText, appStyles.chipTextPrimary]}>
                      {exam.remaining_attempts} attempts left
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
                <ActionButton label="Open Exam" tone="secondary" onPress={() => openExam(exam)} />
              </View>
            );
          })
        ) : (
          <StatePanel
            title="No startable exams right now"
            body="No startable exams were returned for the current subject scope."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Locked exams"
        subtitle="Visible, but not yet ready for learner entry"
      >
        {lockedExams.length ? (
          lockedExams.map((exam) => {
            const tone = availabilityTone(exam);
            return (
              <View key={exam.id} style={appStyles.productCard}>
                <View style={appStyles.rowBetween}>
                  <Text style={appStyles.label}>{exam.title}</Text>
                  <View style={[appStyles.chip, tone.container]}>
                    <Text style={[appStyles.chipText, tone.text]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={appStyles.body}>{exam.subject_name} · {exam.duration_minutes} min</Text>
                <Text style={appStyles.helper}>{examSupportCopy(exam)}</Text>
                <View style={appStyles.rowWrap}>
                  <View style={[appStyles.chip, appStyles.chipWarm]}>
                    <Text style={[appStyles.chipText, appStyles.chipTextWarm]}>
                      Unlocks with {exam.economy_access.star_cost} stars
                    </Text>
                  </View>
                </View>
                <ActionButton label="Open Detail" tone="secondary" onPress={() => openExam(exam)} />
              </View>
            );
          })
        ) : (
          <StatePanel
            tone="success"
            title="No locked exams in this scope"
            body="There are currently no locked exams blocking mobile progress in the active lane."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
