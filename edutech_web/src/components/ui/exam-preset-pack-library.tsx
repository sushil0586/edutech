"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import type { ExamPresetPackDefinition } from "@/lib/assessment/exam-preset-packs";

type ExamPresetPackLibraryProps = {
  audience: "platform" | "institute";
  builderHref: string;
  scopeLabel: string;
};

type PresetPackScopeFilter = "all" | "starter" | "platform" | "institute" | "managed";

type PresetPackDraft = {
  label: string;
  family: string;
  note: string;
  chip: string;
};

type ManagedPresetBlueprint = {
  exam?: {
    examType?: string;
    sourceType?: string;
    deliveryMode?: string;
  };
  delivery?: {
    timerMode?: string;
    navigationMode?: string;
  };
  selectionMode?: string;
  sections?: Array<unknown>;
};

function parseApiError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Something went wrong.";
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "Something went wrong.";
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isManagedBlueprint(value: unknown): value is ManagedPresetBlueprint {
  return Boolean(value && typeof value === "object");
}

function summarizeBlueprint(pack: ExamPresetPackDefinition) {
  if (!isManagedBlueprint(pack.config)) {
    return null;
  }
  const blueprint = pack.config;
  const sectionCount = Array.isArray(blueprint.sections) ? blueprint.sections.length : 0;
  return {
    sectionCount,
    examType: blueprint.exam?.examType ?? "",
    sourceType: blueprint.exam?.sourceType ?? "",
    deliveryMode: blueprint.exam?.deliveryMode ?? "",
    timerMode: blueprint.delivery?.timerMode ?? "",
    navigationMode: blueprint.delivery?.navigationMode ?? "",
    selectionMode: blueprint.selectionMode ?? "",
  };
}

function createDraft(pack: ExamPresetPackDefinition): PresetPackDraft {
  return {
    label: pack.label,
    family: pack.family,
    note: pack.note,
    chip: pack.chip,
  };
}

function scopeBadgeLabel(pack: ExamPresetPackDefinition) {
  if (!pack.scope_type) {
    return "Starter pack";
  }
  if (pack.scope_type === "platform") {
    return "Platform managed";
  }
  return "Institute managed";
}

function formatUpdatedAt(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "Unknown";
  }
  return new Date(parsed).toLocaleString("en-IN");
}

async function fetchPresetPacks() {
  const response = await fetch("/api/exams/preset-packs", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as
    | { results?: ExamPresetPackDefinition[] }
    | Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseApiError(payload));
  }
  return Array.isArray((payload as { results?: ExamPresetPackDefinition[] }).results)
    ? ((payload as { results?: ExamPresetPackDefinition[] }).results ?? [])
    : [];
}

export function ExamPresetPackLibrary({
  audience,
  builderHref,
  scopeLabel,
}: ExamPresetPackLibraryProps) {
  const [packs, setPacks] = useState<ExamPresetPackDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<PresetPackScopeFilter>("all");
  const [editingPackId, setEditingPackId] = useState("");
  const [draft, setDraft] = useState<PresetPackDraft>({
    label: "",
    family: "",
    note: "",
    chip: "",
  });

  useEffect(() => {
    let ignore = false;

    async function loadPacks() {
      setLoading(true);
      try {
        const nextPacks = await fetchPresetPacks();
        if (!ignore) {
          setPacks(nextPacks);
          setError("");
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load preset packs right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadPacks();

    return () => {
      ignore = true;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const visiblePacks = useMemo(
    () =>
      packs
        .filter((pack) => {
          switch (scopeFilter) {
            case "starter":
              return !pack.scope_type;
            case "platform":
              return pack.scope_type === "platform";
            case "institute":
              return pack.scope_type === "institute";
            case "managed":
              return Boolean(pack.scope_type);
            case "all":
            default:
              return true;
          }
        })
        .filter((pack) => {
          if (!normalizedSearch) {
            return true;
          }
          const searchable = [pack.label, pack.family, pack.note, pack.chip, pack.id]
            .join(" ")
            .toLowerCase();
          return searchable.includes(normalizedSearch);
        })
        .sort((left, right) => {
          const starterDelta = Number(Boolean(left.scope_type)) - Number(Boolean(right.scope_type));
          if (starterDelta !== 0) {
            return starterDelta;
          }
          const manageDelta = Number(Boolean(right.can_manage)) - Number(Boolean(left.can_manage));
          if (manageDelta !== 0) {
            return manageDelta;
          }
          return left.label.localeCompare(right.label);
        }),
    [normalizedSearch, packs, scopeFilter],
  );

  const stats = useMemo(
    () => ({
      total: packs.length,
      starter: packs.filter((pack) => !pack.scope_type).length,
      platform: packs.filter((pack) => pack.scope_type === "platform").length,
      institute: packs.filter((pack) => pack.scope_type === "institute").length,
      editable: packs.filter((pack) => pack.can_manage).length,
    }),
    [packs],
  );

  function beginEdit(pack: ExamPresetPackDefinition) {
    if (!pack.can_manage) {
      return;
    }
    setEditingPackId(pack.id);
    setDraft(createDraft(pack));
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingPackId("");
    setDraft({ label: "", family: "", note: "", chip: "" });
  }

  async function refreshAfterChange() {
    const nextPacks = await fetchPresetPacks();
    setPacks(nextPacks);
  }

  async function savePack(pack: ExamPresetPackDefinition) {
    if (!pack.resourceId) {
      setError("This preset pack cannot be edited because its managed record is unavailable.");
      return;
    }
    try {
      const response = await fetch(`/api/exams/preset-packs/${pack.resourceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope_type: pack.scope_type,
          code: pack.id,
          label: draft.label.trim(),
          family: draft.family.trim(),
          note: draft.note.trim(),
          chip: draft.chip.trim(),
          config: pack.config ?? {},
          is_active: true,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }
      await refreshAfterChange();
      cancelEdit();
      setError("");
      setMessage(`Updated "${draft.label.trim() || pack.label}" in the ${scopeLabel} library.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update this preset pack right now.");
    }
  }

  async function archivePack(pack: ExamPresetPackDefinition) {
    if (!pack.resourceId) {
      setError("This preset pack cannot be archived because its managed record is unavailable.");
      return;
    }
    try {
      const response = await fetch(`/api/exams/preset-packs/${pack.resourceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(parseApiError(payload));
      }
      await refreshAfterChange();
      if (editingPackId === pack.id) {
        cancelEdit();
      }
      setError("");
      setMessage(`Archived "${pack.label}" from the ${scopeLabel} library.`);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive this preset pack right now.");
    }
  }

  return (
    <>
      <div className="pageUtilityRow">
        <span className={`statusPill ${loading ? "statusWarning" : "statusLive"}`}>
          {loading ? "Refreshing preset library" : `${visiblePacks.length} preset packs in view`}
        </span>
      </div>

      <div className="advancedBuilderHeroStats presetLibraryHeroStats">
        <div>
          <span>Total library</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Starter packs</span>
          <strong>{stats.starter}</strong>
        </div>
        <div>
          <span>Editable managed</span>
          <strong>{stats.editable}</strong>
        </div>
      </div>

      <section className="advancedBuilderPanel">
        <div className="advancedBuilderSectionHeader">
          <div>
            <span className="studentDashboardTag">Filters</span>
            <h3>Search the library and move into builder when you are ready to tune runtime</h3>
          </div>
          <div className="advancedBuilderInlineActions">
            <Link className="button buttonPrimary" href={builderHref}>
              Open Advanced Builder
            </Link>
          </div>
        </div>

        <div className="advancedBuilderSavedTemplateLibraryBar">
          <label className="advancedBuilderField advancedBuilderSavedTemplateField">
            <span>Search preset packs</span>
            <input
              placeholder="Search by label, family, code, or usage note"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="advancedBuilderSavedTemplateLibrarySummary">
            <strong>{stats.platform + stats.institute}</strong>
            <span>managed pack(s) available</span>
          </div>
        </div>

        <div className="advancedBuilderSavedTemplateFilter">
          {([
            ["all", "All packs"],
            ["starter", "Starter"],
            ["managed", "Managed"],
            ["platform", "Platform"],
            ["institute", "Institute"],
          ] as Array<[PresetPackScopeFilter, string]>).map(([value, label]) => (
            <button
              key={value}
              className={`advancedBuilderSavedTemplateFilterChip ${
                scopeFilter === value ? "advancedBuilderSavedTemplateFilterChipActive" : ""
              }`}
              onClick={() => setScopeFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <FilterSummaryPills
          items={[
            { label: "Audience", value: titleCase(audience) },
            { label: "Scope", value: scopeFilter === "all" ? "All" : titleCase(scopeFilter) },
            { label: "Search", value: search.trim() },
          ]}
        />

        {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}
        {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}

        {packs.length === 0 && !loading ? (
          <StudentStatePanel
            eyebrow="No preset packs yet"
            title={`No ${scopeLabel} preset packs are available yet`}
            description="Starter packs and managed packs will appear here as soon as the library endpoint returns live data. You can still open Advanced Builder to create the first governed pack."
            bullets={["Starter product families", "Managed runtime blueprints", "Builder deep links"]}
            ctaHref={builderHref}
            ctaLabel="Open Advanced Builder"
            statusLabel="Waiting for preset inventory"
          />
        ) : visiblePacks.length === 0 ? (
          <StudentStatePanel
            eyebrow="No matching preset packs"
            title="No preset packs match these controls"
            description="Try clearing the search, broadening the scope filter, or jump into Advanced Builder to create or tune a managed pack."
            bullets={["Search term", "Scope filter", "Editable governance lane"]}
            ctaHref={builderHref}
            ctaLabel="Open Advanced Builder"
            statusLabel="Filter returned zero preset packs"
          />
        ) : (
          <div className="presetLibraryCardGrid">
            {visiblePacks.map((pack) => {
              const summary = summarizeBlueprint(pack);
              const builderPackHref = `${builderHref}?preset_pack=${encodeURIComponent(pack.id)}`;
              return (
                <article className="presetLibraryCard" key={pack.id}>
                  <div className="presetLibraryCardHeader">
                    <div>
                      <div className="advancedBuilderSavedTemplateMetaRow">
                        <span
                          className={`advancedBuilderSavedTemplateBadge ${
                            pack.can_manage
                              ? "advancedBuilderSavedTemplateBadgeManage"
                              : "advancedBuilderSavedTemplateBadgeReadonly"
                          }`}
                        >
                          {scopeBadgeLabel(pack)}
                        </span>
                        <span className="advancedBuilderSavedTemplateMetaText">{pack.chip}</span>
                        <span className="advancedBuilderSavedTemplateMetaText">
                          Updated {formatUpdatedAt((pack as { updated_at?: string }).updated_at)}
                        </span>
                      </div>
                      <h3>{pack.label}</h3>
                      <p>{pack.note || "No additional note has been attached to this preset pack yet."}</p>
                    </div>
                    <div className="presetLibraryCodeBadge">{pack.id}</div>
                  </div>

                  <div className="presetLibraryStatsRow">
                    <div>
                      <span>Family</span>
                      <strong>{pack.family}</strong>
                    </div>
                    <div>
                      <span>Sections</span>
                      <strong>{summary?.sectionCount ?? 0}</strong>
                    </div>
                    <div>
                      <span>Flow</span>
                      <strong>{summary?.navigationMode ? titleCase(summary.navigationMode) : "Starter"}</strong>
                    </div>
                  </div>

                  {summary ? (
                    <div className="presetLibrarySpecGrid">
                      <span>{summary.examType ? `Exam: ${titleCase(summary.examType)}` : "Exam: Mixed"}</span>
                      <span>{summary.sourceType ? `Source: ${titleCase(summary.sourceType)}` : "Source: Flexible"}</span>
                      <span>{summary.deliveryMode ? `Delivery: ${titleCase(summary.deliveryMode)}` : "Delivery: Flexible"}</span>
                      <span>{summary.timerMode ? `Timer: ${titleCase(summary.timerMode)}` : "Timer: Flexible"}</span>
                      <span>{summary.selectionMode ? `Selection: ${titleCase(summary.selectionMode)}` : "Selection: Flexible"}</span>
                    </div>
                  ) : (
                    <div className="presetLibrarySpecGrid">
                      <span>Starter pack</span>
                      <span>Use this as a guided shortcut in builder</span>
                      <span>Promote to managed when your runtime needs governance</span>
                    </div>
                  )}

                  {editingPackId === pack.id ? (
                    <div className="advancedBuilderSavedTemplateEditor">
                      <label className="advancedBuilderField">
                        <span>Label</span>
                        <input
                          value={draft.label}
                          onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                        />
                      </label>
                      <div className="advancedBuilderGrid advancedBuilderGridTwo">
                        <label className="advancedBuilderField">
                          <span>Family</span>
                          <input
                            value={draft.family}
                            onChange={(event) => setDraft((current) => ({ ...current, family: event.target.value }))}
                          />
                        </label>
                        <label className="advancedBuilderField">
                          <span>Chip</span>
                          <input
                            value={draft.chip}
                            onChange={(event) => setDraft((current) => ({ ...current, chip: event.target.value }))}
                          />
                        </label>
                      </div>
                      <label className="advancedBuilderField">
                        <span>Usage note</span>
                        <textarea
                          value={draft.note}
                          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="presetLibraryActionRow">
                    <Link className="button buttonGhost" href={builderPackHref}>
                      Open In Builder
                    </Link>
                    {pack.can_manage ? (
                      editingPackId === pack.id ? (
                        <>
                          <button
                            className="button buttonSecondary"
                            onClick={() => startTransition(() => void savePack(pack))}
                            type="button"
                          >
                            Save Metadata
                          </button>
                          <button className="button buttonGhost" onClick={cancelEdit} type="button">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="button buttonSecondary" onClick={() => beginEdit(pack)} type="button">
                            Edit Metadata
                          </button>
                          <button
                            className="button buttonGhost"
                            onClick={() => startTransition(() => void archivePack(pack))}
                            type="button"
                          >
                            Archive
                          </button>
                        </>
                      )
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
