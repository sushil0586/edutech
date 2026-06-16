import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import {
  fetchStudentAttemptDetail,
  saveStudentAnswer,
  submitStudentAttempt,
  switchStudentAttemptSection,
} from "@/lib/api/student";
import { MobileApiError } from "@/lib/api/client";
import { StudentAttemptAnswer, StudentExamQuestionDetail } from "@/types/api";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";
import { spacing } from "@/theme/tokens";

function secondsRemaining(targetIso: string | null, serverTimeIso: string) {
  if (!targetIso) return null;

  const targetTime = new Date(targetIso).getTime();
  const serverTime = new Date(serverTimeIso).getTime();

  if (Number.isNaN(targetTime) || Number.isNaN(serverTime)) {
    return null;
  }

  return Math.max(Math.floor((targetTime - serverTime) / 1000), 0);
}

function timeLabel(totalSeconds: number | null) {
  if (totalSeconds === null) return "Open-ended";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

function supportsMultiSelect(questionType: string) {
  return ["multiple_correct", "multi_select", "multiple_select"].includes(questionType);
}

function hasSavedResponse(answer: StudentAttemptAnswer | null | undefined) {
  if (!answer) return false;
  return Boolean(
    answer.selected_option ||
      answer.selected_option_ids.length > 0 ||
      answer.answer_text.trim(),
  );
}

function seedDraft(answer: StudentAttemptAnswer | undefined) {
  return {
    selectedOption: answer?.selected_option ?? null,
    selectedOptionIds: answer?.selected_option_ids ?? [],
    answerText: answer?.answer_text ?? "",
    markedForReview: answer?.is_marked_for_review ?? false,
  };
}

export default function AttemptScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const accessToken = useSessionStore((state) => state.accessToken);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [markedForReview, setMarkedForReview] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "section" | "submit" | null>(null);
  const [feedback, setFeedback] = useState("");

  const query = useQuery({
    queryKey: ["student.attempt.detail", attemptId, accessToken],
    queryFn: async () => fetchStudentAttemptDetail(attemptId as string, accessToken as string),
    enabled: Boolean(attemptId && accessToken),
    refetchInterval: 30_000,
  });

  const detail = query.data ?? null;
  const answerMap = useMemo(
    () => new Map((detail?.answers ?? []).map((answer) => [answer.question, answer])),
    [detail?.answers],
  );
  const currentSectionId = detail?.section_runtime.current_section_id ?? null;
  const sections = useMemo(() => {
    const source = detail?.questions ?? [];
    return Array.from(
      new Map(
        source
          .filter((question) => question.section)
          .map((question) => [
            question.section as string,
            {
              id: question.section as string,
              name: question.section_title ?? question.section_name,
              order: question.section_order ?? 0,
            },
          ]),
      ).values(),
    ).sort((a, b) => a.order - b.order);
  }, [detail?.questions]);
  const visibleQuestions = useMemo(() => {
    if (!detail) return [];
    if (!currentSectionId) return detail.questions;
    return detail.questions.filter((question) => question.section === currentSectionId);
  }, [detail, currentSectionId]);
  const currentQuestion =
    visibleQuestions.find((question) => question.question === selectedQuestionId) ??
    visibleQuestions[0] ??
    null;
  const currentAnswer = currentQuestion ? answerMap.get(currentQuestion.question) : undefined;
  const currentQuestionSupportsMultiSelect = currentQuestion
    ? supportsMultiSelect(currentQuestion.question_type)
    : false;
  const currentSelectionCount = currentQuestionSupportsMultiSelect
    ? selectedOptionIds.length
    : selectedOption
      ? 1
      : 0;
  const answeredCount = detail?.questions.reduce((count, question) => {
    return count + (hasSavedResponse(answerMap.get(question.question)) ? 1 : 0);
  }, 0) ?? 0;
  const unansweredCount = Math.max((detail?.total_questions ?? 0) - answeredCount, 0);
  const remainingTime = detail
    ? secondsRemaining(
        detail.section_runtime.current_section_expires_at ?? detail.expires_at,
        detail.server_time,
      )
    : null;

  useEffect(() => {
    if (!selectedQuestionId && visibleQuestions[0]?.question) {
      setSelectedQuestionId(visibleQuestions[0].question);
    }
  }, [selectedQuestionId, visibleQuestions]);

  useEffect(() => {
    if (!currentQuestion) return;
    const draft = seedDraft(answerMap.get(currentQuestion.question));
    setSelectedOption(draft.selectedOption);
    setSelectedOptionIds(draft.selectedOptionIds);
    setAnswerText(draft.answerText);
    setMarkedForReview(draft.markedForReview);
  }, [currentQuestion, answerMap]);

  function selectQuestion(question: StudentExamQuestionDetail) {
    setSelectedQuestionId(question.question);
    setFeedback("");
  }

  function toggleOption(optionId: string) {
    if (!currentQuestion) return;

    if (supportsMultiSelect(currentQuestion.question_type)) {
      setSelectedOptionIds((current) =>
        current.includes(optionId)
          ? current.filter((value) => value !== optionId)
          : [...current, optionId],
      );
      return;
    }

    setSelectedOption(optionId);
  }

  async function handleSave(clearResponse = false) {
    if (!currentQuestion || !accessToken || !attemptId) return;

    try {
      setPendingAction("save");
      setFeedback("");
      await saveStudentAnswer(
        attemptId,
        {
          question: currentQuestion.question,
          selected_option: supportsMultiSelect(currentQuestion.question_type)
            ? null
            : selectedOption,
          selected_option_ids: supportsMultiSelect(currentQuestion.question_type)
            ? selectedOptionIds
            : [],
          answer_text: answerText,
          is_marked_for_review: markedForReview,
          clear_response: clearResponse,
          skip: false,
        },
        accessToken,
      );
      if (clearResponse) {
        setSelectedOption(null);
        setSelectedOptionIds([]);
        setAnswerText("");
      }
      setFeedback(clearResponse ? "Saved with cleared response." : "Answer saved successfully.");
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["student.dashboard.bundle"] }),
      ]);
    } catch (error) {
      setFeedback(
        error instanceof MobileApiError ? error.message : "Unable to save this answer right now.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSectionSwitch(sectionId: string) {
    if (!accessToken || !attemptId || sectionId === currentSectionId) return;

    try {
      setPendingAction("section");
      setFeedback("");
      await switchStudentAttemptSection(attemptId, sectionId, accessToken);
      await query.refetch();
      setSelectedQuestionId(null);
      setFeedback("Section updated.");
    } catch (error) {
      setFeedback(
        error instanceof MobileApiError ? error.message : "Unable to switch section right now.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmit() {
    if (!accessToken || !attemptId) return;

    try {
      setPendingAction("submit");
      setFeedback("");
      await submitStudentAttempt(attemptId, accessToken);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student.dashboard.bundle"] }),
        queryClient.invalidateQueries({ queryKey: ["student.attempt.detail", attemptId, accessToken] }),
      ]);
      router.replace(`/(attempt)/summary/${attemptId}`);
    } catch (error) {
      setFeedback(
        error instanceof MobileApiError ? error.message : "Submit failed. Please retry from this screen.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Live Attempt"
        badge={detail ? `Attempt ${detail.attempt_no}` : "Runtime"}
        title={detail?.exam_title ?? "Loading attempt"}
        description={
          detail
            ? `Attempt ${detail.attempt_no} · ${detail.exam_type} · ${detail.total_questions} questions`
            : "Loading the backend-owned attempt runtime."
        }
        helper={
          query.isLoading
            ? "Loading attempt detail..."
            : query.isError
              ? query.error instanceof Error
                ? query.error.message
                : "Unable to load attempt."
              : detail
                ? `${answeredCount} answered · ${unansweredCount} remaining · ${timeLabel(remainingTime)}`
                : "No attempt detail returned."
        }
        actions={
          detail ? (
            <View style={appStyles.rowWrap}>
              <ActionButton
                label={pendingAction === "submit" ? "Submitting..." : "Submit Attempt"}
                onPress={() => void handleSubmit()}
                disabled={pendingAction !== null}
              />
              <ActionButton
                label="Back to Dashboard"
                tone="secondary"
                onPress={() => router.push("/(student)/(tabs)/dashboard")}
                disabled={pendingAction === "submit"}
              />
            </View>
          ) : undefined
        }
      />
      {query.isError ? (
        <StatePanel
          tone="error"
          title="Attempt runtime unavailable"
          body={query.error instanceof Error ? query.error.message : "Unable to load attempt."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}
      {detail ? (
        <View style={appStyles.metricGrid}>
          <MetricCard
            label="Answered"
            value={String(answeredCount)}
            helper="Saved by backend runtime"
            soft
          />
          <MetricCard
            label="Remaining"
            value={String(unansweredCount)}
            helper="Questions still open"
          />
          <MetricCard
            label="Time Left"
            value={timeLabel(remainingTime)}
            helper="Exam or section timer authority"
            soft
          />
          <MetricCard
            label="Violations"
            value={String(detail.integrity_summary.violation_count)}
            helper="Security threshold tracking"
          />
        </View>
      ) : null}

      {feedback ? (
        <View style={appStyles.sectionCard}>
          <Text
            style={
              feedback.toLowerCase().includes("success") ||
              feedback.toLowerCase().includes("saved") ||
              feedback.toLowerCase().includes("updated")
                ? appStyles.successText
                : appStyles.errorText
            }
          >
            {feedback}
          </Text>
        </View>
      ) : null}

      <SectionBlock
        title="Section flow"
        subtitle="Move only through the sections the backend currently allows"
      >
        {sections.length ? (
          <View style={appStyles.rowWrap}>
            {sections.map((section) => (
              <ActionButton
                key={section.id}
                label={section.name || `Section ${section.order + 1}`}
                tone={section.id === currentSectionId ? "primary" : "secondary"}
                onPress={() => void handleSectionSwitch(section.id)}
                disabled={pendingAction !== null}
                compact
              />
            ))}
          </View>
        ) : (
          <StatePanel
            title="Single-section attempt"
            body="This attempt does not expose multiple sections, so the learner can stay in one continuous flow."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Question navigator"
        subtitle="Switch within the current section without losing saved state"
      >
        {visibleQuestions.length ? (
          <View style={appStyles.rowWrap}>
            {visibleQuestions.map((question, index) => {
              const isActive = currentQuestion?.question === question.question;
              const saved = hasSavedResponse(answerMap.get(question.question));
              return (
                <ActionButton
                  key={question.id}
                  label={`Q${index + 1}${saved ? " saved" : ""}`}
                  tone={isActive ? "primary" : "secondary"}
                  onPress={() => selectQuestion(question)}
                  disabled={pendingAction !== null}
                  compact
                />
              );
            })}
          </View>
        ) : (
          <StatePanel
            tone="warning"
            title="No visible questions returned"
            body="No visible questions were returned for the active section. Refresh the attempt if this state should contain questions."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Current question"
        subtitle="Keep the action hierarchy simple: answer, save, review, then move on"
      >
        {currentQuestion ? (
          <View style={appStyles.column}>
            <Text style={appStyles.label}>
              {currentQuestion.section_name} · Question {currentQuestion.question_order}
            </Text>
            <Text style={appStyles.questionStem}>{currentQuestion.question_text}</Text>
            <View style={appStyles.rowWrap}>
              <View style={[appStyles.chip, appStyles.chipPrimary]}>
                <Text style={[appStyles.chipText, appStyles.chipTextPrimary]}>
                  {currentQuestionSupportsMultiSelect ? "Multi-select question" : "Single-response question"}
                </Text>
              </View>
              <View style={appStyles.chip}>
                <Text style={appStyles.chipText}>
                  {currentSelectionCount} option{currentSelectionCount === 1 ? "" : "s"} selected
                </Text>
              </View>
              <View style={appStyles.chip}>
                <Text style={appStyles.chipText}>{currentAnswer ? "Saved on backend" : "Draft only"}</Text>
              </View>
            </View>
            <View style={appStyles.emphasisPanel}>
              <Text style={appStyles.body}>
                {currentQuestion.options.length
                  ? currentQuestionSupportsMultiSelect
                    ? "Select all options you believe are correct, then save the response."
                    : "Choose the single best option, then save the response."
                  : "No options were returned for this question, so the written response box becomes the primary answer area."}
              </Text>
            </View>
            {currentQuestion.options.length ? (
              currentQuestion.options.map((option) => {
                const isSelected = currentQuestionSupportsMultiSelect
                  ? selectedOptionIds.includes(option.id)
                  : selectedOption === option.id;

                return (
                  <View
                    key={option.id}
                    style={[
                      appStyles.optionCard,
                      isSelected ? appStyles.optionCardSelected : null,
                    ]}
                  >
                    <View style={appStyles.optionCardHeader}>
                      <Text style={appStyles.optionMeta}>
                        {currentQuestionSupportsMultiSelect ? "Multi-select option" : "Single-select option"}
                      </Text>
                      {isSelected ? <Text style={appStyles.optionStateText}>Selected</Text> : null}
                    </View>
                    <Text style={appStyles.body}>{option.option_text}</Text>
                    <ActionButton
                      label={isSelected ? "Selected" : "Select"}
                      tone={isSelected ? "primary" : "secondary"}
                      onPress={() => toggleOption(option.id)}
                      disabled={pendingAction !== null}
                    />
                  </View>
                );
              })
            ) : (
              <View style={appStyles.mutedPanel}>
                <Text style={appStyles.helper}>
                  No answer options were returned for this question. Use the response field below if the backend expects written input.
                </Text>
              </View>
            )}
            <View style={appStyles.fieldStack}>
              <Text style={appStyles.label}>Answer text</Text>
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={setAnswerText}
                placeholder="Type a response when this question requires written input."
                style={[appStyles.input, { minHeight: 110, paddingVertical: spacing.md, textAlignVertical: "top" }]}
                value={answerText}
              />
            </View>
            <View style={appStyles.rowWrap}>
              <ActionButton
                label={markedForReview ? "Marked for review" : "Mark for review"}
                tone={markedForReview ? "primary" : "secondary"}
                onPress={() => setMarkedForReview((value) => !value)}
                disabled={pendingAction !== null}
              />
              <ActionButton
                label={pendingAction === "save" ? "Saving..." : "Save Answer"}
                onPress={() => void handleSave(false)}
                disabled={pendingAction !== null}
              />
              <ActionButton
                label="Clear Response"
                tone="secondary"
                onPress={() => void handleSave(true)}
                disabled={pendingAction !== null}
              />
            </View>
            {currentAnswer ? (
              <Text style={appStyles.helper}>
                Last saved answer detected for this question. Review state:{" "}
                {currentAnswer.is_marked_for_review ? "marked for review" : "normal"}.
              </Text>
            ) : (
              <Text style={appStyles.helper}>
                No saved answer exists yet for this question. Save before switching away if you want the backend to persist this response.
              </Text>
            )}
          </View>
        ) : (
          <StatePanel
            title="Select a question"
            body="Choose a question from the navigator to begin the focused attempt flow."
          />
        )}
      </SectionBlock>

      <SectionBlock
        title="Integrity and accommodations"
        subtitle="Live learner safety and access adjustments"
      >
        {detail ? (
          <View style={appStyles.column}>
            <Text style={appStyles.body}>{detail.security_policy.student_warning_copy}</Text>
            <Text style={appStyles.helper}>
              Violations: {detail.integrity_summary.violation_count}
              {detail.integrity_summary.violation_limit !== null
                ? ` of ${detail.integrity_summary.violation_limit}`
                : ""}
              {detail.integrity_summary.remaining_before_action !== null
                ? ` · ${detail.integrity_summary.remaining_before_action} before action`
                : ""}
            </Text>
            <Text style={appStyles.helper}>
              Extra time applied: {detail.accommodation_snapshot.applied_extra_time_minutes} minutes · Effective duration{" "}
              {detail.accommodation_snapshot.effective_duration_minutes} minutes
            </Text>
          </View>
        ) : (
          <StatePanel
            title="Waiting for integrity data"
            body="Live integrity and accommodation data will render when the attempt runtime loads."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
