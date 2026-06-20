import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function InstituteResultsAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="institute" view="attempts" searchParams={searchParams} />;
}
