import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { InstituteExamDefaultsEditor } from "@/components/admin/institute-exam-defaults-editor";
import {
  AcademicSetupWorkspace,
  type AssessmentFamilyRecord,
  type AcademicSetupTabId,
  type AcademicYearRecord,
  type CohortRecord,
  type ProgramRecord,
  type SubjectRecord,
  type TopicRecord,
} from "@/components/admin/academic-setup-workspace";
import { type TeacherAssignmentRecord, type TeacherRecord } from "@/components/admin/teacher-assignment-workspace";
import { fetchPortalCount, fetchPortalList, fetchPortalRecord } from "@/lib/api/portal";
import { requirePlatformAdminSession } from "@/lib/auth/session";
import { groupTeacherOptionCatalog } from "@/lib/teacher/option-catalog";

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
  exam_defaults: Record<string, unknown>;
};

type OptionCatalogRecord = {
  id: string;
  namespace: string;
  code: string;
  label: string;
  description: string;
  sort_order: number;
  is_default: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const academicSections = [
  { id: "academic-years", label: "Academic years" },
  { id: "programs", label: "Programs" },
  { id: "cohorts", label: "Cohorts" },
  { id: "subjects", label: "Subjects" },
  { id: "topics", label: "Topics" },
  { id: "teacher-assignments", label: "Assignments" },
  { id: "exam-defaults", label: "Exam defaults" },
] as const;

type AcademicPageSection = (typeof academicSections)[number]["id"];

async function loadCount(path: string) {
  try {
    return await fetchPortalCount(path);
  } catch {
    return 0;
  }
}

function normalizeSelectedInstitute(
  requestedInstituteId: string | undefined,
  institutes: InstituteRecord[],
) {
  if (requestedInstituteId) {
    const match = institutes.find((item) => item.id === requestedInstituteId);
    if (match) {
      return match.id;
    }
  }

  return institutes.find((item) => item.is_active)?.id ?? institutes[0]?.id ?? null;
}

function normalizeAcademicSection(section: string | undefined): AcademicPageSection {
  return academicSections.some((item) => item.id === section)
    ? (section as AcademicPageSection)
    : "academic-years";
}

export default async function AdminAcademicSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ institute?: string; section?: string }>;
}) {
  await requirePlatformAdminSession();
  const params = (await searchParams) ?? {};
  const institutes = await fetchPortalList<InstituteRecord>("/api/v1/institutes/?page_size=50").catch(() => []);
  const selectedInstituteId = normalizeSelectedInstitute(params.institute, institutes);
  const activeSection = normalizeAcademicSection(params.section);
  const selectedInstitute = selectedInstituteId
    ? await fetchPortalRecord<InstituteRecord>(`/api/v1/institutes/${selectedInstituteId}/`).catch(() => null)
    : null;

  const instituteQuery = selectedInstituteId
    ? `?institute=${selectedInstituteId}&page_size=100`
    : "?page_size=100";

  const [
    academicYears,
    programs,
    cohorts,
    subjects,
    topics,
    teachers,
    assignments,
    optionCatalogEntries,
    assessmentFamilies,
    studentCount,
    teacherCount,
  ] = await Promise.all([
    fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`),
    fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`),
    fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`),
    fetchPortalList<SubjectRecord>(`/api/v1/academics/subjects/${instituteQuery}`),
    fetchPortalList<TopicRecord>(`/api/v1/academics/topics/${instituteQuery}`),
    fetchPortalList<TeacherRecord>(`/api/v1/teachers/${selectedInstituteId ? `?institute=${selectedInstituteId}&page_size=100` : "?page_size=100"}`),
    fetchPortalList<TeacherAssignmentRecord>(`/api/v1/teachers/assignments/${selectedInstituteId ? `?institute=${selectedInstituteId}&page_size=100` : "?page_size=100"}`),
    fetchPortalList<OptionCatalogRecord>("/api/v1/academics/option-catalog/?page_size=200&is_active=true"),
    fetchPortalList<AssessmentFamilyRecord>("/api/v1/academics/assessment-families/?page_size=50&is_active=true").catch(() => []),
    loadCount(selectedInstituteId ? `/api/v1/students/?institute=${selectedInstituteId}` : "/api/v1/students/"),
    loadCount(selectedInstituteId ? `/api/v1/teachers/?institute=${selectedInstituteId}` : "/api/v1/teachers/"),
  ]);

  const selectedInstituteDefaults = selectedInstitute?.exam_defaults ?? {};
  const optionCatalog = groupTeacherOptionCatalog(optionCatalogEntries);
  const optionGroups = {
    timerModeOptions: optionCatalog.selectOptions("exam_timer_mode"),
    navigationModeOptions: optionCatalog.selectOptions("exam_navigation_mode"),
    attemptPolicyOptions: optionCatalog.selectOptions("exam_attempt_policy"),
    resultPublishModeOptions: optionCatalog.selectOptions("exam_result_publish_mode"),
    reviewModeOptions: optionCatalog.selectOptions("exam_review_mode"),
    securityModeOptions: optionCatalog.selectOptions("exam_security_mode"),
  };

  const sectionCounts: Record<AcademicPageSection, number | string> = {
    "academic-years": academicYears.length,
    programs: programs.length,
    cohorts: cohorts.length,
    subjects: subjects.length,
    topics: topics.length,
    "teacher-assignments": assignments.length,
    "exam-defaults": "Policy",
  };

  const activeSectionLabel =
    academicSections.find((section) => section.id === activeSection)?.label ?? "Academic years";

  return (
    <section className="studentPage studentPageTight studentDashboardModern adminPeoplePage adminPeoplePageCompact adminAcademicPage instituteConsolePage">
      <PageHeader
        eyebrow="Platform admin workspace"
        title="Academic setup"
        description=""
      />

      <section className="contentCard adminPeopleControlPanel adminAcademicControlPanel">
        <div className="adminPeopleViewTabs">
          {academicSections.map((section) => (
            <Link
              key={section.id}
              className={`adminPeopleViewTab ${activeSection === section.id ? "adminPeopleViewTabActive" : ""}`}
              href={`/admin/academic-setup?institute=${selectedInstituteId ?? ""}&section=${section.id}`}
            >
              {section.label}
            </Link>
          ))}
        </div>

        <div className="adminPeopleActionBar">
          <div className="adminPeopleActionBarCopy">
            <form action="/admin/academic-setup" className="adminPeopleInstituteSelectField" method="get">
              <span>Institute</span>
              <input name="section" type="hidden" value={activeSection} />
              <div className="adminPeopleInstituteSelectRow">
                <select aria-label="Select institute" defaultValue={selectedInstituteId ?? ""} name="institute">
                  {institutes.map((institute) => (
                    <option key={institute.id} value={institute.id}>
                      {institute.name} ({institute.code})
                    </option>
                  ))}
                </select>
                <button className="button buttonSecondary" type="submit">
                  Open
                </button>
              </div>
            </form>
            <strong>{activeSectionLabel}</strong>
            <span>
              {selectedInstitute
                ? `${selectedInstitute.name} · ${sectionCounts[activeSection]}`
                : "Select an institute to begin."}
            </span>
          </div>
          <div className="adminAcademicScopeStats">
            <span className="setupFieldMeta">{studentCount} students</span>
            <span className="setupFieldMeta">{teacherCount} teachers</span>
          </div>
        </div>
      </section>

      <section className="adminPeopleSingleGrid adminAcademicSingleGrid">
        {activeSection === "exam-defaults" ? (
          selectedInstitute ? (
            <article className="dashboardPanel academicSectionPanel">
              <div className="studentPageTight">
                <InstituteExamDefaultsEditor
                  compact
                  instituteId={selectedInstitute.id}
                  assessmentFamilies={assessmentFamilies}
                  initialDefaults={{
                    duration_minutes:
                      typeof selectedInstituteDefaults.duration_minutes === "number"
                        ? selectedInstituteDefaults.duration_minutes
                        : null,
                    instructions: String(selectedInstituteDefaults.instructions ?? ""),
                    allow_late_submit: Boolean(selectedInstituteDefaults.allow_late_submit),
                    randomize_questions: Boolean(selectedInstituteDefaults.randomize_questions),
                    randomize_options: Boolean(selectedInstituteDefaults.randomize_options),
                    show_result_immediately: Boolean(
                      selectedInstituteDefaults.show_result_immediately,
                    ),
                    allow_review_after_submit: Boolean(
                      selectedInstituteDefaults.allow_review_after_submit,
                    ),
                    max_attempts:
                      typeof selectedInstituteDefaults.max_attempts === "number"
                        ? selectedInstituteDefaults.max_attempts
                        : 1,
                    timer_mode: String(
                      selectedInstituteDefaults.timer_mode ?? optionCatalog.defaultCode("exam_timer_mode"),
                    ),
                    navigation_mode: String(
                      selectedInstituteDefaults.navigation_mode ?? optionCatalog.defaultCode("exam_navigation_mode"),
                    ),
                    attempt_policy: String(
                      selectedInstituteDefaults.attempt_policy ?? optionCatalog.defaultCode("exam_attempt_policy"),
                    ),
                    result_publish_mode: String(
                      selectedInstituteDefaults.result_publish_mode ?? optionCatalog.defaultCode("exam_result_publish_mode"),
                    ),
                    review_mode: String(
                      selectedInstituteDefaults.review_mode ?? optionCatalog.defaultCode("exam_review_mode"),
                    ),
                    security_mode: String(
                      selectedInstituteDefaults.security_mode ?? optionCatalog.defaultCode("exam_security_mode"),
                    ),
                    allow_resume: Boolean(selectedInstituteDefaults.allow_resume ?? true),
                    allow_section_switching: Boolean(
                      selectedInstituteDefaults.allow_section_switching ?? true,
                    ),
                    allow_return_to_previous_section: Boolean(
                      selectedInstituteDefaults.allow_return_to_previous_section ?? true,
                    ),
                  }}
                  optionGroups={optionGroups}
                />
              </div>
            </article>
          ) : (
            <article className="dashboardPanel academicSectionPanel">
              <div className="studentPageTight">
                <div className="academicSectionHeader">
                  <strong>Exam defaults</strong>
                  <span className="setupFieldMeta">Policy</span>
                </div>
                <div className="featurePlaceholder">
                  <p>Select an institute to manage exam defaults.</p>
                </div>
              </div>
            </article>
          )
        ) : (
          <AcademicSetupWorkspace
            activeTab={activeSection as AcademicSetupTabId}
            academicYears={academicYears}
            assignments={assignments}
            assessmentFamilies={assessmentFamilies}
            cohorts={cohorts}
            instituteId={selectedInstitute?.id ?? null}
            programs={programs}
            subjects={subjects}
            teachers={teachers}
            topics={topics}
          />
        )}
      </section>
    </section>
  );
}
