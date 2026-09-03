import {
  InstituteManagementWorkspace,
  type AdminInstituteRecord,
  type InstituteCounts,
  type InstituteOnboardingRunRecord,
} from "@/components/admin/institute-management-workspace";
import { fetchPortalCount, fetchPortalListAll, fetchPortalRecord } from "@/lib/api/portal";
import { fetchRegistrationOptions } from "@/lib/auth/session";

function normalizeSelectedInstitute(
  requestedInstituteId: string | undefined,
  institutes: AdminInstituteRecord[],
) {
  if (requestedInstituteId) {
    const match = institutes.find((item) => item.id === requestedInstituteId);
    if (match) {
      return match.id;
    }
  }

  return institutes.find((item) => item.is_active)?.id ?? institutes[0]?.id ?? null;
}

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

export default async function AdminInstitutesPage({
  searchParams,
}: {
  searchParams?: Promise<{ institute?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [institutes, onboardingProfiles, registrationOptions] = await Promise.all([
    fetchPortalListAll<AdminInstituteRecord>("/api/v1/institutes/?page_size=50").catch(() => []),
    fetchPortalListAll<{
      id: string;
      name: string;
      code: string;
      description: string;
      category: string;
      is_default: boolean;
      sort_order: number;
      config_json: Record<string, unknown>;
      is_active: boolean;
    }>("/api/v1/institutes/onboarding-profiles/").catch(() => []),
    fetchRegistrationOptions().catch(() => null),
  ]);
  const locationCatalog = registrationOptions?.location_catalog ?? [];
  const selectedInstituteId = normalizeSelectedInstitute(params.institute, institutes);
  const [selectedInstitute, onboardingRuns, studentCount, teacherCount, examCount] = selectedInstituteId
    ? await Promise.all([
        fetchPortalRecord<AdminInstituteRecord>(`/api/v1/institutes/${selectedInstituteId}/`).catch(() => null),
        fetchPortalListAll<InstituteOnboardingRunRecord>(
          `/api/v1/institutes/${selectedInstituteId}/onboarding-runs/`,
        ).catch(() => []),
        loadCount(`/api/v1/students/?institute=${selectedInstituteId}`),
        loadCount(`/api/v1/teachers/?institute=${selectedInstituteId}`),
        loadCount(`/api/v1/exams/?institute=${selectedInstituteId}`),
      ])
    : [null, [], 0, 0, 0];
  const counts: InstituteCounts = { examCount, studentCount, teacherCount };

  return (
    <InstituteManagementWorkspace
      counts={counts}
      institute={selectedInstitute}
      institutes={institutes}
      onboardingRuns={onboardingRuns}
      onboardingProfiles={onboardingProfiles}
      locationCatalog={locationCatalog}
      selectedInstituteId={selectedInstituteId}
    />
  );
}
