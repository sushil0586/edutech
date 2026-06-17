import {
  fetchParentAlerts,
  fetchParentChildren,
} from "@/lib/api/parent";
import { fetchPortalList } from "@/lib/api/portal";
import {
  fetchStudentAttempts,
  fetchStudentAvailableExams,
  fetchStudentNotifications,
  fetchStudentResults,
} from "@/lib/api/student";
import { fetchTeacherQuestionPage } from "@/lib/api/teacher-builder";
import {
  fetchTeacherExams,
  fetchTeacherResultSummary,
} from "@/lib/api/teacher";
import type { WorkspaceSearchEntry, WorkspaceRole } from "@/lib/workspace/search-index";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesQuery(query: string, values: Array<string | null | undefined>) {
  const normalized = normalize(query);
  if (!normalized) {
    return false;
  }

  return values.some((value) => value?.toLowerCase().includes(normalized));
}

function dedupeEntries(entries: WorkspaceSearchEntry[]) {
  return Array.from(new Map(entries.map((entry) => [entry.href, entry])).values());
}

function compactKeywords(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

async function loadStudentLiveEntries(query: string): Promise<WorkspaceSearchEntry[]> {
  const [examsResult, resultsResult, attemptsResult, notificationsResult] =
    await Promise.allSettled([
      fetchStudentAvailableExams(),
      fetchStudentResults(),
      fetchStudentAttempts(),
      fetchStudentNotifications(),
    ]);

  const entries: WorkspaceSearchEntry[] = [];

  if (examsResult.status === "fulfilled") {
    entries.push(
      ...examsResult.value
        .filter((exam) =>
          matchesQuery(query, [
            exam.title,
            exam.code,
            exam.subject_name,
            exam.source_name,
            exam.source_teacher_name,
          ]),
        )
        .slice(0, 5)
        .map((exam) => ({
          href: `/app/exams/${exam.id}`,
          title: exam.title,
          description: `${exam.code} · ${exam.subject_name || "General"} · ${exam.status}`,
          keywords: compactKeywords([exam.code, exam.subject_name, exam.source_name]),
          section: "Live exams",
        })),
    );
  }

  if (resultsResult.status === "fulfilled") {
    entries.push(
      ...resultsResult.value
        .filter((result) =>
          matchesQuery(query, [
            result.exam_title,
            result.exam_code,
            result.source_name,
            result.source_teacher_name,
          ]),
        )
        .slice(0, 5)
        .map((result) => ({
          href: `/app/results`,
          title: result.exam_title,
          description: `${result.exam_code} · ${result.percentage}% · ${result.result_status}`,
          keywords: compactKeywords([result.exam_code, result.source_name, result.source_teacher_name]),
          section: "Live results",
        })),
    );
  }

  if (attemptsResult.status === "fulfilled") {
    entries.push(
      ...attemptsResult.value
        .filter((attempt) =>
          matchesQuery(query, [
            attempt.exam_title,
            attempt.exam_code,
            attempt.source_name,
            attempt.source_teacher_name,
          ]),
        )
        .slice(0, 5)
        .map((attempt) => ({
          href: `/app/attempts/${attempt.id}${attempt.status === "submitted" || attempt.status === "auto_submitted" ? "/summary" : ""}`,
          title: attempt.exam_title,
          description: `${attempt.exam_code} · attempt ${attempt.attempt_no} · ${attempt.status}`,
          keywords: compactKeywords([attempt.exam_code, attempt.source_name, attempt.source_teacher_name]),
          section: "Live attempts",
        })),
    );
  }

  if (notificationsResult.status === "fulfilled") {
    entries.push(
      ...notificationsResult.value.results
        .filter((notification) =>
          matchesQuery(query, [
            notification.title,
            notification.message,
            notification.notification_type,
          ]),
        )
        .slice(0, 4)
        .map((notification) => ({
          href: "/app/notifications",
          title: notification.title,
          description: notification.message,
          keywords: compactKeywords([notification.notification_type, notification.related_object_type]),
          section: "Live alerts",
        })),
    );
  }

  return dedupeEntries(entries);
}

async function loadTeacherLiveEntries(baseHref: "/teacher" | "/institute", query: string): Promise<WorkspaceSearchEntry[]> {
  const [examsResult, resultsResult, questionsResult] = await Promise.allSettled([
    fetchTeacherExams(),
    fetchTeacherResultSummary(),
    fetchTeacherQuestionPage({ search: query, page_size: 8 }),
  ]);

  const entries: WorkspaceSearchEntry[] = [];

  if (examsResult.status === "fulfilled") {
    entries.push(
      ...examsResult.value
        .filter((exam) =>
          matchesQuery(query, [exam.title, exam.code, exam.subject_name, exam.cohort_name]),
        )
        .slice(0, 6)
        .map((exam) => ({
          href: `${baseHref}/exams/${exam.id}`,
          title: exam.title,
          description: `${exam.code} · ${exam.subject_name || "General"} · ${exam.status}`,
          keywords: compactKeywords([exam.code, exam.subject_name, exam.cohort_name]),
          section: "Live exams",
        })),
    );
  }

  if (resultsResult.status === "fulfilled") {
    entries.push(
      ...resultsResult.value
        .filter((result) =>
          matchesQuery(query, [result.exam_title, result.exam_code]),
        )
        .slice(0, 6)
        .map((result) => ({
          href: `${baseHref}/results?exam=${encodeURIComponent(result.exam)}`,
          title: result.exam_title,
          description: `${result.exam_code} · ${result.average_percentage}% average · ${result.total_attempted} attempts`,
          keywords: compactKeywords([result.exam_code]),
          section: "Live results",
        })),
    );
  }

  if (questionsResult.status === "fulfilled") {
    entries.push(
      ...questionsResult.value.results.slice(0, 8).map((question) => ({
        href: `${baseHref}/question-bank/${question.id}`,
        title: question.question_text.slice(0, 84),
        description: `${question.question_type.replaceAll("_", " ")} · ${question.difficulty_level.replaceAll("_", " ")} · used ${question.usage_count} times`,
        keywords: compactKeywords([question.question_type, question.difficulty_level]),
        section: "Question bank",
      })),
    );
  }

  return dedupeEntries(entries);
}

type PortalExamLike = {
  id: string;
  title: string;
  code: string;
  subject_name?: string | null;
  status?: string;
};

type PortalInstituteLike = {
  id: string;
  name: string;
  code: string;
  city?: string;
  state?: string;
  email?: string;
};

type PortalPersonLike = {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  admission_no?: string;
  employee_code?: string;
  email?: string;
  phone?: string;
};

async function loadAdminLiveEntries(query: string): Promise<WorkspaceSearchEntry[]> {
  const [institutesResult, examsResult, studentsResult, teachersResult] =
    await Promise.allSettled([
      fetchPortalList<PortalInstituteLike>("/api/v1/institutes/?page_size=50"),
      fetchPortalList<PortalExamLike>("/api/v1/exams/?page_size=50"),
      fetchPortalList<PortalPersonLike>("/api/v1/students/?page_size=50"),
      fetchPortalList<PortalPersonLike>("/api/v1/teachers/?page_size=50"),
    ]);

  const entries: WorkspaceSearchEntry[] = [];

  if (institutesResult.status === "fulfilled") {
    entries.push(
      ...institutesResult.value
        .filter((institute) =>
          matchesQuery(query, [institute.name, institute.code, institute.city, institute.state, institute.email]),
        )
        .slice(0, 6)
        .map((institute) => ({
          href: `/admin/institutes?institute=${encodeURIComponent(institute.id)}`,
          title: institute.name,
          description: `${institute.code} · ${institute.city || "No city"}${institute.state ? `, ${institute.state}` : ""}`,
          keywords: compactKeywords([institute.code, institute.city, institute.state]),
          section: "Institutes",
        })),
    );
  }

  if (examsResult.status === "fulfilled") {
    entries.push(
      ...examsResult.value
        .filter((exam) => matchesQuery(query, [exam.title, exam.code, exam.subject_name]))
        .slice(0, 6)
        .map((exam) => ({
          href: `/admin/exams/${exam.id}`,
          title: exam.title,
          description: `${exam.code} · ${exam.subject_name || "General"} · ${exam.status || "unknown status"}`,
          keywords: compactKeywords([exam.code, exam.subject_name]),
          section: "Exams",
        })),
    );
  }

  if (studentsResult.status === "fulfilled") {
    entries.push(
      ...studentsResult.value
        .filter((student) =>
          matchesQuery(query, [student.full_name, student.first_name, student.last_name, student.admission_no, student.email]),
        )
        .slice(0, 4)
        .map((student) => ({
          href: "/admin/people?view=students",
          title: student.full_name || [student.first_name, student.last_name].filter(Boolean).join(" "),
          description: `${student.admission_no || "Student"} · ${student.email || "No email"}`,
          keywords: compactKeywords([student.admission_no, student.email]),
          section: "Students",
        })),
    );
  }

  if (teachersResult.status === "fulfilled") {
    entries.push(
      ...teachersResult.value
        .filter((teacher) =>
          matchesQuery(query, [teacher.full_name, teacher.first_name, teacher.last_name, teacher.employee_code, teacher.email]),
        )
        .slice(0, 4)
        .map((teacher) => ({
          href: "/admin/people?view=teachers",
          title: teacher.full_name || [teacher.first_name, teacher.last_name].filter(Boolean).join(" "),
          description: `${teacher.employee_code || "Teacher"} · ${teacher.email || "No email"}`,
          keywords: compactKeywords([teacher.employee_code, teacher.email]),
          section: "Teachers",
        })),
    );
  }

  return dedupeEntries(entries);
}

async function loadParentLiveEntries(query: string): Promise<WorkspaceSearchEntry[]> {
  const [childrenResult, alertsResult] = await Promise.allSettled([
    fetchParentChildren(),
    fetchParentAlerts(),
  ]);

  const entries: WorkspaceSearchEntry[] = [];

  if (childrenResult.status === "fulfilled") {
    entries.push(
      ...childrenResult.value
        .filter((child) =>
          matchesQuery(query, [child.student_name, child.admission_no, child.program_name, child.cohort_name]),
        )
        .slice(0, 5)
        .map((child) => ({
          href: "/parent/children",
          title: child.student_name,
          description: `${child.admission_no} · ${child.program_name} · ${child.cohort_name}`,
          keywords: compactKeywords([child.admission_no, child.program_name, child.cohort_name]),
          section: "Children",
        })),
    );
  }

  if (alertsResult.status === "fulfilled") {
    entries.push(
      ...alertsResult.value.results
        .filter((alert) =>
          matchesQuery(query, [alert.title, alert.message, alert.student_name, alert.alert_type]),
        )
        .slice(0, 5)
        .map((alert) => ({
          href: "/parent/alerts",
          title: alert.title,
          description: `${alert.student_name} · ${alert.message}`,
          keywords: compactKeywords([alert.student_name, alert.alert_type, alert.severity]),
          section: "Alerts",
        })),
    );
  }

  return dedupeEntries(entries);
}

export async function loadWorkspaceLiveSearchEntries(role: WorkspaceRole, query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  switch (role) {
    case "student":
      return loadStudentLiveEntries(trimmed);
    case "teacher":
      return loadTeacherLiveEntries("/teacher", trimmed);
    case "institute":
      return loadTeacherLiveEntries("/institute", trimmed);
    case "admin":
      return loadAdminLiveEntries(trimmed);
    case "parent":
      return loadParentLiveEntries(trimmed);
    default:
      return [];
  }
}
