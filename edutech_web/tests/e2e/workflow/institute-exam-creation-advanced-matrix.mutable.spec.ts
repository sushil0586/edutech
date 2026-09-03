import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  fetchAuthProfile,
  expectPreviewFamilyContract,
  fetchPrograms,
  fetchSubjects,
  fetchTopics,
  type ProgramRegistryRecord,
} from "../helpers/assessment-family";
import { expectInstituteWorkspace, expectStudentWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  resolveStudentProfileScope,
  selectOptionByLabelFragment,
  type StudentProfileScope,
} from "../helpers/student-scope";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type InstituteAdvancedScenario = {
  examType: "practice" | "quiz" | "mock_exam";
};

const scenarios: InstituteAdvancedScenario[] = [
  { examType: "practice" },
  { examType: "quiz" },
  { examType: "mock_exam" },
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

async function openStage(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).first().click();
}

async function createInstituteAdvancedExam(
  page: Page,
  scenario: InstituteAdvancedScenario,
  uniqueSeed: number,
  studentScope: StudentProfileScope,
) {
  const examTitle = `PW Institute Advanced ${scenario.examType} ${uniqueSeed}`;
  const examCode = `PW-IA-${scenario.examType.slice(0, 2).toUpperCase()}-${uniqueSeed}`;

  await page.goto("/institute/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
  if (studentScope.academicYearName) {
    await selectOptionByLabelFragment(
      page.getByRole("combobox", { name: /academic year/i }).first(),
      studentScope.academicYearName,
    );
  }
  if (studentScope.programName) {
    await selectOptionByLabelFragment(
      page.getByRole("combobox", { name: /^program/i }).first(),
      studentScope.programName,
    );
  }
  const selectedProgramId = await page.getByRole("combobox", { name: /^program/i }).first().inputValue();
  const availablePrograms = await fetchPrograms(page);
  const selectedProgram = availablePrograms.find((program) => program.id === selectedProgramId) ?? null;
  const authProfile = await fetchAuthProfile(page);

  const primarySubjectSelect = page.getByLabel(/^primary subject/i).first();
  const availableSubjects = await fetchSubjects(page, selectedProgramId, authProfile.institute);
  let selectedSubject = availableSubjects[0] ?? null;
  if (availableSubjects.length > 0) {
    for (const subject of availableSubjects) {
      const topics = await fetchTopics(page, subject.id, authProfile.institute);
      if (topics.length > 0) {
        selectedSubject = subject;
        break;
      }
    }
  }
  expect(selectedSubject).not.toBeNull();

  await expect
    .poll(async () => primarySubjectSelect.locator("option").count(), {
      timeout: 30000,
      message: "Expected the institute advanced builder subject selector to load real subject options.",
    })
    .toBeGreaterThan(1);
  await primarySubjectSelect.selectOption({ label: selectedSubject!.name });
  await expect(primarySubjectSelect).toHaveValue(selectedSubject!.id);

  await page.getByRole("button", { name: /quick practice/i }).click();

  await openStage(page, /\bbasics\b/i);
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByLabel(/exam type/i).selectOption(scenario.examType);

  await openStage(page, /\bcomposition\b/i);
  await page.getByLabel(/selection mode/i).selectOption("subject_fallback");

  const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
  await firstSectionCard.getByLabel(/section subject/i).selectOption({ label: selectedSubject!.name });
  await firstSectionCard.getByLabel(/question count/i).fill("1");

  const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
  for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
    await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
  }

  const firstTopicRow = firstSectionCard.locator(".advancedBuilderTopicRow").first();
  await firstTopicRow.locator("select").selectOption({ index: 1 });
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

async function assignStudentToInstituteExam(page: Page, examId: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  const assignmentForm = page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  const studentCount = await studentCheckboxes.count();
  expect(studentCount).toBeGreaterThan(0);

  for (let index = 0; index < studentCount; index += 1) {
    await studentCheckboxes.nth(index).uncheck().catch(() => null);
  }
  await studentCheckboxes.first().check();
  if (studentCount > 1) {
    await studentCheckboxes.nth(1).check().catch(() => null);
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
) {
  await page.goto(`/institute/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(page.getByText(new RegExp(`^${escapeRegExp(examType.replaceAll("_", " "))}$`, "i")).first()).toBeVisible();
  await expect(page.getByText(/assigned students/i).first()).toBeVisible();
  await expect(page.getByText(/^\d+\s+learners?$/i).first()).toBeVisible();
}

async function expectStudentVisibility(
  page: Page,
  examId: string,
  examTitle: string,
) {
  await loginAsRole(page, "student");
  await expectStudentWorkspace(page);

  await page.goto(`/app/exams/${examId}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^start$/i })).toBeVisible();
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
      const studentScope = await resolveStudentProfileScope(page);

      try {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);

        const created = await createInstituteAdvancedExam(page, scenario, uniqueSeed, studentScope);
        examId = created.examId;

        await expectResolvedQuestionSet(page, examId);
        await assignStudentToInstituteExam(page, examId);
        await scheduleAndPublishInstituteExam(page, examId);
        await expectInstituteVisibility(
          page,
          examId,
          created.examTitle,
          scenario.examType,
        );
        await expectStudentVisibility(
          page,
          examId,
          created.examTitle,
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
