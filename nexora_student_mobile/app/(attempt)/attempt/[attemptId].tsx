import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, TextInput, View } from "react-native";
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

function isAttemptExpired(expiresAt: string | null | undefined, serverTimeIso: string | null | undefined) {
  if (!expiresAt || !serverTimeIso) return false;
  const expiresAtMs = new Date(expiresAt).getTime();
  const serverTimeMs = new Date(serverTimeIso).getTime();
  if (Number.isNaN(expiresAtMs) || Number.isNaN(serverTimeMs)) return false;
  return serverTimeMs >= expiresAtMs;
}

function supportsMultiSelect(questionType: string) {
  return ["multiple_correct", "multi_select", "multiple_select"].includes(questionType);
}

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizedQuestionType(questionType: string | null | undefined) {
  return String(questionType || "").trim().toLowerCase();
}

function questionTypeLabel(questionType: string | null | undefined) {
  switch (normalizedQuestionType(questionType)) {
    case "mcq_single":
      return "Single-correct MCQ";
    case "mcq_multiple":
    case "multiple_correct":
    case "multi_select":
    case "multiple_select":
      return "Multiple-correct MCQ";
    case "true_false":
      return "True / False";
    case "numeric_answer":
      return "Numeric answer";
    case "fill_in_blanks":
      return "Fill in the blanks";
    case "short_answer":
      return "Short answer";
    case "essay_manual_review":
      return "Descriptive answer";
    case "assertion_reason":
      return "Assertion / Reason";
    case "matrix_match":
      return "Matrix match";
    default:
      return "Question response";
  }
}

function questionResponseGuidance(question: StudentExamQuestionDetail) {
  const type = normalizedQuestionType(question.question_type);
  const hasOptions = question.options.length > 0;

  if (type === "true_false") {
    return "Choose either True or False, then save the response.";
  }

  if (type === "mcq_multiple" || supportsMultiSelect(type)) {
    return "Select every correct option, then save the response before moving ahead.";
  }

  if (type === "mcq_single" || hasOptions) {
    return "Choose the single best option, then save the response.";
  }

  if (type === "numeric_answer") {
    return "Enter the final numeric answer carefully, then save the response.";
  }

  if (type === "fill_in_blanks") {
    return "Type the missing answer carefully in the response box, then save it.";
  }

  if (type === "short_answer") {
    return "Write a concise answer in the response box, then save the response.";
  }

  if (type === "essay_manual_review") {
    return "Write the full descriptive answer in the response box, then save before leaving the question.";
  }

  if (type === "assertion_reason") {
    return "Read both the assertion and reason carefully, choose the best matching option, then save the response.";
  }

  if (type === "matrix_match") {
    return "Match each part carefully using the provided choices, then save the response.";
  }

  return "Use the response field below if the backend expects written input.";
}

function answerFieldLabel(question: StudentExamQuestionDetail) {
  switch (normalizedQuestionType(question.question_type)) {
    case "numeric_answer":
      return "Numeric answer";
    case "fill_in_blanks":
      return "Blank answer";
    case "essay_manual_review":
      return "Descriptive answer";
    default:
      return "Answer text";
  }
}

function answerFieldPlaceholder(question: StudentExamQuestionDetail) {
  switch (normalizedQuestionType(question.question_type)) {
    case "numeric_answer":
      return "Type the final numeric answer.";
    case "fill_in_blanks":
      return "Type the missing answer for the blank.";
    case "short_answer":
      return "Type the short written response.";
    case "essay_manual_review":
      return "Type the full descriptive answer.";
    default:
      return "Type a response when this question requires written input.";
  }
}

function optionPresentation(
  question: StudentExamQuestionDetail | null,
  optionId: string | null | undefined,
) {
  if (!question || !optionId) return null;
  const index = question.options.findIndex((option) => option.id === optionId);
  if (index < 0) return null;
  const option = question.options[index];
  return {
    label: optionLetter(index),
    text: option.option_text,
  };
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

function normalizedSelection(values: string[]) {
  return [...values].sort().join("|");
}

function hasDraftChanges(
  answer: StudentAttemptAnswer | undefined,
  draft: {
    selectedOption: string | null;
    selectedOptionIds: string[];
    answerText: string;
    markedForReview: boolean;
  },
) {
  const saved = seedDraft(answer);

  return (
    saved.selectedOption !== draft.selectedOption ||
    normalizedSelection(saved.selectedOptionIds) !== normalizedSelection(draft.selectedOptionIds) ||
    saved.answerText.trim() !== draft.answerText.trim() ||
    saved.markedForReview !== draft.markedForReview
  );
}

type PendingNavigation =
  | { type: "question"; question: StudentExamQuestionDetail }
  | { type: "section"; sectionId: string; label: string }
  | null;

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
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const shouldRefocusQuestion = useRef(false);

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
  const currentQuestionIndex = currentQuestion
    ? visibleQuestions.findIndex((question) => question.question === currentQuestion.question)
    : -1;
  const previousQuestion =
    currentQuestionIndex > 0 ? visibleQuestions[currentQuestionIndex - 1] : null;
  const nextQuestion =
    currentQuestionIndex >= 0 && currentQuestionIndex < visibleQuestions.length - 1
      ? visibleQuestions[currentQuestionIndex + 1]
      : null;
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
  const reviewMarkedCount = detail?.answers.filter((answer) => answer.is_marked_for_review).length ?? 0;
  const remainingTime = detail
    ? secondsRemaining(
        detail.section_runtime.current_section_expires_at ?? detail.expires_at,
        detail.server_time,
      )
    : null;
  const attemptExpired = detail
    ? isAttemptExpired(detail.expires_at, detail.server_time)
    : false;
  const attemptEditable = detail?.status === "in_progress" && !attemptExpired;
  const draftState = {
    selectedOption,
    selectedOptionIds,
    answerText,
    markedForReview,
  };
  const currentQuestionHasDraftChanges = currentQuestion
    ? hasDraftChanges(currentAnswer, draftState)
    : false;
  const currentQuestionHasAnyDraft =
    Boolean(selectedOption) || selectedOptionIds.length > 0 || Boolean(answerText.trim()) || markedForReview;
  const savedOptionPresentation = optionPresentation(
    currentQuestion,
    currentAnswer?.selected_option,
  );
  const currentDraftOptionPresentation = optionPresentation(currentQuestion, selectedOption);

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

  useEffect(() => {
    if (!currentQuestion || !shouldRefocusQuestion.current) {
      return;
    }

    const timer = setTimeout(() => {
      keepCurrentQuestionInFocus();
      shouldRefocusQuestion.current = false;
    }, 80);

    return () => clearTimeout(timer);
  }, [currentQuestion]);

  function keepCurrentQuestionInFocus() {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }

  function selectQuestion(question: StudentExamQuestionDetail) {
    if (currentQuestionHasDraftChanges && currentQuestion?.question !== question.question) {
      setPendingNavigation({ type: "question", question });
      setFeedback("You have unsaved changes on the current question.");
      return;
    }

    setPendingNavigation(null);
    shouldRefocusQuestion.current = true;
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

  async function persistAnswer(clearResponse = false) {
    if (!currentQuestion || !accessToken || !attemptId) return;

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
    await Promise.all([
      query.refetch(),
      queryClient.invalidateQueries({ queryKey: ["student.dashboard.bundle"] }),
    ]);
  }

  async function handleSave(clearResponse = false) {
    if (!clearResponse && !currentQuestionHasDraftChanges) {
      if (currentAnswer) {
        const savedOption = optionPresentation(currentQuestion, currentAnswer.selected_option);
        setFeedback(
          savedOption
            ? `Answer already saved: Option ${savedOption.label} - ${savedOption.text}`
            : "This answer is already saved on the backend.",
        );
      } else {
        setFeedback("Choose or type a response before saving.");
      }
      return;
    }

    try {
      const destinationQuestion = !clearResponse ? nextQuestion : null;
      setPendingAction("save");
      setFeedback("");
      setPendingNavigation(null);
      await persistAnswer(clearResponse);
      if (clearResponse) {
        setFeedback("Response cleared and saved.");
      } else {
        const savedOption = optionPresentation(currentQuestion, selectedOption);
        setFeedback(
          destinationQuestion
            ? "Answer saved. Moving to the next question."
            : savedOption
              ? `Answer saved: Option ${savedOption.label} - ${savedOption.text}`
              : answerText.trim()
                ? "Written answer saved successfully."
                : "Answer saved successfully.",
        );
        if (destinationQuestion) {
          shouldRefocusQuestion.current = true;
          setSelectedQuestionId(destinationQuestion.question);
        }
      }
    } catch (error) {
      setFeedback(
        error instanceof MobileApiError ? error.message : "Unable to save this answer right now.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSectionSwitch(sectionId: string, label: string) {
    if (!accessToken || !attemptId || sectionId === currentSectionId) return;

    if (currentQuestionHasDraftChanges) {
      setPendingNavigation({ type: "section", sectionId, label });
      setFeedback("You have unsaved changes on the current question.");
      return;
    }

    await handleSectionSwitchConfirmed(sectionId);
  }

  async function handleSectionSwitchConfirmed(sectionId: string) {
    if (!accessToken || !attemptId || sectionId === currentSectionId) return;

    try {
      setPendingAction("section");
      setFeedback("");
      setPendingNavigation(null);
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

  async function confirmAndSubmit(saveDraftFirst: boolean) {
    if (!accessToken || !attemptId) return;

    try {
      setPendingAction("submit");
      setFeedback("");
      if (saveDraftFirst && currentQuestionHasDraftChanges) {
        await persistAnswer(false);
      }
      await submitStudentAttempt(attemptId, accessToken);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student.dashboard.bundle"] }),
        queryClient.invalidateQueries({ queryKey: ["student.attempt.detail", attemptId, accessToken] }),
      ]);
      setShowSubmitConfirm(false);
      router.replace(`/(attempt)/summary/${attemptId}`);
    } catch (error) {
      setFeedback(
        error instanceof MobileApiError ? error.message : "Submit failed. Please retry from this screen.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  function handleSubmitPress() {
    setShowSubmitConfirm(true);
    setPendingNavigation(null);
    setFeedback("");
  }

  function discardDraftAndContinue() {
    if (!pendingNavigation) return;

    if (pendingNavigation.type === "question") {
      setSelectedQuestionId(pendingNavigation.question.question);
      setPendingNavigation(null);
      setFeedback("Unsaved changes were discarded while moving to the next question.");
      return;
    }

    void handleSectionSwitchConfirmed(pendingNavigation.sectionId);
  }

  async function saveDraftAndContinue() {
    if (!pendingNavigation) return;

    try {
      setPendingAction("save");
      setFeedback("");
      await persistAnswer(false);
      if (pendingNavigation.type === "question") {
        setSelectedQuestionId(pendingNavigation.question.question);
        setFeedback("Answer saved before moving to the next question.");
      } else {
        await handleSectionSwitchConfirmed(pendingNavigation.sectionId);
      }
      setPendingNavigation(null);
    } catch (error) {
      setFeedback(
        error instanceof MobileApiError ? error.message : "We could not save your draft before navigating.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const currentQuestionSection = (
    <SectionBlock
      title="Current question"
      subtitle="Keep the action hierarchy simple: answer, save, review, then move on"
    >
      {currentQuestion ? (
        <View style={appStyles.column}>
          <View style={appStyles.rowBetween}>
            <Text style={appStyles.label}>
              {currentQuestion.section_name} · Question {currentQuestion.question_order}
            </Text>
            <Text style={appStyles.helper}>
              {currentQuestionIndex + 1} of {visibleQuestions.length} in this section
            </Text>
          </View>
          <View style={appStyles.rowWrap}>
            <ActionButton
              label="Previous"
              tone="secondary"
              compact
              testID="attempt-runtime-previous-button"
              onPress={() => {
                if (previousQuestion) {
                  selectQuestion(previousQuestion);
                }
              }}
              disabled={pendingAction !== null || !previousQuestion || !attemptEditable}
            />
            <ActionButton
              label="Next"
              tone={nextQuestion ? "primary" : "secondary"}
              compact
              testID="attempt-runtime-next-button"
              onPress={() => {
                if (nextQuestion) {
                  selectQuestion(nextQuestion);
                }
              }}
              disabled={pendingAction !== null || !nextQuestion || !attemptEditable}
            />
          </View>
          <Text style={appStyles.label}>
            Fastest flow: answer, save, move next. Use review-mark only when you intend to revisit before submit.
          </Text>
          <Text style={appStyles.questionStem}>{currentQuestion.question_text}</Text>
          <View style={appStyles.rowWrap}>
            <View style={[appStyles.chip, appStyles.chipPrimary]}>
              <Text style={[appStyles.chipText, appStyles.chipTextPrimary]}>
                {questionTypeLabel(currentQuestion.question_type)}
              </Text>
            </View>
            <View style={appStyles.chip}>
              <Text style={appStyles.chipText}>
                {currentSelectionCount} option{currentSelectionCount === 1 ? "" : "s"} selected
              </Text>
            </View>
            <View
              style={[
                appStyles.chip,
                currentQuestionHasDraftChanges
                  ? appStyles.chipWarm
                  : currentAnswer
                    ? appStyles.chipSuccess
                    : null,
              ]}
            >
              <Text
                style={[
                  appStyles.chipText,
                  currentQuestionHasDraftChanges
                    ? appStyles.chipTextWarm
                    : currentAnswer
                      ? appStyles.chipTextSuccess
                      : null,
                ]}
              >
                {currentQuestionHasDraftChanges
                  ? "Unsaved draft"
                  : currentAnswer
                    ? "Saved on backend"
                    : currentQuestionHasAnyDraft
                      ? "Draft in progress"
                      : "No response yet"}
              </Text>
            </View>
            {markedForReview ? (
              <View style={[appStyles.chip, appStyles.chipWarm]}>
                <Text style={[appStyles.chipText, appStyles.chipTextWarm]}>Marked for review</Text>
              </View>
            ) : null}
          </View>
          <View style={appStyles.emphasisPanel}>
            <Text style={appStyles.body}>{questionResponseGuidance(currentQuestion)}</Text>
          </View>
          {currentQuestion.options.length ? (
            currentQuestion.options.map((option, index) => {
              const isSelected = currentQuestionSupportsMultiSelect
                ? selectedOptionIds.includes(option.id)
                : selectedOption === option.id;
              const optionLabel = optionLetter(index);

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
                      {currentQuestionSupportsMultiSelect ? `Option ${optionLabel} · Multi-select` : `Option ${optionLabel} · Single-select`}
                    </Text>
                    {isSelected ? <Text style={appStyles.optionStateText}>Selected</Text> : null}
                  </View>
                  <Text style={appStyles.body}>{option.option_text}</Text>
                  <ActionButton
                    label={isSelected ? `Selected ${optionLabel}` : `Select ${optionLabel}`}
                    tone={isSelected ? "primary" : "secondary"}
                    onPress={() => toggleOption(option.id)}
                    disabled={pendingAction !== null || !attemptEditable}
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
            <Text style={appStyles.label}>{answerFieldLabel(currentQuestion)}</Text>
            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={setAnswerText}
              placeholder={answerFieldPlaceholder(currentQuestion)}
              style={[appStyles.input, { minHeight: 110, paddingVertical: spacing.md, textAlignVertical: "top" }]}
              testID="attempt-runtime-answer-text-input"
              value={answerText}
              editable={attemptEditable}
            />
          </View>
          <View style={appStyles.rowWrap}>
            <ActionButton
              label={markedForReview ? "Marked for review" : "Mark for review"}
              tone={markedForReview ? "primary" : "secondary"}
              testID="attempt-runtime-mark-review-button"
              onPress={() => setMarkedForReview((value) => !value)}
              disabled={pendingAction !== null || !attemptEditable}
            />
            <ActionButton
              label={pendingAction === "save" ? "Saving..." : "Save Answer"}
              testID="attempt-runtime-save-answer-button"
              onPress={() => void handleSave(false)}
              disabled={pendingAction !== null || !attemptEditable}
            />
            <ActionButton
              label="Clear Response"
              tone="secondary"
              testID="attempt-runtime-clear-response-button"
              onPress={() => void handleSave(true)}
              disabled={pendingAction !== null || !attemptEditable}
            />
          </View>
          {currentAnswer ? (
            <View style={appStyles.column}>
              <Text style={appStyles.helper}>
                Last saved answer detected for this question. Review state:{" "}
                {currentAnswer.is_marked_for_review ? "marked for review" : "normal"}.
              </Text>
              {savedOptionPresentation ? (
                <Text style={appStyles.helper}>
                  Saved choice: Option {savedOptionPresentation.label} - {savedOptionPresentation.text}
                </Text>
              ) : currentAnswer.answer_text.trim() ? (
                <Text style={appStyles.helper}>
                  Saved written response is present for this question.
                </Text>
              ) : null}
              {currentQuestionHasDraftChanges && currentDraftOptionPresentation ? (
                <Text style={appStyles.warningText}>
                  Current unsaved choice: Option {currentDraftOptionPresentation.label} -{" "}
                  {currentDraftOptionPresentation.text}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={appStyles.column}>
              <Text style={appStyles.helper}>
                No saved answer exists yet for this question. Save before switching away if you want the backend to persist this response.
              </Text>
              {currentDraftOptionPresentation ? (
                <Text style={appStyles.warningText}>
                  Current unsaved choice: Option {currentDraftOptionPresentation.label} -{" "}
                  {currentDraftOptionPresentation.text}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      ) : (
        <StatePanel
          title="Select a question"
          body="Choose a question from the navigator to begin the focused attempt flow."
        />
      )}
    </SectionBlock>
  );

  return (
    <ScreenShell scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={appStyles.pageStack}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {query.isRefetching && !query.isLoading ? (
          <View style={appStyles.mutedPanel}>
            <Text style={appStyles.helper}>
              Refreshing attempt state from the server. Your saved responses remain protected while this sync runs.
            </Text>
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

        {currentQuestionSection}

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
                  testID="attempt-runtime-submit-button"
                  onPress={handleSubmitPress}
                  disabled={pendingAction !== null || !attemptEditable}
                />
                <ActionButton
                  label="Open Attempts"
                  tone="secondary"
                  testID="attempt-runtime-open-attempts-button"
                  onPress={() => router.push("../../attempts")}
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

        {detail && !attemptEditable ? (
          <StatePanel
            tone="warning"
            title={attemptExpired ? "Attempt expired" : "Attempt is no longer editable"}
            body={
              attemptExpired
                ? "This attempt window has already ended. Return to summary, results, or review instead of resuming runtime."
                : "This attempt is already closed, so answers can no longer be changed from the live runtime."
            }
            action={{
              label: "Open Summary",
              onPress: () => router.replace(`/(attempt)/summary/${detail?.id}`),
              tone: "secondary",
            }}
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
            <MetricCard
              label="Review Marked"
              value={String(reviewMarkedCount)}
              helper="Questions flagged for a revisit"
              soft
            />
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
                onPress={() => void handleSectionSwitch(section.id, section.name || `Section ${section.order + 1}`)}
                disabled={pendingAction !== null || !attemptEditable}
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
                  label={`Q${index + 1}${saved ? " *" : ""}`}
                  tone={isActive ? "primary" : "secondary"}
                  onPress={() => selectQuestion(question)}
                  disabled={pendingAction !== null || !attemptEditable}
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

      {pendingNavigation ? (
        <SectionBlock
          title="Unsaved changes detected"
          subtitle="Decide what to do before leaving this question"
        >
          <View style={appStyles.mutedPanel}>
            <Text style={appStyles.body}>
              You changed the current response but it is not saved to the backend yet. Save it before moving, or discard the draft and continue.
            </Text>
            <Text style={appStyles.helper}>
              Next destination:{" "}
              {pendingNavigation.type === "question"
                ? `Question ${pendingNavigation.question.question_order}`
                : pendingNavigation.label}
            </Text>
          </View>
          <View style={appStyles.rowWrap}>
              <ActionButton
                label={pendingAction === "save" ? "Saving..." : "Save and Continue"}
                testID="attempt-runtime-save-and-continue-button"
                onPress={() => void saveDraftAndContinue()}
                disabled={pendingAction !== null}
              />
              <ActionButton
                label="Discard Draft"
                tone="secondary"
                testID="attempt-runtime-discard-draft-button"
                onPress={discardDraftAndContinue}
                disabled={pendingAction !== null}
              />
              <ActionButton
                label="Stay Here"
                tone="secondary"
                testID="attempt-runtime-stay-here-button"
                onPress={() => setPendingNavigation(null)}
                disabled={pendingAction !== null}
              />
          </View>
        </SectionBlock>
        ) : null}

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

        {showSubmitConfirm && detail ? (
          <SectionBlock
            title="Ready to submit?"
            subtitle="Take one final look before closing the attempt"
          >
          <View style={unansweredCount > 0 || currentQuestionHasDraftChanges ? appStyles.mutedPanel : appStyles.successPanel}>
            <Text style={appStyles.body}>
              {unansweredCount > 0
                ? `${unansweredCount} question${unansweredCount === 1 ? "" : "s"} still do not have saved answers.`
                : "All currently visible work appears saved."}
            </Text>
            <Text style={appStyles.helper}>
              Current question: {currentQuestionHasDraftChanges ? "unsaved draft present" : "no unsaved draft"} ·
              Review-marked questions: {reviewMarkedCount}
            </Text>
          </View>
          <View style={appStyles.rowWrap}>
            {currentQuestionHasDraftChanges ? (
              <ActionButton
                label={pendingAction === "submit" ? "Submitting..." : "Save Draft and Submit"}
                testID="attempt-runtime-save-draft-submit-button"
                onPress={() => void confirmAndSubmit(true)}
                disabled={pendingAction !== null}
              />
            ) : null}
            <ActionButton
              label={pendingAction === "submit" ? "Submitting..." : "Submit Now"}
              tone={currentQuestionHasDraftChanges ? "secondary" : "primary"}
              testID="attempt-runtime-submit-now-button"
              onPress={() => void confirmAndSubmit(false)}
              disabled={pendingAction !== null}
            />
            <ActionButton
              label="Continue Attempt"
              tone="secondary"
              testID="attempt-runtime-continue-attempt-button"
              onPress={() => setShowSubmitConfirm(false)}
              disabled={pendingAction !== null}
            />
          </View>
          </SectionBlock>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}
