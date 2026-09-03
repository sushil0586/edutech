import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function createExamSection(
  page: Page,
  examId: string,
  name: string,
  sectionOrder: number,
  subjectId: string | null,
) {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/sections/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
      subject: subjectId,
      name,
      description: "",
      section_order: sectionOrder,
      instructions: "",
      total_questions: 0,
      marks_per_question: null,
      negative_marks_per_question: null,
      timer_enabled: false,
      duration_minutes: null,
      allow_skip_section: false,
      lock_after_submit: false,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { id?: string; data?: { id?: string } };
  const sectionId = payload.data?.id ?? payload.id ?? null;
  expect(sectionId).not.toBeNull();
  return sectionId!;
}

async function linkExamQuestion(
  page: Page,
  examId: string,
  questionId: string,
  sectionId: string | null,
  questionOrder: number,
  marks = "4",
) {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/questions/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    data: {
      exam: examId,
      question: questionId,
      section: sectionId,
      question_order: questionOrder,
      marks,
      negative_marks: "0",
      is_mandatory: false,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function currentToolbarValue(page: Page, label: RegExp) {
  return (
    (await page
      .locator(".attemptToolbar .examStateSummary")
      .filter({ has: page.getByText(label) })
      .locator("strong")
      .first()
      .textContent()
      .catch(() => "")) ?? ""
  ).trim();
}

async function currentLastConfirmedSaveValue(page: Page) {
  const resilienceValue =
    (
      (await page
        .locator(".attemptResiliencePanel")
        .getByText(/last confirmed backend response|last confirmed save/i)
        .locator("xpath=following-sibling::*[1]")
        .first()
        .textContent()
        .catch(() => "")) ?? ""
    ).trim();

  if (resilienceValue) {
    return resilienceValue;
  }

  return (
    (await currentToolbarValue(page, /^last confirmed backend response$/i)) ||
    (await currentToolbarValue(page, /^last confirmed save$/i))
  ).trim();
}

async function selectOptionByLabel(select: Locator, label: string) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: (node as HTMLOptionElement).label.trim(),
      text: ((node as HTMLOptionElement).textContent ?? "").trim(),
      value: (node as HTMLOptionElement).value,
    })),
  );
  const match = options.find(
    (option) => option.value.trim().length > 0 && (option.label === label || option.text === label),
  );
  expect(match, `Expected to find option labeled "${label}".`).toBeTruthy();
  await select.selectOption(match!.value);
}

async function selectOptionStartingWithLabel(select: Locator, labelPrefix: string) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: (node as HTMLOptionElement).label.trim(),
      text: ((node as HTMLOptionElement).textContent ?? "").trim(),
      value: (node as HTMLOptionElement).value,
    })),
  );
  const loweredPrefix = labelPrefix.trim().toLowerCase();
  const match = options.find(
    (option) =>
      option.value.trim().length > 0 &&
      (option.label.toLowerCase().startsWith(loweredPrefix) || option.text.toLowerCase().startsWith(loweredPrefix)),
  );
  expect(match, `Expected to find option starting with "${labelPrefix}".`).toBeTruthy();
  await select.selectOption(match!.value);
}

async function selectFirstNonEmptyOption(select: Locator) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        label: ((node as HTMLOptionElement).textContent ?? "").trim(),
        value: (node as HTMLOptionElement).value,
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  if (options.length > 0) {
    await select.selectOption(options[0]!.value);
  }
}

async function selectFirstNonEmptyOptionWithLabel(select: Locator) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        label: ((node as HTMLOptionElement).textContent ?? "").trim(),
        value: (node as HTMLOptionElement).value,
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  expect(options.length).toBeGreaterThan(0);
  await select.selectOption(options[0]!.value);
  return options[0]!;
}

async function waitForSelectableOption(locator: Locator) {
  await expect
    .poll(async () => {
      const options = await locator.locator("option").evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );
      return options.length;
    })
    .toBeGreaterThan(0);
}

async function ensureExamSubjectSelected(page: Page) {
  const examSubjectSelect = page.locator('select[name="subject"]');
  if (!(await examSubjectSelect.count())) {
    return;
  }
  const currentValue = await examSubjectSelect.inputValue().catch(() => "");
  if (currentValue.trim().length > 0) {
    return;
  }
  await selectFirstNonEmptyOption(examSubjectSelect);
}

async function saveCheckpoint(page: Page, seed: number, prefix: string) {
  await answerCurrentAttemptQuestion(page, seed, prefix);
  await page.getByRole("button", { name: /^save answer$/i }).click();
  await expect(page.getByText(/responses saved/i).first()).toBeVisible();
  await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
  await expect(page.locator(".attemptResiliencePanel").first()).toContainText(/online|synced/i);
  await expect(page.getByText(/last confirmed backend response|last confirmed save/i).first()).toBeVisible();
}

async function runTeacherExamAction(page: Page, examId: string, action: "sync-marks" | "publish" | "mark-live") {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/${action}/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function expectTeacherExamStatus(page: Page, examId: string, expectedStatuses: string[]) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { data?: { status?: string | null } | null; status?: string | null };
  const status = payload.data?.status ?? payload.status ?? null;
  expect(status).not.toBeNull();
  expect(expectedStatuses).toContain(status!);
}

async function createDisposableTrueFalseQuestion(page: Page, programName: string, questionText: string) {

  await page.goto("/teacher/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');

  await selectOptionStartingWithLabel(programSelect, programName);
  await expect(subjectSelect).toBeEnabled();
  try {
    await waitForSelectableOption(subjectSelect);
  } catch {
    await selectFirstNonEmptyOption(programSelect);
    await expect(subjectSelect).toBeEnabled();
    await waitForSelectableOption(subjectSelect);
  }
  const subjectOption = await selectFirstNonEmptyOptionWithLabel(subjectSelect);
  await expect(topicSelect).toBeEnabled();
  const topicOptionCount = await topicSelect.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0).length,
  );
  if (topicOptionCount > 0) {
    await selectFirstNonEmptyOption(topicSelect);
  }

  await page.locator('select[name="question_type"]').selectOption("true_false");
  await page.locator('textarea[name="question_text"]').fill(questionText);
  await page.locator('textarea[name="explanation"]').fill(
    "Disposable true/false prompt for long-session student continuity coverage.",
  );

  const optionRows = page.locator(".questionEditorOptionRow");
  await expect(optionRows).toHaveCount(2);
  await optionRows.first().locator('input[type="radio"]').check();
  await page.locator('input[name="default_marks"]').fill("4");
  await page.locator('input[name="negative_marks"]').fill("0");

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
  const questionId = page.url().split("?")[0]?.match(/\/teacher\/question-bank\/([^/?#]+)/)?.[1] ?? null;
  expect(questionId).not.toBeNull();

  return {
    questionId: questionId!,
    subjectId: subjectOption.value,
    questionText,
    subjectLabel: subjectOption.label,
  };
}

async function expectCurrentSection(page: Page, sectionName: string) {
  const shellSection = page.getByText(
    new RegExp(`${escapeRegExp(sectionName)}\\s*·\\s*Question\\s+\\d+\\s+of\\s+\\d+`, "i"),
  ).first();
  if (await shellSection.isVisible().catch(() => false)) {
    await expect(shellSection).toBeVisible();
    return;
  }

  const currentSectionCard = page.locator(".attemptSectionCard").filter({
    has: page.getByText(new RegExp(`^${escapeRegExp(sectionName)}$`, "i")),
  }).filter({
    has: page.getByRole("button", { name: /current section/i }),
  }).first();
  await expect(currentSectionCard).toBeVisible();
}

async function resumeLongSessionAttempt(page: Page, examId: string, attemptId: string, examTitle: string) {
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^resume$/i }).first()).toBeVisible();
  await expect(page.getByText(/active attempt already exists/i).first()).toBeVisible();
  await page.getByRole("link", { name: /^resume$/i }).first().click();
  await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
}

test.describe("Student long-session runtime continuity", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentAttemptActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "student long-session runtime continuity coverage",
    ),
  );

  test("@workflow @mutable student can keep a dense disposable multi-section attempt truthful across repeated saves reloads revisits resumes and final submit", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentProfileId: string | null = null;
    let examId: string | null = null;
    let attemptId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const resultPublishAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const uniqueSeed = Date.now();
    const examTitle = `PW Student Long Session ${uniqueSeed}`;
    const examCode = `PW-SLS-${uniqueSeed}`;
    let questionSubjectLabel = "";
    let questionSubjectId: string | null = null;
    const questionDefs = [
      { text: `PW student long-session question ${uniqueSeed}-1`, id: "" },
      { text: `PW student long-session question ${uniqueSeed}-2`, id: "" },
      { text: `PW student long-session question ${uniqueSeed}-3`, id: "" },
    ];

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
    const identityCard = page.locator(".detailCard").filter({
      has: page.getByText(/^name$/i),
    }).first();
    if (await identityCard.count()) {
      const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
      void renderedName;
    }
    const studentMe = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${await backendAccessToken(page)}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    expect(studentMe.ok()).toBe(true);
    const studentPayload = (await studentMe.json()) as {
      student_profile?: string | null;
      student_context?: {
        academic_year_name?: string | null;
        program_name?: string | null;
      } | null;
    };
    studentProfileId = studentPayload.student_profile?.trim() ?? null;
    const studentAcademicYearName = studentPayload.student_context?.academic_year_name?.trim() ?? null;
    const studentProgramName = studentPayload.student_context?.program_name?.trim() ?? null;
    expect(studentProfileId).not.toBeNull();
    expect(studentAcademicYearName).not.toBeNull();
    expect(studentProgramName).not.toBeNull();

    try {
      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      for (const [index, questionDef] of questionDefs.entries()) {
        const disposableQuestion = await createDisposableTrueFalseQuestion(page, studentProgramName!, questionDef.text);
        questionDef.id = disposableQuestion.questionId;
        if (index === 0) {
          questionSubjectId = disposableQuestion.subjectId;
          questionSubjectLabel = disposableQuestion.subjectLabel;
        }
      }

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      const createExamSubjectSelect = page.locator('select[name="subject"]');
      if (await createExamSubjectSelect.count()) {
        const subjectOptions = await createExamSubjectSelect.locator("option").evaluateAll((options) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
            }))
            .filter((option) => option.value.trim().length > 0),
        );
        if (subjectOptions.length > 0) {
          await createExamSubjectSelect.selectOption(subjectOptions[0]!.value);
        }
      }

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(resultPublishAt));
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell|creating exam/i }).click();
      await expect
        .poll(() => page.url(), { timeout: 60000 })
        .toMatch(/\/teacher\/exams\/(?!new(?:[/?#]|$))[^/?#]+\/builder(?:\?message=.*)?$/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBe("new");
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder`, { waitUntil: "domcontentloaded" });
      const academicYearSelect = page.locator('select[name="academic_year"]');
      const examProgramSelect = page.locator('select[name="program"]');
      const examSubjectSelect = page.locator('select[name="subject"]');
      if (await academicYearSelect.count()) {
        await selectOptionByLabel(academicYearSelect, studentAcademicYearName!);
      }
      if (await examProgramSelect.count()) {
        await selectOptionStartingWithLabel(examProgramSelect, studentProgramName!);
      }
      if (questionSubjectLabel && await examSubjectSelect.count()) {
        await selectOptionStartingWithLabel(examSubjectSelect, questionSubjectLabel);
      } else {
        await ensureExamSubjectSelected(page);
      }
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      const sectionAlphaId = await createExamSection(page, examId!, "Section Alpha", 1, questionSubjectId);
      const sectionBetaId = await createExamSection(page, examId!, "Section Beta", 2, questionSubjectId);
      const sectionGammaId = await createExamSection(page, examId!, "Section Gamma", 3, questionSubjectId);

      await linkExamQuestion(page, examId!, questionDefs[0]!.id, sectionAlphaId, 1, "4");
      await linkExamQuestion(page, examId!, questionDefs[1]!.id, sectionBetaId, 2, "4");
      await linkExamQuestion(page, examId!, questionDefs[2]!.id, sectionGammaId, 3, "4");

      const teacherAccessToken = await backendAccessToken(page);
      const assignmentResponse = await page.request.post(
        `${backendBaseUrl}/api/v1/exams/${examId}/assign-students/`,
        {
          headers: {
            Authorization: `Bearer ${teacherAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            assignment_mode: "selected_students",
            student_ids: [studentProfileId],
          },
          timeout: 15000,
        },
      );
      expect(assignmentResponse.ok(), await assignmentResponse.text()).toBe(true);

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}`);
      await runTeacherExamAction(page, examId!, "sync-marks");
      await runTeacherExamAction(page, examId!, "publish");
      await runTeacherExamAction(page, examId!, "mark-live");
      await expectTeacherExamStatus(page, examId!, ["scheduled", "live"]);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i }).click();

      await expect
        .poll(() => page.url(), { timeout: 60000 })
        .toMatch(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(attemptId).not.toBeNull();
      await expect(page.getByText(/section alpha · question 1 of 1/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /questions/i }).first()).toBeVisible();
      await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();

      await saveCheckpoint(page, uniqueSeed, "Long session alpha");
      const firstSaveTimestamp = await currentLastConfirmedSaveValue(page);
      expect(firstSaveTimestamp).not.toBe("");

      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
      await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
      await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
      expect(await currentLastConfirmedSaveValue(page)).toBe(firstSaveTimestamp);

      const betaSectionCard = page.locator(".attemptSectionCard").filter({
        has: page.getByText(/section beta/i),
      }).first();
      await expect(betaSectionCard.getByRole("button", { name: /open section/i })).toBeVisible();
      await betaSectionCard.getByRole("button", { name: /open section/i }).click();
      await expectCurrentSection(page, "Section Beta");
      await saveCheckpoint(page, uniqueSeed + 1, "Long session beta");

      await resumeLongSessionAttempt(page, examId!, attemptId!, examTitle);
      await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /questions/i }).first()).toBeVisible();
      await expectCurrentSection(page, "Section Beta");

      await saveCheckpoint(page, uniqueSeed + 1, "Long session beta revisit");
      const saveAndNextSectionButton = page.getByRole("button", { name: /^save & next section$/i }).first();
      if (await saveAndNextSectionButton.isVisible().catch(() => false)) {
        await saveAndNextSectionButton.scrollIntoViewIfNeeded();
        await saveAndNextSectionButton.click({ force: true });
      }

      const gammaSectionCard = page.locator(".attemptSectionCard").filter({
        has: page.getByText(/section gamma/i),
      }).first();
      const gammaOpenSectionButton = gammaSectionCard.getByRole("button", { name: /open section/i }).first();
      await expect(gammaSectionCard).toBeVisible();
      const alreadyInGamma = await page
        .getByText(/section gamma · question 1 of 1/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (!alreadyInGamma) {
        await expect(gammaSectionCard).toBeVisible();
        await expect(gammaSectionCard.getByRole("button", { name: /open section/i }).first()).toBeVisible();
        await gammaSectionCard.getByRole("button", { name: /open section/i }).first().click({ force: true });
      }
      await expectCurrentSection(page, "Section Gamma");
      await saveCheckpoint(page, uniqueSeed + 2, "Long session gamma");

      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
      await expect(page.getByText(/section gamma · question 1 of 1/i).first()).toBeVisible();
      await expect(page.getByText(/saved · not marked for review/i).first()).toBeVisible();
      await expect(page.getByText(/review before submit/i).first()).toBeVisible();
      await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
      expect(await currentLastConfirmedSaveValue(page)).not.toBe("");

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^end test$/i }).click();

      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
      await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
      await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
      await expect(page.getByText(/attempt status/i).first()).toBeVisible();
      await expect(page.getByText(/review/i).first()).toBeVisible();
      await expect(
        page.getByText(/evaluation pending|result published|review available|review feedback/i).first(),
      ).toBeVisible();
    } finally {
      // Cleanup is intentionally best-effort-free here.
      // This lane is meant to validate runtime continuity, and earlier runs
      // showed teardown retries can outlive a successful browser proof.
    }
  });
});
