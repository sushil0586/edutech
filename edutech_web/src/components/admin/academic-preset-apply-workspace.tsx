"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AcademicPresetSummary = {
  code: string;
  label: string;
  category: string;
  program_code: string;
  description: string;
  subject_count: number;
  topic_group_count: number;
  leaf_topic_count: number;
  subject_codes: string[];
};

type AcademicPresetDetail = AcademicPresetSummary & {
  program: {
    name: string;
    code: string;
    category: string;
    description: string;
    sort_order: number;
  };
  subjects: Array<{
    name: string;
    code: string;
    description: string;
    sort_order: number;
    topic_group_count: number;
    leaf_topic_count: number;
    topics: Array<{
      name: string;
      code: string;
      description: string;
      sort_order: number;
      children: Array<{
        name: string;
        code: string;
        sort_order: number;
      }>;
    }>;
  }>;
};

type ApplyMode = "full" | "selected_subjects" | "selected_topic_groups";

type QuestionBankPackageOption = {
  id: string;
  name: string;
  code: string;
  display_name?: string;
  ownership_type?: string;
  is_active?: boolean;
  is_public_catalog?: boolean;
};

type OnboardingProfile = {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  is_default: boolean;
  sort_order: number;
  config_json: Record<string, unknown>;
  is_active: boolean;
};

type AccessPreview = {
  question_bank_package: {
    enabled: boolean;
    package_code: string | null;
    package_name: string | null;
    action: string;
  };
  advanced_builder: {
    enabled: boolean;
    feature_code: string;
    action: string;
    source_package_code: string | null;
  };
};

type AcademicPresetPreview = {
  preset: AcademicPresetSummary;
  mode: ApplyMode;
  institute: {
    id: string;
    name: string;
    code: string;
  };
  academic_year: {
    name: string;
    start_date: string;
    end_date: string;
    action: string;
  };
  program: {
    name: string;
    code: string;
    action: string;
  };
  subjects: Array<{
    name: string;
    code: string;
    action: string;
    topic_groups: Array<{
      name: string;
      code: string;
      action: string;
      children: Array<{
        name: string;
        code: string;
        action: string;
      }>;
    }>;
    leaf_topic_count: number;
  }>;
  summary: {
    subjects_to_apply: number;
    topic_groups_to_apply: number;
    leaf_topics_to_create: number;
    leaf_topics_to_update: number;
  };
  access_plan?: AccessPreview;
};

type AcademicPresetApplyResult = {
  preset: AcademicPresetSummary;
  institute: {
    id: string;
    name: string;
    code: string;
  };
  mode: string;
  applied_subjects: Array<{
    name: string;
    code: string;
    topic_group_count: number;
    leaf_topic_count: number;
  }>;
  summary: {
    academic_years: { created: number; updated: number };
    programs: { created: number; updated: number };
    subjects: { created: number; updated: number };
    topics: { created: number; updated: number };
  };
  access_results?: {
    question_bank_package: {
      enabled: boolean;
      package_code: string | null;
      package_name: string | null;
      status: string;
      entitlement_id: string | null;
    };
    advanced_builder: {
      enabled: boolean;
      feature_code: string;
      status: string;
      entitlement_id: string | null;
      source_package_code: string | null;
    };
  };
  onboarding_run?: {
    id: string;
    status: string;
    profile_code: string;
    task_count: number;
  } | null;
  audit_findings: Array<{ code: string; records: Array<Record<string, unknown>> }>;
};

function getApiErrorMessage(payload: Record<string, unknown>, fallback: string) {
  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  for (const value of Object.values(payload)) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
  }

  return fallback;
}

function buildAcademicYearNameFromTemplate(template: string) {
  const now = new Date();
  const year = now.getFullYear();
  const nextStart = year;
  const nextEnd = year + 1;
  return template
    .replaceAll("{current_year}", String(year))
    .replaceAll("{next_year_start}", String(nextStart))
    .replaceAll("{next_year_end}", String(nextEnd));
}

function formatApplyModeLabel(mode: ApplyMode) {
  if (mode === "selected_subjects") {
    return "Selected subjects";
  }
  if (mode === "selected_topic_groups") {
    return "Selected topic groups";
  }
  return "Full preset";
}

export function AcademicPresetApplyWorkspace({
  instituteId,
  instituteLabel,
  initialPresets,
  initialOnboardingProfiles,
  initialSelectedProfileCode,
  initialOnboardingRunId,
  initialOnboardingRunConfig,
}: {
  instituteId: string | null;
  instituteLabel: string;
  initialPresets: AcademicPresetSummary[];
  initialOnboardingProfiles: OnboardingProfile[];
  initialSelectedProfileCode?: string;
  initialOnboardingRunId?: string;
  initialOnboardingRunConfig?: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const initialProfile =
    initialOnboardingProfiles.find((profile) => profile.code === initialSelectedProfileCode) ??
    initialOnboardingProfiles.find((profile) => profile.is_default) ??
    null;
  const initialProfileConfig = initialProfile?.config_json ?? {};
  const initialRunConfig = initialOnboardingRunConfig ?? {};
  const initialPresetFromRun = String(initialRunConfig.preset_code ?? "").trim();
  const initialPresetFromProfile = String(initialProfileConfig.academic_preset_code ?? "").trim();
  const initialPackageCodeFromRun = String(initialRunConfig.question_bank_package_code ?? "").trim().toUpperCase();
  const initialPackageCodeFromProfile = String(initialProfileConfig.question_bank_package_code ?? "").trim().toUpperCase();
  const initialPresetCandidate = initialPresetFromRun || initialPresetFromProfile;
  const initialPresetCode = initialPresets.some((preset) => preset.code === initialPresetCandidate)
    ? initialPresetCandidate
    : (initialPresets[0]?.code ?? "");
  const initialModeFromProfile = String(initialProfileConfig.apply_mode ?? "").trim();
  const initialModeFromRun = String(initialRunConfig.mode ?? "").trim();
  const initialModeCandidate = initialModeFromRun || initialModeFromProfile;
  const initialApplyMode: ApplyMode =
    initialModeCandidate === "selected_subjects" ||
    initialModeCandidate === "selected_topic_groups" ||
    initialModeCandidate === "full"
      ? initialModeCandidate
      : "full";
  const initialAcademicYearTemplate = String(initialProfileConfig.academic_year_name_template ?? "").trim();
  const initialRunSubjectCodes = useMemo(
    () =>
      Array.isArray(initialRunConfig.subject_codes)
        ? initialRunConfig.subject_codes.map((value) => String(value))
        : [],
    [initialRunConfig.subject_codes],
  );
  const initialRunTopicCodes = useMemo(
    () =>
      Array.isArray(initialRunConfig.topic_codes)
        ? initialRunConfig.topic_codes.map((value) => String(value))
        : [],
    [initialRunConfig.topic_codes],
  );

  const [presetCode, setPresetCode] = useState(initialPresetCode);
  const [selectedProfileCode, setSelectedProfileCode] = useState(
    initialSelectedProfileCode ||
      (initialOnboardingProfiles.find((profile) => profile.is_default)?.code ?? ""),
  );
  const [onboardingRunId, setOnboardingRunId] = useState(initialOnboardingRunId || "");
  const [presetDetail, setPresetDetail] = useState<AcademicPresetDetail | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(Boolean(initialPresetCode));
  const [mode, setMode] = useState<ApplyMode>(initialApplyMode);
  const [hasConsumedInitialRunSelection, setHasConsumedInitialRunSelection] = useState(false);
  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState<string[]>([]);
  const [selectedTopicCodes, setSelectedTopicCodes] = useState<string[]>([]);
  const [academicYearName, setAcademicYearName] = useState(
    String(initialRunConfig.academic_year_name ?? "").trim() ||
      (initialAcademicYearTemplate ? buildAcademicYearNameFromTemplate(initialAcademicYearTemplate) : "2026-2027"),
  );
  const [academicYearStart, setAcademicYearStart] = useState(
    String(initialRunConfig.academic_year_start ?? "").trim() || "2026-04-01",
  );
  const [academicYearEnd, setAcademicYearEnd] = useState(
    String(initialRunConfig.academic_year_end ?? "").trim() || "2027-03-31",
  );
  const [availablePackages, setAvailablePackages] = useState<QuestionBankPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [questionBankPackageEnabled, setQuestionBankPackageEnabled] = useState(
    Boolean(
      initialRunConfig.question_bank_package_enabled ?? initialProfileConfig.question_bank_package_enabled,
    ),
  );
  const [questionBankPackageCode, setQuestionBankPackageCode] = useState("");
  const [advancedBuilderEnabled, setAdvancedBuilderEnabled] = useState(
    Boolean(initialRunConfig.advanced_builder_enabled ?? initialProfileConfig.advanced_builder_enabled),
  );
  const [preview, setPreview] = useState<AcademicPresetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [lastApplyResult, setLastApplyResult] = useState<AcademicPresetApplyResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/economy/question-bank-packages", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => [])) as unknown;
        if (!response.ok || !Array.isArray(body)) {
          throw new Error("Unable to load question-bank packages.");
        }
        return body as QuestionBankPackageOption[];
      })
      .then((rows) => {
        if (cancelled) return;
        const eligiblePackages = rows.filter(
          (row) => row.is_active !== false && row.ownership_type === "platform",
        );
        setAvailablePackages(eligiblePackages);
        const resolvedInitialPackageCode =
          (initialPackageCodeFromRun || initialPackageCodeFromProfile) &&
          eligiblePackages.some(
            (pkg) => pkg.code === (initialPackageCodeFromRun || initialPackageCodeFromProfile),
          )
            ? (initialPackageCodeFromRun || initialPackageCodeFromProfile)
            : "";
        setQuestionBankPackageCode((current) => current || resolvedInitialPackageCode || eligiblePackages[0]?.code || "");
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load question-bank packages.");
      })
      .finally(() => {
        if (!cancelled) {
          setPackagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialPackageCodeFromProfile, initialPackageCodeFromRun]);

  useEffect(() => {
    if (!presetCode) {
      return;
    }

    let cancelled = false;

    fetch(`/api/admin/academics/presets/${presetCode}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error(getApiErrorMessage(body, "Unable to load preset details."));
        }
        return body as unknown as AcademicPresetDetail;
      })
      .then((body) => {
        if (cancelled) return;
        setPresetDetail(body);
        const allSubjectCodes = body.subjects.map((subject) => subject.code);
        const allTopicCodes = body.subjects.flatMap((subject) => subject.topics.map((topic) => topic.code));
        if (!hasConsumedInitialRunSelection && presetCode === initialPresetCode) {
          setSelectedSubjectCodes(initialRunSubjectCodes.length > 0 ? initialRunSubjectCodes : allSubjectCodes);
          setSelectedTopicCodes(initialRunTopicCodes.length > 0 ? initialRunTopicCodes : allTopicCodes);
          setHasConsumedInitialRunSelection(true);
        } else {
          setSelectedSubjectCodes(allSubjectCodes);
          setSelectedTopicCodes(allTopicCodes);
        }
      })
      .catch((loadError) => {
        if (cancelled) return;
        setPresetDetail(null);
        setSelectedSubjectCodes([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load preset details.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPreset(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasConsumedInitialRunSelection,
    initialPresetCode,
    initialRunSubjectCodes,
    initialRunTopicCodes,
    presetCode,
  ]);

  const chosenSubjectCount = useMemo(() => {
    if (mode === "full") {
      return presetDetail?.subjects.length ?? 0;
    }
    if (mode === "selected_topic_groups") {
      const subjectSet = new Set(
        (presetDetail?.subjects ?? [])
          .filter((subject) => subject.topics.some((topic) => selectedTopicCodes.includes(topic.code)))
          .map((subject) => subject.code),
      );
      return subjectSet.size;
    }
    return selectedSubjectCodes.length;
  }, [mode, presetDetail, selectedSubjectCodes, selectedTopicCodes]);

  const selectedProfile = useMemo(
    () => initialOnboardingProfiles.find((profile) => profile.code === selectedProfileCode) ?? null,
    [initialOnboardingProfiles, selectedProfileCode],
  );

  function toggleSubject(code: string) {
    setSelectedSubjectCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  function toggleTopic(code: string) {
    setSelectedTopicCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  function applySelectedProfile() {
    if (!selectedProfile) {
      setProfileMessage("Select an onboarding profile first.");
      return;
    }

    const config = selectedProfile.config_json ?? {};
    const nextMessages: string[] = [];

    const nextPresetCode = String(config.academic_preset_code ?? "").trim();
    if (nextPresetCode) {
      const presetExists = initialPresets.some((preset) => preset.code === nextPresetCode);
      if (presetExists) {
        setPresetCode(nextPresetCode);
        setLoadingPreset(true);
        setPresetDetail(null);
        setPreview(null);
        setLastApplyResult(null);
      } else {
        nextMessages.push(`Preset ${nextPresetCode} is not available in this environment.`);
      }
    }

    const nextMode = String(config.apply_mode ?? "").trim();
    if (
      nextMode === "full" ||
      nextMode === "selected_subjects" ||
      nextMode === "selected_topic_groups"
    ) {
      setMode(nextMode);
    }

    const nextAcademicYearTemplate = String(config.academic_year_name_template ?? "").trim();
    if (nextAcademicYearTemplate) {
      setAcademicYearName(buildAcademicYearNameFromTemplate(nextAcademicYearTemplate));
    }

    const nextPackageEnabled = Boolean(config.question_bank_package_enabled);
    setQuestionBankPackageEnabled(nextPackageEnabled);

    const nextPackageCode = String(config.question_bank_package_code ?? "").trim().toUpperCase();
    if (nextPackageCode) {
      const packageExists = availablePackages.some((pkg) => pkg.code === nextPackageCode);
      if (packageExists) {
        setQuestionBankPackageCode(nextPackageCode);
      } else {
        setQuestionBankPackageCode("");
        if (nextPackageEnabled) {
          setQuestionBankPackageEnabled(false);
        }
        nextMessages.push(`Package ${nextPackageCode} is not available in the current economy catalog.`);
      }
    }

    setAdvancedBuilderEnabled(Boolean(config.advanced_builder_enabled));
    setProfileMessage(
      nextMessages.length > 0
        ? `${selectedProfile.name} applied with warnings: ${nextMessages.join(" ")}`
        : `${selectedProfile.name} defaults applied.`,
    );
  }

  async function handlePreview() {
    if (!instituteId || !presetCode) {
      setError("Select an institute and preset before previewing.");
      return;
    }

    setPreviewLoading(true);
    setError("");
    setMessage("");
    setLastApplyResult(null);

    try {
      const response = await fetch("/api/admin/academics/presets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institute: instituteId,
          onboarding_run_id: onboardingRunId || null,
          preset_code: presetCode,
          mode,
          subject_codes: mode === "selected_subjects" ? selectedSubjectCodes : [],
          topic_codes: mode === "selected_topic_groups" ? selectedTopicCodes : [],
          academic_year_name: academicYearName,
          academic_year_start: academicYearStart,
          academic_year_end: academicYearEnd,
          question_bank_package_enabled: questionBankPackageEnabled,
          question_bank_package_code: questionBankPackageCode,
          advanced_builder_enabled: advancedBuilderEnabled,
          onboarding_profile_code: selectedProfileCode,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(body, "Unable to preview preset application."));
      }
      setPreview(body as unknown as AcademicPresetPreview);
      setMessage("Preview generated. Review the create/update counts before applying.");
    } catch (previewError) {
      setPreview(null);
      setError(
        previewError instanceof Error ? previewError.message : "Unable to preview preset application.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleApply() {
    if (!instituteId || !presetCode) {
      setError("Select an institute and preset before applying.");
      return;
    }

    setApplyLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/academics/presets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institute: instituteId,
          onboarding_run_id: onboardingRunId || null,
          preset_code: presetCode,
          mode,
          subject_codes: mode === "selected_subjects" ? selectedSubjectCodes : [],
          topic_codes: mode === "selected_topic_groups" ? selectedTopicCodes : [],
          academic_year_name: academicYearName,
          academic_year_start: academicYearStart,
          academic_year_end: academicYearEnd,
          question_bank_package_enabled: questionBankPackageEnabled,
          question_bank_package_code: questionBankPackageCode,
          advanced_builder_enabled: advancedBuilderEnabled,
          onboarding_profile_code: selectedProfileCode,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(body, "Unable to apply preset."));
      }
      const result = body as unknown as AcademicPresetApplyResult;
      setLastApplyResult(result);
      if (result.onboarding_run?.id) {
        setOnboardingRunId(result.onboarding_run.id);
      }
      setPreview(null);
      setMessage(
        `Preset applied to ${result.institute.name}. Subjects created: ${result.summary.subjects.created}, updated: ${result.summary.subjects.updated}.`,
      );
      router.refresh();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply preset.");
    } finally {
      setApplyLoading(false);
    }
  }

  if (!instituteId) {
    return (
      <article className="dashboardPanel academicSectionPanel">
        <div className="studentPageTight">
          <div className="featurePlaceholder">
            <p>Select an institute to apply master academic defaults.</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="dashboardPanel academicSectionPanel">
      <div className="studentPageTight">
        <div className="academicSectionHeader">
          <div>
            <strong>Master defaults</strong>
            <span className="setupFieldMeta">
              Apply backend-managed program, subject, and topic presets to {instituteLabel}.
            </span>
          </div>
        </div>

        <section className="contentCard adminAcademicHeroCard" style={{ marginTop: 16 }}>
          <div className="adminAcademicHeroHeader">
            <div>
              <span className="adminAcademicSectionEyebrow">Profile-driven defaults</span>
              <strong>Onboarding profile defaults</strong>
              <p className="setupFieldMeta">
                Load reusable institute onboarding defaults from the database-backed profile registry.
              </p>
            </div>
            <div className="adminAcademicHeroBadges">
              <span className="setupFieldMeta">Config driven</span>
              <span className="setupFieldMeta">Economy aware</span>
            </div>
          </div>
          <div className="adminAcademicHeroGrid">
            <div className="adminAcademicHeroPrimary">
              <label>
                <span>Onboarding profile</span>
                <select
                  value={selectedProfileCode}
                  onChange={(event) => setSelectedProfileCode(event.target.value)}
                >
                  <option value="">Select profile</option>
                  {initialOnboardingProfiles.map((profile) => (
                    <option key={profile.id} value={profile.code}>
                      {profile.name} ({profile.code})
                    </option>
                  ))}
                </select>
                <small>
                  Profiles are configurable records. This keeps onboarding defaults out of hardcoded frontend branches.
                </small>
              </label>
              <div className="adminAcademicHeroActions">
                <button className="button buttonSecondary" onClick={applySelectedProfile} type="button">
                  Use profile defaults
                </button>
              </div>
            </div>
            <aside className="adminAcademicHeroSummary">
              <span className="adminAcademicHeroSummaryLabel">Current profile summary</span>
              <strong>{selectedProfile?.name ?? "No profile selected"}</strong>
              <p className="setupFieldMeta">
                {selectedProfile?.description || "Choose a profile to load preset, access, and onboarding defaults."}
              </p>
              {selectedProfile ? (
                <div className="adminAcademicScopeStats adminAcademicHeroStats">
                  <span className="setupFieldMeta">{selectedProfile.code}</span>
                  <span className="setupFieldMeta">{selectedProfile.category}</span>
                  <span className="setupFieldMeta">{selectedProfile.is_default ? "Default profile" : "Optional profile"}</span>
                </div>
              ) : null}
            </aside>
          </div>
          {profileMessage ? <p className="adminAcademicModalMessage">{profileMessage}</p> : null}
        </section>

        <section className="adminAcademicControlLayout">
          <div className="contentCard adminAcademicControlCard">
            <div className="adminAcademicSectionHeading">
              <span className="adminAcademicSectionEyebrow">Manual override</span>
              <strong>Academic scope</strong>
              <p className="setupFieldMeta">
                Choose the master preset and year window that should be materialized into the institute.
              </p>
            </div>
            <div className="adminAcademicCompactForm adminAcademicCompactFormWide">
              <label>
                <span>Academic preset</span>
                <select
                  value={presetCode}
                  onChange={(event) => {
                    setPresetCode(event.target.value);
                    setPresetDetail(null);
                    setSelectedSubjectCodes([]);
                    setSelectedTopicCodes([]);
                    setPreview(null);
                    setLastApplyResult(null);
                    setLoadingPreset(Boolean(event.target.value));
                    setError("");
                    setMessage("");
                  }}
                >
                  {initialPresets.map((preset) => (
                    <option key={preset.code} value={preset.code}>
                      {preset.label} ({preset.code})
                    </option>
                  ))}
                </select>
                <small>Preset registry comes from backend master data, not frontend hardcoding.</small>
              </label>

              <label>
                <span>Apply mode</span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ApplyMode)}
                >
                  <option value="full">Apply full preset</option>
                  <option value="selected_subjects">Apply selected subjects</option>
                  <option value="selected_topic_groups">Apply selected topic groups</option>
                </select>
                <small>Start wide or seed only the pieces required for onboarding.</small>
              </label>

              <label>
                <span>Academic year name</span>
                <input value={academicYearName} onChange={(event) => setAcademicYearName(event.target.value)} />
              </label>

              <label>
                <span>Academic year start</span>
                <input
                  type="date"
                  value={academicYearStart}
                  onChange={(event) => setAcademicYearStart(event.target.value)}
                />
              </label>

              <label>
                <span>Academic year end</span>
                <input
                  type="date"
                  value={academicYearEnd}
                  onChange={(event) => setAcademicYearEnd(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="contentCard adminAcademicControlCard">
            <div className="adminAcademicSectionHeading">
              <span className="adminAcademicSectionEyebrow">Economy-backed access</span>
              <strong>Common onboarding access</strong>
              <p className="setupFieldMeta">
                These controls seed common institute access through the live economy tables. Economy remains the authority.
              </p>
            </div>
            <div className="adminAcademicCompactForm adminAcademicCompactFormWide">
              <label>
                <span>Question-bank package access</span>
                <select
                  value={questionBankPackageEnabled ? "enabled" : "disabled"}
                  onChange={(event) => setQuestionBankPackageEnabled(event.target.value === "enabled")}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <small>Grant or revoke the selected platform package during onboarding.</small>
              </label>

              <label>
                <span>Default question-bank package</span>
                <select
                  value={questionBankPackageCode}
                  onChange={(event) => setQuestionBankPackageCode(event.target.value)}
                  disabled={packagesLoading}
                >
                  <option value="">{packagesLoading ? "Loading packages..." : "Select package"}</option>
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.code}>
                      {(pkg.display_name || `${pkg.name} (${pkg.code})`).trim()}
                    </option>
                  ))}
                </select>
                <small>Options come from the database-backed economy package catalog.</small>
              </label>

              <label>
                <span>Advanced builder access</span>
                <select
                  value={advancedBuilderEnabled ? "enabled" : "disabled"}
                  onChange={(event) => setAdvancedBuilderEnabled(event.target.value === "enabled")}
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <small>Writes the real `ADVANCED_EXAM_BUILDER` feature entitlement for the institute.</small>
              </label>
            </div>
          </div>
        </section>

        {error ? <p className="adminAcademicModalMessage" style={{ color: "#b42318" }}>{error}</p> : null}
        {message ? <p className="adminAcademicModalMessage">{message}</p> : null}

        {loadingPreset ? (
          <div className="featurePlaceholder" style={{ marginTop: 16 }}>
            <p>Loading preset detail...</p>
          </div>
        ) : presetDetail ? (
          <>
            <section className="adminAcademicScopeStats adminAcademicSummaryRail" style={{ marginTop: 20 }}>
              <div className="adminAcademicSummaryRailCopy">
                <strong>Preset scope</strong>
                <span className="setupFieldMeta">
                  Review the seeded footprint before previewing or applying.
                </span>
              </div>
              <span className="setupFieldMeta">{presetDetail.subject_count} subjects</span>
              <span className="setupFieldMeta">{presetDetail.topic_group_count} topic groups</span>
              <span className="setupFieldMeta">{presetDetail.leaf_topic_count} total topic rows</span>
              <span className="setupFieldMeta">{chosenSubjectCount} selected</span>
              <span className="setupFieldMeta">{formatApplyModeLabel(mode)}</span>
            </section>

            {mode === "selected_subjects" ? (
              <section className="contentCard" style={{ marginTop: 16, padding: 18 }}>
                <strong>Select subjects to apply</strong>
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    marginTop: 14,
                  }}
                >
                  {presetDetail.subjects.map((subject) => (
                    <label
                      key={subject.code}
                      className="setupToggle"
                      style={{ alignItems: "flex-start", gap: 10 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectCodes.includes(subject.code)}
                        onChange={() => toggleSubject(subject.code)}
                      />
                      <span>
                        <strong>{subject.name}</strong>
                        <small>
                          {subject.leaf_topic_count} topics · {subject.code}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            {mode === "selected_topic_groups" ? (
              <section className="contentCard" style={{ marginTop: 16, padding: 18 }}>
                <strong>Select topic groups to apply</strong>
                <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
                  {presetDetail.subjects.map((subject) => (
                    <article key={subject.code} style={{ display: "grid", gap: 10 }}>
                      <strong>{subject.name}</strong>
                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        }}
                      >
                        {subject.topics.map((topic) => (
                          <label
                            key={topic.code}
                            className="setupToggle"
                            style={{ alignItems: "flex-start", gap: 10 }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedTopicCodes.includes(topic.code)}
                              onChange={() => toggleTopic(topic.code)}
                            />
                            <span>
                              <strong>{topic.name}</strong>
                              <small>
                                {topic.children.length} child topics · {topic.code}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="adminAcademicSubjectPreviewGrid">
              {presetDetail.subjects
                .filter((subject) => {
                  if (mode === "full") return true;
                  if (mode === "selected_subjects") return selectedSubjectCodes.includes(subject.code);
                  return subject.topics.some((topic) => selectedTopicCodes.includes(topic.code));
                })
                .map((subject) => (
                  <details key={subject.code} className="contentCard adminAcademicSubjectCard" open>
                    <summary className="adminAcademicSubjectCardHeader adminAcademicSubjectSummary">
                      <div>
                        <strong>{subject.name}</strong>
                        <p className="setupFieldMeta">
                          {subject.code} · {subject.topic_group_count} groups · {subject.leaf_topic_count} topics
                        </p>
                      </div>
                      <div className="adminAcademicSubjectSummaryMeta">
                        <span className="setupFieldMeta adminAcademicTopicBadge">
                          {subject.topics.filter((topic) => mode !== "selected_topic_groups" || selectedTopicCodes.includes(topic.code)).length} groups visible
                        </span>
                        <span className="setupFieldMeta adminAcademicDisclosureHint">Collapse</span>
                      </div>
                    </summary>
                    <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
                      {subject.topics
                        .filter((topic) => mode !== "selected_topic_groups" || selectedTopicCodes.includes(topic.code))
                        .map((topic) => (
                        <li key={topic.code}>
                          {topic.name}
                          {topic.children.length > 0 ? ` (${topic.children.length} child topics)` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
            </section>
          </>
        ) : null}

        <div className="adminAcademicFieldActions" style={{ marginTop: 20 }}>
          <button className="button buttonSecondary" onClick={handlePreview} type="button" disabled={previewLoading || applyLoading || packagesLoading}>
            {previewLoading ? "Previewing..." : "Preview changes"}
          </button>
          <button className="button buttonPrimary" onClick={handleApply} type="button" disabled={applyLoading || previewLoading || packagesLoading}>
            {applyLoading ? "Applying..." : "Apply preset"}
          </button>
        </div>

        {preview ? (
          <section className="contentCard" style={{ marginTop: 20, padding: 18 }}>
            <strong>Preview summary</strong>
            <div className="adminAcademicScopeStats" style={{ marginTop: 12 }}>
              <span className="setupFieldMeta">Academic year: {preview.academic_year.action}</span>
              <span className="setupFieldMeta">Program: {preview.program.action}</span>
              <span className="setupFieldMeta">{preview.summary.subjects_to_apply} subjects</span>
              <span className="setupFieldMeta">{preview.summary.leaf_topics_to_create} topics to create</span>
              <span className="setupFieldMeta">{preview.summary.leaf_topics_to_update} topics to update</span>
            </div>
            {preview.access_plan ? (
              <div className="adminAcademicScopeStats" style={{ marginTop: 12 }}>
                <span className="setupFieldMeta">
                  Package access: {preview.access_plan.question_bank_package.enabled ? "enabled" : "disabled"}
                </span>
                <span className="setupFieldMeta">
                  Package: {preview.access_plan.question_bank_package.package_code || "none selected"}
                </span>
                <span className="setupFieldMeta">
                  Advanced builder: {preview.access_plan.advanced_builder.enabled ? "enabled" : "disabled"}
                </span>
              </div>
            ) : null}
          </section>
        ) : null}

        {lastApplyResult ? (
          <section className="contentCard" style={{ marginTop: 20, padding: 18 }}>
            <strong>Last apply result</strong>
            <div className="adminAcademicScopeStats" style={{ marginTop: 12 }}>
              <span className="setupFieldMeta">
                Years {lastApplyResult.summary.academic_years.created} created / {lastApplyResult.summary.academic_years.updated} updated
              </span>
              <span className="setupFieldMeta">
                Programs {lastApplyResult.summary.programs.created} created / {lastApplyResult.summary.programs.updated} updated
              </span>
              <span className="setupFieldMeta">
                Subjects {lastApplyResult.summary.subjects.created} created / {lastApplyResult.summary.subjects.updated} updated
              </span>
              <span className="setupFieldMeta">
                Topics {lastApplyResult.summary.topics.created} created / {lastApplyResult.summary.topics.updated} updated
              </span>
            </div>
            {lastApplyResult.access_results ? (
              <div className="adminAcademicScopeStats" style={{ marginTop: 12 }}>
                <span className="setupFieldMeta">
                  Package access {lastApplyResult.access_results.question_bank_package.status}
                  {lastApplyResult.access_results.question_bank_package.package_code
                    ? ` · ${lastApplyResult.access_results.question_bank_package.package_code}`
                    : ""}
                </span>
                <span className="setupFieldMeta">
                  Advanced builder {lastApplyResult.access_results.advanced_builder.status}
                </span>
              </div>
            ) : null}
            {lastApplyResult.onboarding_run ? (
              <div className="adminAcademicScopeStats" style={{ marginTop: 12 }}>
                <span className="setupFieldMeta">
                  Onboarding run {lastApplyResult.onboarding_run.status}
                </span>
                <span className="setupFieldMeta">
                  Profile {lastApplyResult.onboarding_run.profile_code || "manual"}
                </span>
                <span className="setupFieldMeta">
                  {lastApplyResult.onboarding_run.task_count} tasks recorded
                </span>
              </div>
            ) : null}
            {lastApplyResult.audit_findings.length > 0 ? (
              <p className="setupFieldMeta" style={{ marginTop: 12 }}>
                Audit returned {lastApplyResult.audit_findings.length} finding groups. Review backend audit output before mass rollout.
              </p>
            ) : (
              <p className="setupFieldMeta" style={{ marginTop: 12 }}>
                Audit returned no immediate structural findings.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </article>
  );
}
