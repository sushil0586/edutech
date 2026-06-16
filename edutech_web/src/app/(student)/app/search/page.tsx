import { WorkspaceSearchResults } from "@/components/ui/workspace-search-results";
import { loadWorkspaceLiveSearchEntries } from "@/lib/workspace/live-search";

export default async function StudentWorkspaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const liveResults = await loadWorkspaceLiveSearchEntries("student", q);

  return <WorkspaceSearchResults role="student" query={q} baseHref="/app/dashboard" liveResults={liveResults} />;
}
