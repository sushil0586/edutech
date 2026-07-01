import Link from "next/link";
import { InstituteManagementWorkspace, type AdminInstituteRecord } from "@/components/admin/institute-management-workspace";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { fetchPortalCount, fetchPortalList, fetchPortalRecord } from "@/lib/api/portal";
import { fetchRegistrationOptions } from "@/lib/auth/session";

type InstituteOnboardingRunRecord = {
  id: string;
  profile_code: string;
  profile_name: string | null;
  source: string;
  status: string;
  task_count: number;
  completed_task_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_summary: string;
  created_at: string;
};

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
  const institutes = await fetchPortalList<AdminInstituteRecord>("/api/v1/institutes/?page_size=50").catch(() => []);
  const onboardingProfiles = await fetchPortalList<{
    id: string;
    name: string;
    code: string;
    description: string;
    category: string;
    is_default: boolean;
    sort_order: number;
    config_json: Record<string, unknown>;
    is_active: boolean;
  }>("/api/v1/institutes/onboarding-profiles/").catch(() => []);
  const registrationOptions = await fetchRegistrationOptions().catch(() => null);
  const locationCatalog = registrationOptions?.location_catalog ?? [];
  const selectedInstituteId = normalizeSelectedInstitute(params.institute, institutes);
  const selectedInstitute = selectedInstituteId
    ? await fetchPortalRecord<AdminInstituteRecord>(`/api/v1/institutes/${selectedInstituteId}/`).catch(() => null)
    : null;
  const onboardingRuns = selectedInstituteId
    ? await fetchPortalList<InstituteOnboardingRunRecord>(
        `/api/v1/institutes/${selectedInstituteId}/onboarding-runs/`,
      ).catch(() => [])
    : [];

  const [studentCount, teacherCount, examCount] = selectedInstituteId
    ? await Promise.all([
        loadCount(`/api/v1/students/?institute=${selectedInstituteId}`),
        loadCount(`/api/v1/teachers/?institute=${selectedInstituteId}`),
        loadCount(`/api/v1/exams/?institute=${selectedInstituteId}`),
      ])
    : [0, 0, 0];
  const activeInstitutes = institutes.filter((item) => item.is_active).length;
  const inactiveInstitutes = institutes.length - activeInstitutes;
  const selectedReadinessScore = Math.min(
    100,
    (selectedInstitute ? 40 : 0) +
      (studentCount > 0 ? 20 : 0) +
      (teacherCount > 0 ? 20 : 0) +
      (examCount > 0 ? 20 : 0),
  );

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminInstitutePage instituteConsolePage">
      <PlatformAdminPageHeader
        title="Institutes"
        description=""
        statusLabel={selectedInstitute ? selectedInstitute.code : `${institutes.length} institutes`}
        statusTone={selectedInstitute?.is_active ? "live" : "warning"}
      />

      <section className="adminInstituteHero">
        <div className="adminInstituteHeroCopy">
          <div className="adminInstituteHeroMeta">
            <span>{institutes.length} institute records</span>
            <span>{activeInstitutes} active</span>
            <span>{inactiveInstitutes} inactive</span>
          </div>
        </div>
        <div className="adminInstituteHeroAside">
          <div className="adminInstituteHeroAsideStack">
            <div className="adminInstituteHeroAsideCard adminInstituteHeroAsideCardPrimary">
              <span>Selected institute</span>
              <strong>{selectedInstitute?.name ?? "Choose from directory"}</strong>
              <small>
                {selectedInstitute
                  ? `${selectedInstitute.city || "No city"}, ${selectedInstitute.state || "No state"}`
                  : "The detail panel updates when a record is selected."}
              </small>
            </div>
            <div className="adminInstituteHeroMiniStats">
              <article className="adminInstituteHeroMiniStat">
                <span>Readiness</span>
                <strong>{selectedReadinessScore}%</strong>
                <small>Derived from selected institute activity depth.</small>
              </article>
              <article className="adminInstituteHeroMiniStat">
                <span>People</span>
                <strong>{studentCount + teacherCount}</strong>
                <small>Students and teachers in the selected scope.</small>
              </article>
            </div>
          </div>
          <div className="studentInsightHeroActions adminInstituteHeroActions">
            <Link className="button buttonPrimary" href="/admin/academic-setup">
              Open Academic Setup
            </Link>
            <Link className="button buttonSecondary" href="/admin/settings">
              Open Settings
            </Link>
          </div>
        </div>
      </section>

      <section className="resultsSummaryGrid adminInstituteKpiGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard adminInstituteKpiCard">
          <span>Institutes</span>
          <strong>{institutes.length}</strong>
          <small>Total institute records in platform scope</small>
        </article>
        <article className="metricCard dashboardHeroCard adminInstituteKpiCard">
          <span>Students</span>
          <strong>{studentCount}</strong>
          <small>Students in the selected institute</small>
        </article>
        <article className="metricCard dashboardHeroCard adminInstituteKpiCard">
          <span>Teachers</span>
          <strong>{teacherCount}</strong>
          <small>Teachers in the selected institute</small>
        </article>
        <article className="metricCard dashboardHeroCard adminInstituteKpiCard">
          <span>Exams</span>
          <strong>{examCount}</strong>
          <small>Exams in the selected institute</small>
        </article>
      </section>

      <section className="adminInstituteWorkspaceShell">
          <InstituteManagementWorkspace
            counts={{ examCount, studentCount, teacherCount }}
            institute={selectedInstitute}
            institutes={institutes}
            onboardingRuns={onboardingRuns}
            onboardingProfiles={onboardingProfiles}
            locationCatalog={locationCatalog}
            selectedInstituteId={selectedInstituteId}
          />
      </section>
    </section>
  );
}
