import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function TeacherResultsAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="teacher" view="attempts" searchParams={searchParams} />;
}
