import { WorkspaceSearchResults } from "@/components/ui/workspace-search-results";
import { loadWorkspaceLiveSearchEntries } from "@/lib/workspace/live-search";

export default async function AdminWorkspaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const liveResults = await loadWorkspaceLiveSearchEntries("admin", q);

  return <WorkspaceSearchResults role="admin" query={q} baseHref="/admin" liveResults={liveResults} />;
}
