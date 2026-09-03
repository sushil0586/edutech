import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { awsStudentCredentials, familyRuntimeScenarios } from "../helpers/family-runtime";
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

const deterministicAdvancedBuilderScenario =
  familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner") ??
  familyRuntimeScenarios[0]!;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toUtcDateTimeLocalValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function waitForPrimarySubjectTopics(page: Page) {
  const firstTopicSelect = page.locator(".advancedBuilderTopicRow").first().locator("select");
  await expect
    .poll(async () => firstTopicSelect.locator("option").count(), {
      timeout: 30000,
      message: "Expected the advanced builder topic selector to load real topic options.",
    })
    .toBeGreaterThan(1);
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

async function fetchAdminExamStatus(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { status?: string };
  return payload.status ?? "";
}

type StudentAttemptTarget = {
  displayName: string;
};

type PublishedDeliveryStatus = "scheduled" | "live";

async function resolveStudentAttemptTarget(page: Page): Promise<StudentAttemptTarget> {
  await loginWithCredentials(page, awsStudentCredentials, "student");
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
  };

  const displayName = payload.display_name?.trim() ?? "";
  expect(displayName).not.toBe("");

  return {
    displayName,
  };
}

async function openStage(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).first().click();
}

async function createAdminAdvancedMockExam(
  page: Page,
  uniqueSeed: number,
) {
  const examTitle = `PW Admin Advanced Attempt ${uniqueSeed}`;
  const examCode = `PW-AA-AT-${uniqueSeed}`;

  await page.goto("/admin/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  const instituteSelect = page.getByLabel(/select template institute/i);
  await instituteSelect.selectOption("Demo Learning Institute (DLI001)");
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Demo Learning Institute template scope/i)).toBeVisible();

  const instituteId = await instituteSelect.inputValue();
  expect(instituteId).not.toBe("");
  await expect(page.getByText(/not found in the selected institute/i)).toHaveCount(0);

  const academicYearSelect = page
    .locator(".advancedBuilderField")
    .filter({ has: page.getByText(/^Academic year$/i) })
    .locator("select");
  const programSelect = page
    .locator(".advancedBuilderField")
    .filter({ has: page.getByText(/^Program$/i) })
    .locator("select");
  const subjectSelect = page
    .locator(".advancedBuilderField")
    .filter({ has: page.getByText(/^Primary subject$/i) })
    .locator("select");

  const hasCanonicalFamilyAcademicYear = await academicYearSelect.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).some((option) => option.label.trim() === "2026-2027");
  });
  if (hasCanonicalFamilyAcademicYear) {
    await academicYearSelect.selectOption({ label: "2026-2027" });
    await expect(academicYearSelect).toHaveValue(/\S+/);
  }
  await programSelect.selectOption({ label: deterministicAdvancedBuilderScenario.programLabel });
  await expect(programSelect).toHaveValue(/\S+/);
  await subjectSelect.selectOption({ label: deterministicAdvancedBuilderScenario.subjectLabel });
  await expect(subjectSelect).toHaveValue(/\S+/);
  await waitForPrimarySubjectTopics(page);

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
  await expect(page.getByText(/preview ready\./i)).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/run preview when you are ready/i)).toHaveCount(0);
  await expect(page.getByText(/preview resolution/i).first()).toBeVisible();

  await page.getByRole("button", { name: /create advanced exam/i }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/, { timeout: 60000 });
  await expect(page.getByText(/advanced exam created (with \d+ active questions|successfully)\./i)).toBeVisible();

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

async function scheduleAndPublishAdminExam(
  page: Page,
  examId: string,
): Promise<PublishedDeliveryStatus> {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  await page.goto(`/admin/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toUtcDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toUtcDateTimeLocalValue(endAt));
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

  await page.goto(`/admin/exams/${examId}`);
  const markLiveButton = page.getByRole("button", { name: /mark live/i });
  if (await markLiveButton.count()) {
    await markLiveButton.click();
    await expect(page).toHaveURL(/message=/);
  }

  const finalStatus = await fetchAdminExamStatus(page, examId);
  expect(["scheduled", "live"]).toContain(finalStatus);
  return finalStatus as PublishedDeliveryStatus;
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

async function expectAdminDeliveryAfterPublish(
  page: Page,
  examId: string,
  examTitle: string,
  expectedStatus: PublishedDeliveryStatus,
) {
  await page.goto(`/admin/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect.poll(async () => fetchAdminExamStatus(page, examId)).toBe(expectedStatus);
  await expect(adminExamReadinessPanel(page)).toContainText(/exam publish readiness/i);
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
  await expect(adminResultReadinessPanel(page)).toContainText(/\d+\s+generated/i);
}

async function attemptExamAsStudent(page: Page, examId: string, examTitle: string, uniqueSeed: number) {
  await loginWithCredentials(page, awsStudentCredentials, "student");
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
  await Promise.all([
    page.waitForURL(/notice=.*confirmedAt=/),
    page.getByRole("button", { name: /^save (&|and) review$/i }).click(),
  ]);
  await expect(page.getByText(/last confirmed action/i).first()).toBeVisible();
  await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
  await expect(page.getByText(/1 saved/i).first()).toBeVisible();
  await expect(page.getByText(/last confirmed backend response/i).first()).toBeVisible();
  await expect(page.getByText(/nothing confirmed yet/i)).toHaveCount(0);

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^(submit test|end test)$/i }).click();

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

      const created = await createAdminAdvancedMockExam(page, uniqueSeed);
      examId = created.examId;

      await expectAdminReadinessBeforePublish(page, examId, created.examTitle);
      await assignStudentToAdminExam(page, examId, studentTarget.displayName);
      const publishedStatus = await scheduleAndPublishAdminExam(page, examId);
      await expectAdminDeliveryAfterPublish(page, examId, created.examTitle, publishedStatus);
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
