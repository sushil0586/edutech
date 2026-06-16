import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
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

export function WorkspaceSearchResults({
  role,
  query,
  baseHref,
  liveResults = [],
}: {
  role: WorkspaceRole;
  query: string;
  baseHref: string;
  liveResults?: WorkspaceSearchEntry[];
}) {
  const trimmedQuery = query.trim();
  const results = [
    ...liveResults,
    ...searchWorkspaceEntries(role, trimmedQuery),
  ].filter(
    (entry, index, collection) =>
      collection.findIndex((candidate) => candidate.href === entry.href) === index,
  );
  const suggestions = getWorkspaceSearchEntries(role).slice(0, 6);

  return (
    <div className="studentPage studentDashboardModern">
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

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>{trimmedQuery ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Suggested pages"}</strong>
          <span>{trimmedQuery ? "Filtered by your query" : "Common shortcuts"}</span>
        </div>

        {trimmedQuery && results.length === 0 ? (
          <div className="studentInsightMessageStack">
            <div className="studentInsightMessage">
              <span className="placeholderDot" aria-hidden="true" />
              <p>No pages or live records matched this search. Try shorter terms like `{emptyStateExamples[role]}`.</p>
            </div>
          </div>
        ) : (
          <div className="detailGrid">
            {(trimmedQuery ? results : suggestions).map((result) => (
              <Link className="detailCard" href={result.href} key={result.href}>
                <span>{result.section}</span>
                <strong>{result.title}</strong>
                <small className="sectionDescription">{result.description}</small>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
