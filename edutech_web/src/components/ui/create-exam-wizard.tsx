"use client";

import { useEffect, useRef, useState } from "react";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";

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
  programs: Array<{ id: string; name: string; code: string }>;
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
  const formRef = useRef<HTMLFormElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedAcademicYearValue, setSelectedAcademicYearValue] = useState(selectedAcademicYear);
  const [selectedProgramValue, setSelectedProgramValue] = useState(selectedProgram);
  const [cohortOptions, setCohortOptions] = useState(cohorts);
  const [subjectOptions, setSubjectOptions] = useState(subjects);
  const [selectedCohortValue, setSelectedCohortValue] = useState(cohorts[0]?.id ?? "");
  const [selectedSubjectValue, setSelectedSubjectValue] = useState(subjects[0]?.id ?? "");
  const [selectedSourceValue, setSelectedSourceValue] = useState(selectedSource);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState("");
  const [economyPolicyType, setEconomyPolicyType] = useState(economyAccessPolicyOptions[0]?.value ?? "");
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const defaultExamType = examTypeOptions[0]?.value ?? "";
  const defaultDeliveryMode = deliveryModeOptions[0]?.value ?? "";
  const defaultTimerMode = timerModeOptions[0]?.value ?? "";
  const defaultNavigationMode = navigationModeOptions[0]?.value ?? "";
  const defaultAttemptPolicy = attemptPolicyOptions[0]?.value ?? "";
  const defaultResultPublishMode = resultPublishModeOptions[0]?.value ?? "";
  const defaultReviewMode = reviewModeOptions[0]?.value ?? "";
  const defaultSecurityMode = securityModeOptions[0]?.value ?? "";
  const defaultRankVisibilityMode = rankVisibilityModeOptions[0]?.value ?? "hidden";
  const defaultPercentileVisibilityMode = percentileVisibilityModeOptions[0]?.value ?? "hidden";
  const defaultBenchmarkVisibilityMode = benchmarkVisibilityModeOptions[0]?.value ?? "peer_average_only";
  const defaultRankFreezePolicy = rankFreezePolicyOptions[0]?.value ?? "freeze_on_exam_closure";

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
          current && nextCohorts.some((cohort) => cohort.id === current) ? current : "",
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
            </div>
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
                  onChange={(event) => setSelectedProgramValue(event.target.value)}
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
                  {economyAccessPolicyOptions.map((option) => (
                    <option key={option.value || "open-access"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Star cost</span>
                <input
                  defaultValue="0"
                  min="0"
                  name="economy_star_cost"
                  step="1"
                  type="number"
                />
                <small>
                  {economyPolicyType === "stars_only" || economyPolicyType === "stars_or_entitlement"
                    ? "Required when students should unlock this exam using stars."
                    : "Keep zero for open or entitlement-only access."}
                </small>
              </label>

              <label className="fieldStack">
                <span>Entitlement code</span>
                <input
                  name="economy_entitlement_code"
                  placeholder="premium_math_access"
                  type="text"
                />
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
                <select defaultValue={defaultExamType} name="exam_type">
                  {examTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Delivery mode</span>
                <select defaultValue={defaultDeliveryMode} name="delivery_mode">
                  {deliveryModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Duration (minutes)</span>
                <input defaultValue="30" min="1" name="duration_minutes" required type="number" />
              </label>

              <label className="fieldStack">
                <span>Max attempts</span>
                <input defaultValue="1" min="1" name="max_attempts" required type="number" />
              </label>

              <label className="fieldStack">
                <span>Total marks</span>
                <input defaultValue="0" min="0" name="total_marks" step="0.01" type="number" />
              </label>

              <label className="fieldStack">
                <span>Passing marks</span>
                <input defaultValue="0" min="0" name="passing_marks" step="0.01" type="number" />
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
                <select defaultValue={defaultTimerMode} name="timer_mode">
                  {timerModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Navigation mode</span>
                <select defaultValue={defaultNavigationMode} name="navigation_mode">
                  {navigationModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Attempt policy</span>
                <select defaultValue={defaultAttemptPolicy} name="attempt_policy">
                  {attemptPolicyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Result publish mode</span>
                <select defaultValue={defaultResultPublishMode} name="result_publish_mode">
                  {resultPublishModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Review mode</span>
                <select defaultValue={defaultReviewMode} name="review_mode">
                  {reviewModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fieldStack">
                <span>Security mode</span>
                <select defaultValue={defaultSecurityMode} name="security_mode">
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
              <textarea name="description" placeholder="Summarize what this exam covers and who it is intended for." rows={4} />
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
              <label><input defaultChecked name="allow_resume" type="checkbox" /> Allow resume</label>
              <label><input defaultChecked name="allow_section_switching" type="checkbox" /> Allow section switching</label>
              <label><input defaultChecked name="allow_return_to_previous_section" type="checkbox" /> Allow return to previous section</label>
              <label><input name="allow_late_submit" type="checkbox" /> Allow late submit</label>
              <label><input name="randomize_questions" type="checkbox" /> Randomize questions</label>
              <label><input name="randomize_options" type="checkbox" /> Randomize options</label>
              <label><input name="show_result_immediately" type="checkbox" /> Show result immediately</label>
              <label><input defaultChecked name="allow_review_after_submit" type="checkbox" /> Allow review after submit</label>
            </div>
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
