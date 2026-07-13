import { expect, test, type Locator, type Page } from "@playwright/test";
import { type DirectLoginCredentials, loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";

const mutableInstituteResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type SessionProfile = {
  institute?: string | null;
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
    final_score: string;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function instituteResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

async function expectOneOf(primary: Locator, secondary: Locator) {
  const primaryVisible = await primary.isVisible().catch(() => false);
  if (primaryVisible) {
    await expect(primary).toBeVisible();
    return;
  }
  await expect(secondary).toBeVisible();
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const token = accessToken ?? (await getAccessToken(page));
  const response = await page.request.get(`${instituteApiBaseUrl}/api/v1/auth/me/`, {
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
) {
  const studentFirstName = `PWInst${uniqueSeed}`;
  const studentLastName = "Learner";
  const studentAdmissionNo = `PW-IML-${uniqueSeed}`;
  const username = `pw.institute.multi.student.${uniqueSeed}`;
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
      address: "Playwright institute multi-learner lane",
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

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await getAccessToken(page);

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

async function fetchInstituteLeaderboard(page: Page, examId: string) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.get(`${instituteApiBaseUrl}/api/v1/results/exam/${examId}/leaderboard/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as LeaderboardPayload;
}

test.describe("Institute mutable multi-learner results distribution", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute multi-learner leaderboard distribution coverage",
    ),
  );

  test("@workflow @mutable institute can publish ranked results for two learners and expose them on the leaderboard", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let primaryStudentDisplayName = studentCredentials!.username;
    let primaryStudentAdmissionNo = "";
    let secondStudentId: string | null = null;
    let secondStudentDisplayName = "";
    let secondStudentAdmissionNo = "";
    let secondStudentCredentials: DirectLoginCredentials | null = null;
    let examId: string | null = null;

    const uniqueSeed = Date.now();
    const examTitle = `PW Institute Multi Learner ${uniqueSeed}`;
    const examCode = `PW-IMLR-${uniqueSeed}`;
    const sectionName = `PW Institute Multi Learner Section ${uniqueSeed}`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
      const identityCard = page.locator(".detailCard").filter({
        has: page.getByText(/^name$/i),
      }).first();
      if (await identityCard.count()) {
        const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
        if (renderedName) {
          primaryStudentDisplayName = renderedName;
        }
      }

      const primaryStudentProfile = await fetchSessionProfile(page);
      const primaryStudentProfileId = primaryStudentProfile.student_profile?.trim() ?? "";
      expect(primaryStudentProfileId).not.toBe("");

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      const primaryStudentDetail = await fetchStudentDetail(page, primaryStudentProfileId);
      primaryStudentAdmissionNo = primaryStudentDetail.admission_no;

      const secondStudent = await createDisposableStudentWithLogin(page, primaryStudentDetail, uniqueSeed);
      secondStudentId = secondStudent.studentId;
      secondStudentDisplayName = secondStudent.displayName;
      secondStudentAdmissionNo = secondStudent.admissionNo;
      secondStudentCredentials = secondStudent.credentials;

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.locator('select[name="academic_year"]').selectOption(primaryStudentDetail.academic_year);
      await page.locator('select[name="program"]').selectOption(primaryStudentDetail.program);
      if (primaryStudentDetail.cohort) {
        await expect
          .poll(
            async () =>
              await page
                .locator(`select[name="cohort"] option[value="${primaryStudentDetail.cohort}"]`)
                .count(),
            { timeout: 15000 },
          )
          .toBeGreaterThan(0);
        await page.locator('select[name="cohort"]').selectOption(primaryStudentDetail.cohort);
      }
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
          }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();
      await sectionSelect.selectOption(sectionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);

      await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      await expect
        .poll(async () => await studentCheckboxes.count(), {
          timeout: 15000,
          message: "Expected institute assignment roster to hydrate with student checkboxes.",
        })
        .toBeGreaterThan(1);
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(1);
      for (let index = 0; index < studentCount; index += 1) {
        await studentCheckboxes.nth(index).uncheck().catch(() => null);
      }

      for (const learnerLabel of [primaryStudentDisplayName, secondStudentDisplayName]) {
        const learnerRow = assignmentForm.locator(".selectionRow").filter({
          has: page.getByText(new RegExp(escapeRegExp(learnerLabel), "i")),
        }).first();
        await expect(learnerRow).toBeVisible();
        await learnerRow.locator('input[name="student_ids"]').check();
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/tab=assignment&message=/);

      await page.goto(`/institute/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${examId}`);
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.count()) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }
      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright institute first answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expectOneOf(
        page.locator(".feedbackBannerSuccess").filter({
          hasText: /response updated successfully/i,
        }).first(),
        page.getByText(/1 saved/i).first(),
      );
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      expect(secondStudentCredentials).not.toBeNull();
      await loginWithCredentials(page, secondStudentCredentials!, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect(page).toHaveURL(/message=/);

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect(page).toHaveURL(/message=/);

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 generated/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/2 published/i);

      const leaderboard = await fetchInstituteLeaderboard(page, examId);
      expect(leaderboard.summary.total).toBe(2);
      expect(leaderboard.summary.ranked_count).toBe(2);
      expect(leaderboard.summary.published_count).toBe(2);
      expect(leaderboard.summary.all_ranked).toBe(true);
      expect(leaderboard.summary.published_results).toBe(true);
      expect(leaderboard.results).toHaveLength(2);
      expect(leaderboard.results[0]?.student_name).toBe(primaryStudentDisplayName);
      expect(leaderboard.results[0]?.student_admission_no).toBe(primaryStudentAdmissionNo);
      expect(leaderboard.results[0]?.rank).toBe(1);
      expect(leaderboard.results[0]?.percentage).toBe("100.00");
      expect(leaderboard.results[1]?.student_name).toBe(secondStudentDisplayName);
      expect(leaderboard.results[1]?.student_admission_no).toBe(secondStudentAdmissionNo);
      expect(leaderboard.results[1]?.rank).toBe(2);
      expect(leaderboard.results[1]?.percentage).toBe("0.00");

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(primaryStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(secondStudentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();
      await expect(page.getByText(/rank 2/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
      if (secondStudentId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteDisposableStudent(page, secondStudentId);
      }
    }
  });
});
