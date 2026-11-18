"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { examPresetPacks } from "@/lib/assessment/exam-preset-packs";
import {
  getAssessmentExamFamilyMetadata,
  resolveAssessmentExamFamilyId,
} from "@/lib/assessment/exam-family-metadata";
import {
  buildAssessmentFamilyExecutionChecklist,
  resolveAssessmentFamilyIdFromProgramLike,
  summarizeFamilyScoringDefaults,
} from "@/lib/assessment/family-profile";

type Option = {
  value: string;
  label: string;
};

type SelectOption = {
  id: string;
  name: string;
  code?: string;
};

type LookupResponse<T> = {
  results: T[];
};

type CreateExamWizardProps = {
  action: (formData: FormData) => void | Promise<void>;
  academicYears: Array<{ id: string; name: string }>;
  academicsApiBasePath?: string;
  hiddenFields?: Array<{ name: string; value: string }>;
  scopeContextLabel?: string;
  selectedAcademicYear: string;
  programs: Array<{
    id: string;
    name: string;
    code: string;
    assessment_family?: string | null;
    assessment_family_code?: string | null;
    assessment_family_label?: string | null;
    assessment_family_profile?: {
      code?: string | null;
      label?: string | null;
      scoring_defaults?: Record<string, unknown>;
    } | null;
  }>;
  selectedProgram: string;
  cohorts: SelectOption[];
  subjects: SelectOption[];
  sourceOptions: Option[];
  selectedSource: string;
  sourceHelpText?: string;
  economyAccessPolicyOptions: Option[];
  examTypeOptions: Option[];
  deliveryModeOptions: Option[];
  timerModeOptions: Option[];
  navigationModeOptions: Option[];
  attemptPolicyOptions: Option[];
  resultPublishModeOptions: Option[];
  reviewModeOptions: Option[];
  securityModeOptions: Option[];
  rankVisibilityModeOptions: Option[];
  percentileVisibilityModeOptions: Option[];
  benchmarkVisibilityModeOptions: Option[];
  rankFreezePolicyOptions: Option[];
};

const steps = [
  {
    id: "scope-identity",
    number: "01",
    title: "Scope and Identity",
    description: "Academic context, title, and code",
  },
  {
    id: "schedule-delivery",
    number: "02",
    title: "Schedule and Delivery",
    description: "Window, duration, marks",
  },
  {
    id: "runtime-rules",
    number: "03",
    title: "Runtime Rules",
    description: "Attempt, review, security",
  },
  {
    id: "learner-experience",
    number: "04",
    title: "Learner Experience",
    description: "Instructions and attempt behavior",
  },
];

type WizardGuidedDefaults = {
  examTypeValue: string;
  deliveryModeValue: string;
  durationMinutesValue: string;
  maxAttemptsValue: string;
  passingMarksValue: string;
  descriptionValue: string;
  timerModeValue: string;
  navigationModeValue: string;
  attemptPolicyValue: string;
  resultPublishModeValue: string;
  reviewModeValue: string;
  securityModeValue: string;
  economyPolicyType: string;
  starCostValue: string;
  entitlementCodeValue: string;
  allowResumeValue: boolean;
  allowSectionSwitchingValue: boolean;
  allowReturnToPreviousSectionValue: boolean;
  allowLateSubmitValue: boolean;
  randomizeQuestionsValue: boolean;
  randomizeOptionsValue: boolean;
  showResultImmediatelyValue: boolean;
  allowReviewAfterSubmitValue: boolean;
};

const commercialPathValueMap: Record<string, string> = {
  free: "free",
  free_exam: "free",
  stars_only: "stars_only",
  star_unlock_exam: "stars_only",
  entitlement_only: "subscription_only",
  subscription_only: "subscription_only",
  subscription_covered_exam: "subscription_only",
  stars_or_entitlement: "subscription_or_stars",
  subscription_or_stars: "subscription_or_stars",
  subscription_or_stars_exam: "subscription_or_stars",
  institute_sponsored: "institute_sponsored",
  institute_sponsored_exam: "institute_sponsored",
  platform_managed: "platform_managed",
  platform_sponsored_exam: "platform_managed",
};

function normalizeCommercialPathValue(value: string | undefined) {
  return commercialPathValueMap[value ?? ""] ?? value ?? "";
}

function normalizeCommercialPathOptions(options: Option[]) {
  const canonicalOptions: Option[] = [
    { value: "", label: "Open Access" },
    { value: "free", label: "Free" },
    { value: "stars_only", label: "Stars Only" },
    { value: "subscription_only", label: "Subscription Only" },
    { value: "subscription_or_stars", label: "Subscription Or Stars" },
    { value: "institute_sponsored", label: "Institute Sponsored" },
    { value: "platform_managed", label: "Platform Managed" },
  ];
  const availableValues = new Set(options.map((option) => normalizeCommercialPathValue(option.value)));
  return canonicalOptions.filter((option) => option.value === "" || availableValues.has(option.value));
}

function summarizePresetSections(
  presetPack: (typeof examPresetPacks)[number] | null,
) {
  const sections = presetPack?.builderDefaults?.sections ?? [];
  if (sections.length === 0) {
    return "No structured section guidance is mapped yet.";
  }
  return sections
    .map((section) => `${section.name} (${section.questionCount})`)
    .join(" | ");
}

function resolveProgramFamilyId(program: CreateExamWizardProps["programs"][number] | null) {
  return resolveAssessmentFamilyIdFromProgramLike(program, resolveAssessmentExamFamilyId);
}

function resolveProgramPresetPack(program: CreateExamWizardProps["programs"][number] | null) {
  const familyId = resolveProgramFamilyId(program);
  if (!familyId) {
    return null;
  }
  return (
    examPresetPacks.find((pack) => pack.familyId === familyId && pack.builderDefaults) ?? null
  );
}

function buildGuidedDefaults({
  defaultAttemptPolicy,
  defaultDeliveryMode,
  defaultExamType,
  defaultNavigationMode,
  defaultResultPublishMode,
  defaultReviewMode,
  defaultSecurityMode,
  defaultTimerMode,
  defaultEconomyPolicyType,
  program,
  presetPack,
}: {
  defaultAttemptPolicy: string;
  defaultDeliveryMode: string;
  defaultEconomyPolicyType: string;
  defaultExamType: string;
  defaultNavigationMode: string;
  defaultResultPublishMode: string;
  defaultReviewMode: string;
  defaultSecurityMode: string;
  defaultTimerMode: string;
  program: CreateExamWizardProps["programs"][number] | null;
  presetPack?: (typeof examPresetPacks)[number] | null;
}): WizardGuidedDefaults {
  const resolvedPresetPack = presetPack ?? resolveProgramPresetPack(program);
  const packDefaults = resolvedPresetPack?.builderDefaults;
  const recommendedDuration = resolvedPresetPack?.recommendations?.suggestedDurationMinutes ?? "30";

  return {
    examTypeValue: packDefaults?.exam.examType ?? defaultExamType,
    deliveryModeValue: packDefaults?.exam.deliveryMode ?? defaultDeliveryMode,
    durationMinutesValue: packDefaults?.exam.durationMinutes ?? recommendedDuration,
    maxAttemptsValue: packDefaults?.delivery.maxAttempts ?? "1",
    passingMarksValue: packDefaults?.exam.passingMarks ?? "0",
    descriptionValue: packDefaults?.exam.description ?? "",
    timerModeValue: packDefaults?.delivery.timerMode ?? defaultTimerMode,
    navigationModeValue: packDefaults?.delivery.navigationMode ?? defaultNavigationMode,
    attemptPolicyValue: packDefaults?.delivery.attemptPolicy ?? defaultAttemptPolicy,
    resultPublishModeValue:
      packDefaults?.delivery.resultPublishMode ?? defaultResultPublishMode,
    reviewModeValue: packDefaults?.delivery.reviewMode ?? defaultReviewMode,
    securityModeValue: packDefaults?.delivery.securityMode ?? defaultSecurityMode,
    economyPolicyType: normalizeCommercialPathValue(
      packDefaults?.economy.policyType ?? defaultEconomyPolicyType,
    ),
    starCostValue: packDefaults?.economy.starCost ?? "0",
    entitlementCodeValue: packDefaults?.economy.entitlementCode ?? "",
    allowResumeValue: packDefaults?.delivery.allowResume ?? true,
    allowSectionSwitchingValue: packDefaults?.delivery.allowSectionSwitching ?? true,
    allowReturnToPreviousSectionValue:
      packDefaults?.delivery.allowReturnToPreviousSection ?? true,
    allowLateSubmitValue: false,
    randomizeQuestionsValue: packDefaults?.delivery.randomizeQuestions ?? false,
    randomizeOptionsValue: packDefaults?.delivery.randomizeOptions ?? false,
    showResultImmediatelyValue: (packDefaults?.delivery.resultPublishMode ?? "") === "immediate",
    allowReviewAfterSubmitValue: !["disabled", "none"].includes(
      packDefaults?.delivery.reviewMode ?? "",
    ),
  };
}

export function CreateExamWizard({
  action,
  academicYears,
  academicsApiBasePath = "/api/teacher/academics",
  hiddenFields = [],
  scopeContextLabel = "teacher scope",
  selectedAcademicYear,
  programs,
  selectedProgram,
  cohorts,
  subjects,
  sourceOptions,
  selectedSource,
  sourceHelpText = "",
  economyAccessPolicyOptions,
  examTypeOptions,
  deliveryModeOptions,
  timerModeOptions,
  navigationModeOptions,
  attemptPolicyOptions,
  resultPublishModeOptions,
  reviewModeOptions,
  securityModeOptions,
  rankVisibilityModeOptions,
  percentileVisibilityModeOptions,
  benchmarkVisibilityModeOptions,
  rankFreezePolicyOptions,
}: CreateExamWizardProps) {
  const defaultExamType = examTypeOptions[0]?.value ?? "";
  const defaultDeliveryMode = deliveryModeOptions[0]?.value ?? "";
  const defaultTimerMode = timerModeOptions[0]?.value ?? "";
  const defaultNavigationMode = navigationModeOptions[0]?.value ?? "";
  const defaultAttemptPolicy = attemptPolicyOptions[0]?.value ?? "";
  const defaultResultPublishMode = resultPublishModeOptions[0]?.value ?? "";
  const defaultReviewMode = reviewModeOptions[0]?.value ?? "";
  const defaultSecurityMode = securityModeOptions[0]?.value ?? "";
  const normalizedEconomyAccessPolicyOptions = useMemo(
    () => normalizeCommercialPathOptions(economyAccessPolicyOptions),
    [economyAccessPolicyOptions],
  );
  const defaultEconomyPolicyType = normalizedEconomyAccessPolicyOptions[0]?.value ?? "";
  const defaultRankVisibilityMode = rankVisibilityModeOptions[0]?.value ?? "hidden";
  const defaultPercentileVisibilityMode = percentileVisibilityModeOptions[0]?.value ?? "hidden";
  const defaultBenchmarkVisibilityMode = benchmarkVisibilityModeOptions[0]?.value ?? "peer_average_only";
  const defaultRankFreezePolicy = rankFreezePolicyOptions[0]?.value ?? "freeze_on_exam_closure";
  const initialProgramRecord = programs.find((program) => program.id === selectedProgram) ?? null;
  const initialProgramPresetPack = resolveProgramPresetPack(initialProgramRecord);
  const initialGuidedDefaults = buildGuidedDefaults({
    defaultAttemptPolicy,
    defaultDeliveryMode,
    defaultEconomyPolicyType,
    defaultExamType,
    defaultNavigationMode,
    defaultResultPublishMode,
    defaultReviewMode,
    defaultSecurityMode,
    defaultTimerMode,
    program: initialProgramRecord,
    presetPack: initialProgramPresetPack,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedAcademicYearValue, setSelectedAcademicYearValue] = useState(selectedAcademicYear);
  const [selectedProgramValue, setSelectedProgramValue] = useState(selectedProgram);
  const [cohortOptions, setCohortOptions] = useState(cohorts);
  const [subjectOptions, setSubjectOptions] = useState(subjects);
  const [selectedCohortValue, setSelectedCohortValue] = useState(
    cohorts.length === 1 ? cohorts[0]?.id ?? "" : "",
  );
  const [selectedSubjectValue, setSelectedSubjectValue] = useState(subjects[0]?.id ?? "");
  const [selectedSourceValue, setSelectedSourceValue] = useState(selectedSource);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState("");
  const [economyPolicyType, setEconomyPolicyType] = useState(initialGuidedDefaults.economyPolicyType);
  const [examTypeValue, setExamTypeValue] = useState(initialGuidedDefaults.examTypeValue);
  const [deliveryModeValue, setDeliveryModeValue] = useState(initialGuidedDefaults.deliveryModeValue);
  const [durationMinutesValue, setDurationMinutesValue] = useState(initialGuidedDefaults.durationMinutesValue);
  const [maxAttemptsValue, setMaxAttemptsValue] = useState(initialGuidedDefaults.maxAttemptsValue);
  const [passingMarksValue, setPassingMarksValue] = useState(initialGuidedDefaults.passingMarksValue);
  const [descriptionValue, setDescriptionValue] = useState(initialGuidedDefaults.descriptionValue);
  const [timerModeValue, setTimerModeValue] = useState(initialGuidedDefaults.timerModeValue);
  const [navigationModeValue, setNavigationModeValue] = useState(initialGuidedDefaults.navigationModeValue);
  const [attemptPolicyValue, setAttemptPolicyValue] = useState(initialGuidedDefaults.attemptPolicyValue);
  const [resultPublishModeValue, setResultPublishModeValue] = useState(
    initialGuidedDefaults.resultPublishModeValue,
  );
  const [reviewModeValue, setReviewModeValue] = useState(initialGuidedDefaults.reviewModeValue);
  const [securityModeValue, setSecurityModeValue] = useState(initialGuidedDefaults.securityModeValue);
  const [starCostValue, setStarCostValue] = useState(initialGuidedDefaults.starCostValue);
  const [entitlementCodeValue, setEntitlementCodeValue] = useState(initialGuidedDefaults.entitlementCodeValue);
  const [allowResumeValue, setAllowResumeValue] = useState(initialGuidedDefaults.allowResumeValue);
  const [allowSectionSwitchingValue, setAllowSectionSwitchingValue] = useState(
    initialGuidedDefaults.allowSectionSwitchingValue,
  );
  const [allowReturnToPreviousSectionValue, setAllowReturnToPreviousSectionValue] = useState(
    initialGuidedDefaults.allowReturnToPreviousSectionValue,
  );
  const [allowLateSubmitValue, setAllowLateSubmitValue] = useState(initialGuidedDefaults.allowLateSubmitValue);
  const [randomizeQuestionsValue, setRandomizeQuestionsValue] = useState(
    initialGuidedDefaults.randomizeQuestionsValue,
  );
  const [randomizeOptionsValue, setRandomizeOptionsValue] = useState(
    initialGuidedDefaults.randomizeOptionsValue,
  );
  const [showResultImmediatelyValue, setShowResultImmediatelyValue] = useState(
    initialGuidedDefaults.showResultImmediatelyValue,
  );
  const [allowReviewAfterSubmitValue, setAllowReviewAfterSubmitValue] = useState(
    initialGuidedDefaults.allowReviewAfterSubmitValue,
  );
  const [selectedPresetPackId, setSelectedPresetPackId] = useState(initialProgramPresetPack?.id ?? "");
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const selectedProgramRecord = useMemo(
    () => programs.find((program) => program.id === selectedProgramValue) ?? null,
    [programs, selectedProgramValue],
  );
  const selectedProgramFamilyId = useMemo(() => {
    return resolveProgramFamilyId(selectedProgramRecord);
  }, [selectedProgramRecord]);
  const selectedProgramBaseFamilyMetadata = useMemo(
    () => getAssessmentExamFamilyMetadata(selectedProgramFamilyId),
    [selectedProgramFamilyId],
  );
  const selectedProgramPresetPack = useMemo(() => {
    const activePresetPack =
      examPresetPacks.find((pack) => pack.id === selectedPresetPackId && pack.builderDefaults) ?? null;
    if (
      activePresetPack &&
      ((selectedProgramBaseFamilyMetadata?.programFamilyCode &&
        activePresetPack.programFamilyCode === selectedProgramBaseFamilyMetadata.programFamilyCode) ||
        activePresetPack.familyId === selectedProgramFamilyId)
    ) {
      return activePresetPack;
    }
    return resolveProgramPresetPack(selectedProgramRecord);
  }, [selectedPresetPackId, selectedProgramRecord, selectedProgramFamilyId, selectedProgramBaseFamilyMetadata]);
  const effectiveFamilyId = useMemo(
    () => selectedProgramPresetPack?.familyId ?? selectedProgramFamilyId,
    [selectedProgramPresetPack?.familyId, selectedProgramFamilyId],
  );
  const selectedProgramFamilyMetadata = useMemo(
    () => getAssessmentExamFamilyMetadata(effectiveFamilyId),
    [effectiveFamilyId],
  );
  const availableProgramPresetPacks = useMemo(() => {
    const programFamilyCode = selectedProgramFamilyMetadata?.programFamilyCode;
    if (!programFamilyCode) {
      return [] as typeof examPresetPacks;
    }
    return examPresetPacks.filter(
      (pack) => pack.builderDefaults && pack.programFamilyCode === programFamilyCode,
    );
  }, [selectedProgramFamilyMetadata?.programFamilyCode]);
  const familyExecutionChecklist = useMemo(
    () =>
      buildAssessmentFamilyExecutionChecklist(
        effectiveFamilyId,
        selectedProgramPresetPack?.recommendations?.questionMixGuidance ?? "",
      ),
    [effectiveFamilyId, selectedProgramPresetPack],
  );

  function applyGuidedDefaultsForProgram(programId: string, presetPackId?: string) {
    const nextProgramRecord = programs.find((program) => program.id === programId) ?? null;
    const nextProgramPresetPack = resolveProgramPresetPack(nextProgramRecord);
    const nextPresetPack =
      examPresetPacks.find((pack) => pack.id === presetPackId && pack.builderDefaults) ??
      nextProgramPresetPack;
    const nextDefaults = buildGuidedDefaults({
      defaultAttemptPolicy,
      defaultDeliveryMode,
      defaultEconomyPolicyType,
      defaultExamType,
      defaultNavigationMode,
      defaultResultPublishMode,
      defaultReviewMode,
      defaultSecurityMode,
      defaultTimerMode,
      program: nextProgramRecord,
      presetPack: nextPresetPack,
    });
    setSelectedPresetPackId(nextPresetPack?.id ?? "");
    setExamTypeValue(nextDefaults.examTypeValue);
    setDeliveryModeValue(nextDefaults.deliveryModeValue);
    setDurationMinutesValue(nextDefaults.durationMinutesValue);
    setMaxAttemptsValue(nextDefaults.maxAttemptsValue);
    setPassingMarksValue(nextDefaults.passingMarksValue);
    setDescriptionValue(nextDefaults.descriptionValue);
    setTimerModeValue(nextDefaults.timerModeValue);
    setNavigationModeValue(nextDefaults.navigationModeValue);
    setAttemptPolicyValue(nextDefaults.attemptPolicyValue);
    setResultPublishModeValue(nextDefaults.resultPublishModeValue);
    setReviewModeValue(nextDefaults.reviewModeValue);
    setSecurityModeValue(nextDefaults.securityModeValue);
    setEconomyPolicyType(nextDefaults.economyPolicyType);
    setStarCostValue(nextDefaults.starCostValue);
    setEntitlementCodeValue(nextDefaults.entitlementCodeValue);
    setAllowResumeValue(nextDefaults.allowResumeValue);
    setAllowSectionSwitchingValue(nextDefaults.allowSectionSwitchingValue);
    setAllowReturnToPreviousSectionValue(nextDefaults.allowReturnToPreviousSectionValue);
    setAllowLateSubmitValue(nextDefaults.allowLateSubmitValue);
    setRandomizeQuestionsValue(nextDefaults.randomizeQuestionsValue);
    setRandomizeOptionsValue(nextDefaults.randomizeOptionsValue);
    setShowResultImmediatelyValue(nextDefaults.showResultImmediatelyValue);
    setAllowReviewAfterSubmitValue(nextDefaults.allowReviewAfterSubmitValue);
  }

  useEffect(() => {
    let ignore = false;

    async function loadScopeOptions() {
      if (!selectedProgramValue) {
        setCohortOptions([]);
        setSubjectOptions([]);
        setSelectedCohortValue("");
        setSelectedSubjectValue("");
        setScopeError("");
        return;
      }

      setIsScopeLoading(true);
      setScopeError("");

      try {
        const cohortQuery = new URLSearchParams({
          is_active: "true",
          program: selectedProgramValue,
        });
        if (selectedAcademicYearValue) {
          cohortQuery.set("academic_year", selectedAcademicYearValue);
        }

        const subjectQuery = new URLSearchParams({
          is_active: "true",
          program: selectedProgramValue,
        });

        const [cohortResponse, subjectResponse] = await Promise.all([
          fetch(`${academicsApiBasePath}/cohorts?${cohortQuery.toString()}`, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(`${academicsApiBasePath}/subjects?${subjectQuery.toString()}`, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        if (!cohortResponse.ok || !subjectResponse.ok) {
          throw new Error("Unable to refresh scope options.");
        }

        const [cohortPayload, subjectPayload] = (await Promise.all([
          cohortResponse.json(),
          subjectResponse.json(),
        ])) as [LookupResponse<SelectOption>, LookupResponse<SelectOption>];

        if (ignore) {
          return;
        }

        const nextCohorts = cohortPayload.results;
        const nextSubjects = subjectPayload.results;

        setCohortOptions(nextCohorts);
        setSubjectOptions(nextSubjects);
        setSelectedCohortValue((current) =>
          current && nextCohorts.some((cohort) => cohort.id === current)
            ? current
            : nextCohorts.length === 1
              ? nextCohorts[0]?.id ?? ""
              : "",
        );
        setSelectedSubjectValue((current) =>
          current && nextSubjects.some((subject) => subject.id === current) ? current : "",
        );
      } catch (error) {
        if (ignore) {
          return;
        }

        setCohortOptions([]);
        setSubjectOptions([]);
        setSelectedCohortValue("");
        setSelectedSubjectValue("");
        setScopeError(
          error instanceof Error && error.message
            ? error.message
            : "Unable to refresh scope options.",
        );
      } finally {
        if (!ignore) {
          setIsScopeLoading(false);
        }
      }
    }

    void loadScopeOptions();

    return () => {
      ignore = true;
    };
  }, [academicsApiBasePath, selectedAcademicYearValue, selectedProgramValue]);

  function validateCurrentStep() {
    const section = formRef.current?.querySelector<HTMLElement>(
      `[data-step-index="${activeStep}"]`,
    );

    if (!section) {
      return true;
    }

    const fields = section.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");

    for (const field of fields) {
      if (!field.reportValidity()) {
        field.focus();
        return false;
      }
    }

    return true;
  }

  function moveNext() {
    if (!validateCurrentStep()) {
      return;
    }

    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function moveBack() {
    setActiveStep((current) => Math.max(current - 1, 0));
  }

  function jumpToStep(index: number) {
    if (index <= activeStep) {
      setActiveStep(index);
      return;
    }

    if (index === activeStep + 1 && validateCurrentStep()) {
      setActiveStep(index);
    }
  }

  return (
    <div className="wizardShell">
      <div className="wizardProgress">
        <div>
          <span className="builderFlowLabel">Guided creation</span>
          <strong>{steps[activeStep]?.title}</strong>
          <p>{steps[activeStep]?.description}</p>
        </div>
        <div className="wizardProgressBar" aria-hidden="true">
          <span style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="wizardStepChips" role="tablist" aria-label="Create exam steps">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;
          const isUnlocked = index <= activeStep + 1;

          return (
            <button
              aria-selected={isActive}
              className={`wizardStepChip ${isActive ? "wizardStepChipActive" : ""} ${isComplete ? "wizardStepChipComplete" : ""}`}
              disabled={!isUnlocked}
              key={step.id}
              onClick={() => jumpToStep(index)}
              role="tab"
              type="button"
            >
              <span>{step.number}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </div>
            </button>
          );
        })}
      </div>

      <form action={action} className="contentCard wizardForm" ref={formRef}>
        {hiddenFields.map((field) => (
          <input key={`${field.name}-${field.value}`} name={field.name} type="hidden" value={field.value} />
        ))}
        <div className="wizardSectionIntro">
          <div>
            <span className="builderFlowLabel">Current step</span>
            <strong>{steps[activeStep]?.title}</strong>
          </div>
          <p>{steps[activeStep]?.description}</p>
        </div>

        <div className="builderForm builderWorkspace">
          <section
            className={`builderSectionCard ${activeStep === 0 ? "" : "wizardSectionHidden"}`}
            data-step-index={0}
            id="scope-identity"
          >
            <div className="builderSectionHeader">
              <div>
                <strong>Scope and Identity</strong>
                <p>Choose the academic context and define how this new exam will be recognized across the workspace.</p>
              </div>
            </div>
            <div className="wizardFeatureGrid">
              <article className="wizardFeatureCard">
                <span>Academic scope</span>
                <strong>{academicYears.length} year options</strong>
                <small>{`Live academic years from the backend ${scopeContextLabel}.`}</small>
              </article>
              <article className="wizardFeatureCard">
                <span>Program coverage</span>
                <strong>{programs.length} programs</strong>
                <small>Each program keeps the new exam linked to the right curriculum lane.</small>
              </article>
              <article className="wizardFeatureCard">
                <span>Family defaults</span>
                <strong>{selectedProgramFamilyMetadata?.label ?? "Generic flow"}</strong>
                <small>
                  {selectedProgramPresetPack
                    ? `${selectedProgramPresetPack.label} will prefill guided defaults for this program.`
                    : "No family-aligned preset pack is mapped yet, so the wizard is using generic defaults."}
                </small>
              </article>
            </div>
            {availableProgramPresetPacks.length > 1 ? (
              <div className="builderHintPanel">
                <strong>Family preset</strong>
                <p>
                  Choose the starting exam lane for this program before you continue deeper into delivery and runtime defaults.
                </p>
                <div className="advancedBuilderTemplateStrip">
                  {availableProgramPresetPacks.map((presetPack) => (
                    <button
                      key={presetPack.id}
                      className={`advancedBuilderTemplateCard ${
                        selectedProgramPresetPack?.id === presetPack.id ? "advancedBuilderTemplateCardActive" : ""
                      }`}
                      onClick={() => applyGuidedDefaultsForProgram(selectedProgramValue, presetPack.id)}
                      type="button"
                    >
                      <span className="advancedBuilderTemplateChip">{presetPack.chip}</span>
                      <strong>{presetPack.label}</strong>
                      <small>{presetPack.note}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="builderGrid">
              <label className="fieldStack">
                <span>Academic year</span>
                <select
                  name="academic_year"
                  onChange={(event) => setSelectedAcademicYearValue(event.target.value)}
                  required
                  value={selectedAcademicYearValue}
                >
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Program</span>
                <select
                  name="program"
                  onChange={(event) => {
                    const nextProgramValue = event.target.value;
                    setSelectedProgramValue(nextProgramValue);
                    applyGuidedDefaultsForProgram(nextProgramValue);
                  }}
                  required
                  value={selectedProgramValue}
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name} ({program.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Cohort</span>
                <select
                  disabled={isScopeLoading}
                  name="cohort"
                  onChange={(event) => setSelectedCohortValue(event.target.value)}
                  value={selectedCohortValue}
                >
                  <option value="">No cohort restriction</option>
                  {cohortOptions.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}{cohort.code ? ` (${cohort.code})` : ""}
                    </option>
                  ))}
                </select>
                <small>
                  {isScopeLoading
                    ? "Refreshing cohort options for the selected academic scope."
                    : `${cohortOptions.length} cohort option${cohortOptions.length === 1 ? "" : "s"} in scope.`}
                </small>
              </label>

              <label className="fieldStack">
                <span>Subject</span>
                <select
                  disabled={isScopeLoading}
                  name="subject"
                  onChange={(event) => setSelectedSubjectValue(event.target.value)}
                  value={selectedSubjectValue}
                >
                  <option value="">No subject selected</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}{subject.code ? ` (${subject.code})` : ""}
                    </option>
                  ))}
                </select>
                <small>
                  {isScopeLoading
                    ? "Refreshing subject options for the selected program."
                    : `${subjectOptions.length} subject option${subjectOptions.length === 1 ? "" : "s"} in scope.`}
                </small>
              </label>

              <label className="fieldStack">
                <span>Exam title</span>
                <input name="title" placeholder="Mathematics Weekly Test" required type="text" />
              </label>

              <label className="fieldStack">
                <span>Exam code</span>
                <input name="code" placeholder="MATH-WK-01" required type="text" />
              </label>

              <label className="fieldStack">
                <span>Publishing source</span>
                <select
                  name="source_type"
                  onChange={(event) => setSelectedSourceValue(event.target.value)}
                  required
                  value={selectedSourceValue}
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  {sourceHelpText ||
                    "Choose whether students should see this exam as platform, institute, or teacher-owned content."}
                </small>
              </label>

              <label className="fieldStack">
                <span>Access policy</span>
                <select
                  name="economy_policy_type"
                  onChange={(event) => setEconomyPolicyType(event.target.value)}
                  value={economyPolicyType}
                >
                  {normalizedEconomyAccessPolicyOptions.map((option) => (
                    <option key={option.value || "open-access"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Star cost</span>
                <input
                  min="0"
                  name="economy_star_cost"
                  onChange={(event) => setStarCostValue(event.target.value)}
                  step="1"
                  type="number"
                  value={starCostValue}
                />
                <small>
                  {economyPolicyType === "stars_only" || economyPolicyType === "subscription_or_stars"
                    ? "Required when students may unlock this exam with stars."
                    : "Keep zero for free, subscription, or sponsored access."}
                </small>
              </label>

              <label className="fieldStack">
                <span>Entitlement code</span>
                <input
                  name="economy_entitlement_code"
                  onChange={(event) => setEntitlementCodeValue(event.target.value)}
                  placeholder="subscription:math-premium"
                  type="text"
                  value={entitlementCodeValue}
                />
                <small>
                  {economyPolicyType === "subscription_only" || economyPolicyType === "subscription_or_stars"
                    ? "Use a subscription-style code, or leave the default pattern."
                    : economyPolicyType === "institute_sponsored" || economyPolicyType === "platform_managed"
                      ? "No entitlement code is needed for sponsored or platform-managed access."
                      : "Only needed when this exam uses an entitlement-backed path."}
                </small>
              </label>

              <label className="fieldStack">
                <span>Policy priority</span>
                <input
                  defaultValue="100"
                  min="1"
                  name="economy_policy_priority"
                  step="1"
                  type="number"
                />
              </label>
            </div>
            {selectedProgramPresetPack && selectedProgramFamilyMetadata ? (
              <div className="builderHintPanel">
                <strong>{selectedProgramPresetPack.label} guidance</strong>
                <p>{selectedProgramPresetPack.recommendations?.authoringNote ?? selectedProgramPresetPack.note}</p>
                <small>
                  {selectedProgramFamilyMetadata.recommendedQuestionMixGuidance}
                  {" · "}
                  Section shape: {summarizePresetSections(selectedProgramPresetPack)}
                </small>
              </div>
            ) : null}
            {familyExecutionChecklist.length ? (
              <div className="builderHintPanel">
                <strong>Execution checklist</strong>
                <p>Use these lane-specific guardrails before you move deeper into schedule, runtime, and learner settings.</p>
                <ul className="builderHintPanelList">
                  {familyExecutionChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>
                  {selectedProgramFamilyMetadata?.authoringNote ??
                    "Keep the guided draft aligned to the selected family contract unless you intentionally need a variant."}
                </small>
              </div>
            ) : null}
            {scopeError ? <p className="feedbackBanner feedbackBannerError">{scopeError}</p> : null}
          </section>

          <section
            className={`builderSectionCard ${activeStep === 1 ? "" : "wizardSectionHidden"}`}
            data-step-index={1}
            id="schedule-delivery"
          >
            <div className="builderSectionHeader">
              <div>
                <strong>Schedule and Delivery</strong>
                <p>Define the format, timing, scoring, and window in which learners will take this exam.</p>
              </div>
            </div>
            <div className="wizardFeatureGrid">
              <article className="wizardFeatureCard">
                <span>Audience</span>
                <strong>{cohortOptions.length} cohort choices</strong>
                <small>Target one cohort or keep the shell open for a broader delivery setup.</small>
              </article>
              <article className="wizardFeatureCard">
                <span>Subject lane</span>
                <strong>{subjectOptions.length} subject choices</strong>
                <small>Useful when the same program needs separate assessments by subject.</small>
              </article>
            </div>
            <div className="builderGrid">
              <label className="fieldStack">
                <span>Exam type</span>
                <select
                  name="exam_type"
                  onChange={(event) => setExamTypeValue(event.target.value)}
                  value={examTypeValue}
                >
                  {examTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Delivery mode</span>
                <select
                  name="delivery_mode"
                  onChange={(event) => setDeliveryModeValue(event.target.value)}
                  value={deliveryModeValue}
                >
                  {deliveryModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Duration (minutes)</span>
                <input
                  min="1"
                  name="duration_minutes"
                  onChange={(event) => setDurationMinutesValue(event.target.value)}
                  required
                  type="number"
                  value={durationMinutesValue}
                />
              </label>

              <label className="fieldStack">
                <span>Max attempts</span>
                <input
                  min="1"
                  name="max_attempts"
                  onChange={(event) => setMaxAttemptsValue(event.target.value)}
                  required
                  type="number"
                  value={maxAttemptsValue}
                />
              </label>

              <label className="fieldStack">
                <span>Total marks</span>
                <input defaultValue="0" min="0" name="total_marks" step="0.01" type="number" />
              </label>

              <label className="fieldStack">
                <span>Passing marks</span>
                <input
                  min="0"
                  name="passing_marks"
                  onChange={(event) => setPassingMarksValue(event.target.value)}
                  step="0.01"
                  type="number"
                  value={passingMarksValue}
                />
              </label>

              <label className="fieldStack">
                <span>Start at</span>
                <input name="start_at" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>End at</span>
                <input name="end_at" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>Result publish at</span>
                <input name="result_publish_at" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>Review available from</span>
                <input name="review_available_from" type="datetime-local" />
              </label>

              <label className="fieldStack">
                <span>Review available until</span>
                <input name="review_available_until" type="datetime-local" />
              </label>
            </div>
            {selectedProgramPresetPack ? (
              <div className="builderHintPanel">
                <strong>Suggested launch shape</strong>
                <p>
                  {selectedProgramPresetPack.recommendations?.timingExpectation}
                </p>
                <small>
                  {selectedProgramPresetPack.recommendations?.suggestedQuestionCountBand
                    ? `${selectedProgramPresetPack.recommendations?.suggestedQuestionCountBand} · `
                    : ""}
                  {selectedProgramPresetPack.recommendations?.reviewPolicy}
                  {" · "}
                  Sections: {summarizePresetSections(selectedProgramPresetPack)}
                </small>
              </div>
            ) : null}
          </section>

          <section
            className={`builderSectionCard ${activeStep === 2 ? "" : "wizardSectionHidden"}`}
            data-step-index={2}
            id="runtime-rules"
          >
            <div className="builderSectionHeader">
              <div>
                <strong>Runtime Rules</strong>
                <p>Set how attempts behave, how results are published, and what review and security model applies.</p>
              </div>
            </div>
            <div className="builderGrid">
              <label className="fieldStack">
                <span>Timer mode</span>
                <select
                  name="timer_mode"
                  onChange={(event) => setTimerModeValue(event.target.value)}
                  value={timerModeValue}
                >
                  {timerModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Navigation mode</span>
                <select
                  name="navigation_mode"
                  onChange={(event) => setNavigationModeValue(event.target.value)}
                  value={navigationModeValue}
                >
                  {navigationModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Attempt policy</span>
                <select
                  name="attempt_policy"
                  onChange={(event) => setAttemptPolicyValue(event.target.value)}
                  value={attemptPolicyValue}
                >
                  {attemptPolicyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Result publish mode</span>
                <select
                  name="result_publish_mode"
                  onChange={(event) => setResultPublishModeValue(event.target.value)}
                  value={resultPublishModeValue}
                >
                  {resultPublishModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Review mode</span>
                <select
                  name="review_mode"
                  onChange={(event) => setReviewModeValue(event.target.value)}
                  value={reviewModeValue}
                >
                  {reviewModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Security mode</span>
                <select
                  name="security_mode"
                  onChange={(event) => setSecurityModeValue(event.target.value)}
                  value={securityModeValue}
                >
                  {securityModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  Choose the browser-monitoring expectation for this exam. Enhanced modes increase monitoring visibility, but they do not enable webcam or third-party proctoring by themselves.
                </small>
              </label>

              <label className="fieldStack">
                <span>Rank visibility</span>
                <select defaultValue={defaultRankVisibilityMode} name="rank_visibility_mode">
                  {rankVisibilityModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Percentile visibility</span>
                <select defaultValue={defaultPercentileVisibilityMode} name="percentile_visibility_mode">
                  {percentileVisibilityModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Benchmark visibility</span>
                <select defaultValue={defaultBenchmarkVisibilityMode} name="benchmark_visibility_mode">
                  {benchmarkVisibilityModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Rank freeze policy</span>
                <select defaultValue={defaultRankFreezePolicy} name="rank_freeze_policy">
                  {rankFreezePolicyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  Use provisional visibility for rolling exams, or hold rank and percentile until the exam closes.
                </small>
              </label>
            </div>
            {selectedProgramPresetPack ? (
              <div className="builderHintPanel">
                <strong>Runtime posture</strong>
                <p>{selectedProgramPresetPack.recommendations?.securitySuggestion}</p>
                <small>
                  {selectedProgramPresetPack.recommendations?.resultVisibility}
                  {" · "}
                  {selectedProgramPresetPack.recommendations?.reviewPolicy}
                </small>
              </div>
            ) : null}
            {selectedProgramRecord?.assessment_family_profile?.scoring_defaults ? (
              <div className="builderHintPanel">
                <strong>Scoring posture</strong>
                <p>
                  {summarizeFamilyScoringDefaults(
                    selectedProgramRecord.assessment_family_profile.scoring_defaults,
                    "builder",
                  )}
                </p>
                <small>
                  Use the runtime and marks settings here only when this exam should intentionally diverge from the family-level scoring contract.
                </small>
              </div>
            ) : null}
          </section>

          <section
            className={`builderSectionCard ${activeStep === 3 ? "" : "wizardSectionHidden"}`}
            data-step-index={3}
            id="learner-experience"
          >
            <div className="builderSectionHeader">
              <div>
                <strong>Learner Experience</strong>
                <p>Write the student-facing context and choose how the exam should behave during an active attempt.</p>
              </div>
            </div>

            <label className="fieldStack fieldStackFull">
              <span>Description</span>
              <textarea
                name="description"
                onChange={(event) => setDescriptionValue(event.target.value)}
                placeholder="Summarize what this exam covers and who it is intended for."
                rows={4}
                value={descriptionValue}
              />
            </label>

            <label className="fieldStack fieldStackFull">
              <span>Student instructions</span>
              <textarea
                name="instructions"
                placeholder="Add timing, submission, and attempt guidance for learners."
                rows={6}
              />
            </label>

            <div className="toggleGrid">
              <label><input checked={allowResumeValue} name="allow_resume" onChange={(event) => setAllowResumeValue(event.target.checked)} type="checkbox" /> Allow resume</label>
              <label><input checked={allowSectionSwitchingValue} name="allow_section_switching" onChange={(event) => setAllowSectionSwitchingValue(event.target.checked)} type="checkbox" /> Allow section switching</label>
              <label><input checked={allowReturnToPreviousSectionValue} name="allow_return_to_previous_section" onChange={(event) => setAllowReturnToPreviousSectionValue(event.target.checked)} type="checkbox" /> Allow return to previous section</label>
              <label><input checked={allowLateSubmitValue} name="allow_late_submit" onChange={(event) => setAllowLateSubmitValue(event.target.checked)} type="checkbox" /> Allow late submit</label>
              <label><input checked={randomizeQuestionsValue} name="randomize_questions" onChange={(event) => setRandomizeQuestionsValue(event.target.checked)} type="checkbox" /> Randomize questions</label>
              <label><input checked={randomizeOptionsValue} name="randomize_options" onChange={(event) => setRandomizeOptionsValue(event.target.checked)} type="checkbox" /> Randomize options</label>
              <label><input checked={showResultImmediatelyValue} name="show_result_immediately" onChange={(event) => setShowResultImmediatelyValue(event.target.checked)} type="checkbox" /> Show result immediately</label>
              <label><input checked={allowReviewAfterSubmitValue} name="allow_review_after_submit" onChange={(event) => setAllowReviewAfterSubmitValue(event.target.checked)} type="checkbox" /> Allow review after submit</label>
            </div>

            {selectedProgramPresetPack ? (
              <div className="builderHintPanel">
                <strong>Learner-facing guidance</strong>
                <p>
                  {selectedProgramPresetPack.builderDefaults?.experience.learnerSummary ??
                    selectedProgramPresetPack.note}
                </p>
                <small>
                  Creator posture:{" "}
                  {selectedProgramPresetPack.builderDefaults?.experience.creatorSummary ??
                    selectedProgramPresetPack.recommendations?.authoringNote}
                </small>
              </div>
            ) : null}
          </section>

          <div className="wizardActionBar">
            <button
              className="button buttonGhost"
              disabled={isFirstStep}
              onClick={moveBack}
              type="button"
            >
              Back
            </button>

            {!isLastStep ? (
              <button className="button buttonSecondary" onClick={moveNext} type="button">
                Continue
              </button>
            ) : (
              <ActionSubmitButton
                className="button buttonPrimary"
                idleLabel="Create Exam Shell"
                pendingLabel="Creating Exam..."
              />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
