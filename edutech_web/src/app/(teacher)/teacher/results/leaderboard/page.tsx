import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function TeacherResultsLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="teacher" view="leaderboard" searchParams={searchParams} />;
}
