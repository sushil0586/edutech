import { WorkspaceSearchResults } from "@/components/ui/workspace-search-results";
import { loadWorkspaceLiveSearchEntries } from "@/lib/workspace/live-search";

export default async function ParentWorkspaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const liveResults = await loadWorkspaceLiveSearchEntries("parent", q);

  return <WorkspaceSearchResults role="parent" query={q} baseHref="/parent/dashboard" liveResults={liveResults} />;
}
