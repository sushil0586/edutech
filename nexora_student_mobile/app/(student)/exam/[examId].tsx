import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentExamDetail, startStudentAttempt } from "@/lib/api/student";
import { MobileApiError } from "@/lib/api/client";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

function availabilityCopy(state: string) {
  switch (state) {
    case "active":
      return "This exam is currently available for the student.";
    case "resume":
      return "A live attempt already exists, so resume takes priority over starting again.";
    case "locked":
      return "This exam is visible but still gated by stars or policy conditions.";
    case "completed":
      return "Attempt limits are exhausted for this exam.";
    case "upcoming":
      return "The exam is not live yet for the learner.";
    default:
      return "Availability comes directly from the backend exam readiness response.";
  }
}

function statusToneLabel(detail: NonNullable<Awaited<ReturnType<typeof fetchStudentExamDetail>>>) {
  if (detail.active_attempt) return "Resume ready";
  if (detail.economy_access.is_locked) return "Locked";
  if (detail.remaining_attempts <= 0) return "Attempts exhausted";
  return "Ready to start";
}

function blockedStateMessage(detail: NonNullable<Awaited<ReturnType<typeof fetchStudentExamDetail>>>) {
  if (detail.active_attempt) {
    return null;
  }

  if (detail.economy_access.is_locked) {
    return detail.economy_access.lock_reason_message || "This exam is locked until the required star or access rule is satisfied.";
  }

  if (detail.remaining_attempts <= 0 || detail.availability_state === "completed") {
    return "This learner has no remaining attempts for this exam, so mobile should stop at detail and use results or review if they are available.";
  }

  if (detail.availability_state === "upcoming") {
    return "This exam is visible, but it is not live for the learner yet. Starting is correctly blocked until the scheduled window opens.";
  }

  return null;
}

export default function ExamDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const accessToken = useSessionStore((state) => state.accessToken);
  const profile = useSessionStore((state) => state.profile);
  const [actionMessage, setActionMessage] = useState<string>("");
  const [starting, setStarting] = useState(false);

  const query = useQuery({
    queryKey: ["student.exam.detail", examId, accessToken],
    queryFn: async () => fetchStudentExamDetail(examId as string, accessToken as string),
    enabled: Boolean(examId && accessToken),
  });

  const detail = query.data ?? null;

  async function handlePrimaryAction() {
    if (!detail) return;

    if (detail.active_attempt?.id) {
      router.push(`/(attempt)/attempt/${detail.active_attempt.id}`);
      return;
    }

    if (!profile?.student_profile || !accessToken) {
      setActionMessage("Student profile is missing for this session. Please sign in again.");
      return;
    }

    try {
      setStarting(true);
      setActionMessage("");
      const response = await startStudentAttempt(detail.id, profile.student_profile, accessToken);
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["student.dashboard.bundle"] }),
      ]);
      router.replace(`/(attempt)/attempt/${response.data.id}`);
    } catch (error) {
      setActionMessage(
        error instanceof MobileApiError ? error.message : "Unable to start the attempt right now.",
      );
    } finally {
      setStarting(false);
    }
  }

  const primaryLabel = detail?.active_attempt
    ? "Resume Attempt"
    : detail?.economy_access.is_locked
      ? "Unlock Required"
      : detail?.availability_state === "upcoming"
        ? "Not Live Yet"
      : detail && detail.remaining_attempts > 0
        ? "Start Attempt"
        : "Attempt Limit Reached";
  const blockedMessage = detail ? blockedStateMessage(detail) : null;

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Exam Readiness"
        badge={detail?.subject_name ?? "Live exam"}
        title={detail?.title ?? "Loading exam detail"}
        description={
          detail
            ? `${detail.subject_name ?? "General"} · ${detail.duration_minutes} min · ${detail.exam_questions.length} questions`
            : "Reading the live exam contract, availability state, security policy, and attempt context."
        }
        helper={
          query.isLoading
            ? "Loading live exam detail..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load exam detail."
              : detail
                ? `${statusToneLabel(detail)} · ${availabilityCopy(detail.availability_state)}`
                : "No exam detail was returned."
        }
        actions={
          detail ? (
            <View style={appStyles.rowWrap}>
              <ActionButton
                label={starting ? "Working..." : primaryLabel}
                onPress={() => void handlePrimaryAction()}
                disabled={
                  starting ||
                  detail.economy_access.is_locked ||
                  (!detail.active_attempt && detail.remaining_attempts <= 0)
                }
                testID="exam-detail-primary-action-button"
              />
              <ActionButton
                label="Open Exams"
                tone="secondary"
                onPress={() => router.push("../(tabs)/exams")}
                testID="exam-detail-open-exams-button"
              />
            </View>
          ) : undefined
        }
      />
      {query.isError ? (
        <StatePanel
          tone="error"
          title="Exam detail unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load exam detail."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}
      {detail ? (
        <View style={appStyles.metricGrid}>
          <MetricCard
            label="Duration"
            value={`${detail.duration_minutes}m`}
            helper="Timer from exam configuration"
            soft
          />
          <MetricCard
            label="Questions"
            value={String(detail.exam_questions.length)}
            helper="Question inventory in this exam"
          />
          <MetricCard
            label="Attempts Left"
            value={String(detail.remaining_attempts)}
            helper="Remaining learner attempts"
            soft
          />
          <MetricCard
            label="Star Cost"
            value={String(detail.economy_access.star_cost)}
            helper="Unlock cost when policy requires it"
          />
        </View>
      ) : null}

      {actionMessage ? (
        <View style={appStyles.sectionCard}>
          <Text style={appStyles.errorText}>{actionMessage}</Text>
        </View>
      ) : null}

      {blockedMessage ? (
        <StatePanel
          tone={detail?.economy_access.is_locked ? "warning" : "neutral"}
          title={
            detail?.economy_access.is_locked
              ? "Exam is locked"
              : detail?.availability_state === "upcoming"
                ? "Exam is not live yet"
                : "Exam cannot be started now"
          }
          body={blockedMessage}
          action={{
            label:
              detail?.review_available || detail?.result_published
                ? "Open Results"
                : "Open Exams",
            onPress: () =>
              router.push(
                detail?.review_available || detail?.result_published
                  ? "../(tabs)/results"
                  : "../(tabs)/exams",
              ),
            tone: "secondary",
          }}
        />
      ) : null}

      <SectionBlock
        title="Readiness overview"
        subtitle="Everything here is driven by the backend exam detail response"
      >
        {detail ? (
          <View style={appStyles.column}>
            <View style={appStyles.rowWrap}>
              <View style={appStyles.chip}>
                <Text style={appStyles.chipText}>{detail.availability_state}</Text>
              </View>
              <View style={appStyles.chip}>
                <Text style={appStyles.chipText}>{detail.remaining_attempts} attempts left</Text>
              </View>
              <View style={appStyles.chip}>
                <Text style={appStyles.chipText}>
                  {detail.economy_access.requires_unlock
                    ? `${detail.economy_access.star_cost} stars`
                    : "No unlock needed"}
                </Text>
              </View>
            </View>
            <Text style={appStyles.body}>
              {detail.description || "No extra description was provided for this exam."}
            </Text>
            <Text style={appStyles.helper}>
              {detail.instructions || "No additional student instructions were returned."}
            </Text>
            {detail.economy_access.is_locked ? (
              <Text style={appStyles.warningText}>
                {detail.economy_access.lock_reason_message || "This exam cannot be opened until the star rule is satisfied."}
              </Text>
            ) : null}
          </View>
        ) : (
          <StatePanel
            title="Waiting for readiness data"
            body="Live readiness metrics will render here once the exam detail query resolves."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Security and policy"
        subtitle="Keep the learner informed before entering the attempt flow"
      >
        {detail ? (
          <View style={appStyles.column}>
            <Text style={appStyles.body}>{detail.security_policy.student_warning_copy}</Text>
            <Text style={appStyles.helper}>
              Security mode: {detail.security_mode} · Fullscreen {detail.security_policy.requires_fullscreen ? "required" : "optional"} · Violation limit{" "}
              {detail.security_policy.violation_limit_enabled
                ? detail.security_policy.violation_limit ?? "enabled"
                : "not enforced"}
            </Text>
            <Text style={appStyles.helper}>
              Resume {detail.allow_resume ? "allowed" : "blocked"} · Section switching{" "}
              {detail.allow_section_switching ? "allowed" : "blocked"} · Review after submit{" "}
              {detail.allow_review_after_submit ? "available" : "not available"}
            </Text>
          </View>
        ) : (
          <StatePanel
            title="Waiting for policy data"
            body="Security and policy guidance will appear here once the exam payload loads."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Sections"
        subtitle="Understand the structure before the student starts"
      >
        {detail?.sections.length ? (
          detail.sections.map((section) => (
            <View key={section.id} style={appStyles.listItem}>
              <View style={appStyles.rowBetween}>
                <Text style={appStyles.label}>{section.title}</Text>
                <Text style={appStyles.helper}>
                  {section.duration_minutes ? `${section.duration_minutes} min` : "Uses exam timer"}
                </Text>
              </View>
              <Text style={appStyles.body}>
                {section.linked_questions_count} questions · {section.allow_skip_section ? "Skip allowed" : "Sequential flow"}
              </Text>
              {section.instructions ? <Text style={appStyles.helper}>{section.instructions}</Text> : null}
            </View>
          ))
        ) : (
          <StatePanel
            title="No section split returned"
            body="This exam did not return a distinct section structure, so the learner will use a simpler flow."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
