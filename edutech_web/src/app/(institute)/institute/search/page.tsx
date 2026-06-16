import { WorkspaceSearchResults } from "@/components/ui/workspace-search-results";
import { loadWorkspaceLiveSearchEntries } from "@/lib/workspace/live-search";

export default async function InstituteWorkspaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const liveResults = await loadWorkspaceLiveSearchEntries("institute", q);

  return <WorkspaceSearchResults role="institute" query={q} baseHref="/institute/dashboard" liveResults={liveResults} />;
}
