import { ResultsWorkspacePage } from "@/features/results-workspace/page";

export default function InstituteResultsLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsWorkspacePage role="institute" view="leaderboard" searchParams={searchParams} />;
}
