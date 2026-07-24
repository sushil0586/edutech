import { StudentReportsHub } from "../analytics/downloads/reports-hub";

export default function StudentReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  return <StudentReportsHub basePath="/app/reports" searchParams={searchParams} />;
}
