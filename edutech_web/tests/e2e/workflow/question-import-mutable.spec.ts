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

function buildCsv(columns: string[], row: Record<string, string>) {
  return [
    columns.join(","),
    columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","),
  ].join("\n");
}

function firstNonEmptyOption(options: Array<{ value: string; label: string }>) {
  return options.find((option) => option.value.trim().length > 0) ?? null;
}

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
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

  const subjectOptions = await page.locator('select[name="subject"] option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );
  const subjectOption = firstNonEmptyOption(subjectOptions);
  expect(subjectOption).not.toBeNull();
  await page.locator('select[name="subject"]').selectOption(subjectOption!.value);

  const topicOptions = await page.locator('select[name="topic"] option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );
  const topicOption = firstNonEmptyOption(topicOptions);
  expect(topicOption).not.toBeNull();

  return {
    subjectName: normalizeAcademicLabel(subjectOption!.label),
    topicName: normalizeAcademicLabel(topicOption!.label),
  };
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

async function deleteImportedQuestionViaWorkspace(
  page: Page,
  questionText: string,
  questionBankPath: string,
  deletePathBuilder: (questionId: string) => string,
) {
  await page.goto(`${questionBankPath}?search=${encodeURIComponent(questionText)}`);
  await expect(page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
  await page.getByRole("link", { name: /^edit$/i }).first().click();
  await expect(page.locator('textarea[name="question_text"]')).toHaveValue(questionText);
  const questionDetailUrl = page.url().split("?")[0] ?? page.url();
  const questionIdMatch = questionDetailUrl.match(/\/question-bank\/([^/?#]+)/);
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
    await page.goto(options.importPath);
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();

    const throttledBanner = page.getByText(/request was throttled/i).first();
    if (await throttledBanner.isVisible().catch(() => false)) {
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await expect(page.getByTestId("question-import-file-input")).toBeVisible();

    await page.getByTestId("question-import-file-input").setInputFiles(filePath);
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
});
