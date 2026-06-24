import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import { expectInstituteWorkspace, expectStudentWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type InstituteWizardScenario = {
  examType: "practice" | "quiz" | "mock_exam";
  expectedStartLabel: RegExp;
};

const scenarios: InstituteWizardScenario[] = [
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

async function createInstituteWizardExam(
  page: Page,
  scenario: InstituteWizardScenario,
  uniqueSeed: number,
) {
  const examTitle = `PW Institute ${scenario.examType} ${uniqueSeed}`;
  const examCode = `PW-IW-${scenario.examType.slice(0, 2).toUpperCase()}-${uniqueSeed}`;

  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('select[name="exam_type"]').selectOption(scenario.examType);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /create exam shell/i }).click();

  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(page.getByText(examCode, { exact: true })).toBeVisible();

  const detailUrl = page.url().split("?")[0] ?? page.url();
  const examId = detailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    examCode,
  };
}

async function addOneSectionAndQuestion(page: Page, examId: string, sectionName: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
  await expect(page.getByText(/add a new section/i).first()).toBeVisible();
  await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
  await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
  await page.getByRole("button", { name: /^add section$/i }).click();
  await expect(page).toHaveURL(/tab=sections&message=/);
  await expect(page.getByText(/section added/i)).toBeVisible();

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
  await expect(page.getByText(/question linked to exam/i)).toBeVisible();
  await expect(page.locator(".builderQuestionCard").first()).toBeVisible();
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
  await page.locator('input[name="total_marks"]').fill("4");
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
  examType: InstituteWizardScenario["examType"],
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

test.describe("Institute exam creation wizard matrix", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute guided exam creation matrix coverage",
    ),
  );

  for (const scenario of scenarios) {
    test(`@workflow @mutable institute can create, assign, and expose a ${scenario.examType} exam from the wizard`, async ({
      page,
    }) => {
      test.setTimeout(180000);

      const uniqueSeed = Date.now();
      const sectionName = `PW Section ${scenario.examType} ${uniqueSeed}`;
      let examId: string | null = null;
      const studentDisplayName = await resolveStudentDisplayName(page);

      try {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);

        const created = await createInstituteWizardExam(page, scenario, uniqueSeed);
        examId = created.examId;

        await addOneSectionAndQuestion(page, examId, sectionName);
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
