import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { InstituteExamDefaultsEditor } from "@/components/admin/institute-exam-defaults-editor";
import {
  AcademicSetupWorkspace,
  type AcademicSetupTabId,
  type AcademicYearRecord,
  type CohortRecord,
  type ProgramRecord,
  type SubjectRecord,
  type TopicRecord,
} from "@/components/admin/academic-setup-workspace";
import { type TeacherAssignmentRecord, type TeacherRecord } from "@/components/admin/teacher-assignment-workspace";
import { fetchPortalCount, fetchPortalList, fetchPortalRecord } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";
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

function normalizeAcademicSection(section: string | undefined): AcademicPageSection {
  return academicSections.some((item) => item.id === section)
    ? (section as AcademicPageSection)
    : "academic-years";
}

export default async function InstituteAcademicSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const activeSection = normalizeAcademicSection(params.section);
  const profile = await requireInstituteAdminSession();
  const institute = profile.institute
    ? await fetchPortalRecord<InstituteRecord>(`/api/v1/institutes/${profile.institute}/`).catch(() => null)
    : null;

  const instituteQuery = profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100";

  const [
    academicYears,
    programs,
    cohorts,
    subjects,
    topics,
    teachers,
    assignments,
    optionCatalogEntries,
    studentCount,
    teacherCount,
  ] = await Promise.all([
    fetchPortalList<AcademicYearRecord>(`/api/v1/academics/academic-years/${instituteQuery}`),
    fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/${instituteQuery}`),
    fetchPortalList<CohortRecord>(`/api/v1/academics/cohorts/${instituteQuery}`),
    fetchPortalList<SubjectRecord>(`/api/v1/academics/subjects/${instituteQuery}`),
    fetchPortalList<TopicRecord>(`/api/v1/academics/topics/${instituteQuery}`),
    fetchPortalList<TeacherRecord>(`/api/v1/teachers/${profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100"}`),
    fetchPortalList<TeacherAssignmentRecord>(`/api/v1/teachers/assignments/${profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100"}`),
    fetchPortalList<OptionCatalogRecord>("/api/v1/academics/option-catalog/?page_size=200&is_active=true"),
    loadCount(profile.institute ? `/api/v1/students/?institute=${profile.institute}` : "/api/v1/students/"),
    loadCount(profile.institute ? `/api/v1/teachers/?institute=${profile.institute}` : "/api/v1/teachers/"),
  ]);

  const selectedInstituteDefaults = institute?.exam_defaults ?? {};
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
        eyebrow="Institute workspace"
        title="Academic setup"
        description=""
        contextLabel={institute ? `${institute.name} · ${institute.code}` : "Institute scope only"}
        className="pageHeaderCompact"
      />

      <section className="adminInstituteHero">
        <div className="adminInstituteHeroCopy">
          <span className="studentDashboardTag">Academic control</span>
          <strong>Shape the institute structure that powers rosters, exams, and assignment scope</strong>
          <p>
            Keep academic years, programs, cohorts, subjects, topics, assignments, and exam defaults aligned from one workspace.
          </p>
          <div className="adminInstituteHeroMeta">
            <span>{academicYears.length} academic years</span>
            <span>{programs.length} programs</span>
            <span>{subjects.length} subjects</span>
            <span>{topics.length} topics</span>
          </div>
          <div className="instituteConsoleActions adminInstituteHeroActions">
            <Link className="button buttonPrimary" href="/institute/academic-setup?section=academic-years">
              Open structure
            </Link>
            <Link className="button buttonSecondary" href="/institute/academic-setup?section=teacher-assignments">
              Teacher assignments
            </Link>
            <Link className="button buttonGhost" href="/institute/academic-setup?section=exam-defaults">
              Exam defaults
            </Link>
          </div>
        </div>

        <div className="adminInstituteHeroAside">
          <div className="adminInstituteHeroAsideStack">
            <article className="adminInstituteHeroAsideCard adminInstituteHeroAsideCardPrimary">
              <span>Active section</span>
              <strong>{activeSectionLabel}</strong>
              <small>
                {institute
                  ? `${institute.name} · ${sectionCounts[activeSection]} in view`
                  : `${sectionCounts[activeSection]} in view`}
              </small>
            </article>
            <article className="adminInstituteHeroAsideCard">
              <span>Institute scope</span>
              <strong>{institute?.code ?? "Unlinked"}</strong>
              <small>{institute?.is_active ? "Active institute record in scope." : "Institute record needs review."}</small>
            </article>
          </div>
          <div className="adminInstituteHeroMiniStats">
            <article className="adminInstituteHeroMiniStat">
              <span>Teachers</span>
              <strong>{teacherCount}</strong>
              <small>Faculty records available for assignment.</small>
            </article>
            <article className="adminInstituteHeroMiniStat">
              <span>Students</span>
              <strong>{studentCount}</strong>
              <small>Learners relying on this structure.</small>
            </article>
            <article className="adminInstituteHeroMiniStat">
              <span>Assignments</span>
              <strong>{assignments.length}</strong>
              <small>Teacher-subject scope mappings.</small>
            </article>
            <article className="adminInstituteHeroMiniStat">
              <span>Exam defaults</span>
              <strong>{Object.keys(selectedInstituteDefaults).length}</strong>
              <small>Policy fields currently populated.</small>
            </article>
          </div>
        </div>
      </section>

      <section className="contentCard adminPeopleControlPanel adminAcademicControlPanel">
        <div className="adminPeopleViewTabs">
          {academicSections.map((section) => (
            <Link
              key={section.id}
              className={`adminPeopleViewTab ${activeSection === section.id ? "adminPeopleViewTabActive" : ""}`}
              href={`/institute/academic-setup?section=${section.id}`}
            >
              {section.label}
            </Link>
          ))}
        </div>

        <div className="adminPeopleActionBar">
          <div className="adminPeopleActionBarCopy">
            <span>Institute-scoped academic control only</span>
            <strong>{activeSectionLabel}</strong>
            <span>
              {institute
                ? `${institute.name} · ${sectionCounts[activeSection]}`
                : sectionCounts[activeSection]}
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
          institute ? (
            <article className="dashboardPanel academicSectionPanel">
              <div className="studentPageTight">
                <InstituteExamDefaultsEditor
                  compact
                  instituteId={institute.id}
                  initialDefaults={{
                    duration_minutes:
                      typeof selectedInstituteDefaults.duration_minutes === "number"
                        ? selectedInstituteDefaults.duration_minutes
                        : null,
                    instructions: String(selectedInstituteDefaults.instructions ?? ""),
                    allow_late_submit: Boolean(selectedInstituteDefaults.allow_late_submit),
                    randomize_questions: Boolean(selectedInstituteDefaults.randomize_questions),
                    randomize_options: Boolean(selectedInstituteDefaults.randomize_options),
                    show_result_immediately: Boolean(selectedInstituteDefaults.show_result_immediately),
                    allow_review_after_submit: Boolean(selectedInstituteDefaults.allow_review_after_submit),
                    max_attempts:
                      typeof selectedInstituteDefaults.max_attempts === "number"
                        ? selectedInstituteDefaults.max_attempts
                        : 1,
                    timer_mode: String(selectedInstituteDefaults.timer_mode ?? optionCatalog.defaultCode("exam_timer_mode")),
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
                    allow_section_switching: Boolean(selectedInstituteDefaults.allow_section_switching ?? true),
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
                  <p>Institute scope is required before editing exam defaults.</p>
                </div>
              </div>
            </article>
          )
        ) : (
          <AcademicSetupWorkspace
            activeTab={activeSection as AcademicSetupTabId}
            academicYears={academicYears}
            academicsApiBasePath="/api/teacher/academics"
            assignments={assignments}
            cohorts={cohorts}
            instituteId={profile.institute ?? null}
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
