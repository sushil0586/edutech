import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectPreviewFamilyContract,
  fetchPrograms,
  type ProgramRegistryRecord,
} from "../helpers/assessment-family";
import { getRoleCredentials } from "../fixtures/env";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableAdminExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type AdminAdvancedScenario = {
  examType: "practice" | "quiz" | "mock_exam";
};

const scenarios: AdminAdvancedScenario[] = [
  { examType: "practice" },
  { examType: "quiz" },
  { examType: "mock_exam" },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function openStage(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).first().click();
}

async function createAdminAdvancedExam(
  page: Page,
  scenario: AdminAdvancedScenario,
  uniqueSeed: number,
) {
  const examTitle = `PW Admin Advanced ${scenario.examType} ${uniqueSeed}`;
  const examCode = `PW-AA-${scenario.examType.slice(0, 2).toUpperCase()}-${uniqueSeed}`;

  await page.goto("/admin/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  const instituteId = await page.getByLabel(/select template institute/i).inputValue();
  expect(instituteId).not.toBe("");
  await expect(page.getByText(/not found in the selected institute/i)).toHaveCount(0);
  const selectedProgramId = await page.getByRole("combobox", { name: /^program/i }).first().inputValue();
  const availablePrograms = await fetchPrograms(page, instituteId);
  const selectedProgram = availablePrograms.find((program) => program.id === selectedProgramId) ?? null;

  const programOptions = await page
    .getByRole("combobox", { name: /^program/i })
    .first()
    .locator("option")
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  const subjectOptions = await page
    .getByRole("combobox", { name: /^subject$/i })
    .first()
    .locator("option")
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  expect(programOptions.length).toBeGreaterThan(0);
  expect(subjectOptions.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: /quick practice/i }).click();
  await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

  await openStage(page, /\bbasics\b/i);
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByLabel(/exam type/i).selectOption(scenario.examType);
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

  const previewResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/exams/advanced-builder/preview") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /preview exam/i }).click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok()).toBe(true);
  const previewPayload = (await previewResponse.json()) as {
    valid: boolean;
    resolved_exam?: { assessment_family_profile?: ProgramRegistryRecord["assessment_family_profile"] };
    sections?: Array<{
      family_contract?: {
        assessment_family_code?: string | null;
        negative_marking_scope?: string | null;
        negative_marking_recommended?: boolean;
        negative_marking_allowed?: boolean;
      };
    }>;
  };
  expect(previewPayload.valid).toBe(true);
  expectPreviewFamilyContract(previewPayload, selectedProgram?.assessment_family_profile ?? null);
  await expect(page.getByText(/preview refreshed\./i)).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/run preview when you are ready/i)).toHaveCount(0);
  await expect(page.getByText(/preview resolution/i).first()).toBeVisible();

  await page.getByRole("button", { name: /create advanced exam/i }).click();

  await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/, { timeout: 60000 });
  await expect(page.getByText(/advanced exam created successfully\./i)).toBeVisible();

  const builderUrl = page.url();
  const examId = builderUrl.match(/\/admin\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    instituteId,
  };
}

async function expectResolvedQuestionSet(page: Page, examId: string) {
  await page.goto(`/admin/exams/${examId}/builder?tab=questions`);
  await expect(page.locator(".builderQuestionCard").first()).toBeVisible({ timeout: 30000 });
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

async function expectAdminVisibility(
  page: Page,
  examId: string,
  examTitle: string,
  examType: AdminAdvancedScenario["examType"],
  instituteId: string,
) {
  await page.goto("/admin/exams");
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await page.locator('select[name="institute"]').selectOption(instituteId);
  await page.locator('select[name="exam_status"]').selectOption("draft");
  await page.locator('select[name="exam_source"]').selectOption("platform");
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page).toHaveURL(new RegExp(`institute=${instituteId}`));
  await expect(page).toHaveURL(/exam_status=draft/);
  await expect(page).toHaveURL(/exam_source=platform/);

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

test.describe("Admin exam creation advanced builder matrix", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("student"),
    "Admin and student Playwright credentials are required.",
  );

  test.skip(
    !mutableAdminExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
      "platform-admin advanced-builder exam creation matrix coverage",
    ),
  );

  for (const scenario of scenarios) {
    test(`@workflow @mutable admin can create and assign a platform ${scenario.examType} exam from advanced builder`, async ({
      page,
    }) => {
      test.setTimeout(240000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentDisplayName = await resolveStudentDisplayName(page);

      try {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);

        const created = await createAdminAdvancedExam(page, scenario, uniqueSeed);
        examId = created.examId;

        await expectResolvedQuestionSet(page, examId);
        await assignStudentToAdminExam(page, examId, studentDisplayName);
        await expectAdminVisibility(
          page,
          examId,
          created.examTitle,
          scenario.examType,
          created.instituteId,
        );
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
