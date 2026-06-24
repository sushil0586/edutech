import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import { expectInstituteWorkspace, expectStudentWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type InstituteAdvancedScenario = {
  examType: "practice" | "quiz" | "mock_exam";
  expectedStartLabel: RegExp;
};

const scenarios: InstituteAdvancedScenario[] = [
  { examType: "practice", expectedStartLabel: /^start practice set$/i },
  { examType: "quiz", expectedStartLabel: /^start quiz$/i },
  { examType: "mock_exam", expectedStartLabel: /^start mock test$/i },
];

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

async function deleteInstituteExam(page: Page, examId: string) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

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

async function resolveStudentDisplayName(page: Page) {
  const studentCredentials = getRoleCredentials("student");
  expect(studentCredentials).not.toBeNull();

  let studentDisplayName = studentCredentials!.username;
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
      studentDisplayName = renderedName;
    }
  }

  return studentDisplayName;
}

async function openStage(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).first().click();
}

async function createInstituteAdvancedExam(
  page: Page,
  scenario: InstituteAdvancedScenario,
  uniqueSeed: number,
) {
  const examTitle = `PW Institute Advanced ${scenario.examType} ${uniqueSeed}`;
  const examCode = `PW-IA-${scenario.examType.slice(0, 2).toUpperCase()}-${uniqueSeed}`;

  await page.goto("/institute/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /quick practice/i }).click();
  await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

  await openStage(page, /\bbasics\b/i);
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByLabel(/exam type/i).selectOption(scenario.examType);

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
  await page.getByRole("button", { name: /create advanced exam/i }).click();

  await expect(page).toHaveURL(/\/institute\/exams\/.+\/builder\?message=/, { timeout: 60000 });
  await expect(page.getByText(/advanced exam created successfully\./i)).toBeVisible();

  const builderUrl = page.url();
  const examId = builderUrl.match(/\/institute\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    examCode,
  };
}

async function expectResolvedQuestionSet(page: Page, examId: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
  await expect(page.locator(".builderQuestionCard").first()).toBeVisible({ timeout: 30000 });
}

async function assignStudentToInstituteExam(page: Page, examId: string, studentDisplayName: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
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

  if (await matchingStudentRow.count()) {
    for (let index = 0; index < studentCount; index += 1) {
      await studentCheckboxes.nth(index).uncheck().catch(() => null);
    }
    await matchingStudentRow.locator('input[name="student_ids"]').check();
  } else {
    await studentCheckboxes.first().check();
  }

  await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
  await expect(page).toHaveURL(/tab=assignment&message=/);
  await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
}

async function scheduleAndPublishInstituteExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  await page.goto(`/institute/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("1");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

  await page.goto(`/institute/exams/${examId}`);
  await expect(page.getByRole("button", { name: /refresh status/i }).first()).toBeVisible();

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

async function expectInstituteVisibility(
  page: Page,
  examId: string,
  examTitle: string,
  examType: InstituteAdvancedScenario["examType"],
  studentDisplayName: string,
) {
  await page.goto("/institute/exams");
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

  const examCard = page.locator(".examCard").filter({
    has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")),
  }).first();
  await expect(examCard).toBeVisible();
  await expect(
    examCard
      .locator(".questionBankTagChip")
      .filter({ hasText: new RegExp(`^${escapeRegExp(examType.replaceAll("_", " "))}$`, "i") })
      .first(),
  ).toBeVisible();

  await page.goto(`/institute/exams/${examId}`);
  await expect(page.getByText(/assigned students/i).first()).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
}

async function expectStudentVisibility(
  page: Page,
  examId: string,
  examTitle: string,
  expectedStartLabel: RegExp,
) {
  await loginAsRole(page, "student");
  await expectStudentWorkspace(page);

  await page.goto(`/app/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: expectedStartLabel })).toBeVisible();
}

test.describe("Institute exam creation advanced builder matrix", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
      "institute advanced-builder exam creation matrix coverage",
    ),
  );

  for (const scenario of scenarios) {
    test(`@workflow @mutable institute can create, assign, and expose a ${scenario.examType} exam from advanced builder`, async ({
      page,
    }) => {
      test.setTimeout(240000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentDisplayName = await resolveStudentDisplayName(page);

      try {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);

        const created = await createInstituteAdvancedExam(page, scenario, uniqueSeed);
        examId = created.examId;

        await expectResolvedQuestionSet(page, examId);
        await assignStudentToInstituteExam(page, examId, studentDisplayName);
        await scheduleAndPublishInstituteExam(page, examId);
        await expectInstituteVisibility(
          page,
          examId,
          created.examTitle,
          scenario.examType,
          studentDisplayName,
        );
        await expectStudentVisibility(
          page,
          examId,
          created.examTitle,
          scenario.expectedStartLabel,
        );
      } finally {
        if (examId) {
          await loginAsRole(page, "institute");
          await expectInstituteWorkspace(page);
          await deleteInstituteExam(page, examId);
        }
      }
    });
  }
});
