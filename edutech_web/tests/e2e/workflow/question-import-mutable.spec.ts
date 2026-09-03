import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const mutableQuestionImportActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS",
);

const fallbackQuestionImportColumns = [
  "subject",
  "topic",
  "passage_title",
  "passage_order",
  "question_type",
  "difficulty_level",
  "question_text",
  "assertion_text",
  "reason_text",
  "matrix_left_items",
  "matrix_right_items",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "correct_answer",
  "accepted_answers",
  "numeric_tolerance",
  "review_guidance",
  "default_marks",
  "negative_marks",
  "explanation",
  "tags",
] as const;

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function buildCsv(columns: string[], rows: Record<string, string> | Record<string, string>[]) {
  const normalizedRows = Array.isArray(rows) ? rows : [rows];
  return [
    columns.join(","),
    ...normalizedRows.map((row) =>
      columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","),
    ),
  ].join("\n");
}

function firstNonEmptyOption(options: Array<{ value: string; label: string }>) {
  return options.find((option) => option.value.trim().length > 0) ?? null;
}

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
}

async function waitForFirstNonEmptyOption(
  page: Page,
  selector: string,
  options?: {
    timeoutMs?: number;
  },
) {
  const timeoutMs = options?.timeoutMs ?? 10000;

  await expect
    .poll(
      async () => {
        const values = await page.locator(`${selector} option`).evaluateAll((nodes) =>
          nodes
            .map((node) => ({
              value: (node as HTMLOptionElement).value,
              label: (node as HTMLOptionElement).label.trim(),
            }))
            .filter((option) => option.value.trim().length > 0),
        );
        return values[0] ?? null;
      },
      { timeout: timeoutMs },
    )
    .not.toBeNull();

  const optionsSnapshot = await page.locator(`${selector} option`).evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );

  return firstNonEmptyOption(optionsSnapshot);
}

async function resolveImportScopeFromQuestionAuthoring(
  page: Page,
  newQuestionPath: string,
) {
  await page.goto(newQuestionPath);
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programOptions = await page.locator('select[name="program"] option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );
  const programOption = firstNonEmptyOption(programOptions);
  expect(programOption).not.toBeNull();
  await page.locator('select[name="program"]').selectOption(programOption!.value);

  const subjectOption = await waitForFirstNonEmptyOption(page, 'select[name="subject"]');
  expect(subjectOption).not.toBeNull();
  await page.locator('select[name="subject"]').selectOption(subjectOption!.value);

  const topicOption = await waitForFirstNonEmptyOption(page, 'select[name="topic"]');
  expect(topicOption).not.toBeNull();

  return {
    subjectName: normalizeAcademicLabel(subjectOption!.label),
    topicName: normalizeAcademicLabel(topicOption!.label),
  };
}

async function expectQuestionImportBlockedState(page: Page) {
  const pageText = await page.locator("body").innerText();
  if (!/question-bank bulk import is not enabled for (your|this) institute yet/i.test(pageText)) {
    return false;
  }

  await expect(page.getByText(/feature entitlement required/i)).toBeVisible();
  await expect(page.getByText(/subscription controlled/i)).toBeVisible();
  return true;
}

async function buildQuestionImportFile(
  testInfo: TestInfo,
  questionText: string,
  fileName: string,
  scope: {
    subjectName: string;
    topicName: string;
  },
) {
  const row: Record<string, string> = Object.fromEntries(
    fallbackQuestionImportColumns.map((column) => [column, ""]),
  );
  row.subject = scope.subjectName;
  row.topic = scope.topicName;
  row.question_type = "mcq_single";
  row.difficulty_level = "foundation";
  row.question_text = questionText;
  row.option_1 = "Amazon S3";
  row.option_2 = "Amazon EC2";
  row.option_3 = "Amazon RDS";
  row.option_4 = "Amazon Route 53";
  row.correct_answer = "1";
  row.default_marks = "1.00";
  row.negative_marks = "0.00";
  row.explanation = "Amazon S3 is AWS object storage.";
  row.tags = "playwright-import|aws";

  const filePath = testInfo.outputPath(fileName);
  await writeFile(filePath, buildCsv([...fallbackQuestionImportColumns], row), "utf8");
  return filePath;
}

function buildQuestionImportRow(
  scope: {
    subjectName: string;
    topicName: string;
  },
  overrides: Partial<Record<(typeof fallbackQuestionImportColumns)[number], string>>,
) {
  const row: Record<string, string> = Object.fromEntries(
    fallbackQuestionImportColumns.map((column) => [column, ""]),
  );
  row.subject = scope.subjectName;
  row.topic = scope.topicName;
  row.question_type = "mcq_single";
  row.difficulty_level = "foundation";
  row.option_1 = "Amazon S3";
  row.option_2 = "Amazon EC2";
  row.option_3 = "Amazon RDS";
  row.option_4 = "Amazon Route 53";
  row.correct_answer = "1";
  row.default_marks = "1.00";
  row.negative_marks = "0.00";
  row.explanation = "Amazon S3 is AWS object storage.";
  row.tags = "playwright-import|aws";

  for (const [key, value] of Object.entries(overrides)) {
    row[key] = value ?? "";
  }

  return row;
}

async function buildQuestionImportRowsFile(
  testInfo: TestInfo,
  fileName: string,
  rows: Record<string, string>[],
) {
  const filePath = testInfo.outputPath(fileName);
  await writeFile(filePath, buildCsv([...fallbackQuestionImportColumns], rows), "utf8");
  return filePath;
}

async function openQuestionImportWorkspace(page: Page, importPath: string) {
  await page.goto(importPath);
  await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
  if (await expectQuestionImportBlockedState(page)) {
    console.log("question-import-mutable-skip", JSON.stringify({ lane: importPath, reason: "blocked-state" }));
    test.skip(true, "Question-bank bulk import is currently disabled for this stage role.");
  }
}

async function attachQuestionImportFile(
  page: Page,
  file:
    | string
    | {
        name: string;
        mimeType: string;
        buffer: Buffer;
      },
) {
  const fileInput = page.getByTestId("question-import-file-input");
  await expect(fileInput).toBeVisible();
  await fileInput.setInputFiles(file);
  await expect
    .poll(async () =>
      fileInput.evaluate((input) => (input as HTMLInputElement).files?.length ?? 0),
    )
    .toBe(1);
  await fileInput.dispatchEvent("input");
  await fileInput.dispatchEvent("change");
}

async function deleteImportedQuestionViaWorkspace(
  page: Page,
  questionText: string,
  questionBankPath: string,
  deletePathBuilder: (questionId: string) => string,
) {
  await page.goto(`${questionBankPath}?search=${encodeURIComponent(questionText)}`);
  await expect(page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
  const editHref = await page.getByRole("link", { name: /^edit$/i }).first().getAttribute("href");
  const questionIdMatch = editHref?.match(/\/question-bank\/([^/?#]+)/);
  const questionId = questionIdMatch?.[1] ?? null;
  expect(questionId).not.toBeNull();
  const response = await page.request.delete(deletePathBuilder(questionId!));
  expect(response.ok()).toBe(true);
}

async function runQuestionImportHappyPath(
  page: Page,
  testInfo: TestInfo,
  options: {
    importPath: string;
    newQuestionPath: string;
    questionBankPath: string;
    questionText: string;
    fileName: string;
    finalizeResponsePattern: RegExp;
    deletePathBuilder: (questionId: string) => string;
    workspaceExpectation: () => Promise<void>;
  },
) {
  await options.workspaceExpectation();

  const scope = await resolveImportScopeFromQuestionAuthoring(page, options.newQuestionPath);
  const filePath = await buildQuestionImportFile(
    testInfo,
    options.questionText,
    options.fileName,
    scope,
  );
  let importCompleted = false;

  try {
    await openQuestionImportWorkspace(page, options.importPath);

    const throttledBanner = page.getByText(/request was throttled/i).first();
    if (await throttledBanner.isVisible().catch(() => false)) {
      console.log("question-import-mutable-skip", JSON.stringify({ lane: options.importPath, reason: "throttled-before-preview" }));
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await attachQuestionImportFile(page, filePath);
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    const previewGenerated = page.getByText(/preview generated\./i).first();
    const previewOutcome = await Promise.race([
      previewGenerated
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => "preview"),
      throttledBanner
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => "throttled"),
    ]).catch(() => "timeout");

    if (previewOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
      console.log("question-import-mutable-skip", JSON.stringify({ lane: options.importPath, reason: "throttled-after-preview-click" }));
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await expect(previewGenerated).toBeVisible();
    await expect(page.getByText(new RegExp(options.questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /finalize import \(1\)/i })).toBeEnabled();

    const finalizeResponsePromise = page.waitForResponse(
      (response) =>
        options.finalizeResponsePattern.test(response.url()) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /finalize import/i }).click();
    const finalizeResponse = await finalizeResponsePromise;
    expect(finalizeResponse.ok()).toBe(true);

    await expect(page.getByText(/1 questions were imported/i).first()).toBeVisible();
    importCompleted = true;
  } finally {
    if (importCompleted) {
      await deleteImportedQuestionViaWorkspace(
        page,
        options.questionText,
        options.questionBankPath,
        options.deletePathBuilder,
      );
    }
  }
}

test.describe("Teacher and institute mutable question-import actions", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("institute"),
    "Teacher and institute Playwright credentials are required.",
  );

  test.skip(
    !mutableQuestionImportActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS",
      "teacher and institute question-import coverage",
    ),
  );

  test("@workflow @mutable teacher can preview and finalize a disposable question import", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "teacher");

    await runQuestionImportHappyPath(page, testInfo, {
      importPath: "/teacher/question-bank/import",
      newQuestionPath: "/teacher/question-bank/new",
      questionBankPath: "/teacher/question-bank",
      questionText: `Teacher import question ${Date.now()}`,
      fileName: "teacher-question-import.csv",
      finalizeResponsePattern: /\/api\/question-bank\/finalize-import$/,
      deletePathBuilder: (questionId) => `/api/teacher/question-bank/questions/${questionId}`,
      workspaceExpectation: async () => {
        await expectTeacherWorkspace(page);
      },
    });
  });

  test("@workflow @mutable institute can preview and finalize a disposable question import", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "institute");

    await runQuestionImportHappyPath(page, testInfo, {
      importPath: "/institute/question-bank/import",
      newQuestionPath: "/institute/question-bank/new",
      questionBankPath: "/institute/question-bank",
      questionText: `Institute import question ${Date.now()}`,
      fileName: "institute-question-import.csv",
      finalizeResponsePattern: /\/api\/question-bank\/finalize-import$/,
      deletePathBuilder: (questionId) => `/api/question-bank/questions/${questionId}`,
      workspaceExpectation: async () => {
        await expectInstituteWorkspace(page);
      },
    });
  });

  test("@workflow @mutable teacher sees malformed-file rejection and mixed duplicate-row preview guidance", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const scope = await resolveImportScopeFromQuestionAuthoring(page, "/teacher/question-bank/new");
    const malformedFilePath = testInfo.outputPath("teacher-question-import-malformed.csv");
    await writeFile(malformedFilePath, "question_text\nMissing required import columns\n", "utf8");

    const duplicateQuestionText = `Teacher duplicate import question ${Date.now()}`;
    const mixedFilePath = await buildQuestionImportRowsFile(testInfo, "teacher-question-import-mixed.csv", [
      buildQuestionImportRow(scope, {
        question_text: duplicateQuestionText,
        explanation: "Original valid row.",
      }),
      buildQuestionImportRow(scope, {
        question_text: duplicateQuestionText,
        explanation: "Duplicate row should be blocked.",
      }),
    ]);

    await openQuestionImportWorkspace(page, "/teacher/question-bank/import");

    const throttledBanner = page.getByText(/request was throttled/i).first();
    await attachQuestionImportFile(page, malformedFilePath);
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    const malformedErrorBanner = page.locator(".feedbackBannerError").first();
    const malformedOutcome = await Promise.race([
      malformedErrorBanner.waitFor({ state: "visible", timeout: 10000 }).then(() => "error"),
      throttledBanner.waitFor({ state: "visible", timeout: 10000 }).then(() => "throttled"),
    ]).catch(() => "timeout");

    if (malformedOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
      console.log("question-import-mutable-skip", JSON.stringify({ lane: "/teacher/question-bank/import", reason: "throttled-after-malformed-preview" }));
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await expect(malformedErrorBanner).toContainText(/missing required columns:/i);

    await attachQuestionImportFile(page, mixedFilePath);
    await page.getByRole("button", { name: /preview import/i }).click();

    const previewGenerated = page.getByText(/preview generated\./i).first();
    const mixedOutcome = await Promise.race([
      previewGenerated.waitFor({ state: "visible", timeout: 10000 }).then(() => "preview"),
      throttledBanner.waitFor({ state: "visible", timeout: 10000 }).then(() => "throttled"),
    ]).catch(() => "timeout");

    if (mixedOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
      console.log("question-import-mutable-skip", JSON.stringify({ lane: "/teacher/question-bank/import", reason: "throttled-after-mixed-preview" }));
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await expect(previewGenerated).toContainText(/1 row\(s\) still need fixes before final import/i);
    await expect(page.getByText(/some rows can proceed now, some are blocked/i)).toBeVisible();
    await expect(page.getByText(/1 valid row\(s\) can still be finalized from this preview\./i)).toBeVisible();
    await expect(page.getByText(/duplicate rows need attention first/i)).toBeVisible();
    await expect(page.getByText(/any remaining valid rows can still proceed\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /finalize import \(1\)/i })).toBeEnabled();
    await expect(page.getByText(new RegExp(duplicateQuestionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
  });

  test("@workflow @mutable institute sees finalize recovery guidance for blocked rows after preview success", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const scope = await resolveImportScopeFromQuestionAuthoring(page, "/institute/question-bank/new");
    const createdQuestionText = `Institute finalize import question ${Date.now()}`;
    const blockedQuestionText = `Institute finalize collision ${Date.now()}`;
    const validCsvContent = buildCsv([...fallbackQuestionImportColumns], [
      buildQuestionImportRow(scope, {
        question_text: createdQuestionText,
        explanation: "This row should appear as imported.",
      }),
      buildQuestionImportRow(scope, {
        question_text: blockedQuestionText,
        explanation: "This row should appear in the finalize recovery panel.",
      }),
    ]);

    await openQuestionImportWorkspace(page, "/institute/question-bank/import");

    const throttledBanner = page.getByText(/request was throttled/i).first();
    await attachQuestionImportFile(page, {
      name: "institute-question-import-finalize-recovery.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(validCsvContent, "utf8"),
    });
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    const previewGenerated = page.getByText(/preview generated\./i).first();
    const previewOutcome = await Promise.race([
      previewGenerated.waitFor({ state: "visible", timeout: 10000 }).then(() => "preview"),
      throttledBanner.waitFor({ state: "visible", timeout: 10000 }).then(() => "throttled"),
    ]).catch(() => "timeout");

    if (previewOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
      console.log("question-import-mutable-skip", JSON.stringify({ lane: "/institute/question-bank/import", reason: "throttled-before-finalize-recovery" }));
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await expect(previewGenerated).toContainText(/all rows are valid and ready for final import/i);
    await expect(page.getByRole("button", { name: /finalize import \(2\)/i })).toBeEnabled();

    await page.route("**/api/question-bank/finalize-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          created_count: 1,
          failed_count: 1,
          created_ids: [],
          failures: [
            {
              row_number: 3,
              question_text: blockedQuestionText,
              errors: {
                detail: [
                  "A matching question was created after preview. Preview the CSV again before retrying.",
                ],
              },
            },
          ],
        }),
      });
    });

    await page.getByRole("button", { name: /finalize import/i }).click();

    await expect(page.getByText(/1 questions were imported\. 1 row\(s\) are still blocked after final import\./i).first()).toBeVisible();
    await expect(page.getByText(/finalize recovery/i)).toBeVisible();
    await expect(page.getByText(/what imported vs what is blocked/i)).toBeVisible();
    await expect(page.getByText(/1 row\(s\) were created\. 1 row\(s\) stayed blocked\./i)).toBeVisible();
    await expect(page.getByText(new RegExp(blockedQuestionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
    await expect(
      page.locator(".questionImportErrorList li").filter({
        hasText: /preview the csv again before retrying/i,
      }),
    ).toBeVisible();
  });
});
