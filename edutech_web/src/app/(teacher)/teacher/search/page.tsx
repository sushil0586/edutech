import { WorkspaceSearchResults } from "@/components/ui/workspace-search-results";
import { loadWorkspaceLiveSearchEntries } from "@/lib/workspace/live-search";

export default async function TeacherWorkspaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const liveResults = await loadWorkspaceLiveSearchEntries("teacher", q);

  return <WorkspaceSearchResults role="teacher" query={q} baseHref="/teacher/dashboard" liveResults={liveResults} />;
}
