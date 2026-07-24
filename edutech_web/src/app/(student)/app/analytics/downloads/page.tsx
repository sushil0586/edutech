import { StudentReportsHub } from "./reports-hub";

export default function StudentDownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  return <StudentReportsHub basePath="/app/analytics/downloads" searchParams={searchParams} />;
}
