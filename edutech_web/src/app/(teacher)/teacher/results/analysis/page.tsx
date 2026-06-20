import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function TeacherResultsAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="teacher" view="analysis" searchParams={searchParams} />;
}
