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

async function buildQuestionImportFile(testInfo: TestInfo, questionText: string) {
  const row: Record<string, string> = Object.fromEntries(
    fallbackQuestionImportColumns.map((column) => [column, ""]),
  );
  row.subject = "Mathematics";
  row.topic = "Linear Equations";
  row.question_type = "mcq_single";
  row.difficulty_level = "foundation";
  row.question_text = questionText;
  row.option_1 = "2";
  row.option_2 = "3";
  row.option_3 = "4";
  row.option_4 = "5";
  row.correct_answer = "3";
  row.default_marks = "1.00";
  row.negative_marks = "0.00";
  row.explanation = "Preview rejection coverage for teacher import.";
  row.tags = "playwright-import|teacher-preview-rejection";

  const filePath = testInfo.outputPath("teacher-question-import-preview-rejection.csv");
  await writeFile(filePath, buildCsv([...fallbackQuestionImportColumns], row), "utf8");
  return filePath;
}

test.describe("teacher import preview rejection", () => {
  test("@workflow teacher sees preview rejection and keeps import workspace in retry state", async ({
    page,
  }, testInfo) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const questionText = `Teacher preview rejection ${Date.now()}`;
    const filePath = await buildQuestionImportFile(testInfo, questionText);

    await openQuestionImportWorkspace(page);
    await attachQuestionImportFile(page, filePath);
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();

    await page.route("**/api/question-bank/preview-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Preview validation failed. Topic mapping is no longer valid for the selected subject.",
          file: ["Replace the topic column values with a live mapped topic before previewing again."],
        }),
      });
    });

    await page.getByRole("button", { name: /preview import/i }).click();

    const errorBanner = page.locator(".feedbackBannerError").first();
    await expect(errorBanner).toContainText(
      /preview validation failed\. topic mapping is no longer valid for the selected subject\./i,
    );
    await expect(page.getByText(/replace the topic column values with a live mapped topic before previewing again\./i)).toBeVisible();
    await expect(page.getByText(/preview generated\./i)).toHaveCount(0);
    await expect(page.getByText(/preview results/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /import valid rows/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /preview import/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
  });
});
