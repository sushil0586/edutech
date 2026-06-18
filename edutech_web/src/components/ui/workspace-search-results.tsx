import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { PageHeader } from "@/components/ui/page-header";
import { buildFilterHref, formatFilterValue, resolveFilterValue } from "@/lib/workspace/filter-utils";
import {
  getWorkspaceSearchEntries,
  searchWorkspaceEntries,
  type WorkspaceSearchEntry,
  type WorkspaceRole,
} from "@/lib/workspace/search-index";

const workspaceLabels: Record<WorkspaceRole, string> = {
  student: "Student workspace",
  teacher: "Teacher workspace",
  institute: "Institute workspace",
  admin: "Platform admin workspace",
  parent: "Parent workspace",
};

const emptyStateExamples: Record<WorkspaceRole, string> = {
  student: "results, practice, algebra, analytics, settings",
  teacher: "exam, results, question, import, builder",
  institute: "people, reports, question bank, security, exams",
  admin: "institutes, people, exams, reports, security",
  parent: "children, progress, alerts, settings",
};

type WorkspaceSearchSourceFilter = "all" | "live" | "catalog";
type WorkspaceSearchSortOption = "recommended" | "title" | "section";
type WorkspaceSearchGroupOption = "none" | "section" | "source";

function resolveSourceFilter(value?: string): WorkspaceSearchSourceFilter {
  return resolveFilterValue(value, ["live", "catalog"], "all");
}

function resolveSortOption(value?: string): WorkspaceSearchSortOption {
  return resolveFilterValue(value, ["title", "section"], "recommended");
}

function resolveGroupOption(value?: string): WorkspaceSearchGroupOption {
  return resolveFilterValue(value, ["section", "source"], "none");
}

function buildSearchHref(args: {
  role: WorkspaceRole;
  query?: string;
  section?: string;
  source?: WorkspaceSearchSourceFilter;
  sort?: WorkspaceSearchSortOption;
  group?: WorkspaceSearchGroupOption;
}) {
  const basePath =
    args.role === "student"
      ? "/app/search"
      : args.role === "teacher"
        ? "/teacher/search"
        : args.role === "institute"
          ? "/institute/search"
          : args.role === "admin"
            ? "/admin/search"
            : "/parent/search";
  return buildFilterHref(basePath, [
    ["q", args.query?.trim(), ""],
    ["section", args.section, "all"],
    ["source", args.source, "all"],
    ["sort", args.sort, "recommended"],
    ["group", args.group, "none"],
  ]);
}

export function WorkspaceSearchResults({
  role,
  query,
  baseHref,
  liveResults = [],
  searchParams,
}: {
  role: WorkspaceRole;
  query: string;
  baseHref: string;
  liveResults?: WorkspaceSearchEntry[];
  searchParams?: {
    section?: string;
    source?: string;
    sort?: string;
    group?: string;
  };
}) {
  const pageClassName =
    role === "institute"
      ? "studentPage studentDashboardModern instituteConsolePage instituteSearchPageVivid"
      : role === "teacher"
        ? "studentPage studentDashboardModern teacherConsolePage teacherSearchPageVivid"
        : role === "admin"
          ? "studentPage studentDashboardModern instituteConsolePage instituteSearchPageVivid"
      : "studentPage studentDashboardModern";
  const trimmedQuery = query.trim();
  const liveHrefSet = new Set(liveResults.map((entry) => entry.href));
  const mergedResults = [...liveResults, ...searchWorkspaceEntries(role, trimmedQuery)].filter(
    (entry, index, collection) =>
      collection.findIndex((candidate) => candidate.href === entry.href) === index,
  );
  const sectionOptions = Array.from(new Set(mergedResults.map((entry) => entry.section))).sort((left, right) =>
    left.localeCompare(right),
  );
  const sourceFilter = resolveSourceFilter(searchParams?.source);
  const sortOption = resolveSortOption(searchParams?.sort);
  const groupOption = resolveGroupOption(searchParams?.group);
  const sectionFilter = searchParams?.section?.trim() || "all";
  const defaultSuggestions = getWorkspaceSearchEntries(role).slice(0, 6);

  const filteredResults = mergedResults.filter((entry) => {
    const sourceMatch =
      sourceFilter === "all"
        ? true
        : sourceFilter === "live"
          ? liveHrefSet.has(entry.href)
          : !liveHrefSet.has(entry.href);
    const sectionMatch = sectionFilter === "all" ? true : entry.section === sectionFilter;
    return sourceMatch && sectionMatch;
  });

  const sortedResults = [...filteredResults].sort((left, right) => {
    switch (sortOption) {
      case "title":
        return left.title.localeCompare(right.title);
      case "section": {
        const sectionDelta = left.section.localeCompare(right.section);
        if (sectionDelta !== 0) return sectionDelta;
        return left.title.localeCompare(right.title);
      }
      case "recommended":
      default: {
        const leftRank = liveHrefSet.has(left.href) ? 0 : 1;
        const rightRank = liveHrefSet.has(right.href) ? 0 : 1;
        if (leftRank !== rightRank) return leftRank - rightRank;
        return left.title.localeCompare(right.title);
      }
    }
  });

  const visibleEntries = trimmedQuery ? sortedResults : defaultSuggestions;
  const groupedEntries =
    groupOption === "none"
      ? [{ label: trimmedQuery ? "Search results" : "Suggested pages", items: visibleEntries }]
      : Array.from(
          visibleEntries.reduce((map, entry) => {
            const label =
              groupOption === "section"
                ? entry.section
                : liveHrefSet.has(entry.href)
                  ? "Live records"
                  : "Workspace pages";
            map.set(label, [...(map.get(label) ?? []), entry]);
            return map;
          }, new Map<string, WorkspaceSearchEntry[]>()),
        ).map(([label, items]) => ({ label, items }));

  return (
    <div className={pageClassName}>
      <PageHeader
        eyebrow={workspaceLabels[role]}
        title="Search"
        description={
          trimmedQuery
            ? `Results for "${trimmedQuery}" across the ${workspaceLabels[role].toLowerCase()}.`
            : `Search shortcuts, pages, and workspace actions across the ${workspaceLabels[role].toLowerCase()}.`
        }
        action={
          <Link className="button buttonGhost" href={baseHref}>
            Back to workspace
          </Link>
        }
      />

      <section className="contentCard workspaceFiltersCard">
        <div className="sectionHeading">
          <strong>Search Controls</strong>
          <span>
            {trimmedQuery ? `${sortedResults.length} shown` : `${defaultSuggestions.length} suggested`}
            {trimmedQuery ? ` of ${mergedResults.length} matches` : ""}
          </span>
        </div>
        <form className="workspaceFiltersForm" method="GET">
          <label className="workspaceFilterField workspaceFilterFieldWide">
            <span>Search</span>
            <input defaultValue={trimmedQuery} name="q" placeholder={`Search ${workspaceLabels[role].toLowerCase()}`} type="search" />
          </label>
          <label className="workspaceFilterField">
            <span>Section</span>
            <select defaultValue={sectionFilter} name="section">
              <option value="all">All sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Source</span>
            <select defaultValue={sourceFilter} name="source">
              <option value="all">All sources</option>
              <option value="live">Live records</option>
              <option value="catalog">Workspace pages</option>
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Sort by</span>
            <select defaultValue={sortOption} name="sort">
              <option value="recommended">Recommended order</option>
              <option value="title">Title A-Z</option>
              <option value="section">Section</option>
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Group by</span>
            <select defaultValue={groupOption} name="group">
              <option value="none">No grouping</option>
              <option value="section">Section</option>
              <option value="source">Source</option>
            </select>
          </label>
          <div className="workspaceFilterActions">
            <button className="button buttonPrimary" type="submit">
              Apply filters
            </button>
            <Link className="button buttonSecondary" href={buildSearchHref({ role })}>
              Reset filters
            </Link>
          </div>
        </form>
        <div className="workspaceFilterQuickRow">
          <span className="workspaceFilterQuickLabel">Quick filters</span>
          <div className="workspaceFilterQuickChips">
            {[
              {
                label: "All",
                href: buildSearchHref({ role, query: trimmedQuery }),
                active:
                  sectionFilter === "all" &&
                  sourceFilter === "all" &&
                  sortOption === "recommended" &&
                  groupOption === "none",
              },
              {
                label: "Live Records",
                href: buildSearchHref({
                  role,
                  query: trimmedQuery,
                  section: sectionFilter,
                  source: "live",
                  sort: sortOption,
                  group: groupOption,
                }),
                active: sourceFilter === "live",
              },
              {
                label: "Workspace Pages",
                href: buildSearchHref({
                  role,
                  query: trimmedQuery,
                  section: sectionFilter,
                  source: "catalog",
                  sort: sortOption,
                  group: groupOption,
                }),
                active: sourceFilter === "catalog",
              },
              {
                label: "Group by Section",
                href: buildSearchHref({
                  role,
                  query: trimmedQuery,
                  section: sectionFilter,
                  source: sourceFilter,
                  sort: sortOption,
                  group: "section",
                }),
                active: groupOption === "section",
              },
            ].map((chip) => (
              <Link
                key={chip.label}
                className={`workspaceQuickChip${chip.active ? " workspaceQuickChipActive" : ""}`}
                href={chip.href}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
        <FilterSummaryPills
          items={[
            { label: "Section", value: sectionFilter },
            { label: "Source", value: formatFilterValue(sourceFilter) },
            { label: "Sort", value: formatFilterValue(sortOption) },
            { label: "Group", value: formatFilterValue(groupOption) },
          ]}
        />
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>{trimmedQuery ? `${sortedResults.length} result${sortedResults.length === 1 ? "" : "s"}` : "Suggested pages"}</strong>
          <span>{trimmedQuery ? "Filtered by your query" : "Common shortcuts"}</span>
        </div>

        {trimmedQuery && sortedResults.length === 0 ? (
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>No pages or live records matched this search. Try shorter terms like `{emptyStateExamples[role]}`.</p>
            </div>
          </div>
        ) : (
          groupedEntries.map((group) => (
            <div key={group.label}>
              {groupOption !== "none" ? (
                <div className="sectionHeading">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} items</span>
                </div>
              ) : null}
              <div className="detailGrid">
                {group.items.map((result) => (
                  <Link className="detailCard" href={result.href} key={result.href}>
                    <span>{result.section}</span>
                    <strong>{result.title}</strong>
                    <small className="sectionDescription">{result.description}</small>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
