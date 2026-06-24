import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import {
  expectAdminWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableAdminExamCreationEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type AdminWizardScenario = {
  examType: "practice" | "quiz" | "mock_exam";
  sourceType: "platform" | "institute";
  expectedStartLabel: RegExp;
  verifyInstituteWorkspace: boolean;
  verifyStudentVisibility: boolean;
  attachQuestionAndPublish: boolean;
};

const scenarios: AdminWizardScenario[] = [
  {
    examType: "practice",
    sourceType: "platform",
    expectedStartLabel: /^start practice set$/i,
    verifyInstituteWorkspace: false,
    verifyStudentVisibility: false,
    attachQuestionAndPublish: false,
  },
  {
    examType: "quiz",
    sourceType: "platform",
    expectedStartLabel: /^start quiz$/i,
    verifyInstituteWorkspace: false,
    verifyStudentVisibility: false,
    attachQuestionAndPublish: false,
  },
  {
    examType: "mock_exam",
    sourceType: "platform",
    expectedStartLabel: /^start mock test$/i,
    verifyInstituteWorkspace: false,
    verifyStudentVisibility: false,
    attachQuestionAndPublish: false,
  },
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

async function createAdminWizardExam(
  page: Page,
  scenario: AdminWizardScenario,
  uniqueSeed: number,
) {
  const examTitle = `PW Admin ${scenario.sourceType} ${scenario.examType} ${uniqueSeed}`;
  const examCode = `PW-AW-${scenario.sourceType.slice(0, 2).toUpperCase()}-${scenario.examType.slice(0, 2).toUpperCase()}-${uniqueSeed}`;

  await page.goto("/admin/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  const instituteId = await page.locator('input[name="institute"]').first().inputValue();
  expect(instituteId).not.toBe("");
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
  await page.locator('select[name="source_type"]').selectOption(scenario.sourceType);
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('select[name="exam_type"]').selectOption(scenario.examType);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /create exam shell/i }).click();

  await expect(page).toHaveURL(/\/admin\/exams\?message=/);
  const createdExamCard = page.locator(".examCard").filter({
    has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first(),
  }).first();
  await expect(createdExamCard).toBeVisible();

  const openExamHref = await createdExamCard.getByRole("link", { name: /open exam/i }).getAttribute("href");
  const examId = openExamHref?.match(/\/admin\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    examCode,
    instituteId,
  };
}

async function addOneSectionAndQuestion(page: Page, examId: string, sectionName: string) {
  await page.goto(`/admin/exams/${examId}/builder?tab=sections`);
  await expect(page.getByText(/add a new section/i).first()).toBeVisible();
  await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
  await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
  await page.getByRole("button", { name: /^add section$/i }).click();
  await expect(page).toHaveURL(/tab=sections&message=/);
  await expect(page.getByText(/section added/i)).toBeVisible();

  await page.goto(`/admin/exams/${examId}/builder?tab=questions`);
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

async function scheduleAndPublishAdminExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  await page.goto(`/admin/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("4");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

  await page.goto(`/admin/exams/${examId}`);
  await expect(page.getByRole("button", { name: /refresh status/i }).first()).toBeVisible();
  let finalStatus: "draft" | "scheduled" | "live" = "draft";

  const publishButton = page.getByRole("button", { name: /publish exam/i });
  if (await publishButton.count()) {
    await publishButton.click();
    await expect(page).toHaveURL(/message=/);
    finalStatus = "scheduled";
  }

  const markLiveButton = page.getByRole("button", { name: /mark live/i });
  if (await markLiveButton.count()) {
    await markLiveButton.click();
    await expect(page).toHaveURL(/message=/);
    finalStatus = "live";
  }

  return finalStatus;
}

async function expectAdminVisibility(
  page: Page,
  examId: string,
  examTitle: string,
  examType: AdminWizardScenario["examType"],
  sourceType: AdminWizardScenario["sourceType"],
  finalStatus: "draft" | "scheduled" | "live",
  instituteId: string,
) {
  await page.goto("/admin/exams");
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await page.locator('select[name="institute"]').selectOption(instituteId);
  await page.locator('select[name="exam_status"]').selectOption(finalStatus);
  await page.locator('select[name="exam_source"]').selectOption(sourceType);
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(new RegExp(`institute=${instituteId}`));
  await expect(page).toHaveURL(new RegExp(`exam_status=${finalStatus}`));
  await expect(page).toHaveURL(new RegExp(`exam_source=${sourceType}`));

  const examCard = page.locator(".examCard").filter({
    has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")),
  }).first();
  await expect(examCard).toBeVisible();
  await expect(
    examCard
      .locator(".examStateSummary strong")
      .filter({ hasText: new RegExp(`^${escapeRegExp(examType.replaceAll("_", " "))}$`, "i") })
      .first(),
  ).toBeVisible();

  await page.goto(`/admin/exams/${examId}`);
  await expect(page.getByText(/assigned students/i).first()).toBeVisible();
  await expect(page.getByText(/^\d+\s+learners$/i).first()).toBeVisible();
  await expect(page.getByText(/this exam currently has no directly assigned students\./i)).not.toBeVisible();
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

test.describe("Admin exam creation wizard matrix", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("student"),
    "Admin and student Playwright credentials are required.",
  );

  test.skip(
    !mutableAdminExamCreationEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
      "platform-admin guided exam creation matrix coverage",
    ),
  );

  for (const scenario of scenarios) {
    test(`@workflow @mutable admin can create, assign, and expose a ${scenario.sourceType} ${scenario.examType} exam from the wizard`, async ({
      page,
    }) => {
      test.setTimeout(180000);

      const uniqueSeed = Date.now();
      const sectionName = `PW Admin Section ${scenario.examType} ${uniqueSeed}`;
      let examId: string | null = null;
      const studentDisplayName = await resolveStudentDisplayName(page);

      try {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);

        const created = await createAdminWizardExam(page, scenario, uniqueSeed);
        examId = created.examId;

        await assignStudentToAdminExam(page, examId, studentDisplayName);

        let finalStatus: "draft" | "scheduled" | "live" = "draft";
        if (scenario.attachQuestionAndPublish) {
          await addOneSectionAndQuestion(page, examId, sectionName);
          finalStatus = await scheduleAndPublishAdminExam(page, examId);
        }

        await expectAdminVisibility(
          page,
          examId,
          created.examTitle,
          scenario.examType,
          scenario.sourceType,
          finalStatus,
          created.instituteId,
        );

        if (scenario.verifyStudentVisibility) {
          await expectStudentVisibility(
            page,
            examId,
            created.examTitle,
            scenario.expectedStartLabel,
          );
        }
      } finally {
        if (examId) {
          await loginAsRole(page, "admin");
          await expectAdminWorkspace(page);
          await deleteAdminExamDirectly(page, examId);
        }
      }
    });
  }
});
