import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";

const mutableInstituteResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
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

function instituteExamReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^exam publish readiness$/i),
  }).first();
}

function instituteResultReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^result publish readiness$/i),
  }).first();
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

test.describe("Institute mutable results actions", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "disposable institute results publication coverage",
    ),
  );

  test("@workflow @mutable institute can publish leaderboard-ready results for a disposable exam", async ({
    page,
  }) => {
    test.setTimeout(240000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const examTitle = `PW Institute Results ${uniqueSeed}`;
    const examCode = `PW-IR-${uniqueSeed}`;
    const sectionName = `PW Institute Results Section ${uniqueSeed}`;
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
          studentDisplayName = renderedName;
        }
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await expect(instituteExamReadinessPanel(page)).toContainText(/blocked/i);
      await expect(instituteExamReadinessPanel(page)).toContainText(/blocker/i);
      await expect(instituteResultReadinessPanel(page)).toContainText(/review first|blocked/i);

      await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
      await expect(page.getByText(/add a new section/i).first()).toBeVisible();
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i).first()).toBeVisible();

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

      await expect(instituteExamReadinessPanel(page)).toContainText(/ready/i);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page
        .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
        .click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright institute result answer");
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

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^exam publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^exam publish readiness$/i),
      ).toContainText(/invalid status/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/0 generated/i);

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
      } else {
        await expect(page.getByText(/all result workflow steps are complete/i).first()).toBeVisible();
      }

      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/ready/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 published/i);

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
    }
  });
});
