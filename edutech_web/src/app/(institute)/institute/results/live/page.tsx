import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function InstituteResultsLivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="institute" view="live" searchParams={searchParams} />;
}
