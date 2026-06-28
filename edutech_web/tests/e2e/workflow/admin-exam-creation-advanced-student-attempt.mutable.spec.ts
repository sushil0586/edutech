import { expect, test, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableAdminStudentAttemptEnabled =
  isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS");
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

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

function adminExamReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^exam publish readiness$/i),
  }).first();
}

function adminResultReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^result publish readiness$/i),
  }).first();
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteAdminExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

type StudentAttemptTarget = {
  displayName: string;
  instituteName: string;
};

async function resolveStudentAttemptTarget(page: Page): Promise<StudentAttemptTarget> {
  await loginAsRole(page, "student");
  await expectStudentWorkspace(page);

  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    display_name?: string;
    institute_name?: string;
  };

  const displayName = payload.display_name?.trim() ?? "";
  const instituteName = payload.institute_name?.trim() ?? "";
  expect(displayName).not.toBe("");
  expect(instituteName).not.toBe("");

  return {
    displayName,
    instituteName,
  };
}

async function openStage(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).first().click();
}

async function createAdminAdvancedMockExam(
  page: Page,
  uniqueSeed: number,
  studentTarget: StudentAttemptTarget,
) {
  const examTitle = `PW Admin Advanced Attempt ${uniqueSeed}`;
  const examCode = `PW-AA-AT-${uniqueSeed}`;

  await page.goto("/admin/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  const instituteSelect = page.getByLabel(/select template institute/i);
  const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      label: (option as HTMLOptionElement).label.trim(),
      value: (option as HTMLOptionElement).value.trim(),
    })),
  );
  const matchedInstituteOption =
    instituteOptions.find((option) =>
      option.label.toLowerCase().startsWith(studentTarget.instituteName.toLowerCase()),
    ) ??
    instituteOptions.find((option) =>
      option.label.toLowerCase().includes(studentTarget.instituteName.toLowerCase()),
    ) ??
    null;
  expect(matchedInstituteOption).not.toBeNull();

  await instituteSelect.selectOption(matchedInstituteOption!.value);
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page).toHaveURL(new RegExp(`institute=${matchedInstituteOption!.value}`));

  const instituteId = await instituteSelect.inputValue();
  expect(instituteId).not.toBe("");
  await expect(page.getByText(/not found in the selected institute/i)).toHaveCount(0);

  const accessToken = await backendAccessToken(page);
  const comboboxes = page.getByRole("combobox");
  const academicYearSelect = comboboxes.nth(2);
  const programSelect = comboboxes.nth(3);
  const cohortSelect = comboboxes.nth(4);
  const academicYearOptions = await academicYearSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value.trim())
      .filter((value) => value.length > 0),
  );
  const programOptions = await programSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value.trim())
      .filter((value) => value.length > 0),
  );

  let matchedAcademicYearValue: string | null = null;
  let matchedProgramValue: string | null = null;
  let matchedCohortValue: string | null = null;

  for (const academicYearValue of academicYearOptions) {
    for (const programValue of programOptions) {
      const rosterResponse = await page.request.get(`${adminApiBaseUrl}/api/v1/students/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params: {
          academic_year: academicYearValue,
          is_active: "true",
          page_size: "200",
          program: programValue,
        },
        timeout: 15000,
      });
      expect(rosterResponse.ok()).toBe(true);

      const rosterPayload = (await rosterResponse.json()) as {
        results?: Array<{
          cohort?: string | null;
          full_name?: string | null;
        }>;
      };
      const matchedStudent = rosterPayload.results?.find((student) =>
        new RegExp(`^${escapeRegExp(studentTarget.displayName)}$`, "i").test(
          student.full_name?.trim() ?? "",
        ),
      );

      if (matchedStudent) {
        matchedAcademicYearValue = academicYearValue;
        matchedProgramValue = programValue;
        matchedCohortValue = matchedStudent.cohort?.trim() || null;
        break;
      }
    }

    if (matchedProgramValue) {
      break;
    }
  }

  expect(matchedAcademicYearValue).not.toBeNull();
  expect(matchedProgramValue).not.toBeNull();

  await academicYearSelect.selectOption(matchedAcademicYearValue!);
  await programSelect.selectOption(matchedProgramValue!);

  if (matchedCohortValue) {
    await expect
      .poll(async () => await cohortSelect.locator(`option[value="${matchedCohortValue}"]`).count())
      .toBeGreaterThan(0);
    await cohortSelect.selectOption(matchedCohortValue);
  }

  await page.getByRole("button", { name: /quick practice/i }).click();
  await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

  await openStage(page, /\bbasics\b/i);
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByLabel(/exam type/i).selectOption("mock_exam");
  await expect(page.getByRole("combobox", { name: /^source$/i }).first()).toHaveValue("platform");

  await openStage(page, /\bcomposition\b/i);
  await page.getByLabel(/selection mode/i).selectOption("subject_fallback");

  const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
  await firstSectionCard.getByLabel(/question count/i).fill("1");

  const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
  for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
    await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
  }

  const firstTopicRow = firstSectionCard.locator(".advancedBuilderTopicRow").first();
  await firstTopicRow.locator('input[type="number"]').fill("1");

  await page.getByRole("button", { name: /preview exam/i }).click();
  await expect(page.getByText(/preview refreshed\./i)).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/run preview when you are ready/i)).toHaveCount(0);
  await expect(page.getByText(/preview resolution/i).first()).toBeVisible();

  await page.getByRole("button", { name: /create advanced exam/i }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/, { timeout: 60000 });
  await expect(page.getByText(/advanced exam created successfully\./i)).toBeVisible();

  const examId = page.url().match(/\/admin\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    instituteId,
  };
}

async function assignStudentToAdminExam(page: Page, examId: string, studentDisplayName: string) {
  await page.goto(`/admin/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  const assignmentForm = page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  const studentCount = await studentCheckboxes.count();
  expect(studentCount).toBeGreaterThan(0);

  const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
    has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
  }).first();

  expect(await matchingStudentRow.count()).toBeGreaterThan(0);
  for (let index = 0; index < studentCount; index += 1) {
    await studentCheckboxes.nth(index).uncheck().catch(() => null);
  }
  await matchingStudentRow.locator('input[name="student_ids"]').check();

  await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
  await expect(page).toHaveURL(/tab=assignment&message=/);
  await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
}

async function scheduleAndPublishAdminExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  await page.goto(`/admin/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("1");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

  await page.goto(`/admin/exams/${examId}`);
  await expect(page.getByRole("heading", { name: /pw admin advanced attempt/i }).first()).toBeVisible();

  const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
  if (await syncMarksButton.count()) {
    await syncMarksButton.click();
    await expect(page).toHaveURL(/message=/);
    await expect(page.getByText(/marks/i).first()).toBeVisible();
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
}

async function expectAdminReadinessBeforePublish(page: Page, examId: string, examTitle: string) {
  await page.goto(`/admin/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(adminExamReadinessPanel(page)).toContainText(/blocked/i);
  await expect(adminExamReadinessPanel(page)).toContainText(/blocker/i);
  await expect(adminResultReadinessPanel(page)).toContainText(/review first|blocked/i);
}

async function expectAdminReadinessAfterLive(page: Page, examId: string, examTitle: string) {
  await page.goto(`/admin/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(adminExamReadinessPanel(page)).toContainText(/ready/i);
}

async function expectAdminReadinessAfterSubmission(page: Page, examId: string, examTitle: string) {
  await loginAsRole(page, "admin");
  await expectAdminWorkspace(page);
  await page.goto(`/admin/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();

  const markCompletedButton = page.getByRole("button", { name: /mark completed/i });
  if (await markCompletedButton.count()) {
    await markCompletedButton.click();
    await expect(page).toHaveURL(/message=/);
  }

  await expect(adminExamReadinessPanel(page)).toContainText(/blocked/i);
  await expect(adminExamReadinessPanel(page)).toContainText(/invalid status/i);
  await expect(adminResultReadinessPanel(page)).toContainText(/review first|blocked/i);
  await expect(adminResultReadinessPanel(page)).toContainText(/0 generated/i);
}

async function attemptExamAsStudent(page: Page, examId: string, examTitle: string, uniqueSeed: number) {
  await loginAsRole(page, "student");
  await expectStudentWorkspace(page);

  await page.goto(`/app/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();

  const startButton = page.getByRole("button", { name: /^(start|start mock test)$/i });
  await expect(startButton).toBeVisible();
  await startButton.click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();

  await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright admin advanced answer");

  await page.getByRole("checkbox", { name: /mark for review/i }).check();
  await page.getByRole("button", { name: /save (&|and) review|save (&|and) next/i }).click();
  await expect(
    page
      .locator(".feedbackBannerSuccess")
      .filter({
        hasText:
          /response updated successfully|answer saved\. moving to the next question|answer saved\. you have reached the final question/i,
      })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/1 saved/i).first()).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
  await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
  await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();
  await expect(page.getByText(/attempt status/i)).toBeVisible();
}

test.describe("Admin advanced-builder student attempt", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("student"),
    "Admin and student Playwright credentials are required.",
  );

  test.skip(
    !mutableAdminStudentAttemptEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "admin advanced-builder student attempt coverage",
    ),
  );

  test("@workflow @mutable student can start save and submit an admin advanced-builder platform mock exam", async ({
    page,
  }) => {
    test.setTimeout(240000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const studentTarget = await resolveStudentAttemptTarget(page);

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const created = await createAdminAdvancedMockExam(page, uniqueSeed, studentTarget);
      examId = created.examId;

      await expectAdminReadinessBeforePublish(page, examId, created.examTitle);
      await assignStudentToAdminExam(page, examId, studentTarget.displayName);
      await scheduleAndPublishAdminExam(page, examId);
      await expectAdminReadinessAfterLive(page, examId, created.examTitle);
      await attemptExamAsStudent(page, examId, created.examTitle, uniqueSeed);
      await expectAdminReadinessAfterSubmission(page, examId, created.examTitle);
    } finally {
      if (examId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteAdminExamDirectly(page, examId);
      }
    }
  });
});
