import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { awsStudentCredentials, familyRuntimeScenarios } from "../helpers/family-runtime";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";
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

type AssignmentModeOption = {
  value: string;
  label: string;
};

const deterministicWizardScenario =
  familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner") ??
  familyRuntimeScenarios[0]!;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function waitForNonEmptyOptionValues(locator: Locator) {
  await expect
    .poll(
      async () =>
        locator.locator("option").evaluateAll((nodes) =>
          nodes
            .map((node) => (node as HTMLOptionElement).value)
            .filter((value) => value.trim().length > 0),
        ),
      { timeout: 15000 },
    )
    .not.toEqual([]);
}

async function selectOptionByLabelPattern(locator: Locator, pattern: RegExp) {
  const matchingOption = await locator.locator("option").evaluateAll(
    (nodes, sourcePattern) => {
      const compiledPattern = new RegExp(sourcePattern.source, sourcePattern.flags);
      return (
        nodes
          .map((node) => ({
            value: (node as HTMLOptionElement).value,
            label: ((node as HTMLOptionElement).label || node.textContent || "").trim(),
          }))
          .find(
            (option) =>
              option.value.trim().length > 0 && compiledPattern.test(option.label),
          ) ?? null
      );
    },
    { source: pattern.source, flags: pattern.flags },
  );
  expect(matchingOption).not.toBeNull();
  await locator.selectOption(matchingOption!.value);
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

async function fetchAdminExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    assignment_mode: string;
    assigned_students: Array<{
      id: string;
      full_name: string;
    }>;
  };
}

async function resolveStudentDisplayName(page: Page) {
  let studentDisplayName = awsStudentCredentials.username;
  await loginWithCredentials(page, awsStudentCredentials, "student");
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

async function createAdminWizardExam(page: Page, uniqueSeed: number) {
  const examTitle = `PW Admin Assignment Modes ${uniqueSeed}`;
  const examCode = `PW-AAM-${uniqueSeed}`;

  await page.goto("/admin/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  const preferredInstituteChip = page.locator(".academicInstituteChip").filter({
    hasText: /Demo Learning Institute|DLI001/i,
  }).first();
  if (await preferredInstituteChip.count()) {
    await preferredInstituteChip.click();
    await expect(page).toHaveURL(/\/admin\/exams\/new\?institute=/);
  }
  const academicYear = page.locator('select[name="academic_year"]').first();
  const program = page.locator('select[name="program"]').first();
  const subject = page.locator('select[name="subject"]').first();
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
  await page.locator('select[name="source_type"]').selectOption("platform");
  const hasCanonicalFamilyAcademicYear = await academicYear.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).some((option) => option.label.trim() === "2026-2027");
  });
  if (hasCanonicalFamilyAcademicYear) {
    await academicYear.selectOption({ label: "2026-2027" });
  }
  await waitForNonEmptyOptionValues(program);
  await selectOptionByLabelPattern(
    program,
    new RegExp(`^${escapeRegExp(deterministicWizardScenario.programLabel)}(?:\\s*\\(|$)`, "i"),
  );
  await expect(subject).toBeEnabled();
  await waitForNonEmptyOptionValues(subject);
  await selectOptionByLabelPattern(
    subject,
    new RegExp(`^${escapeRegExp(deterministicWizardScenario.subjectLabel)}(?:\\s*\\(|$)`, "i"),
  );
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('select[name="exam_type"]').selectOption("quiz");
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
  };
}

async function openAssignmentForm(page: Page, examId: string) {
  await page.goto(`/admin/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  return page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
}

async function readAssignmentModeOptions(assignmentForm: Locator) {
  return await assignmentForm.locator('select[name="assignment_mode"] option').evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      }))
      .filter((option) => option.value.trim().length > 0),
  ) as AssignmentModeOption[];
}

async function saveAssignmentMode(
  page: Page,
  assignmentForm: Locator,
  option: AssignmentModeOption,
  studentDisplayName: string,
) {
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption(option.value);

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  const studentCount = await studentCheckboxes.count();
  expect(studentCount).toBeGreaterThan(0);

  if (option.value === "selected_students") {
    const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
      has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
    }).first();

    for (let index = 0; index < studentCount; index += 1) {
      await studentCheckboxes.nth(index).uncheck().catch(() => null);
    }

    if (await matchingStudentRow.count()) {
      await matchingStudentRow.locator('input[name="student_ids"]').check();
    } else {
      await studentCheckboxes.first().check();
    }
  }

  await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
  await expect(page).toHaveURL(/tab=assignment&message=/);
  await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
}

async function expectDetailAssignmentState(
  page: Page,
  examId: string,
  studentDisplayName: string,
  option: AssignmentModeOption,
) {
  await page.goto(`/admin/exams/${examId}`);
  await expect(page.getByText(/assigned students/i).first()).toBeVisible();

  if (option.value === "selected_students") {
    await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
    await expect(page.getByText(/this exam currently has no directly assigned students\./i)).toHaveCount(0);
    return;
  }

  await expect(page.getByText(/this exam currently has no directly assigned students\./i)).toBeVisible();
}

test.describe("Admin exam assignment-mode matrix", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("student"),
    "Admin and student Playwright credentials are required.",
  );

  test.skip(
    !mutableAdminExamCreationEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
      "platform-admin assignment-mode enumeration coverage",
    ),
  );

  test("@workflow @mutable admin can persist every visible assignment mode from the exam builder", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const uniqueSeed = Date.now();
    let examId: string | null = null;
    const studentDisplayName = await resolveStudentDisplayName(page);

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const created = await createAdminWizardExam(page, uniqueSeed);
      examId = created.examId;

      const initialAssignmentForm = await openAssignmentForm(page, examId);
      const assignmentModes = await readAssignmentModeOptions(initialAssignmentForm);
      expect(assignmentModes.length).toBeGreaterThan(0);
      expect(assignmentModes.some((option) => option.value === "selected_students")).toBe(true);
      expect(assignmentModes.some((option) => option.value === "scope")).toBe(true);

      for (const option of assignmentModes) {
        const assignmentForm = await openAssignmentForm(page, examId);
        await saveAssignmentMode(page, assignmentForm, option, studentDisplayName);

        const persistedAssignmentForm = await openAssignmentForm(page, examId);
        await expect(persistedAssignmentForm.locator('select[name="assignment_mode"]')).toHaveValue(option.value);

        const detail = await fetchAdminExamDetail(page, examId);
        expect(detail.assignment_mode).toBe(option.value);

        if (option.value === "selected_students") {
          expect(
            detail.assigned_students.some((student) =>
              student.full_name.toLowerCase().includes(studentDisplayName.toLowerCase()),
            ),
          ).toBe(true);
        } else {
          expect(detail.assigned_students).toHaveLength(0);
        }

        await expectDetailAssignmentState(page, examId, studentDisplayName, option);
      }
    } finally {
      if (examId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteAdminExamDirectly(page, examId);
      }
    }
  });
});
