"use client";

import { useEffect, useMemo, useState } from "react";

type InstituteOption = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type ProgramOption = {
  id: string;
  institute: string;
  name: string;
  code?: string;
  is_active: boolean;
};

type SubjectOption = {
  id: string;
  institute: string;
  program?: string | null;
  name: string;
  code?: string;
  is_active: boolean;
};

type TopicOption = {
  id: string;
  institute: string;
  subject?: string | null;
  name: string;
  code?: string;
  is_active: boolean;
};

type AdminQuestionBankPackage = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code: string;
  name: string;
  code: string;
  description: string;
  display_name: string;
  package_type: string;
  package_family_label: string | null;
  ownership_type: string;
  access_mode: string;
  is_public_catalog: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  commercial_labels: string[];
  recommended_for_labels: string[];
  coverage_program_labels: string[];
  coverage_subject_labels: string[];
  coverage_topic_labels: string[];
  program_count: number;
  subject_count: number;
  topic_count: number;
  coverage_summary: string;
  scope_count: number;
  active_entitlement_count: number;
  linked_plan_count: number;
  default_plan_count: number;
  scopes?: Array<{
    id: string;
    program: string | null;
    program_name: string | null;
    subject: string | null;
    subject_name: string | null;
    topic: string | null;
    topic_name: string | null;
    question_source_type: string;
    difficulty_level: string;
    question_type: string;
    master_visibility: string;
    max_questions_total: number | null;
    max_questions_per_topic: number | null;
    metadata: Record<string, unknown>;
    is_active: boolean;
  }>;
};

type PackageScopeDraft = {
  id?: string;
  program: string;
  subject: string;
  topic: string;
  question_source_type: string;
  difficulty_level: string;
  question_type: string;
  master_visibility: string;
  max_questions_total: string;
  max_questions_per_topic: string;
  is_active: boolean;
};

type ScopePresetMode =
  | "subject_library_single"
  | "subject_library_all_subjects"
  | "program_wide_library"
  | "topic_bundle_targeted";

type PackageSaveOutcome = {
  packageName: string;
  packageCode: string;
  subjectLabels: string[];
  topicLabels: string[];
  activeScopeCount: number;
  actionLabel: string;
};

type ScopeLookupMaps = {
  programsById: Map<string, ProgramOption>;
  subjectsById: Map<string, SubjectOption>;
  topicsById: Map<string, TopicOption>;
};

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeLookupValue(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function formatScopeTargetLabel(parts: Array<string | null | undefined>) {
  const resolved = parts.filter((part): part is string => Boolean(part && part.trim()));
  return resolved.length > 0 ? resolved.join(" -> ") : "All academic content in scope";
}

function emptyScopeDraft(): PackageScopeDraft {
  return {
    program: "",
    subject: "",
    topic: "",
    question_source_type: "platform_only",
    difficulty_level: "",
    question_type: "",
    master_visibility: "",
    max_questions_total: "",
    max_questions_per_topic: "",
    is_active: true,
  };
}

function describeScopePosture(scope: PackageScopeDraft) {
  if (scope.topic) {
    return {
      tone: "success",
      label: "Topic-targeted",
      summary: "Very specific scope. Best when the package is meant to sell a narrow academic slice.",
    };
  }
  if (scope.subject) {
    return {
      tone: "success",
      label: "Subject-safe",
      summary: "Clear and easy to explain. This is the best default for most sellable subject packages.",
    };
  }
  if (scope.program) {
    return {
      tone: "warning",
      label: "Program-wide",
      summary: "Broad coverage. Good only when you intentionally want one package to cover the whole program.",
    };
  }
  return {
    tone: "danger",
    label: "Fully broad",
    summary: "This row is exposing the broadest possible scope and is likely too wide for most commercial packages.",
  };
}

function describeScopeConstraintSummary(scope: PackageScopeDraft) {
  const parts = [
    scope.question_source_type ? `Source: ${titleCase(scope.question_source_type)}` : null,
    scope.difficulty_level ? `Difficulty: ${titleCase(scope.difficulty_level)}` : "Difficulty: Any",
    scope.question_type ? `Type: ${titleCase(scope.question_type)}` : "Type: Any",
    scope.master_visibility ? `Visibility: ${titleCase(scope.master_visibility)}` : "Visibility: Any",
    scope.max_questions_total ? `Max total: ${scope.max_questions_total}` : null,
    scope.max_questions_per_topic ? `Max/topic: ${scope.max_questions_per_topic}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts : ["No extra question constraints are active on this row yet."];
}

function parseOptionalPositiveInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.NaN;
  }
  return parsed;
}

function summarizePackageSaveError(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      const firstMessage = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const field = typeof (item as { loc?: unknown }).loc === "object"
              ? Array.isArray((item as { loc?: unknown[] }).loc)
                ? (item as { loc?: unknown[] }).loc!.filter(Boolean).join(" -> ")
                : ""
              : "";
            const message = typeof (item as { msg?: unknown }).msg === "string" ? (item as { msg?: string }).msg : "";
            return [field, message].filter(Boolean).join(": ");
          }
          return "";
        })
        .find(Boolean);
      if (firstMessage) {
        return `Package could not be saved. ${firstMessage}`;
      }
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (status >= 500) {
    return "Package could not be saved because the server rejected the request. Re-check package coverage, ownership, and academic targeting, then try again.";
  }

  if (status >= 400) {
    return "Package could not be saved because one or more fields are invalid. Re-check package identity, coverage rows, and limits, then try again.";
  }

  return `Question bank package save failed with status ${status}`;
}

function describeAccessModeForOperators(value: string) {
  if (value === "full_scope") {
    return "Institute gets the full package coverage immediately once access is granted. Use only when broad exposure is intentional.";
  }
  if (value === "quota_limited") {
    return "Institute gets access, but usage is watched against limits. Best when the commercial promise is capped rather than unlimited.";
  }
  if (value === "materialize_on_entitlement") {
    return "Questions are prepared through the institute-access path instead of waiting for manual discovery. Use when onboarding should feel immediate after grant.";
  }
  return "Institute sees this package through controlled linking and intake flows. This is the safest default when operators want clear, explainable rollout.";
}

function describeInstituteFacingScopeOutcome(scope: PackageScopeDraft, lookup: ScopeLookupMaps) {
  const programName = scope.program ? lookup.programsById.get(scope.program)?.name ?? "selected program" : "all programs";
  const subjectName = scope.subject ? lookup.subjectsById.get(scope.subject)?.name ?? "selected subject" : "all subjects";
  const topicName = scope.topic ? lookup.topicsById.get(scope.topic)?.name ?? "selected topic" : "all topics";
  const academicSlice = scope.topic
    ? `${programName} -> ${subjectName} -> ${topicName}`
    : scope.subject
      ? `${programName} -> ${subjectName}`
      : scope.program
        ? `${programName} across all current subjects`
        : "every currently matching academic row";
  const sourceLabel =
    scope.question_source_type === "platform_only"
      ? "platform-authored questions only"
      : scope.question_source_type === "institute_only"
        ? "institute-authored questions only"
        : "platform and institute questions";
  const difficultyLabel = scope.difficulty_level ? titleCase(scope.difficulty_level) : "all difficulty levels";
  const questionTypeLabel = scope.question_type ? titleCase(scope.question_type) : "all supported question types";
  const quotaParts = [
    scope.max_questions_total ? `up to ${scope.max_questions_total} total questions` : null,
    scope.max_questions_per_topic ? `up to ${scope.max_questions_per_topic} per topic` : null,
  ].filter(Boolean);

  return `${academicSlice}. Institutes should expect ${sourceLabel}, ${difficultyLabel}, and ${questionTypeLabel}${
    quotaParts.length > 0 ? `, limited to ${quotaParts.join(" and ")}` : ""
  }.`;
}

function summarizePackageSaveOutcome(
  pkg: AdminQuestionBankPackage,
  actionLabel: string,
): PackageSaveOutcome {
  const subjectLabels = Array.from(
    new Set(
      pkg.coverage_subject_labels
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  );
  const topicLabels = Array.from(
    new Set(
      pkg.coverage_topic_labels
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  );

  return {
    packageName: pkg.name,
    packageCode: pkg.code,
    subjectLabels,
    topicLabels,
    activeScopeCount: (pkg.scopes ?? []).filter((scope) => scope.is_active).length,
    actionLabel,
  };
}

function describePackagePromise({
  packageType,
  ownershipType,
  activeScopeCount,
  subjectTargetedRows,
  topicTargetedRows,
  programWideRows,
  fullyOpenRows,
}: {
  packageType: string;
  ownershipType: string;
  activeScopeCount: number;
  subjectTargetedRows: number;
  topicTargetedRows: number;
  programWideRows: number;
  fullyOpenRows: number;
}) {
  const ownerLabel = ownershipType === "platform" ? "platform-owned" : "institute-owned";
  if (activeScopeCount === 0) {
    return `This ${ownerLabel} ${titleCase(packageType)} does not unlock anything yet because no active coverage row exists.`;
  }
  if (topicTargetedRows > 0 && subjectTargetedRows === 0 && programWideRows === 0) {
    return `This ${ownerLabel} ${titleCase(packageType)} behaves like a narrow topic bundle. Institutes should expect only selected topic slices, not a full subject.`;
  }
  if (subjectTargetedRows > 0 && programWideRows === 0 && fullyOpenRows === 0) {
    return `This ${ownerLabel} ${titleCase(packageType)} behaves like a clear subject package. Institutes should expect only the named subjects, not all content in the program.`;
  }
  if (programWideRows > 0 || fullyOpenRows > 0) {
    return `This ${ownerLabel} ${titleCase(packageType)} is broad. Institutes may see much wider coverage than a normal subject package, so sales and support language must match that promise.`;
  }
  return `This ${ownerLabel} ${titleCase(packageType)} has active coverage and is ready for institute access assignment once the package promise is confirmed.`;
}

function uniqueNormalizedLabels(labels: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const resolved: string[] = [];
  labels.forEach((label) => {
    const trimmed = String(label || "").trim();
    const normalized = normalizeLookupValue(trimmed);
    if (!trimmed || !normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    resolved.push(trimmed);
  });
  return resolved;
}

export function EconomyQuestionBankPackageManagementCard({
  packages,
  institutes,
  programs,
  subjects,
  topics,
  initialWorkspaceView = "editor",
  onPackagesChange,
}: {
  packages: AdminQuestionBankPackage[];
  institutes: InstituteOption[];
  programs: ProgramOption[];
  subjects: SubjectOption[];
  topics: TopicOption[];
  initialWorkspaceView?: "editor" | "catalog" | "all";
  onPackagesChange?: (packages: AdminQuestionBankPackage[]) => void;
}) {
  const [workspaceView, setWorkspaceView] = useState<"editor" | "catalog" | "all">(initialWorkspaceView);
  const [packageRows, setPackageRows] = useState(packages);
  const [catalogInstituteFilter, setCatalogInstituteFilter] = useState("all");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState("all");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [catalogRowsToShow, setCatalogRowsToShow] = useState<"4" | "8" | "12">("8");
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [packageType, setPackageType] = useState("subject_library");
  const [ownershipType, setOwnershipType] = useState("platform");
  const [accessMode, setAccessMode] = useState("link_on_demand");
  const [isPublicCatalog, setIsPublicCatalog] = useState(true);
  const [sortOrder, setSortOrder] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [scopes, setScopes] = useState<PackageScopeDraft[]>([emptyScopeDraft()]);
  const [scopePresetMode, setScopePresetMode] = useState<ScopePresetMode>("subject_library_all_subjects");
  const [presetSubjectId, setPresetSubjectId] = useState("");
  const [saveOutcome, setSaveOutcome] = useState<PackageSaveOutcome | null>(null);
  const [editorPrograms, setEditorPrograms] = useState(programs);
  const [editorSubjects, setEditorSubjects] = useState(subjects);
  const [editorTopics, setEditorTopics] = useState(topics);
  const [editorLookupsLoading, setEditorLookupsLoading] = useState(false);
  const [editorLookupsError, setEditorLookupsError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState("");

  const editorLookupsReady =
    editorPrograms.length > 0 || editorSubjects.length > 0 || editorTopics.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadPackageCatalog() {
      if (packageRows.length > 0 || (workspaceView !== "catalog" && workspaceView !== "all")) {
        return;
      }

      setCatalogLoading(true);
      setCatalogLoadError("");

      try {
        const response = await fetch("/api/v1/economy/admin/question-bank-packages/?compact=1", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Question bank package catalog could not be loaded.");
        }

        const payload = (await response.json()) as AdminQuestionBankPackage[] | { results?: AdminQuestionBankPackage[] };
        const nextPackages = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.results)
            ? payload.results
            : [];

        if (cancelled) {
          return;
        }

        setPackageRows(nextPackages);
        onPackagesChange?.(nextPackages);
      } catch (catalogError) {
        if (cancelled) {
          return;
        }
        setCatalogLoadError(
          catalogError instanceof Error
            ? catalogError.message
            : "Question bank package catalog could not be loaded.",
        );
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadPackageCatalog();

    return () => {
      cancelled = true;
    };
  }, [onPackagesChange, packageRows.length, workspaceView]);

  useEffect(() => {
    let cancelled = false;

    async function loadEditorLookups() {
      if (workspaceView !== "editor" && workspaceView !== "all") {
        return;
      }

      setEditorLookupsLoading(true);
      setEditorLookupsError("");

      try {
        const query = instituteId ? `?institute=${encodeURIComponent(instituteId)}` : "";
        const response = await fetch(`/api/admin/economy/question-bank-package-lookups${query}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Package editor lookups could not be loaded.");
        }

        const payload = (await response.json()) as {
          programs?: ProgramOption[];
          subjects?: SubjectOption[];
          topics?: TopicOption[];
        };

        if (cancelled) {
          return;
        }

        setEditorPrograms(Array.isArray(payload.programs) ? payload.programs : []);
        setEditorSubjects(Array.isArray(payload.subjects) ? payload.subjects : []);
        setEditorTopics(Array.isArray(payload.topics) ? payload.topics : []);
      } catch (lookupError) {
        if (cancelled) {
          return;
        }
        setEditorLookupsError(
          lookupError instanceof Error
            ? lookupError.message
            : "Package editor lookups could not be loaded.",
        );
      } finally {
        if (!cancelled) {
          setEditorLookupsLoading(false);
        }
      }
    }

    void loadEditorLookups();

    return () => {
      cancelled = true;
    };
  }, [instituteId, workspaceView]);

  const availablePrograms = useMemo(
    () => editorPrograms.filter((program) => program.is_active && program.institute === instituteId),
    [editorPrograms, instituteId],
  );
  const availableSubjects = useMemo(
    () => editorSubjects.filter((subject) => subject.is_active && subject.institute === instituteId),
    [editorSubjects, instituteId],
  );
  const availableTopics = useMemo(
    () => editorTopics.filter((topic) => topic.is_active && topic.institute === instituteId),
    [editorTopics, instituteId],
  );
  const lookupMaps = useMemo<ScopeLookupMaps>(
    () => ({
      programsById: new Map(availablePrograms.map((program) => [program.id, program])),
      subjectsById: new Map(availableSubjects.map((subject) => [subject.id, subject])),
      topicsById: new Map(availableTopics.map((topic) => [topic.id, topic])),
    }),
    [availablePrograms, availableSubjects, availableTopics],
  );
  const subjectQuickPicks = useMemo(() => {
    const seen = new Set<string>();
    return availableSubjects
      .filter((subject) => {
        const key = normalizeLookupValue(subject.name);
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [availableSubjects]);
  const filteredPackages = useMemo(() => {
    const normalizedCatalogSearch = normalizeLookupValue(catalogSearchQuery);
    return packageRows.filter((pkg) => {
      if (catalogInstituteFilter !== "all" && pkg.institute !== catalogInstituteFilter) {
        return false;
      }
      if (catalogTypeFilter !== "all" && pkg.package_type !== catalogTypeFilter) {
        return false;
      }
      if (catalogStatusFilter === "active" && !pkg.is_active) {
        return false;
      }
      if (catalogStatusFilter === "inactive" && pkg.is_active) {
        return false;
      }
      if (normalizedCatalogSearch) {
        const searchableFields = [
          pkg.name,
          pkg.code,
          pkg.institute_name,
          pkg.institute_code,
          pkg.coverage_summary,
          pkg.description ?? "",
        ];
        const matchesSearch = searchableFields.some((value) =>
          normalizeLookupValue(value).includes(normalizedCatalogSearch),
        );
        if (!matchesSearch) {
          return false;
        }
      }
      return true;
    });
  }, [catalogInstituteFilter, catalogSearchQuery, catalogStatusFilter, catalogTypeFilter, packageRows]);
  const visiblePackages = filteredPackages.slice(0, Number(catalogRowsToShow));
  const activePackageCount = packageRows.filter((pkg) => pkg.is_active).length;
  const subjectLibraryCount = packageRows.filter((pkg) => pkg.package_type === "subject_library").length;
  const selectedInstitute = institutes.find((institute) => institute.id === instituteId) ?? null;
  const activeScopeCount = scopes.filter((scope) => scope.is_active).length;
  const scopedProgramCount = scopes.filter((scope) => Boolean(scope.program)).length;
  const scopedSubjectCount = scopes.filter((scope) => Boolean(scope.subject)).length;
  const scopedTopicCount = scopes.filter((scope) => Boolean(scope.topic)).length;
  const rowsWithoutSubject = scopes.filter((scope) => scope.is_active && !scope.subject).length;
  const broadActiveRows = scopes.filter((scope) => scope.is_active && !scope.subject && !scope.topic).length;
  const topicTargetedRows = scopes.filter((scope) => scope.is_active && Boolean(scope.topic)).length;
  const subjectTargetedRows = scopes.filter((scope) => scope.is_active && Boolean(scope.subject) && !scope.topic).length;
  const programWideRows = scopes.filter((scope) => scope.is_active && Boolean(scope.program) && !scope.subject && !scope.topic).length;
  const fullyOpenRows = scopes.filter((scope) => scope.is_active && !scope.program && !scope.subject && !scope.topic).length;
  const packagePromise = describePackagePromise({
    packageType,
    ownershipType,
    activeScopeCount,
    subjectTargetedRows,
    topicTargetedRows,
    programWideRows,
    fullyOpenRows,
  });
  const scopeReadinessCards = [
    {
      label: "1. Package promise",
      title:
        packageType === "subject_library"
          ? "Subject package"
          : packageType === "topic_bundle"
            ? "Topic bundle"
            : titleCase(packageType),
      detail:
        packageType === "subject_library"
          ? "Best when each active row names a concrete subject."
          : packageType === "topic_bundle"
            ? "Best when each active row narrows to a concrete topic."
            : "Confirm the package type matches what sales and support will promise.",
      state: "neutral",
    },
    {
      label: "2. Coverage safety",
      title:
        rowsWithoutSubject > 0
          ? `${rowsWithoutSubject} active row${rowsWithoutSubject === 1 ? "" : "s"} still missing a subject`
          : broadActiveRows > 0
            ? `${broadActiveRows} broad active row${broadActiveRows === 1 ? "" : "s"} still need review`
            : "Coverage looks specific enough",
      detail:
        rowsWithoutSubject > 0
          ? "Subjectless rows are the most common reason operators think Science or Math is missing later."
          : broadActiveRows > 0
            ? "Broad rows are valid only when you intentionally want wide program-level exposure."
            : "The current active rows are narrow enough for operators to explain and troubleshoot.",
      state: rowsWithoutSubject > 0 ? "blocked" : broadActiveRows > 0 ? "attention" : "ready",
    },
    {
      label: "3. Institute expectation",
      title:
        scopedTopicCount > 0
          ? `${scopedTopicCount} topic-specific row${scopedTopicCount === 1 ? "" : "s"} configured`
          : scopedSubjectCount > 0
            ? `${scopedSubjectCount} subject-specific row${scopedSubjectCount === 1 ? "" : "s"} configured`
            : scopedProgramCount > 0
              ? `${scopedProgramCount} program-wide row${scopedProgramCount === 1 ? "" : "s"} configured`
              : "Institute will see very broad coverage",
      detail:
        scopedTopicCount > 0
          ? "Institutes should expect only the named topic slices after access is granted."
          : scopedSubjectCount > 0
            ? "Institutes should expect only the named subjects after access is granted."
            : scopedProgramCount > 0
              ? "Institutes may see content across the selected program unless you narrow the rows further."
              : "This package is likely too broad unless wide exposure is the explicit product promise.",
      state: scopedSubjectCount > 0 || scopedTopicCount > 0 ? "ready" : "attention",
    },
    {
      label: "4. Save confidence",
      title:
        activeScopeCount === 0
          ? "Not ready to save"
          : packageType === "subject_library" && rowsWithoutSubject > 0
            ? "Save would be rejected"
            : "Ready for package save",
      detail:
        activeScopeCount === 0
          ? "Add at least one active coverage row before saving."
          : packageType === "subject_library" && rowsWithoutSubject > 0
            ? "Add a subject to each active row first so support teams can explain exactly what the package unlocks."
            : "Next step after save: verify institute access and shared-library switch status in the visibility lane.",
      state:
        activeScopeCount === 0 || (packageType === "subject_library" && rowsWithoutSubject > 0)
          ? "blocked"
          : "ready",
    },
  ] as const;
  const activeScopeIdentityCounts = new Map<string, number>();
  scopes.forEach((scope) => {
    if (!scope.is_active) {
      return;
    }
    const identity = scopeIdentity(scope);
    activeScopeIdentityCounts.set(identity, (activeScopeIdentityCounts.get(identity) ?? 0) + 1);
  });
  const scopeValidationDetails = scopes.map((scope, index) => {
    const blockingIssues: string[] = [];
    const advisoryIssues: string[] = [];
    const maxQuestionsTotal = parseOptionalPositiveInteger(scope.max_questions_total);
    const maxQuestionsPerTopic = parseOptionalPositiveInteger(scope.max_questions_per_topic);

    if (scope.is_active && packageType === "subject_library" && !scope.subject) {
      blockingIssues.push("Active Subject Library rows must name a concrete subject.");
    }
    if (scope.is_active && activeScopeIdentityCounts.get(scopeIdentity(scope))! > 1) {
      blockingIssues.push("This active coverage row duplicates another active row with the same targeting and constraints.");
    }
    if (Number.isNaN(maxQuestionsTotal)) {
      blockingIssues.push("Max questions total must be a positive whole number when provided.");
    }
    if (Number.isNaN(maxQuestionsPerTopic)) {
      blockingIssues.push("Max per topic must be a positive whole number when provided.");
    }
    if (
      maxQuestionsTotal !== null &&
      maxQuestionsPerTopic !== null &&
      !Number.isNaN(maxQuestionsTotal) &&
      !Number.isNaN(maxQuestionsPerTopic) &&
      maxQuestionsPerTopic > maxQuestionsTotal
    ) {
      blockingIssues.push("Max per topic cannot be greater than max questions total.");
    }

    if (scope.topic && !scope.subject) {
      advisoryIssues.push("Lock the subject too when a topic is selected so support teams can explain the package scope faster.");
    }
    if (scope.is_active && !scope.program && !scope.subject && !scope.topic) {
      advisoryIssues.push("This row is fully broad and may expose more content than sales or support expects.");
    } else if (scope.is_active && scope.program && !scope.subject && !scope.topic) {
      advisoryIssues.push("This row is program-wide. Add subject rows if you want clearer Math-versus-Science behavior.");
    }

    return {
      index,
      blockingIssues,
      advisoryIssues,
    };
  });
  const blockingScopeRows = scopeValidationDetails.filter((item) => item.blockingIssues.length > 0);
  const advisoryScopeRows = scopeValidationDetails.filter((item) => item.advisoryIssues.length > 0);
  const canSubmitPackage =
    !saving &&
    activeScopeCount > 0 &&
    blockingScopeRows.length === 0;
  const activeScopeOutcomePreview = scopes
    .filter((scope) => scope.is_active)
    .slice(0, 4)
    .map((scope) => describeInstituteFacingScopeOutcome(scope, lookupMaps));
  const editingPackageRecord = editingId ? packageRows.find((pkg) => pkg.id === editingId) ?? null : null;
  const originalSubjectLabels = uniqueNormalizedLabels(editingPackageRecord?.coverage_subject_labels ?? []);
  const originalTopicLabels = uniqueNormalizedLabels(editingPackageRecord?.coverage_topic_labels ?? []);
  const currentSubjectLabels = uniqueNormalizedLabels(
    scopes
      .filter((scope) => scope.is_active)
      .map((scope) => (scope.subject ? lookupMaps.subjectsById.get(scope.subject)?.name ?? "" : "")),
  );
  const currentTopicLabels = uniqueNormalizedLabels(
    scopes
      .filter((scope) => scope.is_active)
      .map((scope) => (scope.topic ? lookupMaps.topicsById.get(scope.topic)?.name ?? "" : "")),
  );
  const addedSubjectLabels = currentSubjectLabels.filter(
    (label) => !originalSubjectLabels.some((currentLabel) => normalizeLookupValue(currentLabel) === normalizeLookupValue(label)),
  );
  const removedSubjectLabels = originalSubjectLabels.filter(
    (label) => !currentSubjectLabels.some((currentLabel) => normalizeLookupValue(currentLabel) === normalizeLookupValue(label)),
  );
  const addedTopicLabels = currentTopicLabels.filter(
    (label) => !originalTopicLabels.some((currentLabel) => normalizeLookupValue(currentLabel) === normalizeLookupValue(label)),
  );
  const removedTopicLabels = originalTopicLabels.filter(
    (label) => !currentTopicLabels.some((currentLabel) => normalizeLookupValue(currentLabel) === normalizeLookupValue(label)),
  );

  function resetForm() {
    setEditingId("");
    setInstituteId(institutes[0]?.id ?? "");
    setName("");
    setCode("");
    setDescription("");
    setPackageType("subject_library");
    setOwnershipType("platform");
    setAccessMode("link_on_demand");
    setIsPublicCatalog(true);
    setSortOrder("100");
    setIsActive(true);
    setScopes([emptyScopeDraft()]);
  }

  function populateFormForEdit(pkg: AdminQuestionBankPackage) {
    const packageScopes = pkg.scopes ?? [];

    setWorkspaceView("editor");
    setEditingId(pkg.id);
    setInstituteId(pkg.institute);
    setName(pkg.name);
    setCode(pkg.code);
    setDescription(pkg.description || "");
    setPackageType(pkg.package_type);
    setOwnershipType(pkg.ownership_type);
    setAccessMode(pkg.access_mode);
    setIsPublicCatalog(pkg.is_public_catalog);
    setSortOrder(String(pkg.sort_order));
    setIsActive(pkg.is_active);
    setScopes(
      packageScopes.length > 0
        ? packageScopes.map((scope) => ({
            id: scope.id,
            program: scope.program || "",
            subject: scope.subject || "",
            topic: scope.topic || "",
            question_source_type: scope.question_source_type || "platform_only",
            difficulty_level: scope.difficulty_level || "",
            question_type: scope.question_type || "",
            master_visibility: scope.master_visibility || "",
            max_questions_total: scope.max_questions_total ? String(scope.max_questions_total) : "",
            max_questions_per_topic: scope.max_questions_per_topic ? String(scope.max_questions_per_topic) : "",
            is_active: scope.is_active,
          }))
        : [emptyScopeDraft()],
    );
    setMessage("");
    setError("");
    setSaveOutcome(null);
  }

  async function loadForEdit(pkg: AdminQuestionBankPackage) {
    setLoadingPackageId(pkg.id);
    setMessage("");
    setError("");
    setSaveOutcome(null);

    try {
      const response = await fetch(`/api/admin/economy/question-bank-packages/${pkg.id}`, {
        method: "GET",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: AdminQuestionBankPackage;
        detail?: string;
        message?: string;
      };

      if (!response.ok) {
        // Older backend deployments may not expose package-detail GET yet.
        // In that case, fall back to the already-loaded catalog payload so
        // operators can still open the editor and apply additive scope fixes.
        populateFormForEdit(pkg);
        setMessage("Loaded package editor from the catalog snapshot because detail fetch is not available on this environment yet.");
        return;
      }

      populateFormForEdit(body.data ?? pkg);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Package detail could not be loaded.");
    } finally {
      setLoadingPackageId("");
    }
  }

  function updateScope(index: number, patch: Partial<PackageScopeDraft>) {
    setScopes((current) => current.map((scope, scopeIndex) => (scopeIndex === index ? { ...scope, ...patch } : scope)));
  }

  function scopeIdentity(scope: PackageScopeDraft) {
    return [
      scope.program || "",
      scope.subject || "",
      scope.topic || "",
      scope.question_source_type || "",
      scope.difficulty_level || "",
      scope.question_type || "",
      scope.master_visibility || "",
      scope.max_questions_total || "",
      scope.max_questions_per_topic || "",
      scope.is_active ? "1" : "0",
    ].join("|");
  }

  function mergeUniqueScopes(nextScopes: PackageScopeDraft[], mode: "append" | "replace" = "append") {
    setScopes((current) => {
      const base = mode === "replace" ? [] : current;
      const merged = [...base];
      const seen = new Set(merged.map((scope) => scopeIdentity(scope)));
      nextScopes.forEach((scope) => {
        const key = scopeIdentity(scope);
        if (!seen.has(key)) {
          merged.push(scope);
          seen.add(key);
        }
      });
      return merged.length > 0 ? merged : [emptyScopeDraft()];
    });
  }

  function resolveProgramName(programId: string) {
    return availablePrograms.find((program) => program.id === programId)?.name ?? "";
  }

  function resolveSubjectName(subjectId: string) {
    return availableSubjects.find((subject) => subject.id === subjectId)?.name ?? "";
  }

  function resolveTopicName(topicId: string) {
    return availableTopics.find((topic) => topic.id === topicId)?.name ?? "";
  }

  function resolveProgramIdForSubject(subjectId: string) {
    const subject = availableSubjects.find((item) => item.id === subjectId);
    if (!subject) {
      return "";
    }
    if (subject.program) {
      return subject.program;
    }
    return availablePrograms[0]?.id ?? "";
  }

  function buildSubjectScopeDraft(subjectId: string) {
    return {
      ...emptyScopeDraft(),
      program: resolveProgramIdForSubject(subjectId),
      subject: subjectId,
    };
  }

  function describeScopeDraft(scope: PackageScopeDraft) {
    return formatScopeTargetLabel([
      resolveProgramName(scope.program) || (scope.program ? "Selected program" : "Any program"),
      resolveSubjectName(scope.subject) || (scope.subject ? "Selected subject" : "Any subject"),
      resolveTopicName(scope.topic) || (scope.topic ? "Selected topic" : "Any topic"),
    ]);
  }

  function scopeDraftGuidance(scope: PackageScopeDraft) {
    if (packageType === "subject_library" && !scope.subject) {
      return "Subject Library packages are easiest to reason about when each row selects a concrete subject.";
    }
    if (packageType === "topic_bundle" && !scope.topic) {
      return "Topic Bundle packages should usually target a concrete topic so institutes know exactly what they are buying.";
    }
    if (scope.topic && !scope.subject) {
      return "A topic is selected without an explicit subject. This can be valid, but usually subject should be locked too.";
    }
    if (scope.subject && !scope.program) {
      return "Subject is targeted across any program in the selected institute. Confirm that cross-program coverage is intended.";
    }
    if (!scope.program && !scope.subject && !scope.topic) {
      return "This row currently exposes the broadest possible scope. Narrow it if the package should sell a smaller slice.";
    }
    return "This coverage row is specific enough for operators to understand and troubleshoot later.";
  }

  function addScopeRow() {
    setScopes((current) => [...current, emptyScopeDraft()]);
  }

  function applyScopePreset() {
    setError("");
    if (scopePresetMode === "subject_library_all_subjects") {
      mergeUniqueScopes(availableSubjects.map((subject) => buildSubjectScopeDraft(subject.id)), "replace");
      return;
    }
    if (scopePresetMode === "subject_library_single") {
      if (!presetSubjectId) {
        setError("Choose a subject before applying the single-subject preset.");
        return;
      }
      mergeUniqueScopes([buildSubjectScopeDraft(presetSubjectId)], "replace");
      return;
    }
    if (scopePresetMode === "program_wide_library") {
      mergeUniqueScopes(
        [
          {
            ...emptyScopeDraft(),
            program: availablePrograms[0]?.id ?? "",
          },
        ],
        "replace",
      );
      return;
    }
    if (!presetSubjectId) {
      setError("Choose a subject before starting a topic-bundle preset.");
      return;
    }
    mergeUniqueScopes([buildSubjectScopeDraft(presetSubjectId)], "replace");
  }

  function addSubjectQuickRow(subjectId: string) {
    setError("");
    mergeUniqueScopes([buildSubjectScopeDraft(subjectId)], "append");
  }

  function removeScopeRow(index: number) {
    setScopes((current) => {
      if (current.length === 1) {
        return [emptyScopeDraft()];
      }
      return current.filter((_, scopeIndex) => scopeIndex !== index);
    });
  }

  async function handleSubmit() {
    if (!instituteId || !name.trim() || !code.trim()) {
      setError("Choose the institute, package name, and package code before saving.");
      return;
    }

    if (activeScopeCount === 0) {
      setError("Add at least one active coverage row before saving. A package with no active coverage cannot unlock any question-bank content.");
      return;
    }

    if (packageType === "subject_library" && rowsWithoutSubject > 0) {
      setError(
        `This Subject Library still has ${rowsWithoutSubject} active row${rowsWithoutSubject === 1 ? "" : "s"} without a concrete subject. Add a subject on each active row so operators can explain exactly what the package unlocks.`,
      );
      return;
    }

    if (blockingScopeRows.length > 0) {
      const firstBlockingRow = blockingScopeRows[0];
      setError(
        `Coverage row ${firstBlockingRow.index + 1} still needs attention before save. ${firstBlockingRow.blockingIssues[0]}`,
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    setSaveOutcome(null);

    try {
      const payload = {
        institute: instituteId,
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
        package_type: packageType,
        ownership_type: ownershipType,
        access_mode: accessMode,
        is_public_catalog: isPublicCatalog,
        sort_order: Number(sortOrder || "100"),
        metadata: {},
        is_active: isActive,
        scopes: scopes.map((scope) => ({
          ...(scope.id ? { id: scope.id } : {}),
          program: scope.program || null,
          subject: scope.subject || null,
          topic: scope.topic || null,
          question_source_type: scope.question_source_type,
          difficulty_level: scope.difficulty_level || "",
          question_type: scope.question_type || "",
          master_visibility: scope.master_visibility || "",
          max_questions_total: scope.max_questions_total ? Number(scope.max_questions_total) : null,
          max_questions_per_topic: scope.max_questions_per_topic ? Number(scope.max_questions_per_topic) : null,
          metadata: {},
          is_active: scope.is_active,
        })),
      };

      const response = await fetch(
        editingId ? `/api/admin/economy/question-bank-packages/${editingId}` : "/api/admin/economy/question-bank-packages",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
        data?: AdminQuestionBankPackage;
      };

      if (!response.ok) {
        throw new Error(
          summarizePackageSaveError(body, response.status),
        );
      }

      if (body.data) {
        const next = (editingId
          ? packageRows.map((item) => (item.id === body.data!.id ? body.data! : item))
          : [body.data!, ...packageRows]
        ).sort((a, b) => {
          if (a.institute_name !== b.institute_name) {
            return a.institute_name.localeCompare(b.institute_name);
          }
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.name.localeCompare(b.name);
        });
        setPackageRows(next);
        onPackagesChange?.(next);
      }

      setMessage(
        body.message ??
          (editingId ? "Question bank package updated successfully." : "Question bank package created successfully."),
      );
      if (body.data) {
        setSaveOutcome(
          summarizePackageSaveOutcome(
            body.data,
            editingId ? "Package updated" : "Package created",
          ),
        );
      }
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save question bank package.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Package Management</span>
        <h3>Create and edit question-bank packages and scope coverage</h3>
        <p className="academicSectionDescription">
          Define what the package is, who owns it, how it is delivered, and which academic slices it actually covers.
        </p>

        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

        {saveOutcome ? (
          <div className="builderHintPanel economyPackageSaveOutcome" data-testid="package-save-outcome">
            <strong>{saveOutcome.actionLabel}</strong>
            <p>
              {saveOutcome.packageName} ({saveOutcome.packageCode}) now carries {saveOutcome.activeScopeCount} active scope
              row{saveOutcome.activeScopeCount === 1 ? "" : "s"}.
            </p>
            <small>
              {saveOutcome.subjectLabels.length > 0
                ? `Subjects now covered: ${saveOutcome.subjectLabels.join(", ")}`
                : "No concrete subject coverage was returned from the saved package row."}
              {saveOutcome.topicLabels.length > 0
                ? ` · Topic slices: ${saveOutcome.topicLabels.slice(0, 6).join(", ")}`
                : ""}
            </small>
          </div>
        ) : null}

        <div className="builderHintPanel" style={{ marginBottom: 16 }}>
          <strong>Operator shortcut</strong>
          <p>
            A package only defines what content is included. Institutes still need an active access row and, when applicable,
            an active shared-library switch before licensed questions become usable.
          </p>
          <small>
            Practical sequence: choose package identity, define coverage rows clearly, save, then verify institute access and
            shared-library switch status in the visibility lane.
          </small>
        </div>

        <div className="builderHintPanel" style={{ marginBottom: 16 }}>
          <strong>Recommended operator approach</strong>
          <p>
            Start with the narrowest commercial promise you can explain easily. In most real sales cases, that means
            one subject row per sellable subject instead of one broad “everything” row.
          </p>
          <small>
            Good default: create clear subject rows for Math, Science, Social Science, or Computer first. Add topic
            limits only when a package is meant to be smaller than the full subject.
          </small>
        </div>

        <div className="builderHintPanel" style={{ marginBottom: 16 }}>
          <strong>What an operator should confirm before saving</strong>
          <p>
            1. The package promise is narrow enough to explain. 2. Every sellable subject has its own active row.
            3. The institute-facing outcome below matches what sales and support expect to unlock.
          </p>
          <small>
            Quick rule: if you want both Math and Science, keep one active Math row and one active Science row. One
            subject row never automatically covers the other subject.
          </small>
        </div>

        <div className="setupFormGrid setupFormGridDense" style={{ marginBottom: 16 }}>
          <label className="setupField">
            <span>Workspace view</span>
            <select
              aria-label="Question bank package workspace view"
              value={workspaceView}
              onChange={(event) => setWorkspaceView(event.target.value as "editor" | "catalog" | "all")}
            >
              <option value="editor">Editor only</option>
              <option value="catalog">Catalog only</option>
              <option value="all">Editor and catalog</option>
            </select>
          </label>
          <label className="setupField">
            <span>Catalog institute filter</span>
            <select
              aria-label="Question bank package institute filter"
              value={catalogInstituteFilter}
              onChange={(event) => setCatalogInstituteFilter(event.target.value)}
            >
              <option value="all">All institutes</option>
              {institutes.map((institute) => (
                <option key={institute.id} value={institute.id}>
                  {institute.name} ({institute.code})
                </option>
              ))}
            </select>
          </label>
          <label className="setupField">
            <span>Catalog package type</span>
            <select
              aria-label="Question bank package type filter"
              value={catalogTypeFilter}
              onChange={(event) => setCatalogTypeFilter(event.target.value)}
            >
              <option value="all">All package types</option>
              <option value="subject_library">Subject Library</option>
              <option value="topic_bundle">Topic Bundle</option>
              <option value="exam_family_bundle">Exam Family Bundle</option>
              <option value="custom_bundle">Custom Bundle</option>
              <option value="feature_bundle">Feature Bundle</option>
            </select>
          </label>
          <label className="setupField">
            <span>Catalog status</span>
            <select
              aria-label="Question bank package status filter"
              value={catalogStatusFilter}
              onChange={(event) => setCatalogStatusFilter(event.target.value as "all" | "active" | "inactive")}
            >
              <option value="active">Active only</option>
              <option value="all">All statuses</option>
              <option value="inactive">Inactive only</option>
            </select>
          </label>
          <label className="setupField">
            <span>Catalog rows to show</span>
            <select
              aria-label="Question bank package rows to show"
              value={catalogRowsToShow}
              onChange={(event) => setCatalogRowsToShow(event.target.value as "4" | "8" | "12")}
            >
              <option value="4">4 rows</option>
              <option value="8">8 rows</option>
              <option value="12">12 rows</option>
            </select>
          </label>
          <label className="setupField">
            <span>Catalog package lookup</span>
            <input
              aria-label="Question bank package lookup"
              onChange={(event) => setCatalogSearchQuery(event.target.value)}
              placeholder="Search by package, code, institute, or coverage"
              type="search"
              value={catalogSearchQuery}
            />
          </label>
        </div>

        <section className="resultsSummaryGrid" style={{ marginBottom: 16 }}>
          <article className="metricCard metricCardPrimary dashboardHeroCard">
            <span>Total packages</span>
            <strong>{packages.length}</strong>
            <small>Visible to platform operators.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Active packages</span>
            <strong>{activePackageCount}</strong>
            <small>Live package rows in the catalog.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Subject libraries</span>
            <strong>{subjectLibraryCount}</strong>
            <small>Most common sellable lane type.</small>
          </article>
          <article className="metricCard dashboardHeroCard">
            <span>Filtered catalog rows</span>
            <strong>{filteredPackages.length}</strong>
            <small>Before row trimming is applied.</small>
          </article>
        </section>

        {workspaceView === "editor" || workspaceView === "all" ? (
        <section className="featurePlaceholder economyPackageEditorPanel">
          <strong>{editingId ? "Edit package" : "New package"}</strong>
          <p className="academicSectionDescription">
            Start with package identity and delivery posture, then define exactly which academic scope this package can expose.
          </p>

          {editorLookupsLoading ? (
            <div className="builderHintPanel" style={{ marginBottom: 16 }}>
              <strong>Loading package editor lookups</strong>
              <p>Programs, subjects, and topics are loading for the selected institute.</p>
            </div>
          ) : null}

          {editorLookupsError ? (
            <div className="builderHintPanel economyScopeWarningPanel" style={{ marginBottom: 16 }}>
              <strong>Editor lookup load issue</strong>
              <p>{editorLookupsError}</p>
            </div>
          ) : null}

          {editingId ? (
            <div className="builderHintPanel" style={{ marginBottom: 16 }}>
              <strong>Editing live package coverage</strong>
              <p>
                You are changing an existing package. Coverage edits can change what future or already-approved institutes
                are allowed to link and reuse.
              </p>
              <small>
                Safe sequence: add the missing subject or topic row, save, then re-check the institute visibility lane
                to confirm live access still matches the package promise.
              </small>
            </div>
          ) : null}

          {editingPackageRecord ? (
            <div className="economyAccessChecklist" style={{ marginBottom: 16 }} data-testid="package-live-impact">
              <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
                <span>Live dependency impact</span>
                <strong>
                  {editingPackageRecord.active_entitlement_count} active institute access row
                  {editingPackageRecord.active_entitlement_count === 1 ? "" : "s"}
                </strong>
                <small>
                  {editingPackageRecord.linked_plan_count} linked plan
                  {editingPackageRecord.linked_plan_count === 1 ? "" : "s"} ·{" "}
                  {editingPackageRecord.default_plan_count} default plan
                  {editingPackageRecord.default_plan_count === 1 ? "" : "s"}
                  . Editing this package can change what already-onboarded institutes or coaching centers are allowed to use.
                </small>
              </div>
              <div
                className={`economyAccessChecklistCard economyAccessChecklistCard${
                  removedSubjectLabels.length > 0 || removedTopicLabels.length > 0 ? "Danger" : "Ready"
                }`}
                data-testid="package-scope-change-summary"
              >
                <span>Coverage change preview</span>
                <strong>
                  {addedSubjectLabels.length === 0 &&
                  removedSubjectLabels.length === 0 &&
                  addedTopicLabels.length === 0 &&
                  removedTopicLabels.length === 0
                    ? "No subject or topic coverage change detected yet"
                    : "Coverage change detected before save"}
                </strong>
                <small>
                  {addedSubjectLabels.length > 0 ? `Adding subjects: ${addedSubjectLabels.join(", ")}.` : ""}
                  {removedSubjectLabels.length > 0 ? ` Removing subjects: ${removedSubjectLabels.join(", ")}.` : ""}
                  {addedTopicLabels.length > 0 ? ` Adding topics: ${addedTopicLabels.slice(0, 6).join(", ")}.` : ""}
                  {removedTopicLabels.length > 0 ? ` Removing topics: ${removedTopicLabels.slice(0, 6).join(", ")}.` : ""}
                  {addedSubjectLabels.length === 0 &&
                  removedSubjectLabels.length === 0 &&
                  addedTopicLabels.length === 0 &&
                  removedTopicLabels.length === 0
                    ? " Adjusting notes, limits, or row posture is safer than silently changing live academic coverage."
                    : ""}
                </small>
              </div>
              <div
                className={`economyAccessChecklistCard economyAccessChecklistCard${
                  removedSubjectLabels.length > 0 || removedTopicLabels.length > 0 ? "Danger" : "Neutral"
                }`}
              >
                <span>Operator consequence</span>
                <strong>
                  {removedSubjectLabels.length > 0 || removedTopicLabels.length > 0
                    ? "This edit can remove institute-visible content"
                    : addedSubjectLabels.length > 0 || addedTopicLabels.length > 0
                      ? "This edit expands institute-visible content after save"
                      : "No live coverage contraction detected"}
                </strong>
                <small>
                  {removedSubjectLabels.length > 0 || removedTopicLabels.length > 0
                    ? "If you remove a subject or topic from a live package, existing institutes may immediately stop seeing that licensed slice even though the master questions still exist."
                    : addedSubjectLabels.length > 0 || addedTopicLabels.length > 0
                      ? "Institutes still need active institute access and a shared-library switch, but this save should widen what they can access once those rows are healthy."
                      : "Use the visibility lane after save to verify that the institute access row still matches the package promise."}
                </small>
              </div>
            </div>
          ) : null}

          <div className="builderHintPanel" style={{ marginBottom: 16 }}>
            <strong>Most common troubleshooting pattern</strong>
            <p>
              If an institute can see Math questions but not Science questions, the usual issue is package
              coverage, not missing platform content. The package must carry a separate active Science coverage row
              before institute access can expose Science questions.
            </p>
            <small>
              Safe check: confirm Program, Subject, and Topic coverage here first. After that, confirm the
              institute access row in the visibility panel below is active and not revoked.
            </small>
          </div>

          <div className="resultsSummaryGrid" style={{ marginBottom: 16 }}>
            <article className="metricCard dashboardHeroCard">
              <span>Editing institute</span>
              <strong>{selectedInstitute ? selectedInstitute.code : "Not selected"}</strong>
              <small>{selectedInstitute ? selectedInstitute.name : "Choose which institute owns the package row."}</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Coverage rows</span>
              <strong>{scopes.length}</strong>
              <small>{activeScopeCount} active right now.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Coverage depth</span>
              <strong>{scopedSubjectCount > 0 ? scopedSubjectCount : scopedProgramCount > 0 ? scopedProgramCount : "Broad"}</strong>
              <small>
                {scopedTopicCount > 0
                  ? `${scopedTopicCount} row(s) already narrowed to topic level.`
                  : scopedSubjectCount > 0
                    ? `${scopedSubjectCount} row(s) narrowed to subject level.`
                    : "Rows are still broad and may expose more content than intended."}
              </small>
            </article>
          </div>

        <div className="builderHintPanel" style={{ marginBottom: 16 }}>
          <strong>Current sellable coverage summary</strong>
            <p>
              {activeScopeCount === 0
                ? "No active coverage row exists yet, so this package would not unlock any usable question-bank scope."
                : [
                    subjectTargetedRows > 0 ? `${subjectTargetedRows} subject-targeted row${subjectTargetedRows === 1 ? "" : "s"}` : null,
                    topicTargetedRows > 0 ? `${topicTargetedRows} topic-targeted row${topicTargetedRows === 1 ? "" : "s"}` : null,
                    programWideRows > 0 ? `${programWideRows} program-wide row${programWideRows === 1 ? "" : "s"}` : null,
                    fullyOpenRows > 0 ? `${fullyOpenRows} fully broad row${fullyOpenRows === 1 ? "" : "s"}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
            <small>
              Best operator pattern: keep Subject Library packages at subject level unless you intentionally want topic bundles or broad program-wide access.
            </small>
          </div>

          <div className="economyAccessChecklist" style={{ marginBottom: 16 }}>
            <div className="economyAccessChecklistCard economyAccessChecklistCardReady">
              <span>Package promise preview</span>
              <strong>{titleCase(packageType)}</strong>
              <small>{packagePromise}</small>
            </div>
            <div className="economyAccessChecklistCard economyAccessChecklistCardAttention">
              <span>Institute-side expectation</span>
              <strong>{activeScopeCount === 0 ? "No usable access yet" : "Coverage follows these rows"}</strong>
              <small>
                Institutes should only see the subjects and topics defined here after institute access and the shared-library switch are active. Missing Science usually means Science was never added as an active coverage row.
              </small>
            </div>
            <div className="economyAccessChecklistCard economyAccessChecklistCardNeutral">
              <span>Access mode meaning</span>
              <strong>{titleCase(accessMode)}</strong>
              <small>{describeAccessModeForOperators(accessMode)}</small>
            </div>
          </div>

          <div className="economyAccessChecklist" style={{ marginBottom: 16 }} data-testid="package-scope-readiness">
            {scopeReadinessCards.map((item) => (
              <div
                key={item.label}
                className={`economyAccessChecklistCard economyAccessChecklistCard${titleCase(item.state)}`}
              >
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>

          {blockingScopeRows.length > 0 ? (
            <div className="builderHintPanel economyScopeWarningPanel" style={{ marginBottom: 16 }}>
              <strong>Fix these coverage rows before saving</strong>
              <p>
                {blockingScopeRows.length} coverage row{blockingScopeRows.length === 1 ? "" : "s"} still have blocking issues.
              </p>
              <small>
                {blockingScopeRows
                  .map((row) => `Row ${row.index + 1}: ${row.blockingIssues.join(" ")}`)
                  .join(" · ")}
              </small>
            </div>
          ) : advisoryScopeRows.length > 0 ? (
            <div className="builderHintPanel" style={{ marginBottom: 16 }}>
              <strong>Recommended scope cleanup</strong>
              <p>
                The package can be saved, but {advisoryScopeRows.length} row{advisoryScopeRows.length === 1 ? "" : "s"} could still confuse support teams later.
              </p>
              <small>
                {advisoryScopeRows
                  .slice(0, 3)
                  .map((row) => `Row ${row.index + 1}: ${row.advisoryIssues.join(" ")}`)
                  .join(" · ")}
              </small>
            </div>
          ) : null}

          {scopes.some((scope) => scope.is_active) ? (
            <div className="economyFormSection" style={{ marginBottom: 16 }}>
              <div className="economyFormSectionHeader">
                <strong>Pre-save scope review</strong>
                <span>Use this quick readout to confirm exactly what the package will unlock before saving.</span>
              </div>
              <div className="weakTopicStack">
                {scopes
                  .filter((scope) => scope.is_active)
                  .map((scope, index) => {
                    const scopePosture = describeScopePosture(scope);
                    const scopeConstraintSummary = describeScopeConstraintSummary(scope);

                    return (
                      <div className="weakTopicRow" key={`scope-review-${scope.id ?? "new"}-${index}`}>
                        <div>
                          <strong>Active coverage row {index + 1}</strong>
                          <span>{describeScopeDraft(scope)}</span>
                          <span>{scopeConstraintSummary.join(" · ")}</span>
                        </div>
                        <div className="weakTopicMeta">
                          <strong>{scopePosture.label}</strong>
                          <span>{scope.topic ? "Topic-specific" : scope.subject ? "Subject-specific" : scope.program ? "Program-wide" : "Fully broad"}</span>
                          <span>{scope.question_source_type === "platform_only" ? "Platform-only questions" : titleCase(scope.question_source_type)}</span>
                          <span>{scopePosture.summary}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}

          {activeScopeOutcomePreview.length > 0 ? (
            <div className="economyFormSection" style={{ marginBottom: 16 }}>
              <div className="economyFormSectionHeader">
                <strong>Institute-facing outcome preview</strong>
                <span>Read this as if you were explaining the package to a school or coaching operator.</span>
              </div>
              <div className="weakTopicStack">
                {activeScopeOutcomePreview.map((summary, index) => (
                  <div className="weakTopicRow" key={`scope-outcome-${index}`}>
                    <div>
                      <strong>What active row {index + 1} will unlock</strong>
                      <span>{summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {rowsWithoutSubject > 0 || broadActiveRows > 0 ? (
            <div className="builderHintPanel" style={{ marginBottom: 16 }}>
              <strong>Coverage warning</strong>
              <p>
                {rowsWithoutSubject > 0
                  ? `${rowsWithoutSubject} active row${rowsWithoutSubject === 1 ? "" : "s"} still do not name a subject.`
                  : "Some active rows are still broad."}{" "}
                Subjectless rows are harder to audit and often create confusion during support calls.
              </p>
              <small>
                {broadActiveRows > 0
                  ? `${broadActiveRows} active row${broadActiveRows === 1 ? "" : "s"} are still broad at program level. Add subject-specific rows when you want clear package behavior such as Math access separate from Science access.`
                  : "Add subject-specific rows when operators need clear, explainable package behavior."}
              </small>
            </div>
          ) : null}

          <div className="economyFormSection">
            <div className="economyFormSectionHeader">
              <strong>Package identity</strong>
              <span>Define who owns this commercial object and how operators will recognize it later.</span>
            </div>

            <div className="economyPackageFormGridPrimary">
              <label className="setupField">
                <span>Institute</span>
                <select value={instituteId} onChange={(event) => setInstituteId(event.target.value)}>
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="setupField">
                <span>Package type</span>
                <select value={packageType} onChange={(event) => setPackageType(event.target.value)}>
                  <option value="subject_library">Subject Library</option>
                  <option value="topic_bundle">Topic Bundle</option>
                  <option value="exam_family_bundle">Exam Family Bundle</option>
                  <option value="custom_bundle">Custom Bundle</option>
                  <option value="feature_bundle">Feature Bundle</option>
                </select>
              </label>
              <label className="setupField">
                <span>Package name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="setupField">
                <span>Package code</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} />
              </label>
            </div>

            <label className="setupField economyPackageDescriptionField">
              <span>Description</span>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the value of this package and what it unlocks for the institute."
              />
            </label>
          </div>

          <div className="economyFormSection">
            <div className="economyFormSectionHeader">
              <strong>Delivery rules</strong>
              <span>Choose how this package is exposed, sorted, and whether it appears in the shared catalog.</span>
            </div>

            <div className="economyPackageFormGridSecondary">
              <label className="setupField">
                <span>Ownership</span>
                <select value={ownershipType} onChange={(event) => setOwnershipType(event.target.value)}>
                  <option value="platform">Platform</option>
                  <option value="institute">Institute</option>
                </select>
              </label>
              <label className="setupField">
                <span>Access mode</span>
                <select value={accessMode} onChange={(event) => setAccessMode(event.target.value)}>
                  <option value="full_scope">Full Scope</option>
                  <option value="quota_limited">Quota Limited</option>
                  <option value="link_on_demand">Link On Demand</option>
                  <option value="materialize_on_entitlement">Materialize On Entitlement</option>
                </select>
              </label>
              <label className="setupField">
                <span>Sort order</span>
                <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} type="number" />
              </label>
              <label className="setupField">
                <span>Public catalog</span>
                <select
                  value={isPublicCatalog ? "yes" : "no"}
                  onChange={(event) => setIsPublicCatalog(event.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="setupField">
                <span>Active row</span>
                <select value={isActive ? "yes" : "no"} onChange={(event) => setIsActive(event.target.value === "yes")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
            <div className="economyCompactStats">
              <span>Owner: {ownershipType === "platform" ? "Platform sells this package" : "Institute owns this package"}</span>
              <span>Access mode: {titleCase(accessMode)}</span>
              <span>{isPublicCatalog ? "Visible in catalog" : "Hidden from catalog"}</span>
              <span>{isActive ? "Package row active" : "Package row paused"}</span>
            </div>
          </div>
          <div className="economyFormSection">
            <div className="economySectionHeaderSplit">
              <div className="economyFormSectionHeader">
                <strong>Package coverage rows</strong>
                <span>Add one or more program, subject, or topic rows to define what this package can expose.</span>
              </div>
              <button className="button buttonGhost" onClick={addScopeRow} type="button">
                Add Coverage Row
              </button>
            </div>
            <div className="economyCompactStats">
              <span>{scopes.length} coverage row{scopes.length === 1 ? "" : "s"} configured</span>
              <span>{scopes.filter((scope) => scope.is_active).length} active</span>
            </div>
            {!editorLookupsReady && !editorLookupsLoading ? (
              <div className="builderHintPanel" style={{ marginBottom: 16 }}>
                <strong>Editor lookups are not ready yet</strong>
                <p>Choose an institute and reopen the editor if academic scope selectors stay empty.</p>
              </div>
            ) : null}
            <div className="economyFormSection economyPackageRecipePanel">
              <div className="economyFormSectionHeader">
                <strong>Fast setup recipes</strong>
                <span>Generate a safe first draft in one click, then fine-tune only what needs special handling.</span>
              </div>
              <div className="economyPackageFormGridSecondary">
                <label className="setupField">
                  <span>Recipe</span>
                  <select
                    aria-label="Question bank package scope preset"
                    value={scopePresetMode}
                    onChange={(event) => setScopePresetMode(event.target.value as ScopePresetMode)}
                  >
                    <option value="subject_library_all_subjects">One row per active subject</option>
                    <option value="subject_library_single">Single subject library</option>
                    <option value="program_wide_library">Program-wide broad library</option>
                    <option value="topic_bundle_targeted">Topic bundle starting point</option>
                  </select>
                </label>
                <label className="setupField">
                  <span>Recipe subject</span>
                  <select
                    aria-label="Question bank package preset subject"
                    value={presetSubjectId}
                    onChange={(event) => setPresetSubjectId(event.target.value)}
                  >
                    <option value="">Choose subject when needed</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="economyRecipeActions">
                  <button className="button buttonSecondary" onClick={applyScopePreset} type="button">
                    Apply Recipe
                  </button>
                  <button className="button buttonGhost" onClick={() => setScopes([emptyScopeDraft()])} type="button">
                    Start Blank
                  </button>
                </div>
              </div>
              <div className="economyCompactStats">
                <span>Replaces current rows</span>
                <span>Best for non-technical operators</span>
                <span>No linked questions are changed at this stage</span>
              </div>
            </div>
            {subjectQuickPicks.length > 0 ? (
              <div className="economyFormSection economyPackageQuickPickPanel">
                <div className="economyFormSectionHeader">
                  <strong>Quick-add common subject rows</strong>
                  <span>Add a concrete subject row first, then narrow topics or quota only if the package needs it.</span>
                </div>
                <div className="economyQuickChipRow">
                  {subjectQuickPicks.map((subject) => (
                    <button
                      key={subject.id}
                      className="button buttonGhost economyQuickChip"
                      onClick={() => addSubjectQuickRow(subject.id)}
                      type="button"
                    >
                      Add {subject.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="weakTopicStack">
              {scopes.map((scope, index) => {
                const subjectOptions = availableSubjects.filter(
                  (subject) => !scope.program || !subject.program || subject.program === scope.program,
                );
                const topicOptions = availableTopics.filter(
                  (topic) => !scope.subject || !topic.subject || topic.subject === scope.subject,
                );
                const scopePosture = describeScopePosture(scope);
                const scopeConstraintSummary = describeScopeConstraintSummary(scope);
                const scopeValidation = scopeValidationDetails[index];

                return (
                  <div
                    className="economyPackageScopeCard"
                    key={`${scope.id ?? "new"}-${index}`}
                    data-testid={`package-scope-row-${index + 1}`}
                  >
                    <div className="economyPackageScopeHeader">
                      <div className="economyPackageScopeTitle">
                        <strong>Coverage row {index + 1}</strong>
                        <span>Choose the academic slice, question constraints, and quota limits for this package row.</span>
                      </div>
                      <div className="economyPackageScopeActions">
                        <span className={`statusTag ${scope.is_active ? "statusTagSuccess" : "statusTagNeutral"}`}>
                          {scope.is_active ? "Active" : "Inactive"}
                        </span>
                        <button className="button buttonGhost" onClick={() => removeScopeRow(index)} type="button">
                          Remove Row
                        </button>
                      </div>
                    </div>

                    <div className="builderHintPanel" style={{ marginBottom: 12 }}>
                      <strong>Current targeting</strong>
                      <p>{describeScopeDraft(scope)}</p>
                      <small>{scopeDraftGuidance(scope)}</small>
                    </div>

                    <div className="builderHintPanel" style={{ marginBottom: 12 }}>
                      <strong>Institute will receive</strong>
                      <p>{describeInstituteFacingScopeOutcome(scope, lookupMaps)}</p>
                      <small>
                        Use this sentence as the operator truth. If it feels too broad or too vague, narrow the row before saving.
                      </small>
                    </div>

                    {!scope.subject && packageType === "subject_library" ? (
                      <div className="builderHintPanel economyScopeWarningPanel" style={{ marginBottom: 12 }}>
                        <strong>Subject required for this package type</strong>
                        <p>
                          This is a Subject Library row, but no concrete subject is selected yet.
                        </p>
                        <small>
                          Add a subject before saving so operators can explain whether this row unlocks Math, Science, or another subject without guessing.
                        </small>
                      </div>
                    ) : null}

                    <div className="economyCompactStats">
                      <span>
                        Expected institute view: {scope.topic ? "Only selected topic slice" : scope.subject ? "Only selected subject slice" : scope.program ? "Program-wide slice" : "Very broad row"}
                      </span>
                      <span>
                        Troubleshooting hint: {scope.subject ? "If another subject is missing, add a separate row for it." : "Broad rows are harder to explain during support."}
                      </span>
                    </div>

                    <div className="economyScopeHealthRow">
                      <div className={`economyScopeHealthCard economyScopeHealthCard${titleCase(scopePosture.tone)}`}>
                        <span>Coverage posture</span>
                        <strong>{scopePosture.label}</strong>
                        <small>{scopePosture.summary}</small>
                      </div>
                      <div className="economyScopeHealthCard economyScopeHealthCardNeutral">
                        <span>Live constraints</span>
                        <strong>{scope.is_active ? "Row active" : "Row inactive"}</strong>
                        <small>{scopeConstraintSummary.slice(0, 3).join(" · ")}</small>
                      </div>
                    </div>

                    {scopeValidation.blockingIssues.length > 0 ? (
                      <div
                        className="builderHintPanel economyScopeWarningPanel"
                        style={{ marginBottom: 12 }}
                        data-testid={`package-scope-blocking-${index + 1}`}
                      >
                        <strong>Blocking issue on this row</strong>
                        <p>{scopeValidation.blockingIssues[0]}</p>
                        {scopeValidation.blockingIssues.length > 1 ? (
                          <small>{scopeValidation.blockingIssues.slice(1).join(" · ")}</small>
                        ) : null}
                      </div>
                    ) : null}

                    {scopeValidation.advisoryIssues.length > 0 ? (
                      <div
                        className="builderHintPanel"
                        style={{ marginBottom: 12 }}
                        data-testid={`package-scope-advisory-${index + 1}`}
                      >
                        <strong>Operator caution for this row</strong>
                        <p>{scopeValidation.advisoryIssues[0]}</p>
                        {scopeValidation.advisoryIssues.length > 1 ? (
                          <small>{scopeValidation.advisoryIssues.slice(1).join(" · ")}</small>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="economyFormSection">
                      <div className="economyFormSectionHeader">
                        <strong>Academic targeting</strong>
                        <span>Decide which program, subject, or topic slice this row should expose.</span>
                      </div>
                      <div className="economyPackageScopeGrid">
                        <label className="setupField">
                          <span>Program</span>
                          <select
                            aria-label={`Program ${index + 1}`}
                            value={scope.program}
                            onChange={(event) => updateScope(index, { program: event.target.value, subject: "", topic: "" })}
                          >
                            <option value="">Any program</option>
                            {availablePrograms.map((program) => (
                              <option key={program.id} value={program.id}>
                                {program.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="setupField">
                          <span>Subject</span>
                          <select
                            aria-label={`Subject ${index + 1}`}
                            value={scope.subject}
                            onChange={(event) => updateScope(index, { subject: event.target.value, topic: "" })}
                          >
                            <option value="">Any subject</option>
                            {subjectOptions.map((subject) => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="setupField">
                          <span>Topic</span>
                          <select
                            aria-label={`Topic ${index + 1}`}
                            value={scope.topic}
                            onChange={(event) => updateScope(index, { topic: event.target.value })}
                          >
                            <option value="">Any topic</option>
                            {topicOptions.map((topic) => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="economyFormSection">
                      <div className="economyFormSectionHeader">
                        <strong>Question constraints</strong>
                        <span>Control source, difficulty, question format, and master-library visibility.</span>
                      </div>
                      <div className="economyPackageScopeGrid">
                        <label className="setupField">
                          <span>Question source</span>
                          <select
                            value={scope.question_source_type}
                            onChange={(event) => updateScope(index, { question_source_type: event.target.value })}
                          >
                            <option value="platform_only">Platform Only</option>
                            <option value="all">All</option>
                            <option value="institute_only">Institute Only</option>
                          </select>
                        </label>
                        <label className="setupField">
                          <span>Difficulty</span>
                          <select
                            value={scope.difficulty_level}
                            onChange={(event) => updateScope(index, { difficulty_level: event.target.value })}
                          >
                            <option value="">Any</option>
                            <option value="foundation">Foundation</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </label>
                        <label className="setupField">
                          <span>Question type</span>
                          <select
                            value={scope.question_type}
                            onChange={(event) => updateScope(index, { question_type: event.target.value })}
                          >
                            <option value="">Any</option>
                            <option value="mcq_single">MCQ Single</option>
                            <option value="mcq_multiple">MCQ Multiple</option>
                            <option value="true_false">True / False</option>
                            <option value="assertion_reason">Assertion / Reason</option>
                            <option value="matrix_match">Matrix Match</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="fill_in_blanks">Fill in the Blanks</option>
                            <option value="numeric_answer">Numeric Answer</option>
                            <option value="essay_manual_review">Essay Manual Review</option>
                          </select>
                        </label>
                        <label className="setupField">
                          <span>Visibility</span>
                          <select
                            value={scope.master_visibility}
                            onChange={(event) => updateScope(index, { master_visibility: event.target.value })}
                          >
                            <option value="">Any</option>
                            <option value="private">Private</option>
                            <option value="shared_by_request">Shared By Request</option>
                            <option value="public">Public</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="economyFormSection">
                      <div className="economyFormSectionHeader">
                        <strong>Quota and lifecycle</strong>
                        <span>Cap how many questions the row can expose and whether the row is currently active.</span>
                      </div>
                      <div className="economyPackageScopeGrid economyPackageScopeGridCompact">
                        <label className="setupField">
                          <span>Max questions total</span>
                          <input
                            value={scope.max_questions_total}
                            onChange={(event) => updateScope(index, { max_questions_total: event.target.value })}
                            type="number"
                          />
                        </label>
                        <label className="setupField">
                          <span>Max per topic</span>
                          <input
                            value={scope.max_questions_per_topic}
                            onChange={(event) => updateScope(index, { max_questions_per_topic: event.target.value })}
                            type="number"
                          />
                        </label>
                        <label className="setupField">
                          <span>Row status</span>
                          <select
                            value={scope.is_active ? "yes" : "no"}
                            onChange={(event) => updateScope(index, { is_active: event.target.value === "yes" })}
                          >
                            <option value="yes">Active</option>
                            <option value="no">Inactive</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="economyCompactStats">
                      {scopeConstraintSummary.map((item, summaryIndex) => (
                        <span key={`${scope.id ?? "new"}-${index}-constraint-${summaryIndex}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="economyEditorActionBar">
            <button
              className="button buttonPrimary"
              disabled={!canSubmitPackage}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {saving ? "Saving..." : editingId ? "Update Question-Bank Package" : "Create Question-Bank Package"}
            </button>
            {editingId ? (
              <button className="button buttonGhost" onClick={resetForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
          {!canSubmitPackage ? (
            <p className="academicSectionDescription" data-testid="package-save-blocked-helper">
              {activeScopeCount === 0
                ? "Add at least one active coverage row before saving this package."
                : blockingScopeRows.length > 0
                  ? `Resolve the blocking issue on coverage row ${blockingScopeRows[0].index + 1} before saving.`
                  : "Package save is temporarily unavailable."}
            </p>
          ) : null}
        </section>
        ) : null}

        {workspaceView === "catalog" || workspaceView === "all" ? (
        <section className="featurePlaceholder">
          <strong>Current package catalog</strong>
          <p>{filteredPackages.length} packages match the current filter set.</p>
          {catalogLoading ? <p className="setupFieldMeta">Loading package catalog...</p> : null}
          {!catalogLoading && catalogLoadError ? (
            <p className="feedbackBanner feedbackBannerError">{catalogLoadError}</p>
          ) : null}
          <div className="weakTopicStack">
            {visiblePackages.map((pkg) => (
              <div className="economyPackageCatalogRow" key={pkg.id}>
                <div className="economyPackageCatalogMain">
                  <strong>{pkg.name}</strong>
                  <span>
                    {pkg.code} · {pkg.institute_code} · {titleCase(pkg.package_type)}
                  </span>
                  <span>
                    {titleCase(pkg.ownership_type)} · {titleCase(pkg.access_mode)} · {pkg.is_public_catalog ? "Public catalog" : "Hidden catalog"}
                  </span>
                  <span>
                    {pkg.scope_count} coverage rows · {pkg.linked_plan_count} linked plans · {pkg.active_entitlement_count} active institute access rows
                  </span>
                  <details className="economyCatalogDetailDisclosure">
                    <summary>View coverage details</summary>
                    <div className="economyCatalogDetailStack">
                      <span>{pkg.coverage_summary}</span>
                      {pkg.coverage_program_labels.length > 0 ? (
                        <span>Programs: {pkg.coverage_program_labels.slice(0, 6).join(", ")}</span>
                      ) : null}
                      {pkg.coverage_subject_labels.length > 0 ? (
                        <span>Subjects: {pkg.coverage_subject_labels.slice(0, 6).join(", ")}</span>
                      ) : null}
                      {pkg.coverage_topic_labels.length > 0 ? (
                        <span>Topics: {pkg.coverage_topic_labels.slice(0, 6).join(", ")}</span>
                      ) : null}
                      {pkg.commercial_labels.length > 0 ? (
                        <span>Commercial labels: {pkg.commercial_labels.join(", ")}</span>
                      ) : null}
                      {pkg.recommended_for_labels.length > 0 ? (
                        <span>Recommended for: {pkg.recommended_for_labels.join(", ")}</span>
                      ) : null}
                    </div>
                  </details>
                </div>
                <div className="economyPackageCatalogMeta">
                  <strong>{pkg.is_active ? "Active" : "Inactive"}</strong>
                  <span>{pkg.coverage_summary}</span>
                  <button
                    className="button buttonGhost"
                    disabled={loadingPackageId === pkg.id}
                    onClick={() => void loadForEdit(pkg)}
                    type="button"
                  >
                    {loadingPackageId === pkg.id ? "Loading..." : "Edit"}
                  </button>
                </div>
              </div>
            ))}
            {visiblePackages.length === 0 ? (
              <div className="featurePlaceholder">
                <p>No packages match the current catalog filters.</p>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}
      </div>
    </article>
  );
}
