import Link from "next/link";
import { AdvancedExamBuilder } from "@/components/ui/advanced-exam-builder";
import { PlatformAdminPageHeader } from "@/components/ui/platform-admin-page-header";
import { fetchPortalList } from "@/lib/api/portal";
import {
  fetchTeacherAcademicYears,
  fetchTeacherAssessmentRegistry,
  fetchTeacherCohorts,
  fetchTeacherOptionCatalog,
  fetchTeacherPrograms,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requirePlatformAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
];

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

function normalizeSelectedInstitute(
  requestedInstituteId: string | undefined,
  institutes: InstituteRecord[],
) {
  if (requestedInstituteId) {
    const match = institutes.find((item) => item.id === requestedInstituteId);
    if (match) {
      return match;
    }
  }

  return institutes.find((item) => item.is_active) ?? institutes[0] ?? null;
}

export default async function PlatformAdminAdvancedExamBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{ institute?: string }>;
}) {
  await requirePlatformAdminSession();
  const params = (await searchParams) ?? {};

  const institutes = await fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=100").catch(() => []);
  const selectedInstitute = normalizeSelectedInstitute(params.institute, institutes);
  const selectedInstituteId = selectedInstitute?.id ?? "";

  const [academicYears, programs, optionCatalogEntries, assessmentRegistry] = await Promise.all([
    fetchTeacherAcademicYears({ institute: selectedInstituteId }),
    fetchTeacherPrograms({ institute: selectedInstituteId }),
    fetchTeacherOptionCatalog(),
    fetchTeacherAssessmentRegistry(),
  ]);

  const selectedAcademicYear = academicYears[0]?.id ?? "";
  const selectedProgram = programs[0]?.id ?? "";

  const [cohorts, subjects] = await Promise.all([
    fetchTeacherCohorts({
      institute: selectedInstituteId,
      academic_year: selectedAcademicYear,
      program: selectedProgram,
    }),
    fetchTeacherSubjects({
      institute: selectedInstituteId,
      program: selectedProgram,
    }),
  ]);

  const initialSubject = subjects[0]?.id ?? null;
  const topics = initialSubject
    ? await fetchTeacherTopics({ institute: selectedInstituteId, subject: initialSubject })
    : [];
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);

  return (
    <div className="studentPage studentPageTight createExamPage instituteConsolePage instituteExamBuilderPageVivid">
      <PlatformAdminPageHeader
        title="Advanced Exam Builder"
        description="Build platform-governed exams with explicit sections, topic quotas, delivery controls, and access rules from one platform-admin workflow."
        action={
          <div className="pageHeaderActionGroup">
            <Link className="button buttonGhost" href="/admin/exams/preset-packs">
              Preset Library
            </Link>
          </div>
        }
      />

      <section className="contentCard adminPeopleControlPanel">
        <div className="adminPeopleActionBar">
          <div className="adminPeopleActionBarCopy">
            <form action="/admin/exams/advanced" className="adminPeopleInstituteSelectField" method="get">
              <span>Template institute scope</span>
              <div className="adminPeopleInstituteSelectRow">
                <select aria-label="Select template institute" defaultValue={selectedInstitute?.id ?? ""} name="institute">
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
                    </option>
                  ))}
                </select>
                <button className="button buttonSecondary" type="submit">
                  Apply
                </button>
              </div>
            </form>
            <strong>{selectedInstitute ? `${selectedInstitute.name} template scope` : "No institute selected"}</strong>
            <span>
              {selectedInstitute
                ? `Reusable templates and created exam payloads will save under ${selectedInstitute.code}.`
                : "Choose an institute before saving templates or creating advanced exams."}
            </span>
          </div>
        </div>
      </section>

      <AdvancedExamBuilder
        academicYears={academicYears}
        assessmentRegistry={assessmentRegistry}
        assignmentModeOptions={optionCatalog.selectOptions("exam_assignment_mode")}
        audience="institute"
        defaultSource="platform"
        deliveryModeOptions={optionCatalog.selectOptions("exam_delivery_mode")}
        economyPolicyOptions={optionCatalog.selectOptions("exam_economy_access_policy")}
        examTypeOptions={optionCatalog.selectOptions("exam_type")}
        initialCohorts={cohorts}
        initialSubjects={subjects}
        initialTopics={topics}
        instituteCode={selectedInstitute?.code ?? ""}
        scopeInstituteId={selectedInstituteId}
        navigationModeOptions={optionCatalog.selectOptions("exam_navigation_mode")}
        programs={programs}
        resultPublishModeOptions={optionCatalog.selectOptions("exam_result_publish_mode")}
        reviewModeOptions={optionCatalog.selectOptions("exam_review_mode")}
        scopeLabel="platform scope"
        securityModeOptions={optionCatalog.selectOptions("exam_security_mode")}
        sourceOptions={[
          { value: "platform", label: "Platform" },
          { value: "institute", label: "Institute" },
        ]}
        statusOptions={statusOptions}
        successBasePath="/admin/exams"
        templateInstituteId={selectedInstituteId}
        timerModeOptions={optionCatalog.selectOptions("exam_timer_mode")}
        attemptPolicyOptions={optionCatalog.selectOptions("exam_attempt_policy")}
      />
    </div>
  );
}
