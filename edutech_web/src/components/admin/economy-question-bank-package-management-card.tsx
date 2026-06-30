"use client";

import { useMemo, useState } from "react";

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
  scopes: Array<{
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

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

export function EconomyQuestionBankPackageManagementCard({
  packages,
  institutes,
  programs,
  subjects,
  topics,
  onPackagesChange,
}: {
  packages: AdminQuestionBankPackage[];
  institutes: InstituteOption[];
  programs: ProgramOption[];
  subjects: SubjectOption[];
  topics: TopicOption[];
  onPackagesChange?: (packages: AdminQuestionBankPackage[]) => void;
}) {
  const [workspaceView, setWorkspaceView] = useState<"editor" | "catalog" | "all">("editor");
  const [catalogInstituteFilter, setCatalogInstituteFilter] = useState("all");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState("all");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [catalogRowsToShow, setCatalogRowsToShow] = useState<"4" | "8" | "12">("8");
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
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

  const availablePrograms = useMemo(
    () => programs.filter((program) => program.is_active && program.institute === instituteId),
    [programs, instituteId],
  );
  const availableSubjects = useMemo(
    () => subjects.filter((subject) => subject.is_active && subject.institute === instituteId),
    [subjects, instituteId],
  );
  const availableTopics = useMemo(
    () => topics.filter((topic) => topic.is_active && topic.institute === instituteId),
    [topics, instituteId],
  );
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
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
      return true;
    });
  }, [catalogInstituteFilter, catalogStatusFilter, catalogTypeFilter, packages]);
  const visiblePackages = filteredPackages.slice(0, Number(catalogRowsToShow));
  const activePackageCount = packages.filter((pkg) => pkg.is_active).length;
  const subjectLibraryCount = packages.filter((pkg) => pkg.package_type === "subject_library").length;

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

  function loadForEdit(pkg: AdminQuestionBankPackage) {
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
      pkg.scopes.length > 0
        ? pkg.scopes.map((scope) => ({
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
  }

  function updateScope(index: number, patch: Partial<PackageScopeDraft>) {
    setScopes((current) => current.map((scope, scopeIndex) => (scopeIndex === index ? { ...scope, ...patch } : scope)));
  }

  function addScopeRow() {
    setScopes((current) => [...current, emptyScopeDraft()]);
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
      setError("Institute, package name, and package code are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

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
          typeof body.detail === "string"
            ? body.detail
            : `Question bank package save failed with status ${response.status}`,
        );
      }

      if (body.data) {
        const next = (editingId
          ? packages.map((item) => (item.id === body.data!.id ? body.data! : item))
          : [body.data!, ...packages]
        ).sort((a, b) => {
          if (a.institute_name !== b.institute_name) {
            return a.institute_name.localeCompare(b.institute_name);
          }
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.name.localeCompare(b.name);
        });
        onPackagesChange?.(next);
      }

      setMessage(
        body.message ??
          (editingId ? "Question bank package updated successfully." : "Question bank package created successfully."),
      );
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
          </div>
          <div className="economyFormSection">
            <div className="economySectionHeaderSplit">
              <div className="economyFormSectionHeader">
                <strong>Scope coverage rows</strong>
                <span>Add one or more program, subject, or topic rows to define what this package can expose.</span>
              </div>
              <button className="button buttonGhost" onClick={addScopeRow} type="button">
                Add Scope Row
              </button>
            </div>
            <div className="economyCompactStats">
              <span>{scopes.length} scope row{scopes.length === 1 ? "" : "s"} configured</span>
              <span>{scopes.filter((scope) => scope.is_active).length} active</span>
            </div>
            <div className="weakTopicStack">
              {scopes.map((scope, index) => {
                const subjectOptions = availableSubjects.filter(
                  (subject) => !scope.program || !subject.program || subject.program === scope.program,
                );
                const topicOptions = availableTopics.filter(
                  (topic) => !scope.subject || !topic.subject || topic.subject === scope.subject,
                );

                return (
                  <div className="economyPackageScopeCard" key={`${scope.id ?? "new"}-${index}`}>
                    <div className="economyPackageScopeHeader">
                      <div className="economyPackageScopeTitle">
                        <strong>Scope row {index + 1}</strong>
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
                  </div>
                );
              })}
            </div>
          </div>

          <div className="economyEditorActionBar">
            <button className="button buttonPrimary" disabled={saving} onClick={() => void handleSubmit()} type="button">
              {saving ? "Saving..." : editingId ? "Update Question-Bank Package" : "Create Question-Bank Package"}
            </button>
            {editingId ? (
              <button className="button buttonGhost" onClick={resetForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </section>
        ) : null}

        {workspaceView === "catalog" || workspaceView === "all" ? (
        <section className="featurePlaceholder">
          <strong>Current package catalog</strong>
          <p>{filteredPackages.length} packages match the current filter set.</p>
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
                    {pkg.scope_count} scope rows · {pkg.linked_plan_count} linked plans · {pkg.active_entitlement_count} active entitlements
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
                  <button className="button buttonGhost" onClick={() => loadForEdit(pkg)} type="button">
                    Edit
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
