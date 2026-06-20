import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function InstituteResultsAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="institute" view="analysis" searchParams={searchParams} />;
}
