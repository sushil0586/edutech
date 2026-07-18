import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

async function openQuestionImportWorkspace(page: Page) {
  await page.goto("/teacher/question-bank/import");
  await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
}

async function attachQuestionImportFile(page: Page, filePath: string) {
  const fileInput = page.getByTestId("question-import-file-input");
  await expect(fileInput).toBeVisible();
  await fileInput.setInputFiles(filePath);
  await expect
    .poll(async () =>
      fileInput.evaluate((input) => (input as HTMLInputElement).files?.length ?? 0),
    )
    .toBe(1);
  await fileInput.dispatchEvent("input");
  await fileInput.dispatchEvent("change");
}

async function buildQuestionImportFile(
  testInfo: TestInfo,
  questionText: string,
) {
  const row: Record<string, string> = Object.fromEntries(
    fallbackQuestionImportColumns.map((column) => [column, ""]),
  );
  row.subject = "Mathematics";
  row.topic = "Linear Equations";
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
  row.tags = "playwright-import|teacher-rejection";

  const filePath = testInfo.outputPath("teacher-question-import-finalize-rejection.csv");
  await writeFile(filePath, buildCsv([...fallbackQuestionImportColumns], row), "utf8");
  return filePath;
}

test.describe("teacher import finalize rejection", () => {
  test("@workflow teacher sees backend finalize rejection after a valid preview", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const questionText = `Teacher finalize rejection ${Date.now()}`;
    const filePath = await buildQuestionImportFile(testInfo, questionText);

    await openQuestionImportWorkspace(page);

    const throttledBanner = page.getByText(/request was throttled/i).first();
    if (await throttledBanner.isVisible().catch(() => false)) {
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await page.route("**/api/question-bank/preview-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preview_schema_version: 1,
          preview_signature: "teacher-finalize-rejection-preview",
          total_rows: 1,
          valid_rows: 1,
          invalid_rows: 0,
          rows: [
            {
              row_number: 2,
              is_valid: true,
              errors: [],
              question_text: questionText,
              subject_code: "MATH",
              topic_code: "LINEAR-EQ",
              question_type: "mcq_single",
              difficulty_level: "foundation",
            },
          ],
          valid_payloads: [
            {
              question_text: questionText,
            },
          ],
        }),
      });
    });

    await attachQuestionImportFile(page, filePath);
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    const previewGenerated = page.getByText(/preview generated\./i).first();
    const previewOutcome = await Promise.race([
      previewGenerated.waitFor({ state: "visible", timeout: 10000 }).then(() => "preview"),
      throttledBanner.waitFor({ state: "visible", timeout: 10000 }).then(() => "throttled"),
    ]).catch(() => "timeout");

    if (previewOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
      test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
    }

    await expect(previewGenerated).toContainText(/all rows are valid and ready for final import/i);
    await expect(page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /import valid rows \(1\)/i })).toBeEnabled();

    await page.route("**/api/question-bank/finalize-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Preview signature expired. Generate a fresh preview before retrying the final import.",
        }),
      });
    });

    await page.getByRole("button", { name: /import valid rows/i }).click();

    await expect(page.locator(".feedbackBannerError").first()).toContainText(
      /preview signature expired\. generate a fresh preview before retrying the final import\./i,
    );
    await expect(page.getByRole("button", { name: /import valid rows \(1\)/i })).toBeEnabled();
    await expect(page.getByText(/preview results/i)).toBeVisible();
    await expect(page.getByText(/finalize recovery/i)).toHaveCount(0);
    await expect(
      page.getByText(/0 questions were imported into the question bank\./i),
    ).toHaveCount(0);
  });
});
