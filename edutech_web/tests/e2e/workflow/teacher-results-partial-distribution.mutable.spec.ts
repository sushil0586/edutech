import { expect, test, type Page } from "@playwright/test";
import { type DirectLoginCredentials, loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  backendAccessToken,
  clearExamEconomyAccessPolicy,
  createTeacherFamilyExamDirectly,
  deleteInstituteExamDirectly,
  escapeRegExp,
  familyRuntimeScenarios,
  markExamCompleted,
  publishExamResultsWorkflow,
  resolveStudentAttemptTarget,
  scheduleAndPublishExam,
  startExamAttemptAsStudent,
} from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace, expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
);

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const partialDistributionScenario =
  familyRuntimeScenarios.find((scenario) => scenario.presetId === "neet_mock") ??
  familyRuntimeScenarios[0]!;

type SessionProfile = {
  student_profile?: string | null;
};

type StudentDetail = {
  id: string;
  institute: string;
  academic_year: string;
  program: string;
  cohort: string | null;
  full_name: string;
  admission_no: string;
};

type LeaderboardPayload = {
  count: number;
  results: Array<{
    student_name: string;
    student_admission_no: string;
    rank: number | null;
    percentage: string;
    is_published: boolean;
  }>;
  summary: {
    total: number;
    ranked_count: number;
    published_count: number;
    all_ranked: boolean;
    published_results: boolean;
  };
};

function teacherResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const token = accessToken ?? (await backendAccessToken(page));
  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as SessionProfile;
}

async function fetchStudentDetail(page: Page, studentId: string) {
  const response = await page.request.get(`/api/admin/people/students/${studentId}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentDetail;
}

async function createDisposableStudentWithLogin(
  page: Page,
  seedStudentDetail: StudentDetail,
  uniqueSeed: number,
  labelPrefix: string,
) {
  const studentFirstName = `${labelPrefix}${uniqueSeed}`;
  const studentLastName = "Learner";
  const studentAdmissionNo = `PW-PD-${uniqueSeed}`;
  const username = `pw.partial.student.${uniqueSeed}`;
  const password = `StrongPass@${String(uniqueSeed).slice(-6)}`;

  const createResponse = await page.request.post("/api/admin/people/students", {
    data: {
      institute: seedStudentDetail.institute,
      academic_year: seedStudentDetail.academic_year,
      program: seedStudentDetail.program,
      cohort: seedStudentDetail.cohort,
      admission_no: studentAdmissionNo,
      first_name: studentFirstName,
      last_name: studentLastName,
      gender: "prefer_not_to_say",
      email: `${username}@example.test`,
      phone: `8${String(uniqueSeed).slice(-9)}`,
      guardian_name: "Playwright Guardian",
      guardian_phone: `7${String(uniqueSeed).slice(-9)}`,
      address: "Playwright partial distribution lane",
      is_active: true,
    },
  });
  expect(createResponse.ok()).toBe(true);
  const createPayload = (await createResponse.json()) as { id?: string };
  const studentId = createPayload.id ?? null;
  expect(studentId).not.toBeNull();

  const loginResponse = await page.request.post(`/api/admin/account-management/students/${studentId}/create-login`, {
    data: {
      username,
      password,
      confirm_password: password,
      auto_generate: false,
    },
  });
  expect(loginResponse.ok()).toBe(true);

  return {
    studentId: studentId!,
    displayName: `${studentFirstName} ${studentLastName}`,
    admissionNo: studentAdmissionNo,
    credentials: {
      username,
      password,
    } satisfies DirectLoginCredentials,
  };
}

async function deleteDisposableStudent(page: Page, studentId: string) {
  const response = await page.request.delete(`/api/admin/people/students/${studentId}`);
  expect(response.ok()).toBe(true);
}

async function assignStudentsToExam(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: studentIds,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function fetchTeacherLeaderboard(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/results/exam/${examId}/leaderboard/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as LeaderboardPayload;
}

test.describe("Teacher partial multi-learner results distribution", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student") || testRequiresRole("institute"),
    "Teacher, student, and institute Playwright credentials are required.",
  );

  test.skip(
    !mutableTeacherResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "partial multi-learner leaderboard distribution coverage",
    ),
  );

  test("@workflow @mutable teacher leaderboard omits the assigned learner who never submits", async ({
    page,
  }) => {
    test.setTimeout(300000);

    let primaryStudentAdmissionNo = "";
    let secondStudentId: string | null = null;
    let secondStudentDisplayName = "";
    let secondStudentAdmissionNo = "";
    let secondStudentCredentials: DirectLoginCredentials | null = null;
    let thirdStudentId: string | null = null;
    let thirdStudentDisplayName = "";
    let thirdStudentAdmissionNo = "";
    let examId: string | null = null;

    const uniqueSeed = Date.now();
    const studentTarget = await resolveStudentAttemptTarget(
      page,
      partialDistributionScenario.studentCredentials,
    );

    try {
      await loginWithCredentials(page, partialDistributionScenario.studentCredentials, "student");
      await expectStudentWorkspace(page);
      const primaryProfile = await fetchSessionProfile(page);
      const primaryStudentProfileId = primaryProfile.student_profile?.trim() ?? "";
      expect(primaryStudentProfileId).not.toBe("");

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      const primaryStudentDetail = await fetchStudentDetail(page, primaryStudentProfileId);
      primaryStudentAdmissionNo = primaryStudentDetail.admission_no;

      const secondStudent = await createDisposableStudentWithLogin(page, primaryStudentDetail, uniqueSeed, "PWPartial");
      secondStudentId = secondStudent.studentId;
      secondStudentDisplayName = secondStudent.displayName;
      secondStudentAdmissionNo = secondStudent.admissionNo;
      secondStudentCredentials = secondStudent.credentials;

      const thirdStudent = await createDisposableStudentWithLogin(page, primaryStudentDetail, uniqueSeed + 1, "PWAbsent");
      thirdStudentId = thirdStudent.studentId;
      thirdStudentDisplayName = thirdStudent.displayName;
      thirdStudentAdmissionNo = thirdStudent.admissionNo;

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const created = await createTeacherFamilyExamDirectly(page, partialDistributionScenario, uniqueSeed, {
        titlePrefix: "PW Partial Distribution",
        codePrefix: "PWPD",
      });
      examId = created.examId;

      await assignStudentsToExam(page, examId, [
        studentTarget.studentProfileId,
        secondStudentId!,
        thirdStudentId!,
      ]);
      await scheduleAndPublishExam(page, examId);
      await clearExamEconomyAccessPolicy(page, examId);

      await startExamAttemptAsStudent(
        page,
        examId,
        created.examTitle,
        partialDistributionScenario.familyLabel,
        partialDistributionScenario.studentCredentials,
      );
      await answerAndSubmitCurrentAttempt(
        page,
        uniqueSeed,
        "partial primary learner",
        created.examTitle,
      );

      expect(secondStudentCredentials).not.toBeNull();
      await startExamAttemptAsStudent(
        page,
        examId,
        created.examTitle,
        partialDistributionScenario.familyLabel,
        secondStudentCredentials!,
      );
      await answerAndSubmitCurrentAttempt(
        page,
        uniqueSeed + 1,
        "partial second learner",
        created.examTitle,
      );

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      await markExamCompleted(page, examId);
      await publishExamResultsWorkflow(page, examId);

      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 generated/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 published/i);

      const leaderboard = await fetchTeacherLeaderboard(page, examId);
      expect(leaderboard.summary.total).toBe(2);
      expect(leaderboard.summary.ranked_count).toBe(2);
      expect(leaderboard.summary.published_count).toBe(2);
      expect(leaderboard.summary.all_ranked).toBe(true);
      expect(leaderboard.summary.published_results).toBe(true);
      expect(leaderboard.results).toHaveLength(2);
      const leaderboardStudentNames = leaderboard.results.map((row) => row.student_name);
      const leaderboardAdmissionNos = leaderboard.results.map((row) => row.student_admission_no);
      expect(leaderboardStudentNames).toContain(studentTarget.displayName);
      expect(leaderboardStudentNames).toContain(secondStudentDisplayName);
      expect(leaderboardAdmissionNos).toContain(primaryStudentAdmissionNo);
      expect(leaderboardAdmissionNos).toContain(secondStudentAdmissionNo);
      expect(leaderboard.results.some((row) => row.student_name === thirdStudentDisplayName)).toBe(false);
      expect(leaderboard.results.some((row) => row.student_admission_no === thirdStudentAdmissionNo)).toBe(false);

      await page.goto(`/teacher/results/leaderboard?exam=${examId}`);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentTarget.displayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(secondStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(thirdStudentDisplayName), "i"))).toHaveCount(0);
      await expect(page.getByText(/rank 1|rank 2/i).first()).toBeVisible();

      await loginWithCredentials(page, secondStudentCredentials!, "student");
      await expectStudentWorkspace(page);
      await page.goto("/app/results");
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      await loginWithCredentials(page, {
        username: `pw.partial.student.${uniqueSeed + 1}`,
        password: `StrongPass@${String(uniqueSeed + 1).slice(-6)}`,
      }, "student");
      await expectStudentWorkspace(page);
      await page.goto("/app/results");
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(created.examTitle), "i"))).toHaveCount(0);
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        await deleteInstituteExamDirectly(page, examId);
      }
      if (thirdStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, thirdStudentId);
      }
      if (secondStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, secondStudentId);
      }
    }
  });
});
